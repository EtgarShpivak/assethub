import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  // Validate redirect path — prevent open redirect attacks
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

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

  // Handle invite/recovery/magiclink token (from email links)
  // For recovery and invite: redirect to set-password page with token so client can verify + set password
  // For magiclink: verify server-side and redirect to app
  if (tokenHash && type) {
    if (type === 'recovery' || type === 'invite') {
      // Pass token to set-password page — client will verify and set password
      return NextResponse.redirect(
        `${origin}/set-password?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`
      );
    }

    // For magiclink type: verify server-side and redirect to app
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'magiclink' | 'email',
    });

    if (!error) {
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
