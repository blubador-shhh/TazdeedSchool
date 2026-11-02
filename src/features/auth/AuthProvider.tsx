"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  DATA_MODE,
  getFirebaseAuth,
  getProvisioningAuth,
  SCHOOL_ID,
} from "@/lib/firebase/client";
import { createDoc, getDocById, updateDocById } from "@/lib/data/store";
import { DEMO_USERS } from "@/lib/data/seed";
import { isProvisionableRole, type Capability, can } from "@/lib/permissions";
import type { Role, SchoolUser } from "@/types";

/** A profile document as written by the app (id/timestamps are added by the store). */
export type NewSchoolUser = Omit<SchoolUser, "id" | "createdAt" | "updatedAt">;

/**
 * Authentication + user profile context.
 *
 * Firebase mode: Firebase Authentication (email/password) supplies the
 * identity, and `/users/{uid}` in Cloud Firestore supplies the *authorized*
 * role, status and schoolId. Role checks in the UI are convenience only —
 * firestore.rules re-derives them from the same profile document.
 *
 * Local fallback mode (no Firebase project configured): a clearly labelled
 * demo sign-in backed by browser storage, using the fixtures in seed.ts.
 */

const SESSION_KEY = "tazdeed.demo.session";
const DEMO_ACCOUNTS_KEY = "tazdeed.demo.accounts";

export type AuthStatus = "loading" | "signed-out" | "signed-in" | "no-profile" | "disabled";

export interface NewAccountInput {
  email: string;
  password: string;
  displayName: string;
  displayNameBn?: string;
  phone?: string;
  role: Role;
  studentId?: string;
  teacherId?: string;
  guardianStudentIds?: string[];
}

interface AuthValue {
  status: AuthStatus;
  mode: "firebase" | "local";
  uid: string | null;
  email: string | null;
  profile: SchoolUser | null;
  role: Role | null;
  loading: boolean;
  can: (capability: Capability) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  provisionAccount: (input: NewAccountInput) => Promise<{ uid: string; profileCreated: boolean }>;
  createProfileForExistingUid: (input: Omit<NewAccountInput, "email" | "password"> & { uid: string; email: string }) => Promise<void>;
  updateOwnProfile: (patch: Partial<Pick<SchoolUser, "displayName" | "displayNameBn" | "phone" | "photoUrl" | "preferredLanguage">>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

function readDemoAccounts(): { uid: string; email: string; password: string }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEMO_ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as { uid: string; email: string; password: string }[]) : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<SchoolUser | null>(null);

