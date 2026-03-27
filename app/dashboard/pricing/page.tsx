'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Shield, Check, ArrowLeft, Crown, Zap, Sparkles } from 'lucide-react';

export default function PricingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('plans').select('*').eq('is_active', true).order('sort_order');
      if (p) setPlans(p);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('plan, stamp_quota, stamps_used, plan_expires_at').eq('id', user.id).single();
        setProfile(prof);
      }
    })();
  }, [supabase]);

  const remaining = profile ? Math.max(profile.stamp_quota - profile.stamps_used, 0) : 0;

  function formatPrice(idr: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(idr);
  }

  const icons: Record<string, any> = { free: Zap, basic: Sparkles, premium: Crown };

  return (
    <div className="min-h-screen bg-surface-50">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-surface-200">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-ink-400 hover:text-ink-600 flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <div className="flex items-center gap-1.5 text-ink-900">
            <Shield className="w-4 h-4 text-brand-600" />
            <span className="font-display text-sm">Beli Kuota Stamp</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-5 py-10">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl text-ink-950 mb-2">Pilih Paket Anda</h1>
          <p className="text-ink-400 text-sm">Sisa kuota Anda: <strong className="text-ink-700">{remaining} stamp</strong></p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const Icon = icons[plan.plan_type] || Zap;
            const isCurrent = profile?.plan === plan.plan_type && plan.id === 'free';
            const isPremium = plan.plan_type === 'premium';
            const features: string[] = plan.features || [];

            return (
              <div key={plan.id}
                className={`bg-white rounded-2xl border p-5 flex flex-col transition-all hover:shadow-md ${
                  isPremium ? 'border-amber-300 ring-1 ring-amber-200 shadow-sm shadow-amber-100' : 'border-surface-200'
                }`}>
                {isPremium && (
                  <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit mb-3 flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5" /> RECOMMENDED
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isPremium ? 'text-amber-500' : 'text-ink-400'}`} />
                  <h3 className="font-display text-lg text-ink-900">{plan.name}</h3>
                </div>
                <p className="text-xs text-ink-400 mb-4">{plan.description}</p>

                <div className="mb-4">
                  <span className="font-display text-2xl text-ink-950">
                    {plan.price_idr === 0 ? 'Rp 0' : formatPrice(plan.price_idr)}
                  </span>
                  {plan.duration_days && <span className="text-xs text-ink-400"> /bulan</span>}
                  {!plan.duration_days && plan.price_idr > 0 && <span className="text-xs text-ink-400"> sekali beli</span>}
                </div>

                <ul className="space-y-2 mb-5 flex-1">
                  {features.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-ink-600">
                      <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isPremium ? 'text-amber-500' : 'text-brand-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.id === 'free' ? (
                  <div className="text-center text-xs text-ink-300 font-medium py-2">
                    {isCurrent ? 'Paket Anda saat ini' : 'Sudah termasuk'}
                  </div>
                ) : (
                  <Link href={`/dashboard/payment?plan=${plan.id}`}
                    className={`text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isPremium
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                        : 'bg-ink-950 hover:bg-ink-800 text-white'
                    }`}>
                    Beli Sekarang
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 bg-white rounded-xl border border-surface-200 p-5 text-center">
          <h3 className="font-display text-lg text-ink-900 mb-2">Pembayaran Manual via Transfer Bank</h3>
          <p className="text-sm text-ink-400 max-w-md mx-auto">
            Setelah memilih paket, transfer ke rekening BCA kami lalu upload bukti transfer. Admin akan memverifikasi dan menambah kuota Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
