const FLAG_CODES = {
  usa:'US', uk:'GB', england:'GB', canada:'CA', australia:'AU', germany:'DE', france:'FR', nigeria:'NG', india:'IN', italy:'IT', spain:'ES', afghanistan:'AF', albania:'AL', algeria:'DZ', angola:'AO', 'antigua and barbuda':'AG', argentina:'AR', armenia:'AM', aruba:'AW', austria:'AT', azerbaijan:'AZ', bahamas:'BS', bahrain:'BH', bangladesh:'BD', barbados:'BB', belgium:'BE', belize:'BZ', benin:'BJ', bhutan:'BT', bolivia:'BO', 'bosnia and herzegovina':'BA', botswana:'BW', brazil:'BR', bulgaria:'BG', 'burkina faso':'BF', burundi:'BI', cambodia:'KH', cameroon:'CM', 'cape verde':'CV', chad:'TD', chile:'CL', colombia:'CO', comoros:'KM', congo:'CG', 'costa rica':'CR', croatia:'HR', cyprus:'CY', czechia:'CZ', denmark:'DK', djibouti:'DJ', 'dominican republic':'DO', 'east timor':'TL', ecuador:'EC', egypt:'EG', 'equatorial guinea':'GQ', estonia:'EE', ethiopia:'ET', finland:'FI', 'french guiana':'GF', gabon:'GA', gambia:'GM', georgia:'GE', ghana:'GH', greece:'GR', guadeloupe:'GP', guatemala:'GT', guinea:'GN', 'guinea-bissau':'GW', guyana:'GY', haiti:'HT', honduras:'HN', 'hong kong':'HK', hungary:'HU', indonesia:'ID', ireland:'IE', israel:'IL', 'ivory coast':'CI', jamaica:'JM', jordan:'JO', kazakhstan:'KZ', kenya:'KE', kuwait:'KW', kyrgyzstan:'KG', laos:'LA', latvia:'LV', lesotho:'LS', liberia:'LR', lithuania:'LT', luxembourg:'LU', macau:'MO', madagascar:'MG', malawi:'MW', malaysia:'MY', maldives:'MV', mauritania:'MR', mauritius:'MU', mexico:'MX', moldova:'MD', mongolia:'MN', montenegro:'ME', morocco:'MA', mozambique:'MZ', namibia:'NA', nepal:'NP', netherlands:'NL', 'new caledonia':'NC', nicaragua:'NI', 'north macedonia':'MK', norway:'NO', oman:'OM', pakistan:'PK', panama:'PA', 'papua new guinea':'PG', paraguay:'PY', peru:'PE', philippines:'PH', poland:'PL', portugal:'PT', 'puerto rico':'PR', 'republic of seychelles':'SC', reunion:'RE', romania:'RO', rwanda:'RW', 'saint kitts and nevis':'KN', 'saint lucia':'LC', 'saint vincent and the grenadines':'VC', elsalvador:'SV', 'el salvador':'SV', samoa:'WS', 'saudi arabia':'SA', senegal:'SN', serbia:'RS', 'sierra leone':'SL', slovakia:'SK', slovenia:'SI', 'solomon islands':'SB', 'south africa':'ZA', 'sri lanka':'LK', suriname:'SR', swaziland:'SZ', sweden:'SE', taiwan:'TW', tajikistan:'TJ', tanzania:'TZ', thailand:'TH', togo:'TG', 'trinidad and tobago':'TT', tunisia:'TN', turkmenistan:'TM', uganda:'UG', uruguay:'UY', uzbekistan:'UZ', venezuela:'VE', vietnam:'VN', zambia:'ZM'
};

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
const emoji = (code) => [...String(code || '').toUpperCase()].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');

function countryFlag(name) {
  const key = normalize(name);
  return FLAG_CODES[key] ? emoji(FLAG_CODES[key]) : '';
}

function applyCountryFlags() {
  document.querySelectorAll('label').forEach((label) => {
    const heading = label.firstChild;
    if (!heading || String(heading.textContent || '').trim().toLowerCase() !== 'country') return;
    label.querySelectorAll('.choice-list .choice-chip').forEach((button) => {
      if (button.dataset.countryFlagApplied === '1') return;
      const text = String(button.textContent || '').trim();
      const flag = countryFlag(text);
      if (!flag) return;
      button.dataset.countryFlagApplied = '1';
      const flagNode = document.createElement('span');
      flagNode.className = 'country-flag';
      flagNode.textContent = flag;
      flagNode.setAttribute('aria-hidden', 'true');
      flagNode.style.marginRight = '8px';
      flagNode.style.fontSize = '18px';
      button.prepend(flagNode);
    });
  });
}

const observer = new MutationObserver(applyCountryFlags);
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyCountryFlags, { once: true });
else applyCountryFlags();
