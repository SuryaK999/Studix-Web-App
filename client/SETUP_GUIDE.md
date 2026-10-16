# Studix Setup Guide - Hybrid Architecture

This guide walks you through setting up Studix with the **hybrid architecture**:
- **Firebase**: Authentication, Firestore (chat/notes/tasks), Realtime DB (presence/typing)
- **External Storage**: Cloudflare R2 or Supabase Storage (files/images/voice)

---

## Quick Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        STUDIX APP                            │
├─────────────────────────────────────────────────────────────┤
│  Firebase Auth     →  User authentication                    │
│  Firestore         →  Chat, rooms, notes, tasks (realtime)   │
│  Realtime Database →  Presence, typing, cursors (realtime)   │
│  External Storage  →  Files, images, voice (cheap storage)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Firebase Project

### 1.1 Create Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Name it `studix-app` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click **Create**

### 1.2 Enable Authentication
1. Go to **Authentication** → **Get started**
2. Enable **Email/Password** provider
3. Enable **Google** provider (optional but recommended)
4. For Google: Add your support email and save

### 1.3 Enable Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose **Production mode**
3. Select region closest to your users:
   - `nam5 (us-central)` - US
   - `eur3 (europe-west)` - Europe
   - `asia-northeast1` - Asia
4. Click **Enable**

