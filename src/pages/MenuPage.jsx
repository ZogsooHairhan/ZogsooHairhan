import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function MenuPage() {
  // ==============================================
  // KIOSK ТӨЛӨВҮҮД
  // ==============================================
  // 'welcome' -> 'menu' -> 'cart' (ШИНЭ) -> 'payment_method' -> 'processing' -> 'success'
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

  // Хэрвээ сагс руу орсон үедээ бүх хоолоо хасвал буцаад цэс рүү үсрэх
  useEffect(() => {
    if (kioskState === 'cart' && cart.length === 0) {
      setKioskState('menu');
    }
  }, [cart, kioskState]);

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

  const clearCart = () => {
    if(window.confirm('Сагсанд байгаа бүх хоолыг устгах уу?')) {
      setCart([]);
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
      setKioskState('cart'); 
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

  // Дэлгэц 1: ЭХЛЭХ ХУУДАС
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

  // Дэлгэц 2: ҮНДСЭН ЦЭС (Бүтэн дэлгэцээр харагдана, доороо хөвдөг сагстай)
  if (kioskState === 'menu') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', position: 'relative' }}>
        
        {/* Толгой хэсэг */}
        <div style={{ backgroundColor: 'white', padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
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

        {/* Ангилал */}
        <div style={{ padding: '20px 30px', display: 'flex', gap: '15px', overflowX: 'auto', backgroundColor: '#f8fafc', zIndex: 10 }}>
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              style={{ padding: '12px 25px', fontSize: '1.2rem', borderRadius: '30px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: activeCategory === cat ? '#0f172a' : 'white', color: activeCategory === cat ? 'white' : '#475569', boxShadow: activeCategory === cat ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Хоолны жагсаалт (Бүтэн дэлгэц) */}
        <div style={{ flex: 1, padding: '10px 30px', overflowY: 'auto', paddingBottom: cart.length > 0 ? '120px' : '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' }}>
            {filteredMenu.map(item => (
              <div 
                key={item.id} 
                onClick={() => addToCart(item)}
                style={{ backgroundColor: 'white', borderRadius: '16px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '200px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'transform 0.1s', transform: 'scale(1)' }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'} 
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ height: '140px', backgroundColor: '#f1f5f9', width: '100%', position: 'relative' }}>
                  <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                
                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', backgroundColor: 'white' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#1e293b', lineHeight: '1.3' }}>{item.name}</h3>
                  <div style={{ fontWeight: '900', color: '#3b82f6', fontSize: '1.3rem' }}>{item.price.toLocaleString()} ₮</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ✨ ШИНЭ: ДООР ХӨВДӨГ САГСНЫ МЭДЭЭЛЭЛ */}
        {cart.length > 0 && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#0f172a', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -10px 30px rgba(0,0,0,0.15)', zIndex: 100 }}>
            <div>
              <div style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '5px' }}>Сагсанд: <strong>{totalItems}</strong> хоол байна</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>{totalPrice.toLocaleString()} ₮</div>
            </div>
            <button 
              onClick={() => setKioskState('cart')}
              style={{ padding: '20px 50px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '16px', fontSize: '1.6rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'} 
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              ЗАХИАЛАХ ➡️
            </button>
          </div>
        )}
      </div>
    );
  }

  // ✨ ШИНЭ Дэлгэц: САГС БАТАЛГААЖУУЛАХ (Бүтэн дэлгэцээр)
  if (kioskState === 'cart') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc' }}>
        
        <div style={{ backgroundColor: 'white', padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setKioskState('menu')} style={{ padding: '12px 24px', fontSize: '1.2rem', backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            ⬅️ Цэс нэмэх
          </button>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900' }}>🛒 Миний сагс</h2>
          <button onClick={clearCart} style={{ padding: '12px 24px', fontSize: '1.2rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            Устгах
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px' }}>
            {cart.map((item) => (
              <div key={item.cartId} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '20px', borderRadius: '16px', marginBottom: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', marginRight: '20px', backgroundColor: '#f1f5f9' }}>
                  <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.6rem', marginBottom: '8px' }}>{item.name}</div>
                  <div style={{ color: '#64748b', fontSize: '1.2rem' }}>{item.price.toLocaleString()} ₮ / ш</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', marginBottom: '15px' }}>{(item.price * item.quantity).toLocaleString()} ₮</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '5px' }}>
                    <button onClick={() => updateQuantity(item.cartId, -1)} style={{ width: '50px', height: '50px', border: 'none', backgroundColor: 'white', borderRadius: '8px', fontSize: '2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>-</button>
                    <strong style={{ minWidth: '40px', textAlign: 'center', fontSize: '1.8rem' }}>{item.quantity}</strong>
                    <button onClick={() => updateQuantity(item.cartId, 1)} style={{ width: '50px', height: '50px', border: 'none', backgroundColor: 'white', borderRadius: '8px', fontSize: '2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '30px', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'center', boxShadow: '0 -10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '5px' }}>Нийт төлөх дүн:</div>
              <div style={{ fontSize: '3rem', color: '#0f172a', fontWeight: '900' }}>{totalPrice.toLocaleString()} ₮</div>
            </div>
            <button 
              onClick={() => setKioskState('payment_method')}
              style={{ padding: '25px 60px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '16px', fontSize: '1.8rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'} 
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              ТӨЛБӨР ТӨЛӨХ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Дэлгэц 4: ТӨЛБӨРИЙН ХЭЛБЭР СОНГОХ
  if (kioskState === 'payment_method') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ padding: '30px', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setKioskState('cart')} style={{ padding: '15px 30px', fontSize: '1.2rem', backgroundColor: 'white', border: '2px solid #cbd5e1', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>⬅️ Сагс руу буцах</button>
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

  // Дэлгэц 5: ТӨЛБӨР УНШУУЛАХ
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

  // Дэлгэц 6: АМЖИЛТТАЙ БОЛСОН
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