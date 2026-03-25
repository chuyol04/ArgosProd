import express from 'express';
import * as piezaHandlers from '../handlers/piezaHandler.js'; // 👈 include .js for ESM

const router = express.Router();

// POST /parts/create
router.post('/create', piezaHandlers.createPieza);

// GET /parts
router.get('/', piezaHandlers.getPiezas);

// GET /parts/:id
router.get('/:id', piezaHandlers.getPiezaById);

// PUT /parts/:id
router.put('/:id', piezaHandlers.updatePieza);

// DELETE /parts/:id
router.delete('/:id', piezaHandlers.deletePieza);

export default router;
