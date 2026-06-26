// PRIMARY APP — Direction A ("Command Bar") + the technician Schedule.
// Both are fixed 1194×834 canvases; this stage letterboxes + scales whichever
// view is active to fit any viewport. State (the live appointment store) is
// lifted here so the Schedule can show the in-progress job.

function PrimaryStage() {
  const [scale, setScale] = React.useState(1);
  const [view, setView] = React.useState('checklist');
  const store = useApptStore('gw-appt-A');
  const W = 1194, H = 834;

  React.useEffect(() => {
    const fit = () => {
      const pad = 24;
      const s = Math.min((window.innerWidth - pad) / W, (window.innerHeight - pad) / H);
      setScale(Math.min(s, 1.4));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0E1729', display: 'flex',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'center center',
        boxShadow: '0 24px 70px rgba(0,0,0,.5)', borderRadius: 20 }}>
        {view === 'checklist'
          ? <DirectionA store={store} onOpenCalendar={() => setView('calendar')} />
          : <CalendarView store={store} onOpenAppointment={() => setView('checklist')} />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PrimaryStage />);
