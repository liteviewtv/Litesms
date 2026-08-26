const STYLE_ID='litesms-payment-space-fix';
const HOST_ATTR='data-litesms-payment-host';
let paymentOpened=false;

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;
 style.textContent=`[${HOST_ATTR}="1"]{display:none!important}`;
 document.head.appendChild(style);
}
function isAddFundsTarget(el){if(!(el instanceof Element))return false;return (el.textContent||'').trim().toLowerCase().includes('add funds')}
function findPaymentIframe(){return [...document.querySelectorAll('iframe')].find(f=>{const s=String(f.getAttribute('src')||'').toLowerCase();return s.includes('flutterwave')||s.includes('checkout')||s.includes('pay')})||null}
function findBlankHost(){
 const root=document.getElementById('root');if(!root)return null;
 const history=document.getElementById('litesms-wallet-history');
 const add=[...root.querySelectorAll('button,a,[role="button"]')].find(isAddFundsTarget);if(!add)return null;
 const candidates=[];let node=add.parentElement;
 for(let d=0;node&&d<6;d++,node=node.parentElement){
  for(const child of [...node.children]){
   if(child===history||child.contains(history)||child.contains(add)||child===add)continue;
   if(child.matches('input,button,label,h1,h2,h3,p'))continue;
   const r=child.getBoundingClientRect();
   if(!(child.textContent||'').trim()&&r.height>120&&r.width>200)candidates.push({el:child,height:r.height});
  }
 }
 candidates.sort((a,b)=>b.height-a.height);return candidates[0]?.el||null;
}
function findHost(){
 const iframe=findPaymentIframe();
 if(iframe){let p=iframe.parentElement;for(let i=0;p&&i<5;i++,p=p.parentElement){const r=p.getBoundingClientRect();if(r.height>120)return p}}
 return findBlankHost();
}
function sync(){const host=findHost();if(!host)return;if(paymentOpened)host.removeAttribute(HOST_ATTR);else host.setAttribute(HOST_ATTR,'1')}
function init(){
 ensureStyles();sync();
 document.addEventListener('click',e=>{const t=e.target?.closest?.('button,a,[role="button"]');if(t&&isAddFundsTarget(t)){paymentOpened=true;setTimeout(sync,0);setTimeout(sync,100);setTimeout(sync,300)}},true);
 window.addEventListener('message',e=>{if(e.data?.type==='litesms-payment-result'){paymentOpened=false;setTimeout(sync,0)}});
 const root=document.getElementById('root');if(root)new MutationObserver(()=>setTimeout(sync,0)).observe(root,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
