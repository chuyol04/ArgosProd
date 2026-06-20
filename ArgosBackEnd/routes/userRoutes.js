import express from 'express';

import * as userHandlers from '../handlers/userHandler.js'; // named exports
import { blockClientsEntirely } from '../middleware/clientGuard.js';

const router = express.Router();

// NOTE: '/details' (self profile lookup) and '/change-password' (self password
// change) are intentionally NOT gated by blockClientsEntirely - every
// authenticated role, including Cliente, needs them. The frontend's own role
// check (and thus the client-portal redirect) depends on '/details' working.
// Admin-only user management endpoints are gated individually below.

router.get('/', blockClientsEntirely, async (req, res) => {
    try {
        await userHandlers.getUsers(req, res);
    } catch (error) {
        console.error('Get users route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

router.get('/:id', blockClientsEntirely, async (req, res) => {
    try {
        await userHandlers.getUserById(req, res);
    } catch (error) {
        console.error('Get user by ID route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

router.put('/:id', blockClientsEntirely, async (req, res) => {
    try {
        await userHandlers.updateUser(req, res);
    } catch (error) {
        console.error('Update user route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

router.post('/create', blockClientsEntirely, async (req, res) => {
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

router.post('/:id/reset-password', blockClientsEntirely, async (req, res) => {
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
