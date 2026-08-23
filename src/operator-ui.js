import { supabase } from './lib/supabase';

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

async function loadLiveOperators(select, panel, context, force = false) {
  if (!select || !supabase) return;
  const key = `${context.country}|${context.service}`;
  const current = stateBySelect.get(select) || {};
  if (!force && current.contextKey === key && (current.loading || current.loaded)) return;
  if (current.loading && current.contextKey === key) return;

  const requestId = (current.requestId || 0) + 1;
  stateBySelect.set(select, { contextKey: key, requestId, loading: true, loaded: false });
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
    if (error || data?.error) throw new Error(data?.error || 'operators unavailable');
    if (stateBySelect.get(select)?.requestId !== requestId) return;

    const incoming = Array.isArray(data?.data) ? data.data : [];
    const operators = incoming
      .filter((item) => item && item.id && Number(item.count) > 0)
      .map((item) => ({
        id: String(item.id).toLowerCase(),
        name: item.name || item.id,
        count: Number(item.count) || 0,
        retailPrice: Number(item.retail_price_ngn)
      }));

    const anyIndex = operators.findIndex((item) => item.id === 'any');
    if (anyIndex > 0) {
      const [any] = operators.splice(anyIndex, 1);
      operators.unshift(any);
    }

    if (!operators.length) {
      wrap.innerHTML = '<div class="operator-empty">Service unavailable, try again later.</div>';
      stateBySelect.set(select, { contextKey: key, requestId, loading: false, loaded: true });
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
      price.textContent = Number.isFinite(item.retailPrice) ? money(item.retailPrice) : 'Unavailable';

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
    });

    stateBySelect.set(select, { contextKey: key, requestId, loading: false, loaded: true });
  } catch {
    if (stateBySelect.get(select)?.requestId !== requestId) return;
    wrap.innerHTML = '<div class="operator-empty">Unable to load live availability.</div>';
    stateBySelect.set(select, { contextKey: key, requestId, loading: false, loaded: true });
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

let lastSelectionKey = '';

function handleSelectionChange() {
  requestAnimationFrame(() => {
    document.querySelectorAll('.panel').forEach((panel) => {
      if (panel.querySelector('h2')?.textContent?.trim() !== 'Buy a Number') return;
      const context = getBuyContext(panel);
      if (!context.country || !context.service) return;
      const key = `${context.country}|${context.service}`;
      if (key === lastSelectionKey) return;
      lastSelectionKey = key;
      sync(true);
    });
  });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('.choice-chip');
  if (!button) return;
  const list = button.closest('.choice-list');
  if (!list) return;
  const panel = button.closest('.panel');
  if (!panel || panel.querySelector('h2')?.textContent?.trim() !== 'Buy a Number') return;
  if (list === panel.querySelectorAll('.choice-list')[0] || list === panel.querySelectorAll('.choice-list')[1]) {
    handleSelectionChange();
  }
});

// Keep the observer only for route/render changes. It never forces a live refresh.
const observer = new MutationObserver(() => requestAnimationFrame(() => sync(false)));
observer.observe(document.body, { childList: true, subtree: true });

// One initial load for the currently selected country/service; after that,
// live availability and pricing refresh only when the selection changes.
setTimeout(() => {
  document.querySelectorAll('.panel').forEach((panel) => {
    if (panel.querySelector('h2')?.textContent?.trim() !== 'Buy a Number') return;
    const context = getBuyContext(panel);
    if (context.country && context.service) lastSelectionKey = `${context.country}|${context.service}`;
  });
  sync(false);
}, 300);