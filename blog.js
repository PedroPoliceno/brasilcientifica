/* ============================================================
   BRASIL CIENTÍFICA — Blog JS (Phase 2 — Firebase)
   Carrega posts do Firestore e os injeta no .posts-grid.
   Compatível com o padrão existente (ES6+, sem frameworks).
   ============================================================ */

'use strict';

import { db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {

  initAnoBlog();
  initAnimacoesBlog();
  initProgressoLeitura();
  initSumarioAtivo();
  initBlogPosts();        // ← novo: busca posts no Firestore

});


/* ------------------------------------------------------------
   1. ANO ATUAL NO FOOTER
   ------------------------------------------------------------ */
function initAnoBlog() {
  const spanAno = document.getElementById('anoAtual');
  if (spanAno) spanAno.textContent = new Date().getFullYear();
}


/* ------------------------------------------------------------
   2. POSTS DO FIRESTORE (blog.html)
   Busca posts publicados, injeta cards no .posts-grid
   e inicializa os filtros por categoria em seguida.
   ------------------------------------------------------------ */
async function initBlogPosts() {
  const grid      = document.querySelector('.posts-grid');
  const emBreve   = document.querySelector('.blog-em-breve');
  const semResult = document.getElementById('semResultados');

  if (!grid) return; // Não está na listagem do blog

  // Exibe skeleton enquanto carrega
  grid.innerHTML = skeletonCards(6);

  try {
    const q = query(
      collection(db, 'posts'),
      where('publicado', '==', true),
      orderBy('dataCriacao', 'desc')
    );

    const snapshot = await getDocs(q);
    const posts    = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    grid.innerHTML = ''; // Limpa skeletons

    if (posts.length === 0) {
      // Mantém a mensagem "em breve" se não há posts
      if (emBreve) emBreve.hidden = false;
      return;
    }

    // Esconde "em breve", mostra grid
    if (emBreve) emBreve.hidden = true;

    posts.forEach(post => {
      grid.insertAdjacentHTML('beforeend', buildPostCard(post));
    });

    // Inicializa filtros e animações agora que os cards existem
    initFiltrosBlog();
    initAnimacoesBlog();

  } catch (err) {
    console.error('[Blog] Erro ao carregar posts:', err);
    grid.innerHTML = `
      <p class="blog-sem-resultados" style="display:block">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        Não foi possível carregar os artigos. Tente novamente em breve.
      </p>`;
  }
}


/* ------------------------------------------------------------
   Monta o HTML de um card a partir dos dados do Firestore.

   Campos esperados no documento Firestore:
     titulo       {string}  Título do post
     resumo       {string}  Texto curto para o card (~150 chars)
     categoria    {string}  microbiologia | diagnostico | laboratorio | novidades
     imagemCapa   {string}  URL da imagem (Firebase Storage)
     leituraMin   {number}  Tempo estimado em minutos
     dataCriacao  {Timestamp} Data de publicação
     slug         {string}  Identificador único (ex: controle-meios-cultura)
   ------------------------------------------------------------ */
function buildPostCard(post) {
  const dataISO  = post.dataCriacao?.toDate?.().toISOString().split('T')[0] ?? '';
  const dataExib = formatarData(post.dataCriacao?.toDate?.());
  const href     = `post.html?id=${post.slug || post.id}`;
  const imagem   = post.imagemCapa
    ? `<img src="${post.imagemCapa}" alt="${escHtml(post.titulo)}" loading="lazy" decoding="async">`
    : `<div class="image-placeholder" style="height:100%"></div>`;

  return `
    <article class="post-card animar-entrada" data-categoria="${escHtml(post.categoria || 'todos')}" role="listitem">
      <a href="${href}" class="post-card__imagem-link" tabindex="-1" aria-hidden="true">
        <div class="post-card__imagem">
          ${imagem}
          <span class="post__badge">${escHtml(categoriaNome(post.categoria))}</span>
        </div>
      </a>
      <div class="post-card__conteudo">
        <div class="post__meta">
          <time datetime="${dataISO}" class="post__data">
            <i class="fa-regular fa-calendar" aria-hidden="true"></i> ${dataExib}
          </time>
          ${post.leituraMin ? `
          <span class="post__leitura">
            <i class="fa-regular fa-clock" aria-hidden="true"></i> ${post.leituraMin} min
          </span>` : ''}
        </div>
        <h3 class="post-card__titulo">
          <a href="${href}">${escHtml(post.titulo)}</a>
        </h3>
        ${post.resumo ? `<p class="post-card__resumo">${escHtml(post.resumo)}</p>` : ''}
        <a href="${href}" class="post-card__link">
          Ler mais <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </a>
      </div>
    </article>`;
}


/* ------------------------------------------------------------
   3. FILTRO DE CATEGORIAS (blog.html)
   Chamado após os cards serem injetados no DOM.
   ------------------------------------------------------------ */
