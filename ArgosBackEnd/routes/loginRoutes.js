import express from 'express';
import * as userHandlers from '../handlers/userHandler.js'; // namespace import (named exports)

const router = express.Router();

router.post('/submit', async (req, res) => {
    try {
        await userHandlers.userLogin(req, res);
    } catch (error) {
        console.error('Login route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

export default router;
