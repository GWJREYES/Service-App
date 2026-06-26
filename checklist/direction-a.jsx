// DIRECTION A — "Command Bar"
// Horizontal S.E.R.V.I.C.E. tile strip across the top (echoes the slide),
// active stage's checklist below in a two-column working view.

function DirA_Stage({ stage, idx, active, stats, onClick }) {
  const st = active ? 'active' : (stats.complete ? 'done' : 'todo');
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer',
      background: active ? GW.white : 'transparent', border: 'none',
      borderRadius: 12, padding: '12px 4px 11px',
      boxShadow: active ? '0 6px 18px rgba(27,44,79,.12)' : 'none',
      outline: active ? '1px solid ' + GW.line : 'none', transition: 'all .18s ease',
    }}>
      <LetterTile letter={stage.letter} state={st} size={42} />
      <span style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 800, fontSize: 10.5, letterSpacing: '.13em',
        color: active ? GW.navy : GW.muted, textTransform: 'uppercase' }}>{stage.name}</span>
      <div style={{ width: '74%', height: 4, borderRadius: 4, background: GW.slateWash, overflow: 'hidden' }}>
        <div style={{ width: stats.pct + '%', height: '100%', background: stats.complete ? GW.green : GW.gold, transition: 'width .4s ease' }} />
      </div>
    </button>
  );
}

function DirA_Item({ item }) {
  const store = React.useContext(DirA_Ctx);
  const st = itemStats(store.state, item);
  const done = st.done === st.total;
  return (
    <div style={{ background: GW.white, border: '1px solid ' + GW.line, borderRadius: 14, padding: '16px 18px', marginBottom: 14,
      boxShadow: '0 1px 2px rgba(27,44,79,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {item.flag && <PlaneGlyph color={GW.gold} size={16} />}
        <h3 style={{ margin: 0, fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 16.5,
          color: item.flag ? GW.gold : GW.navy }}>{item.title}</h3>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700,
          color: done ? GW.green : GW.faint, background: done ? GW.greenWash : GW.panel, padding: '3px 9px', borderRadius: 20 }}>
          {st.done}/{st.total}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {item.subtasks.map((t, i) => {
          const k = subKey(item.id, i), checked = store.isChecked(k);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <CheckCircle checked={checked} onClick={() => store.toggle(k)} size={26} />
              <div style={{ flex: 1, paddingTop: 3 }}>
                <span onClick={() => store.toggle(k)} style={{ cursor: 'pointer', fontSize: 14.5, lineHeight: 1.4,
                  color: checked ? GW.faint : GW.ink, textDecoration: checked ? 'line-through' : 'none' }}>{stText(t)}</span>
                {stHint(t) && <div style={{ display: 'flex', gap: 6, fontSize: 12.5, color: GW.muted, marginTop: 4 }}><span style={{ color: GW.gold, fontWeight: 700 }}>↳</span><span>{stHint(t)}</span></div>}
              </div>
            </div>
          );
        })}
      </div>
      {item.script && <ScriptCard script={item.script} accent={GW.navy} />}
      <NotesPhotos item={item} store={store} accent={GW.slate} />
    </div>
  );
}

const DirA_Ctx = React.createContext(null);

// Small adaptive control beside the timer (start scouting / start appointment).
function TimerControl({ label, onClick, tone = 'navy' }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 24, border: 'none', cursor: 'pointer',
      background: tone === 'green' ? GW.green : GW.navy, color: '#fff', fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      {label}
    </button>
  );
}

