import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Overview from '../components/Overview';
import PanelManager from '../components/PanelManager';
import TicketArchive from '../components/TicketArchive';
import LandingOverlay from '../components/LandingOverlay';
import Announcements from '../components/Announcements';
import Docs from '../components/Docs';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [activePage, setActivePage] = useState('overview');
  const [showLanding, setShowLanding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [panels, setPanels] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('zenith_token');
    if (!token) return navigate('/login');

    const payload = parseJwt(token);
    if (!payload || payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('zenith_token');
      return navigate('/login');
    }

    const guilds = payload.allowedGuilds || [];
    
    if (guilds.length > 0 && typeof guilds[0] === 'string') {
      localStorage.removeItem('zenith_token');
      alert('Security schema updated. Please log in again.');
      return navigate('/login');
    }

    if (guilds.length === 0) {
      alert("Access Denied: You do not have Administrator permissions in any Zenith servers.");
      localStorage.removeItem('zenith_token');
      return navigate('/login');
    }

    setUser(payload);

    const savedGuild = localStorage.getItem('zenith_guild_id');
    if (!savedGuild || savedGuild === 'undefined' || !guilds.some(g => g.id === savedGuild)) {
      setShowLanding(true);
    } else {
      setSelectedGuild(savedGuild);
    }
  }, [navigate]);

  const handleGuildSelect = (guildId) => {
    localStorage.setItem('zenith_guild_id', guildId);
    setSelectedGuild(guildId);
    setShowLanding(false);
  };

  const fetchDashboardData = async () => {
    if (!selectedGuild) return;
    try {
      const token = localStorage.getItem('zenith_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const pRes = await fetch(`/api/panels/${selectedGuild}`, { headers });
      if (pRes.ok) setPanels(await pRes.json());
      
      const tRes = await fetch(`/api/tickets/${selectedGuild}`, { headers });
      if (tRes.ok) setTickets(await tRes.json());
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedGuild]);

  if (!user) return <div className="login-body"><div className="loader">Authenticating...</div></div>;

  return (
    <div className="app-container">
      {showLanding && <LandingOverlay guilds={user.allowedGuilds} onSelectGuild={handleGuildSelect} />}
      
      <Sidebar 
        user={user} 
        selectedGuild={selectedGuild} 
        onSelectGuild={handleGuildSelect} 
        activePage={activePage} 
        setActivePage={setActivePage} 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="mobile-only" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#DBDEE1', 
                fontSize: '1.4rem', 
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <h1 style={{ margin: 0 }}>
              {activePage === 'overview' && 'Dashboard Overview'}
              {activePage === 'panels' && 'Ticket Panels'}
              {activePage === 'tickets' && 'Archived Tickets'}
              {activePage === 'announcements' && 'Announcements & Webhooks'}
              {activePage === 'docs' && 'Documentation & Help'}
            </h1>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mobile-Only Server Selector */}
            {selectedGuild && user && (
              <div className="mobile-guild-selector mobile-only" onClick={() => { localStorage.removeItem('zenith_guild_id'); setShowLanding(true); }}>
                <img 
                  src={user.allowedGuilds.find(g => g.id === selectedGuild)?.icon 
                    ? `https://cdn.discordapp.com/icons/${selectedGuild}/${user.allowedGuilds.find(g => g.id === selectedGuild).icon}.png` 
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                  alt="" 
                />
                <span>{user.allowedGuilds.find(g => g.id === selectedGuild)?.name || 'Server'}</span>
              </div>
            )}
            
            <button className="btn-icon" onClick={fetchDashboardData} title="Refresh Data"><i className="fa-solid fa-rotate-right"></i></button>
            
            {/* Mobile-Only Logout */}
            <button className="btn-icon mobile-only" onClick={() => { localStorage.removeItem('zenith_token'); window.location.href = '/login'; }} title="Log out" style={{ color: '#EF4444' }}><i className="fa-solid fa-power-off"></i></button>
          </div>
        </header>

        <div className="content-area">
          {!showLanding && selectedGuild && (
            <>
              {activePage === 'overview' && <Overview panels={panels} tickets={tickets} />}
              {activePage === 'panels' && <PanelManager panels={panels} selectedGuild={selectedGuild} fetchDashboard={fetchDashboardData} />}
              {activePage === 'tickets' && <TicketArchive tickets={tickets} selectedGuild={selectedGuild} />}
              {activePage === 'announcements' && <Announcements selectedGuild={selectedGuild} />}
              {activePage === 'docs' && <Docs />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
