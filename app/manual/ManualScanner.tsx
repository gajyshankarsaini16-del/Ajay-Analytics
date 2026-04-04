'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

interface ManualScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function ManualScanner({ onScanSuccess, onClose }: ManualScannerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render((decodedText) => {
      // Handle the scanned URL/ID
      // Expected format is http://.../f/[id] or just [id]
      const parts = decodedText.split('/');
      const id = parts[parts.length - 1];
      onScanSuccess(id);
      scanner.clear();
      onClose();
    }, (err) => {
      // For performance reasons, we don't show every error (scanning in progress)
    });

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [onScanSuccess, onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        padding: '2rem',
        borderRadius: '1.5rem',
        width: '100%',
        maxWidth: '500px',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Camera size={32} style={{ color: '#6366f1', marginBottom: '0.5rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.25rem', margin: 0 }}>Scan Form QR Code</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Align the QR code inside the frame</p>
        </div>

        <div id="qr-reader" style={{ border: 'none', borderRadius: '1rem', overflow: 'hidden' }}></div>
        
        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '1rem', textAlign: 'center' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
