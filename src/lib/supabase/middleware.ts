import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
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
  const path = request.nextUrl.pathname;

  // Allow public routes
  const publicPaths = ['/login', '/auth/callback'];
  const isExternalUpload = path.startsWith('/upload/') && path.split('/').length === 3 && path !== '/upload';
  const isSharedLink = path.startsWith('/shared/');
  const isPublicApi = path.startsWith('/api/shares') || path.startsWith('/api/assets/') && (path.includes('/download') || path === '/api/assets/download-zip');

  if (publicPaths.some(p => path.startsWith(p)) || isExternalUpload || isSharedLink || isPublicApi) {
    return supabaseResponse;
  }

  // Redirect to login if not authenticated
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
