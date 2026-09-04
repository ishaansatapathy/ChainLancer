/**
 * CHAINLANCER — Accordion (Product Deep Dive)
 * Handles tab switching, progress timer, and content display
 */

export function initAccordion() {
  const tabs = document.querySelectorAll('.deep-dive__tab');
  const panels = document.querySelectorAll('.deep-dive__panel');

  if (!tabs.length || !panels.length) return;

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      // Deactivate all
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Activate clicked
      tab.classList.add('active');
      if (panels[index]) {
        panels[index].classList.add('active');
        
        // Animate confidence bars if on AI panel
        if (index === 1) {
          animateConfidenceBars(panels[index]);
        }
      }
    });
  });

  // Initialize first tab
  if (tabs[0]) tabs[0].classList.add('active');
  if (panels[0]) panels[0].classList.add('active');
}

function animateConfidenceBars(panel) {
  const fills = panel.querySelectorAll('.confidence-item__fill');
  fills.forEach(fill => {
    const target = fill.dataset.width || '0%';
    fill.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.width = target;
      });
    });
  });
}
