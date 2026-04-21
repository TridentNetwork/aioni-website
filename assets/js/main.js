  // Inline SVG maps (so animations work)
  function inlineSvg(id, url) {
    var el = document.getElementById(id);
    if (!el) return;
    fetch(url)
      .then(function(r) { return r.text(); })
      .then(function(svg) {
        el.innerHTML = svg;
        var svgEl = el.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = '100%';
          svgEl.style.height = '100%';
        }
      });
  }
  inlineSvg('mapDark', 'assets/images/ph-map.svg?v=11');
  inlineSvg('mapLight', 'assets/images/ph-map-light.svg?v=11');

  // Back to top button
  var topBtn = document.getElementById('backToTop');
  if (topBtn) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 400) {
        topBtn.classList.add('visible');
      } else {
        topBtn.classList.remove('visible');
      }
    });
    topBtn.addEventListener('click', function() {
      var start = window.scrollY;
      var duration = Math.min(800, start * 0.5);
      var startTime = null;
      function step(time) {
        if (!startTime) startTime = time;
        var progress = Math.min((time - startTime) / duration, 1);
        var ease = 1 - Math.pow(1 - progress, 3);
        window.scrollTo(0, start * (1 - ease));
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // Theme toggle (dark/light)
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // Intersection-based reveal animation (repeats on every scroll)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      } else {
        e.target.classList.remove('visible');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Graceful image fallback — if Unsplash fails, show gradient placeholder
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      const parent = img.closest('.imagery-photo, .facility-strip');
      if (parent) {
        img.style.display = 'none';
        parent.style.background = 'linear-gradient(135deg, #131a24, #0f141c), radial-gradient(circle at 30% 30%, rgba(196, 54, 78, 0.2), transparent 60%)';
      }
    });
  });

  // Reusable show more / show less toggle
  function setupToggle(btnId, hiddenClass, showClass, outClass) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', function() {
      var items = document.querySelectorAll('.' + hiddenClass);
      var expanded = btn.textContent === 'Show less';
      btn.disabled = true;
      if (expanded) {
        var total = items.length;
        for (var i = total - 1; i >= 0; i--) {
          (function(el, idx) {
            setTimeout(function() {
              el.classList.remove(showClass);
              el.classList.add(outClass);
            }, (total - 1 - idx) * 50);
          })(items[i], i);
        }
        setTimeout(function() {
          items.forEach(function(el) { el.classList.remove(outClass); });
          btn.textContent = 'Show more';
          btn.disabled = false;
        }, total * 50 + 250);
      } else {
        items.forEach(function(el, i) {
          setTimeout(function() { el.classList.add(showClass); }, i * 50);
        });
        setTimeout(function() {
          btn.textContent = 'Show less';
          btn.disabled = false;
        }, items.length * 50 + 250);
      }
    });
  }

  // IXP show more / show less
  setupToggle('ixpToggle', 'ixp-hidden', 'ixp-show', 'ixp-out');

  // Coverage show more / show less
  setupToggle('covToggle', 'cov-hidden', 'cov-show', 'cov-out');

  // Mobile menu toggle — simple anchor scroll panel
  const toggle = document.querySelector('.mobile-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const links = document.querySelector('.nav-links');
      if (links) {
        const isOpen = links.style.display === 'flex';
        links.style.display = isOpen ? '' : 'flex';
        links.style.flexDirection = 'column';
        links.style.position = 'absolute';
        links.style.top = '100%';
        links.style.left = '0';
        links.style.right = '0';
        links.style.background = 'var(--bg-elev)';
        links.style.borderBottom = '1px solid var(--line)';
        links.style.padding = '24px 32px';
        links.style.gap = '16px';
      }
    });
  }
