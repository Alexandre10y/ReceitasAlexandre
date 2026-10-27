import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  waitForPendingWrites,
} from 'firebase/firestore';

const STORAGE_KEY_FIREBASE = 'allsystem_firebase_config_v2';

/** E-mail exclusivo do admin no Firebase Auth (não é login público). */
export const ADMIN_AUTH_EMAIL = 'alexandre10y@outlook.com';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCbfCjOx6WGnSrTw6kCOU0rGDL6osBiaw4',
  authDomain: 'meu-sistema-particular.firebaseapp.com',
  projectId: 'meu-sistema-particular',
  storageBucket: 'meu-sistema-particular.firebasestorage.app',
  messagingSenderId: '822788849308',
  appId: '1:822788849308:web:6081ec464491097a4b7759',
  measurementId: 'G-NT0HW2EEN5',
};

export const FIRESTORE_SETUP_URL =
  'https://console.firebase.google.com/project/meu-sistema-particular/firestore';

export const FIREBASE_AUTH_URL =
  'https://console.firebase.google.com/project/meu-sistema-particular/authentication/users';

export const getStoredFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FIREBASE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler config do Firebase no localStorage:', e);
  }

  return DEFAULT_FIREBASE_CONFIG;
};

export const saveFirebaseConfig = (configObj) => {
  localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(configObj));
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY_FIREBASE);
};

let cachedApp = null;
let cachedDb = null;
let cachedAuth = null;

export const initFirebaseApp = () => {
  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, db: null, auth: null, isConfigured: false };
  }

  try {
    cachedApp = getApps().length === 0 ? initializeApp(config) : getApps()[0];
    cachedDb = getFirestore(cachedApp);
    cachedAuth = getAuth(cachedApp);

    if (typeof window !== 'undefined') {
      isSupported()
        .then((yes) => {
          if (yes) getAnalytics(cachedApp);
        })
        .catch(() => {});
    }

    return {
      app: cachedApp,
      db: cachedDb,
      auth: cachedAuth,
      isConfigured: true,
      projectId: config.projectId,
    };
  } catch (err) {
    console.error('Erro ao inicializar Firebase:', err);
    return { app: null, db: null, auth: null, isConfigured: false, error: err.message };
  }
};

export const getFirebaseAuth = () => {
  const { auth } = initFirebaseApp();
  return auth;
};

export const isAllowedAdminUser = (user) =>
  !!user && String(user.email || '').toLowerCase() === ADMIN_AUTH_EMAIL;

/** Observa sessão Firebase Auth (fonte da verdade do login). */
export const watchAdminAuth = (onChange) => {
  const auth = getFirebaseAuth();
  if (!auth) {
    onChange(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    onChange(isAllowedAdminUser(user) ? user : null);
  });
};

/**
 * Login seguro: só Firebase Auth.
 * O e-mail admin é fixo; a senha é a do Firebase Authentication.
 */
export const loginAdminWithPassword = async (password, rememberSession = true) => {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth não inicializado.');

  const cleanPass = String(password || '').trim();
  if (!cleanPass) throw new Error('Informe a senha.');

  await setPersistence(
    auth,
    rememberSession ? browserLocalPersistence : browserSessionPersistence
  );

  const cred = await signInWithEmailAndPassword(auth, ADMIN_AUTH_EMAIL, cleanPass);
  if (!isAllowedAdminUser(cred.user)) {
    await signOut(auth);
    throw new Error('Conta sem permissão de administrador.');
  }
  return cred.user;
};

export const logoutAdmin = async () => {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
};

const WORKSPACE_COLLECTION = 'allsystem_gestao';
const WORKSPACE_DOC_ID = 'alexandre_beroni_main';

const waitPendingWithTimeout = (db, ms = 10000) =>
  Promise.race([
    waitForPendingWrites(db),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'A nuvem não confirmou a gravação. Verifique Auth + regras do Firestore.'
          )
        );
      }, ms);
    }),
  ]);

const requireAdminAuth = () => {
  const { db, auth, isConfigured } = initFirebaseApp();
  if (!isConfigured || !db || !auth) {
    return { ok: false, reason: 'offline' };
  }
  if (!isAllowedAdminUser(auth.currentUser)) {
    return { ok: false, reason: 'unauthenticated' };
  }
  return { ok: true, db, auth };
};

/**
 * Escuta o workspace na nuvem (somente com admin autenticado).
 * "synced" só quando o dado veio do servidor.
 */
export const subscribeToWorkspaceData = (onDataReceived, onStatusChange) => {
  const gate = requireAdminAuth();
  if (!gate.ok) {
    onStatusChange?.(gate.reason === 'unauthenticated' ? 'auth_required' : 'offline');
    return () => {};
  }

  const docRef = doc(gate.db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
  let sawServerResponse = false;

  const unsubscribe = onSnapshot(
    docRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      const fromCache = snapshot.metadata.fromCache;
      const hasPendingWrites = snapshot.metadata.hasPendingWrites;

      if (!snapshot.exists()) {
        if (fromCache && !sawServerResponse) {
          onStatusChange?.('connecting');
          return;
        }
        sawServerResponse = true;
        onStatusChange?.('empty_cloud');
        return;
      }

      onDataReceived?.(snapshot.data(), { fromCache, hasPendingWrites });

      if (fromCache || hasPendingWrites) {
        onStatusChange?.('cache_only');
        return;
      }

      sawServerResponse = true;
      onStatusChange?.('synced');
    },
    (error) => {
      console.warn('Aviso Firestore:', error.message);
      onStatusChange?.('local_fallback', error.message);
    }
  );

  return unsubscribe;
};

/** Autosave na nuvem — só com sessão admin válida. */
export const saveWorkspaceDataToCloud = async (payload, onStatusChange) => {
  const gate = requireAdminAuth();
  if (!gate.ok) {
    onStatusChange?.(gate.reason === 'unauthenticated' ? 'auth_required' : 'offline');
    return false;
  }

  try {
    onStatusChange?.('saving');
    const docRef = doc(gate.db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
    await setDoc(
      docRef,
      {
        ...payload,
        updatedAt: new Date().toISOString(),
        ownerEmail: ADMIN_AUTH_EMAIL,
      },
      { merge: true }
    );
    await waitPendingWithTimeout(gate.db, 12000);
    onStatusChange?.('synced');
    return true;
  } catch (error) {
    console.warn('Erro ao salvar no Firestore:', error.message);
    onStatusChange?.('local_fallback', error.message);
    return false;
  }
};
