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
      <input class="input" type="number" min="0.01" step="0.01" inputmode="decimal" data-fx-input placeholder="Loading…" aria-label="Platform USD to NGN exchange rate">
      <button class="close" type="button" data-fx-save>Save Platform Rate</button>
      <span class="muted" data-fx-status style="margin-left:8px"></span>
    </div>
    <div style="margin-top:16px">
      <label style="display:block;font-weight:700">Crypto Deposit USD → NGN Rate</label>
      <div class="muted" style="margin-top:4px">Controls how much NGN a successful OxaPay crypto deposit credits to the user's wallet. This is separate from the platform pricing rate.</div>
      <input class="input" type="number" min="0.01" step="0.01" inputmode="decimal" data-crypto-fx-input placeholder="Loading…" aria-label="Crypto deposit USD to NGN exchange rate">
      <button class="close" type="button" data-crypto-fx-save>Save Crypto Deposit Rate</button>
      <span class="muted" data-crypto-fx-status style="margin-left:8px"></span>
    </div>
    <div style="margin-top:16px">
      <label style="display:block;font-weight:700">Profit / Markup Percentage</label>
      <div class="muted" style="margin-top:4px">Current default: 40%. Example: provider cost × exchange rate × 1.40.</div>
      <input class="input" type="number" min="0" max="1000" step="0.01" inputmode="decimal" data-markup-input placeholder="Loading…" aria-label="Profit percentage">
      <button class="close" type="button" data-markup-save>Save Profit Percentage</button>
      <span class="muted" data-markup-status style="margin-left:8px"></span>
    </div>

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0">
      <strong>User Dashboard Visibility</strong>
      <div class="muted" style="margin-top:4px">Choose which optional service buttons are visible on the user dashboard.</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding:10px 0"><span><b>SMM Service</b><br><span class="muted">Show the SMM button on the dashboard.</span></span><input type="checkbox" data-smm-enabled aria-label="Show SMM Service button" style="width:20px;height:20px"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0"><span><b>Accounts</b><br><span class="muted">Show the Accounts button on the dashboard.</span></span><input type="checkbox" data-accounts-enabled aria-label="Show Accounts button" style="width:20px;height:20px"></div>
      <span class="muted" data-features-status></span>
    </div>
