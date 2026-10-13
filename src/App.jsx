import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import MenuPage from './pages/MenuPage';
import AdminPage from './pages/AdminPage';
import KitchenPage from './pages/KitchenPage';
import ReportPage from './pages/ReportPage';
import CashierPage from './pages/CashierPage'; // ✨ Үүнийг шинээр нэмнэ

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/report" element={<ReportPage />} /> 
        <Route path="/cashier" element={<CashierPage />} /> {/* ✨ Үүнийг шинээр нэмнэ */}
      </Routes>
    </Router>
  );
}

export default App;