
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


export async function GET(req: NextRequest) {
    try{
        getAdminApp();
        const session = req.cookies.get('session')?.value;
        if(!session) return NextResponse.json({success:false, message:'No session found'},{status:401});
        await admin.auth().verifySessionCookie(session, true);
        return NextResponse.json({success:true},{status:200});
    }catch{
        return NextResponse.json({success:false, message:'Session verification failed'},{status:401});
    }
}