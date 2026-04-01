import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClaimList from './pages/Claims/ClaimList';
import ClaimDetail from './pages/Claims/ClaimDetail';
import Approvals from './pages/Approvals';
import Finance from './pages/Finance';
import Batches from './pages/Batches';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Users from './pages/Users';

function AppLayout({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />

          <Route path="/claims" element={<AppLayout roles={['employee', 'manager', 'admin']}><ClaimList /></AppLayout>} />
          <Route path="/claims/:id" element={<AppLayout><ClaimDetail /></AppLayout>} />

          <Route path="/approvals" element={<AppLayout roles={['manager', 'admin']}><Approvals /></AppLayout>} />
          <Route path="/finance" element={<AppLayout roles={['processor', 'admin']}><Finance /></AppLayout>} />
          <Route path="/batches" element={<AppLayout roles={['processor', 'admin']}><Batches /></AppLayout>} />
          <Route path="/reports" element={<AppLayout roles={['processor', 'admin', 'manager']}><Reports /></AppLayout>} />
          <Route path="/users" element={<AppLayout roles={['admin']}><Users /></AppLayout>} />
          <Route path="/notifications" element={<AppLayout><Notifications /></AppLayout>} />
          <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
