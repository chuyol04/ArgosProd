import express from 'express';
import * as servicioHandlers from '../handlers/servicioHandler.js'; // named exports

const router = express.Router();

// POST /services/create
router.post('/create', servicioHandlers.createServicio);

// GET /services
router.get('/', servicioHandlers.getServicios);

// GET /services/by-client?client_id=1
router.get('/by-client', servicioHandlers.getServiciosByCliente);

// GET /services/:id
router.get('/:id', servicioHandlers.getServicioById);

// PUT /services/:id
router.put('/:id', servicioHandlers.updateServicio);

// PUT /services/:id/detail
router.put('/:id/detail', servicioHandlers.updateServicioDetalle);

// DELETE /services/:id
router.delete('/:id', servicioHandlers.deleteServicio);

export default router;
