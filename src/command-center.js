/**
 * CHAINLANCER — Command Center & Dock Controller
 * Interactive mockup controller inspired by thread.ishaandev.co.in
 */

export function initCommandCenter() {
  const dockButtons = document.querySelectorAll('.nh-dock-btn');
  const stateViews = document.querySelectorAll('.nh-state-view');
  const pathDisplay = document.getElementById('nh-preview-path');

  const PATHS = {
    vaults: '• /vaults',
    queue: '• /queue',
    milestones: '• /milestones',
    audit: '• /audit'
  };

  if (!dockButtons.length || !stateViews.length) return;

  function switchTab(tabId) {
    // Update dock buttons
    dockButtons.forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === tabId;
      btn.setAttribute('data-active', isActive ? 'true' : 'false');
      
      // Manage tooltip visibility
      let tip = btn.querySelector('.nh-dock-tip');
      if (isActive) {
        if (!tip) {
          tip = document.createElement('span');
          tip.className = 'nh-dock-tip';
          tip.textContent = btn.getAttribute('data-label') || '';
          btn.appendChild(tip);
        }
      } else {
        if (tip) tip.remove();
      }
    });

    // Update state views
    stateViews.forEach(view => {
      const isTarget = view.getAttribute('data-state') === tabId;
      if (isTarget) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Update address bar text
    if (pathDisplay && PATHS[tabId]) {
      pathDisplay.textContent = PATHS[tabId];
    }
  }

  // Click listeners for dock buttons
  dockButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // Interactive Vaults sidebar selector
  const vaultItems = document.querySelectorAll('.nh-vault-item');
  vaultItems.forEach(item => {
    item.addEventListener('click', () => {
      vaultItems.forEach(v => v.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Interactive Command row selector
  const cmdRows = document.querySelectorAll('.nh-cmd-row');
  cmdRows.forEach(row => {
    row.addEventListener('click', () => {
      cmdRows.forEach(r => r.removeAttribute('data-first'));
      row.setAttribute('data-first', 'true');
    });
  });
}
