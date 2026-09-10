import express from 'express';

import * as clienteHandlers from '../handlers/clientehandler.js'; // 👈 remember the .js extension

const router = express.Router();

// POST /clients/create
router.post('/create', async (req, res) => {
  try {
    await clienteHandlers.createCliente(req, res);
  } catch (error) {
    console.error('Route create client error:', error);
    return res.status(500).json({ success: false, motive: 'Server Error' });
  }
});

// PUT /clients/:id
router.put('/:id', clienteHandlers.updateCliente);

// DELETE /clients/:id
router.delete('/:id', clienteHandlers.deleteCliente);

// GET /clients
router.get('/', clienteHandlers.getClientes);

// GET /clients/:id
router.get('/:id', clienteHandlers.getClienteById);

export default router; // ✅ ESM export
