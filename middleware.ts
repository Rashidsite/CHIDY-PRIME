import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host ||
    ''
  ).toLowerCase();

  // ── 1. SINGLE MASTER ADMIN HQ REDIRECT ──
  // If hitting /admin on mirror domains (e.g. chidy-prime.vercel.app), redirect cleanly to Master HQ
  const isMasterDomain =
    host.includes('chidyprimetz.com') ||
    host.includes('localhost') ||
    host.includes('127.0.0.1');

  if (pathname.startsWith('/admin') && !isMasterDomain) {
    const targetUrl = new URL(`https://chidyprimetz.com${pathname}${search}`);
    return NextResponse.redirect(targetUrl, 307);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    try {
      await supabase.auth.getUser();
    } catch {}
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
