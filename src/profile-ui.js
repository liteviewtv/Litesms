import { supabase } from './lib/supabase';

const STYLE_ID='litesms-profile-ui-style';
const PANEL_ID='litesms-profile-details';

function addStyles(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`#${PANEL_ID}{margin-top:18px;padding:18px;border:1px solid #dbe7f0;border-radius:18px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.06)}#${PANEL_ID} h3{margin:0 0 14px;font-size:16px;color:#12324a}#${PANEL_ID} .profile-row{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid #edf2f7}#${PANEL_ID} .profile-row:last-of-type{border-bottom:0}#${PANEL_ID} .profile-label{color:#61758a;font-size:13px}#${PANEL_ID} .profile-value{color:#12324a;font-size:13px;font-weight:700;text-align:right;overflow-wrap:anywhere}#${PANEL_ID} button{width:100%;margin-top:12px}`;document.head.appendChild(s);
}

async function loadProfile(panel){
 if(document.getElementById(PANEL_ID))return;
 addStyles();
 const box=document.createElement('div');box.id=PANEL_ID;box.innerHTML='<h3>Account Information</h3><div class="profile-row"><span class="profile-label">Status</span><span class="profile-value">Loading…</span></div>';panel.appendChild(box);
 try{
  const t=window.Telegram?.WebApp;
  if(!t?.initData)throw new Error('Open Litesms inside Telegram.');
  const {data,error}=await supabase.functions.invoke('litesms-user-data',{body:{initData:t.initData}});
  if(error||data?.error)throw new Error(data?.error||error?.message||'Unable to load account information');
  const p=data?.profile||{};
  const name=[p.first_name,p.last_name].filter(Boolean).join(' ')||'—';
  const username=p.username?`@${String(p.username).replace(/^@/,'')}`:'—';
  const telegramId=p.telegram_user_id??p.telegram_id??'—';
  const role=p.role==='admin'?'Administrator':'Customer';
  const rows=[['Full name',name],['Username',username],['Telegram ID',String(telegramId)],['Account type',role]];
  box.innerHTML='<h3>Account Information</h3>'+rows.map(([a,b])=>`<div class="profile-row"><span class="profile-label">${a}</span><span class="profile-value">${b}</span></div>`).join('');
  const refresh=document.createElement('button');refresh.type='button';refresh.className='secondary';refresh.textContent='Refresh Account Information';refresh.onclick=()=>{box.remove();loadProfile(panel)};box.appendChild(refresh);
 }catch(e){box.innerHTML=`<h3>Account Information</h3><div class="muted">${e?.message||'Unable to load account information.'}</div>`}
}

function scan(){
 const headings=[...document.querySelectorAll('h2')];
 const profileHeading=headings.find(h=>h.textContent?.trim()==='Profile');
 if(!profileHeading)return;
 const panel=profileHeading.closest('.panel');
 if(panel)loadProfile(panel);
}

let lastTab='';
setInterval(()=>{
 const text=[...document.querySelectorAll('h2')].find(h=>h.textContent?.trim()==='Profile')?'profile':'';
 if(text!==lastTab){lastTab=text;if(text)scan();}
},300);

scan();
