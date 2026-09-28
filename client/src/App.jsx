import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import WorkoutEditorPage from './pages/WorkoutEditorPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

// Protected pages redirect to login when signed out (backlog story #2),
// remembering where the user was headed.
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="status">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<HistoryPage />} />
        <Route path="workouts/new" element={<WorkoutEditorPage />} />
        <Route path="workouts/:id" element={<WorkoutEditorPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
