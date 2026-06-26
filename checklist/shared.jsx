// Shared interactive pieces for all three directions.
// Exposes a localStorage-backed store hook + reusable UI atoms.

const GW = window.GW;
const SERVICE = window.SERVICE;

/* ---------- persistence + derived stats ---------- */

const subKey = (itemId, idx) => itemId + '#' + idx;

// A subtask is either a plain string or { text, hint } for a small reminder line.
const stText = t => (typeof t === 'string' ? t : t.text);
const stHint = t => (typeof t === 'string' ? null : t.hint);

// Stages where the tech is engaged with the customer and can capture a voice note:
// Engage (2), Review (3), Convert (6), Extend (7).
const VOICE_STAGES = new Set(['engage', 'review', 'convert', 'extend']);

function useApptStore(storageKey) {
  const [state, setState] = React.useState(() => {
    try { const raw = localStorage.getItem(storageKey); if (raw) { const p = JSON.parse(raw); if (!p.timer) p.timer = { accumulated: 0, runningSince: null, phase: 'idle', scoutMs: 0 }; return p; } }
    catch (e) {}
    return { checked: {}, notes: {}, photos: {}, recordings: {}, customer: {}, timer: { accumulated: 0, runningSince: null, phase: 'idle', scoutMs: 0 } };
  });
  React.useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) {}
  }, [state, storageKey]);

  return {
    state,
    isChecked: (k) => !!state.checked[k],
    toggle: (k) => setState(s => ({ ...s, checked: { ...s.checked, [k]: !s.checked[k] } })),
    setNote: (id, v) => setState(s => ({ ...s, notes: { ...s.notes, [id]: v } })),
    setCustomer: (field, v) => setState(s => ({ ...s, customer: { ...(s.customer || {}), [field]: v } })),
    addPhotos: (id, urls) => setState(s => ({ ...s, photos: { ...s.photos, [id]: [ ...(s.photos[id] || []), ...urls ] } })),
    removePhoto: (id, idx) => setState(s => ({ ...s, photos: { ...s.photos, [id]: (s.photos[id] || []).filter((_, i) => i !== idx) } })),
    addRecording: (id, rec) => setState(s => ({ ...s, recordings: { ...(s.recordings || {}), [id]: [ ...((s.recordings || {})[id] || []), rec ] } })),
    removeRecording: (id, idx) => setState(s => ({ ...s, recordings: { ...(s.recordings || {}), [id]: ((s.recordings || {})[id] || []).filter((_, i) => i !== idx) } })),
    startTimer: (phase) => setState(s => {
      const t = s.timer || { accumulated: 0, runningSince: null, phase: 'idle', scoutMs: 0 };
      if (t.runningSince) return { ...s, timer: { ...t, phase } };
      return { ...s, timer: { ...t, runningSince: Date.now(), phase } };
    }),
    pauseTimer: (newPhase) => setState(s => {
      const t = s.timer; if (!t) return s;
      if (!t.runningSince) return { ...s, timer: { ...t, phase: newPhase || t.phase } };
      const add = Date.now() - t.runningSince;
      const scoutMs = t.phase === 'scouting' ? (t.scoutMs || 0) + add : (t.scoutMs || 0);
      return { ...s, timer: { ...t, accumulated: (t.accumulated || 0) + add, runningSince: null, scoutMs, phase: newPhase || 'paused' } };
    }),
    endAppointment: () => setState(s => {
      const t = s.timer || { accumulated: 0, runningSince: null, phase: 'idle', scoutMs: 0 };
      const add = t.runningSince ? Date.now() - t.runningSince : 0;
      const scoutMs = t.phase === 'scouting' ? (t.scoutMs || 0) + add : (t.scoutMs || 0);
      return { ...s, endedAt: Date.now(), timer: { ...t, accumulated: (t.accumulated || 0) + add, runningSince: null, scoutMs, phase: 'ended' } };
    }),
    reset: () => setState({ checked: {}, notes: {}, photos: {}, recordings: {}, customer: {}, timer: { accumulated: 0, runningSince: null, phase: 'idle', scoutMs: 0 } }),
  };
}

