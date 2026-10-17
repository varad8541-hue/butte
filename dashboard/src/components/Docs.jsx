import React from 'react';

export default function Docs() {
  return (
    <div className="page active" id="page-docs">
      <div className="glass-panel" style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'inherit' }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#FFFFFF', fontWeight: '800' }}>Zenith <span className="text-accent">Documentation</span></h1>
          <p style={{ color: '#949BA4', fontSize: '1.1rem' }}>Your complete guide to configuring and managing the Zenith Utility System.</p>
        </div>

        {/* Developer Credit */}
        <div style={{ background: 'linear-gradient(90deg, rgba(88, 101, 242, 0.1) 0%, rgba(88, 101, 242, 0.05) 100%)', borderLeft: '4px solid #5865F2', padding: '20px', borderRadius: '4px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <i className="fa-solid fa-code" style={{ fontSize: '24px', color: '#5865F2' }}></i>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#FFFFFF', fontSize: '1.2rem' }}>System Architecture</h3>
              <p style={{ margin: 0, color: '#DBDEE1' }}>Proudly developed and engineered by <strong>devrock</strong>.</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
          
          {/* Commands Guide */}
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#FFFFFF', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-terminal text-accent"></i> Core Commands
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ color: '#00A8FC', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>/t-setup</div>
                <p style={{ margin: 0, color: '#DBDEE1', fontSize: '0.9rem', lineHeight: '1.4' }}>Deploy a high-fidelity Ticket Panel into the current channel. Allows deep customization including Modal form questions, automated Ticket Transcripts, and specific Category anchoring.</p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ color: '#00A8FC', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>/deletepanel</div>
                <p style={{ margin: 0, color: '#DBDEE1', fontSize: '0.9rem', lineHeight: '1.4' }}>Remote-destroy any active Ticket Panel message inside your server safely pulling it from the database simultaneously.</p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ color: '#00A8FC', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>/t-add & /t-remove</div>
                <p style={{ margin: 0, color: '#DBDEE1', fontSize: '0.9rem', lineHeight: '1.4' }}>Used exclusively inside active Ticket channels to securely pull in (or remove) other members into the private thread.</p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ color: '#00A8FC', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>/close</div>
                <p style={{ margin: 0, color: '#DBDEE1', fontSize: '0.9rem', lineHeight: '1.4' }}>Manually trigger the Ticket Archival sequence. Generates the secure Transcript, summarizes the conversation with AI, and locks out user permissions instantly.</p>
              </div>
            </div>
          </div>

          {/* Dashboard Guide */}
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#FFFFFF', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-desktop text-accent"></i> Dashboard Features
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>Ticket Panels Management</div>
                <p style={{ margin: 0, color: '#DBDEE1', fontSize: '0.9rem', lineHeight: '1.4' }}>Monitor all active Ticket routing pipelines. Use the powerful switch to toggle <strong>AI Integration</strong> on/off dynamically for each specific Ticket category.</p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>Announcements Builder</div>
                <p style={{ margin: 0, color: '#DBDEE1', fontSize: '0.9rem', lineHeight: '1.4' }}>Use the sleek Webhook Builder to deploy Server-wide announcements. Supports native Discord Markdown styling, `@everyone` pings, dynamic image routing, and a real-time Live UI Preview mockup to guarantee absolute pixel perfection before dropping it into your #announcements channel.</p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>Transcript Archival</div>
                <p style={{ margin: 0, color: '#DBDEE1', fontSize: '0.9rem', lineHeight: '1.4' }}>A state-of-the-art secure Mongoose-powered grid. Clicking 'Close' on a ticket instantly shreds their permissions and drops a secure web-transcript hyperlink, bypassing old clunky HTML file downloads.</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
