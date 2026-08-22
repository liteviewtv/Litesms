import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import './styles.css';

function App() {
  const [profile, setProfile] = useState(null);
  const [authStatus, setAuthStatus] = useState('Connecting…');
  const [dbStatus, setDbStatus] = useState('checking');

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    if (!telegram) {
      setAuthStatus('Open inside Telegram');
      return;
    }
    telegram.ready();
    telegram.expand();
    const initData = telegram.initData;
    if (!initData) {
      setAuthStatus('Open inside Telegram');
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke('telegram-auth', { body: { initData } });
      if (error || data?.error) {
        setAuthStatus('Authentication unavailable');
        return;
      }
      setProfile(data.profile);
      setAuthStatus('Connected');
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.from('providers').select('id').limit(1).then(({ error }) => {
      if (mounted) setDbStatus(error ? 'offline' : 'connected');
    });
    return () => { mounted = false; };
  }, []);

  return (
    <main className="app">
      <header className="header">
        <div className="brand"><span className="logo">L</span><span>Litesms</span></div>
        <div className="telegram">{authStatus}</div>
      </header>
      <section className="hero">
        <p className="eyebrow">SMS & Phone Numbers</p>
        <h1>{profile?.first_name ? `Welcome, ${profile.first_name}` : 'Everything you need, in one place.'}</h1>
        <p className="muted">Buy virtual numbers, receive SMS and manage your balance.</p>
      </section>
      <section className="cards">
        <article><span>💳</span><p>Wallet Balance</p><strong>$0.00</strong></article>
        <article><span>📱</span><p>Active Orders</p><strong>0</strong></article>
      </section>
      <div className={`db-status ${dbStatus}`}><span className="status-dot" /> Supabase {dbStatus === 'checking' ? 'checking…' : dbStatus}</div>
      <button className="primary">Buy a Number</button>
      <nav className="bottom"><a className="active">Home</a><a>Orders</a><a>Wallet</a><a>Profile</a></nav>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
