'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import {
  Shield, ShieldCheck, ShieldX, Search, Mail, Loader2,
  FileText, Calendar, User, Building2, ArrowRight, Lock,
  QrCode, CheckCircle2, Stamp
} from 'lucide-react';

interface DocResult {
  id: string;
  title: string;
  document_number: string;
  description: string;
  content_text?: string | null;
  file_name: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_color: string;
  signed_at: string;
  signer_name: string;
  signer_avatar: string;
  signer_org: string;
  is_active: boolean;
}

export default function HomeContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || searchParams.get('qr') || '';

  const [searchInput, setSearchInput] = useState(initialCode);
  const [phase, setPhase] = useState<'idle' | 'searching' | 'found' | 'email' | 'verified' | 'not-found'>('idle');
  const [doc, setDoc] = useState<DocResult | null>(null);
  const [email, setEmail] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [error, setError] = useState('');

  const resultRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Auto-search if code provided in URL
  useEffect(() => {
    if (initialCode) {
      handleSearch(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(input?: string) {
    const query = (input || searchInput).trim();
    if (!query) return;

    setPhase('searching');
    setError('');
    setDoc(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('verify_document', { search_input: query });

      if (rpcError || !data) {
        setPhase('not-found');
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        return;
      }

      setDoc(data as DocResult);
      setPhase('email');
      setTimeout(() => emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch {
      setPhase('not-found');
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !doc) return;
    setSubmittingEmail(true);
    setError('');

    try {
      const { data, error: accessError } = await supabase.rpc('access_document_content', {
        document_id: doc.id,
        verifier_email: email,
        verifier_user_agent: navigator.userAgent,
      });

      if (accessError || !data) {
        throw accessError || new Error('Dokumen tidak tersedia');
      }

      setDoc(data as DocResult);
      setPhase('verified');
      setTimeout(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch {
      setError('Gagal memverifikasi. Silakan coba lagi.');
    } finally {
      setSubmittingEmail(false);
    }
  }

  function reset() {
    setPhase('idle');
    setDoc(null);
    setEmail('');
    setSearchInput('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const brandColor = doc?.brand_color || '#2f8d62';

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-surface-200">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <button onClick={reset} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-600/20 group-hover:shadow-md group-hover:shadow-brand-600/30 transition-shadow">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg text-ink-900">CekDigiSign</span>
          </button>
          <Link
            href="/auth"
            className="text-[13px] font-semibold text-ink-500 hover:text-brand-600 transition-colors flex items-center gap-1.5"
          >
            <Lock className="w-3 h-3" />
            Masuk / Daftar
          </Link>
        </div>
      </nav>

      {/* ─── HERO / SEARCH ─── */}
      <section className="pt-16 pb-10 px-5">
        <div className="max-w-xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1 rounded-full text-xs font-semibold mb-5 tracking-wide">
            <ShieldCheck className="w-3 h-3" />
            VERIFIKASI DOKUMEN DIGITAL
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-ink-950 mb-3 leading-tight">
            Cek Keaslian<br />Dokumen Anda
          </h1>
          <p className="text-ink-400 text-[15px] mb-8 max-w-sm mx-auto leading-relaxed">
            Masukkan Kode QR atau Nomor Surat untuk memverifikasi keaslian dokumen yang ditandatangani secara digital.
          </p>

          {/* Search box */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="relative max-w-md mx-auto"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-300" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Kode QR atau Nomor Surat..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-surface-200 bg-white text-ink-900 text-[15px] placeholder:text-ink-300 focus:border-brand-400 transition-colors shadow-sm"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!searchInput.trim() || phase === 'searching'}
                className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white px-5 py-3.5 rounded-xl font-semibold text-[15px] transition-all shadow-sm shadow-brand-600/20 hover:shadow-md hover:shadow-brand-600/25 disabled:shadow-none flex items-center gap-2 whitespace-nowrap"
              >
                {phase === 'searching' ? (
                  <Loader2 className="w-4 h-4 spinner" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Cek
              </button>
            </div>
          </form>

          {/* Hint */}
          <p className="text-[11px] text-ink-300 mt-3">
            Contoh: <span className="font-mono">a1b2c3d4-e5f6-...</span> atau <span className="font-mono">001/SK/III/2026</span>
          </p>
        </div>
      </section>

      {/* ─── RESULTS AREA ─── */}
      <div className="flex-1 px-5 pb-16">
        <div className="max-w-xl mx-auto">

          {/* NOT FOUND */}
          {phase === 'not-found' && (
            <div ref={resultRef} className="animate-fade-in-up text-center py-12">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                <ShieldX className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="font-display text-xl text-ink-900 mb-2">Dokumen Tidak Ditemukan</h2>
              <p className="text-ink-400 text-sm mb-6 max-w-xs mx-auto">
                Kode QR atau Nomor Surat tidak cocok dengan dokumen aktif manapun. Pastikan kode yang dimasukkan benar.
              </p>
              <button onClick={reset} className="text-brand-600 hover:text-brand-700 text-sm font-semibold transition-colors">
                ← Coba Lagi
              </button>
            </div>
          )}

          {/* EMAIL GATE */}
          {phase === 'email' && doc && (
            <div ref={emailRef} className="animate-fade-in-up space-y-5">
              {/* Document preview card */}
              <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: brandColor + '18' }}>
                    <CheckCircle2 className="w-3 h-3" style={{ color: brandColor }} />
                  </div>
                  <span className="text-xs font-semibold tracking-wide" style={{ color: brandColor }}>DOKUMEN DITEMUKAN</span>
                </div>

                <div className="flex items-start gap-3">
                  {doc.brand_logo_url ? (
                    <img src={doc.brand_logo_url} alt="" className="w-11 h-11 rounded-xl object-cover border border-surface-100 flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: brandColor + '12' }}>
                      <FileText className="w-5 h-5" style={{ color: brandColor }} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg text-ink-900 leading-snug">{doc.title}</h3>
                    {doc.document_number && (
                      <p className="text-xs font-mono text-ink-400 mt-0.5">No: {doc.document_number}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-ink-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.signer_name}</span>
                      {doc.signer_org && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{doc.signer_org}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.signed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email form */}
              <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
                <p className="text-sm font-semibold text-ink-700 mb-1">Masukkan email Anda untuk melihat isi dokumen</p>
                <p className="text-xs text-ink-300 mb-4">Email dicatat sebagai bukti siapa saja yang memverifikasi dokumen ini.</p>

                <form onSubmit={handleEmailSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@anda.com"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-surface-50 text-ink-900 text-sm placeholder:text-ink-300 focus:border-brand-400 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingEmail || !email}
                    className="text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 flex items-center gap-2 whitespace-nowrap shadow-sm"
                    style={{ backgroundColor: brandColor }}
                  >
                    {submittingEmail ? <Loader2 className="w-4 h-4 spinner" /> : <ArrowRight className="w-4 h-4" />}
                    Lihat
                  </button>
                </form>

                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              </div>
            </div>
          )}

          {/* VERIFIED — FULL CONTENT */}
          {phase === 'verified' && doc && (
            <div ref={contentRef} className="animate-fade-in-up space-y-5">
              {/* Success header */}
              <div className="text-center py-6">
                <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-4 verified-glow animate-stamp-in" style={{ backgroundColor: brandColor + '12' }}>
                  <ShieldCheck className="w-9 h-9" style={{ color: brandColor }} />
                </div>
                <h2 className="font-display text-2xl text-ink-950 mb-1">Dokumen Terverifikasi</h2>
                <p className="text-ink-400 text-sm">Dokumen ini asli dan ditandatangani secara digital.</p>
              </div>

              {/* Metadata grid */}
              <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <span className="text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Dokumen</span>
                    <p className="font-display text-ink-900 mt-0.5 leading-snug">{doc.title}</p>
                  </div>
                  {doc.document_number && (
                    <div>
                      <span className="text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Nomor Surat</span>
                      <p className="font-mono text-ink-900 mt-0.5">{doc.document_number}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Ditandatangani Oleh</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.signer_avatar && <img src={doc.signer_avatar} alt="" className="w-5 h-5 rounded-full" />}
                      <p className="font-semibold text-ink-900">{doc.signer_name}</p>
                    </div>
                  </div>
                  {doc.signer_org && (
                    <div>
                      <span className="text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Organisasi</span>
                      <p className="font-semibold text-ink-900 mt-0.5">{doc.signer_org}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Tanggal TTD</span>
                    <p className="font-semibold text-ink-900 mt-0.5">
                      {new Date(doc.signed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Status</span>
                    <p className="mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: brandColor + '12', color: brandColor }}>
                        <ShieldCheck className="w-3 h-3" /> TERVERIFIKASI
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Diverifikasi Oleh</span>
                    <p className="font-mono text-sm text-ink-700 mt-0.5">{email}</p>
                  </div>
                </div>
              </div>

              {/* Document body content */}
              {doc.content_text && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <FileText className="w-4 h-4 text-ink-400" />
                    <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Isi Dokumen</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-surface-200 p-6 sm:p-8 shadow-sm">
                    <pre className="whitespace-pre-wrap font-body text-[14px] text-ink-700 leading-relaxed">
                      {doc.content_text}
                    </pre>
                  </div>
                </div>
              )}

              {/* Stamp watermark */}
              <div className="flex justify-center pt-4 opacity-30">
                <svg width="64" height="64" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" fill="none" stroke={brandColor} strokeWidth="3" />
                  <circle cx="100" cy="100" r="78" fill="none" stroke={brandColor} strokeWidth="1.5" />
                  <text x="100" y="95" textAnchor="middle" fill={brandColor} fontFamily="serif" fontSize="14" fontWeight="700" letterSpacing="1.5">
                    {(doc.brand_name || 'CEKDIGISIGN').toUpperCase().slice(0, 14)}
                  </text>
                  <text x="100" y="115" textAnchor="middle" fill={brandColor} fontFamily="serif" fontSize="9" letterSpacing="2">
                    VERIFIED
                  </text>
                </svg>
              </div>

              {/* Verify another */}
              <div className="text-center pt-2">
                <button onClick={reset} className="text-sm text-ink-400 hover:text-brand-600 transition-colors font-medium">
                  ← Verifikasi Dokumen Lain
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-surface-200 py-5 px-5">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-300">
          <div className="flex items-center gap-1.5">
            <Stamp className="w-3 h-3" />
            CekDigiSign &copy; {new Date().getFullYear()}
          </div>
          <div className="flex gap-5">
            <Link href="/auth" className="hover:text-brand-600 transition-colors">Masuk Sebagai Penandatangan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
