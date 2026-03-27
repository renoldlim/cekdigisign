import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CekDigiSign — Verifikasi Dokumen Digital',
  description: 'Verifikasi keaslian dokumen digital yang ditandatangani dengan QR stamp. Cek Nomor Surat atau scan QR Code.',
  openGraph: {
    title: 'CekDigiSign — Verifikasi Dokumen Digital',
    description: 'Verifikasi keaslian dokumen yang ditandatangani secara digital.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="grain bg-surface-50 text-ink-950 min-h-screen">
        {children}
      </body>
    </html>
  );
}
