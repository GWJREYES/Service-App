// Technician Schedule — the in-app calendar. Lists appointments grouped by
// day; the live in-progress job sits up top. Completed jobs open a read-only
// detail. Reached from the checklist header; appointments file here on send.

const GW = window.GW;

// Resolves driving legs between each consecutive same-day appointment.
// Returns { legs, totalMeters, ready } where legs[i] is the trip from
// sorted[i] -> sorted[i+1] (or null if either address can't be located yet).
function useRouteLegs(sorted) {
  const G = window.GeoDist;
  const [legs, setLegs] = React.useState([]);
  // Key the effect on the ordered list of ids+addresses so it only re-runs
  // when the day's stops or their addresses actually change.
  const sig = sorted.map(r => r.id + ':' + ((r.customer && r.customer.address) || '') + ':' + (r.lat || '')).join('|');
  React.useEffect(() => {
    let alive = true;
    if (!G || sorted.length < 2) { setLegs([]); return; }
    (async () => {
      // Resolve all coords in parallel; one slow/failed address doesn't block.
      const coords = await Promise.all(sorted.map(r => G.coordsFor(r)));
      const out = new Array(sorted.length - 1).fill(null);
      // Compute each leg, updating state as each resolves so good legs show fast.
      await Promise.all(out.map(async (_, i) => {
        const a = coords[i], b = coords[i + 1];
        if (!a || !b) return;
        const r = await G.route(a, b);
        if (r && alive) { out[i] = { ...r, a, b }; setLegs(out.slice()); }
      }));
      if (alive) setLegs(out.slice());
    })();
    return () => { alive = false; };
  }, [sig]);
  const totalMeters = legs.reduce((n, l) => n + (l && l.meters <= window.GeoDist.IMPLAUSIBLE_M ? l.meters : 0), 0);
  return { legs, totalMeters, ready: legs.some(Boolean) };
}

// The dashed connector shown between two appointment cards.
function RouteConnector({ leg }) {
  const G = window.GeoDist;
  if (!leg) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 0 2px 22px', minHeight: 26 }}>
        <span style={{ width: 1, height: 18, background: GW.line, marginLeft: 7 }} />
        <span style={{ fontSize: 11.5, color: GW.faint, fontStyle: 'italic' }}>distance unavailable</span>
      </div>
    );
  }
  const mins = G.fmtMins(leg.seconds);
  // A wildly long leg is almost always a bad geocode — don't show a confidently
  // wrong number; prompt to check the address instead.
  if (leg.meters > G.IMPLAUSIBLE_M) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '1px 0 1px 22px', minHeight: 26 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
          <span style={{ width: 0, height: 22, borderLeft: '2px dotted ' + GW.slateSoft }} />
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 10, padding: '4px 10px', borderRadius: 20, background: '#FCF6EC', border: '1px solid #E6D3A8', fontSize: 11.5, fontWeight: 700, color: '#9A7B2E' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          check address
        </span>
      </div>
    );
  }
  const open = (e) => { e.stopPropagation(); window.open(G.directionsUrl(leg.a, leg.b), '_blank'); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '1px 0 1px 22px', minHeight: 26 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
        <span style={{ width: 0, height: 22, borderLeft: '2px dotted ' + GW.slateSoft }} />
      </div>
      <button onClick={open} title="Open driving directions" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 10,
        padding: '5px 11px', borderRadius: 20, border: '1px solid ' + GW.line, background: GW.white, cursor: 'pointer',
        fontFamily: 'Public Sans, sans-serif' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GW.slate} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: GW.navy }}>{G.fmtMiles(leg.meters)}</span>
        {mins && <span style={{ fontSize: 12.5, color: GW.muted }}>· {mins}{leg.straight ? '' : ' drive'}</span>}
        {leg.straight && <span style={{ fontSize: 10.5, color: GW.faint }}>(approx)</span>}
      </button>
    </div>
  );
}

