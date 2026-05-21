/* ============================================================
   BRASIL CIENTÍFICA — Blog JS
   Funções exclusivas do blog. Carregado após main.js.
   Compatível com o padrão existente (ES6+, sem frameworks).
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  initAnoBlog();
  initFiltrosBlog();
  initAnimacoesBlog();
  initProgressoLeitura();
  initSumarioAtivo();

});


/* ------------------------------------------------------------
   1. ANO ATUAL NO FOOTER
   (redundância segura — main.js já faz isso no index,
    mas o blog.html usa o mesmo span #anoAtual)
   ------------------------------------------------------------ */
function initAnoBlog() {
  const spanAno = document.getElementById('anoAtual');
  if (spanAno) spanAno.textContent = new Date().getFullYear();
}


/* ------------------------------------------------------------
   2. FILTRO DE CATEGORIAS (blog.html)
   Filtra os cards por data-categoria.
   Anima a transição com opacity/transform.
   ------------------------------------------------------------ */
function initFiltrosBlog() {
  const botoes   = document.querySelectorAll('.blog-filtro');
  const cards    = document.querySelectorAll('[data-categoria]');
  const semResult = document.getElementById('semResultados');

  if (!botoes.length || !cards.length) return;

  botoes.forEach(btn => {
    btn.addEventListener('click', () => {
      const filtro = btn.dataset.filtro;

      /* Atualiza estado dos botões */
      botoes.forEach(b => {
        b.classList.remove('blog-filtro--ativo');
        b.removeAttribute('aria-pressed');
      });
      btn.classList.add('blog-filtro--ativo');
      btn.setAttribute('aria-pressed', 'true');

      /* Filtra os cards com animação */
      let visiveis = 0;

      cards.forEach(card => {
        const categoria = card.dataset.categoria;
        const mostrar   = filtro === 'todos' || categoria === filtro;

        if (mostrar) {
          card.style.display = '';
          /* Pequeno delay para o display:'' processar antes da animação */
          requestAnimationFrame(() => {
            card.style.opacity  = '1';
            card.style.transform = 'translateY(0)';
          });
          visiveis++;
        } else {
          card.style.opacity  = '0';
          card.style.transform = 'translateY(12px)';
          /* Aguarda transição antes de ocultar */
          setTimeout(() => {
            if (card.dataset.categoria !== filtro && filtro !== 'todos') {
              card.style.display = 'none';
            }
          }, 260);
        }
      });

      /* Mensagem de nenhum resultado */
      if (semResult) {
        semResult.hidden = visiveis > 0;
      }
    });
  });

  /* Inicializa aria-pressed no botão "Todos" */
  const btnTodos = document.querySelector('.blog-filtro--ativo');
  if (btnTodos) btnTodos.setAttribute('aria-pressed', 'true');
}


/* ------------------------------------------------------------
   3. ANIMAÇÕES DE ENTRADA (IntersectionObserver)
   Reutiliza a mesma lógica do main.js mas isolado para
   elementos dentro do blog que são carregados depois.
   ------------------------------------------------------------ */
function initAnimacoesBlog() {
  /* Respeita prefers-reduced-motion */
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
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  elementos.forEach(el => observer.observe(el));
}


/* ------------------------------------------------------------
   4. BARRA DE PROGRESSO DE LEITURA (post-template.html)
   Cria e anima uma barra fina no topo da página indicando
   quanto do artigo já foi lido.
   ------------------------------------------------------------ */
function initProgressoLeitura() {
  const artigo = document.querySelector('.post-conteudo');
  if (!artigo) return; /* Só executa na página de post */

  /* Cria o elemento */
  const barra = document.createElement('div');
  barra.setAttribute('role', 'progressbar');
  barra.setAttribute('aria-label', 'Progresso de leitura do artigo');
  barra.setAttribute('aria-valuemin', '0');
  barra.setAttribute('aria-valuemax', '100');
  barra.setAttribute('aria-valuenow', '0');
  barra.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 4px;
    width: 0%;
    background: linear-gradient(90deg, var(--cor-acento) 0%, var(--cor-acento-clara) 100%);
    z-index: 9999;
    transition: width 0.1s linear;
    pointer-events: none;
  `;
  document.body.appendChild(barra);

  function atualizarProgresso() {
    const scrollTop    = window.scrollY;
    const alturaTotal  = document.documentElement.scrollHeight - window.innerHeight;
    const progresso    = alturaTotal > 0 ? (scrollTop / alturaTotal) * 100 : 0;
    const porcentagem  = Math.min(Math.round(progresso), 100);

    barra.style.width = porcentagem + '%';
    barra.setAttribute('aria-valuenow', porcentagem);
  }

  window.addEventListener('scroll', atualizarProgresso, { passive: true });
  atualizarProgresso(); /* Estado inicial */
}


/* ------------------------------------------------------------
   5. SUMÁRIO ATIVO (post-template.html)
   Destaca o item do sumário correspondente à seção visível.
   ------------------------------------------------------------ */
function initSumarioAtivo() {
  const sumario = document.querySelector('.post-sumario__lista');
  if (!sumario) return;

  const linksSecao = sumario.querySelectorAll('a[href^="#"]');
  if (!linksSecao.length) return;

  const secoes = Array.from(linksSecao)
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (!secoes.length) return;

  /* Respeita prefers-reduced-motion — ainda funciona, só sem animação */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        /* Remove ativo de todos */
        linksSecao.forEach(link => {
          link.style.color  = '';
          link.style.fontWeight = '';
        });

        /* Ativa o link correspondente */
        const id      = entry.target.id;
        const linkAtivo = sumario.querySelector(`a[href="#${id}"]`);
        if (linkAtivo) {
          linkAtivo.style.color      = 'var(--cor-acento)';
          linkAtivo.style.fontWeight = '700';
        }
      }
    });
  }, {
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  });

  secoes.forEach(secao => observer.observe(secao));
}
