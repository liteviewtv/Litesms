import { supabase } from './lib/supabase';

const PRICE_REFRESH_MS = 30000;
const renderedSignatures = new WeakMap();
const priceCache = new Map();
const flagMap = {
  afghanistan:'🇦🇫',albania:'🇦🇱',algeria:'🇩🇿',angola:'🇦🇴',argentina:'🇦🇷',armenia:'🇦🇲',aruba:'🇦🇼',australia:'🇦🇺',austria:'🇦🇹',azerbaijan:'🇦🇿',bahamas:'🇧🇸',bahrain:'🇧🇭',bangladesh:'🇧🇩',barbados:'🇧🇧',belarus:'🇧🇾',belgium:'🇧🇪',belize:'🇧🇿',benin:'🇧🇯',bhutane:'🇧🇹',bih:'🇧🇦',bolivia:'🇧🇴',botswana:'🇧🇼',brazil:'🇧🇷',bulgaria:'🇧🇬',burkinafaso:'🇧🇫',burundi:'🇧🇮',cambodia:'🇰🇭',cameroon:'🇨🇲',canada:'🇨🇦',capeverde:'🇨🇻',chad:'🇹🇩',chile:'🇨🇱',colombia:'🇨🇴',comoros:'🇰🇲',congo:'🇨🇬',costarica:'🇨🇷',croatia:'🇭🇷',cyprus:'🇨🇾',czech:'🇨🇿',denmark:'🇩🇰',djibouti:'🇩🇯',dominicana:'🇩🇴',easttimor:'🇹🇱',ecuador:'🇪🇨',egypt:'🇪🇬',england:'🇬🇧',equatorialguinea:'🇬🇶',estonia:'🇪🇪',ethiopia:'🇪🇹',finland:'🇫🇮',france:'🇫🇷',frenchguiana:'🇬🇫',gabon:'🇬🇦',gambia:'🇬🇲',georgia:'🇬🇪',germany:'🇩🇪',ghana:'🇬🇭',greece:'🇬🇷',guadeloupe:'🇬🇵',guatemala:'🇬🇹',guinea:'🇬🇳',guineabissau:'🇬🇼',guyana:'🇬🇾',haiti:'🇭🇹',honduras:'🇭🇳',hongkong:'🇭🇰',hungary:'🇭🇺',india:'🇮🇳',indonesia:'🇮🇩',ireland:'🇮🇪',israel:'🇮🇱',italy:'🇮🇹',ivorycoast:'🇨🇮',jamaica:'🇯🇲',jordan:'🇯🇴',kazakhstan:'🇰🇿',kenya:'🇰🇪',kuwait:'🇰🇼',kyrgyzstan:'🇰🇬',laos:'🇱🇦',latvia:'🇱🇻',lesotho:'🇱🇸',liberia:'🇱🇷',lithuania:'🇱🇹',luxembourg:'🇱🇺',macau:'🇲🇴',madagascar:'🇲🇬',malawi:'🇲🇼',malaysia:'🇲🇾',maldives:'🇲🇻',mauritania:'🇲🇷',mauritius:'🇲🇺',mexico:'🇲🇽',moldova:'🇲🇩',mongolia:'🇲🇳',montenegro:'🇲🇪',morocco:'🇲🇦',mozambique:'🇲🇿',namibia:'🇳🇦',nepal:'🇳🇵',netherlands:'🇳🇱',newcaledonia:'🇳🇨',nicaragua:'🇳🇮',nigeria:'🇳🇬',northmacedonia:'🇲🇰',norway:'🇳🇴',oman:'🇴🇲',pakistan:'🇵🇰',panama:'🇵🇦',papuanewguinea:'🇵🇬',paraguay:'🇵🇾',peru:'🇵🇪',philippines:'🇵🇭',poland:'🇵🇱',portugal:'🇵🇹',puertorico:'🇵🇷',reunion:'🇷🇪',romania:'🇷🇴',rwanda:'🇷🇼',saintkittsandnevis:'🇰🇳',saintlucia:'🇱🇨',saintvincentandthegrenadines:'🇻🇨',salvador:'🇸🇻',saudiarabia:'🇸🇦',senegal:'🇸🇳',serbia:'🇷🇸',seychelles:'🇸🇨',sierraleone:'🇸🇱',slovakia:'🇸🇰',slovenia:'🇸🇮',solomonislands:'🇸🇧',southafrica:'🇿🇦',spain:'🇪🇸',srilanka:'🇱🇰',suriname:'🇸🇷',swaziland:'🇸🇿',sweden:'🇸🇪',switzerland:'🇨🇭',taiwan:'🇹🇼',tajikistan:'🇹🇯',tanzania:'🇹🇿',thailand:'🇹🇭',togo:'🇹🇬',trinidadandtobago:'🇹🇹',tunisia:'🇹🇳',turkmenistan:'🇹🇲',uganda:'🇺🇬',uk:'🇬🇧',uruguay:'🇺🇾',usa:'🇺🇸',uzbekistan:'🇺🇿',venezuela:'🇻🇪',vietnam:'🇻🇳',zambia:'🇿🇲'
};

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

