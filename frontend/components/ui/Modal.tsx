'use client';
import { ReactNode, useEffect } from 'react';

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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ width }}>
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