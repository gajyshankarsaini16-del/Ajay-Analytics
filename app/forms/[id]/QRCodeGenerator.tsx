'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Copy, Check } from 'lucide-react';

export default function QRCodeGenerator({ formPath }: { formPath: string }) {
  const [fullUrl, setFullUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFullUrl(window.location.origin + formPath);
    }
  }, [formPath]);

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "form-qr-code.png";
      link.href = url;
      link.click();
    }
  };

  if (!fullUrl) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <input 
          type="text" 
          readOnly 
          value={fullUrl} 
          style={{
            width: '100%',
            padding: '0.75rem 3rem 0.75rem 1rem',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9rem'
          }} 
        />
        <button 
          onClick={copyLink}
          style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: copied ? '#10b981' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div ref={qrRef} style={{ background: '#fff', padding: '12px', borderRadius: '8px', flexShrink: 0 }}>
          <QRCodeCanvas
            value={fullUrl}
            size={120}
            bgColor={"#ffffff"}
            fgColor={"#0f172a"}
            level={"H"}
            includeMargin={false}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>QR Download</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
            Scan this code to open the public form on any mobile device.
          </p>
          <button 
            onClick={downloadQR}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px', 
              padding: '10px 16px', 
              background: '#6366f1', 
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
          >
            <Download size={14} /> Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
