import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function Overview({ panels, tickets }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const dates = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates[d.toLocaleDateString()] = 0;
    }

    tickets.forEach(t => {
      const d = new Date(t.createdAt).toLocaleDateString();
      if (dates[d] !== undefined) dates[d]++;
    });

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: Object.keys(dates),
        datasets: [{
          label: 'Tickets Opened',
          data: Object.values(dates),
          borderColor: '#5865F2',
          backgroundColor: 'rgba(88, 101, 242, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [tickets]);

  const closedTickets = tickets.filter(t => t.status === 'closed').length;
  const resRate = tickets.length > 0 ? ((closedTickets / tickets.length) * 100).toFixed(1) : 0;
  const aiTickets = tickets.filter(t => t.aiSummary || t.lastAiResponseAt).length;

  return (
    <div className="page active" id="page-overview">
      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon"><i className="fa-solid fa-server"></i></div>
          <div className="stat-details">
            <h3>Total Panels</h3>
            <h2>{panels.length}</h2>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon highlight"><i className="fa-solid fa-ticket"></i></div>
          <div className="stat-details">
            <h3>Tickets Opened</h3>
            <h2>{tickets.length}</h2>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon success"><i className="fa-solid fa-check"></i></div>
          <div className="stat-details">
            <h3>Resolution Rate</h3>
            <h2>{resRate}%</h2>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon warning"><i className="fa-solid fa-robot"></i></div>
          <div className="stat-details">
            <h3>AI Interventions</h3>
            <h2>{aiTickets}</h2>
          </div>
        </div>
      </div>
      
      <div className="chart-container glass-panel mt-4" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
        <div className="chart-header" style={{ marginBottom: '10px' }}>
          <h3>Analytics Overview</h3>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </div>
  );
}
