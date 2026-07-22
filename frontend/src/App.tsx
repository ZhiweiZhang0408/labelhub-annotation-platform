import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { DesignerPage } from './pages/DesignerPage';
import { WorkbenchPage } from './pages/WorkbenchPage';
import { ReviewPage } from './pages/ReviewPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import './pages/pages.css';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/tasks/:taskId/design"
        element={
          <RequireAuth>
            <DesignerPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tasks/:taskId/annotate"
        element={
          <RequireAuth>
            <WorkbenchPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tasks/:taskId/review"
        element={
          <RequireAuth>
            <ReviewPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tasks/:taskId"
        element={
          <RequireAuth>
            <TaskDetailPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
