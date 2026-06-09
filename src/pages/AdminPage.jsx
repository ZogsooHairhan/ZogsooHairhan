import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminPage() {
  // ==============================================
  // 🔒 SUPABASE AUTH (НЭВТРЭХ ХЭСЭГ)
  // ==============================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("❌ Нэвтрэх алдаа: И-мэйл эсвэл нууц үг буруу байна.");
    }
    
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
  };

  // --- ҮНДСЭН ТӨЛӨВҮҮД ---
  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  
  // Тайлангийн төлөвүүд
  const [dailyTotal, setDailyTotal] = useState(0);
  const [cancelledTotal, setCancelledTotal] = useState(0); 
  const [soldItems, setSoldItems] = useState([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // --- 1. ЗАХИАЛГЫН ХЭСЭГ ---
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      // event: '*' болгож зассан (Шинэ захиалга орох, цуцлагдах, бэлэн болох бүх үед шинэчлэгдэнэ)
      const channel = supabase
        .channel('realtime_admin_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders(); 
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (error) throw error;
      fetchOrders(); 
    } catch (err) {
      alert("Алдаа гарлаа: " + err.message);
    }
  };

  // --- 2. ЦЭС УДИРДАХ ХЭСЭГ ---
  const fetchMenuItems = async () => {
    setIsLoadingMenu(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name'); 
      
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
      const { error } = await supabase
        .from('menu_items')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) {
        setMenuItems(menuItems.map(item => item.id === id ? { ...item, is_active: currentStatus } : item));
        throw error;
      }
    } catch (err) {
      alert("Төлөв өөрчлөхөд алдаа гарлаа: " + err.message);
    }
  };

  // --- 3. ӨДРИЙН ТАЙЛАНГИЙН ХЭСЭГ ---
  const fetchDailyReport = async () => {
    setIsLoadingReport(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          total_amount,
          status,
          order_items ( quantity, menu_items (name) )
        `)
        .gte('created_at', startOfToday.toISOString()) 
        .in('status', ['cooking', 'completed', 'cancelled']); 

      if (error) throw error;

      let totalIncome = 0;
      let cancelledCount = 0;
      const itemsCount = {};

      data.forEach(order => {
        if (order.status === 'cancelled') {
          cancelledCount++;
        } else {
          totalIncome += order.total_amount || 0; 
          
          if (order.order_items) {
            order.order_items.forEach(item => {
              const name = item.menu_items?.name || 'Устгагдсан хоол';
              itemsCount[name] = (itemsCount[name] || 0) + item.quantity; 
            });
          }
        }
      });

      setDailyTotal(totalIncome);
      setCancelledTotal(cancelledCount);
      setSoldItems(Object.entries(itemsCount).sort((a, b) => b[1] - a[1])); 

    } catch (err) {
      console.error("Тайлан татахад алдаа:", err.message);
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'menu' && menuItems.length === 0) fetchMenuItems();
      if (activeTab === 'report') fetchDailyReport(); 
    }
  }, [activeTab, isAuthenticated]);

  // ==============================================
  // 🔒 НЭВТРЭХ ДЭЛГЭЦ 
  // ==============================================
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center', width: '340px' }}>
          <div style={{ fontSize: '50px', marginBottom: '15px' }}>🔐</div>
          <h2 style={{ marginBottom: '10px', color: '#0f172a' }}>Админ нэвтрэх</h2>
          <p style={{ color: '#64748b', marginBottom: '25px', fontSize: '0.9rem' }}>Системд нэвтрэх и-мэйл, нууц үгээ оруулна уу</p>
          
          <input
            type="email"
            placeholder="И-мэйл хаяг"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }}
            required
          />
          <input
            type="password"
            placeholder="Нууц үг"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box' }}
            required
          />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '15px', fontSize: '1.1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
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
          <button onClick={() => setActiveTab('orders')} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', backgroundColor: activeTab === 'orders' ? '#3b82f6' : '#e2e8f0', color: activeTab === 'orders' ? 'white' : '#475569' }}>
            📋 Захиалгууд
          </button>
          <button onClick={() => setActiveTab('menu')} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', backgroundColor: activeTab === 'menu' ? '#3b82f6' : '#e2e8f0', color: activeTab === 'menu' ? 'white' : '#475569' }}>
            🍔 Цэс удирдах
          </button>
          <button onClick={() => setActiveTab('report')} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', backgroundColor: activeTab === 'report' ? '#10b981' : '#e2e8f0', color: activeTab === 'report' ? 'white' : '#475569' }}>
            📊 Тайлан харах
          </button>
          <button onClick={handleLogout} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.1)' }}>
            🚪 Гарах
          </button>
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
                <div key={order.id} style={{ 
                  backgroundColor: 'white', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  boxShadow: '0 6px 20px rgba(0,0,0,0.04)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  borderTop: order.status === 'cooking' ? '8px solid #f59e0b' : '8px solid #ef4444' 
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>
                      <div>
                        <strong style={{ fontSize: '1.8rem', color: '#1e293b' }}>Захиалга #{order.order_number}</strong>
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
                          <span style={{ color: '#0f172a', fontWeight: '700', flex: 1, paddingRight: '10px' }}>
                            {item.menu_items?.name || 'Тодорхойгүй хоол'}
                          </span>
                          <strong style={{ color: '#dc2626', fontSize: '1.5rem', fontWeight: '800', whiteSpace: 'nowrap', backgroundColor: '#fef2f2', padding: '2px 10px', borderRadius: '6px' }}>
                            {item.quantity} ш
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ paddingTop: '15px', borderTop: '2px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <strong style={{ fontSize: '1.7rem', color: '#0f172a', fontWeight: '800' }}>{order.total_amount?.toLocaleString()} ₮</strong>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => {
                          if (window.confirm(`⚠️ Захиалга #${order.order_number}-ийг цуцлахдаа итгэлтэй байна уу?`)) {
                            updateOrderStatus(order.id, 'cancelled');
                          }
                        }}
                        style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: '0.2s' }}
                      >
                        ❌ Цуцлах
                      </button>

                      {order.status === 'pending' ? (
                        <button onClick={() => updateOrderStatus(order.id, 'cooking')} style={{ padding: '12px 18px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                          💰 Төлбөр авсан
                        </button>
                      ) : (
                        <button onClick={() => updateOrderStatus(order.id, 'completed')} style={{ padding: '12px 18px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                          ✔️ Хоол бэлэн
                        </button>
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
                  <button onClick={() => toggleMenuItemStatus(item.id, item.is_active)} style={{ padding: '10px 15px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '110px', backgroundColor: item.is_active ? '#10b981' : '#ef4444', color: 'white', fontSize: '0.95rem', transition: '0.2s' }}>
                    {item.is_active ? '✅ Байгаа' : '❌ Дууссан'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ТАБ 3: ӨДРИЙН ТАЙЛАН */}
      {activeTab === 'report' && (
        <div>
          {isLoadingReport ? (
            <h2 style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>Тайлан нэгтгэж байна...</h2>
          ) : (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              
              {/* ЗҮҮН ТАЛЫН БЛОК: ОРЛОГО БОЛОН ЦУЦЛАЛТ */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 💰 Нийт орлого хайрцаг */}
                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', textAlign: 'center', borderTop: '6px solid #10b981' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '1.2rem', fontWeight: '600' }}>Өнөөдрийн нийт орлого</h3>
                  <h1 style={{ margin: 0, color: '#10b981', fontSize: '3rem', fontWeight: '800' }}>{dailyTotal.toLocaleString()} ₮</h1>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '12px' }}>*Идэвхтэй болон дууссан захиалгуудын нийлбэр</p>
                </div>

                {/* ❌ Цуцлагдсан захиалга хайрцаг */}
                <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', textAlign: 'center', borderLeft: '6px solid #ef4444' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '1.1rem', fontWeight: '600' }}>Өнөөдөр цуцлагдсан захиалга</h3>
                  <h2 style={{ margin: 0, color: '#ef4444', fontSize: '2.5rem', fontWeight: '800' }}>{cancelledTotal} <span style={{ fontSize: '1.3rem', fontWeight: '600' }}>ш</span></h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '8px 0 0 0' }}>*Админ эсвэл касс дээр цуцлагдсан түүх</p>
                </div>

              </div>

              {/* БАРУУН ТАЛЫН БЛОК: ЗАРАГДСАН ХООЛНУУД */}
              <div style={{ flex: '2 1 400px', backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '1.4rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontWeight: '700' }}>🍽️ Зарагдсан хоолноос хамгийн их үйлчлүүлсэн</h3>
                {soldItems.length === 0 ? (
                  <p style={{ color: '#64748b', textAlign: 'center', marginTop: '30px' }}>Одоогоор борлуулалт хийгдээгүй байна.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {soldItems.map(([name, quantity], idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px dashed #e2e8f0', fontSize: '1.3rem' }}>
                        <span style={{ color: '#334155', fontWeight: '700' }}>{name}</span>
                        <strong style={{ color: '#ef4444', fontSize: '1.4rem', fontWeight: '800' }}>{quantity} ш</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default AdminPage;