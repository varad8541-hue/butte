
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Overview from '../components/Overview';
import PanelManager from '../components/PanelManager';
import TicketArchive from '../components/TicketArchive';
import LandingOverlay from '../components/LandingOverlay';
import Announcements from '../components/Announcements';
import Docs from '../components/Docs';

// Safely decode a JWT payload.
function parseJwt(token) {
  try {
    if (typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;

    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );

    const binary = atob(padded);
    const bytes = Uint8Array.from(
      binary,
      (char) => char.charCodeAt(0)
    );

    const json = new TextDecoder().decode(bytes);
    const payload = JSON.parse(json);

    return payload && typeof payload === 'object'
      ? payload
      : null;
  } catch {
    return null;
  }
}

function isValidTokenPayload(payload) {
  return (
    payload !== null &&
    typeof payload === 'object' &&
    typeof payload.exp === 'number' &&
    Number.isFinite(payload.exp) &&
    payload.exp * 1000 > Date.now()
  );
}

function getGuilds(payload) {
  if (!Array.isArray(payload?.allowedGuilds)) return [];

  return payload.allowedGuilds.filter(
    (guild) =>
      guild &&
      typeof guild === 'object' &&
      typeof guild.id === 'string' &&
      guild.id.length > 0 &&
      typeof guild.name === 'string'
  );
}