function itemStats(state, item) {
  const done = item.subtasks.reduce((n, _, i) => n + (state.checked[subKey(item.id, i)] ? 1 : 0), 0);
  return { done, total: item.subtasks.length };
}
function stageStats(state, stage) {
  let done = 0, total = 0;
  stage.items.forEach(it => { const s = itemStats(state, it); done += s.done; total += s.total; });
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, complete: total > 0 && done === total };
}
function overallStats(state) {
  let done = 0;
  SERVICE.forEach(st => { done += stageStats(state, st).done; });
  const total = window.SERVICE_TOTAL;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function readFilesAsDataURLs(fileList, cb) {
  const files = [...fileList].slice(0, 8);
  Promise.all(files.map(f => new Promise(res => {
    const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
  }))).then(cb);
}

/* ---------- UI atoms ---------- */

function CheckCircle({ checked, onClick, size = 30 }) {
  return (
    <button onClick={onClick} aria-pressed={checked} style={{
      width: size, height: size, minWidth: size, borderRadius: '50%', cursor: 'pointer',
      border: checked ? 'none' : '2.5px solid ' + GW.slateSoft,
      background: checked ? GW.green : GW.white,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      transition: 'all .15s ease', boxShadow: checked ? '0 2px 6px rgba(62,142,90,.35)' : 'none',
    }}>
      {checked && (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// The S.E.R.V.I.C.E. square tile. state: 'todo' | 'active' | 'done'
function LetterTile({ letter, state = 'todo', size = 48, onClick }) {
  const map = {
    todo:   { bg: GW.slate,    fg: '#fff', ring: 'transparent' },
    active: { bg: GW.gold,     fg: '#fff', ring: GW.gold },
    done:   { bg: GW.navy,     fg: '#fff', ring: 'transparent' },
  };
  const c = map[state];
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} style={{
      width: size, height: size, minWidth: size, borderRadius: 8, border: 'none', cursor: onClick ? 'pointer' : 'default',
      background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: size * 0.46, letterSpacing: '.02em',
      position: 'relative', boxShadow: state === 'active' ? '0 4px 14px rgba(196,154,76,.45)' : 'none',
      transition: 'all .18s ease', padding: 0,
    }}>
      {letter}
      {state === 'done' && (
        <span style={{
          position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%',
          background: GW.green, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      )}
    </div>
  );
}

function ProgressRing({ pct, size = 62, stroke = 7, color = GW.gold, track = GW.slateWash, label }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
        <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: size * 0.28, color: GW.navy }}>{pct}<span style={{ fontSize: size * 0.16 }}>%</span></span>
        {label && <span style={{ fontSize: 9, color: GW.muted, marginTop: 2, fontWeight: 600 }}>{label}</span>}
      </div>
    </div>
  );
}

// Stage-level conversation recorder for customer-facing steps. Records audio
// until the tech leaves the stage (component unmounts) or taps Stop. Uses
// MediaRecorder; degrades gracefully if the mic isn't available here.
function ConversationRecorder({ stage, store, accent = GW.navy, active = true }) {
  const recId = 'conv-' + stage.key;
  const recs = (store.state.recordings && store.state.recordings[recId]) || [];
  const [recording, setRecording] = React.useState(false);
  const [secs, setSecs] = React.useState(0);
  const [err, setErr] = React.useState('');
  const mr = React.useRef(null), chunks = React.useRef([]), timer = React.useRef(null), startedAt = React.useRef(0);
  const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

  const start = async () => {
    setErr('');
    if (!navigator.mediaDevices || !window.MediaRecorder) { setErr('Voice recording isn’t supported here'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = new MediaRecorder(stream);
      chunks.current = [];
      m.ondataavailable = e => { if (e.data && e.data.size) chunks.current.push(e.data); };
      m.onstop = () => {
        const blob = new Blob(chunks.current, { type: m.mimeType || 'audio/webm' });
        const dur = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        const r = new FileReader();
        r.onload = () => store.addRecording(recId, { url: r.result, dur });
        r.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      m.start(); mr.current = m; startedAt.current = Date.now();
      setSecs(0); setRecording(true);
      timer.current = setInterval(() => setSecs(s => s + 1), 1000);
    } catch (e) { setErr('Microphone access blocked'); }
  };
  const stop = () => {
    if (mr.current && mr.current.state !== 'inactive') mr.current.stop();
    clearInterval(timer.current); setRecording(false);
  };
  // Auto-stop & save when the tech moves to another stage (active flips false in
  // a pager where all stages stay mounted) or on unmount.
  React.useEffect(() => { if (active === false && mr.current && mr.current.state !== 'inactive') stop(); }, [active]);
  // Auto-stop & save when the tech moves to another stage (keyed remount → unmount).
  React.useEffect(() => () => {
    if (mr.current && mr.current.state !== 'inactive') mr.current.stop();
    clearInterval(timer.current);
  }, []);

  return (
    <div style={{ border: '1px solid ' + (recording ? '#E6BDB8' : GW.line), background: recording ? '#FCF1EF' : GW.white,
      borderRadius: 14, padding: '13px 16px', marginBottom: 18, transition: 'background .2s, border-color .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: '50%', background: recording ? '#C5443B' : GW.slateWash,
          color: recording ? '#fff' : accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="22" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15.5, color: GW.navy }}>
            {recording ? 'Recording conversation…' : 'Record the conversation'}</div>
          <div style={{ fontSize: 12.5, color: GW.muted }}>
            {recording ? 'Saves automatically when you move to the next stage' : 'Captures audio with the customer until you move to the next stage'}</div>
        </div>
        {!recording ? (
          <button onClick={start} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, border: 'none',
            background: accent, color: '#fff', cursor: 'pointer', fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#C5443B' }} />Record
          </button>
        ) : (
          <button onClick={stop} style={{
            display: 'inline-flex', alignItems: 'center', gap: 9, padding: '10px 18px', borderRadius: 24, border: 'none',
            background: '#C5443B', color: '#fff', cursor: 'pointer', fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap' }}>
            <span style={{ width: 11, height: 11, borderRadius: 2, background: '#fff', animation: 'gwPulse 1s infinite' }} />
            {fmt(secs)} · Stop
          </button>
        )}
      </div>
      {err && <div style={{ fontSize: 12, color: '#C5443B', fontWeight: 600, marginTop: 8, paddingLeft: 53 }}>{err}</div>}
      {recs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12, paddingTop: 12, borderTop: '1px solid ' + GW.line }}>
          {recs.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: GW.panel, border: '1px solid ' + GW.line, borderRadius: 10, padding: '8px 10px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: GW.navy, whiteSpace: 'nowrap' }}>Recording {i + 1} · {fmt(r.dur)}</span>
              <audio src={r.url} controls style={{ height: 32, maxWidth: 260, flex: 1 }} />
              <button onClick={() => store.removeRecording(recId, i)} title="Delete" style={{
                marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%', border: 'none', background: GW.panelDeep,
                color: GW.muted, cursor: 'pointer', fontSize: 14, lineHeight: '24px', padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Notes + photo capture for one item. Collapsible.
function NotesPhotos({ item, store, accent = GW.slate }) {
  const note = store.state.notes[item.id] || '';
  const photos = store.state.photos[item.id] || [];
  const has = note.length > 0 || photos.length > 0;
  const [open, setOpen] = React.useState(has);
  const fileRef = React.useRef(null);

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
        color: has ? accent : GW.faint, fontSize: 12, fontWeight: 700, padding: '2px 0', fontFamily: 'Public Sans, sans-serif',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17.5V21h3.5L17 10.5 13.5 7 3 17.5z" /><path d="M14.5 6l3.5 3.5" />
        </svg>
        {has ? 'Notes & photos' : 'Add note or photo'}
        {photos.length > 0 && <span style={{ background: accent, color: '#fff', borderRadius: 8, padding: '1px 6px', fontSize: 10 }}>{photos.length}</span>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          <textarea
            value={note} placeholder="Type a note for this step…"
            onChange={e => store.setNote(item.id, e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', minHeight: 46, resize: 'vertical', border: '1.5px solid ' + GW.line,
              borderRadius: 8, padding: '8px 10px', fontFamily: 'Public Sans, sans-serif', fontSize: 13, color: GW.ink,
              background: GW.panel, outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = accent}
            onBlur={e => e.target.style.borderColor = GW.line}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
            {photos.map((src, i) => (
              <div key={i} style={{ position: 'relative', width: 54, height: 54, borderRadius: 8, overflow: 'hidden', border: '1px solid ' + GW.line }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => store.removePhoto(item.id, i)} style={{
                  position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', border: 'none',
                  background: 'rgba(21,35,63,.85)', color: '#fff', cursor: 'pointer', fontSize: 11, lineHeight: '16px', padding: 0,
                }}>×</button>
              </div>
            ))}
            <button onClick={() => fileRef.current && fileRef.current.click()} style={{
              width: 54, height: 54, borderRadius: 8, border: '1.5px dashed ' + GW.slateSoft, background: GW.white,
              cursor: 'pointer', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="3.5" />
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }}
              onChange={e => { if (e.target.files.length) readFilesAsDataURLs(e.target.files, urls => store.addPhotos(item.id, urls)); e.target.value = ''; }} />
          </div>
        </div>
      )}
    </div>
  );
}

// Renders script text, turning <placeholder> tokens into fill-in chips.
function renderScriptText(text) {
  return text.split(/(<[^>]+>)/g).map((p, i) =>
    /^<[^>]+>$/.test(p)
      ? <span key={i} style={{ display: 'inline-block', background: GW.goldSoft, color: '#7A5C1E',
          borderRadius: 6, padding: '0 7px', fontWeight: 700, fontSize: '.92em', lineHeight: 1.5 }}>{p.replace(/[<>]/g, '')}</span>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

// A read-aloud call script attached to an item. Collapsible, open by default.
// Supports either { lines, keyPhrase, reminder } or a { blocks } sequence where
// each block is { type: 'line' | 'key', text }.
function ScriptCard({ script, accent = GW.navy }) {
  const [open, setOpen] = React.useState(true);
  const KeyChip = ({ text }) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: GW.navy, color: '#fff',
      borderRadius: 20, padding: '5px 13px', fontSize: 12.5, fontWeight: 700, margin: '3px 0 11px' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V7H4v10h9" /><path d="M16 17l2 2 4-4" /></svg>
      Key phrase: {text}
    </div>
  );
  const Line = ({ text }) => <p style={{ margin: '0 0 11px', fontSize: 15, lineHeight: 1.6, color: GW.ink }}>{renderScriptText(text)}</p>;
  const body = script.blocks
    ? script.blocks.map((b, i) => b.type === 'key' ? <div key={i}><KeyChip text={b.text} /></div> : <Line key={i} text={b.text} />)
    : script.lines.map((ln, i) => <Line key={i} text={ln} />);
  return (
    <div style={{ marginTop: 13, border: '1px solid ' + GW.line, borderRadius: 12, overflow: 'hidden', background: GW.white }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: GW.panel, border: 'none',
        borderBottom: open ? '1px solid ' + GW.line : 'none', cursor: 'pointer', padding: '10px 14px', textAlign: 'left', fontFamily: 'Public Sans, sans-serif' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" />
        </svg>
        <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: GW.navy }}>{script.label || 'Call script'}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GW.muted} strokeWidth="2.5" style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div style={{ padding: '15px 18px 17px' }}>
          {body}
          {!script.blocks && script.keyPhrase && <KeyChip text={script.keyPhrase} />}
          {script.reminder && (
            <div style={{ marginTop: 15, paddingTop: 14, borderTop: '1px dashed ' + GW.line }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: GW.gold, marginBottom: 5 }}>Reminder</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: GW.muted }}>{renderScriptText(script.reminder)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Plane glyph used to flag the Flight Plan item (matches the slide).
function PlaneGlyph({ color = GW.gold, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M22 8.5c.4-.4.4-1.1 0-1.5s-1.1-.4-1.5 0l-4.6 4.6-7.4-2 .9-.9c.3-.3.3-.7 0-1l-.6-.6c-.2-.2-.5-.2-.7-.1L6 7.9 4.3 7c-.3-.1-.6 0-.8.2l-.6.6c-.3.3-.3.8.1 1l3.3 2.3-2 2-2.2-.3c-.2 0-.4 0-.6.2l-.4.4c-.3.3-.2.7.1.9l2 1.3 1.3 2c.2.3.6.4.9.1l.4-.4c.2-.2.2-.4.2-.6l-.3-2.2 2-2L18 17c.2.4.7.4 1 .1l.6-.6c.2-.2.3-.5.2-.8l-.9-1.7 1.4-2.6c.1-.2.1-.5-.1-.7l-.6-.6c-.3-.3-.7-.3-1 0l-.9.9-2-7.4z"/>
    </svg>
  );
}

// Total active time tracked across phases (scouting + on-site), excluding pauses.
function timerTotalMs(t) {
  if (!t) return 0;
  return (t.accumulated || 0) + (t.runningSince ? Date.now() - t.runningSince : 0);
}

// Phase-aware appointment timer. Runs during scouting, auto-pauses when Scout
// is complete, resumes on site, freezes when the appointment ends.
const TIMER_PHASES = {
  idle:       { label: 'Not started',   bg: GW.panel,     border: GW.line,   fg: GW.muted,   dot: GW.faint, run: false },
  scouting:   { label: 'Scouting',      bg: '#FBF3E0',    border: '#EFD9A8', fg: '#7A5410',  dot: '#C99A2E', run: true },
  scout_done: { label: 'Scouting done', bg: GW.slateWash, border: GW.line,   fg: GW.navy,    dot: GW.slate, run: false },
  onsite:     { label: 'On site',       bg: GW.greenWash, border: '#BFE3CC', fg: '#2A6B45',  dot: GW.green, run: true },
  paused:     { label: 'Paused',        bg: GW.slateWash, border: GW.line,   fg: GW.navy,    dot: GW.slate, run: false },
  ended:      { label: 'Ended',         bg: GW.panel,     border: GW.line,   fg: GW.muted,   dot: GW.faint, run: false },
};

function AppointmentTimer({ timer }) {
  const phase = (timer && timer.phase) || 'idle';
  const cfg = TIMER_PHASES[phase] || TIMER_PHASES.idle;
  const [, force] = React.useState(0);
  React.useEffect(() => {
    if (!cfg.run) return;
    const id = setInterval(() => force(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [cfg.run]);
  const ms = timerTotalMs(timer);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  const label = (h > 0 ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '8px 14px', borderRadius: 24,
      background: cfg.bg, border: '1px solid ' + cfg.border }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cfg.fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16, color: cfg.fg, fontVariantNumeric: 'tabular-nums', letterSpacing: '.01em' }}>{label}</div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: cfg.fg, textTransform: 'uppercase' }}>
        {cfg.run && <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, animation: 'gwPulse 1.6s infinite' }} />}
        {cfg.label}
      </span>
    </div>
  );
}

Object.assign(window, { useApptStore, itemStats, stageStats, overallStats, subKey, stText, stHint, readFilesAsDataURLs, CheckCircle, LetterTile, ProgressRing, NotesPhotos, ConversationRecorder, ScriptCard, PlaneGlyph, AppointmentTimer, timerTotalMs });
