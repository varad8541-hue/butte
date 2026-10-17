import React from 'react';

export default function TicketArchive({ tickets, selectedGuild }) {

  const deleteTicket = async (ticketId) => {
    if (!window.confirm("Are you sure you want to permanently delete this ticket and its transcript?")) return;
    try {
      const token = localStorage.getItem('zenith_token');
      const res = await fetch(`/api/tickets/${selectedGuild}/${ticketId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to delete ticket.");
      }
    } catch(err) { console.error(err); }
  };

  const deleteAllTickets = async () => {
    if (!window.confirm("Are you sure you want to delete ALL tickets in this archive? This action cannot be undone!")) return;
    try {
      const token = localStorage.getItem('zenith_token');
      const res = await fetch(`/api/tickets/${selectedGuild}/all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to delete all tickets.");
      }
    } catch(err) { console.error(err); }
  };

  return (
    <div className="page active" id="page-tickets">
      <div className="panel-header" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Archived Tickets</h3>
        <button className="btn-danger" onClick={deleteAllTickets} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-trash-can"></i> Purge Entire Archive
        </button>
      </div>

      <div className="table-container glass-panel">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Status</th>
              <th>Created</th>
              <th>AI Involvement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr><td colSpan="5" className="loader">No archived tickets found.</td></tr>
            ) : tickets.map(t => (
              <tr key={t.ticketId}>
                <td style={{ fontWeight: 600 }}>{t.ticketId}</td>
                <td className={`status-${t.status}`}>
                  <i className={`fa-solid ${t.status === 'open' ? 'fa-circle-dot' : t.status === 'locked' ? 'fa-lock' : 'fa-check'}`}></i> {t.status.toUpperCase()}
                </td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>
                  {t.aiSummary || t.lastAiResponseAt ? (
                    <span className="badge badge-ai-auto"><i className="fa-solid fa-robot"></i> AI Assisted</span>
                  ) : <span style={{ color: 'var(--text-secondary)' }}>None</span>}
                </td>
                <td style={{ display: 'flex', gap: '8px' }}>
                  <a 
                    className={`btn-secondary ${!t.transcriptPath ? 'disabled' : ''}`}
                    href={t.transcriptPath ? `/api/tickets/${selectedGuild}/transcript/${t.ticketId}?token=${localStorage.getItem('zenith_token')}` : '#'}
                    target={t.transcriptPath ? "_blank" : "_self"}
                    rel="noreferrer"
                    title={!t.transcriptPath ? "Transcript only available for closed tickets" : "View generated HTML transcript"}
                    style={{ opacity: t.transcriptPath ? 1 : 0.5, pointerEvents: t.transcriptPath ? 'auto' : 'none', width: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <i className="fa-solid fa-file-code"></i>
                  </a>
                  <button 
                    className="btn-danger" 
                    onClick={() => deleteTicket(t.ticketId)}
                    title="Delete Ticket"
                    style={{ width: 'auto' }}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
