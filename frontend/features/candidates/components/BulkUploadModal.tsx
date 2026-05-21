'use client';
import { useState, useRef } from 'react';
import { Modal }            from '../../../components/ui/Modal';
import { useBulkUpload }    from '../hooks/useCandidates';
import type { BulkUploadResult } from '../types/candidate.types';

interface Props {
  open:    boolean;
  onClose: () => void;
}

const CSV_HEADERS = [
  'candidate_name','email','phone_number','gender','date_of_birth',
  'current_company_name','last_company_designation','qualification',
  'location','total_experience','relevant_experience','skills',
  'current_salary','expected_salary','notice_period','notice_period_unit',
  'immediate_joiner','expected_joining_date','own_vehicle',
  'source','reference_source','remarks',
].join(',');

const SAMPLE_ROW = [
  'Priya Sharma','priya@gmail.com','+919876543210','Female','1995-05-15',
  'Infosys','Senior Engineer','B.E. Computer Science','Bengaluru',
  '5','4','React,Node.js,MySQL',
  '75000','90000','30','Days',
  'false','2026-07-01','true',
  'Naukri','Job portal','Strong profile - fast track',
].join(',');

export function BulkUploadModal({ open, onClose }: Props) {
  const fileRef           = useRef<HTMLInputElement>(null);
  const [file, setFile]   = useState<File | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const bulkMutation = useBulkUpload();

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) { alert('Please upload a CSV file (.csv)'); return; }
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    const res = await bulkMutation.mutateAsync(file);
    setResult(res.data);
  };

  const downloadTemplate = () => {
    const content = `${CSV_HEADERS}\n${SAMPLE_ROW}`;
    const blob = new Blob([content], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'nexhr_candidates_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Upload Candidates"
      subtitle="Import multiple candidates at once from a CSV file"
      width={560}
      footer={
        result ? (
          <button className="btn btn-pri" onClick={handleClose}>Done</button>
        ) : (
          <>
            <button className="btn btn-sec" onClick={handleClose}>Cancel</button>
            <button
              className="btn btn-pri"
              onClick={handleUpload}
              disabled={!file || bulkMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {bulkMutation.isPending && (
                <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
              )}
              {bulkMutation.isPending ? 'Uploading…' : '↑ Upload CSV'}
            </button>
          </>
        )
      }
    >
      {!result ? (
        <>
          {/* Download template */}
          <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 2 }}>Download template first</div>
              <div style={{ fontSize: 11, color: 'var(--ink4)' }}>22 fields — fill in the CSV and upload</div>
            </div>
            <button className="btn btn-sec btn-sm" onClick={downloadTemplate}>↓ Template</button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border:       `2px dashed ${dragOver ? 'var(--blue)' : file ? 'var(--green)' : 'var(--border2)'}`,
              borderRadius: 'var(--r2)',
              padding:      '32px 24px',
              textAlign:    'center',
              cursor:       'pointer',
              background:   dragOver ? 'var(--blue-lt)' : file ? 'var(--green-lt)' : 'var(--surface2)',
              transition:   'all .15s',
              marginBottom: 16,
            }}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            <div style={{ fontSize: 32, marginBottom: 10 }}>{file ? '✅' : '📄'}</div>
            {file ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{(file.size / 1024).toFixed(1)} KB · Click to replace</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Drop CSV here or click to browse</div>
                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Max 5 MB · CSV files only</div>
              </>
            )}
          </div>

          {/* Column reference */}
          <details style={{ cursor: 'pointer' }}>
            <summary style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, userSelect: 'none', marginBottom: 8 }}>
              View expected column names ↓
            </summary>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '10px 12px', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink3)', lineHeight: 1.8, wordBreak: 'break-all' }}>
              {CSV_HEADERS.split(',').map((h, i) => (
                <span key={h}>
                  <span style={{ background: 'var(--border)', borderRadius: 3, padding: '1px 5px', marginRight: 4, marginBottom: 3, display: 'inline-block' }}>{h}</span>
                </span>
              ))}
            </div>
          </details>
        </>
      ) : (
        /* Upload result */
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total rows',  value: result.total,   color: 'var(--blue)'  },
              { label: '✓ Imported',  value: result.success, color: 'var(--green)' },
              { label: '✗ Failed',    value: result.failed,  color: result.failed > 0 ? 'var(--red)' : 'var(--ink4)' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: s.color, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {result.success > 0 && (
            <div style={{ background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--green)', marginBottom: 16 }}>
              ✓ {result.success} candidate{result.success !== 1 ? 's' : ''} successfully added to the pipeline
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>Failed rows:</div>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                {result.errors.map((e) => (
                  <div key={e.row} style={{ display: 'flex', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink4)', flexShrink: 0, minWidth: 50 }}>Row {e.row}</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 600, flexShrink: 0 }}>{e.name}</span>
                    <span style={{ color: 'var(--red)', flex: 1 }}>{e.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
