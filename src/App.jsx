import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import AdminPage from './pages/AdminPage';
import KitchenPage from './pages/KitchenPage'; // <--- 1. Энд шинэ хуудсаа дуудна

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/kitchen" element={<KitchenPage />} /> {/* <--- 2. Энд замыг нь нэмнэ */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;