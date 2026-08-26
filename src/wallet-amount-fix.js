const FIX_ID='litesms-wallet-amount-fix';
let lastInput=null;
let userEdited=false;

function isWalletAmountInput(input){
  if(!(input instanceof HTMLInputElement)) return false;
  const label=input.closest('div')?.querySelector('label')?.textContent?.trim().toLowerCase();
  if(label==='deposit amount') return true;
  return input.getAttribute('aria-label')?.toLowerCase()==='deposit amount';
}

function clearInitialAmount(input){
  if(!isWalletAmountInput(input)) return;
  if(lastInput!==input){
    lastInput=input;
    userEdited=false;
    input.placeholder='Min. ₦100';
  }
  if(!userEdited && input.value){
    const nativeSetter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    nativeSetter?.call(input,'');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
}

function scan(){
  document.querySelectorAll('input').forEach(clearInitialAmount);
}

function init(){
  if(document.getElementById(FIX_ID)) return;
  const marker=document.createElement('meta');
  marker.id=FIX_ID;
  document.head.appendChild(marker);
  document.addEventListener('input',event=>{
    if(isWalletAmountInput(event.target)) userEdited=true;
  },true);
  const observer=new MutationObserver(scan);
  observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
  scan();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
