const FILTERS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled']
];

function normalize(text) {
  return String(text || '').toLowerCase();
}

function applyFilter(root, filter) {
  const cards = [...root.querySelectorAll('.list-card')];
  cards.forEach(card => {
    const text = normalize(card.textContent);
    let show = true;
    if (filter === 'active') show = text.includes('waiting for sms') || text.includes('active') || text.includes('pending');
    if (filter === 'completed') show = text.includes('completed');
    if (filter === 'cancelled') show = text.includes('cancelled') || text.includes('refunded') || text.includes('expired') || text.includes('failed');
    card.style.display = show ? '' : 'none';
  });
}

function install() {
  const panel = [...document.querySelectorAll('.panel')].find(p => p.querySelector('h2')?.textContent?.trim() === 'Orders');
  if (!panel || panel.querySelector('.orders-categories')) return;

  const wrap = document.createElement('div');
  wrap.className = 'orders-categories';
  wrap.style.cssText = 'display:flex;gap:8px;overflow-x:auto;margin:0 0 16px;padding:2px 0;scrollbar-width:none;';

  FILTERS.forEach(([key, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.filter = key;
    button.style.cssText = 'flex:0 0 auto;border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:999px;padding:8px 14px;font-weight:700;font-size:13px;';
    button.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach(b => {
        b.style.background = '#fff';
        b.style.color = '#374151';
        b.style.borderColor = '#d1d5db';
      });
      button.style.background = '#16a34a';
      button.style.color = '#fff';
      button.style.borderColor = '#16a34a';
      applyFilter(panel, key);
    });
    wrap.appendChild(button);
  });

  panel.querySelector('h2')?.after(wrap);
  wrap.querySelector('[data-filter="all"]')?.click();
}

let timer;
function watch() {
  clearTimeout(timer);
  timer = setTimeout(install, 0);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => {
  install();
  new MutationObserver(watch).observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
}, { once: true });
else {
  install();
  new MutationObserver(watch).observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
}
