import env from '../config/env.config.mjs';

export default (sequelize, DataTypes) => {
    const Users = sequelize.define('Users', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        avatarColor: {
            type: DataTypes.STRING,
            allowNull: false
        },
        isOnline: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: `${env.DB_PREFIX}users`
    });

    Users.associate = (models) => {
        Users.hasMany(models.Messages, {
            as: 'SentMessages',
            foreignKey: 'senderId'
        });

        Users.hasMany(models.Messages, {
            as: 'ReceivedMessages',
            foreignKey: 'receiverId'
        });
    };

    return Users;
};