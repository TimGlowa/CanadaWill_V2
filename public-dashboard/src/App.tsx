import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import AdminDashboard from './pages/admin/AdminDashboard';
import PoliticianManagement from './pages/admin/PoliticianManagement';
import QuoteManagement from './pages/admin/QuoteManagement';
import EmailTracking from './pages/admin/EmailTracking';
import DataExport from './pages/admin/DataExport';
import AuditTrail from './pages/admin/AuditTrail';
import UserManagement from './pages/admin/UserManagement';
import Settings from './pages/admin/Settings';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import NotificationToast from './components/NotificationToast';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <ErrorBoundary>
          <Routes>
            {/* Admin routes - protected */}
            <Route path="/admin/*" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/politicians" element={
                      <ProtectedRoute requiredPermission="quotes.read">
                        <PoliticianManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/quotes" element={
                      <ProtectedRoute requiredPermission="quotes.read">
                        <QuoteManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/emails" element={
                      <ProtectedRoute requiredPermission="quotes.read">
                        <EmailTracking />
                      </ProtectedRoute>
                    } />
                    <Route path="/exports" element={
                      <ProtectedRoute requiredPermission="quotes.read">
                        <DataExport />
                      </ProtectedRoute>
                    } />
                    <Route path="/audit" element={
                      <ProtectedRoute requiredPermission="audit.read">
                        <AuditTrail />
                      </ProtectedRoute>
                    } />
                    <Route path="/users" element={
                      <ProtectedRoute requiredPermission="users.read">
                        <UserManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute requiredPermission="settings.read">
                        <Settings />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } />
            
            {/* Public routes */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/about" element={
              <>
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8">
                  <About />
                </main>
                <Footer />
              </>
            } />
            <Route path="*" element={
              <>
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8">
                  <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                    <p className="text-gray-600">The page you're looking for doesn't exist.</p>
                  </div>
                </main>
                <Footer />
              </>
            } />
          </Routes>
          
          {/* Global notification toast */}
          <NotificationToast />
        </ErrorBoundary>
      </div>
    </AuthProvider>
  );
}

export default App; 