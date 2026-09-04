import { initApp, api, qs, fmtMoney } from './lib/shell.js';

const root = document.getElementById('milestone-root');
const contractId = qs('contractId');
const milestoneId = qs('milestoneId');

function render(c, ms, user) {
  const canSubmit = c.isFreelancer && ['PENDING', 'IN_PROGRESS'].includes(ms.status) && c.status === 'IN_PROGRESS';
  const submitted = ms.deliverable;

  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Milestone</span>
      <h1>${ms.title}</h1>
      <p>${fmtMoney(ms.amount, c.asset)} · ${ms.status.replace(/_/g, ' ')}</p>
    </div>
    <div id="ms-error" class="app-error" hidden></div>
    <div class="app-grid-2">
      <div class="app-card">
        <div class="app-card__title">Requirements</div>
        <p>${ms.requirements || ms.description || 'No specific requirements listed.'}</p>
        <p class="app-note">Deadline: ${ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : 'Not set'}</p>
      </div>
      <div class="app-card">
        <div class="app-card__title">Contract context</div>
        <p>${c.title}</p>
        <p class="app-note">Status: ${c.status.replace(/_/g, ' ')}</p>
        ${c.status !== 'IN_PROGRESS' && !submitted
          ? '<p class="app-note app-note--sim">Escrow must be funded before deliverables can be submitted.</p>'
          : ''}
      </div>
    </div>
    ${submitted ? `
      <div class="app-card" style="margin-top:20px">
        <div class="app-card__title">Evidence submitted</div>
        <p>Timestamp: ${new Date(ms.submittedAt).toLocaleString()}</p>
        <p>Evidence reference: <code>${ms.deliverable.evidenceHash}</code></p>
        ${ms.deliverable.githubUrl ? `<p>GitHub: ${ms.deliverable.githubUrl}</p>` : ''}
        ${ms.deliverable.figmaUrl ? `<p>Figma: ${ms.deliverable.figmaUrl}</p>` : ''}
        ${ms.deliverable.fileRef ? `<p>File: ${ms.deliverable.fileRef}</p>` : ''}
        <p>${ms.deliverable.description || ''}</p>
      </div>` : ''}
    ${canSubmit ? `
      <form id="submit-form" class="app-card" style="margin-top:20px">
        <div class="app-card__title">Submit deliverable</div>
        <p class="app-note">Evidence represents submitted work. Sensitive raw data is not stored on-chain.</p>
        <label class="app-field"><span>GitHub URL</span><input name="githubUrl" placeholder="https://github.com/..." /></label>
        <label class="app-field"><span>Figma URL</span><input name="figmaUrl" placeholder="https://figma.com/..." /></label>
        <label class="app-field"><span>File / document reference</span><input name="fileRef" placeholder="IPFS hash or document ID" /></label>
        <label class="app-field"><span>Description</span><textarea name="description" placeholder="Summary of completed work"></textarea></label>
        <button type="submit" class="app-btn app-btn--primary">Submit Deliverable</button>
      </form>` : ''}
    <div class="app-actions"><a href="/contract.html?id=${contractId}" class="app-btn app-btn--ghost">Back to Contract</a></div>`;

  document.getElementById('submit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    try {
      await api(`/api/contracts/${contractId}/milestones/${milestoneId}/submit`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const { contract } = await api(`/api/contracts/${contractId}`);
      const updated = contract.milestones.find((m) => m.id === milestoneId);
      render(contract, updated, user);
    } catch (err) {
      const el = document.getElementById('ms-error');
      el.hidden = false;
      el.textContent = err.message;
    }
  });
}

async function bootstrap() {
  const user = await initApp('contracts');
  if (!user || !contractId || !milestoneId) {
    window.location.href = '/dashboard.html';
    return;
  }
  const { contract } = await api(`/api/contracts/${contractId}`);
  const ms = contract.milestones.find((m) => m.id === milestoneId);
  if (!ms) {
    root.innerHTML = '<div class="app-empty">Milestone not found.</div>';
    return;
  }
  render(contract, ms, user);
}

bootstrap();
