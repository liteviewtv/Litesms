import { supabase } from './lib/supabase';

const CARD_ID = 'litesms-exchange-rate-card';

function ensureCard(root) {
  const wrap = root?.querySelector('.wrap');
  if (!wrap || wrap.querySelector(`#${CARD_ID}`)) return;
  const card = document.createElement('section');
  card.id = CARD_ID;
  card.className = 'card';
  card.innerHTML = `
    <strong>USD → NGN Exchange Rate</strong>
    <div class="muted" style="margin-top:4px">Used for new 5SIM retail-price calculations.</div>
    <input class="input" type="number" min="0.01" step="0.01" inputmode="decimal" data-fx-input placeholder="Loading…" aria-label="USD to NGN exchange rate">
    <button class="close" type="button" data-fx-save>Save</button>
    <span class="muted" data-fx-status style="margin-left:8px"></span>
  `;
  const header = wrap.querySelector('.head');
  header?.insertAdjacentElement('afterend', card) || wrap.prepend(card);

  const input = card.querySelector('[data-fx-input]');
  const save = card.querySelector('[data-fx-save]');
  const status = card.querySelector('[data-fx-status]');
  const initData = () => window.Telegram?.WebApp?.initData || '';

  const load = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('litesms-exchange-rate', {
        body: { initData: initData(), action: 'get' }
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to load exchange rate');
      input.value = data.rate;
      status.textContent = '';
    } catch (e) {
      if (e?.message === 'Admin access required') {
        card.remove();
        return;
      }
      status.textContent = e?.message || 'Unable to load rate';
      status.style.color = '#b91c1c';
    }
  };

  save.onclick = async () => {
    const rate = Number(input.value);
    if (!Number.isFinite(rate) || rate <= 0) {
      status.textContent = 'Enter a valid rate.';
      status.style.color = '#b91c1c';
      return;
    }
    save.disabled = true;
    status.textContent = 'Saving…';
    status.style.color = '';
    try {
      const { data, error } = await supabase.functions.invoke('litesms-exchange-rate', {
        body: { initData: initData(), action: 'save', rate }
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to save exchange rate');
      input.value = data.rate;
      status.textContent = 'Saved';
      status.style.color = '#166534';
      setTimeout(() => { if (status) status.textContent = ''; }, 1800);
    } catch (e) {
      status.textContent = e?.message || 'Unable to save rate';
      status.style.color = '#b91c1c';
    } finally {
      save.disabled = false;
    }
  };

  load();
}

const observe = () => {
  const root = document.getElementById('litesms-admin-root');
  if (!root) return false;
  ensureCard(root);
  new MutationObserver(() => ensureCard(root)).observe(root, { childList: true, subtree: true });
  return true;
};

if (!observe()) {
  const timer = setInterval(() => { if (observe()) clearInterval(timer); }, 100);
  setTimeout(() => clearInterval(timer), 30000);
}
