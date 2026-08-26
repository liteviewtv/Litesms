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
function isWalletTarget(el){if(!(el instanceof Element))return false;return (el.textContent||'').trim().toLowerCase()==='wallet'}
function findPaymentIframe(){return [...document.querySelectorAll('iframe')].find(f=>{const s=String(f.getAttribute('src')||'').toLowerCase();return s.includes('flutterwave')||s.includes('checkout')||s.includes('pay')})||null}
function tall(el,min=220){if(!el)return false;const r=el.getBoundingClientRect();return r.height>=min&&r.width>200}
function findHistoryHost(){
 const history=document.getElementById('litesms-wallet-history');
 if(!history)return null;
 let prev=history.previousElementSibling;
 if(tall(prev))return prev;
 let p=history.parentElement;
 for(let d=0;p&&d<5;d++,p=p.parentElement){
  const children=[...p.children];
  const idx=children.indexOf(history);
  if(idx>0){
   const candidate=children[idx-1];
   if(tall(candidate))return candidate;
  }
 }
 return null;
}
function findIframeHost(){
 const iframe=findPaymentIframe();
 if(!iframe)return null;
 let p=iframe.parentElement;
 for(let i=0;p&&i<6;i++,p=p.parentElement)if(tall(p,120))return p;
 return null;
}
function findBlankHost(){
 const root=document.getElementById('root');if(!root)return null;
 const history=document.getElementById('litesms-wallet-history');
 const add=[...root.querySelectorAll('button,a,[role="button"]')].find(isAddFundsTarget);if(!add)return null;
 const candidates=[];let node=add.parentElement;
 for(let d=0;node&&d<6;d++,node=node.parentElement){
  for(const child of [...node.children]){
   if(child===history||child.contains(history)||child.contains(add)||child===add)continue;
   if(child.matches('input,button,label,h1,h2,h3,p'))continue;
   if(tall(child,220)&&!(child.textContent||'').trim())candidates.push({el:child,height:child.getBoundingClientRect().height});
  }
 }
 candidates.sort((a,b)=>b.height-a.height);return candidates[0]?.el||null;
}
function findHost(){return findHistoryHost()||findIframeHost()||findBlankHost()}
function sync(){const host=findHost();if(!host)return;if(paymentOpened)host.removeAttribute(HOST_ATTR);else host.setAttribute(HOST_ATTR,'1')}
function init(){
 ensureStyles();
 sync();
 document.addEventListener('click',e=>{
  const t=e.target?.closest?.('button,a,[role="button"]');if(!t)return;
  if(isAddFundsTarget(t)){paymentOpened=true;setTimeout(sync,0);setTimeout(sync,100);setTimeout(sync,300);setTimeout(sync,800);return}
  if(isWalletTarget(t)){paymentOpened=false;setTimeout(sync,0);setTimeout(sync,200);return}
  const text=(t.textContent||'').trim().toLowerCase();
  if(['home','orders','profile'].includes(text)){paymentOpened=false;setTimeout(sync,0)}
 },true);
 window.addEventListener('message',e=>{if(e.data?.type==='litesms-payment-result'){paymentOpened=false;setTimeout(sync,0);setTimeout(sync,200)}});
 const root=document.getElementById('root');if(root)new MutationObserver(()=>setTimeout(sync,0)).observe(root,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
