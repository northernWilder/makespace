import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { calculate, correctionDirection, initialInputs, type CalibrationInputs, type CalibrationResult } from './calibration';
import { formatDistance, inputsForDisplay, inputToMm, type Unit } from './units';
import { cloud, type Entry, type EntryKind } from './cloud';
import MarkingGuide from './MarkingGuide';
import DowelZeroGuide from './DowelZeroGuide';

type Tab = 'calibration' | 'edge-zero' | 'history' | 'note' | 'setting' | 'protocol';
const resourceLabels = { note: 'Notes', setting: 'Settings', protocol: 'Protocols' };
const inputLabels: Record<keyof CalibrationInputs, string> = {
  width: 'Commanded test width',
  length: 'Commanded test length',
  switchSpan: 'Measured homing contact span',
  diagonalA: 'Diagonal A',
  diagonalB: 'Diagonal B',
  tolerance: 'Diagonal tolerance',
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    square: 'M4 3h5v12h12v6H4V3Z M4 8h2 M4 12h2 M4 16h2 M13 18v3 M17 18v3',
    router: 'M3 21V4 M21 21V4 M3 7h18 M3 17h18 M8 5h8v6H8V5Z M12 11v4 M6 21h12',
    clock: 'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    note: 'M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5',
    setting: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
    protocol: 'M8 5h12 M8 12h12 M8 19h12 M3 5h1 M3 12h1 M3 19h1',
    arrow: 'M5 12h14 M14 7l5 5-5 5',
    check: 'M5 12l4 4L19 6',
    user: 'M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.note} /></svg>;
}

function BedDiagram({ result }: { result: CalibrationResult }) {
  const skew = result.status === 'valid' ? Math.max(-22, Math.min(22, result.angle * 25)) : 0;
  const frontRight = 324 + skew;
  const rearRight = 114 + skew;
  return <svg className="bed-diagram" viewBox="0 0 620 450" role="img" aria-labelledby="bed-title bed-desc">
    <title id="bed-title">CNC router squaring diagram, viewed from above</title>
    <desc id="bed-desc">Rear is at the top, negative X. Positive Y is right; negative Y is left. Rear left is point 1 at the starting position; rear right point 2; front right point 3; front left point 4. Diagonal A joins 1 to 3, diagonal B joins 2 to 4. Adjust only the left rear homing switch. Skew is exaggerated.</desc>
    <defs>
      <pattern id="bed-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#dce3de" strokeWidth="0.7" /></pattern>
      <marker id="arrow-tip" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7z" fill="#82928a" /></marker>
    </defs>
    <text x="310" y="30" className="diagram-orientation" textAnchor="middle">REAR OF MACHINE · −X / HOME</text>
    <rect x="120" y="69" width="380" height="297" rx="13" fill="#e4e9e5" stroke="#c6d1c9" />
    <rect x="139" y="87" width="342" height="260" rx="4" fill="#f8faf6" stroke="#bcc9c0" />
    <rect x="139" y="87" width="342" height="260" fill="url(#bed-grid)" />
    <rect x="126" y="90" width="9" height="253" rx="4" fill="#b9c6be" />
    <rect x="485" y="90" width="9" height="253" rx="4" fill="#b9c6be" />
    <path d={`M133 107L487 ${107 + skew}`} stroke="#617c71" strokeWidth="14" />
    <rect x="298" y={94 + skew / 2} width="28" height="30" rx="4" fill="#174b43" stroke="#f5f6ef" strokeWidth="2" />
    <rect x="121" y="61" width="20" height="16" rx="3" fill="#d38b48" />
    <rect x="480" y="61" width="20" height="16" rx="3" fill="#819188" />
    <path d="M121 69H64v44" fill="none" stroke="#b7783d" strokeWidth="1.5" />
    <text x="26" y="134" className="diagram-callout">LEFT SWITCH</text>
    <text x="26" y="151" className="diagram-small">Adjust this side</text>
    <text x="505" y="68" className="diagram-small">Fixed reference</text>
    <path d={`M164 114L456 ${rearRight}L456 ${frontRight}L164 324Z`} fill="none" stroke="#9faf9f" strokeDasharray="5 5" />
    <path d={`M164 114L456 ${frontRight}`} stroke="#197a75" strokeWidth="2.5" />
    <path d={`M456 ${rearRight}L164 324`} stroke="#bb7b43" strokeWidth="2.5" />
    <rect x="232" y="175" width="30" height="28" rx="14" fill="#e0eeea" /><text x="247" y="194" textAnchor="middle" className="diagonal-label a-label">A</text>
    <rect x="356" y="175" width="30" height="28" rx="14" fill="#f4e8db" /><text x="371" y="194" textAnchor="middle" className="diagonal-label b-label">B</text>
    {[[164, 114, '1'], [456, rearRight, '2'], [456, frontRight, '3'], [164, 324, '4']].map(([x, y, label]) =>
      <g key={label}><circle cx={x} cy={y} r="11" fill="#fbfcf8" stroke="#174b43" strokeWidth="2" /><text x={x} y={Number(y) + 4} textAnchor="middle" className="corner-label">{label}</text></g>)}
    <path d="M164 389H456" stroke="#82928a" markerStart="url(#arrow-tip)" markerEnd="url(#arrow-tip)" />
    <text x="310" y="411" textAnchor="middle" className="diagram-dimension">−Y LEFT · Commanded test width · RIGHT +Y</text>
    <path d="M535 114V324" stroke="#82928a" markerStart="url(#arrow-tip)" markerEnd="url(#arrow-tip)" />
    <text x="555" y="219" textAnchor="middle" transform="rotate(90 555 219)" className="diagram-dimension">Commanded test length · X travel</text>
    <text x="310" y="444" textAnchor="middle" className="diagram-orientation">FRONT · YOU ARE HERE · +X</text>
  </svg>;
}

