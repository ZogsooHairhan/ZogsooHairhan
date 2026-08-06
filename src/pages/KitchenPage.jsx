import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

function KitchenPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 🔔 Хонхны дуу
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const audioRef = useRef(new Audio('https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233524/success.mp3'));

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

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cooking'); 

  // Дуу идэвхжүүлэх
  const enableSound = () => {
    audioRef.current.play().then(() => {
      setIsSoundEnabled(true);
    }).catch(err => {
      console.log("Дуу идэвхжүүлэхэд алдаа:", err);
      alert("Дуу идэвхжүүлэх боломжгүй байна.");
    });
  };

  const playBellSound = () => {
    if (!isSoundEnabled) return; 
    audioRef.current.currentTime = 0;
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => console.log("Хонх хаагдсан байна:", error));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const channel = supabase
        .channel('kitchen_orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
          playBellSound(); 
          fetchOrders(); 
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
          fetchOrders(); 
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [isAuthenticated, isSoundEnabled]);

  const fetchOrders = async () => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (menu_item_id, quantity, is_done, menu_items (name))`)
        .in('status', ['cooking', 'completed'])
        .gte('created_at', startOfToday.toISOString())
        .order('created_at', { ascending: true });

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

  // Хоол чеклэх/хасах функц
  const toggleItemDone = async (orderId, menuItemId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ is_done: !currentStatus })
        .eq('order_id', orderId)
        .eq('menu_item_id', menuItemId);

      if (error) throw error;
      fetchOrders(); 
    } catch (err) {
      console.error("Төлөв өөрчлөхөд алдаа:", err.message);
    }
  };

  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const completedOrders = orders.filter(o => o.status === 'completed').sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

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

  return (
    <div style={{ padding: '15px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* 🔔 ХОНХ ИДЭВХЖҮҮЛЭХ САНУУЛГА */}
      {!isSoundEnabled && (
        <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '10px 20px', borderRadius: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #fca5a5', flexWrap: 'wrap', gap: '10px' }}>
          <strong style={{ fontSize: '1rem' }}>⚠️ Захиалга дуугаргахын тулд идэвхжүүлнэ үү.</strong>
          <button onClick={enableSound} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🔔 Дууг идэвхжүүлэх</button>
        </div>
      )}

      {/* ТОЛГОЙ ХЭСЭГ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.5rem' }}>👨‍🍳 Гал тогоо</h1>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('cooking')} style={{ padding: '10px 15px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'cooking' ? '#f59e0b' : '#e2e8f0', color: activeTab === 'cooking' ? 'white' : '#475569' }}>
            🔥 Хийгдэж байгаа ({cookingOrders.length})
          </button>
          <button onClick={() => setActiveTab('completed')} style={{ padding: '10px 15px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'completed' ? '#10b981' : '#e2e8f0', color: activeTab === 'completed' ? 'white' : '#475569' }}>
            ✅ Бэлэн ({completedOrders.length})
          </button>
          <button onClick={handleLogout} style={{ padding: '10px 15px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white' }}>Гарах</button>
        </div>
      </div>

      {isLoading ? (
        <h2 style={{ textAlign: 'center', marginTop: '40px', color: '#64748b', fontSize: '1.2rem' }}>Уншиж байна...</h2>
      ) : (
        <>
          {activeTab === 'cooking' && (
            <div>
              {cookingOrders.length === 0 ? (
                <h3 style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>Хийх хоол байхгүй байна. 🎉</h3>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                  {cookingOrders.map((order) => {
                    // ТӨРӨЛ БОЛОН ӨНГӨ ЯЛГАХ ХЭСЭГ
                    const isTakeaway = order.order_type === 'pickup';
                    const cardBorder = isTakeaway ? '#ea580c' : '#3b82f6'; // Улбар шар vs Цэнхэр
                    const badgeBg = isTakeaway ? '#ffedd5' : '#eff6ff';
                    const badgeColor = isTakeaway ? '#c2410c' : '#1d4ed8';
                    const typeLabel = isTakeaway ? '🛍️ АВААД ЯВАХ' : '🍽️ ЗААЛАНД';

                    // ХИЙХ БОЛОН БЭЛЭН БОЛСОН ХООЛУУДЫГ ЯЛГАХ
                    const pendingItems = order.order_items?.filter(item => !item.is_done) || [];
                    const doneItems = order.order_items?.filter(item => item.is_done) || [];

                    // Бүх хоол хийгдэж дууссан эсэх
                    const isAllDone = pendingItems.length === 0 && doneItems.length > 0;

                    return (
                      <div key={order.id} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: `6px solid ${cardBorder}` }}>
                        <div>
                          {/* Захиалгын толгой мэдээлэл */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
                            <div>
                              <strong style={{ fontSize: '1.6rem', color: '#1e293b' }}>
                                #{order.order_number || String(order.id).slice(-4).toUpperCase()}
                              </strong>
                              <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px', fontWeight: '600' }}>
                                🕒 {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <div style={{ backgroundColor: badgeBg, color: badgeColor, padding: '6px 10px', borderRadius: '6px', fontSize: '1rem', fontWeight: '800' }}>
                              {typeLabel}
                            </div>
                          </div>

                          {/* Тайлбар */}
                          {order.note && order.note.trim() !== '' && (
                            <div style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                              💬 {order.note}
                            </div>
                          )}

                          {/* 1. ХИЙГДЭЭГҮЙ (ХҮЛЭЭГДЭЖ БУЙ) ХООЛНУУД */}
                          <div style={{ minHeight: '60px', marginBottom: '15px' }}>
                            {pendingItems.map((item, idx) => (
                              <div 
                                key={`pending-${idx}`} 
                                onClick={() => toggleItemDone(order.id, item.menu_item_id, item.is_done)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '10px', border: '1px solid #cbd5e1', backgroundColor: 'white', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                              >
                                <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '1.1rem' }}>⬜ {item.menu_items?.name || 'Тодорхойгүй'}</span>
                                <strong style={{ color: '#dc2626', fontSize: '1.2rem', fontWeight: '900', backgroundColor: '#fef2f2', padding: '4px 10px', borderRadius: '6px' }}>{item.quantity} ш</strong>
                              </div>
                            ))}

                            {/* 2. БЭЛЭН БОЛСОН ХООЛНУУД (Доошоо шилжсэн) */}
                            {doneItems.length > 0 && (
                              <div style={{ marginTop: '15px', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>✅ Бэлэн болсон:</span>
                                {doneItems.map((item, idx) => (
                                  <div 
                                    key={`done-${idx}`} 
                                    onClick={() => toggleItemDone(order.id, item.menu_item_id, item.is_done)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', cursor: 'pointer' }}
                                  >
                                    <span style={{ color: '#64748b', fontWeight: '600', fontSize: '1rem', textDecoration: 'line-through' }}>{item.menu_items?.name || 'Тодорхойгүй'}</span>
                                    <strong style={{ color: '#64748b', fontSize: '1.1rem', textDecoration: 'line-through' }}>{item.quantity} ш</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* БҮХ ХООЛ БЭЛЭН ТОВЧ (Бүх хоолыг дарж дууссан үед ногоон болж гэрэлтэнэ) */}
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'completed')} 
                          style={{ 
                            width: '100%', padding: '14px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '900',
                            backgroundColor: isAllDone ? '#10b981' : '#e2e8f0',
                            color: isAllDone ? 'white' : '#64748b',
                            boxShadow: isAllDone ? '0 4px 15px rgba(16, 185, 129, 0.4)' : 'none',
                            transition: 'all 0.3s'
                          }}
                        >
                          {isAllDone ? '✔️ ЗАХИАЛГА БЭЛЭН (ЯВУУЛАХ)' : '✔️ ХООЛ БЭЛЭН'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* БЭЛЭН БОЛСОН ТАБ */}
          {activeTab === 'completed' && (
            <div>
              {completedOrders.length === 0 ? (
                <h3 style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>Бэлэн болсон хоол алга байна.</h3>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                  {completedOrders.map((order) => (
                    <div key={order.id} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: 0.85 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
                          <div><strong style={{ fontSize: '1.3rem', color: '#475569', textDecoration: 'line-through' }}>#{order.order_number || String(order.id).slice(-4).toUpperCase()}</strong></div>
                          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1rem' }}>✅ Бэлэн</div>
                        </div>
                        {order.note && order.note.trim() !== '' && (
                          <div style={{ color: '#b45309', fontWeight: 'bold', marginBottom: '10px', fontSize: '1rem' }}>💬 {order.note}</div>
                        )}
                        <div style={{ minHeight: '60px', marginBottom: '15px' }}>
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '1.1rem', color: '#64748b' }}>
                              <span style={{ fontWeight: '600' }}>{item.menu_items?.name || 'Тодорхойгүй'}</span>
                              <strong>{item.quantity} ш</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => { if (window.confirm("Буцаах уу?")) updateOrderStatus(order.id, 'cooking'); }}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '800' }}
                      >
                        ↩️ Буцаах
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