function getFlag(value) {
  const key = slug(value);
  return flagMap[key] || '🌐';
}

function getBuyContext(panel) {
  const lists = [...panel.querySelectorAll('.choice-list')];
  const countryButton = lists[0]?.querySelector('.choice-chip.selected');
  const serviceButton = lists[1]?.querySelector('.choice-chip.selected');
  const country = countryButton?.dataset.countryId || countryButton?.textContent?.replace(/^\S+\s+/, '').trim() || '';
  const service = serviceButton?.dataset.serviceId || serviceButton?.textContent?.trim() || '';
  return { country: slug(country), service: slug(service) };
}

function decorateCountries(panel) {
  const list = panel.querySelectorAll('.choice-list')[0];
  if (!list) return;
  list.querySelectorAll('.choice-chip').forEach((button) => {
    if (button.dataset.countryDecorated === 'true') return;
    const raw = button.textContent.trim();
    button.dataset.countryId = slug(raw);
    const flag = document.createElement('span');
    flag.className = 'country-flag';
    flag.textContent = getFlag(raw);
    flag.style.marginRight = '8px';
    flag.setAttribute('aria-hidden','true');
    button.prepend(flag);
    button.dataset.countryDecorated = 'true';
  });
}

function hideRetailNotice(panel) {
  panel.querySelectorAll('.notice').forEach((notice) => {
    const text = (notice.textContent || '').trim();
    notice.style.display = text.startsWith('Litesms price:') ? 'none' : '';
  });
}

async function renderOperatorCards(select, context, signature) {
  if (!select || !supabase || renderedSignatures.get(select) === signature) return;
  renderedSignatures.set(select, signature);
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
  const rawOptions = [...select.options].filter((option) => option.value && option.value !== 'Service unavailable');
  const options = [];
  let anyOption = null;
  rawOptions.forEach((option) => {
    const value = String(option.value || '').trim().toLowerCase();
    const text = String(option.textContent || '').trim().toLowerCase();
    const isAny = value === 'any' || value === 'any_operator' || value === 'anyoperator' || text === 'any operator';
    if (isAny) {
      if (!anyOption) anyOption = option;
      return;
    }
    options.push(option);
  });
  if (anyOption) options.unshift(anyOption);
  else options.unshift({ value: 'any', textContent: 'Any operator' });
  if (!options.length) { wrap.innerHTML = '<div class="operator-empty">Service unavailable, try again later.</div>'; return; }
  wrap.innerHTML = '';
  options.forEach((option) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `operator-card${option.value === select.value ? ' selected' : ''}`;
    const name = option.value === 'any' ? 'Any operator' : option.textContent.replace(/\s+·\s+.*$/, '').trim();
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
  document.querySelectorAll('.panel').forEach((panel) => {
    if (panel.querySelector('h2')?.textContent?.trim() !== 'Buy a Number') return;
    decorateCountries(panel);
    hideRetailNotice(panel);
    const select = panel.querySelector('select');
    if (!select) return;
    const context = getBuyContext(panel);
    const options = [...select.options].filter((o) => o.value && o.value !== 'Service unavailable');
    const signature = `${context.country}|${context.service}|${options.map((o) => o.value).join(',')}`;
    renderOperatorCards(select, context, signature);
    const wrap = panel.querySelector('[data-litesms-operators]');
    if (wrap) wrap.querySelectorAll('.operator-card').forEach((card) => card.classList.toggle('selected', card.textContent.split('₦')[0].trim() === (select.value === 'any' ? 'Any operator' : select.options[select.selectedIndex]?.textContent?.replace(/\s+·\s+.*$/,'').trim())));
  });
}

const observer = new MutationObserver(sync);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
setInterval(sync, 1000);
setTimeout(sync, 300);
