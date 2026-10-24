import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_KEY_FIREBASE = 'allsystem_firebase_config_v2';

// Configuração Oficial do Firebase do Alexandre Beroni (meu-sistema-particular)
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCbfCjOx6WGnSrTw6kCOU0rGDL6osBiaw4',
  authDomain: 'meu-sistema-particular.firebaseapp.com',
  projectId: 'meu-sistema-particular',
  storageBucket: 'meu-sistema-particular.firebasestorage.app',
  messagingSenderId: '822788849308',
  appId: '1:822788849308:web:6081ec464491097a4b7759',
  measurementId: 'G-NT0HW2EEN5',
};

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

export const initFirebaseApp = () => {
  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, db: null, isConfigured: false };
  }

  try {
    cachedApp = getApps().length === 0 ? initializeApp(config) : getApps()[0];
    cachedDb = getFirestore(cachedApp);

    // Inicializa Analytics quando suportado no navegador
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
      isConfigured: true,
      projectId: config.projectId,
    };
  } catch (err) {
    console.error('Erro ao inicializar Firebase:', err);
    return { app: null, db: null, isConfigured: false, error: err.message };
  }
};

// Documento único consolidado no Firestore para sincronização rápida e econômica em tempo real
const WORKSPACE_COLLECTION = 'allsystem_gestao';
const WORKSPACE_DOC_ID = 'alexandre_beroni_main';

export const subscribeToWorkspaceData = (onDataReceived, onStatusChange) => {
  const { db, isConfigured } = initFirebaseApp();
  if (!isConfigured || !db) {
    onStatusChange?.('offline');
    return () => {};
  }

  const docRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onDataReceived?.(data);
        onStatusChange?.('synced');
      } else {
        onStatusChange?.('empty_cloud');
      }
    },
    (error) => {
      console.warn('Aviso Firestore (verifique regras do Firestore no console):', error.message);
      onStatusChange?.('local_fallback', error.message);
    }
  );

  return unsubscribe;
};

export const saveWorkspaceDataToCloud = async (payload, onStatusChange) => {
  const { db, isConfigured } = initFirebaseApp();
  if (!isConfigured || !db) return false;

  try {
    onStatusChange?.('saving');
    const docRef = doc(db, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
    await setDoc(
      docRef,
      {
        ...payload,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    onStatusChange?.('synced');
    return true;
  } catch (error) {
    console.warn('Erro ao salvar no Firestore:', error.message);
    onStatusChange?.('local_fallback', error.message);
    return false;
  }
};
