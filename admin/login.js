/* ============================================================
   BRASIL CIENTÍFICA — Login (página separada)
   Se já houver sessão ativa, redireciona direto para o painel.
   ============================================================ */

import { auth } from '../firebase-config.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

/* Se já estiver logado, pula direto para o painel */
onAuthStateChanged(auth, (usuario) => {
  if (usuario) {
    window.location.href = 'painel.html';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-login').addEventListener('click', fazerLogin);
  document.getElementById('login-senha').addEventListener('keydown', e => {
    if (e.key === 'Enter') fazerLogin();
  });
});

async function fazerLogin() {
  const email     = document.getElementById('login-email').value.trim();
  const senha     = document.getElementById('login-senha').value;
  const erroEl    = document.getElementById('login-erro');
  const btnLogin  = document.getElementById('btn-login');

  if (!email || !senha) {
    mostrarAlerta(erroEl, 'Preencha e-mail e senha.');
    return;
  }

  btnLogin.disabled  = true;
  btnLogin.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Entrando…';
  erroEl.hidden = true;

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = 'painel.html';
  } catch (err) {
    const msgs = {
      'auth/invalid-credential':     'E-mail ou senha incorretos.',
      'auth/user-not-found':         'Usuário não encontrado.',
      'auth/wrong-password':         'Senha incorreta.',
      'auth/too-many-requests':      'Muitas tentativas. Aguarde alguns minutos.',
      'auth/network-request-failed': 'Sem conexão com a internet.',
    };
    mostrarAlerta(erroEl, msgs[err.code] || 'Erro ao entrar. Tente novamente.');
    btnLogin.disabled  = false;
    btnLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i> Entrar';
  }
}

function mostrarAlerta(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}
