import express from 'express';
import * as detalleHandlers from '../handlers/detalleInspeccionHandler.js'; // 👈 include .js for ESM

const router = express.Router();

// POST /inspection-details/create
router.post('/create', detalleHandlers.createDetalleInspeccion);

// GET /inspection-details
router.get('/', detalleHandlers.getDetallesInspeccion);

// GET /inspection-details/:id
router.get('/:id', detalleHandlers.getDetalleInspeccionById);

// PUT /inspection-details/:id
router.put('/:id', detalleHandlers.updateDetalleInspeccion);

// DELETE /inspection-details/:id
router.delete('/:id', detalleHandlers.deleteDetalleInspeccion);

export default router;
