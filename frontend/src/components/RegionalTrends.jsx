import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { fetchRegionalTrends } from '../services/api';
import { TrendingUp, ShieldCheck, AlertTriangle, Globe } from 'lucide-react';

const COLORS = ['#10b981', '#f43f5e']; // Safe (Emerald), Flagged (Rose)

const RegionalTrends = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate network fetch
    const timer = setTimeout(() => {
      setData(fetchRegionalTrends());
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="trends-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Aggregating regional fraud telemetry across Ghanaian payment corridors...
        </p>
      </div>
    );
  }

  // Calculate totals
  const totalTransactions = data.reduce((sum, item) => sum + item.total, 0);
  const totalFlagged = data.reduce((sum, item) => sum + item.flagged, 0);
  const flaggedPercentage = ((totalFlagged / totalTransactions) * 100).toFixed(1);

  const pieData = [
    { name: 'Safe Transactions', value: totalTransactions - totalFlagged },
    { name: 'Flagged High-Risk', value: totalFlagged }
  ];

  return (
    <div className="trends-container">
      <div className="trends-header">
        <h2>National Risk &amp; Mule Syndicate Topology</h2>
        <p>Real-time cross-regional transaction telemetry across Ghana's primary mobile money hubs.</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">National 24H Volume</div>
          <div className="kpi-value">{totalTransactions.toLocaleString()}</div>
          <div className="kpi-trend positive">
            <TrendingUp size={14} /> Normal grid velocity
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Syndicate Interceptions</div>
          <div className="kpi-value warning">{totalFlagged.toLocaleString()}</div>
          <div className="kpi-trend negative">
            <AlertTriangle size={14} /> 93.5% Auto-triaged
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Syndicate Ratio</div>
          <div className="kpi-value danger">{flaggedPercentage}%</div>
          <div className="kpi-trend negative">
            <Globe size={14} /> BoG CISD Threshold
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Regional Distribution (Safe vs Flagged Volumes)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: 'rgba(148, 163, 184, 0.25)', 
                    borderRadius: '8px', 
                    color: '#f8fafc',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                  }} 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Bar dataKey="safe" name="Safe Transactions" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="flagged" name="Flagged Risk" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>National Fraud vs Safe Ratio</h3>
          <div className="chart-wrapper pie-wrapper">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={6}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="rgba(11, 17, 32, 0.8)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: 'rgba(148, 163, 184, 0.25)', 
                    borderRadius: '8px', 
                    color: '#f8fafc' 
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalTrends;
