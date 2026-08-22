import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import './styles.css';

function App() {
  const [profile, setProfile] = useState(null), [wallet, setWallet] = useState(null), [orders, setOrders] = useState([]);
  const [authStatus, setAuthStatus] = useState('Connecting…'), [dbStatus, setDbStatus] = useState('checking'), [tab, setTab] = useState('home');
  const [country, setCountry] = useState('US'), [service, setService] = useState('Discord'), [buying, setBuying] = useState(false), [message, setMessage] = useState('');

  const loadData = async (profileId) => {
    const { data: w } = await supabase.from('wallets').select('*').eq('profile_id', profileId).maybeSingle(); setWallet(w);
    const { data: o } = await supabase.from('orders').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(20); setOrders(o || []);
  };

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    if (!telegram) return setAuthStatus('Open inside Telegram');
    telegram.ready(); telegram.expand();
    if (!telegram.initData) return setAuthStatus('Open inside Telegram');
    if (!supabase) return setAuthStatus('Supabase configuration missing');
    (async () => { try {
      const { data, error } = await supabase.functions.invoke('telegram-auth', { body: { initData: telegram.initData } });
      if (error || data?.error) return setAuthStatus('Authentication unavailable');
      setProfile(data.profile); setAuthStatus('Connected'); await loadData(data.profile.id);
    } catch { setAuthStatus('Authentication unavailable'); } })();
  }, []);

  useEffect(() => { if (!supabase) return setDbStatus('offline'); supabase.from('providers').select('id').limit(1).then(({ error }) => setDbStatus(error ? 'offline' : 'connected')).catch(() => setDbStatus('offline')); }, []);
  const balance = Number(wallet?.balance || 0).toFixed(2);

  const buyNumber = async () => {
    setBuying(true); setMessage('');
    try {
      const telegram = window.Telegram?.WebApp;
      const { data, error } = await supabase.functions.invoke('smspool-order', { body: { initData: telegram?.initData, country, service } });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Purchase failed');
      setMessage(`Number purchased: +${data.order.phone_number}`); await loadData(profile.id); setTab('orders');
    } catch (e) { setMessage(e.message); } finally { setBuying(false); }
  };

  return <main className="app">
    <header className="header"><div className="brand"><span className="logo">L</span><span>Litesms</span></div><div className="telegram">{authStatus}</div></header>
    {tab === 'home' && <><section className="hero"><p className="eyebrow">SMS & Phone Numbers</p><h1>{profile?.first_name ? `Welcome, ${profile.first_name}` : 'Everything you need, in one place.'}</h1><p className="muted">Buy virtual numbers, receive SMS and manage your balance.</p></section><section className="cards"><article><span>💳</span><p>Wallet Balance</p><strong>${balance}</strong></article><article><span>📱</span><p>Active Orders</p><strong>{orders.filter(o => !['completed','cancelled'].includes(o.status)).length}</strong></article></section><div className={`db-status ${dbStatus}`}><span className="status-dot" /> Supabase {dbStatus}</div><button className="primary" onClick={() => setTab('buy')}>Buy a Number</button></>}
    {tab === 'buy' && <section className="panel"><h2>Buy a Number</h2><p className="muted">Choose a country and service.</p><label>Country<select value={country} onChange={e => setCountry(e.target.value)}><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="NG">Nigeria</option><option value="DE">Germany</option><option value="FR">France</option><option value="ES">Spain</option><option value="AU">Australia</option></select></label><label>Service<select value={service} onChange={e => setService(e.target.value)}><option>Discord</option><option>Telegram</option><option>Google</option><option>Instagram</option><option>WhatsApp</option><option>TikTok</option><option>Twitter</option><option>Other</option></select></label>{message && <div className="notice">{message}</div>}<button className="primary" disabled={buying} onClick={buyNumber}>{buying ? 'Purchasing…' : 'Purchase Number'}</button></section>}
    {tab === 'orders' && <section className="panel"><h2>Orders</h2><p className="muted">Your SMS number orders.</p>{orders.length ? orders.map(o => <article className="order" key={o.id}><strong>{o.service || 'SMS Service'}</strong><span>{o.phone_number || 'Pending number'}</span><small>{o.status} · ${Number(o.price || 0).toFixed(2)}</small></article>) : <div className="empty">No orders yet.</div>}<button className="primary" onClick={() => setTab('buy')}>Buy a Number</button></section>}
    {tab === 'wallet' && <section className="panel"><h2>Wallet</h2><div className="balance">${balance}</div><p className="muted">Available balance</p><button className="primary" onClick={() => setMessage('Funding options coming next')}>Add Funds</button>{message && <div className="notice">{message}</div>}</section>}
    {tab === 'profile' && <section className="panel"><h2>Profile</h2><div className="profile"><strong>{profile?.first_name || 'Telegram User'} {profile?.last_name || ''}</strong><span>@{profile?.username || 'user'}</span><small>Telegram ID: {profile?.telegram_user_id || '—'}</small></div></section>}
    <nav className="bottom"><a className={tab==='home'?'active':''} onClick={() => setTab('home')}>Home</a><a className={tab==='orders'?'active':''} onClick={() => setTab('orders')}>Orders</a><a className={tab==='wallet'?'active':''} onClick={() => setTab('wallet')}>Wallet</a><a className={tab==='profile'?'active':''} onClick={() => setTab('profile')}>Profile</a></nav>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
