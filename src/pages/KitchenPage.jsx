import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const BELL_URL = 'https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233524/success.mp3';
const TYPE_TEXT = { 'dine-in': 'Зааланд', pickup: 'Авч явах', tuva: 'Тува' };

function KitchenPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ==============================================
  // ДУУ: Web Audio. Хөтөч дууг зөвхөн дэлгэцэнд хүрсний дараа зөвшөөрдөг тул
  // аль ч товч, хаана ч хамаагүй анхны хүрэлтээр (нэвтрэх товч ч орно) автоматаар идэвхжинэ.
  // Нэг идэвхжсэний дараа захиалга ирэх бүрд дуугарна.
  // ==============================================
  const audioCtxRef = useRef(null);
  const bellBufferRef = useRef(null);
  const [soundReady, setSoundReady] = useState(false);

  const unlockAudio = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) {
        const ctx = new AC();
        audioCtxRef.current = ctx;
        ctx.onstatechange = () => setSoundReady(ctx.state === 'running');
        // Хуучин танил дууг ачаална; ачаалж чадахгүй бол доорх нөөц дуу тоглоно
        fetch(BELL_URL).then((r) => r.arrayBuffer())
          .then((data) => new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail)))
          .then((buf) => { bellBufferRef.current = buf; })
          .catch(() => {});
      }
      const ctx = audioCtxRef.current;
      // iOS: хүрэлтийн дотор чимээгүй дуу тоглуулж бүрэн нээнэ
      const silent = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silent; src.connect(ctx.destination); src.start(0);
      if (ctx.state !== 'running') ctx.resume().then(() => setSoundReady(ctx.state === 'running')).catch(() => {});
      else setSoundReady(true);
    } catch { /* хөтөч аудиог дэмжихгүй */ }
  };

  const playBellSound = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    try {
      if (bellBufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = bellBufferRef.current; src.connect(ctx.destination); src.start();
        return;
      }
      // Нөөц дуу: "дин-дон" хоёр удаа
      const now = ctx.currentTime;
      [[880, 0], [1318.5, 0.18], [880, 0.6], [1318.5, 0.78]].forEach(([freq, at]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + at);
        gain.gain.exponentialRampToValueAtTime(0.9, now + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + at); osc.stop(now + at + 0.55);
      });
    } catch (e) { console.error('Аудио алдаа:', e); }
  };

  useEffect(() => {
    // Дэлгэцийн аль ч хэсэгт хүрэхэд (мөн iPad унтаад сэрэхэд) дууг дахин идэвхжүүлнэ
    const events = ['pointerdown', 'touchend', 'keydown'];
    events.forEach((ev) => document.addEventListener(ev, unlockAudio, true));
    const onVisible = () => { if (document.visibilityState === 'visible') audioCtxRef.current?.resume().catch(() => {}); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, unlockAudio, true));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Нэвтрэх алдаа: И-мэйл эсвэл нууц үг буруу байна.");
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cooking');
  const knownIdsRef = useRef(null); // өмнө харсан захиалгууд: шинэ захиалга ирэхэд л дуугарна

  const fetchOrders = async () => {
    try {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const { data, error } = await supabase.from('orders').select(`*, order_items (id, quantity, is_done, item_type, menu_items (name))`).in('status', ['cooking', 'completed']).gte('created_at', startOfToday.toISOString()).order('created_at', { ascending: true });
      if (error) throw error;
      // Шинэ захиалга realtime-аар ч, 30 секундын шалгалтаар ч орж ирсэн бай: нэг удаа дуугарна
      if (knownIdsRef.current) {
        const fresh = data.filter((o) => o.status === 'cooking' && !knownIdsRef.current.has(o.id));
        if (fresh.length) playBellSound();
      }
      knownIdsRef.current = new Set(data.map((o) => o.id));
      setOrders(data);
    } catch (err) { console.error(err.message); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();

      // Касс захиалгыг эхлээд, хоолнуудыг нь дараа нь хадгалдаг. Захиалга орсон агшинд татвал
      // хоолгүй хоосон карт гарч болох тул хоол нэмэгдэх үед болон хэсэг хугацааны дараа дахин татна.
      let refetchTimer = null;
      const delayedTimers = [];
      const scheduleFetch = (delay = 300) => {
        clearTimeout(refetchTimer);
        refetchTimer = setTimeout(fetchOrders, delay);
      };

      const channel = supabase.channel('kitchen_orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
          delayedTimers.push(setTimeout(fetchOrders, 1500));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
          scheduleFetch();
        })
        .subscribe();

      // Сүлжээ тасрах, iPad унтах үед мэдэгдэл алдагдаж болох тул 30 секунд тутам шинэчилнэ.
      const pollTimer = setInterval(fetchOrders, 30000);

      return () => {
        supabase.removeChannel(channel);
        clearTimeout(refetchTimer);
        delayedTimers.forEach(clearTimeout);
        clearInterval(pollTimer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

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

  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const completedOrders = orders.filter(o => o.status === 'completed').sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: "'Onest', Arial, sans-serif", fontWeight: 500 }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center', width: '340px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d3264', marginBottom: '4px' }}>Зогсоо Хайрхан</div>
          <h2 style={{ margin: '0 0 20px', color: '#0f172a', fontSize: '1.1rem' }}>Гал тогоо нэвтрэх</h2>
          <input type="email" placeholder="И-мэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '15px', fontSize: '1.1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Нэвтрэх</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '15px', fontFamily: "'Onest', Arial, sans-serif", fontWeight: 500, backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Дуу хаалттай үед зөвхөн жижиг сануулга (товчгүй). Дэлгэцэнд хүрмэгц алга болно. */}
      {!soundReady && (
        <div role="status" style={{ backgroundColor: '#fffbeb', color: '#92400e', padding: '8px 14px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #fde68a', fontSize: '0.95rem', fontWeight: 600 }}>
          Захиалгын дуу асахын тулд дэлгэцийн аль ч хэсэгт нэг удаа хүрнэ үү.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.5rem', textAlign: 'left', border: 'none', padding: 0 }}>
          <span style={{ color: '#1d3264', fontWeight: 800 }}>Зогсоо Хайрхан</span>
          <span style={{ color: '#94a3b8', fontWeight: 400, margin: '0 10px' }}>|</span>Гал тогоо
        </h1>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('cooking')} style={{ padding: '10px 15px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'cooking' ? '#f59e0b' : '#e2e8f0', color: activeTab === 'cooking' ? 'white' : '#475569' }}>
            Хийгдэж байгаа ({cookingOrders.length})
          </button>
          <button onClick={() => setActiveTab('completed')} style={{ padding: '10px 15px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: activeTab === 'completed' ? '#10b981' : '#e2e8f0', color: activeTab === 'completed' ? 'white' : '#475569' }}>
            Бэлэн ({completedOrders.length})
          </button>

          <button onClick={handleLogout} style={{ padding: '10px 15px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white' }}>Гарах</button>
        </div>
      </div>

      {isLoading ? (
        <h2 style={{ textAlign: 'center', marginTop: '40px', color: '#475569', fontSize: '1.2rem' }}>Уншиж байна...</h2>
      ) : (
        <>
          {activeTab === 'cooking' && (
            <div>
              {cookingOrders.length === 0 ? (
                <h3 style={{ textAlign: 'center', color: '#475569', marginTop: '40px' }}>Хийх хоол байхгүй байна.</h3>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                  {cookingOrders.map((order) => {
                    let cardBg = '#eff6ff'; let cardBorder = '#3b82f6'; let badgeBg = '#3b82f6'; let typeLabel = 'ЗААЛАНД';
                    if (order.order_type === 'pickup') { cardBg = '#fff7ed'; cardBorder = '#ea580c'; badgeBg = '#ea580c'; typeLabel = 'АВААД ЯВАХ'; } 
                    else if (order.order_type === 'tuva') { cardBg = '#fdf4ff'; cardBorder = '#c026d3'; badgeBg = '#c026d3'; typeLabel = 'ТУВА'; } 
                    else if (order.order_type === 'mixed') { cardBg = '#f8fafc'; cardBorder = '#475569'; badgeBg = '#475569'; typeLabel = 'ХОЛИМОГ'; }

                    const pendingItems = order.order_items?.filter(item => !item.is_done) || [];
                    const doneItems = order.order_items?.filter(item => item.is_done) || [];
                    const isAllDone = pendingItems.length === 0 && doneItems.length > 0;

                    return (
                      <div key={order.id} style={{ backgroundColor: cardBg, padding: '16px', borderRadius: '12px', border: `2px solid ${cardBorder}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${cardBorder}50`, paddingBottom: '10px', marginBottom: '12px' }}>
                            <div>
                              <strong style={{ fontSize: '1.6rem', color: '#1e293b' }}>#{order.order_number || String(order.id).slice(-4).toUpperCase()}</strong>
                              <div style={{ color: '#475569', fontSize: '0.9rem', marginTop: '4px', fontWeight: '700' }}>{new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                            </div>
                            <div style={{ backgroundColor: badgeBg, color: 'white', padding: '6px 10px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '800' }}>{typeLabel}</div>
                          </div>

                          {order.note && order.note.trim() !== '' && (
                            <div style={{ backgroundColor: 'white', color: '#b45309', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '1.1rem', fontWeight: 'bold', border: '1px solid #fde68a' }}>Тайлбар: {order.note}</div>
                          )}

                          <div style={{ minHeight: '60px', marginBottom: '15px' }}>
                            {pendingItems.length === 0 && doneItems.length === 0 && (
                              <div style={{ color: '#475569', fontSize: '1rem', padding: '10px 0' }}>Хоолны жагсаалт ачаалж байна...</div>
                            )}
                            {pendingItems.map((item, idx) => {
                              // Холимог захиалгад аль хоол нь авч явах, Тува болохыг бичгээр харуулна
                              const itemTag = order.order_type === 'mixed' ? TYPE_TEXT[item.item_type] : '';
                              return (
                                <div key={item.id ?? `pending-${idx}`} onClick={() => toggleItemDone(item.id, item.is_done)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '10px 15px', border: `1px solid ${cardBorder}40`, backgroundColor: 'white', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                                  <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span aria-hidden="true" style={{ width: '20px', height: '20px', border: '2px solid #64748b', borderRadius: '4px', flexShrink: 0, backgroundColor: 'white' }} />
                                    {item.menu_items?.name || 'Тодорхойгүй'}
                                    {itemTag && <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', backgroundColor: item.item_type === 'pickup' ? '#ea580c' : (item.item_type === 'tuva' ? '#c026d3' : '#3b82f6'), padding: '2px 8px', borderRadius: '4px' }}>{itemTag}</span>}
                                  </span>
                                  <strong style={{ color: '#dc2626', fontSize: '1.3rem', fontWeight: '900', backgroundColor: '#fef2f2', padding: '4px 10px', borderRadius: '6px' }}>{item.quantity} ш</strong>
                                </div>
                              );
                            })}
                            {doneItems.length > 0 && (
                              <div style={{ marginTop: '15px', borderTop: `1px dashed ${cardBorder}`, paddingTop: '10px' }}>
                                <span style={{ fontSize: '0.85rem', color: cardBorder, fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Бэлэн болсон:</span>
                                {doneItems.map((item, idx) => (
                                  <div key={item.id ?? `done-${idx}`} onClick={() => toggleItemDone(item.id, item.is_done)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '8px 15px', backgroundColor: 'transparent', border: '1px dashed #cbd5e1', borderRadius: '10px', cursor: 'pointer', opacity: 0.85 }}>
                                    <span style={{ color: '#475569', fontWeight: '700', fontSize: '1.1rem', textDecoration: 'line-through', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span aria-hidden="true" style={{ width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, backgroundColor: '#10b981', color: 'white', fontSize: '0.85rem', lineHeight: '20px', textAlign: 'center', fontWeight: 900 }}>✓</span>
                                      {item.menu_items?.name || 'Тодорхойгүй'}
                                    </span>
                                    <strong style={{ color: '#475569', fontSize: '1.1rem', textDecoration: 'line-through' }}>{item.quantity} ш</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button onClick={() => updateOrderStatus(order.id, 'completed')} style={{ width: '100%', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '900', backgroundColor: isAllDone ? '#10b981' : 'rgba(0,0,0,0.05)', color: isAllDone ? 'white' : '#64748b', boxShadow: isAllDone ? '0 4px 15px rgba(16, 185, 129, 0.4)' : 'none', border: isAllDone ? 'none' : '1px solid #cbd5e1', transition: 'all 0.3s' }}>
                          {isAllDone ? 'ЗАХИАЛГА БЭЛЭН (ЯВУУЛАХ)' : 'ХООЛ БЭЛЭН'}
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
                <h3 style={{ textAlign: 'center', color: '#475569', marginTop: '40px' }}>Бэлэн болсон хоол алга байна.</h3>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                  {completedOrders.map((order) => (
                    <div key={order.id} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
                          <div><strong style={{ fontSize: '1.3rem', color: '#475569', textDecoration: 'line-through' }}>#{order.order_number || String(order.id).slice(-4).toUpperCase()}</strong></div>
                          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1rem' }}>Бэлэн</div>
                        </div>
                        {order.note && order.note.trim() !== '' && (
                          <div style={{ color: '#b45309', fontWeight: 'bold', marginBottom: '10px', fontSize: '1rem' }}>Тайлбар: {order.note}</div>
                        )}
                        <div style={{ minHeight: '60px', marginBottom: '15px' }}>
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '1.1rem', color: '#334155' }}>
                              <span style={{ fontWeight: '700', textDecoration: 'line-through' }}>{item.menu_items?.name || 'Тодорхойгүй'}</span>
                              <strong style={{ textDecoration: 'line-through' }}>{item.quantity} ш</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => { if (window.confirm("Буцаах уу?")) updateOrderStatus(order.id, 'cooking'); }} style={{ width: '100%', padding: '10px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '800' }}>
                        Буцаах
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