import { supabase } from './lib/supabase';

const LIVE_REFRESH_MS = 10000;
const stateBySelect = new WeakMap();
const money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? `₦${Math.round(n).toLocaleString()}` : 'Unavailable';
};

function slug(value) {
  const map = { 'united states': 'usa', 'united kingdom': 'uk', 'great britain': 'uk' };
  const normalized = String(value || '').trim().toLowerCase();
  return map[normalized] || normalized.replace(/\s+/g, '');
}

function getBuyContext(panel) {
  const lists = [...panel.querySelectorAll('.choice-list')];
  const countryButton = lists[0]?.querySelector('.choice-chip.selected');
  const serviceButton = lists[1]?.querySelector('.choice-chip.selected');
  return {
    country: slug(countryButton?.dataset.countryId || countryButton?.textContent?.replace(/^\S+\s+/, '').trim() || ''),
    service: slug(serviceButton?.dataset.serviceId || serviceButton?.textContent?.trim() || '')
  };
}

function decorateCountries(panel) {
  const list = panel.querySelectorAll('.choice-list')[0];
  if (!list) return;
  list.querySelectorAll('.choice-chip').forEach((button) => {
    if (button.dataset.countryDecorated === 'true') return;
    const raw = button.textContent.trim();
    button.dataset.countryId = slug(raw);
    button.dataset.countryDecorated = 'true';
  });
}

function hideRetailNotice(panel) {
  panel.querySelectorAll('.notice').forEach((notice) => {
    const text = (notice.textContent || '').trim();
    notice.style.display = text.startsWith('Litesms price:') ? 'none' : '';
  });
}

async function getLivePrice(country, service, operator) {
  try {
    const { data, error } = await supabase.functions.invoke('fivesim-catalog', {
      body: { action: 'price', country, service, operator }
    });
    if (error || data?.error) throw new Error('price unavailable');
    const price = Number(data?.data?.retail_price_ngn);
    return Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}

async function loadLiveOperators(select, panel, context, force = false) {
  if (!select || !supabase) return;
  const key = `${context.country}|${context.service}`;
  const current = stateBySelect.get(select) || {};
  if (!force && current.contextKey === key && current.loaded) return;

  const requestId = (current.requestId || 0) + 1;
  stateBySelect.set(select, { ...current, contextKey: key, requestId, loaded: false });
  select.style.display = 'none';

  let wrap = panel.querySelector('[data-litesms-operators]');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.dataset.litesmsOperators = 'true';
    wrap.className = 'operator-cards';
    select.insertAdjacentElement('afterend', wrap);
  }

  wrap.innerHTML = '<div class="operator-empty">Checking live availability…</div>';

  try {
    const { data, error } = await supabase.functions.invoke('fivesim-catalog', {
      body: { action: 'operators', country: context.country, service: context.service }
    });
    if (error || data?.error) throw new Error('operators unavailable');

    const incoming = Array.isArray(data?.data) ? data.data : [];
    if (stateBySelect.get(select)?.requestId !== requestId) return;

    const operators = incoming
      .filter((item) => item && item.id && Number(item.count) > 0)
      .map((item) => ({
        id: String(item.id).toLowerCase(),
        name: item.name || item.id,
        count: Number(item.count) || 0
      }));

    const anyIndex = operators.findIndex((item) => item.id === 'any');
    if (anyIndex > 0) {
      const [any] = operators.splice(anyIndex, 1);
      operators.unshift(any);
    }

    if (!operators.length) {
      wrap.innerHTML = '<div class="operator-empty">Service unavailable, try again later.</div>';
      stateBySelect.set(select, { contextKey: key, requestId, loaded: true });
      return;
    }

    const previousValue = String(select.value || '').toLowerCase();
    const selected = operators.some((item) => item.id === previousValue) ? previousValue : operators[0].id;
    select.value = selected;

    wrap.innerHTML = '';
    operators.forEach((item) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `operator-card${item.id === selected ? ' selected' : ''}`;
      card.dataset.operatorValue = item.id;

      const name = document.createElement('span');
      name.className = 'operator-name';
      name.textContent = item.id === 'any' ? 'Any operator' : item.name;

      const availability = document.createElement('span');
      availability.className = 'operator-availability';
      availability.textContent = `${item.count.toLocaleString()} numbers`;

      const price = document.createElement('span');
      price.className = 'operator-price';
      price.textContent = 'Checking…';

      const info = document.createElement('span');
      info.className = 'operator-info';
      info.append(name, availability);
      card.append(info, price);

      card.addEventListener('click', () => {
        select.value = item.id;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        wrap.querySelectorAll('.operator-card').forEach((el) => el.classList.remove('selected'));
        card.classList.add('selected');
      });

      wrap.appendChild(card);

      getLivePrice(context.country, context.service, item.id).then((priceValue) => {
        if (stateBySelect.get(select)?.requestId !== requestId) return;
        const priceEl = card.querySelector('.operator-price');
        if (priceEl) priceEl.textContent = priceValue == null ? 'Unavailable' : money(priceValue);
      });
    });

    stateBySelect.set(select, { contextKey: key, requestId, loaded: true });
  } catch {
    if (stateBySelect.get(select)?.requestId !== requestId) return;
    wrap.innerHTML = '<div class="operator-empty">Unable to load live availability.</div>';
    stateBySelect.set(select, { contextKey: key, requestId, loaded: true });
  }
}

function sync(force = false) {
  document.querySelectorAll('.panel').forEach((panel) => {
    if (panel.querySelector('h2')?.textContent?.trim() !== 'Buy a Number') return;
    decorateCountries(panel);
    hideRetailNotice(panel);

    const select = panel.querySelector('select');
    if (!select) return;

    const context = getBuyContext(panel);
    if (!context.country || !context.service) return;
    loadLiveOperators(select, panel, context, force);
  });
}

const observer = new MutationObserver(() => requestAnimationFrame(() => sync(false)));
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(() => sync(true), 300);
setInterval(() => sync(true), LIVE_REFRESH_MS);
