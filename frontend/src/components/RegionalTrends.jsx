import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { fetchRegionalTrends } from '../services/api';

const COLORS = ['#10b981', '#ef4444'];

const RegionalTrends = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(fetchRegionalTrends());
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="trends-view-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading analytics...</span>
      </div>
    );
  }

  const totalTransactions = data.reduce((sum, item) => sum + item.total, 0);
  const totalFlagged = data.reduce((sum, item) => sum + item.flagged, 0);
  const flaggedPercentage = ((totalFlagged / totalTransactions) * 100).toFixed(1);

  const pieData = [
    { name: 'Safe', value: totalTransactions - totalFlagged },
    { name: 'Flagged', value: totalFlagged }
  ];

  return (
    <div className="trends-view-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Regional Transaction Telemetry
        </h2>
        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Distribution of processed volume and flagged syndicate anomalies across Ghanaian regions.
        </p>
      </div>

      <div className="kpi-row">
        <div className="kpi-box">
          <div className="kpi-box-title">Total 24H Volume</div>
          <div className="kpi-box-val">{totalTransactions.toLocaleString()}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Normal baseline velocity</div>
        </div>
        <div className="kpi-box">
          <div className="kpi-box-title">Flagged Incidents</div>
          <div className="kpi-box-val" style={{ color: 'var(--warning-text)' }}>{totalFlagged.toLocaleString()}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '4px' }}>93.5% automated triage</div>
        </div>
        <div className="kpi-box">
          <div className="kpi-box-title">Anomaly Rate</div>
          <div className="kpi-box-val" style={{ color: 'var(--danger-text)' }}>{flaggedPercentage}%</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Within BoG CISD bounds</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="panel-card" style={{ padding: '20px' }}>
          <div className="panel-card-title">
            <span>Regional Distribution (Safe vs Flagged)</span>
          </div>
          <div style={{ height: '300px', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18191e', 
                    borderColor: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '6px', 
                    color: '#f4f4f5',
                    fontSize: '12px'
                  }} 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11.5px' }} />
                <Bar dataKey="safe" name="Safe" stackId="a" fill="#10b981" radius={[0, 0, 2, 2]} />
                <Bar dataKey="flagged" name="Flagged" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-card" style={{ padding: '20px' }}>
          <div className="panel-card-title">
            <span>Network Ratio</span>
          </div>
          <div style={{ height: '300px', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="#0f1013"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18191e', 
                    borderColor: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '6px', 
                    color: '#f4f4f5',
                    fontSize: '12px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalTrends;
