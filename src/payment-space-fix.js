const STYLE_ID='litesms-payment-space-fix';
const HOST_ATTR='data-litesms-payment-host';
let walletActive=false;
let paymentOpened=false;

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`[${HOST_ATTR}="1"]{display:none!important}`;
 document.head.appendChild(style);
}

function buttonText(el){return String(el?.textContent||'').trim().toLowerCase()}
function isAddFundsTarget(el){return el instanceof Element&&buttonText(el).includes('add funds')}
function isWalletTarget(el){return el instanceof Element&&buttonText(el)==='wallet'}
function isOtherNavTarget(el){
 const text=buttonText(el);
 return ['home','orders','profile','buy number'].includes(text);
}

function findPaymentIframe(){
 return [...document.querySelectorAll('iframe')].find(f=>{
  const s=String(f.getAttribute('src')||'').toLowerCase();
  return s.includes('flutterwave')||s.includes('checkout')||s.includes('pay');
 })||null;
}

function tall(el,min=220){
 if(!el)return false;
 const r=el.getBoundingClientRect();
 return r.height>=min&&r.width>200;
}

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
 for(let i=0;p&&i<6;i++,p=p.parentElement){
  if(tall(p,120))return p;
 }
 return null;
}

function findBlankHost(){
 if(!walletActive)return null;
 const root=document.getElementById('root');
 if(!root)return null;
 const history=document.getElementById('litesms-wallet-history');
 const add=[...root.querySelectorAll('button,a,[role="button"]')].find(isAddFundsTarget);
 if(!add)return null;
 const candidates=[];
 let node=add.parentElement;
 for(let d=0;node&&d<6;d++,node=node.parentElement){
  for(const child of [...node.children]){
   if(child===history||child.contains(history)||child.contains(add)||child===add)continue;
   if(child===root||child.id==='root'||child.matches('main,.app,button,a,label,input,h1,h2,h3,p'))continue;
   if(!(child.textContent||'').trim()&&tall(child,220))candidates.push({el:child,height:child.getBoundingClientRect().height});
  }
 }
 candidates.sort((a,b)=>b.height-a.height);
 return candidates[0]?.el||null;
}

function findHost(){
 if(!walletActive)return null;
 return findHistoryHost()||findIframeHost()||findBlankHost();
}

function sync(){
 const host=findHost();
 if(!host)return;
 if(paymentOpened)host.removeAttribute(HOST_ATTR);
 else host.setAttribute(HOST_ATTR,'1');
}

function delayedSync(){
 [0,100,300,800].forEach(ms=>setTimeout(sync,ms));
}

function init(){
 ensureStyles();
 document.addEventListener('click',event=>{
  const target=event.target?.closest?.('button,a,[role="button"]');
  if(!target)return;
  if(isAddFundsTarget(target)){
   walletActive=true;
   paymentOpened=true;
   delayedSync();
   return;
  }
  if(isWalletTarget(target)){
   walletActive=true;
   paymentOpened=false;
   delayedSync();
   return;
  }
  if(isOtherNavTarget(target)){
   walletActive=false;
   paymentOpened=false;
   document.querySelectorAll(`[${HOST_ATTR}="1"]`).forEach(el=>el.removeAttribute(HOST_ATTR));
  }
 },true);
 window.addEventListener('message',event=>{
  if(event.data?.type==='litesms-payment-result'){
   paymentOpened=false;
   delayedSync();
  }
 });
 const root=document.getElementById('root');
 if(root)new MutationObserver(()=>{if(walletActive)delayedSync()}).observe(root,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
