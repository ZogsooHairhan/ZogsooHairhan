import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

function KitchenPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cooking'); 

  const enableSound = () => {
    audioRef.current.play().then(() => setIsSoundEnabled(true)).catch(err => alert("Дуу идэвхжүүлэх боломжгүй байна."));
  };

  const playBellSound = () => {
    if (!isSoundEnabled) return; 
    audioRef.current.currentTime = 0;
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) playPromise.catch(error => console.log(error));
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const channel = supabase.channel('kitchen_orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => { playBellSound(); fetchOrders(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => { fetchOrders(); })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [isAuthenticated, isSoundEnabled]);

  // Цэсний таб руу ороход цэсийг уншина
  useEffect(() => {
    if (activeTab === 'menu' && isAuthenticated) {
      fetchMenuItems();
    }
  }, [activeTab, isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const { data, error } = await supabase.from('orders').select(`*, order_items (id, quantity, is_done, item_type, menu_items (name))`).in('status', ['cooking', 'completed']).gte('created_at', startOfToday.toISOString()).order('created_at', { ascending: true });
      if (error) throw error;
      setOrders(data);
    } catch (err) { console.error(err.message); } finally { setIsLoading(false); }
  };

  // ✨ ШИНЭ: Цэс татах
  const fetchMenuItems = async () => {
    const { data, error } = await supabase.from('menu_items').select('*').order('name');
    if (!error) setMenuItems(data);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      fetchOrders(); 
    } catch (err) { alert("Алдаа гарлаа: " + err.message); }
  };

  const toggleItemDone = async (orderItemId, currentStatus) => {
    try {
      const { error } = await supabase.from('order_items').update({ is_done: !currentStatus }).eq('id', orderItemId);
      if (error) throw error;
      fetchOrders(); 
    } catch (err) { console.error(err.message); }
  };

  // ✨ ШИНЭ: Үлдэгдэл болон төлөв хадгалах
  const updateStock = async (id, newStockValue) => {
    try {
      const stock = newStockValue === '' ? null : parseInt(newStockValue);
      const isActive = stock === 0 ? false : true; 
      const { error } = await supabase.from('menu_items').update({ stock: stock, is_active: isActive }).eq('id', id);
      if (error) throw error;
      alert("Үлдэгдэл амжилттай хадгалагдлаа!");
      fetchMenuItems();
    } catch (err) { alert("Алдаа: " + err.message); }
  };

  const updateItemStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('menu_items').update({ is_active: newStatus }).eq('id', id);
      if (error) throw error;
      fetchMenuItems();
    } catch (err) { alert("Алдаа: " + err.message); }
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
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '15px', fontSize: '1.1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Нэвтрэх</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '15px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {!isSoundEnabled && (
        <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '10px 20px', borderRadius: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #fca5a5', flexWrap: 'wrap', gap: '10px' }}>
          <strong style={{ fontSize: '1rem' }}>⚠️ Захиалга дуугаргахын тулд идэвхжүүлнэ үү.</strong>
          <button onClick={enableSound} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🔔 Дууг идэвхжүүлэх</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.5rem' }}>👨‍🍳 Гал тогоо</h1>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('cooking')} style={{ padding: '10px 15px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'cooking' ? '#f59e0b' : '#e2e8f0', color: activeTab === 'cooking' ? 'white' : '#475569' }}>
            🔥 Хийгдэж байгаа ({cookingOrders.length})
          </button>
          <button onClick={() => setActiveTab('completed')} style={{ padding: '10px 15px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'completed' ? '#10b981' : '#e2e8f0', color: activeTab === 'completed' ? 'white' : '#475569' }}>
            ✅ Бэлэн ({completedOrders.length})
          </button>
          {/* ✨ ШИНЭ: Үлдэгдэл тохируулах ТАБ */}
          <button onClick={() => setActiveTab('menu')} style={{ padding: '10px 15px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'menu' ? '#8b5cf6' : '#e2e8f0', color: activeTab === 'menu' ? 'white' : '#475569' }}>
            📦 Үлдэгдэл
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
                    let cardBg = '#eff6ff'; let cardBorder = '#3b82f6'; let badgeBg = '#3b82f6'; let typeLabel = '🍽️ ЗААЛАНД';
                    if (order.order_type === 'pickup') { cardBg = '#fff7ed'; cardBorder = '#ea580c'; badgeBg = '#ea580c'; typeLabel = '🛍️ АВААД ЯВАХ'; } 
                    else if (order.order_type === 'tuva') { cardBg = '#fdf4ff'; cardBorder = '#c026d3'; badgeBg = '#c026d3'; typeLabel = '👤 ТУВА'; } 
                    else if (order.order_type === 'mixed') { cardBg = '#f8fafc'; cardBorder = '#475569'; badgeBg = '#475569'; typeLabel = '🔄 ХОЛИМОГ ЗАХИАЛГА'; }

                    const pendingItems = order.order_items?.filter(item => !item.is_done) || [];
                    const doneItems = order.order_items?.filter(item => item.is_done) || [];
                    const isAllDone = pendingItems.length === 0 && doneItems.length > 0;

                    return (
                      <div key={order.id} style={{ backgroundColor: cardBg, padding: '16px', borderRadius: '12px', border: `2px solid ${cardBorder}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${cardBorder}50`, paddingBottom: '10px', marginBottom: '12px' }}>
                            <div>
                              <strong style={{ fontSize: '1.6rem', color: '#1e293b' }}>#{order.order_number || String(order.id).slice(-4).toUpperCase()}</strong>
                              <div style={{ color: '#475569', fontSize: '0.9rem', marginTop: '4px', fontWeight: '700' }}>🕒 {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                            <div style={{ backgroundColor: badgeBg, color: 'white', padding: '6px 10px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '800' }}>{typeLabel}</div>
                          </div>

                          {order.note && order.note.trim() !== '' && (
                            <div style={{ backgroundColor: 'white', color: '#b45309', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '1.1rem', fontWeight: 'bold', border: '1px solid #fde68a' }}>💬 {order.note}</div>
                          )}

                          <div style={{ minHeight: '60px', marginBottom: '15px' }}>
                            {pendingItems.map((item, idx) => {
                              let itemIcon = '🍽️'; if (item.item_type === 'pickup') itemIcon = '🛍️'; if (item.item_type === 'tuva') itemIcon = '👤';
                              return (
                                <div key={`pending-${idx}`} onClick={() => toggleItemDone(item.id, item.is_done)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '10px 15px', border: `1px solid ${cardBorder}40`, backgroundColor: 'white', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                                  <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '1.2rem' }}>⬜ {itemIcon} {item.menu_items?.name || 'Тодорхойгүй'}</span>
                                  <strong style={{ color: '#dc2626', fontSize: '1.3rem', fontWeight: '900', backgroundColor: '#fef2f2', padding: '4px 10px', borderRadius: '6px' }}>{item.quantity} ш</strong>
                                </div>
                              );
                            })}
                            {doneItems.length > 0 && (
                              <div style={{ marginTop: '15px', borderTop: `1px dashed ${cardBorder}`, paddingTop: '10px' }}>
                                <span style={{ fontSize: '0.85rem', color: cardBorder, fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>✅ Бэлэн болсон:</span>
                                {doneItems.map((item, idx) => (
                                  <div key={`done-${idx}`} onClick={() => toggleItemDone(item.id, item.is_done)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '8px 15px', backgroundColor: 'transparent', border: '1px dashed #cbd5e1', borderRadius: '10px', cursor: 'pointer', opacity: 0.7 }}>
                                    <span style={{ color: '#475569', fontWeight: '700', fontSize: '1.1rem', textDecoration: 'line-through' }}>✅ {item.menu_items?.name || 'Тодорхойгүй'}</span>
                                    <strong style={{ color: '#475569', fontSize: '1.1rem', textDecoration: 'line-through' }}>{item.quantity} ш</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button onClick={() => updateOrderStatus(order.id, 'completed')} style={{ width: '100%', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '900', backgroundColor: isAllDone ? '#10b981' : 'rgba(0,0,0,0.05)', color: isAllDone ? 'white' : '#64748b', boxShadow: isAllDone ? '0 4px 15px rgba(16, 185, 129, 0.4)' : 'none', border: isAllDone ? 'none' : '1px solid #cbd5e1', transition: 'all 0.3s' }}>
                          {isAllDone ? '✔️ ЗАХИАЛГА БЭЛЭН (ЯВУУЛАХ)' : '✔️ ХООЛ БЭЛЭН'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
                              <span style={{ fontWeight: '600', textDecoration: 'line-through' }}>{item.menu_items?.name || 'Тодорхойгүй'}</span>
                              <strong style={{ textDecoration: 'line-through' }}>{item.quantity} ш</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => { if (window.confirm("Буцаах уу?")) updateOrderStatus(order.id, 'cooking'); }} style={{ width: '100%', padding: '10px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '800' }}>
                        ↩️ Буцаах
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ✨ ШИНЭ: ҮЛДЭГДЭЛ ХЯНАХ ТАБ */}
          {activeTab === 'menu' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {menuItems.map(item => (
                  <div key={item.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', opacity: item.is_active ? 1 : 0.6 }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '1.2rem', textDecoration: item.is_active ? 'none' : 'line-through' }}>{item.name}</h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {/* Тоо ширхэг оруулах хэсэг */}
                      <div>
                        <label style={{ fontSize: '0.9rem', color: '#64748b', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Үлдэгдэл (ш):</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="number" 
                            id={`stock-${item.id}`} 
                            defaultValue={item.stock === null ? '' : item.stock} 
                            placeholder="Хязгааргүй" 
                            style={{ width: '100px', padding: '10px', borderRadius: '8px', border: '2px solid #cbd5e1', fontSize: '1.1rem', textAlign: 'center', outline: 'none' }}
                          />
                          <button onClick={() => {
                            const val = document.getElementById(`stock-${item.id}`).value;
                            updateStock(item.id, val);
                          }} style={{ padding: '10px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Хадгалах
                          </button>
                        </div>
                      </div>
                      
                      {/* Дууссан / Байгаа товч */}
                      <button 
                        onClick={() => updateItemStatus(item.id, !item.is_active)}
                        style={{ padding: '12px 15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: item.is_active ? '#10b981' : '#ef4444', color: 'white', height: 'fit-content' }}
                      >
                        {item.is_active ? '✅ БАЙГАА' : '❌ ДУУССАН'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}

export default KitchenPage;