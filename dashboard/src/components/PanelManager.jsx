import React, { useState, useEffect } from 'react';

export default function PanelManager({ panels, selectedGuild, fetchDashboard }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discordData, setDiscordData] = useState({ roles: [], channels: [], categories: [] });
  const [formData, setFormData] = useState({
    panelId: '',
    name: '',
    channelId: '',
    categoryId: '',
    staffRoleId: '',
    aiMode: 'assist'
  });

  useEffect(() => {
    if (!selectedGuild) return;
    const fetchDiscordData = async () => {
      try {
        const token = localStorage.getItem('zenith_token');
        const res = await fetch(`/api/guilds/${selectedGuild}/data`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setDiscordData(await res.json());
      } catch (err) {}
    };
    fetchDiscordData();
  }, [selectedGuild]);

  const openModal = (p = null) => {
    if (p) {
      setFormData({
        panelId: p.panelId,
        name: p.name || '',
        channelId: p.channelId || '',
        categoryId: p.categoryId || '',
        staffRoleId: p.staffRoleId || '',
        aiMode: p.aiMode || (p.aiEnabled ? 'hybrid' : 'assist')
      });
    } else {
      setFormData({ panelId: '', name: '', channelId: '', categoryId: '', staffRoleId: '', aiMode: 'assist' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const isEdit = !!formData.panelId;
    const payload = {
      guildId: selectedGuild,
      name: formData.name,
      channelId: formData.channelId,
      categoryId: formData.categoryId,
      staffRoleId: formData.staffRoleId,
      aiMode: formData.aiMode,
      aiEnabled: formData.aiMode !== 'assist',
      panelId: isEdit ? formData.panelId : Math.random().toString(36).substring(2, 10)
    };

    try {
      const res = await fetch(`/api/panels${isEdit ? `/${formData.panelId}` : ''}`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('zenith_token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        fetchDashboard();
      } else {
        alert(data.error || 'Failed to save panel');
      }
    } catch (err) {
      alert('Internal Server Error while saving panel');
    }
    setLoading(false);
  };

  const deletePanel = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this panel? This cannot be undone.')) return;
    try {
      await fetch(`/api/panels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('zenith_token')}` }
      });
      fetchDashboard();
    } catch (e) {
      alert('Failed to delete panel');
    }
  };

  return (
    <div className="page active" id="page-panels">
      <div className="panels-grid">
        <div 
          className="panel-card glass-panel" 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed rgba(88, 101, 242, 0.4)', background: 'rgba(88, 101, 242, 0.03)', minHeight: '200px' }} 
          onClick={() => openModal()}
        >
          <i className="fa-solid fa-plus" style={{ fontSize: '2.5rem', color: 'var(--accent-blue)', marginBottom: '12px' }}></i>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Create New Panel</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>Build a new ticket interface</p>
        </div>

        {panels.map(p => (
          <div key={p.panelId} className="panel-card glass-panel">
            <div className="panel-header">
              <h3>{p.name}</h3>
              <span className={`badge badge-ai-${p.aiMode}`}>{p.aiMode.toUpperCase()}</span>
            </div>
            <div className="panel-body">
              <p><i className="fa-solid fa-list"></i> Category: {p.categoryId || 'N/A'}</p>
              <p><i className="fa-solid fa-users"></i> Staff Role: {p.staffRoleId || 'N/A'}</p>
              <p><i className="fa-solid fa-ticket"></i> Total Tickets: {p.ticketCount || 0}</p>
            </div>
            <div className="panel-actions">
              <button className="btn-secondary" onClick={() => openModal(p)}><i className="fa-solid fa-pen"></i> Edit</button>
              <button className="btn-danger" onClick={() => deletePanel(p.panelId)}><i className="fa-solid fa-trash"></i> Delete</button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-panel pop-in">
            <h2>{formData.panelId ? 'Edit Panel' : 'Create New Panel'}</h2>
            <p className="modal-subtitle">Configure the ticket generator interface.</p>
            
            <form className="mt-4" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Panel Name / Title</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Premium Support" />
              </div>
              <div className="form-group">
                <label>Target Channel</label>
                <select value={formData.channelId} onChange={e => setFormData({...formData, channelId: e.target.value})} required disabled={!!formData.panelId}>
                  <option value="" disabled>Select Channel for Embed Deployment...</option>
                  {discordData.channels.map(c => <option key={c.id} value={c.id}># {c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ticket Spawn Category</label>
                  <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} required>
                    <option value="" disabled>Select Category...</option>
                    {discordData.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Support Staff Role</label>
                  <select value={formData.staffRoleId} onChange={e => setFormData({...formData, staffRoleId: e.target.value})} required>
                    <option value="" disabled>Select Role...</option>
                    {discordData.roles.map(r => <option key={r.id} value={r.id}>@ {r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group mt-4">
                <label>AI Assistant Setting</label>
                <select value={formData.aiMode} onChange={e => setFormData({...formData, aiMode: e.target.value})} required>
                  <option value="assist">Off (No Auto-Replies)</option>
                  <option value="hybrid">On (Automated Staff Relief)</option>
                </select>
                <p className="modal-subtitle">When ON, AI will analyze tickets and respond to users while they wait for human staff.</p>
              </div>
              
              <div className="modal-actions mt-4">
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Panel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
