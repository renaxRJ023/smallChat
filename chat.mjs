import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors({ origin: '*' }));
import { DataTypes, Sequelize, where, Op } from 'sequelize';

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
});

const Users = sequelize.define('users', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    isOnline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

const Messages = sequelize.define('messages', {
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    receiverId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('sent', 'delivered', 'read'),
        defaultValue: 'sent'
    }
});

Users.hasMany(Messages, { as: 'SentMessages', foreignKey: 'senderId' });
Users.hasMany(Messages, { as: 'ReceivedMessages', foreignKey: 'receiverId' });
Messages.belongsTo(Users, { as: 'Sender', foreignKey: 'senderId' });
Messages.belongsTo(Users, { as: 'Receiver', foreignKey: 'receiverId' });

(async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();

        console.log('Database connected successfully');
    } catch (err) {
        console.error(err);
    }
})();

function avatarText(name) {
    const fname = name.split(' ')[0];
    const lname = name.split(' ')[1];
    return `${fname.slice(0, 1)}${lname.slice(0, 1)}`;
}

app.get('/getusers/:id', async (req, res) => {
    try {
        const currentUserId = req.params.id;

        const users = await Users.findAll({
            where: {
                id: { [Op.ne]: currentUserId }
            },
            attributes: ['id', 'username', 'avatarColor', 'isOnline']
        });

        const formattedUsers = await Promise.all(users.map(async (user) => {
            const userJson = user.toJSON();

            const lastMessageObj = await Messages.findOne({
                where: {
                    [Op.or]: [
                        { senderId: currentUserId, receiverId: userJson.id },
                        { senderId: userJson.id, receiverId: currentUserId }
                    ]
                },
                attributes: ['text', 'status', 'createdAt'],
                order: [['createdAt', 'DESC']]
            });

            const calculatedUnreadCount = await Messages.count({
                where: {
                    senderId: userJson.id,
                    receiverId: currentUserId,
                    status: {
                        [Op.ne]: 'read'
                    }
                }
            });

            return {
                id: userJson.id,
                username: userJson.username,
                avatarColor: userJson.avatarColor,
                isOnline: userJson.isOnline,
                avatarText: avatarText(userJson.username),
                lastMessage: lastMessageObj ? lastMessageObj.text : "No messages yet",
                lastMessageTime: lastMessageObj ? lastMessageObj.createdAt : null,
                unreadCount: calculatedUnreadCount
            };
        }));

        res.status(200).json({ success: true, users: formattedUsers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.get('/chat/:userId/:friendId', async (req, res) => {
    const { userId, friendId } = req.params;
    try {
        const history = await Messages.findAll({
            where: {
                senderId: [userId, friendId],
                receiverId: [userId, friendId]
            },
            order: [['createdAt', 'ASC']]
        });

        await Messages.update(
            { status: 'read' },
            {
                where: {
                    senderId: friendId,
                    receiverId: userId,
                    status: { [Op.ne]: 'read' }
                }
            }
        );
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const activeUsers = {};
io.on('connection', (socket) => {
    console.log(`the user has been connected with socket : `, socket.id)

    socket.on('user_connected', (userId) => {
        activeUsers[userId] = socket.id;
        socket.userId = userId;
        console.log(`User ${userId} Online.`);
        io.emit('updateStatus', { userId: userId, isOnline: true });
    });

    socket.on('typing', (data) => {
        const receiverSocketId = activeUsers[data.receiverId];
        console.log("user typing...");
        if (receiverSocketId) {
            socket.to(receiverSocketId).emit('userTyping', {
                senderId: data.senderId
            });
            console.log("friend typing...");
        }
    });

    socket.on('send_message', async (newMsg) => {
        const { senderId, receiverId, text } = newMsg;
        await Messages.create({ senderId: senderId, receiverId: receiverId, text: text, status: 'sent' })

        const history = await Messages.findAll({
            where: {
                senderId: [senderId, receiverId],
                receiverId: [senderId, receiverId]
            },
            order: [['createdAt', 'ASC']]
        });

        socket.emit('updatehistory', history);
        const socId = activeUsers[receiverId];
        console.log('reciverId', socId);
        socket.to(socId).emit('updatehistory', history)
    })

    socket.on('disconnect', () => {
        const userId = socket.userId;
        if (userId) {
            delete activeUsers[userId];
        }
        io.emit('updateStatus', { userId: userId, isOnline: false });
        console.log(`User ${socket.id} disconnected.`);
    })
})

const PORT = 2323;

server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})