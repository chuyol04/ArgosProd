import { NextRequest,NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { IUser } from '@/app/(protected)/users/types/users.types'; // Updated import path
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

function getAdminApp() {
    if (admin.apps.length) return admin.app();
    return admin.initializeApp({
        credential: admin.credential.cert(
            JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string)
        ),
        projectId: process.env.FIREBASE_PROJECT_ID || undefined,
    });
}


export async function GET(req:NextRequest) {
    getAdminApp();
    const session = req.cookies.get('session')?.value
    if (!session) return NextResponse.json({ message: 'No session' }, { status: 401 })
    try {
        const decoded = await admin.auth().verifySessionCookie(session, true)
        const firebase_uid = decoded.uid

        // Forward the session cookie to the backend
        const expressResp = await fetch(EXPRESS_BASE_URL + "/users/details", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`
            },
            cache: 'no-store',
        });
        console.log(expressResp)
        if(!expressResp.ok) throw new Error();
        const {success, user: value} = await expressResp.json();
        if(!success) throw new Error();

        const user: IUser = {
                id: value.id ?? 0,
                email: value.email ?? "",
                name: value.name ?? "",
                phone_number: value.phone_number ?? "",
                roles: value.roles ?? [],
        }

        return NextResponse.json(user, { status: 200 });
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