  const loadProfile = useCallback(async (nextUid: string, nextEmail: string | null) => {
    const found = await getDocById<SchoolUser>("users", nextUid);
    if (!found) {
      setProfile(null);
      setStatus("no-profile");
      return null;
    }
    setProfile(found);
    if (found.status === "disabled") {
      setStatus("disabled");
      return found;
    }
    setUid(found.uid ?? nextUid);
    setEmail(found.email || nextEmail);
    setStatus("signed-in");
    return found;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapLocal() {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
      if (!stored) {
        queueMicrotask(() => {
          if (!cancelled) setStatus("signed-out");
        });
        return;
      }
      await loadProfile(stored, DEMO_USERS.find((u) => u.uid === stored)?.email ?? null);
    }

    if (DATA_MODE === "local") {
      void bootstrapLocal();
      return () => {
        cancelled = true;
      };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      queueMicrotask(() => {
        if (!cancelled) setStatus("signed-out");
      });
      return () => {
        cancelled = true;
      };
    }
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (cancelled) return;
        if (!user) {
          setProfile(null);
          setUid(null);
          setEmail(null);
          setStatus("signed-out");
          return;
        }
        setUid(user.uid);
        setEmail(user.email);
        await loadProfile(user.uid, user.email);
      },
      () => {
        if (!cancelled) setStatus("signed-out");
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (emailInput: string, passwordInput: string) => {
      if (DATA_MODE === "local") {
        const account = [...DEMO_USERS, ...readDemoAccounts()].find(
          (candidate) => candidate.email.toLowerCase() === emailInput.trim().toLowerCase(),
        );
        if (!account || account.password !== passwordInput) {
          throw new Error("Incorrect email or password.");
        }
        if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, account.uid);
        const loaded = await loadProfile(account.uid, account.email);
        if (!loaded) throw new Error("No school profile found for this account.");
        if (loaded.status === "disabled") throw new Error("This account is disabled.");
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase Authentication is not configured.");
      const credential = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const loaded = await loadProfile(credential.user.uid, credential.user.email);
      if (!loaded) {
        throw new Error(
          "Signed in, but no /users profile exists for this UID. Ask an administrator to create it.",
        );
      }
      if (loaded.status === "disabled") {
        await signOut(auth);
        throw new Error("This account is disabled. Contact the school office.");
      }
    },
    [loadProfile],
  );

  const signOutUser = useCallback(async () => {
    if (DATA_MODE === "local") {
      if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
      setProfile(null);
      setUid(null);
      setStatus("signed-out");
      return;
    }
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    setProfile(null);
    setUid(null);
    setStatus("signed-out");
  }, []);

  const sendReset = useCallback(async (emailInput: string) => {
    if (DATA_MODE === "local") {
      throw new Error(
        "Password reset needs Firebase Authentication. Configure a Firebase project, or reseed the demo accounts.",
      );
    }
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Authentication is not configured.");
    await sendPasswordResetEmail(auth, emailInput.trim());
  }, []);

  /**
   * Create a non-admin account without losing the administrator's session:
   * a *separate* named Firebase app instance performs createUser, then signs
   * itself out. The matching /users/{uid} profile is written afterwards, and a
   * partial failure is reported honestly so the admin can recover.
   */
  const provisionAccount = useCallback(
    async (input: NewAccountInput) => {
      if (!isProvisionableRole(input.role)) {
        throw new Error("Only teacher, accountant, librarian, student and parent accounts can be created here.");
      }
      const emailValue = input.email.trim().toLowerCase();

      if (DATA_MODE === "local") {
        const existing = await getDocById<SchoolUser>("users", input.email);
        if (existing) throw new Error("That email already has an account.");
        const newUid = `local-${Date.now().toString(36)}`;
        const accounts = readDemoAccounts();
        accounts.push({ uid: newUid, email: emailValue, password: input.password });
        if (typeof window !== "undefined") {
          window.localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
        }
        await createDoc<NewSchoolUser>(
          "users",
          {
            uid: newUid,
            email: emailValue,
            displayName: input.displayName,
            displayNameBn: input.displayNameBn,
            phone: input.phone,
            role: input.role,
            status: "active",
            preferredLanguage: "bn",
            studentId: input.studentId,
            teacherId: input.teacherId,
            guardianStudentIds: input.guardianStudentIds ?? [],
            schoolId: SCHOOL_ID,
          } as NewSchoolUser,
          newUid,
        );
        return { uid: newUid, profileCreated: true };
      }

      const secondary = getProvisioningAuth();
      if (!secondary) throw new Error("Firebase Authentication is not configured.");
      const credential = await createUserWithEmailAndPassword(secondary, emailValue, input.password);
      const newUid = credential.user.uid;
      try {
        await signOut(secondary);
      } catch {
        /* the secondary session is disposable */
      }

      let profileCreated = true;
      try {
        await createDoc<NewSchoolUser>(
          "users",
          {
            uid: newUid,
            email: emailValue,
            displayName: input.displayName,
            displayNameBn: input.displayNameBn,
            phone: input.phone,
            role: input.role,
            status: "active",
            preferredLanguage: "bn",
            studentId: input.studentId,
            teacherId: input.teacherId,
            guardianStudentIds: input.guardianStudentIds ?? [],
            schoolId: SCHOOL_ID,
          } as NewSchoolUser,
          newUid,
        );
      } catch {
        profileCreated = false;
      }
      return { uid: newUid, profileCreated };
    },
    [],
  );

  /** Recovery path when an auth account exists but its profile write failed. */
  const createProfileForExistingUid = useCallback(
    async (input: { uid: string; email: string; displayName: string; role: Role }) => {
      if (!isProvisionableRole(input.role)) throw new Error("Administrators cannot be provisioned from the UI.");
      await createDoc<NewSchoolUser>(
        "users",
        {
          uid: input.uid,
          email: input.email,
          displayName: input.displayName,
          role: input.role,
          status: "active",
          preferredLanguage: "bn",
          guardianStudentIds: [],
          schoolId: SCHOOL_ID,
        } as NewSchoolUser,
        input.uid,
      );
    },
    [],
  );

  const updateOwnProfile = useCallback<AuthValue["updateOwnProfile"]>(
    async (patch) => {
      if (!uid) throw new Error("Not signed in.");
      // Only non-privileged fields — role/status/schoolId/links are admin-only
      // and blocked by firestore.rules even if a client sends them.
      const allowed: Record<string, unknown> = {};
      (["displayName", "displayNameBn", "phone", "photoUrl", "preferredLanguage"] as const).forEach((key) => {
        if (patch[key] !== undefined) allowed[key] = patch[key];
      });
      await updateDocById("users", uid, allowed);
      setProfile((current) => (current ? ({ ...current, ...allowed } as SchoolUser) : current));
    },
    [uid],
  );

  const refreshProfile = useCallback(async () => {
    if (!uid) return;
    await loadProfile(uid, email);
  }, [uid, email, loadProfile]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      mode: DATA_MODE,
      uid,
      email,
      profile,
      role: profile?.role ?? null,
      loading: status === "loading",
      can: (capability) => can(profile?.role ?? null, capability),
      signIn,
      signOutUser,
      sendReset,
      provisionAccount,
      createProfileForExistingUid,
      updateOwnProfile,
      refreshProfile,
    }),
    [
      status,
      uid,
      email,
      profile,
      signIn,
      signOutUser,
      sendReset,
      provisionAccount,
      createProfileForExistingUid,
      updateOwnProfile,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      status: "signed-out",
      mode: DATA_MODE,
      uid: null,
      email: null,
      profile: null,
      role: null,
      loading: false,
      can: () => false,
      signIn: async () => undefined,
      signOutUser: async () => undefined,
      sendReset: async () => undefined,
      provisionAccount: async () => ({ uid: "", profileCreated: false }),
      createProfileForExistingUid: async () => undefined,
      updateOwnProfile: async () => undefined,
      refreshProfile: async () => undefined,
    };
  }
  return context;
}

