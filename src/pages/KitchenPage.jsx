import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function KitchenPage() {
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

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cooking'); 

  // 🔔 Хонх дуугаргах функц
  const playBellSound = () => {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/ding_dong.ogg');
    audio.play().catch(err => console.log("Аудио тоглуулахад алдаа:", err));
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      
      const channel = supabase
        .channel('kitchen_orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
          playBellSound(); 
          fetchOrders(); 
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
          fetchOrders(); 
        })
        .subscribe();
        
      return () => supabase.removeChannel(channel);
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (quantity, menu_items (name))`)
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

  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const completedOrders = orders.filter(o => o.status === 'completed').sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  // ✨ ШИНЭ: Хийгдэж байгаа нийт хоолнуудыг нэгтгэж тоолох функц
  const pendingItemsSummary = {};
  cookingOrders.forEach(order => {
    order.order_items?.forEach(item => {
      const itemName = item.menu_items?.name || 'Тодорхойгүй';
      if (!pendingItemsSummary[itemName]) {
        pendingItemsSummary[itemName] = 0;
      }
      pendingItemsSummary[itemName] += item.quantity;
    });
  });
  // Тоо ширхэгээр нь ихээс нь бага руу эрэмбэлэх
  const summaryEntries = Object.entries(pendingItemsSummary).sort((a, b) => b[1] - a[1]);

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
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)' }}>👨‍🍳 Гал тогоо</h1>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('cooking')} style={{ padding: '12px 20px', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'cooking' ? '#f59e0b' : '#e2e8f0', color: activeTab === 'cooking' ? 'white' : '#475569' }}>
            🔥 Хийгдэж байгаа ({cookingOrders.length})
          </button>
          <button onClick={() => setActiveTab('completed')} style={{ padding: '12px 20px', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'completed' ? '#10b981' : '#e2e8f0', color: activeTab === 'completed' ? 'white' : '#475569' }}>
            ✅ Бэлэн болсон ({completedOrders.length})
          </button>
          <button onClick={handleLogout} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white' }}>🚪 Гарах</button>
        </div>
      </div>

      {isLoading ? (
        <h2 style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>Захиалгуудыг уншиж байна...</h2>
      ) : (
        <>
          {activeTab === 'cooking' && (
            <div>
              {/* ✨ ШИНЭ: НИЙТ ХИЙГДЭЖ БАЙГАА ХООЛНЫ НЭГТГЭЛ САМБАР */}
              {summaryEntries.length > 0 && (
                <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    📊 Нийт бэлтгэх хоолны нэгтгэл
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    {summaryEntries.map(([name, qty], idx) => (
                      <div key={idx} style={{ backgroundColor: '#1e293b', padding: '12px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #334155' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'white' }}>{name}</span>
                        <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '1.4rem', fontWeight: '900' }}>
                          {qty} ш
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cookingOrders.length === 0 ? (
                <h3 style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>Одоогоор хийх хоол байхгүй байна. 🎉</h3>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(320px, 28vw, 500px), 1fr))', gap: '25px' }}>
                  {cookingOrders.map((order) => (
                    <div key={order.id} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 6px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '8px solid #f59e0b' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>
                          <div>
                            <strong style={{ fontSize: '2.5rem', color: '#1e293b' }}>
                              #{order.order_number || String(order.id).slice(-4).toUpperCase()}
                            </strong>
                            <div style={{ color: '#64748b', fontSize: '1.2rem', marginTop: '6px', fontWeight: '600' }}>
                              🕒 {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div style={{ backgroundColor: order.order_type === 'dine-in' ? '#eff6ff' : '#fff7ed', color: order.order_type === 'dine-in' ? '#1d4ed8' : '#c2410c', padding: '10px 15px', borderRadius: '8px', fontSize: '1.2rem', fontWeight: '900' }}>
                            {order.order_type === 'dine-in' ? '🍽️ ЗААЛАНД' : '🛍️ АВААД ЯВАХ'}
                          </div>
                        </div>

                        {order.note && order.note.trim() !== '' && (
                          <div style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '1.4rem', fontWeight: '900', border: '2px solid #fde68a' }}>
                            💬 {order.note}
                          </div>
                        )}

                        <div style={{ minHeight: '100px', marginBottom: '20px' }}>
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '1.6rem', paddingBottom: '10px', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ color: '#0f172a', fontWeight: '800', flex: 1, paddingRight: '10px' }}>{item.menu_items?.name || 'Тодорхойгүй'}</span>
                              <strong style={{ color: '#dc2626', fontSize: '2rem', fontWeight: '900', backgroundColor: '#fef2f2', padding: '4px 15px', borderRadius: '8px' }}>{item.quantity} ш</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => updateOrderStatus(order.id, 'completed')} 
                        style={{ width: '100%', padding: '20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1.5rem', fontWeight: '900', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
                      >
                        ✔️ ХООЛ БЭЛЭН
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                            <strong style={{ fontSize: '1.8rem', color: '#475569', textDecoration: 'line-through' }}>
                              #{order.order_number || String(order.id).slice(-4).toUpperCase()}
                            </strong>
                          </div>
                          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>✅ Бэлэн болсон</div>
                        </div>

                        {order.note && order.note.trim() !== '' && (
                          <div style={{ color: '#b45309', fontWeight: 'bold', marginBottom: '15px', fontSize: '1.2rem' }}>
                            💬 {order.note}
                          </div>
                        )}

                        <div style={{ minHeight: '80px', marginBottom: '20px' }}>
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '1.4rem', color: '#64748b' }}>
                              <span style={{ fontWeight: '600' }}>{item.menu_items?.name || 'Тодорхойгүй'}</span>
                              <strong>{item.quantity} ш</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (window.confirm("Энэ захиалгыг буцаагаад 'Хийгдэж байгаа' руу шилжүүлэх үү?")) {
                            updateOrderStatus(order.id, 'cooking');
                          }
                        }}
                        style={{ width: '100%', padding: '15px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '800' }}
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