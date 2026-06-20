import { NextResponse, NextRequest } from 'next/server';

export const config = {
    // Exclude: api routes, Next.js internals, static assets
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.ico$).*)'],
};

const ADMIN_ONLY_PATHS = ['/media', '/users', '/roles'];

// Client-portal users (role 'Cliente') may only reach these paths - this is
// a UX nicety on top of the real enforcement, which happens in the backend
// (it ignores/overrides any client_id a request tries to pass and scopes
// every query to the requester's own client).
const CLIENT_PORTAL_ALLOWED_PATHS = ['/mis-reportes', '/cambiar-contrasena', '/forbidden'];
const CLIENT_PORTAL_HOME = '/mis-reportes';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const session = req.cookies.get('session')?.value;

    // Allow requests to forbidden page
    if (pathname === '/forbidden') {
        return NextResponse.next();
    }

    // If on login page with a session, redirect to home
    if (pathname === '/login' && session) {
        const url = req.nextUrl.clone();
        url.pathname = '/home';
        return NextResponse.redirect(url);
    }

    // Allow login page for unauthenticated users
    if (pathname === '/login') {
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
        if (!userRes.ok) {
            console.warn('Auth check failed with status:', userRes.status, '- letting request through');
        }

        // Parse user data once for all role checks below
        let roles: string[] = [];
        let parsedOk = false;
        if (userRes.ok) {
            try {
                const userData = await userRes.json();
                roles = userData.roles ?? [];
                parsedOk = true;
            } catch {
                parsedOk = false;
            }
        }

        const isAdminRoute = ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
        if (isAdminRoute && (!parsedOk || !roles.includes('Admin'))) {
            const url = req.nextUrl.clone();
            url.pathname = '/forbidden';
            return NextResponse.redirect(url);
        }

        // Client-portal users are confined to their own read-only section,
        // regardless of what the sidebar/links show.
        const isClientOnly = parsedOk && roles.includes('Cliente');
        if (isClientOnly && !CLIENT_PORTAL_ALLOWED_PATHS.some((p) => pathname.startsWith(p))) {
            const url = req.nextUrl.clone();
            url.pathname = CLIENT_PORTAL_HOME;
            return NextResponse.redirect(url);
        }

        // Redirect from root to home for authenticated users
        if (pathname === '/') {
            const url = req.nextUrl.clone();
            url.pathname = isClientOnly ? CLIENT_PORTAL_HOME : '/home';
            return NextResponse.redirect(url);
        }

        return NextResponse.next();

    } catch (error) {
        // On network/transient errors, let request through - don't clear session
        console.error('Middleware fetch error (not clearing session):', error);

        // But block admin routes on error
        if (ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
            const url = req.nextUrl.clone();
            url.pathname = '/forbidden';
            return NextResponse.redirect(url);
        }

        // Still redirect root to home
        if (pathname === '/') {
            const url = req.nextUrl.clone();
            url.pathname = '/home';
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    }
}
