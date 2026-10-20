import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createApi } from './api.js';
import { createDemoApi } from './demo.js';

const emptyStudent = { name: '', email: '', year: 1 };
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const logoUrl = `${import.meta.env?.BASE_URL ?? '/'}brand/xplocode-logo.png`;

function Brand() {
  return <Link className="brand" to="/students" aria-label="XploCode home"><img src={logoUrl} alt="" width="55" height="55" /><span className="brand-name">XploCode</span></Link>;
}

function StudentDialog({ mode, api, onSaved, onDeleted }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const dialog = useRef(null);
  const [student, setStudent] = useState(mode === 'add' ? emptyStudent : null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const readOnly = mode === 'view';
  const deleting = mode === 'delete';
  const close = () => { if (!busy) navigate('/students'); };
  useEffect(() => { dialog.current.showModal(); }, []);
  useEffect(() => {
    if (mode === 'add') return undefined;
    let live = true;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId < 1) { setLoadError('This is not a valid student ID.'); return undefined; }
    api.get(numericId).then((record) => { if (live) setStudent(record); }).catch((failure) => { if (live) setLoadError(failure.message); });
    return () => { live = false; };
  }, [mode, id, api]);
  const change = (event) => setStudent({ ...student, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (deleting) { await api.remove(student.id); onDeleted(student.id); return; }
      const data = { name: student.name.trim(), email: student.email.trim(), year: Number(student.year) };
      if (!data.name) throw new Error('Name cannot be blank.');
      const saved = mode === 'add' ? await api.create(data) : await api.update(student.id, data);
      onSaved(saved, mode);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const title = deleting ? 'Delete student?' : readOnly ? 'Student details' : mode === 'add' ? 'Add a student' : 'Edit student';
  const years = student ? [...new Set([1, 2, 3, 4, Number(student.year)])].filter(Number.isInteger).sort((a, b) => a - b) : [];
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); close(); }} aria-labelledby="dialog-title">
    <div className="dialog-heading"><div><p className="eyebrow">Student record</p><h2 id="dialog-title">{title}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={close}>×</button></div>
    {loadError ? <><p className="error" role="alert">{loadError}</p><div className="dialog-actions"><button type="button" className="secondary" onClick={close}>Close</button></div></>
      : !student ? <p className="muted" role="status">Loading student…</p>
      : deleting ? <form onSubmit={submit}><p>Delete <strong>{student.name}</strong>? This action cannot be undone.</p>{error && <p className="error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={close}>Cancel</button><button className="danger" disabled={busy}>{busy ? 'Deleting…' : 'Delete student'}</button></div></form>
      : <form onSubmit={submit}>
        {readOnly && <p className="record-id">Student ID · {student.id}</p>}
        <label>Full name<input name="name" value={student.name} onChange={change} required maxLength={100} readOnly={readOnly} autoComplete="name" autoFocus={!readOnly} /></label>
        <label>Email address<input name="email" type="email" value={student.email} onChange={change} required maxLength={254} readOnly={readOnly} autoComplete="email" /></label>
        <label>Year<select name="year" value={student.year} onChange={change} disabled={readOnly}>{years.map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={close}>{readOnly ? 'Close' : 'Cancel'}</button>{!readOnly && <button disabled={busy}>{busy ? 'Saving…' : 'Save student'}</button>}</div>
      </form>}
  </dialog>;
}

function Login({ demo, api, onLogin, message }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      onLogin(await api.login(username.trim(), password));
      navigate(location.state?.from || '/students', { replace: true });
    } catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <main className="login-layout">
    <section className="login-story"><Brand /><div><p className="eyebrow">Discover your coding potential</p><h1>Student Management</h1><p>A small, real application for learning how a frontend, an API and a database work together.</p></div><span className="story-footer">XploCode Infotech · College workshops</span></section>
    <section className="login-panel"><div className="login-card"><p className="eyebrow">Sign in</p><h2>Welcome back</h2><p className="muted">Sign in to manage your student records.</p>
      {demo && <div className="demo-note"><strong>Demo mode</strong><p>No backend is connected. Enter any username and password; records are sample data held in memory.</p></div>}
      {message && <p className="error" role="alert">{message}</p>}
      <form onSubmit={submit}>
        <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required maxLength={100} autoFocus /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="full-width" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
      </form></div></section>
  </main>;
}

