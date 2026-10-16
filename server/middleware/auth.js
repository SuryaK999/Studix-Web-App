require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

let admin = null;

async function initFirebaseAdmin() {
  if (admin) return admin;

  try {
    console.log('⏳ Initializing Firebase Admin SDK...');
    admin = require('firebase-admin');

    if (admin.apps.length > 0) {
      admin = admin.app();
      return admin;
    }

    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
      );
      credential = admin.credential.cert(serviceAccount);
    }
    else {
      
      const saPath = require('path').resolve(__dirname, '../serviceAccountKey.json');
      if (require('fs').existsSync(saPath)) {
        credential = admin.credential.cert(saPath);
      } else if (process.env.FIREBASE_PROJECT_ID) {
        credential = admin.credential.applicationDefault();
      } else {
        throw new Error('No serviceAccountKey.json found and no Firebase Env vars set');
      }
    }

    admin.initializeApp({ credential });
    console.log('✅ Firebase Admin SDK initialized successfully');
    return admin;
  } catch (err) {
    console.error('❌ Firebase Admin init failed:', err.message);
    admin = null;
    return null;
  }
}

async function firebaseAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication required: no token provided'));
  }

  try {
    const adminSdk = await initFirebaseAdmin();

    if (!adminSdk) {
      
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  Firebase Admin not configured. Skipping auth in dev mode.');
        socket.user = {
          uid: socket.handshake.auth?.uid || `anon-${socket.id}`,
          email: null,
          displayName: socket.handshake.auth?.displayName || 'Anonymous',
          photoURL: null,
        };
        return next();
      }
      return next(new Error('Server auth configuration error'));
    }

    const decoded = await adminSdk.auth().verifyIdToken(token);

    socket.user = {
      uid:         decoded.uid,
      email:       decoded.email || null,
      displayName: decoded.name || decoded.email || 'Anonymous',
      photoURL:    decoded.picture || null,
    };

    try {
      const User = require('../models/User');
      User.findOneAndUpdate(
        { uid: decoded.uid },
        {
          uid:         decoded.uid,
          email:       decoded.email || null,
          displayName: decoded.name || 'Anonymous',
          photoURL:    decoded.picture || null,
          lastSeen:    new Date(),
        },
        { upsert: true, new: true }
      ).exec().catch(() => {}); 
    } catch (_) {}

    return next();
  } catch (err) {
    console.warn(`⚠️  Socket auth failed [${socket.id}]: ${err.message}`);
    return next(new Error('Invalid or expired token'));
  }
}

function expressAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  initFirebaseAdmin()
    .then((adminSdk) => {
      if (!adminSdk) {
        if (process.env.NODE_ENV !== 'production') {
          req.user = { uid: 'anon-' + Math.random().toString(36).substr(2, 9), displayName: 'Dev User' };
          return next();
        }
        return res.status(500).json({ error: 'Auth not configured' });
      }

      return adminSdk.auth().verifyIdToken(token);
    })
    .then((decoded) => {
      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        displayName: decoded.name || decoded.email || 'Anonymous',
        photoURL: decoded.picture || null,
      };
      
      try {
        const User = require('../models/User');
        User.findOneAndUpdate(
          { uid: decoded.uid },
          {
            uid:         decoded.uid,
            email:       decoded.email || null,
            displayName: decoded.name || 'Anonymous',
            photoURL:    decoded.picture || null,
            lastSeen:    new Date(),
          },
          { upsert: true, new: true }
        ).exec().catch(() => {});
      } catch (_) {}

      next();
    })
    .catch((err) => {
      res.status(401).json({ error: 'Invalid or expired token' });
    });
}

module.exports = { firebaseAuthMiddleware, expressAuthMiddleware, initFirebaseAdmin };
