import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate } from '../format.js';

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listWorkouts().then((d) => setWorkouts(d.workouts)).catch(setError);
  }, []);

  if (error) return <p className="alert" role="alert">{error.message}</p>;
  if (!workouts) return <p className="status">Loading history…</p>;

  return (
    <section>
      <div className="page-head">
        <h1>History</h1>
        <Link to="/workouts/new" className="btn primary">Log a workout</Link>
      </div>

      {workouts.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No workouts yet</p>
          <p>Log your first session and it will show up here, newest first.</p>
          <Link to="/workouts/new" className="btn primary">Log your first workout</Link>
        </div>
      ) : (
        <ol className="history">
          {workouts.map((w) => (
            <li key={w.id}>
              <Link to={`/workouts/${w.id}`} className="history-item">
                <time dateTime={w.performedOn} className="history-date">
                  <span className="day">{formatDate(w.performedOn, { day: 'numeric' })}</span>
                  <span className="mon">{formatDate(w.performedOn, { month: 'short' })}</span>
                </time>
                <div className="history-body">
                  <p className="history-title">{w.note || formatDate(w.performedOn, { weekday: 'long' })}</p>
                  <p className="history-summary">
                    {w.exercises.map((e) => `${e.name} ×${e.setCount}`).join(', ')}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
