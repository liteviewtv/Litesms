const STYLE_ID='litesms-payment-space-fix';
const HIDDEN_CLASS='litesms-payment-collapsed';
let paymentOpened=false;

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`.${HIDDEN_CLASS}{display:none!important}`;
 document.head.appendChild(style);
}

function isAddFundsTarget(el){
 if(!(el instanceof Element))return false;
 const text=(el.textContent||'').trim().toLowerCase();
 return text==='add funds'||text.includes('add funds');
}

function findPaymentIframe(){
 return [...document.querySelectorAll('iframe')].find(f=>{
  const src=String(f.getAttribute('src')||'').toLowerCase();
  return src.includes('flutterwave')||src.includes('checkout');
 })||null;
}

function syncPaymentVisibility(){
 const iframe=findPaymentIframe();
 if(!iframe)return;
 iframe.classList.toggle(HIDDEN_CLASS,!paymentOpened);
}

function init(){
 ensureStyles();
 syncPaymentVisibility();
 document.addEventListener('click',event=>{
  const target=event.target?.closest?.('button,a,[role="button"]');
  if(target&&isAddFundsTarget(target)){
   paymentOpened=true;
   setTimeout(syncPaymentVisibility,0);
   setTimeout(syncPaymentVisibility,100);
   setTimeout(syncPaymentVisibility,300);
  }
 },true);
 window.addEventListener('message',event=>{
  if(event.data?.type==='litesms-payment-result'){
   paymentOpened=false;
   setTimeout(syncPaymentVisibility,0);
  }
 });
 const observer=new MutationObserver(syncPaymentVisibility);
 const root=document.getElementById('root');
 if(root)observer.observe(root,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
