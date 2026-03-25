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

import piezaRouter from './routes/piezaRoutes.js';
import defectoRouter from './routes/defectoRoutes.js';
import instruccionTrabajoRouter from './routes/instruccionTrabajoRoutes.js';
import reporteRouter from './routes/reporteRoutes.js';
import detalleRouter from './routes/detalleInspeccionRoutes.js';
import incidenciaRouter from './routes/incidenciaRoutes.js';
import rolesUsuariosRouter from './routes/rolesUsuariosRoutes.js';
import rutasFavoritasRouter from './routes/rutasFavoritasRoutes.js';

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
app.use('/users', verifySession, userRouter);
app.use('/clients', verifySession, clienteRouter);
app.use('/roles', verifySession, rolRouter);
app.use('/parts', verifySession, piezaRouter);
app.use('/defects', verifySession, defectoRouter);
app.use('/work-instructions', verifySession, instruccionTrabajoRouter);
app.use('/reports', verifySession, reporteRouter);
app.use('/inspection-details', verifySession, detalleRouter);
app.use('/incidents', verifySession, incidenciaRouter);
app.use('/user-roles', verifySession, rolesUsuariosRouter);
app.use('/favorite-routes', verifySession, rutasFavoritasRouter);
app.use('/services', verifySession, servicioRouter);

export default app;
