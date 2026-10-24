import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  X,
  RotateCcw,
  Download,
  CloudUpload,
  AlertCircle,
} from 'lucide-react';
import {
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  DEFAULT_FIREBASE_CONFIG,
} from '../services/firebaseConfig';

export default function FirebaseModal({
  isOpen,
  onClose,
  firebaseStatus,
  syncState,
  syncError,
  onFirebaseUpdated,
  onForcePushToCloud,
  onResetDemoData,
  onExportBackup,
}) {
  const existing = getStoredFirebaseConfig() || DEFAULT_FIREBASE_CONFIG;
  const [config, setConfig] = useState(existing);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!config.apiKey || !config.projectId) return;
    saveFirebaseConfig(config);
    onFirebaseUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                Firebase Conectado • {config.projectId}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincronização em tempo real com Cloud Firestore + Analytics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Status da Sincronização com Firestore */}
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 ${
              syncState === 'synced'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : syncState === 'local_fallback'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <strong className="text-sm flex items-center gap-1.5">
                {syncState === 'synced' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Nuvem Firestore Sincronizada ({config.projectId})
                  </>
                ) : syncState === 'saving' ? (
                  'Salvando alterações na nuvem Firebase...'
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Firebase Inicializado ({config.projectId})
                  </>
                )}
              </strong>
            </div>

            {syncState === 'local_fallback' && (
              <p className="text-[11px] leading-relaxed">
                O app está conectado ao projeto <strong>{config.projectId}</strong> e salvando localmente. Para ativar a gravação na nuvem, certifique-se de que o <strong>Firestore Database</strong> está criado no painel do Firebase com regras liberadas (<code>allow read, write: if true;</code>).
                {syncError ? ` (${syncError})` : ''}
              </p>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={onForcePushToCloud}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition"
              >
                <CloudUpload className="w-4 h-4" />
                Sincronizar Todos os Dados com a Nuvem Agora
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  projectId
                </label>
                <input
                  type="text"
                  value={config.projectId}
                  onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  authDomain
                </label>
                <input
                  type="text"
                  value={config.authDomain}
                  onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  apiKey
                </label>
                <input
                  type="text"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  measurementId (Analytics)
                </label>
                <input
                  type="text"
                  value={config.measurementId || ''}
                  onChange={(e) => setConfig({ ...config, measurementId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  Backup JSON
                </button>
                <button
                  type="button"
                  onClick={onResetDemoData}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Planilha Base
                </button>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Salvar Config
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
