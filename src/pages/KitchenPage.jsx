import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

function KitchenPage() {
  // ==============================================
  // 🔒 AUTH & ТӨЛӨВҮҮД
  // ==============================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Дуу тоглуулах хувьсагч (Ref-ээр хадгалах нь илүү найдвартай)
  const audioRef = useRef(null);

  useEffect(() => {
    // Дууг урьдчилан бэлдэх (Эхлээд хоосон үүсгэж тавина)
    // Хэрвээ та өөрийн гэсэн ding.mp3-тэй бол '/ding.mp3' гэж солиорой.
    audioRef.current = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3');

    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    // 🔔 1. Дуу тоглуулах функц (Алдаа заахгүй байхаар catch хийсэн)
    const playNotificationSound = () => {
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.warn("Хөтөч дууг хаалаа (Autoplay Policy):", err);
        });
      }
    };

    // 🔄 2. Realtime захиалга хүлээн авах
    const channel = supabase
      .channel('realtime_kitchen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        
        // ✨ Хэрэв Админ "Төлбөр авсан" гэж дараад төлөв 'cooking' болсон бол дуугарна
        if (payload.eventType === 'UPDATE' && payload.new.status === 'cooking' && payload.old.status !== 'cooking') {
          playNotificationSound();
        }

        fetchOrders();
      })
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session) fetchOrders();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert("❌ Нэвтрэх алдаа гарлаа!");
    } else {
      // 💡 ГОЛ АРГА: Нэвтрэх товчийг дарах яг энэ үед хэрэглэгч click хийсэн байх тул 
      // дууг нэг удаа чимээгүйхэн дуугаргаж хөтчийн хамгаалалтыг нээнэ.
      if (audioRef.current) {
        audioRef.current.volume = 0; // Эхний удаад чимээгүй
        audioRef.current.play().catch(() => {}); // Алдаа гарвал тоохгүй
        
        // Дараагийн удаа дуугарахад хэвийн чанга дуугарахын тулд буцаагаад 100% болгоно
        setTimeout(() => {
          if(audioRef.current) audioRef.current.volume = 1;
        }, 500);
      }
    }
    
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ==============================================
  // 🍳 ГАЛ ТОГООНЫ ЛОГИК
  // ==============================================
  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (quantity, menu_items (name))`)
        .eq('status', 'cooking') // ЗӨВХӨН хийгдэж байгаа
        .order('created_at', { ascending: true }); 

      if (error) throw error;
      setOrders(data);
    } catch (err) {
      console.error("Алдаа:", err.message);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      fetchOrders(); 
    } catch (err) {
      alert("Алдаа гарлаа: " + err.message);
    }
  };

  // ==============================================
  // 🎨 ДЭЛГЭЦЭНД ХАРАГДАХ ХЭСЭГ (UI)
  // ==============================================
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', width: '320px' }}>
          <div style={{ fontSize: '50px', marginBottom: '15px' }}>👨‍🍳</div>
          <h2>Тогооч нэвтрэх</h2>
          <input type="email" placeholder="И-мэйл" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '15px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {isLoggingIn ? 'Уншиж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Толгой хэсэг */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #cbd5e1', paddingBottom: '15px', marginBottom: '25px' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: '2.5rem' }}>👨‍🍳 Гал тогооны дэлгэц</h1>
        
        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
           {/* Тогооч дууг гараар турших / зөвшөөрөл өгөх товч (Сонголттой) */}
           <button 
             onClick={() => { if(audioRef.current) audioRef.current.play() }} 
             style={{ padding: '12px', fontSize: '1.2rem', backgroundColor: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
             title="Дуу шалгах"
           >
             🔔
           </button>
           
           <button onClick={handleLogout} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
             🚪 Гарах
           </button>
        </div>
      </div>

      {/* Захиалгуудын жагсаалт */}
      {isLoadingOrders ? (
        <h2 style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>Захиалгуудыг шалгаж байна...</h2>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <span style={{ fontSize: '5rem' }}>🍽️</span>
          <h2 style={{ color: '#64748b', fontSize: '2rem' }}>Одоогоор хийх захиалга алга байна.</h2>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
          {orders.map((order) => (
            <div key={order.id} style={{ 
              backgroundColor: 'white', 
              padding: '25px', 
              borderRadius: '16px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)', 
              borderTop: '10px solid #f59e0b',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              
              {/* Картын толгой */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '15px' }}>
                  <div>
                    {/* ЭНД АЛДААГ ЗАССАН: String() нэмсэн */}
                    <h2 style={{ margin: 0, fontSize: '2.2rem', color: '#1e293b' }}>
                      #{order.order_number || String(order.id).slice(-4).toUpperCase()}
                    </h2>
                    <span style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 'bold' }}>
                      🕒 {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ backgroundColor: order.order_type === 'dine-in' ? '#eff6ff' : '#fff7ed', color: order.order_type === 'dine-in' ? '#1d4ed8' : '#c2410c', padding: '10px', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', height: 'fit-content' }}>
                    {order.order_type === 'dine-in' ? '🍽️ СУУЖ ИДЭХ' : '🛍️ АВААД ЯВАХ'}
                  </div>
                </div>

                {/* Захиалсан хоолнуудын жагсаалт */}
                <div style={{ minHeight: '120px', marginBottom: '20px' }}>
                  {order.order_items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '700' }}>
                        {item.menu_items?.name || 'Тодорхойгүй хоол'}
                      </span>
                      <strong style={{ fontSize: '1.8rem', color: '#dc2626', backgroundColor: '#fee2e2', padding: '4px 12px', borderRadius: '8px' }}>
                        {item.quantity} ш
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Үйлдэл хийх товч */}
              <button 
                onClick={() => updateOrderStatus(order.id, 'completed')} 
                style={{ 
                  width: '100%', padding: '20px', fontSize: '1.5rem', fontWeight: '800', 
                  backgroundColor: '#10b981', color: 'white', border: 'none', 
                  borderRadius: '12px', cursor: 'pointer', textTransform: 'uppercase',
                  boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)'
                }}
              >
                ✔️ Хоол бэлэн
              </button>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default KitchenPage;