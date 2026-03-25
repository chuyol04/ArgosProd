// firebaseAdmin.js (ESM)
import 'dotenv/config';
import admin from 'firebase-admin';

const envProjectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
const svcRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (admin.apps.length) {
    // Si ya hay una app pero sin projectId, la rearmamos
    const curr = admin.apps[0];
    if (!curr.options?.projectId) {
        await curr.delete().catch(() => { });
    }
}

if (!admin.apps.length) {
    if (svcRaw) {
        const svc = JSON.parse(svcRaw);
        const privateKey = (svc.private_key || '').replace(/\\n/g, '\n');
        const clientEmail = svc.client_email;

        if (privateKey && clientEmail) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: svc.project_id || envProjectId,
                    clientEmail,
                    privateKey,
                }),
                projectId: svc.project_id || envProjectId,
            });
        } else {
            console.warn('Service account incompleto: usando ADC con projectId explícito');
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: envProjectId,
            });
        }
    } else {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: envProjectId,
        });
    }
}

export default admin;
