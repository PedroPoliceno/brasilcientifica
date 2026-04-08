// Ano no copyright
    document.getElementById('anoAtual').textContent = new Date().getFullYear();

    // Menu hambúrguer
    const menuToggle = document.getElementById('menuToggle');
    const mainNav    = document.getElementById('mainNav');
    menuToggle.addEventListener('click', function () {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      mainNav.classList.toggle('header__nav--aberto');
    });
    mainNav.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('header__nav--aberto');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Scroll suave
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const destino = document.querySelector(this.getAttribute('href'));
        if (destino) {
          e.preventDefault();
          destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
          destino.setAttribute('tabindex', '-1');
          destino.focus({ preventScroll: true });
        }
      });
    });

    // Header ao rolar
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
      header.classList.toggle('header--rolando', window.scrollY > 80);
    }, { passive: true });

    // Link ativo conforme seção visível
    const secoes   = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav__link[href^="#"]');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.remove('nav__link--active');
            link.removeAttribute('aria-current');
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('nav__link--active');
              link.setAttribute('aria-current', 'page');
            }
          });
        }
      });
    }, { threshold: 0.4 });
    secoes.forEach(s => obs.observe(s));

    // Filtro de produtos
    document.querySelectorAll('.filtro__btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.filtro__btn').forEach(b => {
          b.classList.remove('filtro__btn--ativo');
          b.setAttribute('aria-pressed', 'false');
        });
        this.classList.add('filtro__btn--ativo');
        this.setAttribute('aria-pressed', 'true');
        const cat = this.dataset.categoria;
        document.querySelectorAll('.produto__card').forEach(card => {
          card.hidden = !(cat === 'todos' || card.dataset.categoria === cat);
        });
      });
    });

    // Animação de entrada (IntersectionObserver)
    const animObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visivel');
          animObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.animar-entrada').forEach(el => animObs.observe(el));

    // Validação do formulário
    const form = document.querySelector('.form');
    if (form) {
      form.addEventListener('submit', function (e) {
        let ok = true;
        const campos = [
          { id: 'nome',     erroId: 'nome-erro',     msg: 'Por favor, informe seu nome completo.' },
          { id: 'mensagem', erroId: 'mensagem-erro',  msg: 'Por favor, escreva sua mensagem.' },
        ];
        campos.forEach(({ id, erroId, msg }) => {
          const el = document.getElementById(id);
          const er = document.getElementById(erroId);
          if (!el.value.trim()) { er.textContent = msg; ok = false; }
          else { er.textContent = ''; }
        });
        const email = document.getElementById('email');
        const emailErro = document.getElementById('email-erro');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
          emailErro.textContent = 'Por favor, informe um e-mail válido.';
          ok = false;
        } else { emailErro.textContent = ''; }
        if (!ok) e.preventDefault();
      });
    }