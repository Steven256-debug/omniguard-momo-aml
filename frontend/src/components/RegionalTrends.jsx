import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { fetchRegionalTrends } from '../services/api';

const COLORS = ['#10b981', '#ef4444']; // Safe, Flagged

const RegionalTrends = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate network fetch
    setTimeout(() => {
      setData(fetchRegionalTrends());
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="trends-container loading-state">
        <div className="spinner"></div>
        <p>Loading regional fraud analytics...</p>
      </div>
    );
  }

  // Calculate totals
  const totalTransactions = data.reduce((sum, item) => sum + item.total, 0);
  const totalFlagged = data.reduce((sum, item) => sum + item.flagged, 0);
  const flaggedPercentage = ((totalFlagged / totalTransactions) * 100).toFixed(1);

  const pieData = [
    { name: 'Safe', value: totalTransactions - totalFlagged },
    { name: 'Flagged', value: totalFlagged }
  ];

  return (
    <div className="trends-container">
      <div className="trends-header">
        <h2>National Risk & Fraud Topology</h2>
        <p>Real-time analytics across Ghana's primary transactional regions.</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Processed Volume</div>
          <div className="kpi-value">{totalTransactions.toLocaleString()}</div>
          <div className="kpi-trend positive">Stable</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Total Flagged</div>
          <div className="kpi-value warning">{totalFlagged.toLocaleString()}</div>
          <div className="kpi-trend negative">Requires Attention</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">National Fraud Rate</div>
          <div className="kpi-value danger">{flaggedPercentage}%</div>
          <div className="kpi-trend negative">+0.2% vs yesterday</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Regional Distribution (Safe vs Flagged)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b'}} />
                <YAxis tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Legend />
                <Bar dataKey="safe" name="Safe Transactions" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="flagged" name="Flagged (Fraud Risk)" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>National Fraud Ratio</h3>
          <div className="chart-wrapper pie-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalTrends;
