export default function Field({ label, error, id, ...inputProps }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...inputProps} />
      {error && <span className="field-error" id={`${id}-err`}>{error}</span>}
    </label>
  );
}
