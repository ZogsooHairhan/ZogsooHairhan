import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Файлууд "pages" хавтас дотор байгаа тул замыг ингэж зааж өгнө 👇
import MenuPage from './pages/MenuPage';
import AdminPage from './pages/AdminPage';
import KitchenPage from './pages/KitchenPage';
import ReportPage from './pages/ReportPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/report" element={<ReportPage />} /> 
      </Routes>
    </Router>
  );
}

export default App;