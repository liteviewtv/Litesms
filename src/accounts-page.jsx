import React,{useEffect,useMemo,useState}from'react';
import{supabase}from'./lib/supabase';

const money=n=>'₦'+Number(n||0).toLocaleString('en-NG');
const cleanHtml=html=>{if(!html)return'';const doc=new DOMParser().parseFromString(String(html),'text/html');const allowed=new Set(['P','BR','STRONG','B','EM','I','UL','OL','LI','SPAN','A']);doc.body.querySelectorAll('*').forEach(el=>{if(!allowed.has(el.tagName)){while(el.firstChild)el.parentNode?.insertBefore(el.firstChild,el);el.remove();return}for(const a of [...el.attributes])el.removeAttribute(a.name);if(el.tagName==='A')el.removeAttribute('href')});return doc.body.innerHTML};
const call=async(fn,body)=>{const r=await supabase.functions.invoke(fn,{body});if(r.error){let msg=r.error.message||'Edge Function request failed';try{const b=await r.error.context?.json();if(b?.error)msg=String(b.error)}catch{}return{data:r.data,error:{message:msg}}}return r};

export default function AccountsPage(){
 const[products,setProducts]=useState([]),[orders,setOrders]=useState([]);
 const[category,setCategory]=useState('All'),[search,setSearch]=useState(''),[sort,setSort]=useState('relevance');
 const[selected,setSelected]=useState(null),[quantity,setQuantity]=useState(1),[loading,setLoading]=useState(true),[buying,setBuying]=useState(false),[message,setMessage]=useState(''),[tab,setTab]=useState('products');

 const load=async()=>{
  setLoading(true);
  try{
   const initData=window.Telegram?.WebApp?.initData;
   if(!initData)throw Error('Open Litesms inside Telegram.');
   const[r,o]=await Promise.all([call('bulkacc',{initData,action:'catalog'}),call('bulkacc',{initData,action:'orders'})]);
   if(r.error||r.data?.error)throw Error(r.data?.error||r.error?.message||'Unable to load accounts');
   setProducts(r.data?.products||[]);
   if(!o.error&&!o.data?.error)setOrders(o.data?.orders||[]);
  }catch(e){setMessage(e.message||'Unable to load account products.')}
  finally{setLoading(false)}
 };

 useEffect(()=>{load()},[]);
 useEffect(()=>{
  if(tab!=='orders')return;
  const t=setInterval(async()=>{
   const initData=window.Telegram?.WebApp?.initData;
   for(const o of orders.filter(x=>['pending','processing'].includes(String(x.status))))await call('bulkacc',{initData,action:'status',order_id:o.id});
   const r=await call('bulkacc',{initData,action:'orders'});
   if(!r.error&&!r.data?.error)setOrders(r.data?.orders||[]);
  },10000);
  return()=>clearInterval(t);
 },[tab,orders]);

 const cats=useMemo(()=>['All',...Array.from(new Set(products.map(p=>String(p.category||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b))],[products]);
 const visible=useMemo(()=>{
  const q=search.trim().toLowerCase();
  const list=products.filter(p=>{
   const matchesCategory=category==='All'||String(p.category||'')===category;
   if(!matchesCategory)return false;
   if(!q)return true;
   return [p.name,p.category,p.description].some(v=>String(v||'').toLowerCase().includes(q));
  });
  return [...list].sort((a,b)=>{
   if(sort==='price-low')return Number(a.price_ngn||0)-Number(b.price_ngn||0);
   if(sort==='price-high')return Number(b.price_ngn||0)-Number(a.price_ngn||0);
   if(sort==='stock')return Number(b.stock||0)-Number(a.stock||0);
   return String(a.name||'').localeCompare(String(b.name||''));
  });
 },[products,category,search,sort]);
 const total=selected?Math.ceil(Number(selected.price_ngn)*Number(quantity||1)):0;

 const buy=async()=>{
  if(!selected||!Number.isInteger(Number(quantity))||Number(quantity)<1||Number(quantity)>selected.stock)return setMessage('Select a valid quantity.');
  setBuying(true);setMessage('');
  try{
   const initData=window.Telegram?.WebApp?.initData;
   const r=await call('bulkacc',{initData,action:'order',product_id:selected.id,quantity:Number(quantity),client_reference:crypto.randomUUID()});
   if(r.error||r.data?.error)throw Error(r.data?.error||r.error?.message||'Purchase failed');
   setMessage('Order placed. Your account details will appear when delivered.');
   setSelected(null);setTab('orders');await load();
  }catch(e){setMessage(e.message||'Purchase failed.')}
  finally{setBuying(false)}
 };

 const resetFilters=()=>{setSearch('');setCategory('All');setSort('relevance')};

 return <section className="panel accounts-page">
  <div className="accounts-header">
   <div>
    <p className="eyebrow">Digital Products</p>
    <h2>Buy Accounts</h2>
    <p className="muted accounts-subtitle">Find the account you need, check the price and buy in a few taps.</p>
   </div>
   <button className="secondary accounts-back" onClick={()=>{window.history.pushState({},'', '/');window.dispatchEvent(new PopStateEvent('popstate'))}}>Back</button>
  </div>

  <div className="accounts-tabs" role="tablist">
   <button type="button" className={tab==='products'?'primary':'secondary'} onClick={()=>setTab('products')}>Browse Accounts</button>
   <button type="button" className={tab==='orders'?'primary':'secondary'} onClick={()=>setTab('orders')}>My Purchases{orders.length?' · '+orders.length:''}</button>
  </div>

  {message&&<div className="notice accounts-notice">{message}</div>}

  {tab==='products'&&(loading?<div className="empty accounts-loading">Loading accounts…</div>:<>
   <div className="accounts-search">
    <span aria-hidden="true">⌕</span>
    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search accounts, categories..." aria-label="Search accounts"/>
    {search&&<button type="button" onClick={()=>setSearch('')} aria-label="Clear search">×</button>}
   </div>

   <div className="accounts-toolbar">
    <div className="accounts-result-count"><strong>{visible.length}</strong> {visible.length===1?'account':'accounts'} available</div>
    <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort accounts">
     <option value="relevance">Sort: Relevance</option>
     <option value="price-low">Price: Low to high</option>
     <option value="price-high">Price: High to low</option>
     <option value="stock">Stock: Highest</option>
    </select>
   </div>

   <div className="accounts-categories" aria-label="Account categories">
    {cats.map(c=><button key={c} type="button" className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}
   </div>

   <div className="accounts-list">
    {visible.map(p=>{
     const inStock=Number(p.stock)>0;
     return <article key={p.id} className="account-card">
      <div className="account-card-top">
       <div className="account-product-icon" aria-hidden="true">{String(p.name||'A').trim().charAt(0).toUpperCase()}</div>
       <div className="account-product-heading">
        <div className="account-category">{p.category||'Account'}</div>
        <h3>{p.name}</h3>
        <div className={inStock?'account-stock-top':'account-stock-top out-stock'}>{Number(p.stock||0).toLocaleString('en-NG')} available</div>
       </div>
       <div className="account-price">{money(p.price_ngn)}<small>each</small></div>
      </div>
      <div className="account-description" dangerouslySetInnerHTML={{__html:cleanHtml(p.description)}}/>
      <div className="account-meta">
       <span className={inStock?'in-stock':'out-stock'}>{inStock?'In stock':'Out of stock'}</span>
       <span>Min {p.min||1}</span>
       <span>{Number(p.stock||0).toLocaleString('en-NG')} available</span>
      </div>
      <button className="primary account-buy" disabled={!inStock} onClick={()=>{setSelected(p);setQuantity(1)}}>{inStock?'Buy now':'Out of stock'}</button>
     </article>
    })}
    {!visible.length&&<div className="accounts-empty">
     <div className="accounts-empty-icon">⌕</div>
     <strong>No accounts found</strong>
     <p>Try another search or remove a category filter.</p>
     <button type="button" className="secondary" onClick={resetFilters}>Clear filters</button>
    </div>}
   </div>
  </>)}

  {tab==='orders'&&<div className="accounts-orders">
   {orders.map(o=><article key={o.id} className="account-order-card">
    <div className="account-order-head"><div><span className="account-category">Account purchase</span><strong>{money(o.retail_price_ngn)}</strong></div><span className="account-status">{String(o.status||'pending')}</span></div>
    <div className="account-meta"><span>Qty {o.quantity}</span><span>{new Date(o.created_at).toLocaleDateString()}</span></div>
    {Array.isArray(o.credentials)&&o.credentials.length>0&&<div className="account-credentials">{o.credentials.map((c,i)=><div key={i} className="account-credential"><div><small>Account {i+1}</small><strong>{c}</strong></div><button className="copy-code" onClick={()=>navigator.clipboard?.writeText(c)}>Copy</button></div>)}</div>}
   </article>)}
   {!orders.length&&<div className="accounts-empty"><div className="accounts-empty-icon">✓</div><strong>No purchases yet</strong><p>Your completed account purchases will appear here.</p><button type="button" className="primary" onClick={()=>setTab('products')}>Browse accounts</button></div>}
  </div>}

  {selected&&<div className="accounts-modal" role="dialog" aria-modal="true" aria-labelledby="account-purchase-title">
   <div className="accounts-modal-card">
    <div className="accounts-modal-head"><div><span className="account-category">{selected.category||'Account'}</span><h2 id="account-purchase-title">{selected.name}</h2></div><button type="button" className="accounts-close" onClick={()=>setSelected(null)} aria-label="Close">×</button></div>
    <div className="account-description" dangerouslySetInnerHTML={{__html:cleanHtml(selected.description)}}/>
    <div className="account-purchase-summary"><span>Price</span><strong>{money(selected.price_ngn)} each</strong></div>
    <label>Quantity<input type="number" min="1" max={selected.stock} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
    <div className="balance accounts-total">{money(total)}<small>Total</small></div>
    <button className="primary" disabled={buying} onClick={buy}>{buying?'Processing…':'Confirm purchase'}</button>
    <button className="secondary accounts-cancel" onClick={()=>setSelected(null)}>Cancel</button>
   </div>
  </div>}
 </section>
}
