import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api.js';
import { formatDate, formatWeight } from '../format.js';

export default function ProgressPage() {
  const [params, setParams] = useSearchParams();
  const [exercises, setExercises] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const selectedId = params.get('exercise');

  useEffect(() => {
    api.listExercises().then((d) => {
      setExercises(d.exercises);
      if (!selectedId && d.exercises.length) setParams({ exercise: String(d.exercises[0].id) }, { replace: true });
    }).catch(setError);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId) return;
    setData(null);
    api.progress(selectedId).then(setData).catch(setError);
  }, [selectedId]);

  if (error) return <p className="alert" role="alert">{error.message}</p>;
  if (!exercises) return <p className="status">Loading…</p>;
  if (exercises.length === 0) {
    return (
      <div className="empty">
        <p className="empty-title">Nothing to chart yet</p>
        <p>Log a workout and your progress for each exercise will appear here.</p>
      </div>
    );
  }

  const points = data?.points || [];
  const first = points[0];
  const last = points[points.length - 1];
  const best = points.reduce((m, p) => (p.topWeight > (m?.topWeight ?? -1) ? p : m), null);

  return (
    <section>
      <div className="page-head">
        <h1>Progress</h1>
      </div>
      <label className="field">
        <span className="field-label">Exercise</span>
        <select value={selectedId || ''} onChange={(e) => setParams({ exercise: e.target.value })}>
          {exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </label>

      {!data ? <p className="status">Loading chart…</p> : (
        <>
          <dl className="stat-row">
            <div><dt>Heaviest</dt><dd>{formatWeight(best.topWeight)}<small> lb</small></dd></div>
            <div><dt>Latest</dt><dd>{formatWeight(last.topWeight)}<small> lb</small></dd></div>
            <div><dt>Change</dt><dd>{last.topWeight - first.topWeight >= 0 ? '+' : ''}{formatWeight(last.topWeight - first.topWeight)}<small> lb</small></dd></div>
          </dl>

          <div className="chart" role="img" aria-label={`Top set weight for ${data.exercise.name} across ${points.length} sessions`}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: -12 }}>
                <CartesianGrid stroke="var(--rubber)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 12, fill: 'var(--steel)' }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis domain={['dataMin - 10', 'dataMax + 10']} tick={{ fontSize: 12, fill: 'var(--steel)' }}
                  tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(v, _n, p) => [`${formatWeight(v)} lb × ${p.payload.reps}`, 'Top set']}
                  labelFormatter={(d) => formatDate(d)} />
                <Line type="monotone" dataKey="topWeight" stroke="var(--plate)" strokeWidth={2.5}
                  dot={{ r: 3.5, fill: 'var(--plate)' }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {points.length === 1 && <p className="hint">One session so far. Log this exercise again to see a trend.</p>}

          <table className="data-table">
            <caption className="sr-only">Top set per session</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Top set</th></tr></thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <td>{formatDate(p.date)}</td>
                  <td className="num">{formatWeight(p.topWeight)} lb × {p.reps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
