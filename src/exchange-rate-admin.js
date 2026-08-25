import { supabase } from './lib/supabase';

const CARD_ID = 'litesms-pricing-settings-card';

export function ensureExchangeRateCard(root) {
  const settings = root?.querySelector('#admin-settings-content');
  if (!settings || settings.querySelector(`#${CARD_ID}`)) return;

  const card = document.createElement('section');
  card.id = CARD_ID;
  card.className = 'card';
  card.innerHTML = `
    <strong>Pricing Settings</strong>
    <div class="muted" style="margin-top:4px">These settings apply only to new 5SIM retail-price calculations. Existing orders keep their stored pricing.</div>
    <div style="margin-top:12px">
      <label style="display:block;font-weight:700">USD → NGN Exchange Rate</label>
      <input class="input" type="number" min="0.01" step="0.01" inputmode="decimal" data-fx-input placeholder="Loading…" aria-label="USD to NGN exchange rate">
      <button class="close" type="button" data-fx-save>Save Exchange Rate</button>
      <span class="muted" data-fx-status style="margin-left:8px"></span>
    </div>
    <div style="margin-top:16px">
      <label style="display:block;font-weight:700">Profit / Markup Percentage</label>
      <div class="muted" style="margin-top:4px">Current default: 40%. Example: provider cost × exchange rate × 1.40.</div>
      <input class="input" type="number" min="0" max="1000" step="0.01" inputmode="decimal" data-markup-input placeholder="Loading…" aria-label="Profit percentage">
      <button class="close" type="button" data-markup-save>Save Profit Percentage</button>
      <span class="muted" data-markup-status style="margin-left:8px"></span>
    </div>

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0">
      <strong>5SIM Funding</strong>
      <div class="muted" style="margin-top:4px">Provider funding summary shown in USD only.</div>
      <div class="row"><span>Current Balance</span><b data-fivesim-balance>Checking…</b></div>
      <div class="row"><span>Last Deposit</span><b data-fivesim-last-deposit>Checking…</b></div>
      <div class="row"><span>Total Invested</span><b data-fivesim-total-invested>Checking…</b></div>
      <div class="muted" data-fivesim-status style="margin-top:6px"></div>
    </div>
  `;

  settings.appendChild(card);

  const fxInput = card.querySelector('[data-fx-input]');
  const fxSave = card.querySelector('[data-fx-save]');
  const fxStatus = card.querySelector('[data-fx-status]');
  const markupInput = card.querySelector('[data-markup-input]');
  const markupSave = card.querySelector('[data-markup-save]');
  const markupStatus = card.querySelector('[data-markup-status]');
  const balanceEl = card.querySelector('[data-fivesim-balance]');
  const lastDepositEl = card.querySelector('[data-fivesim-last-deposit]');
  const totalInvestedEl = card.querySelector('[data-fivesim-total-invested]');
  const balanceStatus = card.querySelector('[data-fivesim-status]');
  const initData = () => window.Telegram?.WebApp?.initData || '';

  const load = async () => {
    try {
      const [{ data, error }, provider] = await Promise.all([
        supabase.functions.invoke('litesms-exchange-rate', {
          body: { initData: initData(), action: 'get' }
        }),
        supabase.functions.invoke('litesms-admin', {
          body: { initData: initData(), action: 'provider_balance' }
        })
      ]);
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to load pricing settings');
      if (provider.error || provider.data?.error) throw new Error(provider.data?.error || provider.error?.message || 'Unable to load 5SIM funding');
      fxInput.value = data.rate;
      markupInput.value = Number.isFinite(Number(data.markup_percent)) ? data.markup_percent : 40;
      const balance = Number(provider.data?.balance);
      const lastDeposit = Number(provider.data?.last_deposit_usd);
      const totalInvested = Number(provider.data?.total_invested_usd);
      balanceEl.textContent = Number.isFinite(balance) ? `$${balance.toFixed(4)}` : '—';
      lastDepositEl.textContent = Number.isFinite(lastDeposit) ? `$${lastDeposit.toFixed(4)}` : '$0.00';
      totalInvestedEl.textContent = Number.isFinite(totalInvested) ? `$${totalInvested.toFixed(4)}` : '$0.00';
      fxStatus.textContent = '';
      markupStatus.textContent = '';
      balanceStatus.textContent = 'Live funding data from 5SIM';
    } catch (e) {
      if (e?.message === 'Admin access required') {
        card.remove();
        return;
      }
      fxStatus.textContent = e?.message || 'Unable to load settings';
      fxStatus.style.color = '#b91c1c';
      markupStatus.textContent = e?.message || 'Unable to load settings';
      markupStatus.style.color = '#b91c1c';
      balanceStatus.textContent = e?.message || 'Unable to load 5SIM funding';
      balanceStatus.style.color = '#b91c1c';
    }
  };

  fxSave.onclick = async () => {
    const rate = Number(fxInput.value);
    if (!Number.isFinite(rate) || rate <= 0) {
      fxStatus.textContent = 'Enter a valid rate.';
      fxStatus.style.color = '#b91c1c';
      return;
    }
    fxSave.disabled = true;
    fxStatus.textContent = 'Saving…';
    fxStatus.style.color = '';
    try {
      const { data, error } = await supabase.functions.invoke('litesms-exchange-rate', {
        body: { initData: initData(), action: 'save', rate }
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to save exchange rate');
      fxInput.value = data.rate;
      fxStatus.textContent = 'Saved';
      fxStatus.style.color = '#166534';
      setTimeout(() => { if (fxStatus) fxStatus.textContent = ''; }, 1800);
    } catch (e) {
      fxStatus.textContent = e?.message || 'Unable to save rate';
      fxStatus.style.color = '#b91c1c';
    } finally {
      fxSave.disabled = false;
    }
  };

  markupSave.onclick = async () => {
    const markup = Number(markupInput.value);
    if (!Number.isFinite(markup) || markup < 0 || markup > 1000) {
      markupStatus.textContent = 'Enter a valid percentage.';
      markupStatus.style.color = '#b91c1c';
      return;
    }
    markupSave.disabled = true;
    markupStatus.textContent = 'Saving…';
    markupStatus.style.color = '';
    try {
      const { data, error } = await supabase.functions.invoke('litesms-exchange-rate', {
        body: { initData: initData(), action: 'save_markup', markup }
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to save profit percentage');
      markupInput.value = data.markup_percent;
      markupStatus.textContent = 'Saved';
      markupStatus.style.color = '#166534';
      setTimeout(() => { if (markupStatus) markupStatus.textContent = ''; }, 1800);
    } catch (e) {
      markupStatus.textContent = e?.message || 'Unable to save profit percentage';
      markupStatus.style.color = '#b91c1c';
    } finally {
      markupSave.disabled = false;
    }
  };

  load();
}