function App() {
  const [tab, setTab] = useState<Tab>('calibration');
  const [inputs, setCanonicalInputs] = useState(initialInputs);
  const [displayInputs, setDisplayInputs] = useState(initialInputs);
  const [unit, setUnit] = useState<Unit>('mm');
  const distance = (value: number) => formatDistance(value, unit);
  function setInputs(next: CalibrationInputs) {
    setCanonicalInputs(next);
    setDisplayInputs(inputsForDisplay(next, unit));
  }
  function changeMeasurement(key: keyof CalibrationInputs, value: string) {
    setDisplayInputs((current) => ({ ...current, [key]: value }));
    setCanonicalInputs((current) => ({ ...current, [key]: inputToMm(value, unit) }));
  }
  function changeUnit(next: Unit) {
    setUnit(next);
    setDisplayInputs(inputsForDisplay(inputs, next));
  }
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!cloud);
  const [accountOpen, setAccountOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [runNote, setRunNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [measurementTooltipOpen, setMeasurementTooltipOpen] = useState(false);
  const result = calculate(inputs);
  const userId = session?.user.id;

  useEffect(() => {
    if (!cloud) return;
    const { data: { subscription } } = cloud.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setEntries([]);
    setEditingId(null);
    setTitle('');
    setBody('');
    setNotice('');
    setError('');
  }, [userId]);

  useEffect(() => {
    if (!cloud || !userId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    cloud.from('machine_entries').select('*').eq('machine', 'cnc-router')
      .eq('owner_id', userId).order('created_at', { ascending: false }).limit(200)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError(`Could not load your toolbook: ${loadError.message}`);
        else setEntries(data as Entry[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [userId, refresh]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!cloud) return;
    setAuthBusy(true);
    setAuthMessage('');
    setError('');
    const { error: authError } = await cloud.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
    if (authError) setError(`Could not send sign-in link: ${authError.message}`);
    else setAuthMessage('If this email belongs to an existing account, check your inbox for a sign-in link. Open it on this device to continue. Public account registration is not available.');
    setAuthBusy(false);
  }

  async function signOut() {
    if (!cloud) return;
    const { error: signOutError } = await cloud.auth.signOut();
    if (signOutError) setError(`Could not sign out: ${signOutError.message}`);
    else { setNotice('Signed out. Your cloud records are saved.'); setAccountOpen(false); }
  }

  function requireAccount() {
    if (!cloud || !session) {
      setAccountOpen(true);
      return false;
    }
    return true;
  }

  async function saveEntry(kind: EntryKind, entryTitle: string, entryBody: string) {
    if (!requireAccount() || !cloud || !session) return;
    if (kind === 'calibration' && result.status !== 'valid') return;
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      owner_id: session.user.id,
      machine: 'cnc-router',
      kind,
      title: entryTitle.trim(),
      body: entryBody.trim(),
      calibration: kind === 'calibration' && result.status === 'valid'
        ? { inputs: { ...inputs }, adjustment: result.adjustment, difference: result.difference,
            withinTolerance: result.withinTolerance, geometryWarning: result.geometryWarning }
        : null,
    };
    const request = editingId && kind !== 'calibration'
      ? cloud.from('machine_entries').update(payload).eq('id', editingId).eq('owner_id', session.user.id)
      : cloud.from('machine_entries').insert(payload);
    const { error: saveError, data } = await request.select('id').single();
    if (saveError || !data) setError(`Could not save entry: ${saveError?.message ?? 'No record was returned.'}`);
    else {
      setNotice(kind === 'calibration' ? 'Calibration saved to your cloud history.' : 'Entry saved to your toolbook.');
      setEditingId(null);
      setTitle('');
      setBody('');
      if (kind === 'calibration') setRunNote('');
      setRefresh((value) => value + 1);
    }
    setSaving(false);
  }

  async function deleteEntry(entry: Entry) {
    if (!cloud || !userId || !window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    setSaving(true);
    setError('');
    const { error: deleteError, data } = await cloud.from('machine_entries').delete()
      .eq('id', entry.id).eq('owner_id', userId).select('id').single();
    if (deleteError || !data) setError(`Could not delete entry: ${deleteError?.message ?? 'No record was deleted.'}`);
    else {
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setNotice('Entry deleted.');
      if (editingId === entry.id) { setEditingId(null); setTitle(''); setBody(''); }
    }
    setSaving(false);
  }

  function switchTab(next: Tab) {
    setTab(next);
    setNotice('');
    setEditingId(null);
    setTitle('');
    setBody('');
  }

  function procedureField(key: keyof CalibrationInputs) {
    return <label className="procedure-field" htmlFor={`procedure-${key}`}>{inputLabels[key]}
      <div className="input-with-unit"><input id={`procedure-${key}`} type={unit === 'in' ? 'text' : 'number'} min="0" step="any" value={displayInputs[key]} onChange={(event) => changeMeasurement(key, event.target.value)} /><span>{unit}</span></div>
      {unit === 'in' && <small>Fractions welcome: 3/8 or 42 3/8.</small>}
    </label>;
  }

  function renderEntries(kind: EntryKind) {
    const filtered = entries.filter((entry) => entry.kind === kind);
    if (!authReady || (userId && loading)) return <p className="empty-state">Loading your toolbook…</p>;
    if (!userId) return <div className="empty-state"><Icon name="note" size={30} /><h3>Your workshop knowledge, in one place.</h3><p>Sign in to save and access your {kind === 'calibration' ? 'calibration history' : resourceLabels[kind].toLowerCase()} across devices.</p><button className="button secondary" onClick={() => setAccountOpen(true)}>Sign in to your toolbook <Icon name="arrow" size={16} /></button></div>;
    if (!filtered.length) return <div className="empty-state"><h3>No {kind === 'calibration' ? 'calibrations' : resourceLabels[kind].toLowerCase()} yet.</h3><p>{kind === 'calibration' ? 'Save your first measurement run from the squaring calculator.' : 'Add an entry above to start building your machine reference.'}</p></div>;
    return <div className="entry-list">{filtered.map((entry) => <article className="saved-entry" key={entry.id}>
      <div className="entry-heading"><h3>{entry.title}</h3><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time></div>
      {entry.calibration && <div className="snapshot">
        <span>A: <strong>{distance(Number(entry.calibration.inputs.diagonalA))} {unit}</strong></span><span>B: <strong>{distance(Number(entry.calibration.inputs.diagonalB))} {unit}</strong></span>
        <span>Difference: <strong>{distance(entry.calibration.difference)} {unit}</strong></span>
        <span>Calculated left switch correction: <strong>{distance(Math.abs(entry.calibration.adjustment))} {unit} — {correctionDirection(entry.calibration.adjustment)}</strong></span>
        <span>Test: {distance(Number(entry.calibration.inputs.width))} × {distance(Number(entry.calibration.inputs.length))} {unit} · homing span: {distance(Number(entry.calibration.inputs.switchSpan))} {unit} · tolerance: {distance(Number(entry.calibration.inputs.tolerance))} {unit}</span>
        <span>{entry.calibration.geometryWarning ? 'Check geometry before adjusting' : entry.calibration.withinTolerance ? 'Within diagonal tolerance' : 'Outside diagonal tolerance'}</span>
      </div>}
      {entry.body && <p className="entry-body">{entry.body}</p>}
      <div className="entry-actions">
        {entry.calibration ? <button className="text-button" disabled={saving} onClick={() => { setInputs(entry.calibration!.inputs); switchTab('calibration'); setNotice('Saved measurements loaded. Re-measure before making any new adjustment.'); }}>Load measurements</button>
          : <button className="text-button" disabled={saving} onClick={() => { setEditingId(entry.id); setTitle(entry.title); setBody(entry.body); }}>Edit entry</button>}
        <button className="text-button danger" disabled={saving} onClick={() => void deleteEntry(entry)}>Delete</button>
      </div>
    </article>)}</div>;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="./" aria-label="Makespace toolbook home"><span className="brand-mark"><Icon name="grid" size={24} /></span>makespace<span className="brand-dot">.</span></a>
      <div className="workspace-label">THE WORKSHOP TOOLBOOK</div>
      <div className="sidebar-section-label">YOUR MACHINES <span>01</span></div>
      <div className="machine-selected"><Icon name="router" /><span>CNC router<small>Gantry / dual homing</small></span><span className="machine-status" /></div>
      <nav aria-label="CNC router aids">
        <div className="nav-group-label">MACHINE AIDS</div>
        <button className={tab === 'calibration' ? 'nav-item active' : 'nav-item'} onClick={() => switchTab('calibration')}><Icon name="square" />Gantry squaring</button>
        <button className={tab === 'edge-zero' ? 'nav-item active' : 'nav-item'} onClick={() => switchTab('edge-zero')}><Icon name="router" />Dowel edge zero</button>
        <button className={tab === 'history' ? 'nav-item active' : 'nav-item'} onClick={() => switchTab('history')}><Icon name="clock" />Calibration history</button>
        <div className="nav-group-label reference-label">YOUR REFERENCE</div>
        {(['note', 'setting', 'protocol'] as const).map((kind) => <button key={kind} className={tab === kind ? 'nav-item active' : 'nav-item'} onClick={() => switchTab(kind)}><Icon name={kind} />{resourceLabels[kind]}</button>)}
      </nav>
      <div className="sidebar-bottom"><span className="small-cross">+</span><p>Good work starts<br />with a well-known machine.</p><div className="version-label">MAKE. MEASURE. REFINE.</div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div><span className="breadcrumb-muted">Machines</span><span className="breadcrumb-slash">/</span>CNC router</div><button className="account-button" onClick={() => setAccountOpen(!accountOpen)}><Icon name="user" size={17} /><span>{!authReady ? 'Connecting…' : session ? 'My account' : 'Sign in'}</span></button></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow"><span /> CNC ROUTER TOOLBOOK</div><h1>{tab === 'calibration' ? 'A square gantry. A better cut.' : tab === 'edge-zero' ? 'Find your edge. Set your zero.' : tab === 'history' ? 'Measure. Adjust. Keep a record.' : `Your machine. Your ${resourceLabels[tab].toLowerCase()}.`}</h1><p>{tab === 'calibration' ? 'Measure the diagonals, find the skew, and dial in your left homing switch.' : tab === 'edge-zero' ? 'A pickup-dowel and paper reference for outside and inside work zeros.' : 'Keep the details that make your next workshop session a little easier.'}</p></div><span className="machine-tag">Gantry-style CNC <span>·</span> Dual −X switches</span></div>
        {error && <div className="message error" role="alert">{error}<button className="text-button" onClick={() => setError('')}>Dismiss</button></div>}
        {notice && <div className="message success" role="status">{notice}</div>}
        {accountOpen && <section className="card account-panel" aria-labelledby="account-title"><div className="section-heading"><h2 id="account-title">{session ? 'Your cloud toolbook' : 'Take your toolbook with you'}</h2><button className="text-button" onClick={() => setAccountOpen(false)}>Close</button></div>
          {!cloud ? <div className="message setup"><strong>Cloud connection needs setup.</strong><p>The calculator works now. To enable sign-in and storage, configure the Supabase project described in the project README. Nothing is saved until it is connected.</p></div>
            : session ? <><p>Signed in as <strong>{session.user.email}</strong>. Your records are private to your account and available on your other devices.</p><button className="button secondary" onClick={() => void signOut()}>Sign out</button></>
              : <form onSubmit={(event) => void signIn(event)}><p>Owner sign-in only. Get an email link for your existing account; this form does not create accounts. Your notes and calibrations stay private to your account.</p><div className="auth-form"><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><button className="button primary" disabled={authBusy || !authReady}>{authBusy ? 'Sending…' : 'Email me a sign-in link'}</button></div>{authMessage && <p role="status" className="auth-message">{authMessage}</p>}</form>}
        </section>}
        <div className="page-tabs" role="navigation" aria-label="Calibration views"><button className={tab === 'calibration' ? 'selected' : ''} onClick={() => switchTab('calibration')}><Icon name="square" size={17} />Squaring calculator</button><button className={tab === 'history' ? 'selected' : ''} onClick={() => switchTab('history')}><Icon name="clock" size={17} />History</button><div className="unit-toggle"><span className="unit-toggle-label">Display units</span><button className="unit-switch" role="switch" aria-checked={unit === 'in'} aria-label="Display units in inches" onClick={() => changeUnit(unit === 'mm' ? 'in' : 'mm')}><span className={unit === 'mm' ? 'unit-current' : ''}>mm</span><span className="unit-switch-track" aria-hidden="true"><span /></span><span className={unit === 'in' ? 'unit-current' : ''}>inches</span></button></div></div>
        {tab === 'edge-zero' ? <DowelZeroGuide unit={unit} /> : tab === 'calibration' ? <>
          <div className="calibration-layout">
            <div className="calculator-column">
              <section className="card measurement-card">
                <div className="section-heading"><div className="heading-with-step"><span className="step-badge">01</span><h2>Set up your test</h2></div><span className="subtle-label">Use the largest practical rectangle</span></div>
                <p className="section-description"><strong>Width & length: use the CNC controller.</strong> Enter the commanded travel between corner marks (the difference between their controller coordinates), not the overall bed size or tape-measured projections. Keep every mark safely inside the travel limits.</p>
                <div className="input-grid">
                  {(['width', 'length', 'switchSpan'] as const).map((key) => <label key={key} htmlFor={key}>{inputLabels[key]}<div className="input-with-unit"><input id={key} type={unit === 'in' ? 'text' : 'number'} min="0" step="any" value={displayInputs[key]} onChange={(event) => changeMeasurement(key, event.target.value)} /><span>{unit}</span></div><small>{key === 'width' ? 'From controller: +Y right / −Y left along gantry' : key === 'length' ? 'From controller: +X front / −X rear' : 'Physically measure between left/right homing contacts, along gantry'}</small></label>)}
                </div>
                {unit === 'in' && <p className="section-description"><strong>Tip:</strong> Enter mixed fractions like <strong>42 3/8</strong>, simple fractions like <strong>3/8</strong>, or decimal inches.</p>}
                <div className="measurement-divider" />
                <div className="section-heading"><div className="heading-with-step"><span className="step-badge">02</span><h2>Measure the diagonals</h2></div><button className="text-button" onClick={() => { setInputs({ width: '1000', length: '1500', switchSpan: '1250', diagonalA: '1803.8', diagonalB: '1801.8', tolerance: '0.5' }); setNotice('Example measurements loaded — replace them with your actual measurements before adjusting.'); }}>Try an example <Icon name="arrow" size={14} /></button></div>
                <p className="section-description"><strong>Diagonals: physically measure with a tape.</strong> Measure between brad centers, at the same height and tape tension. Do not use controller-calculated diagonals.</p>
                <div className="diagonal-inputs">
                  {(['diagonalA', 'diagonalB'] as const).map((key, index) => <label htmlFor={key} key={key}><span className={`diagonal-chip ${index ? 'b' : 'a'}`}>{index ? 'B' : 'A'}</span>{inputLabels[key]}<span className="corner-pair">{index ? '2 → 4' : '1 → 3'}</span><div className="input-with-unit"><input id={key} type={unit === 'in' ? 'text' : 'number'} min="0" step="any" placeholder={unit === 'in' ? 'e.g. 55 3/4' : '0.00'} value={displayInputs[key]} onChange={(event) => changeMeasurement(key, event.target.value)} /><span>{unit}</span></div><small>{index ? 'Rear right → front left' : 'Rear left → front right'}</small></label>)}
                </div>
                <div className="tolerance-row"><label htmlFor="tolerance">Acceptable diagonal difference</label><div className="input-with-unit"><input id="tolerance" type={unit === 'in' ? 'text' : 'number'} min="0" step="any" value={displayInputs.tolerance} onChange={(event) => changeMeasurement('tolerance', event.target.value)} /><span>{unit}</span></div></div>
              </section>
              {result.status === 'invalid' && <section className="measurement-warning" role="alert" aria-labelledby="measurement-warning-title">
                <h2 id="measurement-warning-title">Check your measurements</h2>
                <p>{result.message}</p>
                <p><strong>No correction can be calculated from these inputs.</strong></p>
              </section>}
              <section className={`result-card ${result.status === 'valid' && !result.geometryWarning && result.withinTolerance ? 'is-square' : ''}`} aria-labelledby="result-title">
                <div className="section-heading"><div className="heading-with-step"><span className="step-badge">03</span><h2 id="result-title">Your adjustment</h2></div><span className="live-label"><span />LIVE RESULT</span></div>
                <div aria-live="polite" aria-atomic="true">
                  {result.status === 'incomplete' ? <div className="result-placeholder"><span className="result-number">— <small>{unit}</small></span><h3>Ready when you are.</h3><p>Enter both diagonals to calculate the left switch adjustment.</p></div>
                    : result.status === 'invalid' ? <div className="result-placeholder"><span className="result-number">— <small>{unit}</small></span><h3>Waiting for corrected measurements.</h3></div>
                      : <><div className="result-main"><div><span className="result-caption">LEFT SWITCH CORRECTION</span><div className="result-number">{distance(Math.abs(result.adjustment))}<small> {unit}</small></div></div>
                        {result.geometryWarning ? <span className="measurement-tooltip-anchor" onMouseEnter={() => setMeasurementTooltipOpen(true)} onMouseLeave={() => setMeasurementTooltipOpen(false)} onFocus={() => setMeasurementTooltipOpen(true)} onBlur={() => setMeasurementTooltipOpen(false)} onKeyDown={(event) => { if (event.key === 'Escape') { setMeasurementTooltipOpen(false); event.stopPropagation(); } }}>
                          <span className="result-state warning" tabIndex={0} aria-describedby={measurementTooltipOpen ? 'measurement-tooltip' : undefined} onClick={(event) => { event.currentTarget.focus(); setMeasurementTooltipOpen(true); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3L22 21H2L12 3Z M12 9v5 M12 17v.1" /></svg>Check measurements</span>
                          {measurementTooltipOpen && <span className="measurement-tooltip" id="measurement-tooltip" role="tooltip"><strong>Check your measurements</strong><span>The diagonals do not agree with the entered side lengths. A square rectangle with these dimensions would have {distance(result.expectedDiagonal)} {unit} diagonals. Check dimensions, units, axis scale, and corner labels.</span><strong>This correction is a reference only and is not reliable yet. Check measurements before adjusting.</strong></span>}
                        </span> : <span className="result-state">{result.withinTolerance ? 'Within tolerance' : 'Adjustment needed'}</span>}
                        </div>
                        <h3>{result.adjustment === 0 ? 'No movement' : result.adjustment > 0 ? 'Forwards (towards front)' : 'Backwards (towards wall)'}</h3>
                        {!result.geometryWarning && <p>{result.withinTolerance ? 'No adjustment is needed for your chosen diagonal tolerance. The calculated correction is shown for reference.' : 'Left means your left when standing at the front facing the machine. Leave the RIGHT switch fixed. This is the required shift of the homing trigger point: verify that moving the switch on its bracket shifts that point in the same direction. Make a small trial move, re-home, and confirm the diagonal difference decreases.'}</p>}
                        <div className="result-metrics"><span>Diagonal difference<strong>{distance(Math.abs(result.difference))} {unit}</strong></span><span>Gantry skew angle<strong>{result.angle.toFixed(4)}°</strong></span></div>
                      </>}
                </div>
                <p><strong>Direction reference:</strong> Forward (+X) means away from the back of the machine, toward the front. Backward (−X) means toward the back. LEFT is viewed from the front; leave the RIGHT switch fixed. {result.status === 'valid' && result.geometryWarning ? 'Check measurements before applying this reference correction; it is not reliable yet.' : 'Verify that moving the switch shifts its homing trigger point in the same direction.'}</p>
                <div className="save-run"><label htmlFor="run-note">Run notes <span>(optional)</span><input id="run-note" maxLength={20000} placeholder="e.g. Baseline before adjustment, measured twice" value={runNote} onChange={(event) => setRunNote(event.target.value)} /></label><button className="button light-button" disabled={result.status !== 'valid' || saving || !authReady} onClick={() => void saveEntry('calibration', 'Gantry squaring run', runNote)}><Icon name="check" size={17} />{saving ? 'Saving…' : 'Save calibration'}</button></div>
                <p className="save-hint">{session ? 'Saved privately to your cloud calibration history.' : 'Sign in to save this run and access it on any device.'}</p>
              </section>
              <MarkingGuide width={inputs.width} length={inputs.length} />
            </div>
            <div className="guide-column">
              <section className="card diagram-card"><div className="section-heading"><h2>Know your corners</h2><span className="view-tag">TOP VIEW</span></div><BedDiagram result={result} /><div className="diagram-legend"><span><i className="legend-line a-line" />Diagonal A · 1 → 3</span><span><i className="legend-line b-line" />Diagonal B · 2 → 4</span></div><div className="diagram-footnote">Facing the machine from the front. Skew exaggerated; diagram not to scale.</div></section>
              <section className="card workflow-card"><div className="section-heading"><h2>The squaring routine</h2></div><ol className="workflow">
                <li><strong>Press Ref All Home in Mach3.</strong></li>
                <li><strong>Travel to point 1.</strong><p>Use the rear-left starting corner.</p></li>
                <li><strong>Touch off on the bed surface.</strong><p>Use the approved method with the non-rotating marker.</p></li>
                <li><strong>Press Zero Z.</strong><p>Set work Z = 0 at the actual bed surface.</p></li>
                <li><strong>Press Zero X.</strong><p>Zero work coordinates, not machine coordinates.</p></li>
                <li><strong>Press Zero Y.</strong></li>
                <li><strong>Record Y travel as test width.</strong>{procedureField('width')}</li>
                <li><strong>Record X travel as test length.</strong>{procedureField('length')}</li>
                <li><strong>Mark the four corners.</strong><p>Follow the generated-code or manual option in the Mach3 guide.</p></li>
                <li><strong>Park the marker clear.</strong></li>
                <li><strong>Isolate machine motion.</strong><p>Follow the workshop procedure before reaching in.</p></li>
                <li><strong>Place a brad at each impression.</strong></li>
                <li><strong>Measure and enter diagonal A.</strong><p>Point 1 → point 3, center to center.</p>{procedureField('diagonalA')}</li>
                <li><strong>Measure and enter diagonal B.</strong><p>Point 2 → point 4, center to center.</p>{procedureField('diagonalB')}</li>
                <li><strong>Save this calibration run.</strong></li>
                <li><strong>Adjust the left switch if needed.</strong>
                  <div className="procedure-adjustment" aria-live="polite">
                    {result.status === 'valid' ? <>
                      <strong>{distance(Math.abs(result.adjustment))} {unit}</strong>
                      <span>{result.adjustment === 0 ? 'No movement' : result.adjustment > 0 ? 'Forwards (towards front)' : 'Backwards (towards wall)'}</span>
                      {result.geometryWarning ? <p className="procedure-adjustment-warning">Check measurements — reference only; do not adjust until resolved.</p>
                        : result.withinTolerance ? <p>Within tolerance — no adjustment needed.</p> : null}
                    </> : <p>{result.status === 'invalid' ? 'Correct the measurement inputs to calculate the adjustment.' : 'Enter both diagonals to calculate the adjustment.'}</p>}
                  </div>
                  <p>Leave the right switch fixed. Isolate power as required before adjustment.</p>
                </li>
                <li><strong>Remove all brads and tools.</strong></li>
                <li><strong>Repeat from Ref All Home.</strong><p>Re-establish the starting point and surface zero. Stop if the diagonal difference grows.</p></li>
              </ol></section>
            </div>
          </div>
          <details className="math-details"><summary>How the calculation works & when to trust it</summary><p>Assumes a repeatable parallelogram test, independently homed gantry ends, a fixed right reference, and a left switch adjustment that shifts its homing trigger point one-to-one along X. Commanded test width W is controller travel along the gantry, and commanded test length L is controller X travel. Use coordinate differences, not absolute positions. Physically measure diagonals A and B and the effective span S along the gantry between homing contacts.</p><p>This assumes the controller's distance calibration is already accurate. Physical side-length measurements can check that assumption; if they differ materially from commanded travel, investigate axis scale or mechanical issues before trusting the correction.</p><p>sin(θ) = (A² − B²) / (4 × W × L). Left trigger correction = S × sin(θ). A longer A means the left end must home farther toward the front (+X); a longer B means farther toward the rear (−X). A test narrower than the homing span needs a proportionally larger correction.</p><p>The consistency check compares √((A² + B²) / 2) with √(W² + L²), with a warning above the greater of 1 mm or your tolerance. This is a coarse check, not a guarantee of accuracy. Diagonal tolerance is |A − B|, not the switch correction. Use a large test rectangle and repeat measurements; do not chase adjustments smaller than your measurement repeatability. This model is for small skew, not gross mechanical misalignment.</p></details>
        </> : tab === 'history' ? <section className="card reference-card"><div className="section-heading"><h2>Calibration history</h2><button className="text-button" onClick={() => { switchTab('calibration'); }}>New measurement <Icon name="arrow" size={16} /></button></div><p className="section-description">A record of measurements, calculated corrections, and your observations. A saved correction is not confirmation that it was applied. Showing the latest 200 machine entries.</p>{userId && <button className="text-button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>Refresh from cloud</button>}{renderEntries('calibration')}</section>
          : <section className="card reference-card"><div className="section-heading"><h2>{resourceLabels[tab]}</h2><span className="view-tag">CNC ROUTER</span></div><p className="section-description">{tab === 'note' ? 'Observations, reminders, and things you wish you remembered last time.' : tab === 'setting' ? 'Your proven material, cutter, feed, speed, and depth-of-cut combinations. Follow machine and tooling limits.' : 'Your repeatable setup, preflight, machining, and shutdown routines. Keep local safety instructions authoritative.'}</p>
            <form className="entry-form" onSubmit={(event) => { event.preventDefault(); void saveEntry(tab, title, body); }}>
              <label htmlFor="entry-title">{editingId ? 'Edit entry title' : 'Entry title'}<input id="entry-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={tab === 'setting' ? 'e.g. Birch plywood · 6 mm compression bit' : tab === 'protocol' ? 'e.g. Before starting a job' : 'e.g. Dust shoe clearance'} /></label>
              <label htmlFor="entry-body">Details<textarea id="entry-body" required maxLength={20000} rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Capture the details worth keeping…" /></label>
              <div className="form-actions"><button className="button primary" disabled={saving || !authReady || !title.trim() || !body.trim()}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save to toolbook'}</button>{editingId && <button type="button" className="text-button" onClick={() => { setEditingId(null); setTitle(''); setBody(''); }}>Cancel edit</button>}<span className="subtle-label">Private to your account · Latest 200 machine entries</span></div>
            </form>{userId && <button className="text-button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>Refresh from cloud</button>}{renderEntries(tab)}
          </section>}
        <footer><span className="footer-brand">makespace.</span><span>A little knowledge. A more capable workshop.</span><span>CNC ROUTER / TOOLBOOK 01</span></footer>
      </main>
    </div>
  </div>;
}

export default App;
