import env from './config/env.config.mjs';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));

import db from './models/index.mjs'

try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();
} catch (err) {
    console.error('Startup failed:', err);
}

import router from './routes/auth.routes.mjs';
app.use(`/${env.APIPREFIX}`, router);


import { Op } from 'sequelize';

const { Messages, Users } = db;

io.on('connection', (socket) => {

    console.log('User connected:', socket.id);

    /**
     * User Connected
     */
    socket.on('user_connected', async (userId) => {
        try {

            socket.userId = userId;

            // Join personal room
            socket.join(`user_${userId}`);

            await Users.update(
                { isOnline: true },
                {
                    where: { id: userId }
                }
            );

            io.emit('updateStatus', {
                userId,
                isOnline: true
            });

            console.log(`User ${userId} Online`);

        } catch (err) {
            console.error(err);
        }
    });

    /**
     * Typing Indicator
     */
    socket.on('typing', ({ senderId, receiverId }) => {

        io.to(`user_${receiverId}`)
            .emit('userTyping', {
                senderId
            });

    });

    /**
     * Send Message
     */
    socket.on('send_message', async (payload) => {

        try {

            const {
                senderId,
                receiverId,
                text
            } = payload;

            let status = 'sent';

            // Check if receiver room has sockets
            const receiverRoom =
                io.sockets.adapter.rooms.get(`user_${receiverId}`);

            const receiverOnline =
                receiverRoom && receiverRoom.size > 0;

            if (receiverOnline) {
                status = 'delivered';
            }

            const savedMessage = await Messages.create({
                senderId,
                receiverId,
                text,
                status
            });

            const message = await Messages.findByPk(savedMessage.id);

            io.to(`user_${senderId}`)
                .emit('new_message', message);

            io.to(`user_${receiverId}`)
                .emit('new_message', message);

        } catch (err) {

            console.error('Send Message Error:', err);

            socket.emit('error_message', {
                message: 'Failed to send message'
            });
        }

    });

    /**
     * Get Chat History
     */
    socket.on('load_chat', async ({ senderId, receiverId }) => {

        try {

            const history = await Messages.findAll({
                where: {
                    [Op.or]: [
                        {
                            senderId,
                            receiverId
                        },
                        {
                            senderId: receiverId,
                            receiverId: senderId
                        }
                    ]
                },
                order: [
                    ['createdAt', 'ASC']
                ]
            });

            socket.emit('chat_history', history);

        } catch (err) {

            console.error(err);

            socket.emit('error_message', {
                message: 'Failed to load chat'
            });
        }

    });

    /**
     * Mark Message As Read
     */
    socket.on('message_read', async ({ messageId }) => {

        try {

            const message =
                await Messages.findByPk(messageId);

            if (!message) return;

            await message.update({
                status: 'read'
            });

            io.to(`user_${message.senderId}`)
                .emit('message_read', {
                    messageId
                });

        } catch (err) {
            console.error(err);
        }

    });

    /**
     * Disconnect
     */
    socket.on('disconnect', async () => {

        try {

            const userId = socket.userId;

            if (!userId) return;

            // Check if user still has another tab/device connected
            const room =
                io.sockets.adapter.rooms.get(`user_${userId}`);

            const stillConnected =
                room && room.size > 0;

            if (!stillConnected) {

                await Users.update(
                    {
                        isOnline: false
                    },
                    {
                        where: {
                            id: userId
                        }
                    }
                );

                io.emit('updateStatus', {
                    userId,
                    isOnline: false
                });

                console.log(`User ${userId} Offline`);
            }

        } catch (err) {
            console.error(err);
        }

        console.log('Disconnected:', socket.id);

    });

});

const PORT = env.PORT || 2323;

server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})