function DirectionA({ store: storeProp, onOpenCalendar }) {
  const ownStore = useApptStore('gw-appt-A');
  const store = storeProp || ownStore;
  const [active, setActive] = React.useState(0);
  const [endOpen, setEndOpen] = React.useState(false);
  const stage = SERVICE[active];
  const overall = overallStats(store.state);
  const sStats = stageStats(store.state, stage);

  // Timer phase automation: start on first scouting activity, auto-pause when
  // Scout is fully complete, then the tech resumes manually at the appointment.
  const timer = store.state.timer || {};
  const phase = timer.phase || 'idle';
  const scoutStats = stageStats(store.state, SERVICE[0]);
  const scoutComplete = scoutStats.complete;
  const scoutStarted = scoutStats.done > 0;
  React.useEffect(() => {
    if (phase === 'idle' && scoutStarted && !scoutComplete) store.startTimer('scouting');
  }, [phase, scoutStarted, scoutComplete]);
  React.useEffect(() => {
    if (phase === 'scouting' && scoutComplete) store.pauseTimer('scout_done');
  }, [phase, scoutComplete]);

  return (
    <DirA_Ctx.Provider value={store}>
    <div style={{ width: 1194, height: 834, background: GW.white, borderRadius: 20, overflow: 'hidden', position: 'relative',
      border: '1px solid ' + GW.line, display: 'flex', flexDirection: 'column', fontFamily: 'Public Sans, sans-serif' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 26px', borderBottom: '1px solid ' + GW.line }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.32em', color: GW.slate, fontWeight: 800 }}>S.E.R.V.I.C.E.&nbsp; PROCESS</div>
          <h1 style={{ margin: '3px 0 0', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 25, color: GW.navy, letterSpacing: '-.01em' }}>Service Appointment Checklist</h1>
        </div>
        <div style={{ marginLeft: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AppointmentTimer timer={store.state.timer} />
          {phase === 'idle' && <TimerControl label="Start scouting" onClick={() => store.startTimer('scouting')} />}
          {phase === 'scout_done' && <TimerControl label="Start appointment" tone="green" onClick={() => store.startTimer('onsite')} />}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {onOpenCalendar && (
            <button onClick={onOpenCalendar} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 24,
              border: '1.5px solid ' + GW.line, background: GW.white, color: GW.navy, fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              Schedule
            </button>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 18, color: GW.navy }}>{overall.done} <span style={{ color: GW.faint, fontWeight: 600, fontSize: 14 }}>/ {overall.total} steps</span></div>
            <button onClick={() => { if (confirm('Reset this appointment for the next customer?')) store.reset(); }} style={{
              marginTop: 4, fontSize: 11.5, fontWeight: 700, color: GW.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>↻ Reset appointment</button>
          </div>
          <SendReportButton store={store} onViewCalendar={onOpenCalendar} />
          <ProgressRing pct={overall.pct} size={58} stroke={7} />
        </div>
      </div>

      {/* customer information */}
      <CustomerBar store={store} />

      {/* tile strip */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px', background: GW.panel, borderBottom: '1px solid ' + GW.line }}>
        {SERVICE.map((s, i) => (
          <DirA_Stage key={s.key} stage={s} idx={i} active={i === active}
            stats={stageStats(store.state, s)} onClick={() => setActive(i)} />
        ))}
      </div>

      {/* body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* left working column */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <LetterTile letter={stage.letter} state={sStats.complete ? 'done' : 'active'} size={54} />
            <div>
              <h2 style={{ margin: 0, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 23, color: GW.navy }}>{stage.name}</h2>
              <div style={{ fontSize: 13.5, color: GW.muted }}>{stage.tagline}</div>
            </div>
            <div style={{ marginLeft: 'auto', minWidth: 160 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: GW.muted, marginBottom: 5 }}>
                <span>Stage progress</span><span style={{ color: sStats.complete ? GW.green : GW.gold }}>{sStats.pct}%</span>
              </div>
              <div style={{ height: 7, borderRadius: 7, background: GW.slateWash, overflow: 'hidden' }}>
                <div style={{ width: sStats.pct + '%', height: '100%', background: sStats.complete ? GW.green : GW.gold, transition: 'width .4s ease' }} />
              </div>
            </div>
          </div>
          {VOICE_STAGES.has(stage.key) && <ConversationRecorder key={stage.key} stage={stage} store={store} accent={GW.navy} />}
          {stage.items.map(it => <DirA_Item key={it.id} item={it} />)}

          {stage.key === 'extend' && (
            store.state.endedAt ? (
              <div style={{ marginTop: 8, background: GW.greenWash, border: '1px solid #BFE3CC', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: GW.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 18, color: '#2A6B45' }}>Appointment ended</div>
                  <div style={{ fontSize: 13, color: '#3C7C56', marginTop: 3 }}>Report sent and filed to your schedule. You can reset for the next customer from the header.</div>
                </div>
                {onOpenCalendar && <button onClick={onOpenCalendar} style={{ padding: '13px 20px', borderRadius: 12, border: 'none', background: GW.navy, color: '#fff', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>View schedule</button>}
              </div>
            ) : (
              <div style={{ marginTop: 8, background: GW.navy, borderRadius: 16, padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 19, color: '#fff' }}>Wrap up &amp; end appointment</div>
                  <div style={{ fontSize: 13, color: GW.slateSoft, marginTop: 4, maxWidth: 460 }}>Review what you captured, send the report to {MANAGER.name.split(' ')[0]}, and file this visit to your schedule.</div>
                </div>
                <button onClick={() => setEndOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 24px', borderRadius: 13, border: 'none',
                  background: GW.gold, color: GW.navyDeep, fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', flexShrink: 0, boxShadow: '0 6px 16px rgba(0,0,0,.25)' }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={GW.navyDeep} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                  End appointment
                </button>
              </div>
            )
          )}
        </div>

        {/* right rail */}
        <div style={{ width: 286, borderLeft: '1px solid ' + GW.line, background: GW.panel, padding: '22px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid ' + GW.line }}>
            <ProgressRing pct={overall.pct} size={96} stroke={10} label="complete" />
            <div style={{ marginTop: 10, fontSize: 13, color: GW.muted, textAlign: 'center' }}>
              {overall.pct === 100 ? 'Appointment complete — great work!' : `${overall.total - overall.done} steps to go`}
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: GW.faint, textTransform: 'uppercase', margin: '18px 0 10px' }}>All stages</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SERVICE.map((s, i) => {
              const ss = stageStats(store.state, s);
              return (
                <button key={s.key} onClick={() => setActive(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
                  background: i === active ? GW.white : 'transparent', border: i === active ? '1px solid ' + GW.line : '1px solid transparent', textAlign: 'left' }}>
                  <LetterTile letter={s.letter} state={i === active ? 'active' : (ss.complete ? 'done' : 'todo')} size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: GW.navy }}>{s.name}</div>
                    <div style={{ height: 4, borderRadius: 4, background: GW.slateWash, overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ width: ss.pct + '%', height: '100%', background: ss.complete ? GW.green : GW.gold }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ss.complete ? GW.green : GW.faint }}>{ss.pct}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {endOpen && <ReportSheet store={store} ending onClose={() => setEndOpen(false)} onViewCalendar={onOpenCalendar} />}
    </div>
    </DirA_Ctx.Provider>
  );
}

window.DirectionA = DirectionA;
