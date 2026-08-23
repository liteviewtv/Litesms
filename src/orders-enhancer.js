import { supabase } from './lib/supabase';

const STYLE_ID = 'litesms-orders-enhancer-style';
let ordersCache = null;
let fetchPromise = null;
let lastPanel = null;

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .list-card.litesms-order-card{display:flex;flex-direction:column;gap:10px;margin:12px 0;padding:15px;border:1px solid #e3edf5;border-radius:16px;background:#fbfdff}
    .litesms-order-number-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .litesms-order-number{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:17px;font-weight:800;color:#102a43}
    .litesms-copy-number{flex:0 0 auto;border:1px solid #bfdbfe;background:#fff;color:#1261a0;border-radius:9px;padding:8px 10px;font-size:12px;font-weight:800;cursor:pointer}
    .litesms-copy-number:active,.copy-code:active{transform:scale(.97)}
    .litesms-status{display:flex;align-items:center;gap:7px;width:max-content;padding:5px 9px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:800}
    .litesms-status.completed{background:#ecfdf3;color:#15803d}
    .litesms-status.waiting{background:#eff6ff;color:#2563eb}
    .litesms-status-dot{width:7px;height:7px;border-radius:50%;background:#94a3b8}
    .litesms-status.completed .litesms-status-dot{background:#16a34a}
    .litesms-status.waiting .litesms-status-dot{background:#3b82f6;animation:litesms-order-pulse 1.5s infinite}
    .litesms-order-time{color:#61758a;font-size:12px;font-weight:700}
    @keyframes litesms-order-pulse{0%,100%{opacity:1}50%{opacity:.35}}
    @media(max-width:420px){.litesms-order-number-row{align-items:flex-start}.litesms-copy-number{padding:8px 9px}}
  `;
  document.head.appendChild(style);
}

function copyText(text, button, label) {
  const done = () => {
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = label; }, 1500);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(String(text)).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}

function fallbackCopy(text, done) {
  const input = document.createElement('textarea');
  input.value = String(text);
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  try { document.execCommand('copy'); done(); } catch {}
  input.remove();
}

async function loadOrders() {
  if (ordersCache || fetchPromise) return fetchPromise || ordersCache;
  const initData = window.Telegram?.WebApp?.initData;
  if (!supabase || !initData) return [];
  fetchPromise = supabase.functions.invoke('litesms-user-data', { body: { initData } })
    .then(({ data, error }) => {
      if (error || data?.error) throw error || new Error(data.error);
      ordersCache = Array.isArray(data?.orders) ? data.orders : [];
      return ordersCache;
    })
    .catch(() => [])
    .finally(() => { fetchPromise = null; });
  return fetchPromise;
}

function statusInfo(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'completed') return ['Completed', 'completed'];
  if (value === 'pending' || value === 'active') return ['Waiting for SMS', 'waiting'];
  return [({ cancelled:'Cancelled', refunded:'Refunded', failed:'Failed', expired:'Expired' }[value] || status || 'Unknown'), ''];
}

function findOrder(card, orders, used) {
  const phone = (card.querySelector('strong')?.textContent || '').replace(/^\+/, '').trim();
  const status = (card.querySelector('span')?.textContent || '').trim().toLowerCase();
  return orders.find((order) => {
    if (used.has(order.id)) return false;
    const samePhone = String(order.phone_number || '').replace(/^\+/, '') === phone;
    const orderStatus = String(order.status || '').toLowerCase();
    const sameStatus = status.includes('completed') ? orderStatus === 'completed' : status.includes('waiting') ? ['pending','active'].includes(orderStatus) : true;
    return samePhone && sameStatus;
  }) || orders.find((order) => !used.has(order.id) && String(order.phone_number || '').replace(/^\+/, '') === phone);
}

function enhanceCards(panel, orders) {
  const cards = [...panel.querySelectorAll('.list-card')];
  const used = new Set();
  cards.forEach((card) => {
    const order = findOrder(card, orders, used);
    if (!order || card.dataset.litesmsEnhanced === order.id) return;
    if (order.id) used.add(order.id);

    card.dataset.litesmsEnhanced = order.id || 'yes';
    card.classList.add('litesms-order-card');
    const [statusText, statusClass] = statusInfo(order.status);
    const phone = String(order.phone_number || '').startsWith('+') ? String(order.phone_number) : `+${order.phone_number || 'Pending'}`;
    const code = order.sms_code == null ? '' : String(order.sms_code).trim();
    const countdown = card.querySelector('small')?.textContent?.trim() || '';

    card.replaceChildren();

    const numberRow = document.createElement('div');
    numberRow.className = 'litesms-order-number-row';
    const number = document.createElement('strong');
    number.className = 'litesms-order-number';
    number.textContent = `📱 ${phone}`;
    const copyNumber = document.createElement('button');
    copyNumber.type = 'button';
    copyNumber.className = 'litesms-copy-number';
    copyNumber.textContent = 'Copy Number';
    copyNumber.addEventListener('click', () => copyText(phone, copyNumber, 'Copy Number'));
    numberRow.append(number, copyNumber);
    card.appendChild(numberRow);

    const status = document.createElement('span');
    status.className = `litesms-status ${statusClass}`.trim();
    const dot = document.createElement('span');
    dot.className = 'litesms-status-dot';
    status.append(dot, document.createTextNode(statusText));
    card.appendChild(status);

    if (countdown && !code && ['pending','active'].includes(String(order.status || '').toLowerCase())) {
      const time = document.createElement('small');
      time.className = 'litesms-order-time';
      time.textContent = countdown;
      card.appendChild(time);
    }

    if (String(order.status || '').toLowerCase() === 'completed') {
      if (code) {
        const box = document.createElement('div');
        box.className = 'sms-box';
        const info = document.createElement('div');
        info.className = 'sms-box-info';
        const label = document.createElement('small');
        label.textContent = '🔐 SMS CODE';
        const codeEl = document.createElement('strong');
        codeEl.className = 'code';
        codeEl.textContent = code;
        info.append(label, codeEl);
        const copyCode = document.createElement('button');
        copyCode.type = 'button';
        copyCode.className = 'copy-code';
        copyCode.textContent = 'Copy Code';
        copyCode.addEventListener('click', () => copyText(code, copyCode, 'Copy Code'));
        box.append(info, copyCode);
        card.appendChild(box);
      } else {
        const waiting = document.createElement('div');
        waiting.className = 'sms-waiting';
        waiting.textContent = 'SMS received, code is being synced…';
        card.appendChild(waiting);
      }
    }
  });
}

async function enhance() {
  const panel = [...document.querySelectorAll('.panel')].find((p) => p.querySelector('h2')?.textContent?.trim() === 'Orders');
  if (!panel) return;
  installStyles();
  if (panel !== lastPanel) {
    lastPanel = panel;
    ordersCache = null;
  }
  const orders = await loadOrders();
  if (orders.length) enhanceCards(panel, orders);
}

let timer;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(enhance, 60);
}

function start() {
  enhance();
  const root = document.getElementById('root') || document.body;
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  setInterval(() => {
    ordersCache = null;
    if (document.querySelector('.panel h2')?.textContent?.trim() === 'Orders') enhance();
  }, 7000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
