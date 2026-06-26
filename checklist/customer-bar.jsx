// Customer information bar — sits below the header, above the S.E.R.V.I.C.E.
// tiles. Always visible; the tech confirms/edits on arrival. Persists to the
// appointment store and flows into the report header.

const GW = window.GW;

const CUSTOMER_FIELDS = [
  { key: 'account', label: 'Account #', placeholder: 'GW-000000', w: 130,
    icon: <path d="M3 7h18M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7M3 7l2-3h14l2 3M8 13h4" /> },
  { key: 'name', label: 'Customer name', placeholder: 'Add name', w: 200,
    icon: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /> },
  { key: 'address', label: 'Service address', placeholder: 'Add address', w: 320, grow: true,
    icon: <path d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5" /> },
  { key: 'phone', label: 'Primary phone', placeholder: '(000) 000-0000', w: 170,
    icon: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /> },
];

function CustomerField({ field, value, onChange }) {
  const [editing, setEditing] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  const filled = value && value.length > 0;

  return (
    <div style={{ flex: field.grow ? '1 1 ' + field.w + 'px' : '0 0 ' + field.w + 'px', minWidth: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.11em', color: GW.faint, textTransform: 'uppercase', marginBottom: 3 }}>{field.label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GW.slate} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{field.icon}</svg>
        {editing ? (
          <input ref={ref} value={value || ''} onChange={e => onChange(e.target.value)} onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }} placeholder={field.placeholder}
            style={{ width: '100%', minWidth: 0, border: 'none', borderBottom: '2px solid ' + GW.gold, background: 'transparent',
              fontFamily: 'Public Sans, sans-serif', fontWeight: 700, fontSize: 14, color: GW.navy, padding: '1px 0', outline: 'none' }} />
        ) : (
          <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%', minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: filled ? GW.navy : GW.faint,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{filled ? value : field.placeholder}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function CustomerBar({ store }) {
  const cust = store.state.customer || {};
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '11px 26px',
      background: GW.slateWash, borderBottom: '1px solid ' + GW.line }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: GW.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
        </div>
        <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 11, letterSpacing: '.12em', color: GW.slate, textTransform: 'uppercase', writingMode: 'horizontal-tb' }}>Customer</span>
      </div>
      <div style={{ width: 1, alignSelf: 'stretch', background: GW.line, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 28, minWidth: 0 }}>
        {CUSTOMER_FIELDS.map(f => (
          <CustomerField key={f.key} field={f} value={cust[f.key]} onChange={v => store.setCustomer(f.key, v)} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CUSTOMER_FIELDS, CustomerBar });
