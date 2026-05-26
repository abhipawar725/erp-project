'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch }    from '../../../../store';
import { setPageTitle }      from '../../../../store/slices/uiSlice';
import { AppShell }          from '../../../../layouts/AppLayout';
import { Modal }             from '../../../../components/ui/Modal';
import { Chip }              from '../../../../components/ui/Chip';
import {
  useEmailBranding, useSaveEmailBranding,
  useEmailTemplates, useEmailTemplate,
  useSaveEmailTemplate, useResetEmailTemplate,
  useToggleEmailTemplate, useEmailPreview, useSendTestEmail,
} from '../../../../features/email-templates/hooks/useEmailTemplates';
import {
  EMAIL_TEMPLATE_CATEGORIES, EMAIL_TEMPLATE_LABELS, TEMPLATE_VARIABLES,
  FONT_OPTIONS, DEFAULT_BRANDING,
  type EmailTemplateType, type SaveBrandingDto, type EmailBranding,
} from '../../../../features/email-templates/types/emailTemplate.types';
import { showToast } from '../../../../utils/toast';
import { formatDate } from '../../../../utils/formatters';

// ─── Color picker field ───────────────────────────────────────────────────────
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="fg">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: 40, height: 32, padding: 2, cursor: 'pointer', borderRadius: 'var(--r)', border: '1px solid var(--border2)' }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}
          placeholder="#1e56d9"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmailTemplatesPage() {
  const dispatch = useAppDispatch();

  // Tab: 'branding' | 'templates'
  const [activeTab,    setActiveTab]    = useState<'branding' | 'templates'>('branding');
  // Selected template for editing
  const [activeType,   setActiveType]   = useState<EmailTemplateType | null>(null);
  // Preview state
  const [previewHtml,  setPreviewHtml]  = useState<string>('');
  const [previewOpen,  setPreviewOpen]  = useState(false);
  // Test email modal
  const [testOpen,     setTestOpen]     = useState(false);
  const [testEmail,    setTestEmail]    = useState('');
  // Reset confirm
  const [resetConfirm, setResetConfirm] = useState(false);

  // Branding form state
  const [branding, setBranding] = useState<SaveBrandingDto>({ ...DEFAULT_BRANDING });

  // Template editor state
  const [tplSubject,  setTplSubject]  = useState('');
  const [tplBody,     setTplBody]     = useState('');
  const [tplPreview,  setTplPreview]  = useState('');
  const [useDefault,  setUseDefault]  = useState(true);

  // Hooks
  const { data: brandingData }             = useEmailBranding();
  const { data: templates = [], isLoading: tplLoading } = useEmailTemplates();
  const { data: selectedTpl }              = useEmailTemplate(activeType ?? 'password_reset');
  const saveBranding                       = useSaveEmailBranding();
  const saveTemplate                       = useSaveEmailTemplate(activeType ?? 'password_reset');
  const resetTemplate                      = useResetEmailTemplate(activeType ?? 'password_reset');
  const toggleMutation                     = useToggleEmailTemplate();
  const previewMutation                    = useEmailPreview();
  const testMutation                       = useSendTestEmail();

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Email Templates', breadcrumb: 'Settings' }));
  }, [dispatch]);

  // Load branding into form
  useEffect(() => {
    if (brandingData) {
      setBranding({
        company_name:        brandingData.company_name,
        logo_url:            brandingData.logo_url || null,
        logo_width:          brandingData.logo_width || 120,
        primary_color:       brandingData.primary_color,
        secondary_color:     brandingData.secondary_color,
        accent_color:        brandingData.accent_color,
        font_family:         brandingData.font_family,
        header_bg:           brandingData.header_bg,
        card_bg:             brandingData.card_bg,
        card_border_radius:  brandingData.card_border_radius,
        body_bg:             brandingData.body_bg,
        footer_text:         brandingData.footer_text,
        footer_bg:           brandingData.footer_bg,
        show_social_links:   brandingData.show_social_links,
        social_linkedin:     brandingData.social_linkedin || null,
        social_twitter:      brandingData.social_twitter || null,
        from_name:           brandingData.from_name,
        from_email:          brandingData.from_email,
        reply_to:            brandingData.reply_to || null,
        letterhead_html:     brandingData.letterhead_html || null,
      });
    }
  }, [brandingData]);

  // Load template into editor when selected
  useEffect(() => {
    if (selectedTpl && activeType) {
      setTplSubject(selectedTpl.subject || '');
      setTplBody(selectedTpl.body_html || selectedTpl.default_body || '');
      setTplPreview(selectedTpl.preview_text || '');
      setUseDefault(!selectedTpl.is_custom);
    }
  }, [selectedTpl, activeType]);

  const b = (k: keyof SaveBrandingDto, v: any) => setBranding(p => ({ ...p, [k]: v }));

  // Generate live preview
  const generatePreview = useCallback(async () => {
    if (!activeType) return;
    const result = await previewMutation.mutateAsync({
      type:            activeType,
      brandingOverride: branding as Partial<EmailBranding>,
      bodyOverride:    useDefault ? undefined : tplBody,
    });
    if (result?.data?.html) {
      setPreviewHtml(result.data.html);
      setPreviewOpen(true);
    }
  }, [activeType, branding, tplBody, useDefault]);

  const handleSaveTemplate = async () => {
    if (!activeType) return;
    await saveTemplate.mutateAsync({
      subject:      tplSubject || null,
      body_html:    useDefault ? null : tplBody,
      preview_text: tplPreview || null,
    });
  };

  const handleReset = async () => {
    if (!activeType) return;
    await resetTemplate.mutateAsync();
    setResetConfirm(false);
    setUseDefault(true);
  };

  const handleSendTest = async () => {
    if (!activeType || !testEmail) return;
    await testMutation.mutateAsync({ type: activeType, toEmail: testEmail });
    setTestOpen(false);
    setTestEmail('');
  };

  // Group templates by category
  const tplMap = new Map(templates.map(t => [t.type, t]));

  return (
    <AppShell>
      <div className="pg-enter">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="ph">
          <div>
            <h1>Email Templates</h1>
            <p>Customise branding, letterhead and content for all system emails — per company</p>
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 3, marginBottom: 20, width: 'fit-content' }}>
          {([['branding','🎨 Branding & Letterhead'],['templates','📧 Templates']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 20px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: activeTab === tab ? 'var(--surface)' : 'transparent', color: activeTab === tab ? 'var(--ink)' : 'var(--ink4)', boxShadow: activeTab === tab ? 'var(--sh)' : 'none', fontFamily: 'var(--font)', transition: 'all .1s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══════════════ BRANDING TAB ═══════════════ */}
        {activeTab === 'branding' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left: controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Company identity */}
              <div className="card cp">
                <div className="ct">Company Identity</div>
                <div className="fg"><label>Company Name *</label><input value={branding.company_name} onChange={e => b('company_name', e.target.value)} placeholder="Acme Pvt Ltd" /></div>
                <div className="fg"><label>Logo URL</label><input value={branding.logo_url || ''} onChange={e => b('logo_url', e.target.value || null)} placeholder="https://cdn.example.com/logo.png" /><span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>Hosted image URL (PNG/SVG recommended)</span></div>
                <div className="fg"><label>Logo Width (px)</label><input type="number" min="60" max="300" value={branding.logo_width || 120} onChange={e => b('logo_width', Number(e.target.value))} /></div>
              </div>

              {/* Sender info */}
              <div className="card cp">
                <div className="ct">Sender Information</div>
                <div className="fg"><label>From Name *</label><input value={branding.from_name} onChange={e => b('from_name', e.target.value)} placeholder="HR Team" /></div>
                <div className="fg"><label>From Email *</label><input type="email" value={branding.from_email} onChange={e => b('from_email', e.target.value)} placeholder="hr@company.com" /></div>
                <div className="fg"><label>Reply-To Email</label><input type="email" value={branding.reply_to || ''} onChange={e => b('reply_to', e.target.value || null)} placeholder="Optional" /></div>
              </div>

              {/* Colors */}
              <div className="card cp">
                <div className="ct">Color Scheme</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  <ColorField label="Primary (buttons)"    value={branding.primary_color}   onChange={v => b('primary_color', v)} />
                  <ColorField label="Secondary (headings)" value={branding.secondary_color} onChange={v => b('secondary_color', v)} />
                  <ColorField label="Body background"      value={branding.body_bg}         onChange={v => b('body_bg', v)} />
                  <ColorField label="Card background"      value={branding.card_bg}         onChange={v => b('card_bg', v)} />
                  <ColorField label="Header background"    value={branding.header_bg}       onChange={v => b('header_bg', v)} />
                  <ColorField label="Footer background"    value={branding.footer_bg}       onChange={v => b('footer_bg', v)} />
                </div>
                <div className="fg">
                  <label>Card border radius (px)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="range" min="0" max="24" value={branding.card_border_radius} onChange={e => b('card_border_radius', Number(e.target.value))} style={{ flex: 1 }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, minWidth: 28 }}>{branding.card_border_radius}px</span>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="card cp">
                <div className="ct">Typography</div>
                <div className="fg">
                  <label>Font Family</label>
                  <select value={branding.font_family} onChange={e => b('font_family', e.target.value)}>
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="card cp">
                <div className="ct">Footer</div>
                <div className="fg">
                  <label>Footer Text <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--ink4)' }}>— HTML allowed · use {'{year}'} and {'{company_name}'}</span></label>
                  <textarea rows={3} value={branding.footer_text} onChange={e => b('footer_text', e.target.value)} style={{ fontSize: 12, fontFamily: 'var(--mono)' }} />
                </div>
                <div className="fg">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                    <input type="checkbox" checked={branding.show_social_links} onChange={e => b('show_social_links', e.target.checked)} style={{ width: 14, height: 14, accentColor: 'var(--blue)', cursor: 'pointer' }} />
                    Show social links in footer
                  </label>
                </div>
                {branding.show_social_links && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                    <div className="fg"><label>LinkedIn URL</label><input type="url" value={branding.social_linkedin || ''} onChange={e => b('social_linkedin', e.target.value || null)} /></div>
                    <div className="fg"><label>Twitter/X URL</label><input type="url" value={branding.social_twitter || ''} onChange={e => b('social_twitter', e.target.value || null)} /></div>
                  </div>
                )}
              </div>

              {/* Letterhead */}
              <div className="card cp">
                <div className="ct">Letterhead HTML <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink4)', textTransform: 'none' }}>— for formal letters (offer, confirmation)</span></div>
                <div className="fg">
                  <textarea
                    rows={5}
                    value={branding.letterhead_html || ''}
                    onChange={e => b('letterhead_html', e.target.value || null)}
                    style={{ fontSize: 12, fontFamily: 'var(--mono)' }}
                    placeholder={`<table width="100%" style="border-bottom:2px solid #1e56d9;padding-bottom:12px;margin-bottom:16px;">\n  <tr>\n    <td><strong>Acme Pvt Ltd</strong></td>\n    <td style="text-align:right;color:#64748b;">123 Business Park, Mumbai</td>\n  </tr>\n</table>`}
                  />
                </div>
              </div>

              {/* Save button */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-pri"
                  style={{ flex: 1 }}
                  onClick={() => saveBranding.mutate(branding)}
                  disabled={saveBranding.isPending}
                >
                  {saveBranding.isPending ? 'Saving…' : '✓ Save Branding'}
                </button>
                <button
                  className="btn btn-sec"
                  onClick={() => {
                    previewMutation.mutate({
                      type: 'welcome',
                      brandingOverride: branding as Partial<EmailBranding>,
                    }, {
                      onSuccess: res => { if (res?.data?.html) { setPreviewHtml(res.data.html); setPreviewOpen(true); } }
                    });
                  }}
                  disabled={previewMutation.isPending}
                >
                  👁 Preview
                </button>
              </div>
            </div>

            {/* Right: live preview */}
            <div style={{ position: 'sticky', top: 80 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Live Preview
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r2)', overflow: 'hidden', background: branding.body_bg }}>
                {/* Mock email preview */}
                <div style={{ padding: '20px 24px', background: branding.header_bg, borderBottom: '1px solid var(--border)' }}>
                  {branding.logo_url
                    ? <img src={branding.logo_url} alt="logo" style={{ height: 32 }} />
                    : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: branding.primary_color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {branding.company_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: branding.secondary_color }}>{branding.company_name}</span>
                      </div>
                    )
                  }
                </div>
                <div style={{ padding: '20px 24px', background: branding.card_bg, borderRadius: branding.card_border_radius, margin: 16, border: '1px solid #e0e4ec' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: branding.secondary_color, marginBottom: 8 }}>Sample Email Heading</div>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
                    Hi <strong>{branding.company_name}</strong>,<br />
                    This is a preview of how your emails will look with the current branding settings.
                  </p>
                  <div>
                    <a href="#" style={{ display: 'inline-block', background: branding.primary_color, color: '#fff', padding: '9px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      Action Button →
                    </a>
                  </div>
                </div>
                <div style={{ padding: '12px 24px', background: branding.footer_bg, textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>
                  {branding.footer_text.replace(/\{year\}/g, String(new Date().getFullYear())).replace(/\{company_name\}/g, branding.company_name).replace(/<[^>]+>/g, ' ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ TEMPLATES TAB ═══════════════ */}
        {activeTab === 'templates' && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left: template list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tplLoading
                ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="card cp"><div className="skeleton" style={{ height: 14, width: '70%' }} /></div>)
                : Object.entries(EMAIL_TEMPLATE_CATEGORIES).map(([category, types]) => (
                    <div key={category}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', marginBottom: 6, paddingLeft: 2 }}>
                        {category}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {types.map(type => {
                          const tpl = tplMap.get(type);
                          const isActive   = tpl ? tpl.is_active : true;
                          const isCustom   = tpl?.is_custom ?? false;
                          const isSelected = activeType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setActiveType(type)}
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '9px 12px', border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                                borderRadius: 'var(--r)', background: isSelected ? 'var(--blue-lt)' : 'var(--surface)',
                                cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font)',
                                transition: 'all .1s',
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--blue)' : isActive ? 'var(--ink)' : 'var(--ink4)' }}>
                                {EMAIL_TEMPLATE_LABELS[type]}
                              </span>
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                {isCustom && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--teal-lt)', color: 'var(--teal)', fontWeight: 600 }}>Custom</span>}
                                {!isActive && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--surface2)', color: 'var(--ink4)', fontWeight: 600 }}>Off</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
              }
            </div>

            {/* Right: template editor */}
            {!activeType ? (
              <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--ink4)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Select a template to edit</div>
                <div style={{ fontSize: 12 }}>Choose any template from the list to customise its subject, content, and preview text</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Editor header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{EMAIL_TEMPLATE_LABELS[activeType]}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>
                      {selectedTpl?.is_custom ? 'Custom template' : 'Using system default'}
                      {selectedTpl?.updated_at && ` · Updated ${formatDate(selectedTpl.updated_at)}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sec btn-sm" onClick={() => setTestOpen(true)}>Send Test</button>
                    <button className="btn btn-sec btn-sm" onClick={generatePreview} disabled={previewMutation.isPending}>
                      {previewMutation.isPending ? '…' : '👁 Preview'}
                    </button>
                    <button className="btn btn-sec btn-sm" style={{ color: 'var(--amber)' }} onClick={() => setResetConfirm(true)}>
                      Reset
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <div style={{ position: 'relative', width: 36, height: 20 }}>
                        <input
                          type="checkbox"
                          checked={tplMap.get(activeType)?.is_active ?? true}
                          onChange={e => toggleMutation.mutate({ type: activeType!, isActive: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 99,
                          background: (tplMap.get(activeType)?.is_active ?? true) ? 'var(--green)' : 'var(--border2)',
                          transition: 'background .2s', cursor: 'pointer',
                        }} onClick={() => toggleMutation.mutate({ type: activeType!, isActive: !(tplMap.get(activeType)?.is_active ?? true) })}>
                          <div style={{ position: 'absolute', top: 2, left: (tplMap.get(activeType)?.is_active ?? true) ? 18 : 2, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink4)' }}>Enabled</span>
                    </label>
                  </div>
                </div>

                {/* Available variables */}
                <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink4)', marginBottom: 6 }}>Available variables</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {['{company_name}', '{year}', ...(TEMPLATE_VARIABLES[activeType] || [])].map(v => (
                      <code
                        key={v}
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: 'var(--blue)' }}
                        title="Click to copy"
                        onClick={() => { navigator.clipboard.writeText(v); showToast(`Copied ${v}`); }}
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Custom / Default toggle */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {([['true','📝 Use system default'],['false','✏ Custom content']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setUseDefault(val === 'true')}
                      style={{
                        padding: '6px 14px', borderRadius: 'var(--r)', border: `1px solid ${(val === 'true') === useDefault ? 'var(--blue)' : 'var(--border)'}`,
                        background: (val === 'true') === useDefault ? 'var(--blue-lt)' : 'var(--surface2)',
                        color: (val === 'true') === useDefault ? 'var(--blue)' : 'var(--ink4)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {useDefault ? (
                  <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 12, color: 'var(--blue)' }}>
                    ℹ Using the system default template. Branding (colours, logo, footer) will still be applied. Switch to <strong>Custom content</strong> to override the email body.
                  </div>
                ) : (
                  <>
                    {/* Subject */}
                    <div className="fg">
                      <label>Subject Line <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--ink4)' }}>— leave empty to use system default</span></label>
                      <input
                        value={tplSubject}
                        onChange={e => setTplSubject(e.target.value)}
                        placeholder="e.g. Your interview is scheduled for {interview_date}"
                      />
                    </div>

                    {/* Preview text */}
                    <div className="fg">
                      <label>Email Preview Text <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--ink4)' }}>— shown in inbox preview</span></label>
                      <input
                        value={tplPreview}
                        onChange={e => setTplPreview(e.target.value)}
                        placeholder="e.g. Your interview has been scheduled…"
                        maxLength={200}
                      />
                    </div>

                    {/* HTML body editor */}
                    <div className="fg">
                      <label>Email Body HTML <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span></label>
                      <div style={{ border: '1px solid var(--border2)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                        {/* Toolbar */}
                        <div style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)', padding: '6px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[
                            ['Bold',   '<strong>{text}</strong>'],
                            ['Italic', '<em>{text}</em>'],
                            ['H2',     '<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">{text}</h2>'],
                            ['P',      '<p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">{text}</p>'],
                            ['Button', `<a href="#" style="display:inline-block;background:#1e56d9;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;">{text}</a>`],
                            ['Table',  `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f9fb;border-radius:8px;padding:14px;margin-bottom:20px;"><tbody><tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:45%;">Label</td><td style="padding:6px 0;font-size:12px;font-weight:600;">Value</td></tr></tbody></table>`],
                          ].map(([label, snippet]) => (
                            <button
                              key={label}
                              type="button"
                              className="btn btn-sec btn-sm"
                              style={{ fontSize: 10, padding: '3px 8px' }}
                              onClick={() => setTplBody(prev => prev + '\n' + snippet)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={tplBody}
                          onChange={e => setTplBody(e.target.value)}
                          rows={16}
                          style={{ width: '100%', border: 'none', padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6, resize: 'vertical', outline: 'none' }}
                          placeholder="Enter HTML email body…"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Save */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-pri"
                    onClick={handleSaveTemplate}
                    disabled={saveTemplate.isPending}
                    style={{ flex: 1 }}
                  >
                    {saveTemplate.isPending ? 'Saving…' : '✓ Save Template'}
                  </button>
                  <button className="btn btn-sec" onClick={generatePreview} disabled={previewMutation.isPending}>
                    👁 Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Preview modal ─────────────────────────────────────────────── */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Email Preview" width={640}
        footer={<button className="btn btn-sec" onClick={() => setPreviewOpen(false)}>Close</button>}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', maxHeight: 520, overflowY: 'auto' }}>
          <iframe
            srcDoc={previewHtml}
            style={{ width: '100%', height: 480, border: 'none', display: 'block' }}
            title="Email Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </Modal>

      {/* ── Send test email modal ─────────────────────────────────────── */}
      <Modal open={testOpen} onClose={() => setTestOpen(false)} title="Send Test Email"
        subtitle={`Send a test "${activeType ? EMAIL_TEMPLATE_LABELS[activeType] : ''}" email`}
        width={420}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setTestOpen(false)}>Cancel</button>
            <button className="btn btn-pri" onClick={handleSendTest} disabled={!testEmail || testMutation.isPending}>
              {testMutation.isPending ? 'Sending…' : '✉ Send Test'}
            </button>
          </>
        }>
        <div className="fg">
          <label>Send to email address *</label>
          <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" autoFocus onKeyDown={e => e.key === 'Enter' && handleSendTest()} />
        </div>
        <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12, color: 'var(--blue)' }}>
          ℹ Sample data will be used for variable substitution. Branding and current template settings apply.
        </div>
      </Modal>

      {/* ── Reset confirm modal ───────────────────────────────────────── */}
      <Modal open={resetConfirm} onClose={() => setResetConfirm(false)} title="Reset Template"
        subtitle={`Reset "${activeType ? EMAIL_TEMPLATE_LABELS[activeType] : ''}" to system default?`}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setResetConfirm(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleReset} disabled={resetTemplate.isPending}>
              {resetTemplate.isPending ? 'Resetting…' : 'Yes, Reset'}
            </button>
          </>
        }>
        <div style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--amber)' }}>
          ⚠ Your custom subject and body will be deleted. The template will revert to the system default content. Branding (colours, logo) is unaffected.
        </div>
      </Modal>
    </AppShell>
  );
}
