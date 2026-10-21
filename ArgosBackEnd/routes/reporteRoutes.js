import express from 'express';
import * as reporteHandlers from '../handlers/reporteHandler.js'; // 👈 include .js for ESM
import { getAuthorizedReportMedia } from '../handlers/reportMediaAccessHandler.js';
import { getReportDashboard } from '../handlers/reportDashboardHandler.js';

const router = express.Router();

// POST /reports/create
router.post('/create', reporteHandlers.createReporte);

// GET /reports
router.get('/', reporteHandlers.getReportes);

// GET /reports/dashboard - Must be before the dynamic :id route
router.get('/dashboard', getReportDashboard);

// GET /reports/media/access - Must be before the dynamic :id route
router.get('/media/access', getAuthorizedReportMedia);

// GET /reports/:id/export - Export to Excel (must be before :id route)
router.get('/:id/export', reporteHandlers.exportReporteToExcel);

// GET /reports/:id
router.get('/:id', reporteHandlers.getReporteById);

// PUT /reports/:id
router.put('/:id', reporteHandlers.updateReporte);

// DELETE /reports/:id
router.delete('/:id', reporteHandlers.deleteReporte);

export default router;
