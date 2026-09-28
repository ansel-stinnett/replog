import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Field from '../components/Field.jsx';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await (isLogin ? login(form) : register(form));
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <span className="bar-icon large" aria-hidden="true" />
        <h1>RepLog</h1>
        <p>Every set you lift, in one place.</p>
      </div>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <h2>{isLogin ? 'Log in' : 'Create your account'}</h2>
        {error && !Object.keys(error.fields).length && <p className="alert" role="alert">{error.message}</p>}
        {!isLogin && (
          <Field id="displayName" label="Name (optional)" value={form.displayName} onChange={set('displayName')}
            autoComplete="nickname" error={error?.fields.displayName} />
        )}
        <Field id="email" label="Email" type="email" value={form.email} onChange={set('email')}
          autoComplete="email" required error={error?.fields.email} />
        <Field id="password" label="Password" type="password" value={form.password} onChange={set('password')}
          autoComplete={isLogin ? 'current-password' : 'new-password'} required
          error={error?.fields.password} minLength={isLogin ? undefined : 8} />
        {!isLogin && <p className="hint">At least 8 characters.</p>}
        <button className="btn primary block" type="submit" disabled={submitting}>
          {submitting ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>
        <p className="switch">
          {isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Have an account? <Link to="/login">Log in</Link></>}
        </p>
      </form>
    </div>
  );
}
