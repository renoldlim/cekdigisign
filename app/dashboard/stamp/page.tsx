'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeft, Upload, FileText, Palette, Image as ImageIcon,
  Loader2, Check, Copy, Eye, Plus, Hash, AlignLeft, Stamp,
  Crown, Lock, Move, CreditCard, Shield
} from 'lucide-react';

export default function StampPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Profile / plan
  const [profile, setProfile] = useState<any>(null);

  // Step 1 — document
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [description, setDescription] = useState('');
  const [contentText, setContentText] = useState('');

  // Step 2 — position (premium only, otherwise default)
  const [stampPage, setStampPage] = useState(1);
  const [stampX, setStampX] = useState(0.7);
  const [stampY, setStampY] = useState(0.85);
  const [isDragging, setIsDragging] = useState(false);

  // Step 3 — brand
  const [stampType, setStampType] = useState<'simple' | 'branded'>('simple');
  const [brandName, setBrandName] = useState('CekDigiSign');
  const [brandColor, setBrandColor] = useState('#2f8d62');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Step 4 — result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ qrCodeId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const isPremium = profile?.plan === 'premium' && (!profile?.plan_expires_at || new Date(profile.plan_expires_at) > new Date());
  const remaining = profile ? Math.max(profile.stamp_quota - profile.stamps_used, 0) : 0;
  const canStamp = remaining > 0 || isPremium;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (p) {
        setProfile(p);
        if (p.default_brand_name) setBrandName(p.default_brand_name);
        if (p.default_brand_color) setBrandColor(p.default_brand_color);
      }
    })();
  }, [supabase]);

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isPremium) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setStampX(Math.min(Math.max((e.clientX - rect.left) / rect.width, 0.05), 0.95));
    setStampY(Math.min(Math.max((e.clientY - rect.top) / rect.height, 0.05), 0.95));
  }

  async function handleStamp() {
    if (!file || !title || !contentText.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tidak terautentikasi');

      // Check quota via RPC
      const { data: quotaOk } = await supabase.rpc('use_stamp_quota', { uid: user.id });
      if (!quotaOk) throw new Error('Kuota stamp habis! Silakan beli kuota tambahan.');

      const qrCodeId = uuidv4();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

      const filePath = `${user.id}/${qrCodeId}.pdf`;
      const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
      if (upErr) throw upErr;

      let logoUrl: string | null = null;
      if (logo && stampType === 'branded') {
        const lp = `${user.id}/${qrCodeId}-logo.${logo.name.split('.').pop()}`;
        const { error: le } = await supabase.storage.from('logos').upload(lp, logo);
        if (!le) { const { data: lu } = supabase.storage.from('logos').getPublicUrl(lp); logoUrl = lu.publicUrl; }
      }

      const { error: dbErr } = await supabase.from('documents').insert({
        user_id: user.id,
        title,
        document_number: docNumber || null,
        description,
        file_path: filePath,
        file_name: file.name,
        content_text: contentText.trim(),
        qr_code_id: qrCodeId,
        verification_url: `${appUrl}/?code=${qrCodeId}`,
        stamp_page: stampPage,
        stamp_x: stampX,
        stamp_y: stampY,
        stamp_type: stampType,
        brand_name: stampType === 'branded' ? brandName : 'CekDigiSign',
        brand_logo_url: logoUrl,
        brand_color: stampType === 'branded' ? brandColor : '#2f8d62',
      });
      if (dbErr) throw dbErr;

      if (stampType === 'branded') {
        await supabase.from('profiles').update({ default_brand_name: brandName, default_brand_color: brandColor }).eq('id', user.id);
      }

      setResult({ qrCodeId });
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat stamp');
    } finally {
      setLoading(false);
    }
  }

  const presetColors = ['#2f8d62', '#141416', '#c8a84e', '#7c3aed', '#dc2626', '#2563eb', '#0891b2', '#ea580c'];
  const stepLabels = ['Dokumen', 'Posisi', 'Stamp', 'Selesai'];

  return (
    <div className="min-h-screen bg-surface-50">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-surface-200">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-ink-400 hover:text-ink-600 flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> Dashboard</Link>
          <div className="flex items-center gap-1.5"><Stamp className="w-4 h-4 text-brand-600" /><span className="font-display text-sm text-ink-900">Tanda Tangani</span></div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* No quota warning */}
        {profile && !canStamp && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Kuota stamp habis!</p>
              <p className="text-xs text-red-500">Beli kuota tambahan untuk melanjutkan menandatangani dokumen.</p>
            </div>
            <Link href="/dashboard/pricing" className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Beli
            </Link>
          </div>
        )}

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step > i + 1 ? 'bg-brand-600 text-white' : step === i + 1 ? 'bg-brand-600 text-white' : 'bg-surface-200 text-ink-400'}`}>
                {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step >= i + 1 ? 'text-ink-700' : 'text-ink-300'}`}>{label}</span>
              {i < 3 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-brand-300' : 'bg-surface-200'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1: Document */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in-up">
            <div><h2 className="font-display text-xl text-ink-950 mb-1">Upload Dokumen</h2></div>
            <div onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') { setFile(f); if (!title) setTitle(f.name.replace('.pdf', '')); } }}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file ? 'border-brand-300 bg-brand-50/50' : 'border-surface-200 hover:border-surface-300'}`}>
              <input ref={fileRef} type="file" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f?.type === 'application/pdf') { setFile(f); if (!title) setTitle(f.name.replace('.pdf', '')); } }} className="hidden" />
              {file ? <div className="flex items-center justify-center gap-3"><FileText className="w-7 h-7 text-brand-600" /><div className="text-left"><p className="text-sm font-semibold text-ink-900">{file.name}</p><p className="text-xs text-ink-400">{(file.size/1024/1024).toFixed(2)} MB</p></div></div> : <><Upload className="w-8 h-8 text-ink-300 mx-auto mb-2" /><p className="text-sm text-ink-500">Drop PDF atau klik untuk pilih</p></>}
            </div>
            <div><label className="block text-xs font-semibold text-ink-600 mb-1">Judul *</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Surat Keterangan Kerja" className="w-full px-3.5 py-2.5 border border-surface-200 rounded-xl bg-white text-sm" /></div>
            <div><label className="block text-xs font-semibold text-ink-600 mb-1"><Hash className="w-3 h-3 inline" /> Nomor Surat (opsional)</label><input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="001/SK/III/2026" className="w-full px-3.5 py-2.5 border border-surface-200 rounded-xl bg-white text-sm font-mono" /></div>
            <div><label className="block text-xs font-semibold text-ink-600 mb-1">Deskripsi (opsional)</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3.5 py-2.5 border border-surface-200 rounded-xl bg-white text-sm" /></div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1"><AlignLeft className="w-3 h-3 inline" /> Isi Surat / Body Text *</label>
              <textarea value={contentText} onChange={(e) => setContentText(e.target.value)} placeholder="Paste isi lengkap surat di sini. Ini yang ditampilkan saat verifikasi." rows={8}
                className="w-full px-3.5 py-2.5 border border-surface-200 rounded-xl bg-white text-sm resize-y font-mono leading-relaxed" />
              <p className="text-[11px] text-ink-300 mt-1"><strong>Penting:</strong> Teks ini ditampilkan saat verifikasi, bukan PDF — mencegah pemalsuan.</p>
            </div>
            <button onClick={() => setStep(2)} disabled={!file || !title || !contentText.trim() || !canStamp}
              className="w-full bg-ink-950 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-30">Lanjut →</button>
          </div>
        )}

        {/* STEP 2: Position picker */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in-up">
            <div><h2 className="font-display text-xl text-ink-950 mb-1">Pilih Posisi Stamp</h2>
              <p className="text-sm text-ink-400">{isPremium ? 'Klik pada area dokumen untuk menentukan posisi stamp.' : 'Upgrade ke Premium untuk memilih posisi kustom.'}</p>
            </div>
            {/* Position canvas */}
            <div ref={canvasRef} onClick={handleCanvasClick}
              className={`relative bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden ${isPremium ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ aspectRatio: '210/297' /* A4 ratio */ }}>
              {/* Fake document lines */}
              <div className="p-8 space-y-3 opacity-40">
                {[75, 100, 90, 65, 100, 85, 70, 100, 60, 80, 95, 50].map((w, i) => (
                  <div key={i} className="h-2 bg-ink-100 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
              {/* Stamp indicator */}
              <div className="absolute w-16 h-16 transition-all duration-200"
                style={{ left: `${stampX * 100}%`, top: `${stampY * 100}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: brandColor, backgroundColor: brandColor + '10' }}>
                  <Stamp className="w-5 h-5" style={{ color: brandColor }} />
                </div>
              </div>
              {!isPremium && (
                <div className="absolute inset-0 bg-surface-50/60 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="bg-white rounded-xl border border-surface-200 p-4 text-center shadow-sm">
                    <Lock className="w-5 h-5 text-ink-300 mx-auto mb-2" />
                    <p className="text-xs text-ink-500 font-semibold">Fitur Premium</p>
                    <p className="text-[11px] text-ink-300">Stamp otomatis di kanan bawah</p>
                  </div>
                </div>
              )}
            </div>
            {isPremium && (
              <div className="flex items-center gap-4 text-xs text-ink-400">
                <Move className="w-4 h-4" />
                <span>Posisi: X={Math.round(stampX * 100)}% Y={Math.round(stampY * 100)}%</span>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-5 py-3 border rounded-xl text-sm font-semibold text-ink-600">← Kembali</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-ink-950 text-white py-3 rounded-xl text-sm font-semibold">Lanjut →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Stamp type + brand */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in-up">
            <div><h2 className="font-display text-xl text-ink-950 mb-1">Pilih Tipe Stamp</h2></div>

            {/* Stamp type selection */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStampType('simple')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${stampType === 'simple' ? 'border-brand-500 bg-brand-50' : 'border-surface-200 hover:border-surface-300'}`}>
                <Shield className="w-5 h-5 text-brand-600 mb-2" />
                <p className="text-sm font-semibold text-ink-900">Simple</p>
                <p className="text-[11px] text-ink-400 mt-0.5">Stamp standar CekDigiSign</p>
              </button>
              <button onClick={() => { if (isPremium) setStampType('branded'); }}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''} ${stampType === 'branded' ? 'border-amber-400 bg-amber-50' : 'border-surface-200 hover:border-surface-300'}`}>
                {!isPremium && <Lock className="w-3 h-3 text-ink-400 absolute top-3 right-3" />}
                <Crown className="w-5 h-5 text-amber-500 mb-2" />
                <p className="text-sm font-semibold text-ink-900">Branded</p>
                <p className="text-[11px] text-ink-400 mt-0.5">{isPremium ? 'Logo + nama kustom' : 'Premium only'}</p>
              </button>
            </div>

            {/* Branded settings (only if premium + branded selected) */}
            {stampType === 'branded' && isPremium && (
              <div className="space-y-4 bg-white rounded-xl border border-surface-200 p-5">
                <div><label className="block text-xs font-semibold text-ink-600 mb-1">Nama Brand</label><input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} maxLength={24} className="w-full px-3.5 py-2.5 border border-surface-200 rounded-xl bg-white text-sm" /></div>
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1.5">Warna</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {presetColors.map(c => <button key={c} onClick={() => setBrandColor(c)} className={`w-7 h-7 rounded-full border-2 ${brandColor === c ? 'border-ink-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                    <div className="relative"><input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7" /><div className="w-7 h-7 rounded-full border-2 border-dashed border-ink-300 flex items-center justify-center"><Palette className="w-3 h-3 text-ink-400" /></div></div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1">Logo</label>
                  <div onClick={() => logoRef.current?.click()} className="border border-surface-200 rounded-xl p-3 cursor-pointer hover:bg-surface-50 flex items-center gap-2.5">
                    <input ref={logoRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f?.type.startsWith('image/')) { setLogo(f); const r = new FileReader(); r.onload = ev => setLogoPreview(ev.target?.result as string); r.readAsDataURL(f); } }} className="hidden" />
                    {logoPreview ? <><img src={logoPreview} alt="" className="w-8 h-8 rounded-lg object-cover" /><span className="text-xs text-ink-600 truncate">{logo?.name}</span></> : <><ImageIcon className="w-4 h-4 text-ink-300" /><span className="text-xs text-ink-400">Upload logo</span></>}
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="flex justify-center">
              <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
                <svg viewBox="0 0 200 200" width="140" height="140">
                  <circle cx="100" cy="100" r="92" fill="none" stroke={stampType === 'branded' ? brandColor : '#2f8d62'} strokeWidth="3" opacity="0.85" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke={stampType === 'branded' ? brandColor : '#2f8d62'} strokeWidth="1.5" opacity="0.5" />
                  <text x="100" y="40" textAnchor="middle" fill={stampType === 'branded' ? brandColor : '#2f8d62'} fontFamily="serif" fontSize="11" fontWeight="700" letterSpacing="2">{(stampType === 'branded' ? brandName : 'CEKDIGISIGN').toUpperCase().slice(0, 18)}</text>
                  <rect x="52" y="52" width="96" height="96" rx="6" fill={stampType === 'branded' ? brandColor : '#2f8d62'} opacity="0.06" />
                  <text x="100" y="105" textAnchor="middle" fill={stampType === 'branded' ? brandColor : '#2f8d62'} fontFamily="monospace" fontSize="10" fontWeight="600">QR CODE</text>
                  <text x="100" y="170" textAnchor="middle" fill={stampType === 'branded' ? brandColor : '#2f8d62'} fontFamily="serif" fontSize="7.5" letterSpacing="1.5">DIGITALLY SIGNED</text>
                  <circle cx="16" cy="100" r="2.5" fill={stampType === 'branded' ? brandColor : '#2f8d62'} /><circle cx="184" cy="100" r="2.5" fill={stampType === 'branded' ? brandColor : '#2f8d62'} />
                </svg>
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs">{error}</div>}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="px-5 py-3 border rounded-xl text-sm font-semibold text-ink-600">← Kembali</button>
              <button onClick={handleStamp} disabled={loading}
                className="flex-1 bg-brand-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 spinner" /> Memproses...</> : <><Stamp className="w-4 h-4" /> Tanda Tangani</>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === 4 && result && (
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto verified-glow animate-stamp-in"><Check className="w-8 h-8 text-brand-600" /></div>
            <div><h2 className="font-display text-2xl text-ink-950 mb-1">Dokumen Ditandatangani!</h2><p className="text-sm text-ink-400">Bagikan link verifikasi berikut.</p></div>
            <div className="bg-white rounded-xl border p-4 max-w-md mx-auto">
              <p className="text-[10px] font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Link Verifikasi</p>
              <div className="flex items-center gap-2 bg-surface-50 rounded-lg px-3 py-2">
                <code className="flex-1 text-xs text-ink-700 truncate font-mono">{window.location.origin}/?code={result.qrCodeId}</code>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?code=${result.qrCodeId}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? <Check className="w-4 h-4 text-brand-600" /> : <Copy className="w-4 h-4 text-ink-400" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link href={`/?code=${result.qrCodeId}`} target="_blank" className="inline-flex items-center justify-center gap-1.5 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"><Eye className="w-4 h-4" /> Lihat Verifikasi</Link>
              <Link href="/dashboard" className="inline-flex items-center justify-center gap-1.5 border text-ink-600 px-5 py-2.5 rounded-xl text-sm font-semibold">Dashboard</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