function initFiltrosBlog() {
  const botoes    = document.querySelectorAll('.blog-filtro');
  const semResult = document.getElementById('semResultados');

  if (!botoes.length) return;

  // Lê categoria da URL (ex: blog.html?categoria=microbiologia)
  const params          = new URLSearchParams(window.location.search);
  const categoriaURL    = params.get('categoria');
  if (categoriaURL) ativarFiltro(categoriaURL);

  botoes.forEach(btn => {
    btn.addEventListener('click', () => ativarFiltro(btn.dataset.filtro));
  });

  /* Inicializa aria-pressed */
  const btnAtivo = document.querySelector('.blog-filtro--ativo');
  if (btnAtivo) btnAtivo.setAttribute('aria-pressed', 'true');

  function ativarFiltro(filtro) {
    const cards = document.querySelectorAll('[data-categoria]');

    botoes.forEach(b => {
      b.classList.toggle('blog-filtro--ativo', b.dataset.filtro === filtro);
      b.toggleAttribute('aria-pressed', b.dataset.filtro === filtro);
    });

    let visiveis = 0;

    cards.forEach(card => {
      const mostrar = filtro === 'todos' || card.dataset.categoria === filtro;
      if (mostrar) {
        card.style.display   = '';
        requestAnimationFrame(() => {
          card.style.opacity   = '1';
          card.style.transform = 'translateY(0)';
        });
        visiveis++;
      } else {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(12px)';
        setTimeout(() => {
          if (card.dataset.categoria !== filtro && filtro !== 'todos') {
            card.style.display = 'none';
          }
        }, 260);
      }
    });

    if (semResult) semResult.hidden = visiveis > 0;
  }
}


/* ------------------------------------------------------------
   4. ANIMAÇÕES DE ENTRADA (IntersectionObserver)
   ------------------------------------------------------------ */
function initAnimacoesBlog() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const elementos = document.querySelectorAll('.animar-entrada');
  if (!elementos.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visivel');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elementos.forEach(el => observer.observe(el));
}


/* ------------------------------------------------------------
   5. BARRA DE PROGRESSO DE LEITURA (post.html)
   ------------------------------------------------------------ */
function initProgressoLeitura() {
  const artigo = document.querySelector('.post-conteudo');
  if (!artigo) return;

  const barra = document.createElement('div');
  barra.setAttribute('role', 'progressbar');
  barra.setAttribute('aria-label', 'Progresso de leitura do artigo');
  barra.setAttribute('aria-valuemin', '0');
  barra.setAttribute('aria-valuemax', '100');
  barra.setAttribute('aria-valuenow', '0');
  barra.style.cssText = `
    position:fixed;top:0;left:0;height:4px;width:0%;
    background:linear-gradient(90deg,var(--cor-acento) 0%,var(--cor-acento-clara) 100%);
    z-index:9999;transition:width .1s linear;pointer-events:none;
  `;
  document.body.appendChild(barra);

  function atualizar() {
    const total   = document.documentElement.scrollHeight - window.innerHeight;
    const pct     = total > 0 ? Math.min(Math.round((window.scrollY / total) * 100), 100) : 0;
    barra.style.width = pct + '%';
    barra.setAttribute('aria-valuenow', pct);
  }

  window.addEventListener('scroll', atualizar, { passive: true });
  atualizar();
}


/* ------------------------------------------------------------
   6. SUMÁRIO ATIVO (post.html)
   ------------------------------------------------------------ */
function initSumarioAtivo() {
  const sumario = document.querySelector('.post-sumario__lista');
  if (!sumario) return;

  const links  = sumario.querySelectorAll('a[href^="#"]');
  const secoes = Array.from(links)
    .map(l => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);

  if (!secoes.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(l => { l.style.color = ''; l.style.fontWeight = ''; });
      const ativo = sumario.querySelector(`a[href="#${entry.target.id}"]`);
      if (ativo) { ativo.style.color = 'var(--cor-acento)'; ativo.style.fontWeight = '700'; }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

  secoes.forEach(s => observer.observe(s));
}


/* ------------------------------------------------------------
   HELPERS
   ------------------------------------------------------------ */

/** Gera N cards skeleton para exibir durante o carregamento */
function skeletonCards(n) {
  return Array.from({ length: n }, () => `
    <article class="post-card post-card--skeleton" aria-hidden="true">
      <div class="post-card__imagem" style="background:#e5e7eb;border-radius:8px 8px 0 0;height:200px"></div>
      <div class="post-card__conteudo" style="display:flex;flex-direction:column;gap:.75rem;padding:1.25rem">
        <div style="height:12px;width:60%;background:#e5e7eb;border-radius:4px"></div>
        <div style="height:18px;width:90%;background:#e5e7eb;border-radius:4px"></div>
        <div style="height:14px;width:80%;background:#e5e7eb;border-radius:4px"></div>
      </div>
    </article>`).join('');
}

/** Escapa HTML para evitar XSS */
function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Formata Timestamp do Firestore para pt-BR */
function formatarData(date) {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Nome legível da categoria */
function categoriaNome(slug) {
  const mapa = {
    microbiologia: 'Microbiologia',
    diagnostico:   'Diagnóstico',
    laboratorio:   'Laboratório',
    novidades:     'Novidades',
  };
  return mapa[slug] || slug || '';
}
