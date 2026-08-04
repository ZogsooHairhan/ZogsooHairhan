import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function CashierPage() {
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

  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Бүгд');
  
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine-in');
  
  // ✨ ШИНЭ: Үйлчлүүлэгчийн нэр / Тайлбар хадгалах
  const [orderNote, setOrderNote] = useState('');
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) fetchMenu();
  }, [isAuthenticated]);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase.from('menu_items').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      setMenuItems(data);
    } catch (err) {
      console.error("Цэс татахад алдаа:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = ['Бүгд', ...new Set(menuItems.map(item => item.category || 'Бусад'))];
  const filteredMenu = activeCategory === 'Бүгд' ? menuItems : menuItems.filter(item => (item.category || 'Бусад') === activeCategory);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const clearCart = () => {
    if(window.confirm('Сагсыг хоослох уу?')) {
      setCart([]);
      setOrderNote('');
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleProcessPayment = async (paymentMethod) => {
    if (cart.length === 0) return alert('Сагс хоосон байна!');
    
    setIsSubmitting(true);
    try {
      // ✨ ШИНЭ: note: orderNote гэдгийг бааз руу илгээнэ
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          total_amount: totalPrice, 
          order_type: orderType, 
          status: 'cooking', 
          payment_method: paymentMethod,
          note: orderNote 
        }])
        .select();

      if (orderError) throw orderError;
      const newOrder = orderData[0];

      const orderItemsData = cart.map((item) => ({
        order_id: newOrder.id, 
        menu_item_id: item.id, 
        quantity: item.quantity, 
        price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) throw itemsError;

      alert(`✅ Захиалга амжилттай баталгаажиж гал тогоо руу явлаа!`);
      
      setCart([]);
      setOrderNote(''); // Тайлбарыг цэвэрлэх
      setIsPaymentModalOpen(false);
      
    } catch (err) {
      alert("Алдаа гарлаа: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center', width: '340px' }}>
          <div style={{ fontSize: '50px', marginBottom: '15px' }}>💻</div>
          <h2 style={{ marginBottom: '10px', color: '#0f172a' }}>Касс нэвтрэх</h2>
          <input type="email" placeholder="И-мэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '15px', fontSize: '1.1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLoggingIn ? 'Шалгаж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ backgroundColor: 'white', padding: '15px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>💻 Кассын систем</h1>
          <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Гарах</button>
        </div>

        <div style={{ padding: '15px 25px', display: 'flex', gap: '10px', overflowX: 'auto', backgroundColor: '#f8fafc' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '10px 20px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: activeCategory === cat ? '#0f172a' : 'white', color: activeCategory === cat ? 'white' : '#475569', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              {cat}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: '0 25px 25px 25px', overflowY: 'auto' }}>
          {isLoading ? (
            <p style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>Цэсийг уншиж байна...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {filteredMenu.map(item => (
                <div key={item.id} onClick={() => addToCart(item)} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '15px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', transition: '0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                  <div style={{ height: '120px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#1e293b' }}>{item.name}</h3>
                    <div style={{ fontWeight: '800', color: '#3b82f6', fontSize: '1.1rem' }}>{item.price.toLocaleString()} ₮</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ width: '380px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 15px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>🛒 Захиалга</h2>
          {cart.length > 0 && <button onClick={clearCart} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>Хоослох</button>}
        </div>

        <div style={{ padding: '15px 20px', display: 'flex', gap: '10px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={() => setOrderType('dine-in')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: orderType === 'dine-in' ? '#3b82f6' : '#e2e8f0', color: orderType === 'dine-in' ? 'white' : '#64748b' }}>🍽️ Зааланд</button>
          <button onClick={() => setOrderType('pickup')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: orderType === 'pickup' ? '#c2410c' : '#e2e8f0', color: orderType === 'pickup' ? 'white' : '#64748b' }}>🛍️ Авч явах</button>
        </div>

        {/* ✨ ШИНЭ: Үйлчлүүлэгчийн нэр, тайлбар оруулах талбар */}
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <input 
            type="text" 
            placeholder="Үйлчлүүлэгчийн нэр эсвэл тайлбар..." 
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '1rem', outline: 'none' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '50px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🍽️</div>
              <p>Сагс хоосон байна</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #e2e8f0' }}>
                <div style={{ flex: 1, paddingRight: '10px' }}>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>{item.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{(item.price * item.quantity).toLocaleString()} ₮</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                  <button onClick={() => updateQuantity(item.id, -1)} style={{ width: '28px', height: '28px', border: 'none', backgroundColor: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                  <strong style={{ minWidth: '20px', textAlign: 'center' }}>{item.quantity}</strong>
                  <button onClick={() => updateQuantity(item.id, 1)} style={{ width: '28px', height: '28px', border: 'none', backgroundColor: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '20px', borderTop: '2px solid #e2e8f0', backgroundColor: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '1.1rem', color: '#64748b' }}>
            <span>Нийт дүн:</span>
            <strong style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900' }}>{totalPrice.toLocaleString()} ₮</strong>
          </div>
          <button onClick={() => setIsPaymentModalOpen(true)} disabled={cart.length === 0} style={{ width: '100%', padding: '16px', backgroundColor: cart.length === 0 ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}>
            💰 Төлбөр авах
          </button>
        </div>
      </div>

      {isPaymentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '380px' }}>
            <h2 style={{ textAlign: 'center', margin: '0 0 5px 0', color: '#0f172a' }}>Төлөх дүн: {totalPrice.toLocaleString()} ₮</h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '20px' }}>Төлбөрийн хэлбэрээ сонгоно уу</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button disabled={isSubmitting} onClick={() => handleProcessPayment('cash')} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>💵 Бэлэн мөнгө</button>
              <button disabled={isSubmitting} onClick={() => handleProcessPayment('card')} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>💳 Картаар</button>
              <button disabled={isSubmitting} onClick={() => handleProcessPayment('transfer')} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#8b5cf6', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>🏦 Дансаар</button>
              <button disabled={isSubmitting} onClick={() => handleProcessPayment('qpay')} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#f59e0b', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>📱 QPay</button>
              <button disabled={isSubmitting} onClick={() => setIsPaymentModalOpen(false)} style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#e2e8f0', color: '#475569', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Цуцлах</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierPage;