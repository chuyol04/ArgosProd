import express from 'express';
import * as incidenciaHandlers from '../handlers/incidenciaHandler.js'; // 👈 include .js for ESM

const router = express.Router();

// POST /incidents/create
router.post('/create', incidenciaHandlers.createIncidencia);
// GET /incidents
router.get('/', incidenciaHandlers.getIncidencias);
// GET /incidents/:id
router.get('/:id', incidenciaHandlers.getIncidenciaById);
// PUT /incidents/:id
router.put('/:id', incidenciaHandlers.updateIncidencia);
// DELETE /incidents/:id
router.delete('/:id', incidenciaHandlers.deleteIncidencia);

export default router;
