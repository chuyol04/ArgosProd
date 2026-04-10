import express from 'express';
import * as mediaHandlers from '../handlers/mediaHandler.js';

const router = express.Router();

router.post('/cleanup', async (req, res) => {
    try {
        await mediaHandlers.cleanupMediaReferences(req, res);
    } catch (error) {
        console.error('Media cleanup route error:', error);
        return res.status(500).json({ success: false, motive: 'Server Error' });
    }
});

export default router;
