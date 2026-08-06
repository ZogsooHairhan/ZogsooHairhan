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
    if (error) alert("Нэвтрэх алдаа: И-мэйл эсвэл нууц үг буруу байна.");
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [activeTab, setActiveTab] = useState('menu');
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Бүгд');
  
  const [cart, setCart] = useState([]);
  const [orderNote, setOrderNote] = useState('');
  const [currentInputType, setCurrentInputType] = useState('dine-in'); 
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1); 
  const [selectedPayment, setSelectedPayment] = useState(null); 
  const [receivedCash, setReceivedCash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [historyOrders, setHistoryOrders] = useState([]);

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

  const fetchHistory = async () => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data, error } = await supabase.from('orders').select(`*, order_items (quantity, menu_items (name))`).gte('created_at', startOfToday.toISOString()).order('created_at', { ascending: false });
      if (error) throw error;
      setHistoryOrders(data);
    } catch (err) {
      console.error("Түүх татахад алдаа:", err.message);
    }
  };

  const categories = ['Бүгд', ...new Set(menuItems.map(item => item.category || 'Бусад'))];
  const filteredMenu = activeCategory === 'Бүгд' ? menuItems : menuItems.filter(item => (item.category || 'Бусад') === activeCategory);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find(c => c.id === item.id && c.itemType === currentInputType);
      if (existing) {
        return prev.map(c => (c.id === item.id && c.itemType === currentInputType) ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1, itemType: currentInputType, cartId: Date.now() + Math.random() }];
    });
  };

  const updateQuantity = (cartId, delta) => {
    setCart((prev) => prev.map(item => {
      if (item.cartId === cartId) {
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
  const changeAmount = Number(receivedCash) - totalPrice;

  const handleProcessPayment = async (paymentMethod) => {
    if (paymentMethod === 'cash' && receivedCash !== '' && Number(receivedCash) < totalPrice) {
      return alert('Өгсөн мөнгө хүрэхгүй байна!');
    }
    
    setIsSubmitting(true);
    try {
      const uniqueTypes = [...new Set(cart.map(item => item.itemType))];
      const mainOrderType = uniqueTypes.length === 1 ? uniqueTypes[0] : 'mixed'; 

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          total_amount: totalPrice, 
          order_type: mainOrderType, 
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
        price: item.price,
        item_type: item.itemType
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) throw itemsError;

      alert(`Захиалга баталгаажлаа!\nДугаар: #${newOrder.order_number || String(newOrder.id).slice(-4).toUpperCase()}`);
      
      setCart([]);
      setOrderNote('');
      setReceivedCash('');
      setSelectedPayment(null);
      setPaymentStep(1); 
      setIsPaymentModalOpen(false);
      
    } catch (err) {
      alert("Алдаа гарлаа: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✨ ШИНЭ: Дэлгэцэн дээрх тооны машин (iPad keyboard гаргахгүй)
  const handleKeypad = (value) => {
    if (value === 'C') {
      setReceivedCash('');
    } else if (value === 'DEL') {
      setReceivedCash(prev => String(prev).slice(0, -1));
    } else if (value === 'EXACT') {
      setReceivedCash(String(totalPrice));
    } else if (value === '20000' || value === '50000') {
      setReceivedCash(value);
    } else {
      setReceivedCash(prev => {
        const current = String(prev);
        if (current === '0' && value !== '0' && value !== '000') return value;
        return current + value;
      });
    }
  };

  const numpadBtnStyle = {
    padding: '18px 5px', 
    fontSize: '1.5rem', 
    fontWeight: 'bold', 
    borderRadius: '8px', 
    border: '1px solid #cbd5e1', 
    backgroundColor: 'white', 
    color: '#0f172a',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  };

  const getTypeLabel = (type) => {
    if(type === 'pickup') return '🛍️ Авч явах';
    if(type === 'tuva') return '👤 Тува';
    return '🍽️ Зааланд';
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'Arial, sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center', width: '340px' }}>
          <h2 style={{ marginBottom: '10px', color: '#0f172a' }}>Касс нэвтрэх</h2>
          <input type="email" placeholder="И-мэйл" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '12px', fontSize: '1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#0f172a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLoggingIn ? 'Шалгаж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 'bold' }}>ПОС Систем</h1>
            <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Гарах</button>
          </div>
          <div style={{ display: 'flex', gap: '5px', padding: '0 25px' }}>
            <button onClick={() => setActiveTab('menu')} style={{ padding: '12px 20px', border: 'none', backgroundColor: activeTab === 'menu' ? '#e2e8f0' : 'transparent', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', borderBottom: activeTab === 'menu' ? '2px solid #0f172a' : 'none' }}>Шинэ захиалга</button>
            <button onClick={() => { setActiveTab('history'); fetchHistory(); }} style={{ padding: '12px 20px', border: 'none', backgroundColor: activeTab === 'history' ? '#e2e8f0' : 'transparent', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', borderBottom: activeTab === 'history' ? '2px solid #0f172a' : 'none' }}>Өнөөдрийн гүйлгээ</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'menu' && (
            <>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px' }}>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: activeCategory === cat ? '#0f172a' : 'white', color: activeCategory === cat ? 'white' : '#475569' }}>
                    {cat}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>Цэсийг уншиж байна...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {filteredMenu.map(item => (
                    <div key={item.id} onClick={() => addToCart(item)} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '15px', cursor: 'pointer', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '80px', transition: '0.1s' }} onMouseDown={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseUp={e => e.currentTarget.style.backgroundColor = 'white'}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#1e293b' }}>{item.name}</h3>
                      <div style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '1.1rem' }}>{item.price.toLocaleString()} ₮</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Цаг</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Дугаар</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Төрөл</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Дүн</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Төлөв</th>
                  </tr>
                </thead>
                <tbody>
                  {historyOrders.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Өнөөдөр гүйлгээ хийгдээгүй байна.</td></tr>
                  ) : (
                    historyOrders.map(order => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', color: '#334155' }}>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>#{order.order_number || String(order.id).slice(-4).toUpperCase()}</td>
                        <td style={{ padding: '12px', color: '#64748b', fontWeight: 'bold' }}>
                          {order.order_type === 'pickup' ? '🛍️ Авч явах' : (order.order_type === 'tuva' ? '👤 Тува' : (order.order_type === 'mixed' ? '🔄 Холимог' : '🍽️ Зааланд'))}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{order.total_amount?.toLocaleString()} ₮</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: order.status === 'completed' ? '#dcfce7' : (order.status === 'cancelled' ? '#fee2e2' : '#fef3c7'), color: order.status === 'completed' ? '#16a34a' : (order.status === 'cancelled' ? '#dc2626' : '#d97706') }}>
                            {order.status === 'completed' ? 'Бэлэн болсон' : (order.status === 'cancelled' ? 'Цуцлагдсан' : 'Хийгдэж буй')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'menu' && (
        <div style={{ width: '380px', backgroundColor: 'white', borderLeft: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Одоогийн захиалга</h2>
            {cart.length > 0 && <button onClick={clearCart} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}>Устгах</button>}
          </div>

          <div style={{ padding: '10px 20px', display: 'flex', gap: '5px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <button onClick={() => setCurrentInputType('dine-in')} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: currentInputType === 'dine-in' ? '#3b82f6' : 'white', color: currentInputType === 'dine-in' ? 'white' : '#475569' }}>Зааланд</button>
            <button onClick={() => setCurrentInputType('pickup')} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: currentInputType === 'pickup' ? '#ea580c' : 'white', color: currentInputType === 'pickup' ? 'white' : '#475569' }}>Авч явах</button>
            <button onClick={() => setCurrentInputType('tuva')} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: currentInputType === 'tuva' ? '#c026d3' : 'white', color: currentInputType === 'tuva' ? 'white' : '#475569' }}>Тува</button>
          </div>

          <div style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <input type="text" placeholder="Тайлбар (Жишээ: Сонгиногүй...)" value={orderNote} onChange={(e) => setOrderNote(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '15px 20px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '50px' }}>Хоол сонгоогүй байна</div>
            ) : (
              cart.map((item) => (
                <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ flex: 1, paddingRight: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                      {item.name} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', display: 'block' }}>{getTypeLabel(item.itemType)}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>{(item.price * item.quantity).toLocaleString()} ₮</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px' }}>
                    <button onClick={() => updateQuantity(item.cartId, -1)} style={{ width: '30px', height: '30px', border: 'none', backgroundColor: '#f1f5f9', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                    <strong style={{ minWidth: '20px', textAlign: 'center' }}>{item.quantity}</strong>
                    <button onClick={() => updateQuantity(item.cartId, 1)} style={{ width: '30px', height: '30px', border: 'none', backgroundColor: '#f1f5f9', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '20px', borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ color: '#64748b', fontWeight: 'bold' }}>Нийт дүн:</span>
              <strong style={{ fontSize: '1.6rem', color: '#0f172a' }}>{totalPrice.toLocaleString()} ₮</strong>
            </div>
            <button 
              onClick={() => { setPaymentStep(1); setIsPaymentModalOpen(true); }}
              disabled={cart.length === 0}
              style={{ width: '100%', padding: '16px', backgroundColor: cart.length === 0 ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              Тооцоо хийх
            </button>
          </div>
        </div>
      )}

      {/* 💳 ТӨЛБӨРИЙН МОДАЛ */}
      {isPaymentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '2rem' }}>{totalPrice.toLocaleString()} ₮</h2>
            </div>

            {paymentStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: '0 0 10px 0', color: '#64748b', textAlign: 'center', fontWeight: 'bold' }}>Төлбөрийн хэлбэрээ сонгоно уу</p>
                <button onClick={() => setPaymentStep(2)} style={{ padding: '15px', borderRadius: '8px', border: '2px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>💵 Бэлэн мөнгө</button>
                <button onClick={() => handleProcessPayment('card')} style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>💳 Картаар</button>
                <button onClick={() => handleProcessPayment('qpay')} style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#f59e0b', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>📱 QPay / Дансаар</button>
                <button onClick={() => setIsPaymentModalOpen(false)} style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#ef4444', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Цуцлах</button>
              </div>
            )}

            {paymentStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Мөнгө харуулах дэлгэц (iPad keyboard гаргахгүйн тулд DIV ашиглав) */}
                <div>
                  <label style={{ display: 'block', color: '#475569', marginBottom: '8px', fontWeight: 'bold' }}>Өгсөн мөнгө (₮):</label>
                  <div style={{ width: '100%', padding: '15px', fontSize: '2rem', borderRadius: '8px', border: '2px solid #3b82f6', backgroundColor: '#f8fafc', textAlign: 'right', fontWeight: '900', minHeight: '65px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxSizing: 'border-box' }}>
                    {receivedCash ? Number(receivedCash).toLocaleString() : '0'}
                  </div>
                </div>

                {/* ✨ ШИНЭ: ДЭЛГЭЦЭН ДЭЭРХ ТООНЫ МАШИН (Numpad) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <button onClick={() => handleKeypad('1')} style={numpadBtnStyle}>1</button>
                  <button onClick={() => handleKeypad('2')} style={numpadBtnStyle}>2</button>
                  <button onClick={() => handleKeypad('3')} style={numpadBtnStyle}>3</button>
                  <button onClick={() => handleKeypad('DEL')} style={{...numpadBtnStyle, backgroundColor: '#e2e8f0', color: '#475569'}}>⌫</button>
                  
                  <button onClick={() => handleKeypad('4')} style={numpadBtnStyle}>4</button>
                  <button onClick={() => handleKeypad('5')} style={numpadBtnStyle}>5</button>
                  <button onClick={() => handleKeypad('6')} style={numpadBtnStyle}>6</button>
                  <button onClick={() => handleKeypad('20000')} style={{...numpadBtnStyle, backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '1rem'}}>20,000</button>
                  
                  <button onClick={() => handleKeypad('7')} style={numpadBtnStyle}>7</button>
                  <button onClick={() => handleKeypad('8')} style={numpadBtnStyle}>8</button>
                  <button onClick={() => handleKeypad('9')} style={numpadBtnStyle}>9</button>
                  <button onClick={() => handleKeypad('50000')} style={{...numpadBtnStyle, backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '1rem'}}>50,000</button>
                  
                  <button onClick={() => handleKeypad('C')} style={{...numpadBtnStyle, backgroundColor: '#fee2e2', color: '#ef4444'}}>C</button>
                  <button onClick={() => handleKeypad('0')} style={numpadBtnStyle}>0</button>
                  <button onClick={() => handleKeypad('000')} style={numpadBtnStyle}>000</button>
                  <button onClick={() => handleKeypad('EXACT')} style={{...numpadBtnStyle, backgroundColor: '#dcfce7', color: '#166534', fontSize: '1rem'}}>Таарсан</button>
                </div>

                <div style={{ backgroundColor: changeAmount >= 0 ? '#dcfce7' : '#fee2e2', padding: '15px', borderRadius: '8px', border: `1px solid ${changeAmount >= 0 ? '#bbf7d0' : '#fecaca'}`, marginTop: '5px' }}>
                  <div style={{ color: changeAmount >= 0 ? '#166534' : '#991b1b', fontSize: '1rem', fontWeight: 'bold' }}>Хариулах дүн:</div>
                  <div style={{ color: changeAmount >= 0 ? '#15803d' : '#b91c1c', fontSize: '2.2rem', fontWeight: '900', textAlign: 'right' }}>
                    {receivedCash === '' ? '0' : changeAmount.toLocaleString()} ₮
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setPaymentStep(1)} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>Буцах</button>
                  <button onClick={() => handleProcessPayment('cash')} disabled={isSubmitting || (receivedCash !== '' && changeAmount < 0)} style={{ flex: 2, padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }}>
                    {isSubmitting ? 'Уншиж байна...' : 'Баталгаажуулах'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierPage;