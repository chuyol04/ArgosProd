import { NextRequest,NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { IUser } from '@/app/(protected)/users/types/users.types'; // Updated import path
import { ACTIVE_CLIENT_COOKIE, parseActiveClientId } from '@/lib/clientScope';
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
        await admin.auth().verifySessionCookie(session, true)

        // Forward the session cookie to the backend
        const expressResp = await fetch(EXPRESS_BASE_URL + "/users/details", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`
            },
            cache: 'no-store',
        });
        if(!expressResp.ok) {
            const errorPayload = await expressResp.json().catch(() => ({}));
            console.error("Failed to fetch current user details:", {
                status: expressResp.status,
                motive: errorPayload?.motive || errorPayload?.message,
            });
            throw new Error("Failed to fetch current user details");
        }
        const {success, user: value} = await expressResp.json();
        if(!success) throw new Error("Backend did not return current user details");

        const roles: string[] = value.roles ?? [];
        let clientOptions: Array<{ id: number; name: string }> = [];

        if (roles.includes("Admin")) {
            try {
                const clientsResp = await fetch(
                    EXPRESS_BASE_URL + "/clients?limit=1000&offset=0",
                    {
                        headers: { 'Cookie': `session=${session}` },
                        cache: 'no-store',
                    }
                );
                const clientsJson = await clientsResp.json();
                if (clientsResp.ok && clientsJson.success) {
                    clientOptions = (clientsJson.data ?? []).map(
                        (client: { id: number; name: string }) => ({
                            id: client.id,
                            name: client.name,
                        })
                    );
                }
            } catch (error) {
                console.error("Failed to fetch client options:", error);
            }
        }

        const requestedClientId = parseActiveClientId(
            req.cookies.get(ACTIVE_CLIENT_COOKIE)?.value
        );
        const activeClientId = clientOptions.some(
            (client) => client.id === requestedClientId
        )
            ? requestedClientId
            : undefined;

        const user: IUser = {
                id: value.id ?? 0,
                email: value.email ?? "",
                name: value.name ?? "",
                phone_number: value.phone_number ?? "",
                roles,
                active_client_id: activeClientId,
                client_options: clientOptions,
        }

        return NextResponse.json(user, { status: 200 });
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
