// Shared report model + atoms for the "Finish → send to management" options.
// Derives a high-level report from a checklist store state (the same shape the
// real app persists): { checked, notes, photos, recordings }.

const GW = window.GW;
const SERVICE = window.SERVICE;

/* ---------- appointment meta (sample) ---------- */
const APPT = {
  customer: 'Dale & Karen Whitfield',
  address: '1428 Ridgeline Dr · Asheville, NC',
  tech: 'Marcus Bell',
  crew: 'Certified Field Inspector',
  date: 'Mon, Jun 23, 2026',
  arrived: '9:04 AM',
  left: '10:56 AM',
  duration: '1h 52m',
  outcome: 'Agreement signed',
};

const fmtDur = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

// Human duration from milliseconds: "1h 32m" / "14m".
function fmtClock(ms) {
  if (!ms || ms < 0) ms = 0;
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}

/* ---------- sample capture builders ---------- */
// Build a checked map across all subtasks, optionally skipping some itemIds.
function checkAll(skip = {}) {
  const checked = {};
  SERVICE.forEach(s => s.items.forEach(it => {
    const miss = skip[it.id] || 0; // leave the last `miss` subtasks unchecked
    it.subtasks.forEach((_, i) => { if (i < it.subtasks.length - miss) checked[subKey(it.id, i)] = true; });
  }));
  return checked;
}

const SAMPLE_NOTES = {
  'scout-lead': 'Prior 2019 inspection flagged efflorescence on the north basement wall.',
  'rev-concerns': 'Musty smell after heavy rain; standing water near the water heater.',
  'ver-int-insp': 'Two horizontal cracks ~1/8" on the east foundation wall. Moisture read 22%.',
  'con-convert': 'Signed full-perimeter drainage + sump. 60-mo financing approved.',
};
const SAMPLE_PHOTOS = {
  'ver-int-pep': ['Crawlspace', 'Sill plate'],
  'ver-int-insp': ['Crack — east wall', 'Moisture meter'],
  'ver-ext-pep': ['Grading', 'Downspout'],
  'ver-ext-insp': ['Perimeter', 'Settlement'],
  'imp-maint': ['Sump pump'],
  'ver-drawing': ['Foundation sketch'],
};
const SAMPLE_RECS = {
  'conv-engage': [{ dur: 142 }],
  'conv-review': [{ dur: 318 }],
  'conv-convert': [{ dur: 264 }],
  'conv-extend': [{ dur: 96 }],
};

// A clean, fully-captured appointment.
const STATE_FULL = {
  checked: checkAll(),
  notes: SAMPLE_NOTES,
  photos: SAMPLE_PHOTOS,
  recordings: SAMPLE_RECS,
};

// A realistic appointment with a few gaps (drives the exceptions option).
const STATE_PARTIAL = {
  checked: checkAll({ 'imp-flight': 2, 'con-educate': 1 }),
  notes: SAMPLE_NOTES,
  photos: (() => { const p = { ...SAMPLE_PHOTOS }; delete p['ver-ext-pep']; delete p['ver-ext-insp']; return p; })(),
  recordings: (() => { const r = { ...SAMPLE_RECS }; delete r['conv-convert']; return r; })(),
};

/* ---------- derive a high-level report ---------- */
function buildReport(state) {
  const stages = SERVICE.map(s => {
    const ss = stageStats(state, s);
    const incomplete = s.items
      .map(it => ({ it, x: itemStats(state, it) }))
      .filter(o => o.x.done < o.x.total)
      .map(o => ({ title: o.it.title, done: o.x.done, total: o.x.total }));
    return { key: s.key, letter: s.letter, name: s.name, tagline: s.tagline, ...ss, incomplete };
  });
  const overall = overallStats(state);

  const notesList = [];
  SERVICE.forEach(s => s.items.forEach(it => {
    const t = state.notes[it.id]; if (t) notesList.push({ stage: s.name, item: it.title, text: t });
  }));

  const photosList = []; let photoCount = 0;
  SERVICE.forEach(s => s.items.forEach(it => {
    const p = state.photos[it.id];
    if (p && p.length) { photosList.push({ item: it.title, labels: p }); photoCount += p.length; }
  }));

  const recList = []; let recCount = 0, recDur = 0;
  Object.keys(state.recordings || {}).forEach(k => {
    const recs = state.recordings[k]; if (!recs || !recs.length) return;
    const st = SERVICE.find(s => 'conv-' + s.key === k);
    const dur = recs.reduce((n, r) => n + r.dur, 0);
    recList.push({ stage: st ? st.name : k, count: recs.length, dur });
    recCount += recs.length; recDur += dur;
  });

  // Exceptions the manager would care about.
  const flags = [];
  stages.forEach(st => st.incomplete.forEach(inc =>
    flags.push({ kind: 'unchecked', stage: st.name, label: inc.title, detail: inc.done + ' of ' + inc.total + ' steps done' })));
  // Customer-facing stages with no conversation recording.
  [['engage', 'Engage'], ['review', 'Review'], ['convert', 'Convert'], ['extend', 'Extend']].forEach(([k, name]) => {
    if (!(state.recordings || {})['conv-' + k]) flags.push({ kind: 'recording', stage: name, label: 'No conversation recorded', detail: 'Customer-facing stage' });
  });
  // Verify stage with no exterior photos.
  if (!state.photos['ver-ext-pep'] && !state.photos['ver-ext-insp'])
    flags.push({ kind: 'photo', stage: 'Verify', label: 'No exterior photos', detail: 'Grading / perimeter not captured' });

  return { stages, overall, notesList, photosList, photoCount, recList, recCount, recDur, flags };
}

