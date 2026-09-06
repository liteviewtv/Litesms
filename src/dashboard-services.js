const ID='litesms-dashboard-services';
function go(path){if(location.pathname!==path)history.pushState({page:path},'',path);window.dispatchEvent(new PopStateEvent('popstate'));}
function add(){if(location.pathname!=='/'&&location.pathname!=='')return;if(document.getElementById(ID))return;const root=document.getElementById('root');if(!root)return;
 const headings=[...root.querySelectorAll('h1,h2,h3,h4,strong')];const dashboardHeading=headings.find(x=>/dashboard/i.test(x.textContent||''));if(!dashboardHeading)return;
 let host=dashboardHeading.parentElement?.parentElement||dashboardHeading.parentElement;if(!host)return;
 const box=document.createElement('div');box.id=ID;box.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0 16px';
 const make=(label,path,icon)=>{const b=document.createElement('button');b.type='button';b.className='primary';b.style.cssText='width:100%;padding:14px 12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:7px';b.innerHTML=`<span>${icon}</span><span>${label}</span>`;b.onclick=()=>go(path);return b};
 box.append(make('SMM Services','/smm','📣'),make('Accounts','/accounts','👤'));
 host.insertBefore(box,host.firstChild);
}
const observer=new MutationObserver(add);observer.observe(document.documentElement,{childList:true,subtree:true});add();setTimeout(add,500);setTimeout(add,1500);
