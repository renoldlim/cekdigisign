'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { ArrowLeft, Shield, Upload, Loader2, Check, Copy, Clock, Image as ImageIcon } from 'lucide-react';

const BCA_ACCOUNT = '0291493555';
const BCA_NAME = 'Renold';

export default function PaymentContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan') || '';
  const router = useRouter();
  const supabase = createClient();

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Form
  const [fromName, setFromName] = useState('');
  const [fromBank, setFromBank] = useState('BCA');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!planId) { router.push('/dashboard/pricing'); return; }
      const { data: p } = await supabase.from('plans').select('*').eq('id', planId).single();
      if (!p) { router.push('/dashboard/pricing'); return; }
      setPlan(p);

      // Pre-fill name from profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (prof?.full_name) setFromName(prof.full_name);
      }
      setLoading(false);
    })();
  }, [planId, supabase, router]);

  function onProof(f: File | undefined) {
    if (f && f.type.startsWith('image/')) {
      setProofFile(f);
      const r = new FileReader();
      r.onload = (e) => setProofPreview(e.target?.result as string);
      r.readAsDataURL(f);
    }
  }

  function copyAccount() {
    navigator.clipboard.writeText(BCA_ACCOUNT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proofFile || !fromName) return;
    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload proof image
      const proofPath = `${user.id}/${Date.now()}-${proofFile.name}`;
      const { error: upErr } = await supabase.storage.from('payment-proofs').upload(proofPath, proofFile);
      if (upErr) throw upErr;

      // Insert payment record
      const { error: dbErr } = await supabase.from('payments').insert({
        user_id: user.id,
        plan_id: planId,
        amount_idr: plan.price_idr,
        transfer_proof_url: proofPath,
        transfer_from_name: fromName,
        transfer_from_bank: fromBank,
        transfer_date: new Date().toISOString(),
        notes,
      });
      if (dbErr) throw dbErr;

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim');
    } finally {
      setSubmitting(false);
    }
  }

  function formatPrice(idr: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(idr);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-300">Memuat...</div>;

  return (
    <div className="min-h-screen bg-surface-50">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-surface-200">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/dashboard/pricing" className="text-sm text-ink-400 hover:text-ink-600 flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Pilih Paket
          </Link>
          <div className="flex items-center gap-1.5 text-ink-900">
            <Shield className="w-4 h-4 text-brand-600" />
            <span className="font-display text-sm">Pembayaran</span>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-5 py-10">
        {submitted ? (
          /* Success */
          <div className="text-center py-12 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-5 verified-glow">
              <Check className="w-8 h-8 text-brand-600" />
            </div>
            <h2 className="font-display text-2xl text-ink-950 mb-2">Pembayaran Terkirim!</h2>
            <p className="text-sm text-ink-400 mb-6 max-w-xs mx-auto">
              Admin akan memverifikasi pembayaran Anda. Kuota akan ditambahkan setelah diverifikasi (biasanya dalam 1×24 jam).
            </p>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
              Kembali ke Dashboard
            </Link>
          </div>
        ) : (
          /* Payment form */
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="font-display text-2xl text-ink-950 mb-1">Transfer Manual</h1>
              <p className="text-sm text-ink-400">Transfer ke rekening BCA berikut, lalu upload bukti transfer.</p>
            </div>

            {/* Order summary */}
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink-400">Paket</p>
                  <p className="font-display text-lg text-ink-900">{plan.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{plan.stamp_quota === 9999 ? 'Unlimited' : plan.stamp_quota} stamp{plan.duration_days ? ' /bulan' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-400">Total</p>
                  <p className="font-display text-2xl text-ink-950">{formatPrice(plan.price_idr)}</p>
                </div>
              </div>
            </div>

            {/* Bank details */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Transfer ke Rekening BCA</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">No. Rekening</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-900 text-lg tracking-wider">{BCA_ACCOUNT}</span>
                    <button onClick={copyAccount} className="text-blue-500 hover:text-blue-700 transition-colors">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">Atas Nama</span>
                  <span className="font-semibold text-blue-900">{BCA_NAME}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">Jumlah Transfer</span>
                  <span className="font-bold text-blue-900">{formatPrice(plan.price_idr)}</span>
                </div>
              </div>
            </div>

            {/* Upload proof */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Nama Pengirim *</label>
                <input type="text" value={fromName} onChange={(e) => setFromName(e.target.value)} required
                  className="w-full px-3.5 py-2.5 border border-surface-200 rounded-xl bg-white text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Bank Pengirim</label>
                <select value={fromBank} onChange={(e) => setFromBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-surface-200 rounded-xl bg-white text-sm">
                  {['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Permata', 'Danamon', 'GoPay', 'OVO', 'Dana', 'Lainnya'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Bukti Transfer (screenshot) *</label>
                <div onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    proofPreview ? 'border-brand-300 bg-brand-50/50' : 'border-surface-200 hover:border-surface-300'
                  }`}>
                  <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onProof(e.target.files?.[0])} className="hidden" />
                  {proofPreview ? (
                    <img src={proofPreview} alt="Proof" className="max-h-48 mx-auto rounded-lg" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-ink-300 mx-auto mb-2" />
                      <p className="text-sm text-ink-500">Klik untuk upload bukti transfer</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Catatan (opsional)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Info tambahan..."
                  className="w-full px-3.5 py-2.5 border border-surface-200 rounded-xl bg-white text-sm" />
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs">{error}</div>}

              <button type="submit" disabled={submitting || !proofFile || !fromName}
                className="w-full bg-brand-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 spinner" /> Mengirim...</> : <><Upload className="w-4 h-4" /> Kirim Bukti Transfer</>}
              </button>
            </form>

            <div className="flex items-start gap-2 bg-surface-100 rounded-xl p-3">
              <Clock className="w-4 h-4 text-ink-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-ink-400">
                Verifikasi biasanya dilakukan dalam <strong>1×24 jam</strong>. Setelah diverifikasi, kuota stamp Anda akan otomatis bertambah.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
