import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== "demo",
);

// In development (vite dev server, port 5173) we bypass real authentication
// for convenience, so you never have to log in. Production builds
// (vite build / preview, port 5174) always require a real login.
export const isDevBypass = import.meta.env.DEV;

// Use browser-local persistence whenever we're not backed by a real
// authenticated Firebase session — i.e. the dev bypass is active, or Firebase
// simply isn't configured. This keeps the dev demo user off of Firestore
// (whose rules would reject its unauthenticated, fake uid).
export const useLocalPersistence = isDevBypass || !isFirebaseConfigured;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };
