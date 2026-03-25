import express from 'express';

import * as userHandlers from '../handlers/userHandler.js'; // named exports

const router = express.Router();

router.post('/create', async (req, res) => {
    try {
        await userHandlers.createUser(req, res);
    } catch (error) {
        console.error('Create user route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

router.post('/details', async (req, res) => { // Changed from /user-details
    try {
        await userHandlers.getUserDetails(req, res);
    } catch (error) {
        console.error('Error getting user details:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

export default router;
