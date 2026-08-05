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

// POST /inspection-details/:id/serial-numbers → Add a serial number to an existing detail
router.post('/:id/serial-numbers', detalleHandlers.addSerialNumber);

// DELETE /inspection-details/:id/serial-numbers/:serialId → Remove a serial number
router.delete('/:id/serial-numbers/:serialId', detalleHandlers.deleteSerialNumber);

// DELETE /inspection-details/:id
router.delete('/:id', detalleHandlers.deleteDetalleInspeccion);

export default router;
