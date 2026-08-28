import express from 'express';
import * as instruccionTrabajoHandlers from '../handlers/instruccionTrabajoHandler.js'; // 👈 include .js for ESM

const router = express.Router();

// POST /work-instructions/create
router.post('/create', instruccionTrabajoHandlers.createInstruccionTrabajo);

// GET /work-instructions/users/select → Get users for collaborator selection (MUST be before /:id)
router.get('/users/select', instruccionTrabajoHandlers.getUsersForSelect);

// GET /work-instructions
router.get('/', instruccionTrabajoHandlers.getInstruccionesTrabajo);

// GET /work-instructions/:id
router.get('/:id', instruccionTrabajoHandlers.getInstruccionTrabajoById);

// PUT /work-instructions/:id
router.put('/:id', instruccionTrabajoHandlers.updateInstruccionTrabajo);

// PUT /work-instructions/:id/detail → Updates data and associated evidence
router.put('/:id/detail', instruccionTrabajoHandlers.updateInstruccionTrabajoDetalle);

// PUT /work-instructions/:id/collaborators → Sync collaborators for a work instruction
router.put('/:id/collaborators', instruccionTrabajoHandlers.updateWorkInstructionCollaborators);

// PUT /work-instructions/:id/defects → Sync expected defects for a work instruction
router.put('/:id/defects', instruccionTrabajoHandlers.updateWorkInstructionDefects);

// POST /work-instructions/:id/evidence → Add evidence file
router.post('/:id/evidence', instruccionTrabajoHandlers.addEvidence);

// DELETE /work-instructions/:id/evidence/:evidenceId → Delete evidence file
router.delete('/:id/evidence/:evidenceId', instruccionTrabajoHandlers.deleteEvidence);

// PUT /work-instructions/:id/evidence/:evidenceId/main → Reclassify an existing file as the main signed IT
router.put('/:id/evidence/:evidenceId/main', instruccionTrabajoHandlers.setMainEvidence);

// DELETE /work-instructions/:id
router.delete('/:id', instruccionTrabajoHandlers.deleteInstruccionTrabajo);

export default router;
