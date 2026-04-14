import express from 'express';

import * as userHandlers from '../handlers/userHandler.js'; // named exports

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        await userHandlers.getUsers(req, res);
    } catch (error) {
        console.error('Get users route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        await userHandlers.getUserById(req, res);
    } catch (error) {
        console.error('Get user by ID route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        await userHandlers.updateUser(req, res);
    } catch (error) {
        console.error('Update user route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

router.post('/create', async (req, res) => {
    try {
        await userHandlers.createUser(req, res);
    } catch (error) {
        console.error('Create user route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

router.post('/change-password', async (req, res) => {
    try {
        await userHandlers.changePassword(req, res);
    } catch (error) {
        console.error('Change password route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

router.post('/:id/reset-password', async (req, res) => {
    try {
        await userHandlers.resetUserPassword(req, res);
    } catch (error) {
        console.error('Reset password route error:', error);
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
