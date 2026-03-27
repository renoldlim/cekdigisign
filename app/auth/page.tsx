'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Shield, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const router = useRouter();
  const supabase = createClient();

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // Otherwise the page redirects to Google
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage('Cek email Anda untuk link konfirmasi!');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-ink-950 relative overflow-hidden items-center justify-center">
        {/* Geometric rings */}
        <div className="absolute inset-0">
          <div className="absolute top-[10%] left-[15%] w-72 h-72 rounded-full border border-brand-500/10" />
          <div className="absolute top-[15%] left-[20%] w-72 h-72 rounded-full border border-brand-500/10" />
          <div className="absolute bottom-[15%] right-[10%] w-48 h-48 rounded-full border border-brand-500/8" />
          <div className="absolute bottom-[25%] right-[30%] w-24 h-24 rounded-full bg-brand-600/5" />
        </div>
        <div className="relative text-center px-12 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-600/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display text-3xl text-white mb-3">CekDigiSign</h2>
          <p className="text-ink-400 leading-relaxed">
            Platform tanda tangan digital dengan QR stamp bermerek. Tandatangani dokumen, dan siapapun bisa memverifikasi keasliannya.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-600 transition-colors mb-8">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali
          </Link>

          <h1 className="font-display text-2xl text-ink-950 mb-1">
            {mode === 'login' ? 'Masuk ke Dashboard' : 'Buat Akun Baru'}
          </h1>
          <p className="text-ink-400 text-sm mb-7">
            {mode === 'login'
              ? 'Kelola dokumen yang Anda tandatangani.'
              : 'Daftar untuk mulai menandatangani dokumen.'}
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-surface-200 rounded-xl py-3 px-4 text-sm font-semibold text-ink-700 hover:bg-surface-50 hover:border-surface-300 transition-all shadow-sm disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {mode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-surface-200" />
            <span className="text-xs text-ink-300 font-medium">atau dengan email</span>
            <div className="flex-1 h-px bg-surface-200" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama lengkap" required
                    className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl bg-white text-sm text-ink-900 placeholder:text-ink-300" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@anda.com" required
                  className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl bg-white text-sm text-ink-900 placeholder:text-ink-300" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 karakter" required minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl bg-white text-sm text-ink-900 placeholder:text-ink-300" />
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs">{error}</div>}
            {message && <div className="bg-brand-50 border border-brand-200 text-brand-700 px-3 py-2 rounded-xl text-xs">{message}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-ink-950 text-white py-3 rounded-xl text-sm font-semibold hover:bg-ink-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 spinner" />}
              {mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-ink-400">
            {mode === 'login' ? (
              <>Belum punya akun? <button onClick={() => { setMode('register'); setError(''); setMessage(''); }} className="text-brand-600 font-semibold hover:underline">Daftar</button></>
            ) : (
              <>Sudah punya akun? <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="text-brand-600 font-semibold hover:underline">Masuk</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
