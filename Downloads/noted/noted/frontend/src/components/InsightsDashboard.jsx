import React, { useState, useEffect } from 'react';
import { insightsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#4F46E5','#818CF8','#34D399','#F59E0B','#F472B6','#60A5FA'];

function StatBox({ value, label, icon, accent }) {
  return (
    <div className="stat-card glass" style={{ position: 'relative' }}>
      <div style={{ fontSize: 36, marginBottom: 6 }}>{icon}</div>
      <div className="stat-value" style={{ color: accent || 'var(--fg)' }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function InsightsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insightsAPI.get().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><div className="processing-ring" style={{ margin: '0 auto' }}></div><p style={{ color: 'var(--muted)', marginTop: 20 }}>Loading insights…</p></div>;
  if (!data) return <p style={{ color: 'var(--muted)' }}>Could not load insights.</p>;

  const tagData = Object.entries(data.top_tags || {}).map(([tag, count]) => ({ tag, count }));
  const intentData = Object.entries(data.intent_breakdown || {}).map(([name, value]) => ({ name, value }));
  const timelineData = (data.timeline || []).map(d => ({ date: d.date.slice(5), count: d.count }));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, marginBottom: 4 }}>Insights</h2>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>Your networking stats at a glance</p>
      </div>

      {/* Stat grid */}
      <div className="stats-grid" style={{ marginBottom: 36 }}>
        <StatBox value={data.total} label="Total Connections" icon="🔗" accent="var(--accent)" />
        <StatBox value={data.this_week} label="Added This Week" icon="📅" accent="#34D399" />
        <StatBox value={data.this_month} label="This Month" icon="📆" />
        <StatBox value={`${data.follow_up_rate}%`} label="Follow-up Rate" icon="✅" accent={data.follow_up_rate > 50 ? '#34D399' : '#F59E0B'} />
        <StatBox value={data.pending_reminders} label="Active Reminders" icon="🔔" />
        <StatBox value={data.events_attended} label="Events Attended" icon="🎟️" accent="#818CF8" />
      </div>

      {/* Overdue alert */}
      {data.overdue_count > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', color: 'white', borderRadius: 16, padding: '16px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>You have {data.overdue_count} overdue follow-up{data.overdue_count > 1 ? 's' : ''}!</p>
            <p style={{ fontSize: 14, opacity: 0.9 }}>Go to your connections and mark them done or reschedule.</p>
          </div>
        </div>
      )}

      {/* Follow-up insight */}
      {data.follow_up_rate < 30 && data.total > 5 && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '16px 24px', marginBottom: 28 }}>
          <p style={{ fontWeight: 600, color: '#F59E0B' }}>💡 Insight: You follow up with only {data.follow_up_rate}% of your connections.</p>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>Try setting reminders right when you add a connection.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Timeline */}
        {timelineData.length > 0 && (
          <div className="glass" style={{ borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, marginBottom: 16 }}>Connections Over Time</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={timelineData}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.95)', fontSize: 13 }} />
                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={{ fill: '#4F46E5', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Tags */}
        {tagData.length > 0 && (
          <div className="glass" style={{ borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, marginBottom: 16 }}>Most Common Tags</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tagData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <YAxis type="category" dataKey="tag" width={80} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13 }} />
                <Bar dataKey="count" fill="#818CF8" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Intent Pie */}
        {intentData.length > 0 && (
          <div className="glass" style={{ borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, marginBottom: 16 }}>Connection Intent</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={intentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
                  {intentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
