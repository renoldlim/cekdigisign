import { Suspense } from 'react';
import PaymentContent from './payment-content';

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-ink-300">Memuat...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
