/* ============================================================
   BRASIL CIENTÍFICA — Admin: Novidades / Promoções
   Gerencia upload de flyers e listagem no Firestore.
   Armazenamento de imagens: Cloudinary (unsigned upload).
   ============================================================ */

import { db } from '../firebase-config.js';
import {
  collection, addDoc, getDocs,
  deleteDoc, doc, serverTimestamp, orderBy, query,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import {
  confirmarExclusao, mostrarAlerta, ocultarAlerta, initDropzone, formatarData,
} from './admin.js';

/* ── Cloudinary ─────────────────────────────────────────────
   1. Crie uma conta gratuita em https://cloudinary.com
   2. No Dashboard, copie o "Cloud Name" abaixo.
   3. Em Settings → Upload → Upload presets, crie um preset
      com "Signing Mode: Unsigned" e cole o nome abaixo.
   ────────────────────────────────────────────────────────── */
const CLOUDINARY_CLOUD_NAME  = 'dwytbj6e9';
const CLOUDINARY_UPLOAD_PRESET = 'bc_unsigned'; 

/* ── Estado local ── */
let _arquivoSelecionado = null;
let _inicializado = false;

/* ════════════════════════════════════════════
   INIT (chamado uma vez após login)
════════════════════════════════════════════ */
export function initNovidades() {
  if (_inicializado) { carregarNovidades(); return; }
  _inicializado = true;

  document.getElementById('btn-nova-novidade').addEventListener('click', abrirFormulario);
  document.getElementById('btn-cancelar-novidade').addEventListener('click', fecharFormulario);
  document.getElementById('btn-salvar-novidade').addEventListener('click', salvarNovidade);

  initDropzone({
    zone:    document.getElementById('novidade-dropzone'),
    input:   document.getElementById('novidade-arquivo'),
    preview: document.getElementById('novidade-preview'),
    img:     document.getElementById('novidade-preview-img'),
    remover: document.getElementById('novidade-preview-remover'),
    onChange: (file) => { _arquivoSelecionado = file; },
  });

  carregarNovidades();
}


/* ════════════════════════════════════════════
   FORMULÁRIO
════════════════════════════════════════════ */
function abrirFormulario() {
  document.getElementById('form-novidade-wrap').hidden = false;
  document.getElementById('btn-nova-novidade').hidden  = true;
  document.getElementById('novidade-titulo-input').focus();
}

function fecharFormulario() {
  document.getElementById('form-novidade-wrap').hidden = true;
  document.getElementById('btn-nova-novidade').hidden  = false;
  resetarFormulario();
}

function resetarFormulario() {
  document.getElementById('novidade-titulo-input').value    = '';
  document.getElementById('novidade-arquivo').value         = '';
  document.getElementById('novidade-preview').hidden        = true;
  document.getElementById('novidade-dropzone').hidden       = false;
  document.getElementById('novidade-progresso-wrap').hidden = true;
  ocultarAlerta(document.getElementById('novidade-form-erro'));
  _arquivoSelecionado = null;
}


/* ════════════════════════════════════════════
   SALVAR NOVIDADE
════════════════════════════════════════════ */
async function salvarNovidade() {
  const erroEl    = document.getElementById('novidade-form-erro');
  const btnSalvar = document.getElementById('btn-salvar-novidade');
  ocultarAlerta(erroEl);

  if (!_arquivoSelecionado) {
    mostrarAlerta(erroEl, 'Selecione a imagem do flyer antes de publicar.');
    return;
  }

  const titulo = document.getElementById('novidade-titulo-input').value.trim();

  btnSalvar.disabled  = true;
  btnSalvar.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Enviando…';
  mostrarProgresso('novidade', 0, 'Enviando imagem…');

  try {
    /* 1. Upload para o Cloudinary */
    const urlImagem = await uploadCloudinary(_arquivoSelecionado, 'novidades', (pct) => {
      mostrarProgresso('novidade', pct, `Enviando imagem… ${pct}%`);
    });

    mostrarProgresso('novidade', 100, 'Salvando…');

    /* 2. Salva URL no Firestore */
    await addDoc(collection(db, 'novidades'), {
      titulo:      titulo || null,
      imagemUrl:   urlImagem,
      dataCriacao: serverTimestamp(),
      publicado:   true,
    });

    fecharFormulario();
    await carregarNovidades();

  } catch (err) {
    console.error('[Novidades] Erro ao salvar:', err);
    mostrarAlerta(erroEl, 'Erro ao publicar. Tente novamente.');
  } finally {
    btnSalvar.disabled  = false;
    btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Publicar';
    document.getElementById('novidade-progresso-wrap').hidden = true;
  }
}


/* ════════════════════════════════════════════
   CARREGAR LISTA
════════════════════════════════════════════ */
async function carregarNovidades() {
  const lista = document.getElementById('novidades-lista');
  lista.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Carregando…</div>';

  try {
    const q    = query(collection(db, 'novidades'), orderBy('dataCriacao', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      lista.innerHTML = `
        <div class="estado-vazio">
          <i class="fa-regular fa-image" aria-hidden="true"></i>
          <p>Nenhuma novidade publicada ainda.</p>
        </div>`;
      return;
    }

    lista.innerHTML = snap.docs.map(d => {
      const dados = d.data();
      return `
        <div class="item-card">
          ${dados.imagemUrl
            ? `<img src="${dados.imagemUrl}" alt="${esc(dados.titulo || 'Flyer')}" class="item-card__imagem" loading="lazy" />`
            : `<div class="item-card__imagem--placeholder"><i class="fa-regular fa-image" aria-hidden="true"></i></div>`
          }
          <div class="item-card__corpo">
            <p class="item-card__titulo">${esc(dados.titulo || '(sem título)')}</p>
            <div class="item-card__meta">
              <span class="item-card__data">
                <i class="fa-regular fa-calendar" aria-hidden="true"></i> ${formatarData(dados.dataCriacao)}
              </span>
            </div>
          </div>
          <div class="item-card__acoes">
            <button class="item-card__btn item-card__btn--excluir"
                    data-id="${d.id}"
                    data-titulo="${esc(dados.titulo || 'esta novidade')}"
                    type="button">
              <i class="fa-regular fa-trash-can" aria-hidden="true"></i> Excluir
            </button>
          </div>
        </div>`;
    }).join('');

    lista.querySelectorAll('.item-card__btn--excluir').forEach(btn => {
      btn.addEventListener('click', () => {
        confirmarExclusao(
          `Deseja excluir "${btn.dataset.titulo}"? Esta ação não pode ser desfeita.`,
          () => excluirNovidade(btn.dataset.id)
        );
      });
    });

  } catch (err) {
    console.error('[Novidades] Erro ao carregar:', err);
    lista.innerHTML = `<p class="estado-vazio">Erro ao carregar novidades. Tente recarregar a página.</p>`;
  }
}


/* ════════════════════════════════════════════
   EXCLUIR
════════════════════════════════════════════ */
async function excluirNovidade(id) {
  try {
    await deleteDoc(doc(db, 'novidades', id));
    await carregarNovidades();
  } catch (err) {
    console.error('[Novidades] Erro ao excluir:', err);
    alert('Erro ao excluir. Tente novamente.');
  }
}


/* ════════════════════════════════════════════
   CLOUDINARY UPLOAD
════════════════════════════════════════════ */
async function uploadCloudinary(arquivo, pasta, onProgress) {
  const formData = new FormData();
  formData.append('file', arquivo);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `brasilcientifica/${pasta}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    xhr.open('POST', url);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 90);
        onProgress(pct);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve(res.secure_url);
      } else {
        reject(new Error(`Cloudinary retornou status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Falha na conexão com o Cloudinary.')));
    xhr.send(formData);
  });
}


/* ════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */
function mostrarProgresso(prefixo, pct, texto) {
  const wrap    = document.getElementById(`${prefixo}-progresso-wrap`);
  const barra   = document.getElementById(`${prefixo}-progresso-barra`);
  const textoEl = document.getElementById(`${prefixo}-progresso-texto`);
  if (!wrap) return;
  wrap.hidden         = false;
  barra.style.width   = pct + '%';
  textoEl.textContent = texto;
}

function esc(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}