function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; }
}
function dayKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
function relDayLabel(ts) {
  const t = new Date(ts), n = new Date();
  const diff = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return t.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

const OUTCOME_COLOR = {
  'Agreement signed': GW.green, 'Follow-up scheduled': GW.gold,
  'Estimate left': GW.slate, 'No sale': GW.muted,
};

function StatusChip({ status, pct }) {
  const map = {
    completed: { bg: GW.greenWash, fg: '#2A6B45', label: 'Completed' },
    in_progress: { bg: '#FBF3E0', fg: '#7A5410', label: 'In progress' },
    scheduled: { bg: GW.slateWash, fg: GW.navy, label: 'Scheduled' },
  };
  const m = map[status] || map.scheduled;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: m.bg, color: m.fg, borderRadius: 20, padding: '4px 11px', fontSize: 11.5, fontWeight: 800 }}>
    {status === 'in_progress' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C99A2E', animation: 'gwPulse 1.6s infinite' }} />}
    {m.label}{status === 'completed' && pct < 100 ? ' · ' + pct + '%' : ''}</span>;
}

function CountPill({ icon, n }) {
  if (!n) return null;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: GW.muted }}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GW.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>{n}</span>;
}

function ApptCard({ rec, live, onResume, onOpen }) {
  const accent = rec.status === 'completed' ? GW.green : rec.status === 'in_progress' ? GW.gold : GW.slate;
  return (
    <button onClick={() => rec.status === 'in_progress' ? onResume() : onOpen(rec)} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'stretch', gap: 0,
      background: GW.white, border: '1px solid ' + GW.line, borderLeft: '4px solid ' + accent, borderRadius: 13,
      overflow: 'hidden', padding: 0 }}>
      {/* time column */}
      <div style={{ flexShrink: 0, width: 92, padding: '15px 0', borderRight: '1px solid ' + GW.line, textAlign: 'center', background: GW.panel }}>
        <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15, color: GW.navy }}>{fmtTime(rec.start)}</div>
        <div style={{ fontSize: 11, color: GW.faint, marginTop: 2 }}>{rec.end ? fmtTime(rec.end) : ''}</div>
      </div>
      {/* body */}
      <div style={{ flex: 1, minWidth: 0, padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16, color: GW.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.customer.name}</span>
          <StatusChip status={rec.status} pct={rec.pct} />
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: GW.faint, fontWeight: 700, whiteSpace: 'nowrap' }}>{rec.customer.account}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: GW.muted, marginTop: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GW.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.customer.address}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 11 }}>
          {rec.status !== 'scheduled' && (
            <div style={{ flex: '0 0 130px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 6, background: GW.slateWash, overflow: 'hidden' }}>
                <div style={{ width: (rec.pct || 0) + '%', height: '100%', background: rec.pct === 100 ? GW.green : GW.gold }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: rec.pct === 100 ? GW.green : GW.gold }}>{rec.done}/{rec.total}</span>
            </div>
          )}
          <CountPill n={rec.photos} icon={<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M3 17l5-4 4 3" /></>} />
          <CountPill n={rec.recordings} icon={<><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="22" /></>} />
          {rec.onsiteMs != null && rec.status !== 'scheduled' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: GW.muted }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GW.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              {fmtClock(rec.onsiteMs)}{rec.scoutMs ? ' on-site · ' + fmtClock(rec.scoutMs) + ' scout' : ' on-site'}
            </span>
          )}
          {rec.outcome && <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: OUTCOME_COLOR[rec.outcome] || GW.muted }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: OUTCOME_COLOR[rec.outcome] || GW.muted }} />{rec.outcome}</span>}
          {rec.status === 'in_progress' && <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: GW.navy, fontWeight: 800, fontSize: 13 }}>
            Resume<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>}
          {rec.status === 'scheduled' && <span style={{ marginLeft: 'auto', fontSize: 12.5, color: GW.faint, fontWeight: 700 }}>Up next</span>}
        </div>
      </div>
    </button>
  );
}

