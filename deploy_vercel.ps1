$ErrorActionPreference = "Stop"

$envFile = Get-Content -Path ".env" -Raw
$anonKey = [regex]::match($envFile, 'VITE_SUPABASE_ANON_KEY\s*=\s*"?([^"\n\r]+)').Groups[1].Value
$url = "https://neiyihpwsjpjejsyngdj.supabase.co"

if (-not $anonKey) {
    Write-Error "Could not find VITE_SUPABASE_ANON_KEY in .env"
    exit 1
}

Write-Output "Adding VITE_SUPABASE_URL..."
$url | npx vercel env add VITE_SUPABASE_URL production
$url | npx vercel env add VITE_SUPABASE_URL preview
$url | npx vercel env add VITE_SUPABASE_URL development

Write-Output "Adding VITE_SUPABASE_ANON_KEY..."
$anonKey | npx vercel env add VITE_SUPABASE_ANON_KEY production
$anonKey | npx vercel env add VITE_SUPABASE_ANON_KEY preview
$anonKey | npx vercel env add VITE_SUPABASE_ANON_KEY development

Write-Output "Redeploying to Vercel (Production)..."
npx vercel --prod --yes

Write-Output "Deployment finished successfully."
