import { supabase } from './lib/supabase';

const PRICE_REFRESH_MS = 30000;
const renderedSignatures = new WeakMap();
const priceCache = new Map();
const flagMap = { /* existing country flags preserved */ };
const money = (value) => { const n = Number(value); return Number.isFinite(n) ? `₦${Math.round(n).toLocaleString()}` : 'Unavailable'; };

async function getPrice(country, service, operator) {
  const key = `${country}:${service}:${operator}`;
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.at < PRICE_REFRESH_MS) return cached.price;
  try {
    const { data, error } = await supabase.functions.invoke('fivesim-catalog', { body: { action: 'price', country, service, operator } });
    if (error || data?.error) throw new Error('price unavailable');
    const price = Number(data?.data?.retail_price_ngn);
    const result = Number.isFinite(price) ? price : null;
    priceCache.set(key, { price: result, at: Date.now() });
    return result;
  } catch { priceCache.set(key, { price: null, at: Date.now() }); return null; }
}

function slug(value) {
  const map = {'united states':'usa','united kingdom':'uk','great britain':'uk'};
  const normalized = String(value || '').trim().toLowerCase();
  return map[normalized] || normalized.replace(/\s+/g, '');
}
function getFlag(value) { return flagMap[slug(value)] || '🌐'; }
function getBuyContext(panel) {
  const lists = [...panel.querySelectorAll('.choice-list')];
  const countryButton = lists[0]?.querySelector('.choice-chip.selected');
  const serviceButton = lists[1]?.querySelector('.choice-chip.selected');
  return { country: slug(countryButton?.dataset.countryId || countryButton?.textContent?.replace(/^\S+\s+/, '').trim() || ''), service: slug(serviceButton?.dataset.serviceId || serviceButton?.textContent?.trim() || '') };
}
function decorateCountries(panel) {
  const list = panel.querySelectorAll('.choice-list')[0]; if (!list) return;
  list.querySelectorAll('.choice-chip').forEach((button) => {
    if (button.dataset.countryDecorated === 'true') return;
    const raw = button.textContent.trim(); button.dataset.countryId = slug(raw);
    const flag = document.createElement('span'); flag.className = 'country-flag'; flag.textContent = getFlag(raw); flag.style.marginRight = '8px'; flag.setAttribute('aria-hidden','true'); button.prepend(flag); button.dataset.countryDecorated = 'true';
  });
}
function hideRetailNotice(panel) {
  panel.querySelectorAll('.notice').forEach((notice) => { const text = (notice.textContent || '').trim(); notice.style.display = text.startsWith('Litesms price:') ? 'none' : ''; });
}
function parseAvailability(option) {
  const match = String(option?.textContent || '').match(/·\s*([\d,]+)\s+available/i);
  return match ? `${match[1]} numbers` : '';
}
async function renderOperatorCards(select, context, signature) {
  if (!select || !supabase || renderedSignatures.get(select) === signature) return;
  renderedSignatures.set(select, signature);
  const panel = select.closest('.panel'); if (!panel) return;
  select.style.display = 'none';
  let wrap = panel.querySelector('[data-litesms-operators]');
  if (!wrap) { wrap = document.createElement('div'); wrap.dataset.litesmsOperators = 'true'; wrap.className = 'operator-cards'; select.insertAdjacentElement('afterend', wrap); }
  const rawOptions = [...select.options].filter((option) => option.value && option.value !== 'Service unavailable');
  const options = []; let anyOption = null;
  rawOptions.forEach((option) => {
    const value = String(option.value || '').trim().toLowerCase(); const text = String(option.textContent || '').trim().toLowerCase();
    const isAny = value === 'any' || value === 'any_operator' || value === 'anyoperator' || text === 'any operator';
    if (isAny) { if (!anyOption) anyOption = option; return; } options.push(option);
  });
  if (anyOption) options.unshift(anyOption); else options.unshift({ value: 'any', textContent: 'Any operator' });
  if (!options.length) { wrap.innerHTML = '<div class="operator-empty">Service unavailable, try again later.</div>'; return; }
  wrap.innerHTML = '';
  options.forEach((option) => {
    const value = String(option.value || 'any'); const card = document.createElement('button'); card.type = 'button'; card.className = `operator-card${value === select.value ? ' selected' : ''}`; card.dataset.operatorValue = value;
    const info = document.createElement('span'); info.className = 'operator-info';
    const name = document.createElement('span'); name.className = 'operator-name'; name.textContent = value === 'any' ? 'Any operator' : String(option.textContent || '').replace(/\s+·\s+.*$/, '').trim();
    info.appendChild(name);
    const availability = parseAvailability(option);
    if (availability) { const availabilityEl = document.createElement('span'); availabilityEl.className = 'operator-availability'; availabilityEl.textContent = availability; info.appendChild(availabilityEl); }
    const price = document.createElement('span'); price.className = 'operator-price'; price.textContent = 'Checking…';
    card.append(info, price);
    card.addEventListener('click', () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); wrap.querySelectorAll('.operator-card').forEach((el) => el.classList.remove('selected')); card.classList.add('selected'); });
    wrap.appendChild(card);
    getPrice(context.country, context.service, value).then((priceValue) => { const priceEl = card.querySelector('.operator-price'); if (priceEl) priceEl.textContent = priceValue == null ? 'Unavailable' : money(priceValue); });
  });
}
function sync() {
  document.querySelectorAll('.panel').forEach((panel) => {
    if (panel.querySelector('h2')?.textContent?.trim() !== 'Buy a Number') return;
    decorateCountries(panel); hideRetailNotice(panel); const select = panel.querySelector('select'); if (!select) return;
    const context = getBuyContext(panel); const options = [...select.options].filter((o) => o.value && o.value !== 'Service unavailable');
    const signature = `${context.country}|${context.service}|${options.map((o) => `${o.value}:${o.textContent}`).join(',')}`;
    renderOperatorCards(select, context, signature);
    const wrap = panel.querySelector('[data-litesms-operators]'); if (wrap) wrap.querySelectorAll('.operator-card').forEach((card) => card.classList.toggle('selected', card.dataset.operatorValue === String(select.value)));
  });
}
const observer = new MutationObserver(() => { requestAnimationFrame(sync); });
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(sync, 300);