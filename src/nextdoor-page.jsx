import React,{useCallback,useEffect,useState}from'react';
import{supabase}from'./lib/supabase';

const money=n=>'₦'+Number(n||0).toLocaleString('en-NG');
const call=async(body)=>{const r=await supabase.functions.invoke('nextdoor-store',{body:{...body,initData:window.Telegram?.WebApp?.initData}});if(r.error){let message=r.error.message||'Request failed';try{const d=await r.error.context?.json();if(d?.error)message=d.error}catch{}throw Error(r.data?.error||message)}if(r.data?.error)throw Error(r.data.error);return r.data||{}};
export const preloadNextdoorData=()=>call({action:'catalog'});
export default function NextdoorPage(){
 const[catalog,setCatalog]=useState(null),[orders,setOrders]=useState([]),[quantity,setQuantity]=useState(1),[tab,setTab]=useState('buy'),[loading,setLoading]=useState(true),[buying,setBuying]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const [c,o]=await Promise.all([call({action:'catalog'}),call({action:'orders'})]);setCatalog(c);setOrders(o.orders||[])}catch(e){setError(e.message||'Unable to load Nextdoor accounts.')}finally{setLoading(false)}},[]);
 useEffect(()=>{load()},[load]);
 const buy=async()=>{if(!Number.isInteger(Number(quantity))||quantity<1||quantity>100)return setMessage('Choose a quantity from 1 to 100.');if(quantity>Number(catalog?.stock||0))return setMessage('There is not enough stock for that quantity.');setBuying(true);setMessage('');setError('');try{const r=await call({action:'purchase',quantity:Number(quantity)});const order=r.order||r;setOrders(prev=>[{id:order.order_id,quantity:order.quantity,unit_price_ngn:order.unit_price_ngn,total_ngn:order.total_ngn,created_at:new Date().toISOString(),credentials:order.accounts||[]},...prev]);setMessage('Purchase successful. Your Nextdoor credentials are available in My Purchases.');setTab('orders');call({action:'catalog'}).then(setCatalog).catch(()=>{})}catch(e){setError(e.message||'Purchase failed.')}finally{setBuying(false)}};
 return <section className="panel accounts-page">
  <div className="accounts-header"><div><p className="eyebrow">Digital Products</p><h2>Buy Nextdoor Account</h2><p className="muted accounts-subtitle">Purchase verified account credentials using your Litesms wallet.</p></div><button className="secondary accounts-back" onClick={()=>{window.history.pushState({},'', '/');window.dispatchEvent(new PopStateEvent('popstate'))}}>Back</button></div>
  <div className="accounts-tabs"><button className={tab==='buy'?'primary':'secondary'} onClick={()=>setTab('buy')}>Buy Account</button><button className={tab==='orders'?'primary':'secondary'} onClick={()=>setTab('orders')}>My Purchases{orders.length?' · '+orders.length:''}</button></div>
  {message&&<div className="notice accounts-notice">{message}</div>}{error&&<div className="notice accounts-notice">{error}</div>}
  {loading?<div className="empty accounts-loading">Loading Nextdoor stock…</div>:tab==='buy'?<article className="account-card">
   <div className="account-card-top"><div className="account-product-icon" aria-hidden="true">N</div><div className="account-product-heading"><div className="account-category">Nextdoor</div><h3>Nextdoor Account</h3><div className={Number(catalog?.stock)>0?'account-stock-top':'account-stock-top out-stock'}>{Number(catalog?.stock||0).toLocaleString('en-NG')} available</div></div><div className="account-price">{money(catalog?.price_ngn)}<small>each</small></div></div>
   <p className="muted">Your email and password will appear in your purchase history after payment.</p>
   <label>Quantity<input type="number" min="1" max={Math.min(100,Number(catalog?.stock||0))} value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)||1))}/></label>
   <div className="account-purchase-summary"><span>Total</span><strong>{money(Number(catalog?.price_ngn||0)*Number(quantity||1))}</strong></div>
   <button className="primary account-buy" disabled={buying||Number(catalog?.stock||0)<1} onClick={buy}>{buying?'Processing…':'Purchase with wallet'}</button>
  </article>:<div className="accounts-orders">
   {orders.map(o=><article key={o.id} className="account-order-card"><div className="account-order-head"><div><span className="account-category">Nextdoor purchase</span><strong>{money(o.total_ngn)}</strong></div><span className="account-status">Completed</span></div><div className="account-meta"><span>Quantity {o.quantity}</span><span>{new Date(o.created_at).toLocaleString()}</span></div>{(o.credentials||[]).map((c,i)=><div key={i} className="account-credential"><div><small>Account {i+1}</small><strong>Email: {c.email}<br/>Password: {c.password}</strong></div><button className="copy-code" onClick={()=>navigator.clipboard?.writeText(c.email+'\n'+c.password)}>Copy</button></div>)}</article>)}
   {!orders.length&&<div className="accounts-empty"><strong>No purchases yet</strong><p>Your Nextdoor purchases will appear here.</p><button className="primary" onClick={()=>setTab('buy')}>Buy account</button></div>}
  </div>}
 </section>
}