// read-only detail for a completed appointment
function ApptDetail({ rec, onEdit, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(15,23,40,.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, fontFamily: 'Public Sans, sans-serif' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: '100%', background: GW.white, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px rgba(15,23,40,.45)' }}>
        <div style={{ background: GW.navy, color: '#fff', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusChip status={rec.status} pct={rec.pct} />
            <span style={{ marginLeft: 'auto', fontSize: 12.5, color: GW.slateSoft }}>{relDayLabel(rec.start)} · {fmtTime(rec.start)}–{fmtTime(rec.end)}</span>
          </div>
          <h2 style={{ margin: '12px 0 2px', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 22 }}>{rec.customer.name}</h2>
          <div style={{ fontSize: 13, color: GW.slateSoft }}>{rec.customer.address} · {rec.customer.phone}</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 11, marginBottom: 14 }}>
            <div style={{ flex: 1, background: '#FBF3E0', border: '1px solid #EFD9A8', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 20, color: '#7A5410' }}>{fmtClock(rec.scoutMs)}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9A7426', marginTop: 5 }}>Scouting</div>
            </div>
            <div style={{ flex: 1, background: GW.greenWash, border: '1px solid #BFE3CC', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 20, color: '#2A6B45' }}>{fmtClock(rec.onsiteMs)}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3C7C56', marginTop: 5 }}>On-site</div>
            </div>
            <div style={{ flex: 1, background: GW.navy, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff' }}>{fmtClock(rec.totalMs != null ? rec.totalMs : (rec.scoutMs || 0) + (rec.onsiteMs || 0))}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: GW.slateSoft, marginTop: 5 }}>Total active</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 11, marginBottom: 18 }}>
            {[['Steps', rec.done + '/' + rec.total], ['Photos', rec.photos], ['Recordings', rec.recordings], ['Notes', rec.notes]].map(([l, v]) => (
              <div key={l} style={{ flex: 1, background: GW.panel, border: '1px solid ' + GW.line, borderRadius: 12, padding: '13px 14px' }}>
                <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 22, color: GW.navy }}>{v}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: GW.muted, marginTop: 5 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: GW.greenWash, border: '1px solid #BFE3CC', borderRadius: 11, padding: '12px 15px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke={GW.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontSize: 13.5, color: '#2A6B45', fontWeight: 700 }}>Report sent to {rec.sentTo} · {rec.outcome}</span>
          </div>
          <div style={{ display: 'flex', gap: 11, marginTop: 18 }}>
            <button onClick={onEdit} style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1.5px solid ' + GW.line, background: GW.white, color: GW.navy, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17.5V21h3.5L17 10.5 13.5 7 3 17.5z" /><path d="M14.5 6l3.5 3.5" /></svg>Edit details
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: GW.navy, color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekStrip({ records }) {
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
  const counts = {};
  records.forEach(r => { const k = dayKey(r.start); counts[k] = (counts[k] || 0) + 1; });
  const days = [...Array(7)].map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {days.map((d, i) => {
        const isToday = dayKey(d.getTime()) === dayKey(now.getTime());
        const c = counts[dayKey(d.getTime())] || 0;
        return (
          <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 0 9px', borderRadius: 12,
            background: isToday ? GW.navy : GW.white, border: '1px solid ' + (isToday ? GW.navy : GW.line) }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: isToday ? GW.slateSoft : GW.faint, textTransform: 'uppercase' }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 19, color: isToday ? '#fff' : GW.navy, margin: '3px 0 5px' }}>{d.getDate()}</div>
            <div style={{ height: 6, display: 'flex', gap: 3, justifyContent: 'center' }}>
              {[...Array(Math.min(c, 4))].map((_, j) => <span key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: isToday ? GW.gold : GW.slate }} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Add / edit a scheduled appointment ---------------------------------
function pad2(n) { return String(n).padStart(2, '0'); }
function toDateInput(ts) { const d = new Date(ts); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function toTimeInput(ts) { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function nextHour() { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d.getTime(); }

const formLabel = { fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: GW.faint, textTransform: 'uppercase', margin: '0 0 7px', display: 'block' };
const formInput = { width: '100%', boxSizing: 'border-box', border: '1.5px solid ' + GW.line, borderRadius: 10, padding: '11px 13px', fontFamily: 'Public Sans, sans-serif', fontSize: 15, color: GW.ink, background: GW.panel, outline: 'none' };

function FormField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={formLabel}>{label}{hint && <span style={{ color: GW.line, fontWeight: 600, letterSpacing: 0, textTransform: 'none', marginLeft: 6 }}>{hint}</span>}</label>
      {children}
    </div>
  );
}

function ApptForm({ rec, onClose, onSave }) {
  const editing = !!(rec && rec.id);
  const c = (rec && rec.customer) || {};
  const baseStart = (rec && rec.start) || nextHour();
  const [name, setName] = React.useState(c.name || '');
  const [account, setAccount] = React.useState(c.account || '');
  const [address, setAddress] = React.useState(c.address || '');
  const [phone, setPhone] = React.useState(c.phone || '');
  const [date, setDate] = React.useState(toDateInput(baseStart));
  const [time, setTime] = React.useState(toTimeInput(baseStart));
  const [err, setErr] = React.useState('');

  function save() {
    if (!name.trim()) { setErr('Customer name is required.'); return; }
    if (!date || !time) { setErr('Pick a date and time.'); return; }
    const start = new Date(date + 'T' + time).getTime();
    if (isNaN(start)) { setErr('That date / time isn’t valid.'); return; }
    onSave({ customer: { name: name.trim(), account: account.trim(), address: address.trim(), phone: phone.trim() }, start, end: start + 90 * 60000 });
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(15,23,40,.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, fontFamily: 'Public Sans, sans-serif' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 540, maxWidth: '100%', maxHeight: '100%', background: GW.white, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px rgba(15,23,40,.45)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px', borderBottom: '1px solid ' + GW.line }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.22em', color: GW.slate, fontWeight: 800 }}>{editing ? 'EDIT' : 'NEW'} APPOINTMENT</div>
            <h2 style={{ margin: '3px 0 0', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 21, color: GW.navy, letterSpacing: '-.01em' }}>{editing ? 'Edit appointment' : 'Add appointment'}</h2>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, border: 'none', background: GW.panel, color: GW.muted, cursor: 'pointer', fontSize: 19, lineHeight: '32px', padding: 0 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <FormField label="Customer name">
            <input value={name} onChange={e => { setName(e.target.value); setErr(''); }} placeholder="e.g. Dale & Karen Whitfield" autoFocus
              style={formInput} onFocus={e => e.target.style.borderColor = GW.slate} onBlur={e => e.target.style.borderColor = GW.line} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Account #" hint="optional">
              <input value={account} onChange={e => setAccount(e.target.value)} placeholder="GW-000000"
                style={formInput} onFocus={e => e.target.style.borderColor = GW.slate} onBlur={e => e.target.style.borderColor = GW.line} />
            </FormField>
            <FormField label="Phone" hint="optional">
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(828) 555-0000" inputMode="tel"
                style={formInput} onFocus={e => e.target.style.borderColor = GW.slate} onBlur={e => e.target.style.borderColor = GW.line} />
            </FormField>
          </div>
          <FormField label="Address" hint="optional">
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, State"
              style={formInput} onFocus={e => e.target.style.borderColor = GW.slate} onBlur={e => e.target.style.borderColor = GW.line} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Date">
              <input type="date" value={date} onChange={e => { setDate(e.target.value); setErr(''); }}
                style={formInput} onFocus={e => e.target.style.borderColor = GW.slate} onBlur={e => e.target.style.borderColor = GW.line} />
            </FormField>
            <FormField label="Time">
              <input type="time" value={time} onChange={e => { setTime(e.target.value); setErr(''); }}
                style={formInput} onFocus={e => e.target.style.borderColor = GW.slate} onBlur={e => e.target.style.borderColor = GW.line} />
            </FormField>
          </div>
          {err && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#C5443B', fontWeight: 700, marginTop: 2 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>{err}</div>}
        </div>

        <div style={{ display: 'flex', gap: 11, padding: '14px 24px 18px', borderTop: '1px solid ' + GW.line }}>
          <button onClick={onClose} style={{ flex: '0 0 auto', padding: '14px 24px', borderRadius: 12, border: '1.5px solid ' + GW.line, background: GW.white, color: GW.navy, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: GW.navy, color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 6px 16px rgba(27,44,79,.26)' }}>{editing ? 'Save changes' : 'Add to schedule'}</button>
        </div>
      </div>
    </div>
  );
}

// ---- Scheduled-appointment sheet: Start / Edit / Delete -------------------
function ScheduledSheet({ rec, onStart, onEdit, onDelete, onClose }) {
  const [confirming, setConfirming] = React.useState(false);
  const c = rec.customer || {};
  const InfoRow = ({ icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: GW.ink, padding: '9px 0', borderBottom: '1px solid ' + GW.line }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GW.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      <span>{children}</span>
    </div>
  );

  function reallyDelete() {
    // Second, deliberate warning — a separate dialog so it can't be hit by reflex.
    if (window.confirm('Permanently delete ' + (c.name || 'this') + '’s appointment?\n\nThis removes it from the schedule and cannot be undone.')) {
      onDelete(rec.id);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 65, background: 'rgba(15,23,40,.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, fontFamily: 'Public Sans, sans-serif' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: '100%', background: GW.white, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px rgba(15,23,40,.45)' }}>
        <div style={{ background: GW.navy, color: '#fff', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusChip status="scheduled" />
            <span style={{ marginLeft: 'auto', fontSize: 12.5, color: GW.slateSoft }}>{relDayLabel(rec.start)} · {fmtTime(rec.start)}</span>
          </div>
          <h2 style={{ margin: '12px 0 0', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 22 }}>{c.name}</h2>
        </div>
        <div style={{ padding: '8px 24px 22px' }}>
          {(c.account || c.address || c.phone) ? (
            <div style={{ marginBottom: 18 }}>
              {c.account && <InfoRow icon={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></>}>Account {c.account}</InfoRow>}
              {c.address && <InfoRow icon={<><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>}>{c.address}</InfoRow>}
              {c.phone && <InfoRow icon={<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />}>{c.phone}</InfoRow>}
            </div>
          ) : <div style={{ height: 8 }} />}

          {!confirming ? (
            <React.Fragment>
              <button onClick={onStart} style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: GW.navy, color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 16px rgba(27,44,79,.26)' }}>
                Start this appointment
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
              <div style={{ display: 'flex', gap: 11, marginTop: 11 }}>
                <button onClick={onEdit} style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1.5px solid ' + GW.line, background: GW.white, color: GW.navy, fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17.5V21h3.5L17 10.5 13.5 7 3 17.5z" /><path d="M14.5 6l3.5 3.5" /></svg>Edit
                </button>
                <button onClick={() => setConfirming(true)} style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1.5px solid ' + GW.line, background: GW.white, color: GW.muted, fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>Delete
                </button>
              </div>
            </React.Fragment>
          ) : (
            <div style={{ background: '#FCF1EF', border: '1px solid #E6BDB8', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C5443B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                <div>
                  <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15.5, color: '#9A2F27' }}>Delete this appointment?</div>
                  <div style={{ fontSize: 13.5, color: '#8A5A55', marginTop: 4, lineHeight: 1.5 }}><strong>{c.name}</strong> will be removed from your schedule. This can’t be undone.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 11, marginTop: 15 }}>
                <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: '13px', borderRadius: 11, border: '1.5px solid ' + GW.line, background: GW.white, color: GW.navy, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 14.5, cursor: 'pointer' }}>Keep it</button>
                <button onClick={reallyDelete} style={{ flex: 1, padding: '13px', borderRadius: 11, border: 'none', background: '#C5443B', color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 14.5, cursor: 'pointer' }}>Delete permanently</button>
              </div>
            </div>
          )}

          <button onClick={onClose} style={{ width: '100%', marginTop: 14, padding: '11px', borderRadius: 11, border: 'none', background: 'none', color: GW.muted, fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ---- Live (in-progress) appointment sheet: Resume / Delete ---------------
function LiveSheet({ rec, onResume, onClear, onClose }) {
  const [confirming, setConfirming] = React.useState(false);
  const c = rec.customer || {};
  const named = c.name && c.name !== 'Current appointment';
  function reallyClear() {
    if (window.confirm('Delete this in-progress appointment from the iPad?\n\nThe working checklist, notes, photos and recordings will be removed. Any report you already sent is safe in your schedule. This cannot be undone.')) {
      onClear();
    }
  }
  const InfoRow = ({ icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: GW.ink, padding: '9px 0', borderBottom: '1px solid ' + GW.line }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GW.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      <span>{children}</span>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 66, background: 'rgba(15,23,40,.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, fontFamily: 'Public Sans, sans-serif' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: '100%', background: GW.white, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px rgba(15,23,40,.45)' }}>
        <div style={{ background: GW.navy, color: '#fff', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusChip status="in_progress" />
            <span style={{ marginLeft: 'auto', fontSize: 12.5, color: GW.slateSoft }}>{rec.done}/{rec.total} steps · {rec.pct}%</span>
          </div>
          <h2 style={{ margin: '12px 0 0', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 22 }}>{named ? c.name : 'Current appointment'}</h2>
        </div>
        <div style={{ padding: '8px 24px 22px' }}>
          {(named && (((c.account && c.account !== '—')) || (c.address && c.address !== 'Address not set') || c.phone)) ? (
            <div style={{ marginBottom: 18 }}>
              {c.account && c.account !== '—' && <InfoRow icon={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></>}>Account {c.account}</InfoRow>}
              {c.address && c.address !== 'Address not set' && <InfoRow icon={<><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>}>{c.address}</InfoRow>}
              {c.phone && <InfoRow icon={<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />}>{c.phone}</InfoRow>}
            </div>
          ) : <div style={{ height: 8 }} />}

          {!confirming ? (
            <React.Fragment>
              <button onClick={onResume} style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: GW.navy, color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 16px rgba(27,44,79,.26)' }}>
                Resume this appointment
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
              <button onClick={() => setConfirming(true)} style={{ width: '100%', marginTop: 11, padding: '12px', borderRadius: 11, border: '1.5px solid ' + GW.line, background: GW.white, color: GW.muted, fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>Delete this appointment
              </button>
            </React.Fragment>
          ) : (
            <div style={{ background: '#FCF1EF', border: '1px solid #E6BDB8', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C5443B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                <div>
                  <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15.5, color: '#9A2F27' }}>Delete this appointment?</div>
                  <div style={{ fontSize: 13.5, color: '#8A5A55', marginTop: 4, lineHeight: 1.5 }}>The working checklist, notes, photos and recordings will be cleared from this iPad. Any report you already sent stays safe in your schedule.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 11, marginTop: 15 }}>
                <button onClick={() => setConfirming(false)} style={{ flex: 1, padding: '13px', borderRadius: 11, border: '1.5px solid ' + GW.line, background: GW.white, color: GW.navy, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 14.5, cursor: 'pointer' }}>Keep working</button>
                <button onClick={reallyClear} style={{ flex: 1, padding: '13px', borderRadius: 11, border: 'none', background: '#C5443B', color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 14.5, cursor: 'pointer' }}>Delete permanently</button>
              </div>
            </div>
          )}

          <button onClick={onClose} style={{ width: '100%', marginTop: 14, padding: '11px', borderRadius: 11, border: 'none', background: 'none', color: GW.muted, fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// One day's section: header (with total drive miles) + cards interleaved with
// the driving-distance connector between each consecutive stop.
function DayGroup({ label, records, onResume, onOpen }) {
  const sorted = records.slice().sort((a, b) => a.start - b.start);
  const { legs, totalMeters, ready } = useRouteLegs(sorted);
  const G = window.GeoDist;
  return (
    <div>
      <div style={{ margin: '22px 0 8px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', color: GW.faint, textTransform: 'uppercase' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: GW.line }} />
        {ready && totalMeters > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: GW.slate }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>
            {G.fmtMiles(totalMeters)} total
          </span>
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: GW.faint }}>{records.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sorted.map((r, i) => (
          <React.Fragment key={r.id}>
            <div style={{ marginBottom: i < sorted.length - 1 ? 0 : 0 }}>
              <ApptCard rec={r} onResume={onResume} onOpen={onOpen} />
            </div>
            {i < sorted.length - 1 && <RouteConnector leg={legs[i]} />}
            {i === sorted.length - 1 && <div style={{ height: 10 }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function CalendarView({ store, onOpenAppointment }) {
  const cal = useCalendar();
  const [detail, setDetail] = React.useState(null);
  const [schedDetail, setSchedDetail] = React.useState(null);
  const [formRec, setFormRec] = React.useState(null); // null = closed; {} = new; record = edit
  const [liveOpen, setLiveOpen] = React.useState(false);
  const records = cal.all();

  // Route a tapped card: scheduled → action sheet, completed → read-only detail.
  function openRecord(rec) {
    if (rec.status === 'scheduled') setSchedDetail(rec); else setDetail(rec);
  }

  // Begin a scheduled job: load its customer into the live checklist, drop it
  // from the schedule (the live in-progress card now represents it), open it.
  function startScheduled(rec) {
    const go = () => {
      store.reset();
      const c = rec.customer || {};
      store.setCustomer('name', c.name || '');
      store.setCustomer('account', c.account || '');
      store.setCustomer('address', c.address || '');
      store.setCustomer('phone', c.phone || '');
      cal.remove(rec.id);
      setSchedDetail(null);
      onOpenAppointment();
    };
    const liveCust = store.state.customer || {};
    const inProgress = overallStats(store.state).done > 0 || !!liveCust.name;
    if (inProgress) {
      if (window.confirm('You have an appointment in progress that hasn’t been sent yet.\n\nStarting this one will clear it and begin a fresh checklist. Continue?')) go();
    } else { go(); }
  }

  // live in-progress appointment derived from the active checklist store
  const o = overallStats(store.state);
  const cust = store.state.customer || {};
  const liveRec = {
    id: 'live', status: 'in_progress',
    customer: { name: cust.name || 'Current appointment', account: cust.account || '—', address: cust.address || 'Address not set', phone: cust.phone || '' },
    start: Date.now(), end: null, done: o.done, total: o.total, pct: o.pct,
    scoutMs: (store.state.timer && store.state.timer.scoutMs) || 0,
    onsiteMs: Math.max(0, (window.timerTotalMs ? window.timerTotalMs(store.state.timer) : 0) - ((store.state.timer && store.state.timer.scoutMs) || 0)),
    photos: Object.values(store.state.photos || {}).reduce((n, a) => n + a.length, 0),
    recordings: Object.values(store.state.recordings || {}).reduce((n, a) => n + a.length, 0),
  };

  // Only treat the live card as a real appointment when there's something in it,
  // so a freshly-reset checklist doesn't show a phantom “In progress” job.
  const liveBusy = !!cust.name || o.done > 0
    || Object.values(store.state.photos || {}).some(a => a.length)
    || Object.values(store.state.recordings || {}).some(a => a.length)
    || !!(store.state.timer && ((store.state.timer.accumulated || 0) > 0 || store.state.timer.runningSince || (store.state.timer.scoutMs || 0) > 0))
    || !!store.state.endedAt;

  // group logged records by day
  const groups = {};
  records.forEach(r => { const k = relDayLabel(r.start); (groups[k] = groups[k] || []).push(r); });
  const order = Object.keys(groups).sort((a, b) => {
    const rank = s => s === 'Today' ? 0 : s === 'Tomorrow' ? -1 : s === 'Yesterday' ? 1 : 2;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return groups[b][0].start - groups[a][0].start;
  });

  const completedToday = records.filter(r => r.status === 'completed' && relDayLabel(r.start) === 'Today').length;

  return (
    <div style={{ width: 1194, height: 834, background: GW.panel, borderRadius: 20, overflow: 'hidden', position: 'relative',
      border: '1px solid ' + GW.line, display: 'flex', flexDirection: 'column', fontFamily: 'Public Sans, sans-serif' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 26px', background: GW.white, borderBottom: '1px solid ' + GW.line }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.28em', color: GW.slate, fontWeight: 800 }}>MY SCHEDULE</div>
          <h1 style={{ margin: '3px 0 0', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 25, color: GW.navy, letterSpacing: '-.01em' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
          <button onClick={() => setFormRec({})} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 17px', borderRadius: 24, border: 'none', cursor: 'pointer', background: GW.navy, color: '#fff', fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(27,44,79,.22)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Add appointment
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 18, color: GW.navy }}>{completedToday} <span style={{ color: GW.faint, fontWeight: 600, fontSize: 14 }}>done today</span></div>
            <div style={{ fontSize: 12, color: GW.muted }}>{cal.TECH.name}</div>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: GW.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15 }}>{cal.TECH.initials}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 26px 30px' }}>
        <WeekStrip records={records} />

        {/* live appointment */}
        {liveBusy && (
          <React.Fragment>
            <div style={{ margin: '22px 0 8px', display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', color: GW.faint, textTransform: 'uppercase' }}>In progress</span>
              <div style={{ flex: 1, height: 1, background: GW.line }} />
            </div>
            <ApptCard rec={liveRec} live onResume={() => setLiveOpen(true)} onOpen={() => setLiveOpen(true)} />
          </React.Fragment>
        )}

        {records.length === 0 && !liveBusy && (
          <div style={{ marginTop: 16, background: GW.white, border: '1.5px dashed ' + GW.slateSoft, borderRadius: 14, padding: '26px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16, color: GW.navy }}>No appointments yet</div>
            <div style={{ fontSize: 13.5, color: GW.muted, margin: '6px 0 16px' }}>Plan your day — add the customers you’re visiting and start each one from here.</div>
            <button onClick={() => setFormRec({})} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 24, border: 'none', cursor: 'pointer', background: GW.navy, color: '#fff', fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Add appointment
            </button>
          </div>
        )}

        {/* logged groups */}
        {order.map(label => (
          <DayGroup key={label} label={label} records={groups[label]} onResume={onOpenAppointment} onOpen={openRecord} />
        ))}
      </div>

      {detail && <ApptDetail rec={detail}
        onEdit={() => { const r = detail; setDetail(null); setFormRec(r); }}
        onClose={() => setDetail(null)} />}
      {schedDetail && <ScheduledSheet rec={schedDetail}
        onStart={() => startScheduled(schedDetail)}
        onEdit={() => { const r = schedDetail; setSchedDetail(null); setFormRec(r); }}
        onDelete={(id) => { cal.remove(id); setSchedDetail(null); }}
        onClose={() => setSchedDetail(null)} />}
      {formRec && <ApptForm rec={formRec.id ? formRec : null}
        onClose={() => setFormRec(null)}
        onSave={(payload) => {
          const id = formRec.id ? (cal.update(formRec.id, payload), formRec.id) : cal.add({ status: 'scheduled', ...payload });
          setFormRec(null);
          // Geocode the (possibly new) address in the background and store the
          // coords on the record so distance + map links stay stable.
          const addr = payload.customer && payload.customer.address;
          if (addr && window.GeoDist) {
            window.GeoDist.geocode(addr).then(c => { if (c) cal.update(id, { lat: c.lat, lon: c.lon }); });
          } else if (formRec.id) {
            cal.update(id, { lat: undefined, lon: undefined }); // address cleared
          }
        }} />}
      {liveOpen && liveBusy && <LiveSheet rec={liveRec}
        onResume={() => { setLiveOpen(false); onOpenAppointment(); }}
        onClear={() => { store.reset(); setLiveOpen(false); }}
        onClose={() => setLiveOpen(false)} />}
    </div>
  );
}

Object.assign(window, { CalendarView });
