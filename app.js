/**
 * VANTA Luxury Automotive Experience - Optimized App Controller
 * Ultra-fast ~1s first visual, lightweight passive scroll observer, modal controls.
 */

document.addEventListener('DOMContentLoaded', () => {
  const preloader = document.getElementById('preloader');

  // 1. Initialize Progressive Canvas Engine
  const canvasEngine = new window.VantaCanvasEngine({
    canvasId: 'hero-canvas',
    onFirstFrameReady: () => {
      // INSTANT <1s FIRST VISUAL: Hide preloader immediately when frame 0 is ready!
      if (preloader) {
        preloader.classList.add('loaded');
      }
    }
  });

  // 2. High-Performance Passive Scroll Handler
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = maxScroll > 0 ? currentY / maxScroll : 0;

        canvasEngine.updateScrollProgress(progress);
        checkScrollReveals();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // 3. Scroll Reveal Observer for Minimal Overlays
  const revealElements = document.querySelectorAll('[data-scroll]');

  function checkScrollReveals() {
    const triggerBottom = window.innerHeight * 0.85;
    revealElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < triggerBottom && rect.bottom > 0) {
        el.classList.add('is-visible');
      } else {
        el.classList.remove('is-visible');
      }
    });
  }

  // Initial check
  checkScrollReveals();

  // 4. Configurator Modal Controls
  const configModal = document.getElementById('configurator-modal');
  const openConfigBtns = document.querySelectorAll('.open-config-btn');
  const closeConfigBtn = document.getElementById('close-config-modal');
  const finishSwatches = document.querySelectorAll('.swatch-btn');
  const configSummaryFinish = document.getElementById('config-finish-name');
  const configTotalPrice = document.getElementById('config-total-price');

  openConfigBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (configModal) configModal.classList.add('active');
    });
  });

  if (closeConfigBtn) {
    closeConfigBtn.addEventListener('click', () => {
      if (configModal) configModal.classList.remove('active');
    });
  }

  finishSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      finishSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      const finishName = swatch.dataset.label;
      const extraPrice = parseInt(swatch.dataset.price || '0', 10);
      const basePrice = 148000;

      if (configSummaryFinish) configSummaryFinish.textContent = finishName;
      if (configTotalPrice) {
        configTotalPrice.textContent = `$${(basePrice + extraPrice).toLocaleString()}`;
      }
    });
  });
});
