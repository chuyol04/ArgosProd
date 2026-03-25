import express from 'express';
import * as rfHandlers from '../handlers/rutasFavoritasHandler.js';

const router = express.Router();

// POST /favorite-routes - adds a route_id to current user's favorites
router.post('/', rfHandlers.createRutaFavorita);

// GET /favorite-routes - gets current user's favorites
router.get('/', rfHandlers.getRutasFavoritas);

// DELETE /favorite-routes/:route_id - removes a route_id from current user's favorites
router.delete('/:route_id', rfHandlers.deleteRutaFavorita);

export default router;
