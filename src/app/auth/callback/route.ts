import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  // Handle invite/recovery token (from email links)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'invite' | 'recovery' | 'email',
    });

    if (!error) {
      // For invite type, redirect to set-password page
      if (type === 'invite') {
        return NextResponse.redirect(`${origin}/set-password`);
      }
      // For recovery, also redirect to set-password
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/set-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(`${origin}/login?error=invalid_token`);
  }

  // Handle code exchange (from OAuth or magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Create user profile on first login
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existing) {
          await supabase.from('user_profiles').insert({
            id: user.id,
            display_name: user.user_metadata?.full_name || user.email,
            role: 'media_buyer',
            workspace_ids: [],
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
