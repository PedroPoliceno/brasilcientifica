/**
 * Brasil Científica — main.js
 * JavaScript puro, sem dependências externas.
 * Estrutura modular (IIFE por responsabilidade).
 * Preparado para integração futura com backend/e-commerce.
 */

'use strict';

/* ============================================================
   UTILITÁRIOS GLOBAIS
============================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/**
 * Sanitiza texto para evitar XSS ao inserir no DOM.
 * Usar sempre que exibir input do usuário via innerHTML.
 */
function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}


/* ============================================================
   1. ANO NO RODAPÉ
============================================================ */
(function initAno() {
  const el = $('#anoAtual');
  if (el) el.textContent = new Date().getFullYear();
})();


/* ============================================================
   2. MENU HAMBÚRGUER (mobile)
============================================================ */
(function initMenu() {
  const toggle = $('#menuToggle');
  const nav    = $('#mainNav');
  if (!toggle || !nav) return;

  function fecharMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('header__nav--aberto');
  }

  toggle.addEventListener('click', function () {
    const aberto = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!aberto));
    nav.classList.toggle('header__nav--aberto', !aberto);
  });

  // Fecha ao clicar em qualquer link da nav
  $$('.nav__link', nav).forEach(link =>
    link.addEventListener('click', fecharMenu)
  );

  // Fecha ao clicar fora do menu
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      fecharMenu();
    }
  });

  // Fecha com a tecla Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fecharMenu();
  });
})();


/* ============================================================
   3. SCROLL SUAVE
============================================================ */
(function initScrollSuave() {
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const destino = $(this.getAttribute('href'));
      if (!destino) return;
      e.preventDefault();
      destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Move o foco para a seção destino (acessibilidade)
      destino.setAttribute('tabindex', '-1');
      destino.focus({ preventScroll: true });
    });
  });
})();


/* ============================================================
   4. HEADER COM EFEITO AO ROLAR
============================================================ */
(function initHeaderScroll() {
  const header = $('#header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    header.classList.toggle('header--rolando', window.scrollY > 80);
  }, { passive: true });
})();


/* ============================================================
   5. LINK ATIVO CONFORME SEÇÃO VISÍVEL (IntersectionObserver)
============================================================ */
(function initNavAtiva() {
  const secoes   = $$('section[id]');
  const navLinks = $$('.nav__link[href^="#"]');
  if (!secoes.length || !navLinks.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        const ativo = link.getAttribute('href') === '#' + id;
        link.classList.toggle('nav__link--active', ativo);
        ativo
          ? link.setAttribute('aria-current', 'page')
          : link.removeAttribute('aria-current');
      });
    });
  }, { threshold: 0.4 });

  secoes.forEach(s => obs.observe(s));
})();


/* ============================================================
   6. FILTRO DE PRODUTOS
============================================================ */
(function initFiltro() {
  const btns   = $$('.filtro__btn');
  const cards  = $$('.produto__card');
  const grid   = $('#produtosGrid');
  if (!btns.length || !cards.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', function () {
      const cat = this.dataset.categoria;

      // Atualiza botões
      btns.forEach(b => {
        b.classList.remove('filtro__btn--ativo');
        b.setAttribute('aria-pressed', 'false');
      });
      this.classList.add('filtro__btn--ativo');
      this.setAttribute('aria-pressed', 'true');

      // Filtra cards
      let visiveis = 0;
      cards.forEach(card => {
        const mostrar = cat === 'todos' || card.dataset.categoria === cat;
        card.hidden = !mostrar;
        if (mostrar) visiveis++;
      });

      // Anuncia resultado para leitores de tela (aria-live no grid)
      if (grid) {
        grid.setAttribute('aria-label',
          visiveis === 0
            ? 'Nenhum produto encontrado nesta categoria.'
            : `${visiveis} produto${visiveis > 1 ? 's' : ''} encontrado${visiveis > 1 ? 's' : ''}.`
        );
      }
    });
  });
})();