/* ---------- placeholder photo thumbnail ---------- */
const THUMB_HUES = [205, 28, 150, 220, 36, 195, 12, 168];
function Thumb({ label, i = 0, size = 1, radius = 9 }) {
  const h = THUMB_HUES[i % THUMB_HUES.length];
  return (
    <div style={{ position: 'relative', borderRadius: radius, overflow: 'hidden', aspectRatio: '4 / 3',
      background: `linear-gradient(135deg, oklch(0.62 0.06 ${h}), oklch(0.42 0.07 ${h}))`,
      border: '1px solid rgba(255,255,255,.5)', boxShadow: '0 1px 2px rgba(27,44,79,.12)' }}>
      <svg viewBox="0 0 24 24" width="40%" height="40%" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.5"
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-58%)' }} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M3 17l5-4 4 3 3-2 6 5" />
      </svg>
      {label && <span style={{ position: 'absolute', left: 6, bottom: 5, right: 6, fontSize: 9.5, fontWeight: 700,
        color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.5)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
    </div>
  );
}

/* ---------- small report atoms ---------- */
function KpiTile({ value, unit, label, color = GW.navy, accent }) {
  return (
    <div style={{ flex: 1, background: GW.white, border: '1px solid ' + GW.line, borderRadius: 14, padding: '14px 14px 13px' }}>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 27, color: accent || color, lineHeight: 1, letterSpacing: '-.02em' }}>
        {value}{unit && <span style={{ fontSize: 14, fontWeight: 700, color: GW.faint, marginLeft: 3 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: GW.muted, marginTop: 7, letterSpacing: '.02em' }}>{label}</div>
    </div>
  );
}

function MiniBar({ pct, complete, w = '100%', h = 6 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: h, background: GW.slateWash, overflow: 'hidden' }}>
      <div style={{ width: pct + '%', height: '100%', background: complete ? GW.green : GW.gold, transition: 'width .4s' }} />
    </div>
  );
}

function StageRow({ st, compact }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: compact ? '8px 0' : '10px 0' }}>
      <LetterTile letter={st.letter} state={st.complete ? 'done' : 'active'} size={compact ? 28 : 34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: compact ? 14 : 15, color: GW.navy }}>{st.name}</span>
          <span style={{ fontSize: 11.5, color: GW.faint, fontWeight: 600 }}>{st.done}/{st.total}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: st.complete ? GW.green : GW.gold }}>{st.pct}%</span>
        </div>
        <div style={{ marginTop: 5 }}><MiniBar pct={st.pct} complete={st.complete} h={5} /></div>
      </div>
    </div>
  );
}

function RecRow({ r, i }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', background: GW.panel, border: '1px solid ' + GW.line, borderRadius: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: GW.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: GW.navy }}>{r.stage} conversation</div>
        <div style={{ fontSize: 11.5, color: GW.muted }}>{r.count > 1 ? r.count + ' clips · ' : ''}{fmtDur(r.dur)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 18 }}>
        {[7, 12, 16, 10, 14, 8, 13].map((b, j) => <span key={j} style={{ width: 2.5, height: b, borderRadius: 2, background: GW.slateSoft }} />)}
      </div>
    </div>
  );
}

function Recipient({ pad = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: pad ? '11px 13px' : 0, background: pad ? GW.slateWash : 'transparent', borderRadius: 11 }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GW.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M4 7l8 5 8-5" /></svg>
      <span style={{ fontSize: 12.5, color: GW.ink }}>
        <span style={{ fontWeight: 700 }}>Service Manager</span> &amp; Dispatch
      </span>
      <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: GW.green, textTransform: 'uppercase' }}>Auto-attach</span>
    </div>
  );
}

// A send button that flips to a "sent" confirmation state.
function SendButton({ label = 'Send report to manager', bg = GW.navy, sentLabel = 'Report sent', onSend }) {
  const [sent, setSent] = React.useState(false);
  return (
    <button onClick={() => { setSent(true); onSend && onSend(); }} disabled={sent} style={{
      width: '100%', padding: '16px', borderRadius: 13, border: 'none', cursor: sent ? 'default' : 'pointer',
      background: sent ? GW.green : bg, color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background .25s',
      boxShadow: sent ? 'none' : '0 6px 16px rgba(27,44,79,.28)' }}>
      {sent ? (
        <><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>{sentLabel}</>
      ) : (
        <>{label}<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg></>
      )}
    </button>
  );
}

Object.assign(window, {
  APPT, fmtDur, fmtClock, buildReport, STATE_FULL, STATE_PARTIAL,
  Thumb, KpiTile, MiniBar, StageRow, RecRow, Recipient, SendButton,
});
