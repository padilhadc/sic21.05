import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import ValidateCode from './pages/ValidateCode';
import Dashboard from './pages/Dashboard';
import ServiceForm from './pages/ServiceForm';
import ServiceHistory from './pages/ServiceHistory';
import AdminPanel from './pages/AdminPanel';
import OperatorEfficiency from './pages/OperatorEfficiency';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/:resetToken" element={<ResetPassword />} />
          <Route path="/validate-code" element={<ValidateCode />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="service/new" element={<ServiceForm />} />
            <Route path="service/history" element={<ServiceHistory />} />
            <Route path="efficiency" element={<OperatorEfficiency />} />
            <Route path="admin" element={<AdminPanel />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;