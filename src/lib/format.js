export function greeting(name) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const first = (name || 'there').split(' ')[0];
  return `${part}, ${first}`;
}

export function initials(name) {
  return (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function fmtMoney(n, asset = 'USDC') {
  const v = Number(n) || 0;
  return `$${v.toLocaleString()} ${asset}`;
}
