import { getApp, initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  signInWithEmailAndPassword,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase client bootstrap (Spark plan).
 *
 * Only **Authentication** and **Cloud Firestore** are used. Cloud Storage,
 * Cloud Functions, the Admin SDK and App Hosting are deliberately not part of
 * this project. These config values are public by design — access control is
 * enforced exclusively by `firestore.rules`.
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

/** Single-school identifier stored on every document. */
export const SCHOOL_ID = (process.env.NEXT_PUBLIC_SCHOOL_ID || "tazdeed-school").trim();

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

export const localFallbackAllowed =
  (process.env.NEXT_PUBLIC_ENABLE_LOCAL_FALLBACK ?? "true").toLowerCase() !== "false";

/** `firebase` = real Cloud Firestore, `local` = browser-only demo fallback. */
export type DataMode = "firebase" | "local";

export const DATA_MODE: DataMode = isFirebaseConfigured ? "firebase" : "local";

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (cachedApp) return cachedApp;
  const existing = getApps();
  cachedApp = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
  return cachedApp;
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured || typeof window === "undefined") return null;
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    cachedAuth = getAuth(app);
  } catch {
    cachedAuth = initializeAuth(app, { persistence: browserLocalPersistence });
  }
  return cachedAuth;
}

/**
 * A *separate* named Firebase app used to create new accounts. Creating a user
 * through the primary auth instance would sign the current administrator out;
 * the secondary instance keeps the admin session intact.
 */
let provisioningAuth: Auth | null = null;
export function getProvisioningAuth(): Auth | null {
  if (!isFirebaseConfigured || typeof window === "undefined") return null;
  if (provisioningAuth) return provisioningAuth;
  try {
    const secondary = getApps().find((a) => a.name === "provisioning") ?? initializeApp(firebaseConfig, "provisioning");
    try {
      provisioningAuth = getAuth(secondary);
    } catch {
      provisioningAuth = initializeAuth(secondary, { persistence: browserLocalPersistence });
    }
  } catch {
    return null;
  }
  return provisioningAuth;
}

export function getFirebaseDb(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  if (cachedDb) return cachedDb;
  const app = getFirebaseApp();
  if (!app) return null;
  cachedDb = getFirestore(app);
  return cachedDb;
}

export function authErrorCode(error: unknown): string {
  return (error as { code?: string })?.code ?? "auth/unknown";
}

export { getApp, signInWithEmailAndPassword };
