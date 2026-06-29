/* ============================================================
   BRASIL CIENTÍFICA — Admin: Blog
   Gerencia criação, listagem e exclusão de posts.
   Editor rico: Quill.js (carregado via CDN no HTML).
   Armazenamento de imagens: Cloudinary (unsigned upload).
   ============================================================ */

import { db } from '../firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc,
  deleteDoc, doc, serverTimestamp, orderBy, query,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import {
  confirmarExclusao, mostrarAlerta, ocultarAlerta, initDropzone, formatarData,
} from './admin.js';

/* ── Cloudinary ─────────────────────────────────────────────
   Mesmas credenciais configuradas em novidades.js.
   ────────────────────────────────────────────────────────── */
const CLOUDINARY_CLOUD_NAME  = 'dwytbj6e9';
const CLOUDINARY_UPLOAD_PRESET = 'bc_unsigned';

/* ── Estado local ── */
let _quill             = null;
let _arquivoCapa       = null;
let _editandoId        = null;
let _capaUrlExistente  = null;
let _inicializado      = false;

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
export function initBlogAdmin() {
  if (_inicializado) { carregarPosts(); return; }
  _inicializado = true;

  document.getElementById('btn-novo-post').addEventListener('click', abrirFormularioNovo);
  document.getElementById('btn-cancelar-post').addEventListener('click', fecharFormulario);
  document.getElementById('btn-publicar-post').addEventListener('click', () => salvarPost(true));
  document.getElementById('btn-rascunho-post').addEventListener('click', () => salvarPost(false));

  initDropzone({
    zone:    document.getElementById('capa-dropzone'),
    input:   document.getElementById('capa-arquivo'),
    preview: document.getElementById('capa-preview'),
    img:     document.getElementById('capa-preview-img'),
    remover: document.getElementById('capa-preview-remover'),
    onChange: (file) => { _arquivoCapa = file; },
  });

  _quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Escreva o conteúdo do artigo aqui…',
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link', 'image'],
        ['clean'],
      ],
    },
  });

  carregarPosts();
}


/* ════════════════════════════════════════════
   FORMULÁRIO
════════════════════════════════════════════ */
function abrirFormularioNovo() {
  _editandoId         = null;
  _capaUrlExistente   = null;

  document.getElementById('form-post-titulo-label').textContent = 'Novo Post';
  document.getElementById('btn-novo-post').hidden  = true;
  document.getElementById('form-post-wrap').hidden = false;
  document.getElementById('post-titulo-input').focus();
}

function abrirFormularioEdicao(post) {
  _editandoId        = post.id;
  _capaUrlExistente  = post.imagemCapa || null;

  document.getElementById('form-post-titulo-label').textContent = 'Editar Post';
  document.getElementById('btn-novo-post').hidden = true;

  document.getElementById('post-titulo-input').value = post.titulo    || '';
  document.getElementById('post-categoria').value    = post.categoria || '';
  document.getElementById('post-resumo').value       = post.resumo    || '';
  document.getElementById('post-leitura').value      = post.leituraMin || '';

  _quill.root.innerHTML = post.conteudoHtml || '';

  if (post.imagemCapa) {
    document.getElementById('capa-preview-img').src  = post.imagemCapa;
    document.getElementById('capa-preview').hidden   = false;
    document.getElementById('capa-dropzone').hidden  = true;
  }

  document.getElementById('form-post-wrap').hidden = false;
  document.getElementById('post-titulo-input').focus();
}

function fecharFormulario() {
  document.getElementById('form-post-wrap').hidden = true;
  document.getElementById('btn-novo-post').hidden  = false;
  resetarFormulario();
}

function resetarFormulario() {
  document.getElementById('post-titulo-input').value = '';
  document.getElementById('post-categoria').value    = '';
  document.getElementById('post-resumo').value       = '';
  document.getElementById('post-leitura').value      = '';
  document.getElementById('capa-arquivo').value      = '';
  document.getElementById('capa-preview').hidden     = true;
  document.getElementById('capa-dropzone').hidden    = false;
  document.getElementById('post-progresso-wrap').hidden = true;
  ocultarAlerta(document.getElementById('post-form-erro'));

  if (_quill) _quill.setText('');

  _arquivoCapa      = null;
  _editandoId       = null;
  _capaUrlExistente = null;
}


