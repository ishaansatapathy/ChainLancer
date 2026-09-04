import { initApp, api, fmtMoney } from './lib/shell.js';

const milestonesEl = document.getElementById('milestones');
const totalNote = document.getElementById('milestone-total');
const form = document.getElementById('contract-form');
const errorEl = document.getElementById('form-error');

function showError(msg) {
  errorEl.hidden = !msg;
  errorEl.textContent = msg || '';
}

function milestoneRow(data = {}) {
  const row = document.createElement('div');
  row.className = 'app-milestone-row';
  row.innerHTML = `
    <label class="app-field"><span>Title</span><input class="ms-title" value="${data.title || ''}" placeholder="Design" required /></label>
    <label class="app-field"><span>Description</span><textarea class="ms-desc">${data.description || ''}</textarea></label>
    <label class="app-field"><span>Amount</span><input class="ms-amount" type="number" min="0" step="0.01" value="${data.amount || ''}" required /></label>
    <label class="app-field"><span>Due date</span><input class="ms-due" type="date" value="${data.dueDate || ''}" /></label>
    <label class="app-field"><span>Deliverable requirements</span><textarea class="ms-req">${data.requirements || ''}</textarea></label>
    <button type="button" class="app-btn app-btn--ghost ms-remove">Remove</button>`;
  row.querySelector('.ms-remove').addEventListener('click', () => {
    row.remove();
    updateTotal();
  });
  row.querySelectorAll('input, textarea').forEach((el) => el.addEventListener('input', updateTotal));
  return row;
}

function updateTotal() {
  const amounts = [...milestonesEl.querySelectorAll('.ms-amount')].map((i) => Number(i.value) || 0);
  const sum = amounts.reduce((a, b) => a + b, 0);
  const total = Number(form.totalAmount.value) || 0;
  const match = Math.abs(sum - total) < 0.01;
  totalNote.textContent = `Milestone total: ${fmtMoney(sum)} — ${match ? 'matches contract total' : 'must equal contract total'}`;
  totalNote.style.color = match ? '#86efac' : '#fca5a5';
}

function addMilestone(data) {
  milestonesEl.appendChild(milestoneRow(data));
  updateTotal();
}

document.getElementById('add-milestone').addEventListener('click', () => addMilestone());
form.totalAmount.addEventListener('input', updateTotal);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const totalAmount = Number(form.totalAmount.value);
  const milestones = [...milestonesEl.querySelectorAll('.app-milestone-row')].map((row) => ({
    title: row.querySelector('.ms-title').value.trim(),
    description: row.querySelector('.ms-desc').value.trim(),
    amount: Number(row.querySelector('.ms-amount').value),
    dueDate: row.querySelector('.ms-due').value || null,
    requirements: row.querySelector('.ms-req').value.trim()
  }));
  const sum = milestones.reduce((s, m) => s + m.amount, 0);
  if (milestones.length && Math.abs(sum - totalAmount) > 0.01) {
    showError('Sum of milestone amounts must equal total contract amount.');
    return;
  }
  try {
    const body = {
      counterpartyName: form.counterpartyName.value.trim(),
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      totalAmount,
      asset: form.asset.value.trim() || 'USDC',
      network: form.network.value.trim() || 'Polygon',
      milestones
    };
    const { contract } = await api('/api/contracts', { method: 'POST', body: JSON.stringify(body) });
    window.location.href = `/contract.html?id=${contract.id}`;
  } catch (err) {
    showError(err.message);
  }
});

async function bootstrap() {
  const user = await initApp('contracts');
  if (user.role !== 'client') {
    showError('Only clients can create contracts. Switch to a client account to continue.');
    form.querySelector('button[type=submit]').disabled = true;
    return;
  }
  addMilestone({ title: 'Milestone 1', amount: '' });
}

bootstrap();
