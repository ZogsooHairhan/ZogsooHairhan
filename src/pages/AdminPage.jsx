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
  };

  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // 💳 ТӨЛБӨРИЙН ТӨРӨЛ СОНГОХ ЦОНХНЫ ТӨЛӨВҮҮД
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState(null);

  // 🔐 КАСС ХААЛТЫН ТӨЛӨВҮҮД
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [expectedCash, setExpectedCash] = useState(0); 
  const [actualCash, setActualCash] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isShiftClosed, setIsShiftClosed] = useState(false);

  // 🍔 ШИНЭ: ХООЛ НЭМЭХ ТӨЛӨВҮҮД
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');
  const [newMenuCategory, setNewMenuCategory] = useState('');
  const [newMenuImage, setNewMenuImage] = useState('');
  const [isAddingMenu, setIsAddingMenu] = useState(false);

  const getTodayString = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
  };

  useEffect(() => {
    if (isAuthenticated) {
      checkShiftStatus();
      fetchOrders();
      const channel = supabase
        .channel('realtime_admin_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders(); 
        }).subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [isAuthenticated]);

  const checkShiftStatus = async () => {
    try {
      const { data, error } = await supabase.from('shift_closures').select('*').eq('closure_date', getTodayString());
      if (data && data.length > 0) setIsShiftClosed(true);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select(`*, order_items (quantity, price, menu_items (name))`).in('status', ['pending', 'cooking']).order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data);
    } catch (err) {
      console.error("Захиалга татахад алдаа:", err.message);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, paymentMethod = null) => {
    try {
      let updateData = { status: newStatus };
      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }
      const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;
      
      setIsPaymentModalOpen(false);
      setPaymentOrderId(null);
      fetchOrders(); 
    } catch (err) {
      alert("Алдаа гарлаа: " + err.message);
    }
  };

  const openPaymentModal = (orderId) => {
    setPaymentOrderId(orderId);
    setIsPaymentModalOpen(true);
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
      if (error) { setMenuItems(menuItems.map(item => item.id === id ? { ...item, is_active: currentStatus } : item)); throw error; }
    } catch (err) { alert("Төлөв өөрчлөхөд алдаа гарлаа: " + err.message); }
  };

  // 🍔 ШИНЭ: ХООЛ НЭМЭХ ФУНКЦ
  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    if (!newMenuName || !newMenuPrice || !newMenuCategory) return alert("Мэдээллийг бүрэн оруулна уу!");
    
    setIsAddingMenu(true);
    try {
      const { error } = await supabase.from('menu_items').insert([{
        name: newMenuName,
        price: Number(newMenuPrice),
        category: newMenuCategory,
        // Зураг оруулаагүй бол default зураг ашиглана
        image_url: newMenuImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80',
        is_active: true
      }]);
      
      if (error) throw error;
      
      alert("Шинэ хоол амжилттай нэмэгдлээ!");
      setIsAddMenuModalOpen(false);
      setNewMenuName(''); setNewMenuPrice(''); setNewMenuCategory(''); setNewMenuImage('');
      fetchMenuItems(); // Цэсийг дахин ачааллах
    } catch (err) {
      alert("Алдаа гарлаа: " + err.message);
    } finally {
      setIsAddingMenu(false);
    }
  };

  const openShiftModal = async () => {
    if (isShiftClosed) return; 
    setIsShiftModalOpen(true);
    setIsCalculating(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase.from('orders').select('total_amount, payment_method').gte('created_at', startOfToday.toISOString()).in('status', ['cooking', 'completed']);
      if (error) throw error;
      
      const cashTotal = data.filter(order => order.payment_method === 'cash').reduce((sum, order) => sum + (order.total_amount || 0), 0);
      setExpectedCash(cashTotal);
    } catch (err) {
      console.error('Орлого татахад алдаа:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const confirmShiftClose = async () => {
    if (Number(actualCash) !== expectedCash) return;
    if (!window.confirm('Кассыг хааж, ээлжийг дуусгахдаа итгэлтэй байна уу?')) return;
    try {
      const { error } = await supabase.from('shift_closures').insert([{
        closure_date: getTodayString(), expected_cash: expectedCash, actual_cash: Number(actualCash), difference: Number(actualCash) - expectedCash
      }]);
      if (error) throw error;
      setIsShiftClosed(true); setIsShiftModalOpen(false); setActualCash('');
      alert('✅ Өнөөдрийн орлого амжилттай хаагдлаа. Тайлан руу илгээгдэв!');
    } catch (err) { alert("Алдаа гарлаа: " + err.message); }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)' }}>💼 Удирдлагын дэлгэц</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('orders')} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'orders' ? '#3b82f6' : '#e2e8f0', color: activeTab === 'orders' ? 'white' : '#475569' }}>📋 Захиалгууд</button>
          <button onClick={() => setActiveTab('menu')} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'menu' ? '#3b82f6' : '#e2e8f0', color: activeTab === 'menu' ? 'white' : '#475569' }}>🍔 Цэс удирдах</button>
          
          <button onClick={openShiftModal} disabled={isShiftClosed} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: isShiftClosed ? 'none' : '2px solid #0f172a', borderRadius: '8px', cursor: isShiftClosed ? 'not-allowed' : 'pointer', backgroundColor: isShiftClosed ? '#10b981' : 'white', color: isShiftClosed ? 'white' : '#0f172a' }}>
            {isShiftClosed ? '✅ Өнөөдөр хаагдсан' : '🔐 Касс хаах'}
          </button>
          
          <button onClick={handleLogout} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white' }}>🚪 Гарах</button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(320px, 28vw, 500px), 1fr))', gap: '25px' }}>
          {orders.map((order) => (
            <div key={order.id} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 6px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: order.status === 'cooking' ? '8px solid #f59e0b' : '8px solid #ef4444' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>
                  <div>
                    <strong style={{ fontSize: '1.8rem', color: '#1e293b' }}>Захиалга #{order.order_number || String(order.id).slice(-4).toUpperCase()}</strong>
                  </div>
                  <span style={{ padding: '6px 12px', backgroundColor: order.status === 'pending' ? '#fee2e2' : '#fef3c7', color: order.status === 'pending' ? '#dc2626' : '#d97706', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '800' }}>
                    {order.status === 'pending' ? 'ТӨЛБӨР ХҮЛЭЭХ' : 'ХИЙЖ БАЙНА'}
                  </span>
                </div>
                <div style={{ backgroundColor: order.order_type === 'dine-in' ? '#eff6ff' : '#fff7ed', color: order.order_type === 'dine-in' ? '#1d4ed8' : '#c2410c', padding: '10px', borderRadius: '8px', fontSize: '1.3rem', fontWeight: '800', textAlign: 'center', marginBottom: '15px' }}>
                  {order.order_type === 'dine-in' ? '🍽️ СУУЖ ИДЭХ' : '🛍️ АВААД ЯВАХ'}
                </div>
                <div style={{ minHeight: '80px', marginBottom: '20px' }}>
                  {order.order_items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.4rem' }}>
                      <span>{item.menu_items?.name}</span>
                      <strong style={{ color: '#dc2626' }}>{item.quantity} ш</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ paddingTop: '15px', borderTop: '2px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.7rem' }}>{order.total_amount?.toLocaleString()} ₮</strong>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => updateOrderStatus(order.id, 'cancelled')} style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>❌ Цуцлах</button>
                  {order.status === 'pending' ? (
                    <button onClick={() => openPaymentModal(order.id)} style={{ padding: '10px 18px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>💰 Төлбөр авах</button>
                  ) : (
                    <button onClick={() => updateOrderStatus(order.id, 'completed')} style={{ padding: '10px 18px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✔️ Хоол бэлэн</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ТАБ 2: ЦЭС УДИРДАХ */}
      {activeTab === 'menu' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          
          {/* ✨ ШИНЭ: Шинэ хоол нэмэх товч */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ margin: 0, color: '#0f172a' }}>Хоолны үлдэгдэл тохируулах</h2>
            <button 
              onClick={() => setIsAddMenuModalOpen(true)} 
              style={{ padding: '12px 20px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ➕ Шинэ хоол нэмэх
            </button>
          </div>

          {isLoadingMenu ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Цэс уншиж байна...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
              {menuItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: item.is_active ? '#ffffff' : '#f8fafc', opacity: item.is_active ? 1 : 0.65 }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.25rem', color: '#1e293b', textDecoration: item.is_active ? 'none' : 'line-through', fontWeight: '700' }}>{item.name}</h3>
                    <span style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600' }}>{item.price.toLocaleString()} ₮</span>
                    <br/>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{item.category}</span>
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

      {/* 🍔 ШИНЭ: ХООЛ НЭМЭХ МОДАЛ ЦОНХ */}
      {isAddMenuModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#0f172a' }}>➕ Шинэ хоол нэмэх</h2>
            <form onSubmit={handleAddMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Хоолны нэр:</label>
                <input type="text" value={newMenuName} onChange={e => setNewMenuName(e.target.value)} required placeholder="Жишээ: Цуйван" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '5px', boxSizing: 'border-box', fontSize: '1rem' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Үнэ (MNT):</label>
                <input type="number" value={newMenuPrice} onChange={e => setNewMenuPrice(e.target.value)} required placeholder="15000" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '5px', boxSizing: 'border-box', fontSize: '1rem' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Ангилал:</label>
                <input type="text" value={newMenuCategory} onChange={e => setNewMenuCategory(e.target.value)} required placeholder="Жишээ: Үндсэн хоол, Уух зүйл" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '5px', boxSizing: 'border-box', fontSize: '1rem' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Зургийн линк (Заавал биш):</label>
                <input type="text" value={newMenuImage} onChange={e => setNewMenuImage(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '5px', boxSizing: 'border-box', fontSize: '1rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddMenuModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.05rem' }}>Цуцлах</button>
                <button type="submit" disabled={isAddingMenu} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.05rem' }}>
                  {isAddingMenu ? 'Нэмж байна...' : 'Хадгалах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 💳 ТӨЛБӨРИЙН ТӨРӨЛ СОНГОХ ЦОНХ */}
      {isPaymentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '380px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#0f172a' }}>Төлбөрийн төрөл</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => updateOrderStatus(paymentOrderId, 'cooking', 'cash')} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>💵 Бэлэн мөнгө</button>
              <button onClick={() => updateOrderStatus(paymentOrderId, 'cooking', 'card')} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>💳 Картаар</button>
              <button onClick={() => updateOrderStatus(paymentOrderId, 'cooking', 'transfer')} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#8b5cf6', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>🏦 Дансаар</button>
              <button onClick={() => updateOrderStatus(paymentOrderId, 'cooking', 'qpay')} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#f59e0b', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>📱 QPay</button>
              <button onClick={() => { setIsPaymentModalOpen(false); setPaymentOrderId(null); }} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#e2e8f0', color: '#475569', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Буцах</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 КАСС ХААЛТЫН ЦОНХ */}
      {isShiftModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '420px' }}>
            <h2 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>🔐 Касс хаалт</h2>
            {isCalculating ? <p style={{ textAlign: 'center' }}>Тооцоолж байна...</p> : (
              <>
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#475569', fontWeight: 'bold' }}>Өнөөдрийн БЭЛЭН МӨНГӨНИЙ орлого:</span>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a', marginTop: '10px' }}>{expectedCash.toLocaleString()} ₮</div>
                </div>
                
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Кассанд тоолсон бэлэн мөнгө:</label>
                <input type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)} placeholder="0 ₮" style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.3rem', marginBottom: '20px', boxSizing: 'border-box' }} />
                
                {actualCash !== '' && (
                  <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '25px', backgroundColor: (Number(actualCash) === expectedCash) ? '#dcfce7' : ((Number(actualCash) < expectedCash) ? '#fee2e2' : '#fef9c3'), color: (Number(actualCash) === expectedCash) ? '#16a34a' : ((Number(actualCash) < expectedCash) ? '#dc2626' : '#ca8a04') }}>
                    {Number(actualCash) === expectedCash && <strong style={{ fontSize: '1.1rem' }}>✅ Тооцоо яг нийлж байна!</strong>}
                    {Number(actualCash) < expectedCash && <strong style={{ fontSize: '1.1rem' }}>⚠️ {(expectedCash - Number(actualCash)).toLocaleString()} ₮ дутаж байна!</strong>}
                    {Number(actualCash) > expectedCash && <strong style={{ fontSize: '1.1rem' }}>⚠️ {(Number(actualCash) - expectedCash).toLocaleString()} ₮ илүү байна.</strong>}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setIsShiftModalOpen(false)} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#e2e8f0', fontWeight: 'bold', cursor: 'pointer' }}>Буцах</button>
                  <button 
                    onClick={confirmShiftClose} 
                    disabled={Number(actualCash) !== expectedCash || actualCash === ''}
                    style={{ 
                      flex: 1, padding: '16px', borderRadius: '12px', border: 'none', 
                      backgroundColor: (Number(actualCash) === expectedCash && actualCash !== '') ? '#10b981' : '#94a3b8', 
                      color: 'white', fontWeight: 'bold', 
                      cursor: (Number(actualCash) === expectedCash && actualCash !== '') ? 'pointer' : 'not-allowed'
                    }}
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