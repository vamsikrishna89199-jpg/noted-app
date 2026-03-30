import React, { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../services/api';

const SUGGESTED = [
  'Who did I meet working in AI?',
  'Who is looking for funding?',
  'Find people from startups',
  'Who did I meet recently?',
  'Show me founders I met',
  'Who should I follow up with?',
];

export default function AIAssistant() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your network AI. Ask me anything about the people you've met — I'll search your connections intelligently.", results: [] }
  ]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    // Load smart suggestions on mount
    aiAPI.suggestions().then(r => setSuggestions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async (q) => {
    const text = (q || query).trim();
    if (!text) return;
    setQuery('');
    setMessages(m => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await aiAPI.ask(text);
      setMessages(m => [...m, { role: 'assistant', text: res.data.answer, results: res.data.results }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Sorry, something went wrong. Try again.', results: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['linear-gradient(135deg,#F472B6,#EC4899)','linear-gradient(135deg,#818CF8,#6366F1)','linear-gradient(135deg,#34D399,#10B981)','linear-gradient(135deg,#FBBF24,#F59E0B)','linear-gradient(135deg,#60A5FA,#3B82F6)'];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, marginBottom: 4 }}>AI Assistant</h2>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>Ask anything about your network</p>
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="glass" style={{ borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>💡 Smart Suggestions</p>
          {suggestions.map((s, i) => (
            <div key={i} className="glass" style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{s.connection?.name}</p>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>{s.message}</p>
              </div>
              <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => ask(`Tell me about ${s.connection?.name}`)}>
                Ask AI
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Suggested queries */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {SUGGESTED.map(s => (
          <button key={s} className="tag-chip" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: 13, background: 'rgba(79,70,229,0.08)', color: 'var(--accent)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 100 }} onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div className="glass" style={{ borderRadius: 20, padding: 20, minHeight: 300, maxHeight: 500, overflowY: 'auto', marginBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: msg.role === 'assistant' ? 'linear-gradient(135deg, var(--accent), var(--accent-light))' : 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                {msg.role === 'assistant' ? '🤖' : '👤'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fg)' }}>{msg.text}</p>

                {/* Result cards */}
                {msg.results?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginTop: 12 }}>
                    {msg.results.map((c, ci) => (
                      <div key={c.id} className="glass" style={{ padding: 14, borderRadius: 14 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS[ci % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
                            {c.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--muted)' }}>{c.company || c.event}</p>
                          </div>
                        </div>
                        {c.aiSummary && <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{c.aiSummary}</p>}
                        {c.tags?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {c.tags.slice(0,3).map(t => <span key={t} style={{ background: 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700 }}>{t}</span>)}
                          </div>
                        )}
                        {c.linkedin && (
                          <a href={c.linkedin.startsWith('http') ? c.linkedin : `https://linkedin.com/in/${c.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                            LinkedIn →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', opacity: 0.5, animation: `waveAnim 0.6s ease-in-out ${i*0.2}s infinite` }}></div>)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 12 }}>
        <input
          className="nav-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Ask your network anything…'
          onKeyDown={e => e.key === 'Enter' && ask()}
          style={{ flex: 1, padding: '16px 20px', background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 100, fontSize: 15, outline: 'none', fontFamily: 'Instrument Sans, sans-serif' }}
        />
        <button className="btn btn-primary" onClick={() => ask()} disabled={loading || !query.trim()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Send
        </button>
      </div>
    </div>
  );
}
