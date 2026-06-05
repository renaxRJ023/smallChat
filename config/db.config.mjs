import env from '../config/env.config.mjs';
import { Sequelize } from 'sequelize';

console.log('DB_NAME:', env.DB_NAME);
console.log('DB_USERNAME:', env.DB_USERNAME);
console.log('DB_PASSWORD:', env.DB_PASSWORD);
console.log('DB_HOST:', env.DB_HOST);
console.log('DB_PORT:', env.DB_PORT);

const sequelize = new Sequelize(env.DB_NAME, env.DB_USERNAME, env.DB_PASSWORD, {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'mysql',
    logging: false
});

export default sequelize;

