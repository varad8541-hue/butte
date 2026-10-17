import React, { useState, useEffect } from 'react';

export default function Announcements({ selectedGuild }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    targetChannelId: '',
    outsideText: '',
    title: '',
    description: '',
    url: '',
    imageUrl: '',
    color: '#5865F2'
  });

  useEffect(() => {
    if (!selectedGuild) return;
    const fetchChannels = async () => {
      try {
        const token = localStorage.getItem('zenith_token');
        const res = await fetch(`/api/guilds/${selectedGuild}/data`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels);
        }
      } catch (err) {}
    };
    fetchChannels();
  }, [selectedGuild]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${selectedGuild}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('zenith_token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Announcement successfully deployed!');
        setFormData({ ...formData, outsideText: '', title: '', description: '', url: '', imageUrl: '' });
      } else {
        alert(data.error || 'Failed to send announcement.');
      }
    } catch (err) {
      alert('Internal Server Error.');
    }
    setLoading(false);
  };

  return (
    <div className="page active" id="page-announcements">
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: FORM */}
        <div className="glass-panel" style={{ flex: '1 1 500px', padding: '24px' }}>
          <div className="panel-header" style={{ marginBottom: '20px' }}>
            <h2><i className="fa-solid fa-bullhorn text-accent" style={{ marginRight: '10px' }}></i> Webhook Builder</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Target Channel</label>
              <select value={formData.targetChannelId} onChange={e => setFormData({...formData, targetChannelId: e.target.value})} required>
                <option value="" disabled>Select Target Channel...</option>
                {channels.map(c => <option key={c.id} value={c.id}># {c.name}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label>Outside Text & Pings (@everyone)</label>
              <input type="text" placeholder="Regular Discord Message Content..." value={formData.outsideText} onChange={e => setFormData({...formData, outsideText: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Embed Title</label>
              <input type="text" placeholder="Update v2.0 Released!" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Description Paragraphs</label>
              <textarea placeholder="Write your announcement body here..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="5" required style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--panel-border)', borderRadius: '8px', resize: 'vertical', fontFamily: 'inherit' }}></textarea>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Hyperlink (URL)</label>
                <input type="url" placeholder="https://..." value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} />
              </div>
              <div className="form-group" style={{ maxWidth: '120px' }}>
                <label>Theme Color</label>
                <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ width: '100%', height: '42px', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }} />
              </div>
            </div>

            <div className="form-group">
              <label>Media / Image URL</label>
              <input type="url" placeholder="https://example.com/image.png" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '15px' }} disabled={loading || !formData.targetChannelId}>
              {loading ? 'Transmitting Payload...' : 'Drop Announcement'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: PREVIEW */}
        <div className="glass-panel" style={{ flex: '1 1 400px', padding: '24px', background: 'rgba(43, 45, 49, 0.4)' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-brands fa-discord"></i> Discord Live Preview
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ minWidth: '40px', height: '40px', borderRadius: '50%', background: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>Z</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: formData.color, fontWeight: '600', fontSize: '1.05rem' }}>Zenith</span>
                  <span style={{ fontSize: '0.65rem', background: '#5865F2', padding: '2px 4px', borderRadius: '3px', fontWeight: 'bold' }}>BOT</span>
                  <span style={{ color: '#949BA4', fontSize: '0.75rem' }}>Today at 12:00 PM</span>
                </div>
                
                {formData.outsideText && (
                  <div style={{ color: '#DBDEE1', marginBottom: '6px', fontSize: '0.95rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                    {formData.outsideText}
                  </div>
                )}

                <div style={{ background: '#2B2D31', borderLeft: `4px solid ${formData.color}`, borderRadius: '4px', padding: '16px', marginTop: '6px', maxWidth: '420px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {formData.title && (
                     <a href={formData.url || '#'} style={{ fontWeight: '600', color: formData.url ? '#00A8FC' : '#FFFFFF', marginBottom: '8px', fontSize: '1rem', display: 'block', textDecoration: formData.url ? 'none' : 'none' }}>
                       {formData.title}
                     </a>
                  )}
                  {formData.description && (
                    <div style={{ color: '#DBDEE1', fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
                      {formData.description}
                    </div>
                  )}
                  {formData.imageUrl && (
                    <img src={formData.imageUrl} alt="Embed Media" style={{ maxWidth: '100%', borderRadius: '4px', marginTop: '16px', display: 'block' }} />
                  )}
                </div>
                
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
