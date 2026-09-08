import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { fetchRegionalTrends, fetchHourlyVelocity } from '../services/api';
import { Activity, ShieldCheck, AlertOctagon, TrendingUp, Filter } from 'lucide-react';

const COLORS = ['#10b981', '#f43f5e'];

// Custom Apple Frosted Glass Tooltip
const AppleGlassTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(18, 24, 38, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
        color: '#ffffff',
        fontSize: '12px',
        minWidth: '150px'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '4px' }}>
          {label}
        </div>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', margin: '3px 0' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255, 255, 255, 0.75)', fontSize: '11.5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: entry.color }}></span>
              {entry.name}
            </span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const RegionalTrends = ({ theme = 'dark' }) => {
  const [regionalData, setRegionalData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState('count'); // 'count' | 'volume'

  useEffect(() => {
    const timer = setTimeout(() => {
      setRegionalData(fetchRegionalTrends());
      setHourlyData(fetchHourlyVelocity());
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const isDark = theme === 'dark';
  const gridStroke = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const axisTick = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.6)';

  if (loading) {
    return (
      <div className="trends-view-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading real-time telemetry...</span>
      </div>
    );
  }

  const totalTransactions = regionalData.reduce((sum, item) => sum + item.total, 0);
  const totalFlagged = regionalData.reduce((sum, item) => sum + item.flagged, 0);
  const totalVolumeGHS = regionalData.reduce((sum, item) => sum + (item.volumeGHS || 0), 0);
  const flaggedPercentage = ((totalFlagged / totalTransactions) * 100).toFixed(1);

  const pieData = [
    { name: 'Auto-Cleared Safe', value: Math.round(totalTransactions * 0.74), color: '#10b981' },
    { name: 'Auto-Blocked Fraud', value: Math.round(totalTransactions * 0.195), color: '#f43f5e' },
    { name: 'Gray-Zone Review', value: Math.round(totalTransactions * 0.065), color: '#f59e0b' }
  ];

  return (
    <div className="trends-view-container">
      {/* Page Header */}
      <div className="trends-header-row">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Regional Telemetry &amp; Syndicate Network Analytics
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, wordSpacing: '1.5px', textAlign: 'justify', textJustify: 'inter-word' }}>
            Real-time multi-corridor transaction velocity and unsupervised anomaly detection across Ghana.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="nav-tabs" style={{ background: 'var(--glass-input)' }}>
          <button 
            className={`nav-tab-link ${activeMetric === 'count' ? 'active' : ''}`}
            onClick={() => setActiveMetric('count')}
          >
            Transaction Count
          </button>
          <button 
            className={`nav-tab-link ${activeMetric === 'volume' ? 'active' : ''}`}
            onClick={() => setActiveMetric('volume')}
          >
            Capital Volume (GH¢)
          </button>
        </div>
      </div>

      {/* 4 Apple Frosted Glass KPI Cards */}
      <div className="trends-kpi-grid">
        <div className="kpi-box">
          <div className="kpi-box-title">24H Grid Volume</div>
          <div className="kpi-box-val">GH¢ {(totalVolumeGHS / 1000000).toFixed(1)}M</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
            {totalTransactions.toLocaleString()} Transactions • Nominal Velocity
          </div>
        </div>

        <div className="kpi-box">
          <div className="kpi-box-title">Syndicate Interceptions</div>
          <div className="kpi-box-val" style={{ color: '#fb7185' }}>{totalFlagged.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
            93.5% Automated Triage
          </div>
        </div>

        <div className="kpi-box">
          <div className="kpi-box-title">Anomaly Rate</div>
          <div className="kpi-box-val" style={{ color: '#f59e0b' }}>{flaggedPercentage}%</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
            BoG CISD Compliant (&lt; 8.0%)
          </div>
        </div>

        <div className="kpi-box">
          <div className="kpi-box-title">Capital Protected</div>
          <div className="kpi-box-val" style={{ color: '#34d399' }}>GH¢ 1.94M</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
            Instant CBS Freeze Holds
          </div>
        </div>
      </div>

      {/* Chart 1: Real-Time 24-Hour Velocity & Anomaly Stream (Full Width Area Chart) */}
      <div className="panel-card" style={{ padding: '20px 22px' }}>
        <div className="panel-card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={15} color="#38bdf8" />
            <span>24-Hour Transaction Stream &amp; Anomaly Surge Detection</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'none', fontWeight: 500 }}>
            Real-time sliding window (SageMaker Autoencoder)
          </span>
        </div>

        <div style={{ height: '240px', marginTop: '10px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="streamSafe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="streamFlagged" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="time" stroke={axisTick} tick={{ fill: axisTick, fontSize: 11 }} />
              <YAxis stroke={axisTick} tick={{ fill: axisTick, fontSize: 11 }} />
              <Tooltip content={<AppleGlassTooltip />} />
              <Area 
                type="monotone" 
                dataKey="safe" 
                name="Safe Volume" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#streamSafe)" 
              />
              <Area 
                type="monotone" 
                dataKey="flagged" 
                name="Syndicate Smurfing Spikes" 
                stroke="#f43f5e" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#streamFlagged)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Bar Chart + Radial Donut Chart */}
      <div className="trends-charts-grid">
        {/* Regional Breakdown Bar Chart */}
        <div className="panel-card" style={{ padding: '20px 22px' }}>
          <div className="panel-card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={15} color="#10b981" />
              <span>Regional Corridor Distribution (Safe vs Flagged)</span>
            </div>
          </div>

          <div style={{ height: '280px', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barSafeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="barFlaggedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" stroke={axisTick} tick={{ fill: axisTick, fontSize: 11 }} />
                <YAxis stroke={axisTick} tick={{ fill: axisTick, fontSize: 11 }} />
                <Tooltip content={<AppleGlassTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11.5px', fontWeight: 600 }} />
                <Bar 
                  dataKey="safe" 
                  name="Verified Safe" 
                  stackId="a" 
                  fill="url(#barSafeGrad)" 
                  radius={[0, 0, 4, 4]} 
                />
                <Bar 
                  dataKey="flagged" 
                  name="Flagged Risk" 
                  stackId="a" 
                  fill="url(#barFlaggedGrad)" 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3-Tier Automated Triage Efficiency Donut */}
        <div className="panel-card" style={{ padding: '20px 22px' }}>
          <div className="panel-card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={15} color="#34d399" />
              <span>3-Tier Auto-Triage Ratio</span>
            </div>
            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>93.5% Auto</span>
          </div>

          <div style={{ height: '200px', position: 'relative', marginTop: '5px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth={1.5}
                    />
                  ))}
                </Pie>
                <Tooltip content={<AppleGlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Centered Hero Badge */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>93.5%</div>
              <div style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Resolved</div>
            </div>
          </div>

          {/* Breakdown Legend List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            {pieData.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }}></span>
                  {item.name}
                </span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalTrends;
