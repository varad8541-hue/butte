import React, { useState, useRef, useEffect } from 'react';

export default function Sidebar({ user, selectedGuild, onSelectGuild, activePage, setActivePage, mobileMenuOpen, setMobileMenuOpen }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentGuild = user?.allowedGuilds?.find(g => g.id === selectedGuild);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('zenith_token');
    window.location.href = '/login';
  };

  const closeMobileMenu = () => {
    if (typeof setMobileMenuOpen === 'function') setMobileMenuOpen(false);
  };

  return (
    <nav className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <h2 className="brand-text-glow">ZENITH</h2>
        <button 
          className="btn-icon mobile-only" 
          onClick={closeMobileMenu}
          style={{ background: 'none', border: 'none', color: '#DBDEE1', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="guild-selector" id="guild-selector" ref={dropdownRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
        <img 
          src={currentGuild?.icon ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
          alt="Guild" className="guild-icon" 
        />
        <span className="guild-name">{currentGuild?.name || 'Select Server'}</span>
        <i className="fa-solid fa-chevron-down"></i>
        
        <div className={`guild-dropdown ${dropdownOpen ? 'active' : ''}`}>
          {user?.allowedGuilds?.map(g => (
            <div 
              key={g.id} 
              className="guild-option" 
              onClick={(e) => { e.stopPropagation(); onSelectGuild(g.id); setDropdownOpen(false); closeMobileMenu(); }}
            >
              {g.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} className="guild-icon" alt="" />
              ) : (
                <div className="guild-icon" style={{ background: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>#</div>
              )}
              <span className="guild-name">{g.name}</span>
            </div>
          ))}
        </div>
      </div>

      <ul className="nav-links">
        <li className={activePage === 'overview' ? 'active' : ''} onClick={() => { setActivePage('overview'); closeMobileMenu(); }}>
          <i className="fa-solid fa-chart-pie"></i>
          <span>Overview</span>
        </li>
        <li className={activePage === 'panels' ? 'active' : ''} onClick={() => { setActivePage('panels'); closeMobileMenu(); }}>
          <i className="fa-solid fa-table-columns"></i>
          <span>Ticket Panels</span>
        </li>
        <li className={activePage === 'announcements' ? 'active' : ''} onClick={() => { setActivePage('announcements'); closeMobileMenu(); }}>
          <i className="fa-solid fa-bullhorn"></i>
          <span>Announcements</span>
        </li>
        <li className={activePage === 'tickets' ? 'active' : ''} onClick={() => { setActivePage('tickets'); closeMobileMenu(); }}>
          <i className="fa-solid fa-ticket"></i>
          <span>Archived Tickets</span>
        </li>
        <li className={activePage === 'docs' ? 'active' : ''} onClick={() => { setActivePage('docs'); closeMobileMenu(); }}>
          <i className="fa-solid fa-book text-accent"></i>
          <span>Docs & Guides</span>
        </li>
      </ul>

      <div className="user-profile" style={{ marginTop: 'auto' }}>
        <img 
          src={user?.avatar ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
          alt="User" className="user-avatar" 
        />
        <div className="user-info">
          <h4>{user?.username || 'Loading...'}</h4>
          <span className="logout-btn" onClick={handleLogout}>Log out</span>
        </div>
      </div>
    </nav>
  );
}
