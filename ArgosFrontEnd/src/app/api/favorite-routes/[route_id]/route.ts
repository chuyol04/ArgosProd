import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

// DELETE /api/favorite-routes/:route_id - removes a route from current user's favorites
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ route_id: string }> }
) {
    if (!EXPRESS_BASE_URL) {
        return NextResponse.json({ error: 'EXPRESS_BASE_URL not configured' }, { status: 500 });
    }

    const session = req.cookies.get('session')?.value;
    if (!session) {
        return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const { route_id } = await params;

    try {
        const expressResp = await fetch(`${EXPRESS_BASE_URL}/favorite-routes/${route_id}`, {
            method: 'DELETE',
            headers: {
                'Cookie': `session=${session}`,
            },
        });

        const data = await expressResp.json();
        return NextResponse.json(data, { status: expressResp.status });
    } catch (error) {
        console.error('Error removing favorite route:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
