// External Storage Configuration
// Choose ONE provider: Cloudflare R2 OR Supabase Storage

// ============================================
// OPTION A: Cloudflare R2 (Recommended)
// ============================================
// Benefits: Very cheap, S3-compatible, no egress fees, fast CDN
// 
// Setup:
// 1. Create Cloudflare account: https://dash.cloudflare.com
// 2. Go to R2 → Create bucket
// 3. Get Access Key ID and Secret Access Key
// 4. Configure CORS on bucket

export const R2_CONFIG = {
  // These values come from environment variables
  accountId: import.meta.env.VITE_R2_ACCOUNT_ID || '',
  accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
  bucketName: import.meta.env.VITE_R2_BUCKET_NAME || 'studix-uploads',
  publicUrl: import.meta.env.VITE_R2_PUBLIC_URL || '', // Custom domain or R2.dev URL
};

// ============================================
// OPTION B: Supabase Storage (Simpler)
// ============================================
// Benefits: Simpler SDK, generous free tier, easy public URLs
//
// Setup:
// 1. Create Supabase project: https://supabase.com
// 2. Go to Storage → Create bucket (make it public)
// 3. Get Project URL and Anon Key

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  bucketName: import.meta.env.VITE_SUPABASE_BUCKET_NAME || 'studix-uploads',
};

// ============================================
// STORAGE SETTINGS
// ============================================
export const STORAGE_SETTINGS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedFileTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
  ],
  imageCompression: {
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    maxIteration: 10,
  },
};

// ============================================
// ACTIVE PROVIDER (Choose ONE)
// ============================================

export const ACTIVE_STORAGE_PROVIDER = 
  (import.meta.env.VITE_STORAGE_PROVIDER) || 'supabase'; // Default to Supabase for easier setup
