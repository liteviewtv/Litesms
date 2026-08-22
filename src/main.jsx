import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import './styles.css';

function App() {
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [authStatus, setAuthStatus] = useState('Connecting…');
  const [dbStatus, setDbStatus] = useState('checking');
  const [tab, setTab] = useState('home');

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    if (!telegram) return setAuthStatus('Open inside Telegram');
    telegram.ready(); telegram.expand();
    if (!telegram.initData) return setAuthStatus('Open inside Telegram');
    if (!supabase) return setAuthStatus('Supabase configuration missing');
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('telegram-auth', { body: { initData: telegram.initData } });
        if (error || data?.error) return setAuthStatus('Authentication unavailable');
        setProfile(data.profile); setAuthStatus('Connected');
        const { data: w } = await supabase.from('wallets').select('*').eq('profile_id', data.profile.id).maybeSingle();
        setWallet(w);
        const { data: o } = await supabase.from('orders').select('*').eq('profile_id', data.profile.id).order('created_at', { ascending: false }).limit(10);
        setOrders(o || []);
      } catch { setAuthStatus('Authentication unavailable'); }
    })();
  }, []);

  useEffect(() => {
    if (!supabase) return setDbStatus('offline');
    supabase.from('providers').select('id').limit(1).then(({ error }) => setDbStatus(error ? 'offline' : 'connected')).catch(() => setDbStatus('offline'));
  }, []);

  const balance = Number(wallet?.balance || 0).toFixed(2);
  return <main className="app">
    <header className="header"><div className="brand"><span className="logo">L</span><span>Litesms</span></div><div className="telegram">{authStatus}</div></header>
    {tab === 'home' && <>
      <section className="hero"><p className="eyebrow">SMS & Phone Numbers</p><h1>{profile?.first_name ? `Welcome, ${profile.first_name}` : 'Everything you need, in one place.'}</h1><p className="muted">Buy virtual numbers, receive SMS and manage your balance.</p></section>
      <section className="cards"><article><span>💳</span><p>Wallet Balance</p><strong>${balance}</strong></article><article><span>📱</span><p>Active Orders</p><strong>{orders.filter(o => !['completed','cancelled'].includes(o.status)).length}</strong></article></section>
      <div className={`db-status ${dbStatus}`}><span className="status-dot" /> Supabase {dbStatus}</div>
      <button className="primary" onClick={() => setTab('orders')}>Buy a Number</button>
    </>}
    {tab === 'orders' && <section className="panel"><h2>Orders</h2><p className="muted">Your latest SMS number orders will appear here.</p>{orders.length ? orders.map(o => <article className="order" key={o.id}><strong>{o.service || 'SMS Service'}</strong><span>{o.phone_number || 'Pending number'}</span><small>{o.status} · ${Number(o.price || 0).toFixed(2)}</small></article>) : <div className="empty">No orders yet.</div>}<button className="primary" onClick={() => alert('Number marketplace coming next')}>Buy a Number</button></section>}
    {tab === 'wallet' && <section className="panel"><h2>Wallet</h2><div className="balance">${balance}</div><p className="muted">Available balance</p><button className="primary" onClick={() => alert('Funding options coming next')}>Add Funds</button></section>}
    {tab === 'profile' && <section className="panel"><h2>Profile</h2><div className="profile"><strong>{profile?.first_name || 'Telegram User'} {profile?.last_name || ''}</strong><span>@{profile?.username || 'user'}</span><small>Telegram ID: {profile?.telegram_user_id || '—'}</small></div></section>}
    <nav className="bottom"><a className={tab==='home'?'active':''} onClick={() => setTab('home')}>Home</a><a className={tab==='orders'?'active':''} onClick={() => setTab('orders')}>Orders</a><a className={tab==='wallet'?'active':''} onClick={() => setTab('wallet')}>Wallet</a><a className={tab==='profile'?'active':''} onClick={() => setTab('profile')}>Profile</a></nav>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