function Students({ api, demo, user, onLogout }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function refresh() {
    setLoading(true); setError('');
    try {
      const records = await api.list();
      if (!Array.isArray(records)) throw new Error('The API must return a student array. See CONTRACT.md.');
      setStudents(records);
    } catch (failure) { setError(failure.message); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [api]);
  const visible = students.filter((student) => `${student.name} ${student.email} ${student.id}`.toLowerCase().includes(query.toLowerCase()));
  const saved = (student, type) => {
    setStudents((current) => type === 'add' ? [...current, student] : current.map((item) => item.id === student.id ? student : item));
    setNotice(type === 'add' ? 'Student added successfully.' : 'Student updated successfully.'); setError(''); navigate('/students');
  };
  const deleted = (id) => { setStudents((current) => current.filter((item) => item.id !== id)); setNotice('Student deleted successfully.'); setError(''); navigate('/students'); };
  return <div className="workspace">
    <header className="topbar"><Brand /><div className="account"><span className="account-avatar">{initials(user.username)}</span><span className="account-name">{user.username}</span><button className="secondary" onClick={onLogout}>Logout</button></div></header>
    <main className="content">
      <div className="page-heading"><div><p className="eyebrow">Student management</p><h1>Student directory</h1><p className="muted">View, add, edit and remove student records.</p></div><Link className="button" to="/students/new" onClick={() => setNotice('')}>＋ Add student</Link></div>
      {demo && <div className="demo-banner"><span className="demo-pill">Demo</span><span>Sample data held in memory. Records reset on refresh; no backend is connected.</span></div>}
      <section className="stats" aria-label="Directory overview"><div className="stat-card"><span>Total students</span><strong>{students.length}</strong></div></section>
      <section className="directory" aria-labelledby="directory-title"><div className="directory-heading"><h2 id="directory-title">All students <span className="count-badge">{students.length}</span></h2><button className="secondary" onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</button></div>
        <div className="toolbar"><label className="search-label"><span className="sr-only">Search students</span><input type="search" placeholder="Search by name, email or ID…" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        {notice && <p className="success" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
        {loading ? <div className="empty-state" role="status">Loading student records…</div> : error ? <div className="empty-state">Unable to load or update records. Check the error above and refresh before repeating a change.</div> : <><div className="table-scroll"><table><thead><tr><th scope="col">Student</th><th scope="col">Year</th><th scope="col">Student ID</th><th scope="col" className="actions-heading">Actions</th></tr></thead><tbody>{visible.map((student) => <tr key={student.id}><td><div className="student-cell"><span className="student-avatar">{initials(student.name)}</span><div><strong>{student.name}</strong><span>{student.email}</span></div></div></td><td>Year {student.year}</td><td className="id-cell">#{String(student.id).padStart(3, '0')}</td><td><div className="row-actions"><Link className="text-button" aria-label={`View ${student.name}`} to={`/students/${student.id}`}>View</Link><Link className="text-button" aria-label={`Edit ${student.name}`} to={`/students/${student.id}/edit`}>Edit</Link><Link className="text-button delete-link" aria-label={`Delete ${student.name}`} to={`/students/${student.id}/delete`}>Delete</Link></div></td></tr>)}</tbody></table></div>{visible.length === 0 && <div className="empty-state"><strong>{students.length ? 'No matching students' : 'No students yet'}</strong><p>{students.length ? 'Try a different search.' : 'Add your first student to get started.'}</p></div>}</>}
        <div className="table-footer">Showing {error || loading ? '—' : visible.length} of {students.length} students</div>
      </section>
      <footer className="page-footer">XploCode Infotech Private Limited<span>Student Management · Workshop project</span></footer>
    </main>
    <Routes>
      <Route path="new" element={<StudentDialog key="add" mode="add" api={api} onSaved={saved} />} />
      <Route path=":id" element={<StudentDialog key="view" mode="view" api={api} />} />
      <Route path=":id/edit" element={<StudentDialog key="edit" mode="edit" api={api} onSaved={saved} />} />
      <Route path=":id/delete" element={<StudentDialog key="delete" mode="delete" api={api} onDeleted={deleted} />} />
    </Routes>
  </div>;
}

export function App({ config }) {
  const demo = config.mode === 'demo';
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const api = useMemo(() => demo ? createDemoApi() : createApi(config, { onUnauthorized: () => { setUser(null); setSessionMessage('Your session has expired. Please sign in again.'); } }), [config, demo]);
  const logout = () => { api.logout(); setUser(null); setSessionMessage(''); };
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/students" replace /> : <Login demo={demo} api={api} message={sessionMessage} onLogin={(account) => { setSessionMessage(''); setUser(account); }} />} />
    <Route path="/students/*" element={user ? <Students api={api} demo={demo} user={user} onLogout={logout} /> : <Navigate to="/login" replace state={{ from: location.pathname }} />} />
    <Route path="*" element={<Navigate to="/students" replace />} />
  </Routes>;
}
