import env from '../config/env.config.mjs';

export default (sequelize, DataTypes) => {
    const Messages = sequelize.define('Messages', {
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
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('sent', 'delivered', 'read'),
            defaultValue: 'sent'
        }
    }, {
        tableName: `${env.DB_PREFIX}messages`
    });

    Messages.associate = (models) => {
        Messages.belongsTo(models.Users, {
            as: 'Sender',
            foreignKey: 'senderId'
        });

        Messages.belongsTo(models.Users, {
            as: 'Receiver',
            foreignKey: 'receiverId'
        });
    };

    return Messages;
};