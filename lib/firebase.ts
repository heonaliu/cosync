import { getApps, getApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// No Storage export here — Cloud Storage for Firebase now requires the paid
// Blaze plan to provision a bucket at all, so image uploads go to
// Cloudinary's free tier instead (see lib/imageUpload.ts).
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET stays in .env unused rather than
// removed, in case a future Blaze upgrade brings Storage back into play.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);
