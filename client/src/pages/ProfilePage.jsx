import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatDate } from '../format.js';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [name, setName] = useState(user.displayName || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.me().then((d) => setStats(d.stats)).catch(setError);
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setError(null);
    try {
      const { user: updated } = await api.updateProfile({ displayName: name });
      setUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err);
    }
  }

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <section>
      <div className="page-head">
        <h1>Profile</h1>
      </div>

      {stats && (
        <dl className="stat-row">
          <div><dt>Workouts</dt><dd>{stats.workoutCount}</dd></div>
          <div><dt>Exercises</dt><dd>{stats.exerciseCount}</dd></div>
          <div><dt>Last trained</dt><dd className="small-dd">{stats.lastWorkoutOn ? formatDate(stats.lastWorkoutOn, { month: 'short', day: 'numeric' }) : 'Never'}</dd></div>
        </dl>
      )}

      <form onSubmit={onSave} className="card-form">
        <p className="muted">Signed in as <strong>{user.email}</strong></p>
        <label className="field">
          <span className="field-label">Display name</span>
          <input value={name} maxLength={50} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
          {error?.fields?.displayName && <span className="field-error">{error.fields.displayName}</span>}
        </label>
        <div className="row">
          <button className="btn primary" type="submit">Save name</button>
          {saved && <span className="saved" role="status">Name saved</span>}
        </div>
      </form>

      <button type="button" className="btn ghost block" onClick={onLogout}>Log out</button>
    </section>
  );
}
