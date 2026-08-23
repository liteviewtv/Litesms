import { supabase } from './lib/supabase';

const PRICE_REFRESH_MS = 30000;
let lastSignature = '';
const priceCache = new Map();

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

function slug(value) {
  const map = {
    'united states': 'usa',
    'united kingdom': 'uk',
    'great britain': 'uk',
    'canada': 'canada',
    'australia': 'australia',
    'germany': 'germany',
    'france': 'france',
    'nigeria': 'nigeria',
    'india': 'india',
    'italy': 'italy',
    'spain': 'spain'
  };
  const normalized = String(value || '').trim().toLowerCase();
  return map[normalized] || normalized.replace(/\s+/g, '_');
}

function getBuyContext(panel) {
  const lists = [...panel.querySelectorAll('.choice-list')];
  const country = lists[0]?.querySelector('.choice-chip.selected')?.textContent?.trim() || '';
  const service = lists[1]?.querySelector('.choice-chip.selected')?.textContent?.trim() || '';
  return { country: slug(country), service: slug(service) };
}

function hideRetailNotice(panel) {
  panel.querySelectorAll('.notice').forEach((notice) => {
    const text = (notice.textContent || '').trim();
    notice.style.display = text.startsWith('Litesms price:') ? 'none' : '';
  });
}

async function renderOperatorCards(select, context, signature) {
  if (!select || !supabase || signature === lastSignature) return;
  lastSignature = signature;
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

  wrap.innerHTML = '';
  options.forEach((option) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `operator-card${option.value === select.value ? ' selected' : ''}`;
    const name = option.textContent.replace(/\s+·\s+.*$/, '').trim();
    card.innerHTML = `<span class="operator-name">${name}</span><span class="operator-price">Checking…</span>`;
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
  hideRetailNotice(buyPanel);
  const select = buyPanel.querySelector('select');
  if (!select) return;

  const context = getBuyContext(buyPanel);
  const options = [...select.options].filter((o) => o.value && o.value !== 'any' && o.value !== 'Service unavailable');
  const signature = `${context.country}|${context.service}|${options.map((o) => o.value).join(',')}`;
  renderOperatorCards(select, context, signature);

  const wrap = buyPanel.querySelector('[data-litesms-operators]');
  if (wrap) wrap.querySelectorAll('.operator-card').forEach((card, index) => card.classList.toggle('selected', options[index]?.value === select.value));
}

const observer = new MutationObserver(sync);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
setInterval(sync, 1000);
setTimeout(sync, 300);
