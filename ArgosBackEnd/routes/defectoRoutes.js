import express from 'express';
import * as defectoHandlers from '../handlers/defectoHandler.js'; // 👈 include .js for ESM

const router = express.Router();

// POST /defects/create
router.post('/create', defectoHandlers.createDefecto);

// GET /defects
router.get('/', defectoHandlers.getDefectos);

// GET /defects/:id
router.get('/:id', defectoHandlers.getDefectoById);

// PUT /defects/:id
router.put('/:id', defectoHandlers.updateDefecto);

// DELETE /defects/:id
router.delete('/:id', defectoHandlers.deleteDefecto);

export default router;
