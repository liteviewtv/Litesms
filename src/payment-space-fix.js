const STYLE_ID='litesms-payment-space-fix';
const HIDDEN_CLASS='litesms-payment-collapsed';

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

function collapsePayment(){
 const iframe=findPaymentIframe();
 if(iframe)iframe.classList.add(HIDDEN_CLASS);
}

function showPayment(){
 const iframe=findPaymentIframe();
 if(iframe)iframe.classList.remove(HIDDEN_CLASS);
}

function init(){
 ensureStyles();
 collapsePayment();
 document.addEventListener('click',event=>{
  const target=event.target?.closest?.('button,a,[role="button"]');
  if(target&&isAddFundsTarget(target)){
   setTimeout(showPayment,0);
   setTimeout(showPayment,100);
   setTimeout(showPayment,300);
  }
 },true);
 window.addEventListener('message',event=>{
  if(event.data?.type==='litesms-payment-result')setTimeout(collapsePayment,0);
 });
 const observer=new MutationObserver(()=>{
  const iframe=findPaymentIframe();
  if(iframe&&!iframe.dataset.litesmsPaymentOpened)iframe.classList.add(HIDDEN_CLASS);
 });
 const root=document.getElementById('root');
 if(root)observer.observe(root,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
