/**
 * CHAINLANCER — Navigation
 * Sticky header blur and mobile menu toggle
 */

export function initNav() {
  const nav = document.querySelector('.nav');
  const links = document.querySelectorAll('.nav__link');
  const mobileToggle = document.querySelector('.nav__mobile-toggle');
  const navLinks = document.querySelector('.nav__links');

  if (!nav) return;

  // ── Scroll-based active section ──
  const sections = document.querySelectorAll('section[id]');

  function updateActiveLink() {
    const scrollY = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.id;

      if (scrollY >= top && scrollY < top + height) {
        links.forEach(link => {
          link.classList.remove('nav__link--active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('nav__link--active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();

  // ── Nav background on scroll ──
  function updateNavBg() {
    if (window.scrollY > 50) {
      nav.style.borderBottomColor = 'rgba(255,255,255,0.06)';
    } else {
      nav.style.borderBottomColor = 'transparent';
    }
  }

  window.addEventListener('scroll', updateNavBg, { passive: true });
  updateNavBg();

  // ── Smooth scroll for nav links ──
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Close mobile menu
          if (navLinks) navLinks.classList.remove('nav__links--open');
        }
      }
    });
  });

  // ── Mobile menu toggle ──
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('nav__links--open');
    });
  }
}
