import 'dotenv/config';
import admin from './../lib/helpers/firebaseAdmin.js';



export async function verifySession(req, res, next) {
    console.log("admin.apps.length:",admin.apps.length)
    try {
        const session = req.cookies?.session;
        if (!session) return res.status(401).json({ success: false, value: 'No Session Cookie' });

        const decoded = await admin.auth().verifySessionCookie(session, true);
        const { uid } = decoded;
        res.locals.firebase_uid = { uid };
        return next();
    } catch (e) {
        console.warn(e);
        return res.status(401).json({ success: false, value: 'No Session Cookie' });
    }
}
