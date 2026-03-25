import express from 'express';
import * as rolHandlers from '../handlers/rolHandler.js'; //  include .js for ESM


const router = express.Router();

// POST /roles/create
router.post('/create', rolHandlers.createRol);

// GET /roles
router.get('/', rolHandlers.getRoles);

// GET /roles/:id
router.get('/:id', rolHandlers.getRolById);

// PUT /roles/:id
router.put('/:id', rolHandlers.updateRol);

// DELETE /roles/:id
router.delete('/:id', rolHandlers.deleteRol);

export default router;
