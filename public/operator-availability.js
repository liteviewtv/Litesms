(() => {
  function refreshOperatorAvailability() {
    document.querySelectorAll('.panel').forEach((panel) => {
      if (panel.querySelector('h2')?.textContent?.trim() !== 'Buy a Number') return;
      const select = panel.querySelector('select');
      const wrap = panel.querySelector('[data-litesms-operators]');
      if (!select || !wrap) return;
      const options = [...select.options].filter((option) => option.value && option.value !== 'Service unavailable');
      const cards = [...wrap.querySelectorAll('.operator-card')];
      if (!cards.length) return;

      cards.forEach((card, index) => {
        const option = options[index];
        if (!option) return;
        const match = String(option.textContent || '').match(/·\s*([\d,]+)\s+available/i);
        const count = match ? match[1] : '0';
        let availability = card.querySelector('.operator-availability');
        if (!availability) {
          availability = document.createElement('span');
          availability.className = 'operator-availability';
          availability.style.cssText = 'display:block;margin-top:3px;color:#61758a;font-size:11px;font-weight:700;white-space:nowrap;';
          const name = card.querySelector('.operator-name');
          if (name) {
            const holder = document.createElement('span');
            holder.style.cssText = 'display:flex;flex-direction:column;min-width:0;';
            name.replaceWith(holder);
            holder.appendChild(name);
            holder.appendChild(availability);
          }
        }
        availability.textContent = `${count} available`;
      });
    });
  }

  const observer = new MutationObserver(refreshOperatorAvailability);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  setTimeout(refreshOperatorAvailability, 500);
  setInterval(refreshOperatorAvailability, 1000);
})();
