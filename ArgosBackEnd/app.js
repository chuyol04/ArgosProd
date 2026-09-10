import 'dotenv/config';
import MysqlClient from './connections/mysqldb.js';
import express from 'express';
import cors from 'cors';

import cookieParser from 'cookie-parser';

import userRouter from './routes/userRoutes.js';
import clienteRouter from './routes/clienteRoutes.js';
import rolRouter from './routes/rolRoutes.js';
import servicioRouter from './routes/servicioRoutes.js';
// import inspectionRouter from './routes/inspectionRoutes.js'; // Removed
import loginRouter from './routes/loginRoutes.js';
import { verifySession } from './middleware/middlewareHandlers.js';
import {
  blockClientsEntirely,
  blockClientWrites,
  blockInspectorCatalogWrites,
  blockInspectorDeletes,
} from './middleware/clientGuard.js';

import piezaRouter from './routes/piezaRoutes.js';
import defectoRouter from './routes/defectoRoutes.js';
import instruccionTrabajoRouter from './routes/instruccionTrabajoRoutes.js';
import reporteRouter from './routes/reporteRoutes.js';
import detalleRouter from './routes/detalleInspeccionRoutes.js';
import incidenciaRouter from './routes/incidenciaRoutes.js';
import rolesUsuariosRouter from './routes/rolesUsuariosRoutes.js';
import rutasFavoritasRouter from './routes/rutasFavoritasRoutes.js';
import mediaRouter from './routes/mediaRoutes.js';

const app = express();

const corsOptions = {
    origin: process.env.CORS_FRONT_ORIGIN,
    credentials:true
};

app.use((req, res, next) => {
    console.log("PROJECT_ID",process.env.FIREBASE_PROJECT_ID)
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.url} from ${req.ip}`);
    next();
});
app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use('/login', loginRouter);

// middleware protegido
// blockClientsEntirely: catálogos/admin/clientes/servicios - el portal de
// clientes (rol 'Cliente') no necesita ni debe ver nada de esto.
// blockClientWrites: reportes/detalles/incidentes - el portal SÍ necesita
// leerlos (filtrados por su propio client_id en cada handler), pero nunca
// escribirlos.
// '/users' is NOT gated by blockClientsEntirely here - '/users/details' and
// '/users/change-password' must stay reachable by every role (see userRoutes.js
// for the per-route gating of the actual admin-only user management endpoints).
app.use('/users', verifySession, blockInspectorDeletes, userRouter);
app.use('/clients', verifySession, blockInspectorDeletes, blockInspectorCatalogWrites, blockClientsEntirely, clienteRouter);
app.use('/roles', verifySession, blockInspectorDeletes, blockInspectorCatalogWrites, blockClientsEntirely, rolRouter);
app.use('/parts', verifySession, blockInspectorDeletes, blockInspectorCatalogWrites, blockClientsEntirely, piezaRouter);
app.use('/defects', verifySession, blockInspectorDeletes, blockInspectorCatalogWrites, blockClientsEntirely, defectoRouter);
app.use('/work-instructions', verifySession, blockInspectorDeletes, blockInspectorCatalogWrites, blockClientsEntirely, instruccionTrabajoRouter);
app.use('/reports', verifySession, blockInspectorDeletes, blockClientWrites, reporteRouter);
app.use('/inspection-details', verifySession, blockInspectorDeletes, blockClientWrites, detalleRouter);
app.use('/incidents', verifySession, blockInspectorDeletes, blockClientWrites, incidenciaRouter);
app.use('/user-roles', verifySession, blockInspectorDeletes, blockInspectorCatalogWrites, blockClientsEntirely, rolesUsuariosRouter);
app.use('/favorite-routes', verifySession, blockInspectorDeletes, blockClientsEntirely, rutasFavoritasRouter);
app.use('/services', verifySession, blockInspectorDeletes, blockInspectorCatalogWrites, blockClientsEntirely, servicioRouter);
app.use('/media', verifySession, blockInspectorDeletes, blockInspectorCatalogWrites, blockClientsEntirely, mediaRouter);

export default app;
