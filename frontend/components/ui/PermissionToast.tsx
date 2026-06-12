'use client';
import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

export interface PermissionToastConfig {
  type:         'success' | 'info' | 'warning' | 'error';
  message:      string;
  triggeredBy?: string;
  duration?:    number;  // ms. 0 = sticky
  changes?: {
    roleName?:        string;
    addedSlugs?:      string[];
    removedSlugs?:    string[];
    affectedModules?: string[];
  };
}

const CFG = {
  success: { icon:'✓', border:'#1D9E75', bg:'#E1F5EE', color:'#0F6E56', label:'Permissions updated'  },
  info:    { icon:'ℹ', border:'#185FA5', bg:'#E6F1FB', color:'#0C447C', label:'Permissions refreshed' },
  warning: { icon:'⚠', border:'#C97B4B', bg:'#FAEEDA', color:'#633806', label:'Access changed'       },
  error:   { icon:'✕', border:'#C0362F', bg:'#FCEBEB', color:'#791F1F', label:'Access revoked'       },
};

function Toast({ type, message, triggeredBy, duration=6000, changes, onDismiss }: PermissionToastConfig & { onDismiss:()=>void }) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cfg = CFG[type];

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 280);
  }, [onDismiss]);

  // Slide in
  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);
  // Auto-dismiss
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(dismiss, duration);
    return () => clearTimeout(t);
  }, [duration, dismiss]);

  const hasChanges = changes && (changes.roleName || (changes.affectedModules?.length) || (changes.addedSlugs?.length) || (changes.removedSlugs?.length));

  return (
    <div style={{
      position:'fixed', top:20, right:20, zIndex:99999,
      width:380, maxWidth:'calc(100vw - 40px)',
      background:'#fff',
      border:`1px solid ${cfg.border}`,
      borderLeft:`4px solid ${cfg.border}`,
      borderRadius:12,
      boxShadow:'0 8px 30px rgba(0,0,0,.18)',
      fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      overflow:'hidden',
      opacity:    visible ? 1 : 0,
      transform:  visible ? 'translateX(0)' : 'translateX(calc(100% + 40px))',
      transition: 'opacity .25s ease, transform .25s cubic-bezier(.4,0,.2,1)',
    }}>

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'14px 14px 10px' }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:cfg.bg, color:cfg.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
          {cfg.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:cfg.color, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:3 }}>
            {cfg.label}
          </div>
          <div style={{ fontSize:13, color:'#222', lineHeight:1.5 }}>{message}</div>
          {triggeredBy && (
            <div style={{ fontSize:11, color:'#888', marginTop:4 }}>
              Changed by <strong style={{ color:'#555' }}>{triggeredBy}</strong>
            </div>
          )}
        </div>
        <button onClick={dismiss}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb', fontSize:20, lineHeight:1, padding:'0 2px', flexShrink:0 }}>×</button>
      </div>

      {/* Expandable changes detail */}
      {hasChanges && (
        <div style={{ borderTop:'1px solid #f0f0f0' }}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ width:'100%', background:'none', border:'none', padding:'7px 14px', cursor:'pointer', fontSize:11, color:'#888', textAlign:'left', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ display:'inline-block', transition:'transform .2s', transform: expanded ? 'rotate(90deg)' : 'none' }}>›</span>
            {expanded ? 'Hide details' : 'What changed?'}
          </button>
          {expanded && (
            <div style={{ padding:'8px 14px 12px', background:'#fafafa', fontSize:12 }}>
              {changes?.roleName && (
                <div style={{ marginBottom:5 }}>
                  <span style={{ color:'#888' }}>Role: </span>
                  <strong>{changes.roleName}</strong>
                </div>
              )}
              {!!changes?.affectedModules?.length && (
                <div style={{ marginBottom:5 }}>
                  <span style={{ color:'#888' }}>Modules: </span>
                  {changes.affectedModules!.map(m => (
                    <span key={m} style={{ display:'inline-block', background:'#E6F1FB', color:'#0C447C', border:'1px solid #B5D4F4', borderRadius:4, padding:'1px 6px', fontSize:10, margin:'0 3px 2px 0', fontWeight:600 }}>
                      {m}
                    </span>
                  ))}
                </div>
              )}
              {!!changes?.addedSlugs?.length && (
                <div style={{ marginBottom:4 }}>
                  <span style={{ color:'#888' }}>Added: </span>
                  {changes.addedSlugs!.slice(0,5).map(s => (
                    <span key={s} style={{ display:'inline-block', background:'#E1F5EE', color:'#0F6E56', border:'1px solid #A2E0C8', borderRadius:4, padding:'1px 5px', fontSize:10, margin:'0 2px 2px 0' }}>+{s}</span>
                  ))}
                  {changes.addedSlugs!.length > 5 && <span style={{ fontSize:10, color:'#888' }}>+{changes.addedSlugs!.length - 5} more</span>}
                </div>
              )}
              {!!changes?.removedSlugs?.length && (
                <div>
                  <span style={{ color:'#888' }}>Removed: </span>
                  {changes.removedSlugs!.slice(0,5).map(s => (
                    <span key={s} style={{ display:'inline-block', background:'#FCEBEB', color:'#791F1F', border:'1px solid #F09595', borderRadius:4, padding:'1px 5px', fontSize:10, margin:'0 2px 2px 0' }}>-{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Shrink bar */}
      {!!duration && (
        <div style={{ height:3, background:'#f0f0f0' }}>
          <div style={{ height:'100%', background:cfg.border, animation:`shrink ${duration}ms linear forwards` }} />
        </div>
      )}
      <style>{`@keyframes shrink{from{width:100%}to{width:0}}`}</style>
    </div>
  );
}

// ─── Imperative API ────────────────────────────────────────────────────────────

export function showPermissionToast(cfg: PermissionToastConfig): void {
  if (typeof window === 'undefined') return;
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  root.render(<Toast {...cfg} onDismiss={() => { root.unmount(); el.remove(); }} />);
}
