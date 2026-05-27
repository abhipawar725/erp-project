'use client';
import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 480 }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <div
      className={`modal-bg${open ? ' open' : ''}`}
    >
      <div className="modal" style={{ width }}>
        <button type='button' 
        onClick={onClose} 
        style={{position: 'absolute', top: '10px', right: '10px', border: 0, background: 'transparent', zIndex: 1, cursor: 'pointer'}}>
          <X size={18} />
          </button>
        <div className="modal-ttl">{title}</div>
        {subtitle && <div className="modal-sub">{subtitle}</div>}
        <div>{children}</div>
        {footer && (
          <div className="modal-ft">{footer}</div>
        )}
      </div>
    </div>
  );
}