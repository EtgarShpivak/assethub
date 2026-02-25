import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow public routes FIRST (before any Supabase calls)
  const publicPaths = ['/login', '/auth/callback'];
  const isExternalUpload = path.startsWith('/upload/') && path.split('/').length === 3 && path !== '/upload';
  const isSharedLink = path.startsWith('/shared/');
  const isPublicApi =
    path.startsWith('/api/shares') ||
    (path.startsWith('/api/assets/') && path.includes('/download')) ||
    path === '/api/assets/download-zip';
  const isApiRoute = path.startsWith('/api/');

  if (publicPaths.some(p => path.startsWith(p)) || isExternalUpload || isSharedLink || isPublicApi) {
    return NextResponse.next({ request });
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value, ...options as Record<string, string> });
            supabaseResponse = NextResponse.next({ request });
            supabaseResponse.cookies.set({ name, value, ...options as Record<string, string> });
          },
          remove(name: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value: '', ...options as Record<string, string> });
            supabaseResponse = NextResponse.next({ request });
            supabaseResponse.cookies.set({ name, value: '', ...options as Record<string, string> });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Redirect to login if not authenticated
    if (!user) {
      // For API routes, return 401 instead of redirect
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login for pages, 500 for API
    if (isApiRoute) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
}