async function fetchJson(url, token, signal) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    const error = new Error(
      `Request failed (${response.status})`
    );

    error.status = response.status;
    throw error;
  }

  return response.json();
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
  const [loading, setLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  // Authenticate the user and restore the selected server.
  useEffect(() => {
    const token = localStorage.getItem('Reborn_token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const payload = parseJwt(token);

    if (!isValidTokenPayload(payload)) {
      localStorage.removeItem('Reborn_token');
      localStorage.removeItem('Reborn_guild_id');
      navigate('/login', { replace: true });
      return;
    }

    const guilds = getGuilds(payload);

    // Reject the old token schema used by previous versions.
    if (
      Array.isArray(payload.allowedGuilds) &&
      payload.allowedGuilds.some(
        (guild) => typeof guild === 'string'
      )
    ) {
      localStorage.removeItem('Reborn_token');
      localStorage.removeItem('Reborn_guild_id');

      alert('Security schema updated. Please log in again.');
      navigate('/login', { replace: true });
      return;
    }

    if (guilds.length === 0) {
      localStorage.removeItem('Reborn_token');
      localStorage.removeItem('Reborn_guild_id');

      alert(
        'Access Denied: You do not have Administrator permissions in any Reborn servers.'
      );

      navigate('/login', { replace: true });
      return;
    }

    setUser({
      ...payload,
      allowedGuilds: guilds,
    });

    const savedGuild = localStorage.getItem('Reborn_guild_id');

    if (
      !savedGuild ||
      !guilds.some((guild) => guild.id === savedGuild)
    ) {
      setSelectedGuild(null);
      setShowLanding(true);
    } else {
      setSelectedGuild(savedGuild);
      setShowLanding(false);
    }
  }, [navigate]);

  const handleGuildSelect = useCallback(
    (guildId) => {
      const guilds = user?.allowedGuilds || [];

      // Only allow selecting a server included in the token.
      if (!guilds.some((guild) => guild.id === guildId)) {
        return;
      }

      localStorage.setItem('Reborn_guild_id', guildId);

      setSelectedGuild(guildId);
      setShowLanding(false);
      setDashboardError('');
    },
    [user]
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem('Reborn_token');
    localStorage.removeItem('Reborn_guild_id');

    setUser(null);
    setSelectedGuild(null);

    navigate('/login', { replace: true });
  }, [navigate]);

  // Fetch panels and tickets for the selected server.
  const fetchDashboardData = useCallback(
    async (signal) => {
      if (!selectedGuild) return;

      const token = localStorage.getItem('Reborn_token');

      if (!token) {
        handleLogout();
        return;
      }

      const payload = parseJwt(token);

      if (!isValidTokenPayload(payload)) {
        handleLogout();
        return;
      }

      setLoading(true);
      setDashboardError('');

      try {
        const encodedGuild = encodeURIComponent(selectedGuild);

        // Both endpoints are expected to return JSON arrays.
        const [panelData, ticketData] = await Promise.all([
          fetchJson(
            `/api/panels/${encodedGuild}`,
            token,
            signal
          ),
          fetchJson(
            `/api/tickets/${encodedGuild}`,
            token,
            signal
          ),
        ]);

        if (signal?.aborted) return;

        if (!Array.isArray(panelData) ||
            !Array.isArray(ticketData)) {
          throw new Error(
            'The API returned an unexpected data format.'
          );
        }

        setPanels(panelData);
        setTickets(ticketData);
      } catch (error) {
        if (signal?.aborted || error.name === 'AbortError') {
          return;
        }

        console.error('Dashboard fetch error:', error);

        if (error.status === 401) {
          handleLogout();
          return;
        }

        if (error.status === 403) {
          setDashboardError(
            'You do not have permission to access this server.'
          );
        } else {
          setDashboardError(
            error.status
              ? `Could not load dashboard data (HTTP ${error.status}).`
              : 'Could not connect to the dashboard API. Please try again.'
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [selectedGuild, handleLogout]
  );

  useEffect(() => {
    if (!selectedGuild || showLanding || !user) return;

    const controller = new AbortController();

    fetchDashboardData(controller.signal);

    return () => controller.abort();
  }, [
    selectedGuild,
    showLanding,
    user,
    fetchDashboardData,
  ]);

  const selectedGuildData =
    user?.allowedGuilds?.find(
      (guild) => guild.id === selectedGuild
    );

  if (!user) {
    return (
      <div className="login-body">
        <div className="loader">Authenticating...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {showLanding && (
        <LandingOverlay
          guilds={user.allowedGuilds}
          onSelectGuild={handleGuildSelect}
        />
      )}

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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              className="mobile-only"
              onClick={() =>
                setMobileMenuOpen((previous) => !previous)
              }
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              style={{
                background: 'none',
                border: 'none',
                color: '#DBDEE1',
                fontSize: '1.4rem',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa-solid fa-bars" />
            </button>

            <h1 style={{ margin: 0 }}>
              {{
                overview: 'Dashboard Overview',
                panels: 'Ticket Panels',
                tickets: 'Archived Tickets',
                announcements: 'Announcements & Webhooks',
                docs: 'Documentation & Help',
              }[activePage] || 'Dashboard'}
            </h1>
          </div>

          <div
            className="topbar-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {selectedGuildData && (
              <button
                type="button"
                className="mobile-guild-selector mobile-only"
                onClick={() => {
                  localStorage.removeItem('Reborn_guild_id');
                  setSelectedGuild(null);
                  setShowLanding(true);
                }}
                aria-label="Change server"
              >
                <img
                  src={
                    selectedGuildData.icon
                      ? `https://cdn.discordapp.com/icons/${encodeURIComponent(
                          selectedGuild
                        )}/${encodeURIComponent(
                          selectedGuildData.icon
                        )}.png`
                      : 'https://cdn.discordapp.com/embed/avatars/0.png'
                  }
                  alt=""
                />

                <span>{selectedGuildData.name}</span>
              </button>
            )}

            <button
              type="button"
              className="btn-icon"
              onClick={() => fetchDashboardData()}
              disabled={loading}
              title="Refresh Data"
              aria-label="Refresh dashboard data"
            >
              <i className="fa-solid fa-rotate-right" />
            </button>

            <button
              type="button"
              className="btn-icon mobile-only"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              style={{ color: '#EF4444' }}
            >
              <i className="fa-solid fa-power-off" />
            </button>
          </div>
        </header>

        <div className="content-area">
          {dashboardError && !showLanding && (
            <div
              role="alert"
              style={{
                margin: '16px',
                padding: '12px 16px',
                border: '1px solid #EF4444',
                borderRadius: '8px',
                color: '#EF4444',
              }}
            >
              {dashboardError}
              <button
                type="button"
                onClick={() => fetchDashboardData()}
                style={{ marginLeft: '12px' }}
              >
                Retry
              </button>
            </div>
          )}

          {loading && !showLanding && (
            <div role="status" style={{ padding: '12px 16px' }}>
              Loading dashboard data...
            </div>
          )}

          {!showLanding && selectedGuild && (
            <>
              {activePage === 'overview' && (
                <Overview panels={panels} tickets={tickets} />
              )}

              {activePage === 'panels' && (
                <PanelManager
                  panels={panels}
                  selectedGuild={selectedGuild}
                  fetchDashboard={fetchDashboardData}
                />
              )}

              {activePage === 'tickets' && (
                <TicketArchive
                  tickets={tickets}
                  selectedGuild={selectedGuild}
                />
              )}

              {activePage === 'announcements' && (
                <Announcements selectedGuild={selectedGuild} />
              )}

              {activePage === 'docs' && <Docs />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
