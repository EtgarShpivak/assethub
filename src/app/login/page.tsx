'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      if (loginError.message.includes('Invalid login credentials')) {
        setError('מייל או סיסמה שגויים');
      } else if (loginError.message.includes('Email not confirmed')) {
        setError('צריך לאמת את המייל קודם. בדוק את תיבת הדואר.');
      } else {
        setError(loginError.message);
      }
      setLoading(false);
      return;
    }

    // Ensure user profile exists
    if (loginData.user) {
      const profileRes = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: loginData.user.id,
          email: loginData.user.email,
          display_name: loginData.user.user_metadata?.full_name || email.split('@')[0],
        }),
      });

      // Check if user is active
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.inactive) {
          setError('החשבון שלך מושבת. פנה למנהל המערכת.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }
    }

    router.push('/');
    router.refresh();
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
        <p className="text-ono-gray mb-6 text-center">
          מערכת ניהול חומרים שיווקיים — הקריה האקדמית אונו
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>כתובת מייל</Label>
            <Input
              dir="ltr"
              type="email"
              className="mt-1 text-left"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>סיסמה</Label>
            <Input
              dir="ltr"
              type="password"
              className="mt-1 text-left"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            disabled={loading || !email || !password}
            className="w-full bg-ono-green hover:bg-ono-green-dark text-white py-3 text-base"
          >
            {loading ? 'רגע...' : 'התחבר'}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ono-gray">
          <Shield className="w-3.5 h-3.5" />
          <p>הגישה מותרת למשתמשים מורשים בלבד. פנה למנהל המערכת לקבלת חשבון.</p>
        </div>
      </div>
    </div>
  );
}
