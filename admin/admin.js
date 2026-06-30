/* ============================================================
   BRASIL CIENTÍFICA — Admin JS (módulo principal)
   Responsabilidades: autenticação, roteamento entre telas,
   modal de confirmação de exclusão.
   ============================================================ */

import { auth }           from '../firebase-config.js';
import {
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initNovidades }  from './novidades.js';
import { initBlogAdmin }  from './blog-admin.js';

/* ── Estado global do modal de confirmação ── */
let _modalCallback = null;

/* ════════════════════════════════════════════
   BOOT
════════════════════════════════════════════ */

/* Se não houver sessão ativa, redireciona para login.html.
   Esta página (index.html) só renderiza o painel — o HTML do
   formulário de login nem existe aqui, então não há como o
   conteúdo do painel "vazar" antes da autenticação. */
onAuthStateChanged(auth, (usuario) => {
  if (usuario) {
    document.body.style.visibility = 'visible';
    iniciarPainel();
  } else {
    window.location.href = 'index.html';
  }
});

function iniciarPainel() {
  /* Inicializa módulos */
  initNovidades();
  initBlogAdmin();
  navegarPara('novidades');

  /* Logout */
  document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth);
  });

  /* Navegação entre telas */
  document.querySelectorAll('.sidebar__item[data-tela]').forEach(btn => {
    btn.addEventListener('click', () => navegarPara(btn.dataset.tela));
  });

  /* Modal */
  document.getElementById('modal-cancelar').addEventListener('click', fecharModal);
  document.getElementById('modal-confirmar-btn').addEventListener('click', () => {
    if (typeof _modalCallback === 'function') _modalCallback();
    fecharModal();
  });

  /* Fecha modal clicando no overlay */
  document.getElementById('modal-confirmar').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharModal();
  });
}


/* ════════════════════════════════════════════
   NAVEGAÇÃO ENTRE TELAS
════════════════════════════════════════════ */
function navegarPara(tela) {
  document.querySelectorAll('.sidebar__item[data-tela]').forEach(btn => {
    btn.classList.toggle('sidebar__item--ativo', btn.dataset.tela === tela);
  });

  document.getElementById('tela-novidades').hidden = tela !== 'novidades';
  document.getElementById('tela-blog').hidden       = tela !== 'blog';
}


/* ════════════════════════════════════════════
   MODAL DE CONFIRMAÇÃO (API pública)
════════════════════════════════════════════ */

/**
 * Abre o modal de confirmação de exclusão.
 * @param {string} mensagem  Texto descritivo do que será excluído.
 * @param {Function} onConfirmar  Callback executado ao confirmar.
 */
export function confirmarExclusao(mensagem, onConfirmar) {
  document.getElementById('modal-mensagem').textContent = mensagem;
  document.getElementById('modal-confirmar').hidden = false;
  _modalCallback = onConfirmar;
}

function fecharModal() {
  document.getElementById('modal-confirmar').hidden = true;
  _modalCallback = null;
}


/* ════════════════════════════════════════════
   HELPERS (exportados para os módulos)
════════════════════════════════════════════ */

/** Exibe uma mensagem de erro em um elemento de alerta. */
export function mostrarAlerta(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

/** Oculta o alerta. */
export function ocultarAlerta(el) {
  el.hidden = true;
}

/**
 * Configura dropzone: clique, arrastar, preview e remoção.
 * @param {Object} opts
 *   zone     - elemento .dropzone
 *   input    - <input type="file">
 *   preview  - container do preview
 *   img      - <img> do preview
 *   remover  - botão de remoção
 *   onChange - callback(File|null)
 */
export function initDropzone({ zone, input, preview, img, remover, onChange }) {

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dropzone--ativo'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dropzone--ativo'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dropzone--ativo');
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) processarArquivo(input.files[0]);
  });

  remover.addEventListener('click', () => {
    input.value = '';
    img.src = '';
    preview.hidden = true;
    zone.hidden = false;
    onChange(null);
  });

  function processarArquivo(file) {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem (PNG, JPG ou WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem não pode ter mais de 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      img.src = e.target.result;
      preview.hidden = false;
      zone.hidden = true;
    };
    reader.readAsDataURL(file);
    onChange(file);
  }
}

/** Formata Timestamp do Firestore para exibição. */
export function formatarData(ts) {
  if (!ts?.toDate) return '—';
  return ts.toDate().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}
