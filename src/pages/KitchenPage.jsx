import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function KitchenPage() {
  // ==============================================
  // 🔒 AUTH (НЭВТРЭХ ХЭСЭГ)
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

  // ==============================================
  // 🍳 ГАЛ ТОГООНЫ ТӨЛӨВҮҮД
  // ==============================================
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ✨ ШИНЭ: Таб солих төлөв (cooking эсвэл completed)
  const [activeTab, setActiveTab] = useState('cooking'); 

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      // Бодит цагийн шинэчлэлт
      const channel = supabase
        .channel('kitchen_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders(); 
        }).subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      // Өнөөдрийн эхлэлийг авах (Зөвхөн өнөөдрийн бэлэн болсон хоолыг харуулахын тулд)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (quantity, menu_items (name))`)
        .in('status', ['cooking', 'completed']) // Зөвхөн хийгдэж байгаа болон бэлэн болсныг татна
        .gte('created_at', startOfToday.toISOString()) // Өнөөдрийнхөөр хязгаарлана
        .order('created_at', { ascending: true }); // Эхэлж орсон захиалга эхэндээ гарна (Тогоочид хэрэгтэй)

      if (error) throw error;
      setOrders(data);
    } catch (err) {
      console.error("Захиалга татахад алдаа:", err.message);
    } finally {
      setIsLoading(false);
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

  // Захиалгуудыг 2 хуваах
  const cookingOrders = orders.filter(o => o.status === 'cooking');
  // Бэлэн болсон захиалгуудыг хамгийн сүүлд гарснаар нь эрэмбэлэх
  const completedOrders = orders.filter(o => o.status === 'completed').sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  // ==============================================
  // 🔒 НЭВТРЭХ ДЭЛГЭЦ
  // ==============================================
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center', width: '340px' }}>
          <div style={{ fontSize: '50px', marginBottom: '15px' }}>👨‍🍳</div>
          <h2 style={{ marginBottom: '10px', color: '#0f172a' }}>Гал тогоо нэвтрэх</h2>
          <input type="email" placeholder="И-мэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '15px', fontSize: '1.1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLoggingIn ? 'Шалгаж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    );
  }

  // ==============================================
  // 👨‍🍳 ГАЛ ТОГООНЫ ҮНДСЭН ДЭЛГЭЦ
  // ==============================================
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* ТОЛГОЙ ХЭСЭГ БОЛОН ТАБ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)' }}>👨‍🍳 Гал тогоо</h1>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* ✨ ШИНЭ: Таб солих товчнууд */}
          <button 
            onClick={() => setActiveTab('cooking')} 
            style={{ padding: '12px 20px', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'cooking' ? '#f59e0b' : '#e2e8f0', color: activeTab === 'cooking' ? 'white' : '#475569' }}
          >
            🔥 Хийгдэж байгаа ({cookingOrders.length})
          </button>
          
          <button 
            onClick={() => setActiveTab('completed')} 
            style={{ padding: '12px 20px', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'completed' ? '#10b981' : '#e2e8f0', color: activeTab === 'completed' ? 'white' : '#475569' }}
          >
            ✅ Бэлэн болсон ({completedOrders.length})
          </button>

          <button onClick={handleLogout} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white' }}>🚪 Гарах</button>
        </div>
      </div>

      {isLoading ? (
        <h2 style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>Захиалгуудыг уншиж байна...</h2>
      ) : (
        <>
          {/* 1. ХИЙГДЭЖ БАЙГАА ЗАХИАЛГУУД */}
          {activeTab === 'cooking' && (
            <div>
              {cookingOrders.length === 0 ? (
                <h3 style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>Одоогоор хийх хоол байхгүй байна. 🎉</h3>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(320px, 28vw, 500px), 1fr))', gap: '25px' }}>
                  {cookingOrders.map((order) => (
                    <div key={order.id} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 6px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '8px solid #f59e0b' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>
                          <div>
                            <strong style={{ fontSize: '2rem', color: '#1e293b' }}>
                              #{order.order_number || String(order.id).slice(-4).toUpperCase()}
                            </strong>
                            <div style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '6px', fontWeight: '600' }}>
                              🕒 {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div style={{ backgroundColor: order.order_type === 'dine-in' ? '#eff6ff' : '#fff7ed', color: order.order_type === 'dine-in' ? '#1d4ed8' : '#c2410c', padding: '8px 12px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '800' }}>
                            {order.order_type === 'dine-in' ? '🍽️ СУУЖ ИДЭХ' : '🛍️ АВААД ЯВАХ'}
                          </div>
                        </div>

                        <div style={{ minHeight: '100px', marginBottom: '20px' }}>
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '1.5rem', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ color: '#0f172a', fontWeight: '700', flex: 1, paddingRight: '10px' }}>{item.menu_items?.name || 'Тодорхойгүй'}</span>
                              <strong style={{ color: '#dc2626', fontSize: '1.8rem', fontWeight: '900', backgroundColor: '#fef2f2', padding: '4px 12px', borderRadius: '8px' }}>{item.quantity} ш</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => updateOrderStatus(order.id, 'completed')} 
                        style={{ width: '100%', padding: '18px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1.4rem', fontWeight: '900', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
                      >
                        ✔️ ХООЛ БЭЛЭН
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. БЭЛЭН БОЛСОН ЗАХИАЛГУУД */}
          {activeTab === 'completed' && (
            <div>
              {completedOrders.length === 0 ? (
                <h3 style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>Өнөөдөр бэлэн болсон хоол алга байна.</h3>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(320px, 28vw, 500px), 1fr))', gap: '25px' }}>
                  {completedOrders.map((order) => (
                    <div key={order.id} style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: 0.85 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '15px' }}>
                          <div>
                            <strong style={{ fontSize: '1.6rem', color: '#475569', textDecoration: 'line-through' }}>
                              #{order.order_number || String(order.id).slice(-4).toUpperCase()}
                            </strong>
                          </div>
                          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            ✅ Бэлэн болсон
                          </div>
                        </div>

                        <div style={{ minHeight: '80px', marginBottom: '20px' }}>
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '1.3rem', color: '#64748b' }}>
                              <span>{item.menu_items?.name || 'Тодорхойгүй'}</span>
                              <strong>{item.quantity} ш</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ✨ ШИНЭ: Буцаах товч (Тогооч андуурч дарсан бол буцаах боломжтой) */}
                      <button 
                        onClick={() => {
                          if (window.confirm("Энэ захиалгыг буцаагаад 'Хийгдэж байгаа' руу шилжүүлэх үү?")) {
                            updateOrderStatus(order.id, 'cooking');
                          }
                        }}
                        style={{ width: '100%', padding: '12px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '800' }}
                      >
                        ↩️ Буцааж хийгдэж байгаа руу шилжүүлэх
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default KitchenPage;