### 1.4 Enable Realtime Database
1. Go to **Realtime Database** → **Create Database**
2. Choose **Locked mode** (we'll update rules later)
3. Select same region as Firestore
4. Click **Enable**

### 1.5 Get Firebase Config
1. Go to **Project Settings** (gear icon)
2. Scroll to **Your apps**
3. Click **"</>"** (Web icon)
4. Register app as `studix-web`
5. **Copy the config object** - you'll need these values

---

## Step 2: Choose External Storage Provider

### Option A: Supabase Storage (Recommended for Beginners)

**Why Supabase?**
- ✅ Simpler setup
- ✅ Generous free tier (1GB storage, 2GB bandwidth)
- ✅ Easy public URLs
- ✅ Good SDK support

**Setup:**
1. Go to [Supabase](https://supabase.com) and create account
2. Create new project
3. Go to **Storage** → **New bucket**
4. Name: `studix-uploads`
5. Check **"Make bucket public"**
6. Click **Save**
7. Go to **Settings** → **API**
8. Copy:
   - Project URL
   - `anon` public API key

### Option B: Cloudflare R2 (Recommended for Scale)

**Why R2?**
- ✅ Very cheap (near-free for small apps)
- ✅ No egress fees
- ✅ S3-compatible
- ✅ Fast global CDN

**Setup:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **R2** → **Create bucket**
3. Name: `studix-uploads`
4. Go to **R2** → **Manage R2 API Tokens**
5. Create new token with **Object Read & Write** permissions
6. Copy:
   - Access Key ID
   - Secret Access Key
7. Note your Account ID (from sidebar)
8. For public access, either:
   - Use custom domain, OR
   - Enable R2.dev subdomain in bucket settings

---

## Step 3: Configure Environment Variables

### 3.1 Create .env file
```bash
cp .env.example .env
```

### 3.2 Fill in Firebase values
```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:xxx
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

### 3.3 Fill in Storage values (choose ONE)

**For Supabase:**
```env
VITE_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_BUCKET_NAME=studix-uploads
```

**For Cloudflare R2:**
```env
VITE_STORAGE_PROVIDER=r2
VITE_R2_ACCOUNT_ID=your_account_id
VITE_R2_ACCESS_KEY_ID=your_access_key
VITE_R2_SECRET_ACCESS_KEY=your_secret_key
VITE_R2_BUCKET_NAME=studix-uploads
VITE_R2_PUBLIC_URL=https://your-bucket.your-account.r2.dev
```

---

## Step 4: Configure Firebase Security Rules

### 4.1 Firestore Rules
Go to **Firestore Database** → **Rules**, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isRoomMember(roomId) {
      return isAuthenticated() && 
        request.auth.uid in get(/databases/$(database)/documents/rooms/$(roomId)).data.members;
    }

    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }

    match /rooms/{roomId} {
      allow create: if isAuthenticated();
      allow read, update: if isAuthenticated() && request.auth.uid in resource.data.members;
      
      match /messages/{messageId} {
        allow read: if isRoomMember(roomId);
        allow create: if isRoomMember(roomId);
        allow update: if isRoomMember(roomId) && 
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions']);
        allow delete: if false;
      }
      
      match /notes/{noteId} {
        allow read, write: if isRoomMember(roomId);
      }
      
      match /tasks/{taskId} {
        allow read, write: if isRoomMember(roomId);
      }
      
      match /typing/{userId} {
        allow read: if isRoomMember(roomId);
        allow write: if isAuthenticated() && request.auth.uid == userId;
      }
      
      match /whiteboard/{strokeId} {
        allow read, write: if isRoomMember(roomId);
      }
    }
  }
}
```

### 4.2 Realtime Database Rules
Go to **Realtime Database** → **Rules**, paste:

```javascript
{
  "rules": {
    "presence": {
      "$roomId": {
        "$userId": {
          ".read": "auth != null",
          ".write": "auth != null && auth.uid == $userId"
        }
      }
    },
    "cursors": {
      "$roomId": {
        "$userId": {
          ".read": "auth != null",
          ".write": "auth != null && auth.uid == $userId"
        }
      }
    },
    "voice": {
      "$roomId": {
        "$userId": {
          ".read": "auth != null",
          ".write": "auth != null && auth.uid == $userId"
        }
      }
    },
    ".info": {
      "connected": {
        ".read": "auth != null"
      }
    }
  }
}
```

---

## Step 5: Install Dependencies & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Step 6: Create Firestore Indexes

Some queries need composite indexes. Go to **Firestore Database** → **Indexes** → **Composite indexes**:

### Index 1: Messages by room + time
- Collection: `messages`
- Fields:
  1. `createdAt` (Ascending)
- Query scope: Collection

### Index 2: Rooms by member + time
- Collection: `rooms`
- Fields:
  1. `members` (Array contains)
  2. `createdAt` (Descending)
- Query scope: Collection

---

## Cost Comparison

| Service | Firebase Storage | Supabase Storage | Cloudflare R2 |
|---------|------------------|------------------|---------------|
| **Free Tier** | 1GB / 10K downloads | 1GB / 2GB bandwidth | 10GB / 10M requests |
| **Storage** | $0.026/GB | $0.021/GB | $0.015/GB |
| **Bandwidth** | $0.12/GB | $0.09/GB | **FREE** |
| **Requests** | $0.05/10K | Included | $0.36/1M |

**Winner for small apps**: Supabase (simpler)
**Winner for scale**: Cloudflare R2 (no egress fees)

---

## Troubleshooting

### "Permission Denied" Error
- Check Firebase rules are published
- Verify user is authenticated
- Check user is room member

### File Upload Fails
- Check storage provider credentials
- Verify bucket exists and is public
- Check file size < 10MB

### Realtime Not Working
- Check `databaseURL` in config
- Verify Realtime Database rules allow access
- Check browser console for errors

### CORS Errors
- Supabase: Buckets are public by default
- R2: Configure CORS in bucket settings

---

## Architecture Summary

```
┌────────────────────────────────────────────────────────────┐
│  STUDIX HYBRID ARCHITECTURE                                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  FIREBASE (Realtime + Auth)                                │
│  ├── Auth: User authentication                             │
│  ├── Firestore: Chat, rooms, notes, tasks                  │
│  └── Realtime DB: Presence, typing, cursors                │
│                                                             │
│  EXTERNAL STORAGE (Files)                                  │
│  ├── Supabase R2 OR Cloudflare R2                          │
│  ├── Images, PDFs, voice messages                          │
│  └── Public CDN URLs stored in Firestore                   │
│                                                             │
│  BENEFITS:                                                 │
│  ✅ Lower costs (no Firebase Storage fees)                 │
│  ✅ Preserved realtime performance                         │
│  ✅ Scalable media handling                                │
│  ✅ Free-tier friendly                                     │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Need Help?

- Firebase docs: https://firebase.google.com/docs
- Supabase docs: https://supabase.com/docs
- Cloudflare R2 docs: https://developers.cloudflare.com/r2
