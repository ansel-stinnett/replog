import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate } from '../format.js';

const EMPTY_FILTER = { search: '', from: '', to: '' };
const hasFilter = (f) => Boolean(f.search || f.from || f.to);

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState(null);
  const [error, setError] = useState(null);
  // `filter` is what the inputs show; `applied` is what the last request used.
  // Keeping them separate lets the empty state explain itself correctly while
  // the user is mid-typing.
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [applied, setApplied] = useState(EMPTY_FILTER);
  const [fieldErrors, setFieldErrors] = useState({});
  const requestId = useRef(0);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      api
        .listWorkouts(filter)
        .then((d) => {
          if (id !== requestId.current) return; // a newer request already won
          setWorkouts(d.workouts);
          setApplied(filter);
          setFieldErrors({});
          setError(null);
        })
        .catch((err) => {
          if (id !== requestId.current) return;
          if (err.status === 400) setFieldErrors(err.fields);
          else setError(err);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [filter.search, filter.from, filter.to]);

  const update = (key) => (e) => setFilter((f) => ({ ...f, [key]: e.target.value }));
  const clear = () => setFilter(EMPTY_FILTER);

  if (error) return <p className="alert" role="alert">{error.message}</p>;

  return (
    <section>
      <div className="page-head">
        <h1>History</h1>
        <Link to="/workouts/new" className="btn primary">Log a workout</Link>
      </div>

      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="filter-search">
          <span className="filter-label">Search</span>
          <input
            type="search"
            value={filter.search}
            onChange={update('search')}
            placeholder="Exercise or note"
            aria-describedby={fieldErrors.search ? 'search-error' : undefined}
          />
          {fieldErrors.search && <span className="field-error" id="search-error">{fieldErrors.search}</span>}
        </label>
        <label>
          <span className="filter-label">From</span>
          <input type="date" value={filter.from} onChange={update('from')} max={filter.to || undefined} />
          {fieldErrors.from && <span className="field-error">{fieldErrors.from}</span>}
        </label>
        <label>
          <span className="filter-label">To</span>
          <input type="date" value={filter.to} onChange={update('to')} min={filter.from || undefined} />
          {fieldErrors.to && <span className="field-error">{fieldErrors.to}</span>}
        </label>
        {hasFilter(filter) && (
          <button type="button" className="btn" onClick={clear}>Clear</button>
        )}
      </form>

      {!workouts ? (
        <p className="status">Loading history…</p>
      ) : workouts.length === 0 ? (
        hasFilter(applied) ? (
          <div className="empty">
            <p className="empty-title">No matching workouts</p>
            <p>Nothing matches those filters. Try a different search or a wider date range.</p>
            <button type="button" className="btn" onClick={clear}>Clear filters</button>
          </div>
        ) : (
          <div className="empty">
            <p className="empty-title">No workouts yet</p>
            <p>Log your first session and it will show up here, newest first.</p>
            <Link to="/workouts/new" className="btn primary">Log your first workout</Link>
          </div>
        )
      ) : (
        <>
          {hasFilter(applied) && (
            <p className="status" aria-live="polite">
              {workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'} found
            </p>
          )}
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
        </>
      )}
    </section>
  );
}
