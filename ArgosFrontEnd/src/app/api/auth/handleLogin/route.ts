//ozcabaudit\src\app\api\auth\handleLogin\route.ts
//Firebase based authentication.
//JWT based authorization.

import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function getAdminApp() {
    if (admin.apps.length) return admin.app();
    return admin.initializeApp({
        credential: admin.credential.cert(
            JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string)
        ),
        projectId: process.env.FIREBASE_PROJECT_ID || undefined,
    });
}

// Configure session duration
const SESSION_MAX_AGE_MS = Number(process.env.FB_SESSION_MAX_AGE_MS || 1 * 60 * 60 * 1000); // 1h
// WHY: Moderate lifespan. You can increase it (e.g., 5 days) if your use case requires it.
const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL || "";

export async function POST(req: NextRequest) {
    getAdminApp();
    try {
        if (!EXPRESS_BASE_URL) {
            console.log("NO BASE URL")
            return NextResponse.json({ message: 'EXPRESS_BASE_URL not configured' }, { status: 500 });
        }
        const { email, password } = await req.json();

        if (!email || !password) return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        const backendLogin = EXPRESS_BASE_URL + "/login/submit"
        console.log(backendLogin)
        const expressResp = await fetch(backendLogin, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ email, password }),
        });
        console.log("RESPONSE:", expressResp)
        if (!expressResp.ok) {
            const errorPayload = await expressResp.json().catch(() => ({}));
            const motive = errorPayload?.motive || 'Invalid credentials or authentication error';
            return NextResponse.json(
                { message: motive },
                { status: expressResp.status || 401 }
            );
        }
        const payload = await expressResp.json();
        const firebaseAccess = payload?.firebaseAccess;
        const ok = firebaseAccess?.success === true;
        const idToken: string | undefined = firebaseAccess?.value?.idToken;
        console.log("PAYLOAD:", payload)
        if (!ok || !idToken) {
            return NextResponse.json(
                { message: 'Invalid Express response: missing idToken' },
                { status: 502 }
            );
        }

        const sessionCookie = await admin.auth().createSessionCookie(idToken, {
            expiresIn: SESSION_MAX_AGE_MS,
        });

        const url = new URL('/home', req.url);
        const res = NextResponse.redirect(url, { status: 303 });
        const secureCookie = process.env.COOKIE_SECURE !== 'false';
        res.cookies.set('session', sessionCookie, {
            httpOnly: true,
            secure: secureCookie,
            sameSite: 'lax', // if you will do cross-site to other domains, change to 'none' + secure
            path: '/',
            maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
        });
        console.log(res)
        return res
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { message: 'Error processing authentication' },
            { status: 500 }
        );
    }
}