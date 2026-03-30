import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

// ── Display own QR ──────────────────────────────────────
export function QRDisplay({ data, size = 200, title = '' }) {
  if (!data) return null;
  return (
    <div className="qr-display" style={{ textAlign: 'center' }}>
      {title && <h3 style={{ marginBottom: 16, fontFamily: 'Space Grotesk' }}>{title}</h3>}
      <div className="qr-wrapper" style={{ 
        padding: 20, 
        background: '#fff', 
        borderRadius: 24, 
        display: 'inline-block',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <QRCodeCanvas 
          value={data} 
          size={size} 
          bgColor="#ffffff" 
          fgColor="#0F1419" 
          level="H"
          includeMargin={false}
          imageSettings={{
            src: "/logo.png", // if you have a logo
            x: undefined,
            y: undefined,
            height: 40,
            width: 40,
            excavate: true,
          }}
        />
      </div>
      <p style={{ marginTop: 20, color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
        Point another device's camera here
      </p>
    </div>
  );
}


// ── Scan a QR (camera) ─────────────────────────────────
export function QRScanner({ onResult, onClose }) {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;
        
        const scanner = new Html5Qrcode('qr-scanner-region');
        html5QrRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (!isMounted) return;
            setScanning(false);
            try {
              if (html5QrRef.current?.isScanning) {
                await html5QrRef.current.stop();
              }
            } catch (e) {
              console.warn('Stop failed', e);
            }
            
            try {
              const parsed = JSON.parse(decodedText);
              onResult(parsed);
            } catch {
              onResult({ raw: decodedText });
            }
          },
          () => {}
        );
        if (isMounted) setScanning(true);
      } catch (err) {
        if (isMounted) {
          setError('Camera not available or permission denied.');
          console.error(err);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrRef.current?.isScanning) {
        html5QrRef.current.stop().catch(err => console.warn('Cleanup stop failed', err));
      }
    };
  }, []);


  return (
    <div className="qr-scanner-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 99999 }}>
      <div className="qr-scanner-modal glass" style={{ 
        maxWidth: 400, 
        width: '90%', 
        borderRadius: 32, 
        padding: 0, 
        overflow: 'hidden',
        boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div className="modal-header" style={{ border: 'none', padding: '24px 28px' }}>
          <div>
            <h2 style={{ fontSize: 24, marginBottom: 4, fontFamily: 'Space Grotesk' }}>Scan QR</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Align code within the frame</p>
          </div>
          <button className="modal-close" onClick={() => { html5QrRef.current?.stop().catch(()=>{}); onClose(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        
        <div style={{ position: 'relative', padding: '0 28px 28px' }}>
          {error ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: 16, borderRadius: 16, marginBottom: 20 }}>
                {error}
              </div>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>Close Scanner</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div id="qr-scanner-region" style={{ 
                width: '100%', 
                borderRadius: 24, 
                overflow: 'hidden',
                background: '#000',
                aspectRatio: '1/1',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)'
              }}></div>
              
              {/* Animated scan frame overlay */}
              {scanning && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <div className="scanner-frame" style={{
                    width: '60%',
                    height: '60%',
                    border: '2px solid var(--accent)',
                    borderRadius: 20,
                    boxShadow: '0 0 0 1000px rgba(0,0,0,0.4)',
                    position: 'relative'
                  }}>
                    <div className="scan-line" />
                  </div>
                </div>
              )}
              
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Scanning for user profiles or event codes...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

  );
}
