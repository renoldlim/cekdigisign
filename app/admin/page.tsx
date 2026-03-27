'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import {
  Shield, Users, CreditCard, FileText, BarChart3, Check, X,
  Clock, Eye, Crown, Zap, ArrowLeft, RefreshCw, DollarSign,
  AlertCircle, ChevronDown, Search
} from 'lucide-react';

export default function AdminPage() {
  const [tab, setTab] = useState<'overview' | 'payments' | 'users'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const supabase = createClient();
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    // Check admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') { router.push('/dashboard'); return; }

    // Stats
    const { data: s } = await supabase.rpc('admin_stats');
    setStats(s);

    // Payments (all, sorted by date)
    const { data: pays } = await supabase
      .from('payments')
      .select('*, profiles:user_id(full_name, email, avatar_url), plans:plan_id(name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (pays) setPayments(pays);

    // Users
    const { data: u } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (u) setUsers(u);

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load]);

  async function handleVerifyPayment(payId: string) {
    if (!confirm('Verifikasi pembayaran ini? Kuota user akan ditambah.')) return;
    setActionLoading(payId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('verify_payment', { payment_id: payId, admin_id: user!.id, admin_note: 'Verified by admin' });
    await load();
    setActionLoading(null);
  }

  async function handleRejectPayment(payId: string) {
    const reason = prompt('Alasan penolakan (opsional):');
    setActionLoading(payId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('reject_payment', { payment_id: payId, admin_id: user!.id, admin_note: reason || 'Rejected' });
    await load();
    setActionLoading(null);
  }

  async function handleSetAdmin(userId: string) {
    if (!confirm('Jadikan user ini admin?')) return;
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
    load();
  }

  async function handleAddQuota(userId: string) {
    const amount = prompt('Tambah berapa kuota stamp?');
    if (!amount || isNaN(Number(amount))) return;
    const { data: p } = await supabase.from('profiles').select('stamp_quota').eq('id', userId).single();
    await supabase.from('profiles').update({ stamp_quota: (p?.stamp_quota || 0) + Number(amount) }).eq('id', userId);
    load();
  }

  function formatIDR(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  }

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const filteredUsers = users.filter(u =>
    !searchQ || (u.full_name || '').toLowerCase().includes(searchQ.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQ.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    verified: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    expired: 'bg-ink-50 text-ink-500 border-ink-200',
  };

  const planColors: Record<string, string> = {
    free: 'text-ink-500 bg-ink-50', basic: 'text-blue-600 bg-blue-50', premium: 'text-amber-600 bg-amber-50',
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-surface-200">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-ink-400 hover:text-ink-600"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div>
              <span className="font-display text-lg text-ink-900">Admin Panel</span>
            </div>
          </div>
          <button onClick={load} className="text-ink-400 hover:text-ink-600 p-1.5 rounded-lg hover:bg-surface-100"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-0.5 w-fit">
          {([
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'payments', label: `Pembayaran${pendingPayments.length ? ` (${pendingPayments.length})` : ''}`, icon: CreditCard },
            { id: 'users', label: 'Users', icon: Users },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${tab === id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Users', value: stats.total_users, icon: Users },
                { label: 'Dokumen', value: stats.total_documents, icon: FileText },
                { label: 'Verifikasi', value: stats.total_verifications, icon: Eye },
                { label: 'Pending Bayar', value: stats.pending_payments, icon: AlertCircle, highlight: stats.pending_payments > 0 },
              ].map((s, i) => (
                <div key={i} className={`bg-white rounded-xl border p-4 ${s.highlight ? 'border-amber-300 bg-amber-50/50' : 'border-surface-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <s.icon className={`w-4 h-4 ${s.highlight ? 'text-amber-500' : 'text-ink-300'}`} />
                    <span className="text-[10px] font-semibold text-ink-300 uppercase">{s.label}</span>
                  </div>
                  <div className="font-display text-2xl text-ink-950">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-surface-200 p-4">
                <div className="flex items-center justify-between mb-2"><DollarSign className="w-4 h-4 text-green-500" /><span className="text-[10px] font-semibold text-ink-300 uppercase">Revenue</span></div>
                <div className="font-display text-xl text-ink-950">{formatIDR(stats.total_revenue)}</div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-4">
                <div className="flex items-center justify-between mb-2"><Crown className="w-4 h-4 text-amber-500" /><span className="text-[10px] font-semibold text-ink-300 uppercase">Premium Users</span></div>
                <div className="font-display text-xl text-ink-950">{stats.premium_users}</div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-4">
                <div className="flex items-center justify-between mb-2"><Zap className="w-4 h-4 text-blue-500" /><span className="text-[10px] font-semibold text-ink-300 uppercase">Basic Users</span></div>
                <div className="font-display text-xl text-ink-950">{stats.basic_users}</div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <p className="font-semibold text-amber-800 mb-1">Rekening BCA untuk Transfer</p>
              <p className="font-mono text-amber-900 text-lg font-bold">0291493555 — a.n. Renold</p>
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {tab === 'payments' && (
          <div className="space-y-4">
            {pendingPayments.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-amber-700">{pendingPayments.length} pembayaran menunggu verifikasi</span>
              </div>
            )}

            {payments.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-ink-300 text-sm">Belum ada pembayaran.</div>
            ) : (
              <div className="space-y-3">
                {payments.map((pay) => (
                  <div key={pay.id} className="bg-white rounded-xl border border-surface-200 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-ink-900">{(pay.profiles as any)?.full_name || 'Unknown'}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[pay.status]}`}>{pay.status.toUpperCase()}</span>
                        </div>
                        <p className="text-xs text-ink-400">{(pay.profiles as any)?.email} · Paket: <strong>{(pay.plans as any)?.name}</strong> · {formatIDR(pay.amount_idr)}</p>
                        <p className="text-xs text-ink-400 mt-0.5">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {new Date(pay.created_at).toLocaleString('id-ID')} · Transfer dari: {pay.transfer_from_name} ({pay.transfer_from_bank})
                        </p>
                        {pay.admin_notes && <p className="text-xs text-ink-500 mt-1 italic">Admin: {pay.admin_notes}</p>}
                      </div>
                      {/* Proof image */}
                      {pay.transfer_proof_url && (
                        <a href={pay.transfer_proof_url} target="_blank" className="w-20 h-20 rounded-lg border border-surface-200 overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity">
                          <img src={pay.transfer_proof_url} alt="Proof" className="w-full h-full object-cover" />
                        </a>
                      )}
                      {/* Actions */}
                      {pay.status === 'pending' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleVerifyPayment(pay.id)} disabled={actionLoading === pay.id}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50">
                            <Check className="w-3 h-3" /> Verifikasi
                          </button>
                          <button onClick={() => handleRejectPayment(pay.id)} disabled={actionLoading === pay.id}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50">
                            <X className="w-3 h-3" /> Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
              <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Cari nama atau email..."
                className="w-full pl-10 pr-4 py-2 border border-surface-200 rounded-xl bg-white text-sm" />
            </div>

            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-surface-100">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-300 uppercase">User</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-300 uppercase">Plan</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-300 uppercase">Kuota</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-300 uppercase">Role</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-300 uppercase">Daftar</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-300 uppercase">Aksi</th>
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" /> :
                              <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold">{(u.full_name || '?').charAt(0)}</div>}
                            <div><p className="text-xs font-semibold text-ink-900">{u.full_name || '—'}</p><p className="text-[10px] text-ink-400">{u.email}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planColors[u.plan]}`}>{u.plan}</span></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-600">{u.stamps_used}/{u.stamp_quota}</td>
                        <td className="px-4 py-2.5">{u.role === 'admin' ? <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Admin</span> : <span className="text-xs text-ink-400">User</span>}</td>
                        <td className="px-4 py-2.5 text-xs text-ink-400">{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => handleAddQuota(u.id)} className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">+Kuota</button>
                            {u.role !== 'admin' && <button onClick={() => handleSetAdmin(u.id)} className="text-[10px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">Admin</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
