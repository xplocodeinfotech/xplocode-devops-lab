import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createApi } from './api.js';
import { createDemoApi } from './demo.js';

const emptyStudent = { name: '', email: '', department: '', year: 1 };
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function StudentDialog({ action, api, onClose, onSaved, onDeleted }) {
  const dialog = useRef(null);
  const [student, setStudent] = useState(action.student || emptyStudent);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const readOnly = action.type === 'view';
  const deleting = action.type === 'delete';
  useEffect(() => { dialog.current.showModal(); }, []);
  const change = (event) => setStudent({ ...student, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (deleting) { await api.remove(student.id); onDeleted(student.id); return; }
      const data = { name: student.name.trim(), email: student.email.trim(), department: student.department.trim(), year: Number(student.year) };
      if (!data.name || !data.department) throw new Error('Name and department cannot be blank.');
      const saved = action.type === 'add' ? await api.create(data) : await api.update(student.id, data);
      onSaved(saved, action.type);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} aria-labelledby="dialog-title">
    <div className="dialog-heading"><div><p className="eyebrow">STUDENT RECORD</p><h2 id="dialog-title">{deleting ? 'Delete student?' : readOnly ? 'Student details' : action.type === 'add' ? 'Add a student' : 'Edit student'}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></div>
    {deleting ? <form onSubmit={submit}><p>Delete <strong>{student.name}</strong>? This action cannot be undone.</p>{error && <p className="error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="danger" disabled={busy}>{busy ? 'Deleting…' : 'Delete student'}</button></div></form>
      : <form onSubmit={submit}>
        {readOnly && <p className="record-id">Student ID · {student.id}</p>}
        <label>Full name<input name="name" value={student.name} onChange={change} required maxLength={100} readOnly={readOnly} autoComplete="name" autoFocus /></label>
        <label>Email address<input name="email" type="email" value={student.email} onChange={change} required maxLength={254} readOnly={readOnly} autoComplete="email" /></label>
        <div className="form-grid"><label>Department<input name="department" value={student.department} onChange={change} required maxLength={100} readOnly={readOnly} placeholder="e.g. CSE" /></label><label>Year<select name="year" value={student.year} onChange={change} disabled={readOnly}>{[1, 2, 3, 4].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label></div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>{!readOnly && <button disabled={busy}>{busy ? 'Saving…' : 'Save student'}</button>}</div>
      </form>}
  </dialog>;
}

function Login({ demo, api, onLogin, message }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { onLogin(await api.login(username.trim(), password)); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <main className="login-layout">
    <section className="login-story"><a className="brand" href="#"><span className="brand-mark">X</span>XploCode<span className="brand-dot">.</span></a><div><p className="eyebrow">LEARN. BUILD. DEPLOY.</p><h1>Small beginnings.<br />Real possibilities.</h1><p>Your student workspace for learning how real applications come together, one step at a time.</p></div><span className="story-footer">XPLOCODE INFOTECH · COLLEGE WORKSHOPS</span></section>
    <section className="login-panel"><div className="login-card"><p className="eyebrow">STUDENT MANAGEMENT</p><h2>Welcome to your workspace</h2><p className="muted">{demo ? 'Explore the frontend with a few sample student records.' : 'Sign in to manage your student records.'}</p>
      {message && <p className="error" role="alert">{message}</p>}
      <form onSubmit={submit}>{demo ? <div className="demo-note"><strong>Frontend demo</strong><p>No account or password is needed. Changes stay in memory and reset when you refresh. Real authentication will be connected in the backend step.</p></div> : <><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required maxLength={100} autoFocus /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label></>}
        {error && <p className="error" role="alert">{error}</p>}<button className="full-width" disabled={busy}>{busy ? 'Opening workspace…' : demo ? 'Open demo workspace →' : 'Sign in →'}</button>
      </form><p className="login-footnote">Built for learning. Ready for your next step.</p></div></section>
  </main>;
}

export function App({ config }) {
  const demo = config.mode === 'demo';
  const [user, setUser] = useState(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const api = useMemo(() => demo ? createDemoApi() : createApi(config, { onUnauthorized: () => { setUser(null); setStudents([]); setAction(null); setNotice(''); setError(''); setSessionMessage('Your session has expired. Please sign in again.'); } }), [config, demo]);
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState(null);
  const [opening, setOpening] = useState(false);
  async function refresh() {
    setLoading(true); setError('');
    try {
      const records = await api.list();
      if (!Array.isArray(records)) throw new Error('The API must return a student array. See CONTRACT.md.');
      setStudents(records);
    } catch (failure) { setError(failure.message); } finally { setLoading(false); }
  }
  useEffect(() => { if (user) refresh(); }, [user, api]);
  async function openRecord(type, student) {
    setError(''); setOpening(true);
    try { setAction({ type, student: await api.get(student.id) }); }
    catch (failure) { setError(failure.message); } finally { setOpening(false); }
  }
  function logout() { api.logout(); setUser(null); setStudents([]); setAction(null); setQuery(''); setDepartment('all'); setError(''); setNotice(''); setSessionMessage(''); }
  if (!user) return <Login demo={demo} api={api} message={sessionMessage} onLogin={(account) => { setSessionMessage(''); setUser(account); }} />;
  const departments = [...new Set(students.map((student) => student.department))].sort();
  const visible = students.filter((student) => (department === 'all' || student.department === department) && `${student.name} ${student.email} ${student.id}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="workspace">
    <aside className="sidebar"><a className="brand" href="#"><span className="brand-mark">X</span>XploCode<span className="brand-dot">.</span></a><div className="workspace-label">COLLEGE WORKSPACE</div><nav aria-label="Main navigation"><a href="#" className="nav-active" aria-current="page"><span aria-hidden="true">▦</span> Students<span className="nav-count">{students.length}</span></a></nav><div className="sidebar-bottom"><div className="workshop-label"><span className="status-dot" />Workshop edition</div><p>Learn by building something real.</p></div></aside>
    <div className="main-shell"><header className="topbar"><span>Workspace <span className="breadcrumb">/</span> <strong>Students</strong></span><div className="account"><span className="account-avatar">{initials(user.username)}</span><span>{user.username}</span><button className="text-button" onClick={logout}>Log out</button></div></header>
      <main className="content"><div className="page-heading"><div><p className="eyebrow">YOUR COLLEGE, CONNECTED</p><h1>Student directory<span className="heading-dot">.</span></h1><p className="muted">A little organization. More room to learn.</p></div><button onClick={() => { setNotice(''); setAction({ type: 'add' }); }}>＋ Add student</button></div>
        {demo && <div className="demo-banner"><span className="demo-pill">DEMO</span><span>You're exploring the frontend. Records reset on refresh; no backend is connected.</span></div>}
        <section className="stats" aria-label="Directory overview"><div className="stat-card"><span>Total students</span><strong>{students.length.toString().padStart(2, '0')}</strong><small>People in your directory</small></div><div className="stat-card"><span>Departments</span><strong>{departments.length.toString().padStart(2, '0')}</strong><small>Different paths, shared potential</small></div><div className="stat-card stat-accent"><span>Learning together</span><strong>One workspace.</strong><small>Every student has a place here.</small></div></section>
        <section className="directory" aria-labelledby="directory-title"><div className="directory-heading"><div><h2 id="directory-title">All students <span className="count-badge">{students.length}</span></h2><p className="muted">View and manage your student records.</p></div><button className="secondary" onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</button></div>
          <div className="toolbar"><label className="search-label"><span className="sr-only">Search students</span><input type="search" placeholder="Search by name, email or ID…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="filter-label"><span className="sr-only">Filter by department</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="all">All departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label></div>
          {notice && <p className="success" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
          {loading ? <div className="empty-state" role="status">Loading student records…</div> : error ? <div className="empty-state">Unable to load or update records. Check the error above and refresh before repeating a change.</div> : <><div className="table-scroll"><table><thead><tr><th scope="col">Student</th><th scope="col">Department</th><th scope="col">Year</th><th scope="col">Student ID</th><th scope="col" className="actions-heading">Actions</th></tr></thead><tbody>{visible.map((student) => <tr key={student.id}><td><div className="student-cell"><span className="student-avatar">{initials(student.name)}</span><div><strong>{student.name}</strong><span>{student.email}</span></div></div></td><td><span className="department-badge">{student.department}</span></td><td>Year {student.year}</td><td className="id-cell">#{String(student.id).padStart(3, '0')}</td><td><div className="row-actions"><button className="text-button" disabled={opening} aria-label={`View ${student.name}`} onClick={() => openRecord('view', student)}>View</button><button className="text-button" disabled={opening} aria-label={`Edit ${student.name}`} onClick={() => openRecord('edit', student)}>Edit</button><button className="text-button delete-link" disabled={opening} aria-label={`Delete ${student.name}`} onClick={() => setAction({ type: 'delete', student })}>Delete</button></div></td></tr>)}</tbody></table></div>{visible.length === 0 && <div className="empty-state"><strong>{students.length ? 'No matching students' : 'Your directory starts here'}</strong><p>{students.length ? 'Try a different search or department.' : 'Add your first student to get started.'}</p></div>}</>}
          <div className="table-footer">Showing {error || loading ? '—' : visible.length} of {students.length} students<span>Made for your next chapter.</span></div>
        </section><footer className="page-footer">XploCode Infotech Private Limited<span>Student Management · Workshop project</span></footer>
      </main>
    </div>{action && <StudentDialog action={action} api={api} onClose={() => setAction(null)} onSaved={(student, type) => { setStudents((current) => type === 'add' ? [...current, student] : current.map((item) => item.id === student.id ? student : item)); setAction(null); setNotice(type === 'add' ? 'Student added successfully.' : 'Student updated successfully.'); setError(''); }} onDeleted={(id) => { setStudents((current) => current.filter((item) => item.id !== id)); setAction(null); setNotice('Student deleted successfully.'); setError(''); }} />}
  </div>;
}
