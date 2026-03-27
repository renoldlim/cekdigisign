# CekDigiSign v2 — Verifikasi Dokumen Digital

Platform tanda tangan digital + verifikasi QR. Seperti e-Meterai, tapi milik Anda.

## Features v2

- **Monetisasi** — Beli kuota stamp (Basic 10/50 atau Premium bulanan Rp50rb)
- **Pilih Posisi Stamp** — Drag posisi QR pada halaman (Premium only)
- **Branded Custom Stamp** — Logo + nama + warna kustom (Premium only)
- **Simple Stamp** — Stamp standar CekDigiSign (Basic/Free)
- **Google OAuth** — Daftar/masuk dengan Google
- **Super Admin Dashboard** — Verifikasi pembayaran, kelola user & kuota
- **Manual Transfer BCA** — Transfer ke 0291493555 (Renold), upload bukti, admin verifikasi
- **Anti-Pemalsuan** — Body text = sumber kebenaran (bukan PDF)

## Arsitektur

```
PUBLIC (tanpa login):
  / → Input QR/No.Surat → Email gate → Lihat body text

DASHBOARD (login required):
  /dashboard           → Dokumen, stats, kuota, log verifikasi
  /dashboard/stamp     → Upload PDF → Pilih posisi → Pilih stamp type → Tanda tangani
  /dashboard/pricing   → Lihat paket & harga
  /dashboard/payment   → Transfer BCA, upload bukti

ADMIN (admin only):
  /admin → Overview (stats, revenue) | Payments (verify/reject) | Users (manage quota/role)

AUTH:
  /auth → Google OAuth + Email/Password
```

## Paket & Harga

| Paket | Harga | Kuota | Fitur |
|-------|-------|-------|-------|
| Gratis | Rp 0 | 3 stamp | Stamp sederhana |
| Basic 10 | Rp 25.000 | 10 stamp | Stamp sederhana + log |
| Basic 50 | Rp 100.000 | 50 stamp | Stamp sederhana + log |
| Premium | Rp 50.000/bln | Unlimited | Branded stamp, logo, posisi kustom |

## Deploy

### 1. Supabase
- Buat project → SQL Editor → paste `supabase/migration.sql` → Run
- Enable Google OAuth (Authentication → Providers → Google)
- Set Site URL: `https://cekdigisign.vercel.app`
- Redirect URL: `https://cekdigisign.vercel.app/auth/callback`

### 2. GitHub + Vercel
```bash
cd cekdigisign
git init && git add . && git commit -m "v2"
git remote add origin https://github.com/cekdigisign/cekdigisign.git
git push -u origin main
```
Vercel: Import repo → env vars:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://cekdigisign.vercel.app
```

### 3. Set Renold as Admin
After Renold registers, run in Supabase SQL Editor:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'renold@email.com';
```

### 4. Custom Domain (Hostinger)
Beli domain only (no hosting). Di Hostinger DNS:
- A: `@` → `76.76.21.21`
- CNAME: `www` → `cname.vercel-dns.com`

## Struktur File (24 files)
```
app/
├── page.tsx                     # Landing = Verifikasi publik
├── auth/page.tsx                # Google OAuth + Email login
├── auth/callback/route.ts       # OAuth callback
├── dashboard/page.tsx           # Dashboard + kuota meter
├── dashboard/stamp/page.tsx     # Stamp wizard (4 steps)
├── dashboard/pricing/page.tsx   # Pilih paket
├── dashboard/payment/page.tsx   # Transfer BCA + bukti
├── admin/page.tsx               # Super admin panel
lib/
├── supabase-browser.ts
├── supabase-server.ts
supabase/migration.sql            # Complete schema
middleware.ts                      # Auth + admin protection
```

## Alur Pembayaran
```
User pilih paket → Transfer ke BCA 0291493555 (Renold)
→ Upload bukti transfer → Status: PENDING
→ Admin buka /admin → Tab Pembayaran → Lihat bukti
→ Klik "Verifikasi" → Kuota user otomatis bertambah
→ Atau klik "Tolak" + alasan
```
