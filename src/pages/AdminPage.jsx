import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("❌ Нэвтрэх алдаа: И-мэйл эсвэл нууц үг буруу байна.");
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setEmail(''); setPassword('');
  };

  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // ==============================================
  // 🔐 ШИНЭ: КАСС ХААЛТЫН ТӨЛӨВҮҮД
  // ==============================================
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [expectedCash, setExpectedCash] = useState(0);
  const [actualCash, setActualCash] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const channel = supabase
        .channel('realtime_admin_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders(); 
        }).subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (quantity, price, menu_items (name))`)
        .in('status', ['pending', 'cooking']) 
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data);
    } catch (err) {
      console.error("Захиалга татахад алдаа:", err.message);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      fetchOrders(); 
    } catch (err) {
      alert("Алдаа гарлаа: " + err.message);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'menu' && menuItems.length === 0) fetchMenuItems();
  }, [activeTab, isAuthenticated]);

  const fetchMenuItems = async () => {
    setIsLoadingMenu(true);
    try {
      const { data, error } = await supabase.from('menu_items').select('*').order('name'); 
      if (error) throw error;
      setMenuItems(data);
    } catch (err) {
      console.error("Цэс татахад алдаа:", err.message);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const toggleMenuItemStatus = async (id, currentStatus) => {
    setMenuItems(menuItems.map(item => item.id === id ? { ...item, is_active: !currentStatus } : item));
    try {
      const { error } = await supabase.from('menu_items').update({ is_active: !currentStatus }).eq('id', id);
      if (error) {
        setMenuItems(menuItems.map(item => item.id === id ? { ...item, is_active: currentStatus } : item));
        throw error;
      }
    } catch (err) {
      alert("Төлөв өөрчлөхөд алдаа гарлаа: " + err.message);
    }
  };

  // ==============================================
  // 🔐 ШИНЭ: КАСС ХААХ ҮЙЛДЭЛ
  // ==============================================
  const openShiftModal = async () => {
    setIsShiftModalOpen(true);
    setIsCalculating(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Өнөөдрийн баталгаажсан (completed) бүх захиалгын дүнг татаж авах
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', startOfToday.toISOString())
        .eq('status', 'completed');

      if (error) throw error;
      
      const total = data.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      setExpectedCash(total);
    } catch (err) {
      console.error('Орлого татахад алдаа:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center', width: '340px' }}>
          <div style={{ fontSize: '50px', marginBottom: '15px' }}>🔐</div>
          <h2 style={{ marginBottom: '10px', color: '#0f172a' }}>Админ нэвтрэх</h2>
          <input type="email" placeholder="И-мэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '15px', fontSize: '1.1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLoggingIn ? 'Шалгаж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* ТОЛГОЙ ХЭСЭГ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)' }}>💼 Удирдлагын дэлгэц</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('orders')} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'orders' ? '#3b82f6' : '#e2e8f0', color: activeTab === 'orders' ? 'white' : '#475569' }}>📋 Захиалгууд</button>
          <button onClick={() => setActiveTab('menu')} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'menu' ? '#3b82f6' : '#e2e8f0', color: activeTab === 'menu' ? 'white' : '#475569' }}>🍔 Цэс удирдах</button>
          
          {/* ШИНЭ: Касс хаах товч */}
          <button onClick={openShiftModal} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: '2px solid #0f172a', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'white', color: '#0f172a' }}>
            🔐 Касс хаах
          </button>
          
          <button onClick={handleLogout} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white' }}>🚪 Гарах</button>
        </div>
      </div>

      {/* ТАБ 1: ЗАХИАЛГУУД */}
      {activeTab === 'orders' && (
        <div>
          {isLoadingOrders ? (
            <h2 style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>Захиалгуудыг уншиж байна...</h2>
          ) : orders.length === 0 ? (
            <h3 style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>Одоогоор идэвхтэй захиалга байхгүй байна.</h3>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(320px, 28vw, 500px), 1fr))', gap: '25px' }}>
              {orders.map((order) => (
                <div key={order.id} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 6px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: order.status === 'cooking' ? '8px solid #f59e0b' : '8px solid #ef4444' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>
                      <div>
                        <strong style={{ fontSize: '1.8rem', color: '#1e293b' }}>Захиалга #{order.order_number || String(order.id).slice(-4).toUpperCase()}</strong>
                        <div style={{ color: '#64748b', fontSize: '1.05rem', marginTop: '6px', fontWeight: '600' }}>
                          🕒 {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                          {order.phone_number && ` • 📱 ${order.phone_number}`}
                        </div>
                      </div>
                      <span style={{ padding: '6px 12px', backgroundColor: order.status === 'pending' ? '#fee2e2' : '#fef3c7', color: order.status === 'pending' ? '#dc2626' : '#d97706', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                        {order.status === 'pending' ? 'ТӨЛБӨР ХҮЛЭЭХ' : 'ХИЙЖ БАЙНА'}
                      </span>
                    </div>
                    <div style={{ backgroundColor: order.order_type === 'dine-in' ? '#eff6ff' : '#fff7ed', color: order.order_type === 'dine-in' ? '#1d4ed8' : '#c2410c', padding: '10px 15px', borderRadius: '8px', fontSize: '1.3rem', fontWeight: '800', textAlign: 'center', marginBottom: '15px' }}>
                      {order.order_type === 'dine-in' ? '🍽️ СУУЖ ИДЭХ' : '🛍️ АВААД ЯВАХ'}
                    </div>
                    <div style={{ minHeight: '100px', marginBottom: '20px' }}>
                      {order.order_items && order.order_items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '1.4rem', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                          <span style={{ color: '#0f172a', fontWeight: '700', flex: 1, paddingRight: '10px' }}>{item.menu_items?.name || 'Тодорхойгүй хоол'}</span>
                          <strong style={{ color: '#dc2626', fontSize: '1.5rem', fontWeight: '800', backgroundColor: '#fef2f2', padding: '2px 10px', borderRadius: '6px' }}>{item.quantity} ш</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ paddingTop: '15px', borderTop: '2px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <strong style={{ fontSize: '1.7rem', color: '#0f172a', fontWeight: '800' }}>{order.total_amount?.toLocaleString()} ₮</strong>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { if (window.confirm(`⚠️ Захиалгыг цуцлахдаа итгэлтэй байна уу?`)) updateOrderStatus(order.id, 'cancelled'); }} style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Цуцлах</button>
                      {order.status === 'pending' ? (
                        <button onClick={() => updateOrderStatus(order.id, 'cooking')} style={{ padding: '12px 18px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>💰 Төлбөр авсан</button>
                      ) : (
                        <button onClick={() => updateOrderStatus(order.id, 'completed')} style={{ padding: '12px 18px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✔️ Хоол бэлэн</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ТАБ 2: ЦЭС УДИРДАХ */}
      {activeTab === 'menu' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <h2 style={{ marginTop: 0, color: '#0f172a', marginBottom: '20px' }}>Хоолны үлдэгдэл тохируулах</h2>
          {isLoadingMenu ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Цэс уншиж байна...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
              {menuItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: item.is_active ? '#ffffff' : '#f8fafc', opacity: item.is_active ? 1 : 0.65 }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.25rem', color: '#1e293b', textDecoration: item.is_active ? 'none' : 'line-through', fontWeight: '700' }}>{item.name}</h3>
                    <span style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600' }}>{item.price.toLocaleString()} ₮</span>
                  </div>
                  <button onClick={() => toggleMenuItemStatus(item.id, item.is_active)} style={{ padding: '10px 15px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '110px', backgroundColor: item.is_active ? '#10b981' : '#ef4444', color: 'white' }}>
                    {item.is_active ? '✅ Байгаа' : '❌ Дууссан'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🔐 ШИНЭ: КАСС ХААЛТЫН МОДАЛ ЦОНХ */}
      {isShiftModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '1.6rem', textAlign: 'center', fontWeight: '800' }}>
              🔐 Касс хаалт (Тооцоо нийлэх)
            </h2>
            
            {isCalculating ? (
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}>Орлого тооцоолж байна. Түр хүлээнэ үү...</p>
            ) : (
              <>
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ color: '#475569', fontSize: '1rem', fontWeight: '600', textTransform: 'uppercase' }}>Систем дэх өнөөдрийн борлуулалт</span>
                  <div style={{ fontSize: '2.5rem', color: '#0f172a', fontWeight: '900', marginTop: '5px' }}>
                    {expectedCash.toLocaleString()} ₮
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', color: '#1e293b', fontWeight: '700', fontSize: '1.1rem' }}>Кассанд байгаа бэлэн мөнгө:</label>
                  <input 
                    type="number" 
                    value={actualCash} 
                    onChange={(e) => setActualCash(e.target.value)} 
                    placeholder="Тоолсон мөнгөн дүнгээ оруулна уу"
                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.3rem', fontWeight: 'bold', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {/* Алдаа эсвэл зөрүү харуулах хэсэг */}
                {actualCash !== '' && (
                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '25px', backgroundColor: (Number(actualCash) === expectedCash) ? '#dcfce7' : ((Number(actualCash) < expectedCash) ? '#fee2e2' : '#fef9c3'), color: (Number(actualCash) === expectedCash) ? '#16a34a' : ((Number(actualCash) < expectedCash) ? '#dc2626' : '#ca8a04') }}>
                    {Number(actualCash) === expectedCash && (
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>✅ Тооцоо яг нийлж байна!</strong>
                    )}
                    {Number(actualCash) < expectedCash && (
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>⚠️ {(expectedCash - Number(actualCash)).toLocaleString()} ₮ дутаж байна!</strong>
                    )}
                    {Number(actualCash) > expectedCash && (
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>⚠️ {(Number(actualCash) - expectedCash).toLocaleString()} ₮ илүү байна.</strong>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => {setIsShiftModalOpen(false); setActualCash('');}} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '1.1rem' }}>
                    Буцах
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('Кассыг хааж, ээлжийг дуусгахдаа итгэлтэй байна уу?')) {
                        setIsShiftModalOpen(false);
                        setActualCash('');
                        alert('Касс амжилттай хаагдлаа!');
                      }
                    }} 
                    style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    Хаах батлах
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminPage;