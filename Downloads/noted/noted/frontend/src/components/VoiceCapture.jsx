import React, { useState, useRef, useEffect } from 'react';

/**
 * VoiceCapture — Full voice recording + real-time Web Speech API transcription
 * Props:
 *   onDone({ voiceNote: base64, transcript, tags, intent, aiSummary })
 *   onCancel()
 */
export default function VoiceCapture({ onDone, onCancel, name = '', company = '', role = '' }) {
  const [phase, setPhase] = useState('idle'); // idle | recording | processing | done
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [partialText, setPartialText] = useState('');
  const [tags, setTags] = useState([]);
  const [intent, setIntent] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [audioSrc, setAudioSrc] = useState('');

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  const TAG_MAP = {
    '#Founder': ['founder', 'co-founder', 'started a company'],
    '#Investor': ['investor', 'invest', 'vc', 'funding', 'venture capital'],
    '#Hiring': ['hiring', "we're hiring", 'recruiting', 'job opening', 'looking for'],
    '#Student': ['student', 'college', 'university', 'intern', 'campus'],
    '#Developer': ['developer', 'engineer', 'software', 'coding', 'programmer'],
    '#Designer': ['designer', 'ux', 'ui', 'figma', 'creative'],
    '#AI': ['ai', 'machine learning', 'gpt', 'llm', 'deep learning'],
    '#Startup': ['startup', 'early stage', 'mvp', 'launch'],
    '#Collab': ['collaborate', 'collab', 'partner', 'work together'],
    '#Marketing': ['marketing', 'growth', 'seo', 'content', 'ads'],
  };

  const extractTags = (text) => {
    const lower = text.toLowerCase();
    const found = [];
    for (const [tag, kws] of Object.entries(TAG_MAP)) {
      if (kws.some(k => lower.includes(k))) found.push(tag);
    }
    return found.slice(0, 6);
  };

  const extractIntent = (text) => {
    const t = text.toLowerCase();
    if (['hiring', 'job', 'position', 'role'].some(w => t.includes(w))) return 'hiring';
    if (['invest', 'funding', 'seed', 'vc'].some(w => t.includes(w))) return 'investment';
    if (['collab', 'partner', 'work together'].some(w => t.includes(w))) return 'collaboration';
    if (['student', 'intern', 'learn'].some(w => t.includes(w))) return 'learning';
    return 'networking';
  };

  const buildSummary = (txt, intentVal) => {
    const parts = [];
    if (role) parts.push(role);
    if (company) parts.push(`at ${company}`);
    if (intentVal && intentVal !== 'networking') parts.push(`— ${intentVal}`);
    const first = txt.split('.')[0]?.slice(0, 80)?.trim();
    if (first) parts.push(`"${first}"`);
    return parts.length ? `${name}: ${parts.slice(0, 3).join(', ')}` : `Met ${name} at a networking event.`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunks.current = [];

      // Audio recording
      const mr = new MediaRecorder(stream);
      mediaRecorder.current = mr;
      mr.ondataavailable = e => audioChunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => setAudioSrc(reader.result);
        reader.readAsDataURL(blob);
      };
      mr.start(200);

      // Speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        let finalTranscript = '';
        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalTranscript += t + ' ';
            else interim = t;
          }
          setTranscript(finalTranscript);
          setPartialText(interim);
        };
        recognition.start();
        recognitionRef.current = recognition;
      }

      setPhase('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= 19) { stopRecording(); return s; }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      alert('Microphone permission denied');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorder.current?.state !== 'inactive') mediaRecorder.current?.stop();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    setPhase('processing');
    setTimeout(() => process(), 800);
  };

  const process = () => {
    setTranscript(prev => {
      const full = prev.trim();
      const detectedTags = extractTags(full);
      const detectedIntent = extractIntent(full);
      const summary = buildSummary(full, detectedIntent);
      setTags(detectedTags);
      setIntent(detectedIntent);
      setAiSummary(summary);
      setPhase('done');
      return full;
    });
  };

  const handleDone = () => {
    onDone({ transcript, tags, intent, aiSummary, audioSrc });
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const intentColors = { hiring: '#34D399', investment: '#F59E0B', collaboration: '#818CF8', learning: '#60A5FA', networking: '#9CA3AF' };

  return (
    <div className="voice-capture">
      {/* Idle */}
      {phase === 'idle' && (
        <div className="record-ui">
          <div className="record-circle" onClick={startRecording}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </div>
          <p className="record-status">Tap to start recording</p>
          <p className="record-time">0:00</p>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>Max 20 seconds · Auto-transcribed</p>
        </div>
      )}

      {/* Recording */}
      {phase === 'recording' && (
        <div className="record-ui">
          <div className="record-circle recording" onClick={stopRecording}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28 }}>
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </div>
          <p className="record-status" style={{ color: '#EF4444' }}>Recording… tap to stop</p>
          <p className={`record-time recording`}>{formatTime(seconds)}</p>
          {/* Live transcript */}
          {(transcript || partialText) && (
            <div className="live-transcript glass">
              <p style={{ fontSize: 13, color: 'var(--fg)' }}>{transcript}</p>
              {partialText && <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{partialText}</p>}
            </div>
          )}
        </div>
      )}

      {/* Processing */}
      {phase === 'processing' && (
        <div className="record-ui">
          <div className="processing-anim">
            <div className="processing-ring"></div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 36, height: 36, color: 'var(--accent)' }}>
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <p className="record-status" style={{ marginTop: 20 }}>AI is processing your note…</p>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div style={{ padding: '0 4px' }}>
          {/* Audio preview */}
          {audioSrc && <audio controls src={audioSrc} style={{ width: '100%', marginBottom: 16 }}></audio>}

          {/* Transcript */}
          {transcript && (
            <div className="result-block glass" style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>Transcript</h4>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{transcript || 'No speech detected'}</p>
            </div>
          )}

          {/* AI Summary */}
          {aiSummary && (
            <div className="result-block" style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(79,70,229,0.06)', borderRadius: 12, border: '1px solid rgba(79,70,229,0.15)' }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 6 }}>✨ AI Summary</h4>
              <p style={{ fontSize: 14 }}>{aiSummary}</p>
            </div>
          )}

          {/* Intent */}
          {intent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Intent:</span>
              <span style={{ background: intentColors[intent] || '#9CA3AF', color: 'white', padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                {intent.charAt(0).toUpperCase() + intent.slice(1)}
              </span>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>Auto Tags</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tags.map(tag => (
                  <span key={tag} style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'white', padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => { setPhase('idle'); setTranscript(''); setTags([]); setAiSummary(''); setIntent(''); setAudioSrc(''); }}>Re-record</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleDone}>
              Save Voice Note →
            </button>
          </div>
        </div>
      )}

      {phase === 'idle' && (
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Skip</button>
        </div>
      )}
    </div>
  );
}
