# 🎙️ Firebase Storage Guide for Studix

To enable voice recordings and file uploads, you must configure Firebase Storage correctly.

## 1. Get your Storage Bucket Name
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project (**studix-app999**).
3.  Click on **Build** -> **Storage** in the left sidebar.
4.  Copy the URL shown at the top (e.g., `studix-app999.firebasestorage.app`).
    - *Note: Do not include the `gs://` prefix.*

## 2. Update your `.env` File
Ensure your `.env` file contains the following line:

```env
VITE_FIREBASE_STORAGE_BUCKET=studix-app999.firebasestorage.app
```

## 3. Enable Storage Rules
For voice recordings to upload without authentication errors during development:
1.  In the Firebase Storage tab, click on **Rules**.
2.  Set the rules to allow read/write for testing:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; //⚠️ Update for production!
    }
  }
}
```

## 4. Restart the App
After changing the `.env` file, you **must restart your development server**:

```bash
# Stop current server (Ctrl+C)
npm run dev
```
