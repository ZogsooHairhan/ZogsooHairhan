import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SiteLayout from './components/SiteLayout';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import KitchenPage from './pages/KitchenPage';
import ReportPage from './pages/ReportPage';
import CashierPage from './pages/CashierPage'; // ✨ Үүнийг шинээр нэмнэ

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
        </Route>
        {/* Админ хуудсыг хассан. Хуучин хаягийг хадгалсан хүмүүс тайлан руу шилжинэ. */}
        <Route path="/admin" element={<Navigate to="/report" replace />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/cashier" element={<CashierPage />} /> {/* ✨ Үүнийг шинээр нэмнэ */}
      </Routes>
    </Router>
  );
}

export default App;
