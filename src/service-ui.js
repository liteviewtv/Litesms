const SERVICE_LOGOS = {
  whatsapp: ['whatsapp', '25D366'], telegram: ['telegram', '26A5E4'], google: ['google', '4285F4'], gmail: ['gmail', 'EA4335'],
  instagram: ['instagram', 'E4405F'], facebook: ['facebook', '1877D2'], tiktok: ['tiktok', '000000'], discord: ['discord', '5865F2'],
  twitter: ['x', '000000'], x: ['x', '000000'], signal: ['signal', '3A76F0'], snapchat: ['snapchat', 'FFFC00'], linkedin: ['linkedin', '0A66C2'],
  microsoft: ['microsoft', '5E5CFF'], outlook: ['microsoftoutlook', '0078D4'], yahoo: ['yahoo', '6001D2'], skype: ['skype', '00AFF0'],
  viber: ['viber', '7360F2'], line: ['line', '00C300'], wechat: ['wechat', '07C160'], kakao: ['kakaotalk', 'FFCD00'], reddit: ['reddit', 'FF4500'],
  steam: ['steam', '000000'], uber: ['uber', '000000'], airbnb: ['airbnb', 'FF5A5F'], amazon: ['amazon', 'FF9900'], binance: ['binance', 'F0B90B'],
  protonmail: ['protonmail', '6D4AFF'], proton: ['proton', '6D4AFF'], imo: ['imo', '00AEEF'], vk: ['vk', '0077FF'], twitch: ['twitch', '9146FF'],
  spotify: ['spotify', '1ED760'], youtube: ['youtube', 'FF0000'], github: ['github', '181717'], microsoftteams: ['microsoftteams', '6264A7'],
  teams: ['microsoftteams', '6264A7'], openai: ['openai', '000000'], chatgpt: ['openai', '000000']
};

const aliases = {
  whatsappbusiness: 'whatsapp', whatsappweb: 'whatsapp', telegramapp: 'telegram', googlevoice: 'google', googlemail: 'gmail',
  instagramapp: 'instagram', facebookapp: 'facebook', twitterapp: 'twitter', xcom: 'x', outlookcom: 'outlook',
  kakaotalk: 'kakao', protonmailcom: 'protonmail'
};

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
const serviceKey = (text) => aliases[normalize(text)] || normalize(text);

const POPULAR_SERVICES = new Set(['whatsapp','telegram','google','instagram','facebook','tiktok','discord','twitter','x']);
const SERVICE_DOMAINS = {
  aliexpress:'aliexpress.com', alibaba:'alibaba.com', apple:'apple.com', avito:'avito.ru', blablacar:'blablacar.com', booking:'booking.com', bolt:'bolt.eu', careem:'careem.com', cashapp:'cash.app', clubhouse:'clubhouse.com', coinbase:'coinbase.com', craigslist:'craigslist.org', deezer:'deezer.com', deliveroo:'deliveroo.com', doordash:'doordash.com', dropbox:'dropbox.com', ebay:'ebay.com', etsy:'etsy.com', eventbrite:'eventbrite.com', indeed:'indeed.com', kakaopay:'kakaopay.com', lazada:'lazada.com', lyft:'lyft.com', mercadolibre:'mercadolibre.com', netflix:'netflix.com', okcupid:'okcupid.com', pinterest:'pinterest.com', quora:'quora.com', roblox:'roblox.com', shopee:'shopee.com', slack:'slack.com', tinder:'tinder.com', uber:'uber.com', venmo:'venmo.com', walmart:'walmart.com', wise:'wise.com', yahoo:'yahoo.com', zalando:'zalando.com'
};
function addGenericServiceLogo(wrap, raw) {
  const slug = normalize(raw);
  wrap.style.cssText += 'background:transparent;';
  if (!slug) return;
  const img = document.createElement('img');
  img.alt = '';
  img.width = 22;
  img.height = 22;
  img.loading = 'lazy';
  img.style.cssText = 'width:22px;height:22px;display:block;object-fit:contain;';
  const domain = SERVICE_DOMAINS[slug] || (slug.length > 2 ? slug + '.com' : '');
  let triedFavicon = false;
  img.onerror = () => {
    if (!triedFavicon) {
      triedFavicon = true;
      img.src = 'https://cdn.simpleicons.org/' + slug;
      return;
    }
    wrap.remove();
  };
  img.src = domain ? 'https://icons.duckduckgo.com/ip3/' + domain + '.ico' : 'https://cdn.simpleicons.org/' + slug;
  wrap.appendChild(img);
}

function addServiceLogo(button) {
  if (!button || button.dataset.serviceLogoDecorated === 'true') return;
  const raw = button.textContent.trim();
  if (!raw || /no matching services|service unavailable/i.test(raw)) return;

  const key = serviceKey(raw);
  // Popular services already have native buttons, but still ensure their original logos are present.
  const entry = SERVICE_LOGOS[key];
  const wrap = document.createElement('span');
  wrap.className = 'service-logo';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.cssText = 'width:24px;height:24px;min-width:24px;display:inline-flex;align-items:center;justify-content:center;margin-right:9px;vertical-align:middle;border-radius:7px;overflow:hidden;background:#f4f7f9;';

  if (!entry) {
    addGenericServiceLogo(wrap, raw);
    button.prepend(wrap);
    button.dataset.serviceLogoDecorated = 'true';
    return;
  }

  const img = document.createElement('img');
  img.alt = '';
  img.width = 22;
  img.height = 22;
  img.loading = 'lazy';
  img.style.cssText = 'width:22px;height:22px;display:block;object-fit:contain;';
  img.src = `https://cdn.simpleicons.org/${entry[0]}/${entry[1]}`;
  img.onerror = () => {
    addGenericServiceLogo(wrap, raw);
  };
  wrap.appendChild(img);
  button.prepend(wrap);
  button.dataset.serviceLogoDecorated = 'true';
}

function decorateServices() {
  document.querySelectorAll('.panel').forEach((panel) => {
    const lists = panel.querySelectorAll('.choice-list');
    if (lists.length < 2) return;
    lists[1].querySelectorAll('.choice-chip').forEach(addServiceLogo);
  });
}

const observer = new MutationObserver(decorateServices);
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(decorateServices, 300);