>
  `;

  settings.appendChild(card);

  const fxInput = card.querySelector('[data-fx-input]');
  const fxSave = card.querySelector('[data-fx-save]');
  const fxStatus = card.querySelector('[data-fx-status]');
  const cryptoFxInput = card.querySelector('[data-crypto-fx-input]');
  const cryptoFxSave = card.querySelector('[data-crypto-fx-save]');
  const cryptoFxStatus = card.querySelector('[data-crypto-fx-status]');
  const smmEnabled = card.querySelector('[data-smm-enabled]');
  const accountsEnabled = card.querySelector('[data-accounts-enabled]');
  const featuresStatus = card.querySelector('[data-features-status]');
  const markupInput = card.querySelector('[data-markup-input]');
  const markupSave = card.querySelector('[data-markup-save]');
  const markupStatus = card.querySelector('[data-markup-status]');
  const initData = () => window.Telegram?.WebApp?.initData || '';

  const load = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('litesms-exchange-rate', { body: { initData: initData(), action: 'get' } });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to load pricing settings');
      fxInput.value = data.rate;
      cryptoFxInput.value = data.crypto_deposit_rate;
      markupInput.value = Number.isFinite(Number(data.markup_percent)) ? data.markup_percent : 40;
      smmEnabled.checked = data.smm_enabled !== false;
      accountsEnabled.checked = data.accounts_enabled !== false;
      fxStatus.textContent = '';
      cryptoFxStatus.textContent = '';
      markupStatus.textContent = '';
    } catch (e) {
      if (e?.message === 'Admin access required') {
        card.remove();
        return;
      }
      fxStatus.textContent = e?.message || 'Unable to load settings';
      fxStatus.style.color = '#b91c1c';
      cryptoFxStatus.textContent = e?.message || 'Unable to load settings';
      cryptoFxStatus.style.color = '#b91c1c';
      markupStatus.textContent = e?.message || 'Unable to load settings';
      markupStatus.style.color = '#b91c1c';
    } finally {
      fxSave.disabled = false;
    }
  };

  cryptoFxSave.onclick = async () => {
    const cryptoDepositRate = Number(cryptoFxInput.value);
    if (!Number.isFinite(cryptoDepositRate) || cryptoDepositRate <= 0) {
      cryptoFxStatus.textContent = 'Enter a valid rate.';
      cryptoFxStatus.style.color = '#b91c1c';
      return;
    }
    cryptoFxSave.disabled = true;
    cryptoFxStatus.textContent = 'Saving…';
    cryptoFxStatus.style.color = '';
    try {
      const { data, error } = await supabase.functions.invoke('litesms-exchange-rate', {
        body: { initData: initData(), action: 'save_crypto_deposit', crypto_deposit_rate: cryptoDepositRate }
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to save crypto deposit rate');
      cryptoFxInput.value = data.crypto_deposit_rate ?? data.value_numeric;
      cryptoFxStatus.textContent = 'Saved';
      cryptoFxStatus.style.color = '#166534';
      setTimeout(() => { if (cryptoFxStatus) cryptoFxStatus.textContent = ''; }, 1800);
    } catch (e) {
      cryptoFxStatus.textContent = e?.message || 'Unable to save crypto deposit rate';
      cryptoFxStatus.style.color = '#b91c1c';
    } finally {
      cryptoFxSave.disabled = false;
    }
  };

  const saveFeature = async (key, enabled) => {
    featuresStatus.textContent = 'Saving…';
    featuresStatus.style.color = '';
    smmEnabled.disabled = true;
    accountsEnabled.disabled = true;
    try {
      const body = { initData: initData(), action: key };
      if (key === 'save_smm_enabled') body.smm_enabled = enabled;
      else body.accounts_enabled = enabled;
      const { data, error } = await supabase.functions.invoke('litesms-exchange-rate', { body });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Unable to save dashboard visibility');
      featuresStatus.textContent = 'Saved';
      featuresStatus.style.color = '#166534';
      setTimeout(() => { if (featuresStatus) featuresStatus.textContent = ''; }, 1800);
    } catch (e) {
      featuresStatus.textContent = e?.message || 'Unable to save dashboard visibility';
      featuresStatus.style.color = '#b91c1c';
      if (key === 'save_smm_enabled') smmEnabled.checked = !enabled;
      else accountsEnabled.checked = !enabled;
    } finally {
      smmEnabled.disabled = false;
      accountsEnabled.disabled = false;
    }
  };

  smmEnabled.onchange = () => saveFeature('save_smm_enabled', smmEnabled.checked);
  accountsEnabled.onchange = () => saveFeature('save_accounts_enabled', accountsEnabled.checked);

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


export function ensureProviderBalancesCard(root) {
  const settings = root?.querySelector('#admin-balances-content');
  const cardId = 'litesms-provider-balances-card';
  if (!settings || settings.querySelector('#'+cardId)) return;
  const card = document.createElement('section');
  card.id = cardId;
  card.className = 'card';
  card.innerHTML = `
    <strong>Provider Balances</strong>
    <div class="muted" style="margin-top:4px">Live provider balances shown in USD.</div>
    <div style="margin-top:10px"><b>5SIM</b></div>
    <div class="row"><span>Current Balance</span><b data-fivesim-balance>Checking…</b></div>
    <div class="row"><span>Last Deposit</span><b data-fivesim-last-deposit>Checking…</b></div>
    <div class="row"><span>Total Invested</span><b data-fivesim-total-invested>Checking…</b></div>
    <div class="muted" data-fivesim-status style="margin-top:6px"></div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0"><b>FigiPanel</b></div>
    <div class="row"><span>Current Balance</span><b data-figipanel-balance>Checking…</b></div>
    <div class="muted" data-figipanel-status style="margin-top:6px"></div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0"><b>BulkAcc</b></div>
    <div class="row"><span>Current Balance</span><b data-bulkacc-balance>Checking…</b></div>
    <div class="muted" data-bulkacc-status style="margin-top:6px"></div>
  `;
  settings.appendChild(card);

  const fiveBalanceEl = card.querySelector('[data-fivesim-balance]');
  const lastDepositEl = card.querySelector('[data-fivesim-last-deposit]');
  const totalInvestedEl = card.querySelector('[data-fivesim-total-invested]');
  const fiveStatus = card.querySelector('[data-fivesim-status]');
  const figiBalanceEl = card.querySelector('[data-figipanel-balance]');
  const figiStatus = card.querySelector('[data-figipanel-status]');
  const bulkBalanceEl = card.querySelector('[data-bulkacc-balance]');
  const bulkStatus = card.querySelector('[data-bulkacc-status]');
  const initData = () => window.Telegram?.WebApp?.initData || '';

  const setProvider = (balanceEl, statusEl, result, label) => {
    if (result?.ok) {
      const balance = Number(result.balance);
      balanceEl.textContent = Number.isFinite(balance) ? '$' + balance.toFixed(4) : '—';
      statusEl.textContent = 'Live funding data from ' + label;
      statusEl.style.color = '';
    } else {
      balanceEl.textContent = '—';
      statusEl.textContent = result?.error || 'Unable to load provider balance';
      statusEl.style.color = '#b91c1c';
    }
  };

  const load = async () => {
    try {
      const provider = await supabase.functions.invoke('litesms-admin', { body: { initData: initData(), action: 'provider_balances' } });
      if (provider.error || provider.data?.error) throw new Error(provider.data?.error || provider.error?.message || 'Unable to load provider balances');
      const providers = provider.data?.providers || {};
      setProvider(fiveBalanceEl, fiveStatus, providers['5sim'], '5SIM');
      setProvider(figiBalanceEl, figiStatus, providers.figipanel, 'FigiPanel');
      setProvider(bulkBalanceEl, bulkStatus, providers.bulkacc, 'BulkAcc');

      const five = providers['5sim'];
      if (five?.ok) {
        const lastDeposit = Number(five.last_deposit_usd);
        const totalInvested = Number(five.total_invested_usd);
        lastDepositEl.textContent = Number.isFinite(lastDeposit) ? '$' + lastDeposit.toFixed(4) : '$0.00';
        totalInvestedEl.textContent = Number.isFinite(totalInvested) ? '$' + totalInvested.toFixed(4) : '$0.00';
      } else {
        lastDepositEl.textContent = '—';
        totalInvestedEl.textContent = '—';
      }
    } catch (e) {
      if (e?.message === 'Admin access required') { card.remove(); return; }
      fiveStatus.textContent = e?.message || 'Unable to load provider balances';
      fiveStatus.style.color = '#b91c1c';
      figiStatus.textContent = e?.message || 'Unable to load provider balances';
      figiStatus.style.color = '#b91c1c';
      bulkStatus.textContent = e?.message || 'Unable to load provider balances';
      bulkStatus.style.color = '#b91c1c';
    }
  };
  load();
}
