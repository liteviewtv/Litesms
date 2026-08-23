const icons = {
  Home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5v-9Z"/></svg>',
  Orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 4h6M8 11h8M8 15h5"/></svg>',
  Wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v3H7a2 2 0 0 0 0 4h13v5a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-10Z"/><path d="M20 8H7a2 2 0 0 0 0 4h13V8Z"/><circle cx="16" cy="10" r=".8"/></svg>',
  Profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>'
};
const order = ['Home','Orders','Wallet','Profile'];

function enhanceNavigation() {
  const nav = document.querySelector('.bottom-nav');
  if (!nav) return;
  nav.setAttribute('aria-label', 'Main navigation');
  const buttons = [...nav.querySelectorAll('button')];
  buttons.forEach((button) => {
    const label = (button.textContent || '').trim().replace(/\s+/g, ' ');
    const key = order.find((name) => label.toLowerCase().includes(name.toLowerCase()));
    if (!key) return;
    button.dataset.navigationKey = key;
    button.setAttribute('aria-label', key);
    if (button.dataset.navigationEnhanced !== 'true') {
      button.dataset.navigationEnhanced = 'true';
      button.innerHTML = `${icons[key]}<span>${key}</span>`;
    }
  });
  const keyed = order.map((key) => buttons.find((button) => button.dataset.navigationKey === key)).filter(Boolean);
  if (keyed.length === order.length && keyed.some((button, i) => buttons[i] !== button)) keyed.forEach((button) => nav.appendChild(button));
}

const observer = new MutationObserver(enhanceNavigation);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
setTimeout(enhanceNavigation, 250);
setInterval(enhanceNavigation, 1000);
