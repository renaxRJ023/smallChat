import express from 'express';
const router = express.Router();

import Controller from '../controller/auth.controller.mjs';

router.get('/getusers/:id', Controller.getUsers);
router.get('/chat/:userId/:friendId', Controller.getMessages)

export default router;