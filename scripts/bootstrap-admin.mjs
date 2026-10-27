/**
 * Cria (ou confirma) o usuário admin no Firebase Authentication.
 * Uso: node scripts/bootstrap-admin.mjs [senha]
 * Padrão da senha: ale123@
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const configMatch = readFileSync(resolve(root, 'src/services/firebaseConfig.js'), 'utf8');
const apiKey = (configMatch.match(/apiKey:\s*'([^']+)'/) || [])[1];
const ADMIN_EMAIL = 'alexandre10y@outlook.com';
const password = String(process.argv[2] || 'ale123@').trim();

if (!apiKey) {
  console.error('Não achei apiKey no firebaseConfig.js');
  process.exit(1);
}

const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: ADMIN_EMAIL,
    password,
    returnSecureToken: true,
  }),
});

const data = await res.json();

if (data.error) {
  const msg = data.error.message || '';
  if (msg.includes('EMAIL_EXISTS')) {
    console.log('OK — usuário admin já existe:', ADMIN_EMAIL);
    console.log('Use esta senha no login do All System.');
    process.exit(0);
  }
  console.error('Falha ao criar admin:', msg);
  console.error(
    'Ative Authentication → E-mail/senha em:',
    'https://console.firebase.google.com/project/meu-sistema-particular/authentication/providers'
  );
  process.exit(1);
}

console.log('Admin criado com sucesso.');
console.log('E-mail:', ADMIN_EMAIL);
console.log('UID:', data.localId);
console.log('Faça login no site com a senha definida neste script.');
