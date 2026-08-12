import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function MenuPage() {
  const [kioskState, setKioskState] = useState('welcome'); 
  
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Бүгд');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine-in'); 
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [successOrderNumber, setSuccessOrderNumber] = useState('');

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase.from('menu_items').select('*').eq('is_active', true).order('name');
      if (!error && data) {
        const availableItems = data.filter(item => item.stock === null || item.stock > 0);
        setMenuItems(availableItems);
      }
    } catch (err) {
      console.error("Цэс татахад алдаа:", err.message);
    }
  };

  const categories = ['Бүгд', ...new Set(menuItems.map(item => item.category || 'Бусад'))];
  const filteredMenu = activeCategory === 'Бүгд' ? menuItems : menuItems.filter(item => (item.category || 'Бусад') === activeCategory);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        if (item.stock !== null && existing.quantity + 1 > item.stock) {
          alert(`Уучлаарай, ${item.stock} ширхэг үлдсэн байна.`);
          return prev;
        }
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1, cartId: Date.now() + Math.random() }];
    });
  };

  const updateQuantity = (cartId, delta) => {
    setCart((prev) => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.quantity + delta;
        if (item.stock !== null && newQty > item.stock) return item;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const submitOrder = async (paymentMethod) => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          total_amount: totalPrice, 
          order_type: orderType, 
          status: 'cooking', 
          payment_method: paymentMethod 
        }])
        .select();

      if (orderError) throw orderError;
      const newOrder = orderData[0];
      const orderNum = newOrder.order_number || String(newOrder.id).slice(-4).toUpperCase();

      const orderItemsData = cart.map((item) => ({
        order_id: newOrder.id, 
        menu_item_id: item.id, 
        quantity: item.quantity, 
        price: item.price,
        item_type: orderType 
      }));

      await supabase.from('order_items').insert(orderItemsData);

      for (const item of cart) {
        if (item.stock !== null) {
          const newStock = Math.max(0, item.stock - item.quantity);
          const isActive = newStock > 0;
          await supabase.from('menu_items').update({ stock: newStock, is_active: isActive }).eq('id', item.id);
        }
      }

      setSuccessOrderNumber(orderNum);
      setKioskState('success');
      
      setTimeout(() => {
        resetKiosk();
      }, 5000);
      
    } catch (err) {
      alert("Захиалга илгээхэд алдаа гарлаа: " + err.message);
      setKioskState('menu'); 
    }
  };

  const resetKiosk = () => {
    setCart([]);
    setOrderType('dine-in');
    setSelectedPayment(null);
    setSuccessOrderNumber('');
    setKioskState('welcome');
    fetchMenu(); 
  };

  const simulatePayment = (method) => {
    setSelectedPayment(method);
    setKioskState('processing');
    setTimeout(() => {
      submitOrder(method);
    }, 3000);
  };


  // ==============================================
  // ДЭЛГЭЦҮҮД (UI)
  // ==============================================

  // Дэлгэц 1: ЭХЛЭХ ХУУДАС (Цэвэрхэн, гэрэлтсэн)
  if (kioskState === 'welcome') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif', color: '#0f172a', padding: '20px', textAlign: 'center' }}>
        
        <h2 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#c2410c', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '900' }}>
          Зогсоо хайрхан зоогийн газар
        </h2>
        <h1 style={{ fontSize: '4rem', marginBottom: '10px', color: '#1e293b' }}>Тавтай морилно уу</h1>
        <p style={{ fontSize: '1.5rem', color: '#64748b', marginBottom: '50px' }}>Та доорх сонголтуудаас сонгож захиалгаа эхлүүлнэ үү</p>
        
        <div style={{ display: 'flex', gap: '30px', width: '100%', maxWidth: '800px' }}>
          <button 
            onClick={() => { setOrderType('dine-in'); setKioskState('menu'); }}
            style={{ flex: 1, padding: '40px 20px', borderRadius: '24px', border: '4px solid #3b82f6', backgroundColor: 'white', color: '#1d4ed8', cursor: 'pointer', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.1s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} 
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '5rem', marginBottom: '15px' }}>🍽️</span>
            <span style={{ fontSize: '1.8rem', fontWeight: '900' }}>ЗААЛАНД ИДЭХ</span>
          </button>
          
          <button 
            onClick={() => { setOrderType('pickup'); setKioskState('menu'); }}
            style={{ flex: 1, padding: '40px 20px', borderRadius: '24px', border: '4px solid #ea580c', backgroundColor: 'white', color: '#c2410c', cursor: 'pointer', boxShadow: '0 10px 25px rgba(234, 88, 12, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.1s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} 
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '5rem', marginBottom: '15px' }}>🛍️</span>
            <span style={{ fontSize: '1.8rem', fontWeight: '900' }}>АВЧ ЯВАХ</span>
          </button>
        </div>
      </div>
    );
  }

  // Дэлгэц 2: ҮНДСЭН ЦЭС БОЛОН САГС
  if (kioskState === 'menu') {
    return (
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        
        {/* ЗҮҮН ТАЛ: ЦЭС */}
        <div style={{ flex: 7, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div style={{ backgroundColor: 'white', padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button onClick={resetKiosk} style={{ padding: '12px 24px', fontSize: '1.1rem', backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                ⬅️ Буцах
              </button>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: '900' }}>Зогсоо хайрхан</h2>
            </div>
            
            <div style={{ backgroundColor: orderType === 'dine-in' ? '#eff6ff' : '#fff7ed', color: orderType === 'dine-in' ? '#1d4ed8' : '#c2410c', padding: '10px 20px', borderRadius: '10px', fontSize: '1.2rem', fontWeight: '900' }}>
              {orderType === 'dine-in' ? '🍽️ ЗААЛАНД' : '🛍️ АВЧ ЯВАХ'}
            </div>
          </div>

          <div style={{ padding: '20px 30px', display: 'flex', gap: '15px', overflowX: 'auto', backgroundColor: '#f8fafc' }}>
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                style={{ padding: '12px 25px', fontSize: '1.1rem', borderRadius: '30px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: activeCategory === cat ? '#0f172a' : 'white', color: activeCategory === cat ? 'white' : '#475569', boxShadow: activeCategory === cat ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, padding: '10px 30px 30px 30px', overflowY: 'auto' }}>
            {/* ✨ ЗУРГИЙН ХЭМЖЭЭГ БАГАСГАЖ, КАРТЫГ АВЦААРХАН БОЛГОСОН */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {filteredMenu.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => addToCart(item)}
                  style={{ backgroundColor: 'white', borderRadius: '12px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '180px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', transition: 'transform 0.1s', transform: 'scale(1)' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'} 
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ height: '110px', backgroundColor: '#f1f5f9', width: '100%', position: 'relative' }}>
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', backgroundColor: 'white' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#1e293b', lineHeight: '1.2' }}>{item.name}</h3>
                    <div style={{ fontWeight: '900', color: '#3b82f6', fontSize: '1.2rem' }}>{item.price.toLocaleString()} ₮</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* БАРУУН ТАЛ: САГС */}
        <div style={{ flex: 3, backgroundColor: 'white', borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 20px rgba(0,0,0,0.05)', zIndex: 10 }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', textAlign: 'center', color: '#0f172a' }}>🛒 Миний сагс</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '50px', fontSize: '1.1rem' }}>Сагс хоосон байна<br/>Цэснээс хоолоо сонгоно уу</div>
            ) : (
              cart.map((item) => (
                <div key={item.cartId} style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem', paddingRight: '10px' }}>{item.name}</div>
                    <div style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 'bold' }}>{(item.price * item.quantity).toLocaleString()} ₮</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{item.price.toLocaleString()} ₮ / ш</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                      <button onClick={() => updateQuantity(item.cartId, -1)} style={{ width: '35px', height: '35px', border: 'none', backgroundColor: 'white', borderRadius: '6px', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                      <strong style={{ minWidth: '25px', textAlign: 'center', fontSize: '1.2rem' }}>{item.quantity}</strong>
                      <button onClick={() => updateQuantity(item.cartId, 1)} style={{ width: '35px', height: '35px', border: 'none', backgroundColor: 'white', borderRadius: '6px', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '20px', borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 'bold' }}>Нийт дүн:</span>
              <strong style={{ fontSize: '1.8rem', color: '#0f172a' }}>{totalPrice.toLocaleString()} ₮</strong>
            </div>
            <button 
              onClick={() => setKioskState('payment_method')}
              disabled={cart.length === 0}
              style={{ width: '100%', padding: '18px', backgroundColor: cart.length === 0 ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.4rem', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', boxShadow: cart.length === 0 ? 'none' : '0 10px 20px rgba(16, 185, 129, 0.3)' }}
            >
              ТӨЛБӨР ТӨЛӨХ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Дэлгэц 3: ТӨЛБӨРИЙН ХЭЛБЭР СОНГОХ
  if (kioskState === 'payment_method') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ padding: '30px', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setKioskState('menu')} style={{ padding: '12px 24px', fontSize: '1.1rem', backgroundColor: 'white', border: '2px solid #cbd5e1', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>⬅️ Буцах</button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', color: '#64748b', marginBottom: '10px' }}>Төлөх дүн</h2>
          <h1 style={{ fontSize: '4rem', color: '#0f172a', margin: '0 0 50px 0' }}>{totalPrice.toLocaleString()} ₮</h1>
          
          <div style={{ display: 'flex', gap: '30px', width: '100%', maxWidth: '700px', padding: '0 20px' }}>
            <button 
              onClick={() => simulatePayment('card')}
              style={{ flex: 1, padding: '40px 20px', backgroundColor: 'white', border: '3px solid #3b82f6', borderRadius: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.15)' }}
            >
              <div style={{ fontSize: '3.5rem' }}>💳</div>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>БАНКНЫ КАРТ</span>
            </button>

            <button 
              onClick={() => simulatePayment('qpay')}
              style={{ flex: 1, padding: '40px 20px', backgroundColor: 'white', border: '3px solid #f59e0b', borderRadius: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.15)' }}
            >
              <div style={{ fontSize: '3.5rem' }}>📱</div>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>QPAY УНШУУЛАХ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Дэлгэц 4: ТӨЛБӨР УНШУУЛАХ (Цайвар болгосон)
  if (kioskState === 'processing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif', color: '#0f172a', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '10px', color: '#64748b' }}>Төлөх дүн: <strong style={{ color: '#0f172a' }}>{totalPrice.toLocaleString()} ₮</strong></h2>
        
        {selectedPayment === 'qpay' ? (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', margin: '30px 0', border: '2px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=QPay_Total_${totalPrice}`} alt="QPay QR" style={{ width: '250px', height: '250px' }} />
          </div>
        ) : (
          <div style={{ fontSize: '6rem', margin: '40px 0', animation: 'pulse 1.5s infinite' }}>💳</div>
        )}

        <h1 style={{ fontSize: '2rem', color: '#3b82f6' }}>
          {selectedPayment === 'qpay' ? 'QR кодыг банкны апп-аараа уншуулна уу...' : 'ПОС машин дээр картаа уншуулна уу...'}
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginTop: '15px' }}>(Төлбөр төлөгдсөний дараа автоматаар цааш шилжинэ)</p>
      </div>
    );
  }

  // Дэлгэц 5: АМЖИЛТТАЙ БОЛСОН (Цайвар болгосон)
  if (kioskState === 'success') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif', color: '#0f172a', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '7rem', marginBottom: '10px' }}>✅</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: '#10b981' }}>Төлбөр амжилттай!</h1>
        
        <div style={{ backgroundColor: 'white', padding: '30px 50px', borderRadius: '20px', marginBottom: '30px', border: '2px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '1.2rem', margin: '0 0 10px 0', color: '#64748b' }}>Таны захиалгын дугаар:</p>
          <h2 style={{ fontSize: '4.5rem', margin: 0, fontWeight: '900', color: '#0f172a' }}>#{successOrderNumber}</h2>
        </div>
        
        <h2 style={{ fontSize: '1.8rem', color: '#334155' }}>Таны хоол гал тогоо руу илгээгдлээ. 👨‍🍳</h2>
        <p style={{ fontSize: '1.1rem', marginTop: '15px', color: '#94a3b8' }}>Баярлалаа! (Хэдэн секундын дараа автоматаар хаагдана)</p>
      </div>
    );
  }

  return null;
}

export default MenuPage;