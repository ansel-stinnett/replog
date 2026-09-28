import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { todayISO } from '../format.js';

const blankSet = () => ({ reps: '', weight: '' });
const blankExercise = () => ({ name: '', sets: [blankSet()] });

// Converts API data into form state (numbers -> strings for controlled inputs).
const toForm = (w) => ({
  performedOn: w.performedOn,
  note: w.note || '',
  exercises: w.exercises.map((e) => ({
    name: e.name,
    sets: e.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) })),
  })),
});

export default function WorkoutEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(isEdit ? null : { performedOn: todayISO(), note: '', exercises: [blankExercise()] });
  const [knownExercises, setKnownExercises] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listExercises().then((d) => setKnownExercises(d.exercises)).catch(() => {});
    if (isEdit) api.getWorkout(id).then((d) => setForm(toForm(d.workout))).catch(setError);
  }, [id, isEdit]);

  if (error?.status === 404) {
    return (
      <div className="empty">
        <p className="empty-title">Workout not found</p>
        <p>It may have been deleted.</p>
        <Link to="/" className="btn">Back to history</Link>
      </div>
    );
  }
  if (!form) return <p className="status">Loading workout…</p>;

  const fieldErr = (key) => error?.fields?.[key];

  const updateExercise = (i, patch) =>
    setForm((f) => ({ ...f, exercises: f.exercises.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) }));

  const updateSet = (i, j, patch) =>
    updateExercise(i, { sets: form.exercises[i].sets.map((s, idx) => (idx === j ? { ...s, ...patch } : s)) });

  // New sets copy the previous one: most lifters repeat the same weight and reps.
  const addSet = (i) => {
    const sets = form.exercises[i].sets;
    updateExercise(i, { sets: [...sets, { ...(sets[sets.length - 1] || blankSet()) }] });
  };
  const removeSet = (i, j) => updateExercise(i, { sets: form.exercises[i].sets.filter((_, idx) => idx !== j) });
  const addExercise = () => setForm((f) => ({ ...f, exercises: [...f.exercises, blankExercise()] }));
  const removeExercise = (i) => setForm((f) => ({ ...f, exercises: f.exercises.filter((_, idx) => idx !== i) }));

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) await api.updateWorkout(id, form);
      else await api.createWorkout(form);
      navigate('/');
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!window.confirm('Delete this workout? This cannot be undone.')) return;
    try {
      await api.deleteWorkout(id);
      navigate('/');
    } catch (err) {
      setError(err);
    }
  }

  return (
    <form onSubmit={onSave} noValidate className="editor">
      <div className="page-head">
        <h1>{isEdit ? 'Edit workout' : 'Log a workout'}</h1>
      </div>
      {error && <p className="alert" role="alert">{error.message}</p>}

      <div className="editor-meta">
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" value={form.performedOn} max={todayISO()}
            onChange={(e) => setForm({ ...form, performedOn: e.target.value })}
            aria-invalid={Boolean(fieldErr('performedOn'))} />
          {fieldErr('performedOn') && <span className="field-error">{fieldErr('performedOn')}</span>}
        </label>
        <label className="field grow">
          <span className="field-label">Note (optional)</span>
          <input type="text" value={form.note} placeholder="Push day, felt strong…" maxLength={1000}
            onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
      </div>

      <datalist id="exercise-names">
        {knownExercises.map((e) => <option key={e.id} value={e.name} />)}
      </datalist>

      {fieldErr('exercises') && <p className="field-error">{fieldErr('exercises')}</p>}

      <ol className="exercise-list">
        {form.exercises.map((ex, i) => (
          <li key={i} className="exercise">
            <div className="exercise-head">
              <label className="field grow">
                <span className="sr-only">Exercise {i + 1} name</span>
                <input type="text" className="exercise-name" list="exercise-names" placeholder="Exercise name"
                  value={ex.name} onChange={(e) => updateExercise(i, { name: e.target.value })}
                  aria-invalid={Boolean(fieldErr(`exercises[${i}].name`))} />
                {fieldErr(`exercises[${i}].name`) && <span className="field-error">{fieldErr(`exercises[${i}].name`)}</span>}
              </label>
              {form.exercises.length > 1 && (
                <button type="button" className="btn ghost small" onClick={() => removeExercise(i)}
                  aria-label={`Remove ${ex.name || `exercise ${i + 1}`}`}>Remove</button>
              )}
            </div>

            <table className="sets">
              <thead>
                <tr><th scope="col">Set</th><th scope="col">Weight (lb)</th><th scope="col">Reps</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {ex.sets.map((s, j) => {
                  const wErr = fieldErr(`exercises[${i}].sets[${j}].weight`);
                  const rErr = fieldErr(`exercises[${i}].sets[${j}].reps`);
                  return (
                    <tr key={j}>
                      <td className="set-num">{j + 1}</td>
                      <td>
                        <input type="number" inputMode="decimal" min="0" step="2.5" value={s.weight}
                          aria-label={`Set ${j + 1} weight`} aria-invalid={Boolean(wErr)} title={wErr}
                          onChange={(e) => updateSet(i, j, { weight: e.target.value })} />
                      </td>
                      <td>
                        <input type="number" inputMode="numeric" min="0" step="1" value={s.reps}
                          aria-label={`Set ${j + 1} reps`} aria-invalid={Boolean(rErr)} title={rErr}
                          onChange={(e) => updateSet(i, j, { reps: e.target.value })} />
                      </td>
                      <td>
                        {ex.sets.length > 1 && (
                          <button type="button" className="icon-btn" onClick={() => removeSet(i, j)}
                            aria-label={`Remove set ${j + 1}`}>×</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ex.sets.some((_, j) => fieldErr(`exercises[${i}].sets[${j}].weight`) || fieldErr(`exercises[${i}].sets[${j}].reps`)) && (
              <p className="field-error">Weight and reps must be zero or more.</p>
            )}
            {fieldErr(`exercises[${i}].sets`) && <p className="field-error">{fieldErr(`exercises[${i}].sets`)}</p>}
            <button type="button" className="btn ghost small" onClick={() => addSet(i)}>Add set</button>
          </li>
        ))}
      </ol>

      <button type="button" className="btn block dashed" onClick={addExercise}>Add exercise</button>

      <div className="editor-actions">
        {isEdit && <button type="button" className="btn danger" onClick={onDelete}>Delete workout</button>}
        <Link to="/" className="btn ghost">Cancel</Link>
        <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save workout'}</button>
      </div>
    </form>
  );
}