/* ════════════════════════════════════════════
   SALVAR / PUBLICAR POST
════════════════════════════════════════════ */
async function salvarPost(publicar) {
  const erroEl      = document.getElementById('post-form-erro');
  const btnPublicar = document.getElementById('btn-publicar-post');
  const btnRascunho = document.getElementById('btn-rascunho-post');
  ocultarAlerta(erroEl);

  const titulo     = document.getElementById('post-titulo-input').value.trim();
  const categoria  = document.getElementById('post-categoria').value;
  const resumo     = document.getElementById('post-resumo').value.trim();
  const leitura    = parseInt(document.getElementById('post-leitura').value) || null;
  const html       = _quill.root.innerHTML.trim();
  const textoVazio = _quill.getText().trim().length === 0;

  if (!titulo)    { mostrarAlerta(erroEl, 'O título é obrigatório.'); return; }
  if (!categoria) { mostrarAlerta(erroEl, 'Selecione uma categoria.'); return; }
  if (!resumo)    { mostrarAlerta(erroEl, 'O resumo é obrigatório.'); return; }
  if (textoVazio && publicar) { mostrarAlerta(erroEl, 'Escreva o conteúdo do artigo antes de publicar.'); return; }

  btnPublicar.disabled  = true;
  btnRascunho.disabled  = true;
  btnPublicar.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Salvando…';
  mostrarProgresso(0, 'Preparando…');

  try {
    let urlCapa = _capaUrlExistente || null;

    /* Upload da nova capa se selecionada */
    if (_arquivoCapa) {
      urlCapa = await uploadCloudinary(_arquivoCapa, 'blog/capas', (pct) => {
        mostrarProgresso(pct, `Enviando imagem… ${pct}%`);
      });
    }

    mostrarProgresso(95, 'Salvando post…');

    const slug = gerarSlug(titulo);

    const dados = {
      titulo,
      categoria,
      resumo,
      leituraMin:      leitura,
      conteudoHtml:    textoVazio ? '' : html,
      imagemCapa:      urlCapa,
      slug,
      publicado:       publicar,
      dataAtualizacao: serverTimestamp(),
    };

    if (_editandoId) {
      await updateDoc(doc(db, 'posts', _editandoId), dados);
    } else {
      dados.dataCriacao = serverTimestamp();
      await addDoc(collection(db, 'posts'), dados);
    }

    mostrarProgresso(100, 'Concluído!');
    fecharFormulario();
    await carregarPosts();

  } catch (err) {
    console.error('[Blog Admin] Erro ao salvar post:', err);
    mostrarAlerta(erroEl, 'Erro ao salvar. Tente novamente.');
  } finally {
    btnPublicar.disabled  = false;
    btnRascunho.disabled  = false;
    btnPublicar.innerHTML = '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Publicar';
    document.getElementById('post-progresso-wrap').hidden = true;
  }
}


/* ════════════════════════════════════════════
   CARREGAR LISTA DE POSTS
════════════════════════════════════════════ */
async function carregarPosts() {
  const lista = document.getElementById('posts-lista');
  lista.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Carregando…</div>';

  const catNomes = {
    microbiologia: 'Microbiologia',
    diagnostico:   'Diagnóstico',
    laboratorio:   'Laboratório',
    novidades:     'Novidades',
  };

  try {
    const q    = query(collection(db, 'posts'), orderBy('dataCriacao', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      lista.innerHTML = `
        <div class="estado-vazio">
          <i class="fa-regular fa-newspaper" aria-hidden="true"></i>
          <p>Nenhum post criado ainda. Clique em "Novo Post" para começar.</p>
        </div>`;
      return;
    }

    const postsDados = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    lista.innerHTML = postsDados.map(post => `
      <div class="item-card">
        ${post.imagemCapa
          ? `<img src="${post.imagemCapa}" alt="${esc(post.titulo)}" class="item-card__imagem" loading="lazy" />`
          : `<div class="item-card__imagem--placeholder"><i class="fa-regular fa-newspaper" aria-hidden="true"></i></div>`
        }
        <div class="item-card__corpo">
          <p class="item-card__titulo">${esc(post.titulo)}</p>
          <div class="item-card__meta">
            <span class="item-card__data">
              <i class="fa-regular fa-calendar" aria-hidden="true"></i> ${formatarData(post.dataCriacao)}
            </span>
            <span class="item-card__badge ${post.publicado ? '' : 'item-card__badge--rascunho'}">
              ${post.publicado ? (catNomes[post.categoria] || post.categoria) : 'Rascunho'}
            </span>
          </div>
        </div>
        <div class="item-card__acoes">
          <button class="item-card__btn item-card__btn--editar"
                  data-id="${post.id}"
                  type="button">
            <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i> Editar
          </button>
          <button class="item-card__btn item-card__btn--excluir"
                  data-id="${post.id}"
                  data-titulo="${esc(post.titulo)}"
                  type="button">
            <i class="fa-regular fa-trash-can" aria-hidden="true"></i> Excluir
          </button>
        </div>
      </div>`
    ).join('');

    lista.querySelectorAll('.item-card__btn--editar').forEach(btn => {
      btn.addEventListener('click', () => {
        const post = postsDados.find(p => p.id === btn.dataset.id);
        if (post) abrirFormularioEdicao(post);
      });
    });

    lista.querySelectorAll('.item-card__btn--excluir').forEach(btn => {
      btn.addEventListener('click', () => {
        confirmarExclusao(
          `Deseja excluir o post "${btn.dataset.titulo}"? Esta ação não pode ser desfeita.`,
          () => excluirPost(btn.dataset.id)
        );
      });
    });

  } catch (err) {
    console.error('[Blog Admin] Erro ao carregar posts:', err);
    lista.innerHTML = `<p class="estado-vazio">Erro ao carregar posts. Tente recarregar a página.</p>`;
  }
}


/* ════════════════════════════════════════════
   EXCLUIR POST
════════════════════════════════════════════ */
async function excluirPost(id) {
  try {
    await deleteDoc(doc(db, 'posts', id));
    await carregarPosts();
  } catch (err) {
    console.error('[Blog Admin] Erro ao excluir:', err);
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
function mostrarProgresso(pct, texto) {
  const wrap    = document.getElementById('post-progresso-wrap');
  const barra   = document.getElementById('post-progresso-barra');
  const textoEl = document.getElementById('post-progresso-texto');
  if (!wrap) return;
  wrap.hidden         = false;
  barra.style.width   = pct + '%';
  textoEl.textContent = texto;
}

function gerarSlug(titulo) {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function esc(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}