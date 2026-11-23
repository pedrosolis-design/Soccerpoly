import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;

function resolveCredentialsEmail(rawIdentifier: string): {
  email: string;
  displayLabel: string;
} {
  const trimmed = rawIdentifier.trim();
  if (trimmed.includes('@')) {
    const lowerEmail = trimmed.toLowerCase();
    const prefix = lowerEmail.split('@')[0]?.slice(0, 20) || 'DT 412';
    return { email: lowerEmail, displayLabel: prefix };
  }

  const normalized = trimmed.toLowerCase();
  if (!USERNAME_RE.test(normalized)) {
    throw new Error('M412_INVALID_USERNAME');
  }

  return {
    email: `${normalized}@players.monopolio412.app`,
    displayLabel: trimmed.slice(0, 20),
  };
}

export async function signInWithUsernamePassword(
  identifier: string,
  password: string
) {
  const { email } = resolveCredentialsEmail(identifier);
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithUsernamePassword(
  identifier: string,
  password: string
) {
  const { email, displayLabel } = resolveCredentialsEmail(identifier);
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await updateProfile(credential.user, { displayName: displayLabel });
  } catch {
    // Non-blocking if displayName update fails
  }
  return credential;
}

export async function signOutUser() {
  return signOut(auth);
}
