import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SiteLayout from './components/SiteLayout';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';

// Ажилчдын хуудсуудыг зөвхөн нээх үед нь ачаална.
// Ингэснээр QR уншуулж орсон зочдод сайт хурдан нээгдэнэ.
const KitchenPage = lazy(() => import('./pages/KitchenPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const CashierPage = lazy(() => import('./pages/CashierPage'));

const loading = (
  <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: "'Onest', Arial, sans-serif", fontWeight: 500, color: '#64748b' }}>
    Зогсоо Хайрхан · ачаалж байна...
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={loading}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
          </Route>
          {/* Админ хуудсыг хассан. Хуучин хаягийг хадгалсан хүмүүс тайлан руу шилжинэ. */}
          <Route path="/admin" element={<Navigate to="/report" replace />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/cashier" element={<CashierPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
