import db from '../models/index.mjs';
import { Op } from 'sequelize';
import helper from '../helper/helper.mjs';

const { Users, Messages } = db;

const getUsers = async (req, res) => {

    try {

        const currentUserId =
            Number(req.params.id);

        const users =
            await Users.findAll({
                where: {
                    id: {
                        [Op.ne]: currentUserId
                    }
                },
                attributes: [
                    'id',
                    'username',
                    'avatarColor',
                    'isOnline'
                ]
            });

        const formattedUsers =
            await Promise.all(

                users.map(async (user) => {

                    const userJson =
                        user.toJSON();

                    const lastMessageObj =
                        await Messages.findOne({
                            where: {
                                [Op.or]: [
                                    {
                                        senderId:
                                            currentUserId,
                                        receiverId:
                                            userJson.id
                                    },
                                    {
                                        senderId:
                                            userJson.id,
                                        receiverId:
                                            currentUserId
                                    }
                                ]
                            },
                            attributes: [
                                'text',
                                'status',
                                'createdAt'
                            ],
                            order: [
                                ['createdAt', 'DESC']
                            ]
                        });

                    const unreadCount =
                        await Messages.count({
                            where: {
                                senderId:
                                    userJson.id,
                                receiverId:
                                    currentUserId,
                                status: {
                                    [Op.ne]:
                                        'read'
                                }
                            }
                        });

                    return {
                        id: userJson.id,
                        username:
                            userJson.username,
                        avatarColor:
                            userJson.avatarColor,
                        isOnline:
                            userJson.isOnline,
                        avatarText:
                            helper.avatarText(
                                userJson.username
                            ),
                        lastMessage:
                            lastMessageObj
                                ?.text ??
                            'No messages yet',
                        lastMessageTime:
                            lastMessageObj
                                ?.createdAt ??
                            null,
                        unreadCount
                    };

                })
            );

        return res.status(200).json({
            success: true,
            users: formattedUsers
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            error:
                'Internal server error'
        });
    }
};

const getMessages = async (req, res) => {

    try {

        const userId =
            Number(req.params.userId);

        const friendId =
            Number(req.params.friendId);

        const history =
            await Messages.findAll({
                where: {
                    [Op.or]: [
                        {
                            senderId:
                                userId,
                            receiverId:
                                friendId
                        },
                        {
                            senderId:
                                friendId,
                            receiverId:
                                userId
                        }
                    ]
                },
                order: [
                    ['createdAt', 'ASC']
                ]
            });

        await Messages.update(
            {
                status: 'read'
            },
            {
                where: {
                    senderId:
                        friendId,
                    receiverId:
                        userId,
                    status: {
                        [Op.ne]:
                            'read'
                    }
                }
            }
        );

        return res.json({
            success: true,
            data: history
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export default {
    getUsers,
    getMessages
};