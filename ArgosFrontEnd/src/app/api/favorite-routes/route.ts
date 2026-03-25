import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

// GET /api/favorite-routes - gets current user's favorites
export async function GET(req: NextRequest) {
    if (!EXPRESS_BASE_URL) {
        return NextResponse.json({ error: 'EXPRESS_BASE_URL not configured' }, { status: 500 });
    }

    const session = req.cookies.get('session')?.value;
    if (!session) {
        return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    try {
        const expressResp = await fetch(`${EXPRESS_BASE_URL}/favorite-routes`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        if (!expressResp.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch favorite routes' },
                { status: expressResp.status }
            );
        }

        const data = await expressResp.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Error fetching favorite routes:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST /api/favorite-routes - adds a route_id to current user's favorites
export async function POST(req: NextRequest) {
    if (!EXPRESS_BASE_URL) {
        return NextResponse.json({ error: 'EXPRESS_BASE_URL not configured' }, { status: 500 });
    }

    const session = req.cookies.get('session')?.value;
    if (!session) {
        return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const expressResp = await fetch(`${EXPRESS_BASE_URL}/favorite-routes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`,
            },
            body: JSON.stringify(body),
        });

        const data = await expressResp.json();
        return NextResponse.json(data, { status: expressResp.status });
    } catch (error) {
        console.error('Error adding favorite route:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
