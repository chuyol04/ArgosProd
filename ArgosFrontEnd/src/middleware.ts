import { NextResponse, NextRequest } from 'next/server';

export const config = {
    // Exclude: api routes, Next.js internals, static assets
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.ico$).*)'],
};

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const session = req.cookies.get('session')?.value;

    // Allow requests to public routes (login and forbidden page)
    if (pathname === '/login' || pathname === '/forbidden') {
        return NextResponse.next();
    }

    // If no session, redirect to login for any other route
    if (!session) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    try {
        // Verify session is valid by calling the BFF route
        const userApiUrl = new URL('/api/auth/getCurrentUser', req.nextUrl.origin);
        const userRes = await fetch(userApiUrl, {
            headers: { cookie: `session=${session}` },
            cache: 'no-store',
        });

        // Only clear session and redirect on actual auth failures (401, 403)
        if (userRes.status === 401 || userRes.status === 403) {
            console.warn('Session invalid or expired, clearing session');
            const url = req.nextUrl.clone();
            url.pathname = '/login';
            const response = NextResponse.redirect(url);
            response.cookies.set('session', '', { maxAge: -1 });
            return response;
        }

        // On other errors (500, network issues), let request through
        // The page will handle showing errors if needed
        if (!userRes.ok) {
            console.warn('Auth check failed with status:', userRes.status, '- letting request through');
        }

        // Redirect from root to home for authenticated users
        if (pathname === '/') {
            const url = req.nextUrl.clone();
            url.pathname = '/home';
            return NextResponse.redirect(url);
        }

        return NextResponse.next();

    } catch (error) {
        // On network/transient errors, let request through - don't clear session
        console.error('Middleware fetch error (not clearing session):', error);

        // Still redirect root to home
        if (pathname === '/') {
            const url = req.nextUrl.clone();
            url.pathname = '/home';
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    }
}