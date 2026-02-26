'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, CheckCircle, Loader2 } from 'lucide-react';

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ono-gray-light flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-ono-green animate-spin" />
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}

function SetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // On mount: verify the token from URL to establish a session
  useEffect(() => {
    const verifyToken = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!tokenHash || !type) {
        // No token — check if we already have a session (maybe user navigated here directly)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setVerified(true);
          setVerifying(false);
          return;
        }
        setError('קישור לא תקין. בקש מהאדמין קישור חדש.');
        setVerifying(false);
        return;
      }

      // Verify OTP — this establishes a session in the browser
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'recovery' | 'invite',
      });

      if (verifyError) {
        console.error('Token verify error:', verifyError);
        setError('הקישור פג תוקף או כבר נוצל. בקש מהאדמין קישור חדש.');
        setVerifying(false);
        return;
      }

      setVerified(true);
      setVerifying(false);
    };

    verifyToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      if (updateError.message.includes('same password')) {
        setError('יש לבחור סיסמה שונה מהסיסמה הנוכחית');
      } else {
        setError(updateError.message);
      }
      setLoading(false);
      return;
    }

    // Ensure profile exists after password set
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        }),
      });
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-ono-gray-light flex items-center justify-center">
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-8 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-ono-green rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">AH</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-ono-gray-dark mb-2 text-center">
          AssetHub
        </h1>

        {verifying ? (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 text-ono-green mx-auto mb-4 animate-spin" />
            <p className="text-ono-gray">מאמת את הקישור...</p>
          </div>
        ) : success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-ono-green mx-auto mb-4" />
            <p className="text-lg font-medium text-ono-gray-dark mb-2">
              הסיסמה נקבעה בהצלחה!
            </p>
            <p className="text-ono-gray text-sm">
              מעביר אותך למערכת...
            </p>
          </div>
        ) : !verified ? (
          <div className="text-center py-8">
            <div className="bg-ono-orange-light border border-ono-orange/30 rounded-md p-4 mb-4">
              <p className="text-sm text-ono-orange">{error}</p>
            </div>
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="mt-2"
            >
              חזור לדף ההתחברות
            </Button>
          </div>
        ) : (
          <>
            <p className="text-ono-gray mb-6 text-center">
              הוזמנת להצטרף למערכת. אנא בחר סיסמה לחשבונך.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>סיסמה חדשה</Label>
                <Input
                  dir="ltr"
                  type="password"
                  className="mt-1 text-left"
                  placeholder="לפחות 6 תווים"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label>אימות סיסמה</Label>
                <Input
                  dir="ltr"
                  type="password"
                  className="mt-1 text-left"
                  placeholder="הקלד שוב את הסיסמה"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-ono-orange-light border border-ono-orange/30 rounded-md p-3">
                  <p className="text-sm text-ono-orange">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full bg-ono-green hover:bg-ono-green-dark text-white py-3 text-base"
              >
                {loading ? 'שומר...' : 'קבע סיסמה והתחבר'}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ono-gray">
              <KeyRound className="w-3.5 h-3.5" />
              <p>לאחר קביעת הסיסמה, תוכל להתחבר עם מייל וסיסמה.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
