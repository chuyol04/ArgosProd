import express from 'express';
import * as ruHandlers from '../handlers/rolesUsuariosHandler.js'; // 👈 include .js for ESM

const router = express.Router();

// POST /user-roles/create (assign role)
router.post('/create', ruHandlers.createRolUsuario);

// GET /user-roles (get all assignments)
router.get('/', ruHandlers.getRolesUsuarios);

// GET /user-roles/user/:user_id (get roles for a specific user)
router.get('/user/:user_id', ruHandlers.getRolUsuarioById);

// DELETE /user-roles/ (unassign role) - expects user_id and role_id in body
router.delete('/', ruHandlers.deleteRolUsuario);

export default router;
