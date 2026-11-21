'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

export type ReportType = 'pdf' | 'excel';

export type ReportStage =
  | 'fetching'
  | 'rendering'
  | 'exporting'
  | 'done'
  | 'error';

export interface ReportJob {
  id: string;
  label: string;
  type: ReportType;
  stage: ReportStage;
  progress: number;
  error?: string;
}

interface CtxValue {
  startJob: (id: string, label: string, type: ReportType) => void;
  updateJob: (id: string, patch: Partial<Omit<ReportJob, 'id'>>) => void;
  failJob: (id: string, error?: string) => void;
  dismissJob: (id: string) => void;
}

const Ctx = createContext<CtxValue | null>(null);

export function useReportProgress() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      'useReportProgress harus digunakan di dalam ReportProgressProvider'
    );

  const start = useCallback(
    (label: string, type: ReportType = 'pdf') => {
      const id = `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      ctx.startJob(id, label, type);

      return {
        id,
        fetching: () =>
          ctx.updateJob(id, {
            stage: 'fetching',
            progress: type === 'excel' ? 20 : 10
          }),
        rendering: () =>
          ctx.updateJob(id, { stage: 'rendering', progress: 45 }),
        exporting: () =>
          ctx.updateJob(id, {
            stage: 'exporting',
            progress: type === 'excel' ? 75 : 80
          }),
        finish: (openFn?: () => void) => {
          ctx.updateJob(id, { stage: 'done', progress: 100 });
          setTimeout(() => {
            try {
              openFn?.();
            } catch (_) {}
          }, 1000);
        },
        fail: (msg?: string) => ctx.failJob(id, msg),
        dismiss: () => ctx.dismissJob(id)
      };
    },
    [ctx]
  );

  return { start };
}

// ─────────────────────────────────────────────
// Metadata per stage
// ─────────────────────────────────────────────
const STAGE_COLOR: Record<ReportStage, string> = {
  fetching: '#3b82f6',
  rendering: '#8b5cf6',
  exporting: '#f59e0b',
  done: '#10b981',
  error: '#ef4444'
};

const STAGE_LABEL: Record<ReportStage, string> = {
  fetching: 'Mengambil data...',
  rendering: 'Membuat laporan...',
  exporting: 'Mengekspor file...',
  done: 'Siap!',
  error: 'Gagal'
};

const CSS = `
@keyframes rpp-in  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes rpp-out { from{opacity:1;transform:translateY(0)}   to{opacity:0;transform:translateY(6px)} }
@keyframes rpp-shimmer { from{transform:translateX(-100%)} to{transform:translateX(300%)} }

.rpp-toast {
  width: 280px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 9px 12px;
  position: relative;
  overflow: hidden;
  animation: rpp-in .22s ease forwards;
  pointer-events: auto;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
}
.rpp-toast.rpp-out { animation: rpp-out .2s ease forwards; }

.rpp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  gap: 8px;
}
.rpp-label {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  line-height: 1.3;
}
.rpp-meta {
  font-size: 10.5px;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1;
}
.rpp-close {
  background: none;
  border: none;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  padding: 0 0 0 4px;
  font-size: 12px;
  line-height: 1;
  opacity: .45;
  transition: opacity .15s;
  flex-shrink: 0;
}
.rpp-close:hover { opacity: 1; }

.rpp-track {
  height: 3px;
  background: hsl(var(--muted));
  border-radius: 99px;
  overflow: hidden;
}
.rpp-bar {
  height: 100%;
  border-radius: 99px;
  transition: width .45s cubic-bezier(.4,0,.2,1), background .3s;
}
.rpp-shimmer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.06) 50%, transparent 100%);
  animation: rpp-shimmer 1.6s ease-in-out infinite;
}
`;

function injectCSS() {
  if (typeof document === 'undefined' || document.getElementById('rpp-css'))
    return;
  const s = document.createElement('style');
  s.id = 'rpp-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function ToastCard({
  job,
  onDismiss
}: {
  job: ReportJob;
  onDismiss: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const isDone = job.stage === 'done';
  const isError = job.stage === 'error';
  const isActive = !isDone && !isError;
  const color = STAGE_COLOR[job.stage];

  // Auto-dismiss ketika done (setelah openFn sudah dipanggil di finish())
  useEffect(() => {
    if (!isDone) return;
    const t1 = setTimeout(() => setLeaving(true), 2200);
    const t2 = setTimeout(onDismiss, 2420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isDone]);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(onDismiss, 220);
  };

  const metaText = isError ? job.error ?? 'Gagal' : STAGE_LABEL[job.stage];

  return (
    <div
      className={`rpp-toast${leaving ? ' rpp-out' : ''}`}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="rpp-header">
        <span className="rpp-label">{job.label}</span>
        <span className="rpp-meta" style={{ color }}>
          {metaText}
        </span>
        <button className="rpp-close" onClick={dismiss} aria-label="Tutup">
          ✕
        </button>
      </div>

      {!isError && (
        <div className="rpp-track">
          <div
            className="rpp-bar"
            style={{ width: `${job.progress}%`, background: color }}
          />
        </div>
      )}

      {isActive && <div className="rpp-shimmer" />}
    </div>
  );
}

export function ReportProgressProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [jobs, setJobs] = useState<ReportJob[]>([]);

  useEffect(() => {
    injectCSS();
  }, []);

  const startJob = useCallback(
    (id: string, label: string, type: ReportType) => {
      setJobs((p) => [
        ...p,
        { id, label, type, stage: 'fetching', progress: 5 }
      ]);
    },
    []
  );

  const updateJob = useCallback(
    (id: string, patch: Partial<Omit<ReportJob, 'id'>>) => {
      setJobs((p) => p.map((j) => (j.id === id ? { ...j, ...patch } : j)));
    },
    []
  );

  const failJob = useCallback((id: string, error?: string) => {
    setJobs((p) =>
      p.map((j) =>
        j.id === id
          ? { ...j, stage: 'error', error: error ?? 'Terjadi kesalahan' }
          : j
      )
    );
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((p) => p.filter((j) => j.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ startJob, updateJob, failJob, dismissJob }}>
      {children}

      {/* Toast stack — bottom-right */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
          alignItems: 'flex-end'
        }}
      >
        {jobs.map((job) => (
          <ToastCard
            key={job.id}
            job={job}
            onDismiss={() => dismissJob(job.id)}
          />
        ))}
      </div>
    </Ctx.Provider>
  );
}