/* ============================================================
   7. ANIMAÇÕES DE ENTRADA (Scroll Reveal)
============================================================ */
(function initScrollReveal() {
  const els = $$('.animar-entrada');
  if (!els.length) return;

  // Respeita preferência de movimento reduzido do sistema
  const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (semAnimacao) {
    els.forEach(el => el.classList.add('visivel'));
    return;
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visivel');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  els.forEach(el => obs.observe(el));
})();


/* ============================================================
   8. VALIDAÇÃO E ENVIO DO FORMULÁRIO
   Preparado para integração com backend via fetch().
============================================================ */
(function initFormulario() {
  const form      = $('#formContato');
  const btnEnviar = $('#btnEnviar');
  const feedback  = $('#formFeedback');
  if (!form) return;

  /* — Validadores individuais — */
  const validadores = {
    nome(val) {
      if (!val.trim()) return 'Por favor, informe seu nome completo.';
      if (val.trim().length < 3) return 'O nome deve ter pelo menos 3 caracteres.';
      return '';
    },
    email(val) {
      if (!val.trim()) return 'Por favor, informe seu e-mail.';
      // RFC 5322 simplificado
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim())) return 'Informe um e-mail válido.';
      return '';
    },
    mensagem(val) {
      if (!val.trim()) return 'Por favor, escreva sua mensagem.';
      if (val.trim().length < 10) return 'A mensagem deve ter pelo menos 10 caracteres.';
      return '';
    },
    lgpd(_, el) {
      if (!el.checked) return 'Você precisa aceitar a Política de Privacidade.';
      return '';
    },
  };

  const inputTelefone = document.getElementById("telefone");

  inputTelefone.addEventListener('keyup', (e) => {
    let valor = e.target.value;

    //Remove qualquer caractere que não seja número
    valor = valor.replace(/\D/g, "");

    //Aplica a formatação dinamicamente
    if(valor => 0){
      //(00)
      valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
    }
    if(valor.length > 6){
      //(xx) xxxxx-xxxx
      valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
    }

    //Atualiza o valor no campo
    e.target.value = valor.substring(0, 15);
  });

  /* — Exibe/limpa erro em um campo — */
  function setErro(campo, msg) {
    const erroEl = $(`#${campo}-erro`);
    const inputEl = $(`#${campo}`, form);
    if (erroEl) erroEl.textContent = msg;
    if (inputEl) {
      inputEl.classList.toggle('form__input--erro', !!msg);
      inputEl.classList.toggle('form__textarea--erro', !!msg);
    }
    return !!msg;
  }

  /* — Valida todos os campos obrigatórios — */
  function validarTudo() {
    const campos = ['nome', 'email', 'mensagem', 'lgpd'];
    let temErro = false;
    campos.forEach(id => {
      const el  = $(`#${id}`, form);
      const msg = validadores[id] ? validadores[id](el?.value ?? '', el) : '';
      if (setErro(id, msg)) temErro = true;
    });
    return !temErro;
  }

  /* — Validação em tempo real (ao sair do campo) — */
  ['nome', 'email', 'mensagem'].forEach(id => {
    const el = $(`#${id}`, form);
    if (!el) return;
    el.addEventListener('blur', () => {
      const msg = validadores[id](el.value, el);
      setErro(id, msg);
    });
    el.addEventListener('input', () => {
      if (el.classList.contains('form__input--erro') ||
          el.classList.contains('form__textarea--erro')) {
        const msg = validadores[id](el.value, el);
        setErro(id, msg);
      }
    });
  });

  /* — Exibe feedback de envio — */
  function exibirFeedback(tipo, msg) {
    if (!feedback) return;
    feedback.innerHTML = `
      <div class="form__feedback form__feedback--${tipo}" role="alert">
        <i class="fa-solid fa-${tipo === 'sucesso' ? 'circle-check' : 'circle-exclamation'}" aria-hidden="true"></i>
        ${sanitize(msg)}
      </div>`;
  }

  /* — Desabilita/habilita botão de envio — */
  function setBtnLoading(loading) {
    if (!btnEnviar) return;
    btnEnviar.classList.toggle('btn--loading', loading);
    btnEnviar.disabled = loading;
  }

  /* — Coleta dados do formulário — */
  /*function coletarDados() {
    return {
      nome:     sanitize($('#nome', form).value.trim()),
      empresa:  sanitize($('#empresa', form)?.value.trim() ?? ''),
      email:    $('#email', form).value.trim().toLowerCase(),
      telefone: sanitize($('#telefone', form)?.value.trim() ?? ''),
      assunto:  $('#assunto', form)?.value ?? '',
      mensagem: sanitize($('#mensagem', form).value.trim()),
    };
  }

  /* — Submit — */
  /*form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Honeypot: rejeita bots silenciosamente
    const honeypot = $('#website', form);
    if (honeypot && honeypot.value !== '') return;

    if (!validarTudo()) {
      // Foca o primeiro campo com erro
      const primeiroErro = $('.form__input--erro, .form__textarea--erro, .form__select--erro', form);
      primeiroErro?.focus();
      return;
    }

    setBtnLoading(true);

    const dados = coletarDados();
    const endpoint = form.dataset.endpoint ?? '/api/contato';

    try {
      /**
       * Integração com backend — pronto para usar.
       * Descomente quando o endpoint estiver disponível:
       *
       * const res = await fetch(endpoint, {
       *   method: 'POST',
       *   headers: { 'Content-Type': 'application/json' },
       *   body: JSON.stringify(dados),
       * });
       * if (!res.ok) throw new Error(`HTTP ${res.status}`);
       * const json = await res.json();
       */

      // Simulação de envio (remover ao integrar com backend)
      /*await new Promise(r => setTimeout(r, 1200));

      exibirFeedback('sucesso', 'Mensagem enviada com sucesso! Retornaremos em breve.');
      form.reset();
      // Limpa classes de erro residuais
      $$('.form__input--erro, .form__textarea--erro', form)
        .forEach(el => el.classList.remove('form__input--erro', 'form__textarea--erro'));

    } catch (err) {
      console.error('[Formulário] Erro ao enviar:', err);
      exibirFeedback('erro', 'Falha ao enviar. Tente novamente ou entre em contato pelo WhatsApp.');
    } finally {
      setBtnLoading(false);
    }
  });
})();*/})()