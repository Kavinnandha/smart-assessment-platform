import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './components/layouts/DashboardLayout';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import QuestionsPage from './pages/questions/QuestionsPage';
import SubjectQuestionsPage from './pages/questions/SubjectQuestionsPage';
import CreateQuestionPage from './pages/questions/CreateQuestionPage';
import TestsPage from './pages/tests/TestsPage';
import CreateTestPage from './pages/tests/CreateTestPage';
import TakeTestPage from './pages/tests/TakeTestPage';
import SubmissionsPage from './pages/submissions/SubmissionsPage';
import EvaluatePage from './pages/submissions/EvaluatePage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/admin/UsersPage';
import SubjectsPage from './pages/admin/SubjectsPage';
import StudentGroupsPage from './pages/groups/StudentGroupsPage';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  const getDashboard = () => {
    if (!user) return <Navigate to="/login" />;
    
    switch (user.role) {
      case 'student':
        return <StudentDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Navigate to="/login" />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      
      <Route path="/" element={<Navigate to="/dashboard" />} />
      
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={getDashboard()} />
        
        {/* Question Routes */}
        <Route path="/questions" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><QuestionsPage /></ProtectedRoute>} />
        <Route path="/questions/subject/:subjectId" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><SubjectQuestionsPage /></ProtectedRoute>} />
        <Route path="/questions/create" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CreateQuestionPage /></ProtectedRoute>} />
        <Route path="/questions/create/:subjectId" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CreateQuestionPage /></ProtectedRoute>} />
        <Route path="/questions/edit/:id" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CreateQuestionPage /></ProtectedRoute>} />
        <Route path="/questions/edit/:id/:subjectId" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CreateQuestionPage /></ProtectedRoute>} />
        
        {/* Test Routes */}
        <Route path="/tests" element={<TestsPage />} />
        <Route path="/tests/create" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CreateTestPage /></ProtectedRoute>} />
        <Route path="/tests/edit/:id" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CreateTestPage /></ProtectedRoute>} />
        <Route path="/tests/:id" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><TakeTestPage /></ProtectedRoute>} />
        <Route path="/tests/take/:id" element={<ProtectedRoute allowedRoles={['student']}><TakeTestPage /></ProtectedRoute>} />
        <Route path="/tests/submissions" element={<ProtectedRoute allowedRoles={['teacher', 'admin', 'student']}><SubmissionsPage /></ProtectedRoute>} />
        <Route path="/tests/submissions/evaluate/:id" element={<EvaluatePage />} />
        
        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />
        
        {/* Admin Routes */}
        <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute allowedRoles={['admin']}><SubjectsPage /></ProtectedRoute>} />
        
        {/* Student Groups */}
        <Route path="/student-groups" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><StudentGroupsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
