import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import ImportCSV from './pages/ImportCSV';
import Politicians from './pages/Politicians';
import NewsSearch from './pages/NewsSearch';

const App: React.FC = () => {
  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import" element={<ImportCSV />} />
          <Route path="/politicians" element={<Politicians />} />
          <Route path="/news" element={<NewsSearch />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
};

export default App; 