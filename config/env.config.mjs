import dotenv from 'dotenv';

dotenv.config();

export default {
    DB_PORT: process.env.DB_PORT,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_PREFIX: process.env.DB_PREFIX,
    PORT:process.env.PORT,
    APIPREFIX:process.env.APIPREFIX
};