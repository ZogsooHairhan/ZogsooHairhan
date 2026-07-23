import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MenuPage from './components/MenuPage';
import AdminPage from './components/AdminPage';
import KitchenPage from './components/KitchenPage';
import ReportPage from './components/ReportPage'; // Үүнийг нэмнэ

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/report" element={<ReportPage />} /> {/* Үүнийг нэмнэ */}
      </Routes>
    </Router>
  );
}

export default App;