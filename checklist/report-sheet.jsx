// Persistent "Send report" header button + the report sheet it opens.
// Drives the REAL appointment store, so it reflects whatever the tech has
// actually captured — and works even when the workflow isn't finished.
// Recipient: the tech's manager.

const GW = window.GW;
const SERVICE = window.SERVICE;

const MANAGER = { name: 'Justin Reyes', email: 'Justin.Reyes@groundworks.com', role: 'Service Manager' };

function nowStr() {
  try { return new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch (e) { return ''; }
}

function RS_Label({ children }) {
  return <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.13em', color: GW.faint, textTransform: 'uppercase', margin: '0 0 9px' }}>{children}</div>;
}

// The header pill. `solid` for light headers; `onDark` flips colors for navy.
function SendReportButton({ store, onDark = false, size = 'md', onViewCalendar }) {
  const [open, setOpen] = React.useState(false);
  const pad = size === 'sm' ? '9px 15px' : '11px 18px';
  const fs = size === 'sm' ? 13 : 14;
  return (
    <React.Fragment>
      <button onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: pad, borderRadius: 24, cursor: 'pointer',
        border: onDark ? '1.5px solid rgba(255,255,255,.22)' : 'none',
        background: onDark ? 'rgba(255,255,255,.1)' : GW.navy, color: '#fff',
        fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: fs, whiteSpace: 'nowrap',
        boxShadow: onDark ? 'none' : '0 2px 8px rgba(27,44,79,.22)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
        Send report
      </button>
      {open && <ReportSheet store={store} onClose={() => setOpen(false)} onViewCalendar={onViewCalendar} />}
    </React.Fragment>
  );
}

// Full-card overlay + centered sheet. Absolutely positioned to the nearest
// positioned ancestor (each direction's root is position:relative), so it
// stays inside the device frame.
function ReportSheet({ store, onClose, onViewCalendar, ending }) {
  const r = buildReport(store.state);
  const cust = store.state.customer || {};
  const custName = cust.name || 'Customer not set';
  const complete = r.overall.pct === 100 && r.flags.length === 0;
  const [sent, setSent] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [outcome, setOutcome] = React.useState(complete ? 'Agreement signed' : 'Follow-up scheduled');
  const [sending, setSending] = React.useState(false);
  const [sentVia, setSentVia] = React.useState('backend');

  const OUTCOMES = ['Agreement signed', 'Follow-up scheduled', 'Estimate left', 'No sale'];

  const tTotal = window.timerTotalMs ? window.timerTotalMs(store.state.timer) : 0;
  const tScout = (store.state.timer && store.state.timer.scoutMs) || 0;
  const tOnsite = Math.max(0, tTotal - tScout);

  const tech = (window.Calendar && window.Calendar.TECH && window.Calendar.TECH.name) || '';
  const dateStr = new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  function buildSubject() { return 'Service Report — ' + custName + ' — ' + outcome; }

  // Plain-text report (used for the mailto fallback + the email's text part).
  function buildLines() {
    const L = [];
    L.push('SERVICE APPOINTMENT REPORT');
    L.push('');
    L.push('Customer: ' + custName);
    if (cust.account) L.push('Account: ' + cust.account);
    if (cust.address) L.push('Address: ' + cust.address);
    if (cust.phone) L.push('Phone: ' + cust.phone);
    L.push('');
    if (tech) L.push('Technician: ' + tech);
    L.push('Date: ' + dateStr);
    L.push('Outcome: ' + outcome);
    L.push('');
    L.push('TIME');
    L.push('  Scouting:     ' + fmtClock(tScout));
    L.push('  On-site:      ' + fmtClock(tOnsite));
    L.push('  Total active: ' + fmtClock(tTotal));
    L.push('');
    L.push('COMPLETION: ' + r.overall.done + '/' + r.overall.total + ' steps (' + r.overall.pct + '%)');
    r.stages.forEach(st => L.push('  ' + (st.complete ? '[x]' : '[ ]') + ' ' + st.name + ' — ' + st.done + '/' + st.total + ' (' + st.pct + '%)'));
    L.push('');
    L.push('CAPTURED: ' + r.photoCount + ' photos · ' + r.recCount + ' recordings · ' + r.notesList.length + ' notes');
    if (r.flags.length) {
      L.push(''); L.push('FLAGGED (' + r.flags.length + '):');
      r.flags.forEach(f => L.push('  • ' + f.stage + ' — ' + f.label + ' (' + f.detail + ')'));
    }
    if (r.notesList.length) {
      L.push(''); L.push('FIELD NOTES:');
      r.notesList.forEach(n => L.push('  - ' + n.stage + ' / ' + n.item + ': ' + n.text));
    }
    if (note && note.trim()) { L.push(''); L.push('NOTE FROM TECH:'); L.push('  ' + note.trim()); }
    L.push('');
    L.push('(Recordings are saved to the job record in the app.)');
    return L;
  }
  function buildMailto() {
    return 'mailto:' + encodeURIComponent(MANAGER.email) + '?subject=' + encodeURIComponent(buildSubject()) + '&body=' + encodeURIComponent(buildLines().join('\n'));
  }

  // Branded HTML body for the real email.
  function buildHtml() {
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const stageRows = r.stages.map(st => `<tr><td style="padding:5px 0;font:600 13px Arial;color:#232A33">${st.complete ? '✓' : '○'} ${esc(st.name)}</td><td align="right" style="padding:5px 0;font:700 13px Arial;color:${st.complete ? '#3E8E5A' : '#C49A4C'}">${st.done}/${st.total} · ${st.pct}%</td></tr>`).join('');
    const flagsHtml = r.flags.length ? `<div style="margin:16px 0;padding:12px 14px;background:#FBF3E0;border:1px solid #EFD9A8;border-radius:8px"><div style="font:800 11px Arial;letter-spacing:.1em;color:#9A7426;text-transform:uppercase;margin-bottom:6px">Flagged (${r.flags.length})</div>${r.flags.map(f => `<div style="font:600 13px Arial;color:#232A33;margin:3px 0">• <b>${esc(f.stage)}</b> — ${esc(f.label)}</div>`).join('')}</div>` : '';
    const notesHtml = r.notesList.length ? `<div style="margin:16px 0"><div style="font:800 11px Arial;letter-spacing:.1em;color:#97A0AC;text-transform:uppercase;margin-bottom:8px">Field notes</div>${r.notesList.map(n => `<div style="border-left:3px solid #C49A4C;padding-left:10px;margin:8px 0"><div style="font:700 11px Arial;color:#7AA4C0">${esc(n.stage)} · ${esc(n.item)}</div><div style="font:400 13px Arial;color:#232A33;margin-top:2px">${esc(n.text)}</div></div>`).join('')}</div>` : '';
    const techNote = (note && note.trim()) ? `<div style="margin:16px 0;padding:12px 14px;background:#F4F6F9;border-radius:8px"><div style="font:800 11px Arial;letter-spacing:.1em;color:#97A0AC;text-transform:uppercase;margin-bottom:4px">Note from ${esc(tech || 'technician')}</div><div style="font:400 13px Arial;color:#232A33">${esc(note.trim())}</div></div>` : '';
    return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#232A33">
  <div style="background:#1B2C4F;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
    <div style="font:800 10px Arial;letter-spacing:.28em;color:#AAC6D8">S.E.R.V.I.C.E. PROCESS</div>
    <div style="font:800 20px Arial;margin-top:6px">Service Appointment Report</div>
  </div>
  <div style="border:1px solid #E3E7EC;border-top:none;padding:22px 24px;border-radius:0 0 10px 10px">
    <div style="font:800 17px Arial">${esc(custName)}</div>
    <div style="font:400 13px Arial;color:#6B7482;margin-top:3px">${esc([cust.account, cust.address, cust.phone].filter(Boolean).join(' · '))}</div>
    <table style="width:100%;margin-top:14px;border-collapse:collapse">
      <tr><td style="padding:3px 0;font:600 13px Arial;color:#6B7482">Technician</td><td align="right" style="font:700 13px Arial">${esc(tech)}</td></tr>
      <tr><td style="padding:3px 0;font:600 13px Arial;color:#6B7482">Date</td><td align="right" style="font:700 13px Arial">${esc(dateStr)}</td></tr>
      <tr><td style="padding:3px 0;font:600 13px Arial;color:#6B7482">Outcome</td><td align="right" style="font:800 13px Arial;color:#1B2C4F">${esc(outcome)}</td></tr>
    </table>
    <table style="width:100%;margin-top:16px;border-collapse:collapse;text-align:center">
      <tr>
        <td style="padding:12px;background:#FBF3E0;border-radius:8px"><div style="font:800 18px Arial;color:#7A5410">${fmtClock(tScout)}</div><div style="font:700 11px Arial;color:#9A7426;margin-top:4px">Scouting</div></td>
        <td style="width:8px"></td>
        <td style="padding:12px;background:#E6F1EA;border-radius:8px"><div style="font:800 18px Arial;color:#2A6B45">${fmtClock(tOnsite)}</div><div style="font:700 11px Arial;color:#3C7C56;margin-top:4px">On-site</div></td>
        <td style="width:8px"></td>
        <td style="padding:12px;background:#1B2C4F;border-radius:8px"><div style="font:800 18px Arial;color:#fff">${fmtClock(tTotal)}</div><div style="font:700 11px Arial;color:#AAC6D8;margin-top:4px">Total</div></td>
      </tr>
    </table>
    <div style="margin-top:18px;font:800 11px Arial;letter-spacing:.1em;color:#97A0AC;text-transform:uppercase">Completion · ${r.overall.done}/${r.overall.total} (${r.overall.pct}%)</div>
    <table style="width:100%;margin-top:6px;border-collapse:collapse">${stageRows}</table>
    <div style="margin-top:14px;font:600 13px Arial;color:#6B7482">${r.photoCount} photos · ${r.recCount} recordings · ${r.notesList.length} notes captured</div>
    ${flagsHtml}${notesHtml}${techNote}
  </div>
</div>`;
  }

  // Collect on-device captured photos as attachments, within a size budget.
  function collectAttachments() {
    const out = []; let budget = 2.5 * 1024 * 1024;
    const ph = store.state.photos || {};
    Object.keys(ph).forEach(id => (ph[id] || []).forEach(p => {
      if (typeof p === 'string' && p.indexOf('data:') === 0) {
        const approx = Math.ceil((p.length - p.indexOf(',')) * 0.75);
        if (out.length < 8 && approx < budget) { out.push({ filename: 'photo-' + (out.length + 1) + '.jpg', dataUrl: p }); budget -= approx; }
      }
    }));
    return out;
  }
  function buildPayload() {
    return { to: MANAGER.email, subject: buildSubject(), text: buildLines().join('\n'), html: buildHtml(), attachments: collectAttachments() };
  }
  async function postReport() {
    const endpoint = window.REPORT_ENDPOINT || '/api/send-report';
    const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) });
    if (!resp.ok) throw new Error('status ' + resp.status);
    return resp.json().catch(() => ({}));
  }
  function openDraft() {
    const a = document.createElement('a');
    a.href = buildMailto(); a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch (e) {} }, 0);
  }

  async function handleSend() {
    setSending(true);
    const totalMs = (window.timerTotalMs ? window.timerTotalMs(store.state.timer) : 0);
    const scoutMs = (store.state.timer && store.state.timer.scoutMs) || 0;
    const onsiteMs = Math.max(0, totalMs - scoutMs);
    const startedAt = Date.now() - (onsiteMs || 92 * 60000);
    if (window.Calendar) {
      window.Calendar.add({
        status: 'completed',
        customer: { name: custName, account: cust.account || '—', address: cust.address || 'Address not set', phone: cust.phone || '' },
        start: startedAt, end: Date.now(), completedAt: Date.now(),
        scoutMs, onsiteMs, totalMs,
        done: r.overall.done, total: r.overall.total, pct: r.overall.pct,
        photos: r.photoCount, recordings: r.recCount, notes: r.notesList.length,
        outcome, sentTo: MANAGER.name,
      });
    }
    if (ending && store.endAppointment) store.endAppointment();
    let via = 'backend';
    try { await postReport(); }
    catch (e) { via = 'mailto'; openDraft(); }
    setSentVia(via);
    setSending(false);
    setSent(true);
  }

  const Kpi = ({ value, unit, label, accent }) => (
    <div style={{ flex: 1, background: GW.panel, border: '1px solid ' + GW.line, borderRadius: 12, padding: '12px 13px' }}>
      <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 24, color: accent || GW.navy, lineHeight: 1, letterSpacing: '-.02em' }}>
        {value}{unit && <span style={{ fontSize: 13, fontWeight: 700, color: GW.faint, marginLeft: 3 }}>{unit}</span>}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: GW.muted, marginTop: 6 }}>{label}</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(15,23,40,.5)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28,
      fontFamily: 'Public Sans, sans-serif' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 660, maxWidth: '100%', maxHeight: '100%', background: GW.white,
        borderRadius: 20, boxShadow: '0 30px 80px rgba(15,23,40,.45)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px', borderBottom: '1px solid ' + GW.line, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 20, color: GW.navy, letterSpacing: '-.01em' }}>{ending ? 'End appointment' : 'Send appointment report'}</h2>
            <div style={{ fontSize: 12.5, color: GW.muted, marginTop: 2 }}>{nowStr()}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, border: 'none',
            background: GW.panel, color: GW.muted, cursor: 'pointer', fontSize: 19, lineHeight: '32px', padding: 0, flexShrink: 0 }}>×</button>
        </div>

        {sent ? (
          /* ---------- success ---------- */
          <div style={{ padding: '52px 32px 56px', textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: GW.greenWash, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke={GW.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 style={{ margin: 0, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 22, color: GW.navy }}>{ending ? 'Appointment ended' : 'Report sent'}</h3>
            <p style={{ margin: '10px auto 0', fontSize: 14.5, color: GW.muted, lineHeight: 1.55, maxWidth: 380 }}>
              {sentVia === 'backend'
                ? <>A high-level summary {r.flags.length > 0 ? '— flagged items included — ' : ''}was emailed to <strong style={{ color: GW.navy }}>{MANAGER.name}</strong> at <strong style={{ color: GW.navy }}>{MANAGER.email}</strong>, and this appointment was saved to your schedule.</>
                : <>The email service was unreachable, so we opened a draft to <strong style={{ color: GW.navy }}>{MANAGER.name}</strong> at <strong style={{ color: GW.navy }}>{MANAGER.email}</strong> in your mail app instead. Tap send there. The appointment was saved to your schedule.</>}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18, background: GW.slateWash, borderRadius: 20, padding: '8px 15px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GW.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: GW.navy }}>Filed on your schedule · {outcome}</span>
            </div>
            <div style={{ marginTop: 12, minHeight: 20 }}>
              {sentVia === 'mailto' && <button onClick={openDraft} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', color: GW.muted, fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 13 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M4 7l8 5 8-5" /></svg>
                Email didn’t open? Re-open draft
              </button>}
            </div>
            <div style={{ display: 'flex', gap: 11, justifyContent: 'center', marginTop: 24 }}>
              <button onClick={onClose} style={{ padding: '14px 28px', borderRadius: 12, border: '1.5px solid ' + GW.line,
                background: GW.white, color: GW.navy, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Done</button>
              {onViewCalendar && <button onClick={() => { onClose(); onViewCalendar(); }} style={{ padding: '14px 28px', borderRadius: 12, border: 'none',
                background: GW.navy, color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>View my schedule</button>}
            </div>
          </div>
        ) : (
          <React.Fragment>
            {/* scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* customer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: GW.navy, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16.5, color: '#fff' }}>{custName}</div>
                  <div style={{ fontSize: 12.5, color: GW.slateSoft, display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 2 }}>
                    {cust.account && <span>Acct {cust.account}</span>}
                    {cust.address && <span>{cust.address}</span>}
                    {cust.phone && <span>{cust.phone}</span>}
                    {!cust.address && !cust.phone && !cust.account && <span style={{ fontStyle: 'italic' }}>No customer details entered</span>}
                  </div>
                </div>
              </div>

              {complete ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: GW.greenWash, border: '1px solid #BFE3CC', borderRadius: 12, padding: '13px 16px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke={GW.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#2A6B45' }}>Full workflow complete — everything captured.</span>
                </div>
              ) : (
                <div style={{ background: '#FBF3E0', border: '1px solid #EFD9A8', borderRadius: 12, padding: '13px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B57A12" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#7A5410' }}>Appointment isn’t fully complete — you can still send what you have.</span>
                  </div>
                  {r.flags.length > 0 && (
                    <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px dashed #E3C887', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: '#9A7426', textTransform: 'uppercase' }}>Flagged for {MANAGER.name.split(' ')[0]}</div>
                      {r.flags.slice(0, 5).map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C99A2E', flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, color: GW.navy }}>{f.stage}</span>
                          <span style={{ color: GW.muted }}>· {f.label}</span>
                        </div>
                      ))}
                      {r.flags.length > 5 && <div style={{ fontSize: 12, color: '#9A7426', fontWeight: 600, paddingLeft: 13 }}>+ {r.flags.length - 5} more</div>}
                    </div>
                  )}
                </div>
              )}

              {/* time on appointment */}
              <div>
                <RS_Label>Time on this appointment</RS_Label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: '#FBF3E0', border: '1px solid #EFD9A8', borderRadius: 12, padding: '12px 13px' }}>
                    <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 21, color: '#7A5410', lineHeight: 1 }}>{fmtClock(tScout)}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9A7426', marginTop: 6 }}>Scouting</div>
                  </div>
                  <div style={{ flex: 1, background: GW.greenWash, border: '1px solid #BFE3CC', borderRadius: 12, padding: '12px 13px' }}>
                    <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 21, color: '#2A6B45', lineHeight: 1 }}>{fmtClock(tOnsite)}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#3C7C56', marginTop: 6 }}>On-site</div>
                  </div>
                  <div style={{ flex: 1, background: GW.navy, borderRadius: 12, padding: '12px 13px' }}>
                    <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 21, color: '#fff', lineHeight: 1 }}>{fmtClock(tTotal)}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: GW.slateSoft, marginTop: 6 }}>Total active</div>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: 'flex', gap: 10 }}>
                <Kpi value={r.overall.done} unit={'/ ' + r.overall.total} label="Steps done" accent={complete ? GW.green : GW.navy} />
                <Kpi value={r.photoCount} label="Photos" />
                <Kpi value={r.recCount} label="Recordings" />
                <Kpi value={r.notesList.length} label="Notes" />
              </div>

              {/* stage completion */}
              <div>
                <RS_Label>Stage completion</RS_Label>
                <div style={{ background: GW.white, border: '1px solid ' + GW.line, borderRadius: 12, padding: '4px 14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
                    {r.stages.map(st => <StageRow key={st.key} st={st} compact />)}
                  </div>
                </div>
              </div>

              {/* attachments */}
              {(r.photoCount > 0 || r.recCount > 0 || r.notesList.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <RS_Label>Photos · {r.photoCount}</RS_Label>
                    {r.photoCount > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                        {r.photosList.flatMap(p => p.labels).slice(0, 8).map((lbl, i) => {
                          const isImg = typeof lbl === 'string' && /^(data:|https?:|blob:|\/)/.test(lbl);
                          return isImg
                            ? <div key={i} style={{ aspectRatio: '4 / 3', borderRadius: 7, overflow: 'hidden', border: '1px solid ' + GW.line, background: GW.panelDeep }}>
                                <img src={lbl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                            : <Thumb key={i} label={typeof lbl === 'string' && lbl.length < 24 ? lbl : ''} i={i} radius={7} />;
                        })}
                      </div>
                    ) : <div style={{ fontSize: 12.5, color: GW.faint }}>None captured</div>}
                  </div>
                  <div>
                    <RS_Label>Recordings{r.recCount > 0 ? ' · ' + fmtDur(r.recDur) : ''}</RS_Label>
                    {r.recCount > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {r.recList.slice(0, 3).map((rec, i) => <RecRow key={i} r={rec} i={i} />)}
                      </div>
                    ) : <div style={{ fontSize: 12.5, color: GW.faint }}>None captured</div>}
                  </div>
                </div>
              )}

              {/* outcome */}
              <div>
                <RS_Label>Appointment outcome</RS_Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {OUTCOMES.map(o => (
                    <button key={o} onClick={() => setOutcome(o)} style={{ flex: 1, padding: '11px 8px', borderRadius: 10, cursor: 'pointer',
                      border: '1.5px solid ' + (outcome === o ? GW.navy : GW.line), background: outcome === o ? GW.navy : GW.white,
                      color: outcome === o ? '#fff' : GW.muted, fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 12.5 }}>{o}</button>
                  ))}
                </div>
              </div>

              {/* note to manager */}
              <div>
                <RS_Label>Add a note for {MANAGER.name.split(' ')[0]} (optional)</RS_Label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything the office should know…"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: 52, resize: 'vertical', border: '1.5px solid ' + GW.line,
                    borderRadius: 10, padding: '10px 12px', fontFamily: 'Public Sans, sans-serif', fontSize: 13.5, color: GW.ink, background: GW.panel, outline: 'none' }} />
              </div>
            </div>

            {/* footer */}
            <div style={{ flexShrink: 0, borderTop: '1px solid ' + GW.line, padding: '14px 24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: GW.slateWash, borderRadius: 11, padding: '11px 14px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: GW.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {MANAGER.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: GW.slate, textTransform: 'uppercase' }}>To · {MANAGER.role}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: GW.navy }}>{MANAGER.name} <span style={{ color: GW.muted, fontWeight: 500 }}>· {MANAGER.email}</span></div>
                </div>
              </div>
              <button onClick={handleSend} disabled={sending} style={{ width: '100%', padding: '16px', borderRadius: 13, border: 'none', cursor: sending ? 'default' : 'pointer',
                background: sending ? GW.slate : (complete ? GW.navy : '#C99A2E'), color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 16px rgba(27,44,79,.26)' }}>
                {sending ? 'Sending…' : (ending ? 'End appointment & send to ' + MANAGER.name.split(' ')[0] : (complete ? 'Email report to ' + MANAGER.name.split(' ')[0] : 'Send what I have to ' + MANAGER.name.split(' ')[0]))}
                {!sending && <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>}
              </button>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MANAGER, SendReportButton, ReportSheet });
