'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import {
  Shield, Plus, FileText, Eye, LogOut, Copy, Check,
  BarChart3, Users, Clock, ExternalLink, Trash2, QrCode,
  Stamp, CreditCard, Crown, Zap, Settings
} from 'lucide-react';

export default function DashboardPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'docs' | 'logs'>('docs');

  const supabase = createClient();
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    const { data: rawDocs } = await supabase.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (rawDocs) {
      const withCounts = await Promise.all(rawDocs.map(async (d: any) => {
        const { count } = await supabase.from('verification_logs').select('*', { count: 'exact', head: true }).eq('document_id', d.id);
        return { ...d, verification_count: count || 0 };
      }));
      setDocs(withCounts);
    }

    const { data: rawLogs } = await supabase.from('verification_logs').select('id, email, verified_at, document:documents(title)').order('verified_at', { ascending: false }).limit(20);
    if (rawLogs) setLogs(rawLogs);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load]);

  async function deactivate(id: string) {
    if (!confirm('Nonaktifkan dokumen ini?')) return;
    await supabase.from('documents').update({ is_active: false }).eq('id', id);
    load();
  }

  function copyUrl(qrId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/?code=${qrId}`);
    setCopiedId(qrId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const quotaUsed = profile?.stamps_used || 0;
  const quotaTotal = profile?.stamp_quota || 3;
  const quotaPct = Math.min((quotaUsed / quotaTotal) * 100, 100);
  const remaining = Math.max(quotaTotal - quotaUsed, 0);
  const isPremium = profile?.plan === 'premium';
  const isExpired = isPremium && profile?.plan_expires_at && new Date(profile.plan_expires_at) < new Date();

  const planLabel = profile?.plan === 'premium' ? 'Premium' : profile?.plan === 'basic' ? 'Basic' : 'Gratis';
  const planColor = isPremium ? 'text-amber-600 bg-amber-50 border-amber-200' : profile?.plan === 'basic' ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-ink-500 bg-ink-50 border-ink-200';

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-surface-200">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display text-lg text-ink-900">CekDigiSign</span>
          </Link>
          <div className="flex items-center gap-2">
            {profile?.role === 'admin' && (
              <Link href="/admin" className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1">
                <Settings className="w-3 h-3" /> Admin
              </Link>
            )}
            <Link href="/dashboard/pricing" className="text-[11px] font-semibold text-ink-500 hover:text-brand-600 transition-colors flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Beli Kuota
            </Link>
            <Link href="/dashboard/stamp"
              className="bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-brand-600/20 flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Tanda Tangani
            </Link>
            <div className="flex items-center gap-2 pl-2 border-l border-surface-200 ml-1">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-[10px] font-bold">
                  {(profile?.full_name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); router.refresh(); }} className="text-ink-400 hover:text-ink-600" title="Keluar">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {/* Greeting + plan */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl text-ink-950">
              Halo, {profile?.full_name ? profile.full_name.split(' ')[0] : 'User'}
            </h1>
            <p className="text-ink-400 text-sm mt-0.5">Kelola dokumen dan pantau verifikasi.</p>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold ${planColor}`}>
            {isPremium ? <Crown className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
            {planLabel}
            {isExpired && <span className="text-red-500 ml-1">(Expired)</span>}
          </div>
        </div>

        {/* Quota bar */}
        <div className="bg-white rounded-xl border border-surface-200 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-ink-600">Kuota Stamp</span>
              <span className="text-xs font-mono text-ink-400">{quotaUsed} / {isPremium && !isExpired ? '∞' : quotaTotal}</span>
            </div>
            <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${isPremium && !isExpired ? 15 : quotaPct}%`,
                  backgroundColor: quotaPct > 90 ? '#dc2626' : quotaPct > 70 ? '#f59e0b' : '#2f8d62',
                }} />
            </div>
            {remaining <= 0 && !isPremium && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">Kuota habis! Beli kuota tambahan untuk melanjutkan.</p>
            )}
          </div>
          <Link href="/dashboard/pricing"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 whitespace-nowrap flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> {remaining <= 0 ? 'Beli Kuota' : 'Tambah Kuota'}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Dokumen Aktif', value: docs.filter(d => d.is_active).length, icon: FileText },
            { label: 'Total Verifikasi', value: docs.reduce((s: number, d: any) => s + (d.verification_count || 0), 0), icon: Eye },
            { label: 'Sisa Kuota', value: isPremium && !isExpired ? '∞' : remaining, icon: Stamp },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-surface-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-4 h-4 text-ink-300" />
                <span className="text-[10px] font-semibold text-ink-300 uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="font-display text-2xl text-ink-950">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-surface-100 rounded-lg p-0.5 w-fit">
          {(['docs', 'logs'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'}`}>
              {t === 'docs' ? 'Dokumen' : 'Log Verifikasi'}
            </button>
          ))}
        </div>

        {tab === 'docs' && (
          loading ? <div className="bg-white rounded-xl border p-12 text-center text-ink-300 text-sm">Memuat...</div> :
          docs.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <QrCode className="w-10 h-10 text-ink-200 mx-auto mb-3" />
              <p className="text-ink-400 text-sm mb-4">Belum ada dokumen.</p>
              <Link href="/dashboard/stamp" className="inline-flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" /> Buat Stamp Pertama
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc: any) => (
                <div key={doc.id} className={`bg-white rounded-xl border px-4 py-3 hover:shadow-sm transition-all ${!doc.is_active ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: doc.brand_color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm text-ink-900 truncate">{doc.title}</span>
                        {doc.stamp_type === 'branded' && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                        {doc.document_number && <span className="text-[10px] font-mono text-ink-300 bg-surface-100 px-1.5 py-0.5 rounded">{doc.document_number}</span>}
                      </div>
                      <p className="text-[11px] text-ink-400 mt-0.5">{doc.brand_name} · {new Date(doc.signed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-ink-400"><Eye className="w-3 h-3" /> {doc.verification_count}</div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => copyUrl(doc.qr_code_id)} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-400 hover:text-ink-600 transition-colors">
                        {copiedId === doc.qr_code_id ? <Check className="w-3.5 h-3.5 text-brand-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <Link href={`/?code=${doc.qr_code_id}`} target="_blank" className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-400 hover:text-ink-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      {doc.is_active && (
                        <button onClick={() => deactivate(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-ink-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'logs' && (
          logs.length === 0 ? <div className="bg-white rounded-xl border p-12 text-center text-ink-300 text-sm">Belum ada log.</div> : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-surface-100">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Dokumen</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-300 uppercase tracking-wider">Waktu</th>
                </tr></thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-700">{l.email}</td>
                      <td className="px-4 py-2.5 text-xs text-ink-500">{(l.document as any)?.title || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-ink-400"><Clock className="w-3 h-3 inline mr-1" />{new Date(l.verified_at).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>
    </div>
  );
}
