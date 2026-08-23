import { supabase } from './lib/supabase';

const PRICE_REFRESH_MS = 30000;
let lastSelect = null;
let priceCache = new Map();

const money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? `₦${Math.round(n).toLocaleString()}` : 'Unavailable';
};

async function getPrice(country, service, operator) {
  const key = `${country}:${service}:${operator}`;
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.at < PRICE_REFRESH_MS) return cached.price;
  try {
    const { data, error } = await supabase.functions.invoke('fivesim-catalog', {
      body: { action: 'price', country, service, operator }
    });
    if (error || data?.error) throw new Error('price unavailable');
    const price = Number(data?.data?.retail_price_ngn);
    const result = Number.isFinite(price) ? price : null;
    priceCache.set(key, { price: result, at: Date.now() });
    return result;
  } catch {
    priceCache.set(key, { price: null, at: Date.now() });
    return null;
  }
}

function getBuyContext(select) {
  const panel = select.closest('.panel');
  if (!panel) return null;
  const text = panel.innerText || '';
  const countryMatch = text.match(/Country[\s\S]*?([A-Za-z]{2,})\s*Service/);
  const serviceMatch = text.match(/Service[\s\S]*?([A-Za-z0-9_-]+)\s*Operator/);
  return {
    country: countryMatch?.[1]?.trim() || '',
    service: serviceMatch?.[1]?.trim() || ''
  };
}

function hideRetailNotice(panel) {
  panel.querySelectorAll('.notice').forEach((notice) => {
    const text = (notice.textContent || '').trim();
    notice.style.display = text.startsWith('Litesms price:') ? 'none' : '';
  });
}

async function renderOperatorCards(select) {
  if (!select || select === lastSelect || !supabase) return;
  lastSelect = select;
  const panel = select.closest('.panel');
  if (!panel) return;

  select.style.display = 'none';
  let wrap = panel.querySelector('[data-litesms-operators]');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.dataset.litesmsOperators = 'true';
    wrap.className = 'operator-cards';
    select.insertAdjacentElement('afterend', wrap);
  }

  const options = [...select.options].filter((option) => option.value && option.value !== 'any' && option.value !== 'Service unavailable');
  if (!options.length) {
    wrap.innerHTML = '<div class="operator-empty">Service unavailable, try again later.</div>';
    return;
  }

  const context = getBuyContext(select) || {};
  wrap.innerHTML = '';
  options.forEach((option) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `operator-card${option.value === select.value ? ' selected' : ''}`;
    card.innerHTML = `<span class="operator-name">${option.textContent.replace(/\s+·\s+.*$/, '')}</span><span class="operator-price">Checking…</span>`;
    card.addEventListener('click', () => {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      wrap.querySelectorAll('.operator-card').forEach((el) => el.classList.remove('selected'));
      card.classList.add('selected');
    });
    wrap.appendChild(card);

    getPrice(context.country, context.service, option.value).then((price) => {
      const priceEl = card.querySelector('.operator-price');
      if (priceEl) priceEl.textContent = price == null ? 'Unavailable' : money(price);
    });
  });
}

function sync() {
  const buyPanel = [...document.querySelectorAll('.panel')].find((panel) => panel.querySelector('h2')?.textContent?.trim() === 'Buy a Number');
  if (!buyPanel) return;
  const select = buyPanel.querySelector('select');
  if (select) renderOperatorCards(select);
  hideRetailNotice(buyPanel);
  if (select) {
    const wrap = buyPanel.querySelector('[data-litesms-operators]');
    if (wrap) wrap.querySelectorAll('.operator-card').forEach((card, index) => card.classList.toggle('selected', [...select.options].filter(o => o.value && o.value !== 'any')[index]?.value === select.value));
  }
}

const observer = new MutationObserver(sync);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
setInterval(sync, 1000);
setTimeout(sync, 300);
