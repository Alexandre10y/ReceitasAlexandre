import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, KeyRound, Sun, Moon } from 'lucide-react';

const ADMIN_PASS_STORAGE_KEY = 'allsystem_admin_custom_password_v1';
export const DEFAULT_ADMIN_PASSWORD = 'ale123@';
export const ALLOWED_ADMIN_USERS = ['alexandre', 'admin', 'allsystem', 'alexandreberoni'];

export const getConfiguredAdminPassword = () => {
  return localStorage.getItem(ADMIN_PASS_STORAGE_KEY) || DEFAULT_ADMIN_PASSWORD;
};

export const setConfiguredAdminPassword = (newPass) => {
  if (newPass && newPass.trim()) {
    localStorage.setItem(ADMIN_PASS_STORAGE_KEY, newPass.trim());
  }
};

export default function AdminLoginScreen({ onLoginSuccess, darkMode, onToggleDarkMode }) {
  const [username, setUsername] = useState('alexandre');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const expectedPass = getConfiguredAdminPassword();

    const isValidUser =
      !cleanUser ||
      ALLOWED_ADMIN_USERS.includes(cleanUser) ||
      cleanUser.includes('alexandre') ||
      cleanUser.includes('admin');

    const isValidPass =
      cleanPass === expectedPass || cleanPass === DEFAULT_ADMIN_PASSWORD;

    if (isValidUser && isValidPass) {
      onLoginSuccess(rememberSession);
    } else {
      setErrorMsg('Senha ou usuário incorretos. Verifique suas credenciais de Administrador.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative transition-colors duration-200">
      {/* Botão Dark/Light no canto superior direito */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span>Modo Escuro</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
            AS
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Ambiente Privado • Acesso Administrador
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            All System • Alexandre Beroni
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sistema protegido para publicação na Vercel. Insira sua credencial de administrador para acessar a planilha e os dados financeiros.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Usuário Administrador
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alexandre ou admin"
                className="w-full pl-10 pr-4 py-3 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Senha de Administrador
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha de administrador"
                className="w-full pl-10 pr-11 py-3 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Manter conectado neste aparelho
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-extrabold text-sm shadow-lg transition active:scale-95"
          >
            <Lock className="w-4 h-4" />
            Entrar como Administrador
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            All System • Conexão Segura Firebase & Gemini IA
          </p>
        </div>
      </div>
    </div>
  );
}
