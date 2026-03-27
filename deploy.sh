#!/bin/bash
# ============================================
# CekDigiSign — Quick Deploy Script
# Run this after extracting the tar.gz
# ============================================

set -e

echo "🔐 CekDigiSign Deploy Script"
echo "=============================="
echo ""

# 1. Create .env.local
echo "📝 Creating .env.local..."
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://unhmbvhssyfurioewkhb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaG1idmhzc3lmdXJpb2V3a2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTYxMzEsImV4cCI6MjA4OTk5MjEzMX0.JtskLIsMZ14ntz5GxFyyPMAoUqN2Yw8XSWR5niLtLtI
NEXT_PUBLIC_APP_URL=https://cekdigisign.vercel.app
EOF

# 2. Init git & push
echo "📦 Initializing git..."
git init
git add .
git commit -m "CekDigiSign v2 — digital signature platform"

echo ""
echo "🚀 Now run these commands:"
echo ""
echo "  git remote add origin https://github.com/cekdigisign/cekdigisign.git"
echo "  git branch -M main"
echo "  git push -u origin main"
echo ""
echo "Then go to https://vercel.com/new and import the repo."
echo "Add these Environment Variables in Vercel:"
echo ""
echo "  NEXT_PUBLIC_SUPABASE_URL = https://unhmbvhssyfurioewkhb.supabase.co"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGci...(see .env.local)"
echo "  NEXT_PUBLIC_APP_URL = https://cekdigisign.vercel.app"
echo ""
echo "✅ Done! After deploy, set yourself as admin:"
echo "  UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL';"
