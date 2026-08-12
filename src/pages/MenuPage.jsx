import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function MenuPage() {
  // ==============================================
  // KIOSK ТӨЛӨВҮҮД (Нэвтрэх шаардлагагүй!)
  // ==============================================
  // 'welcome' -> 'menu' -> 'payment_method' -> 'processing' -> 'success'
  const [kioskState, setKioskState] = useState('welcome'); 
  
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Бүгд');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine-in'); 
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [successOrderNumber, setSuccessOrderNumber] = useState('');

  // 1. Цэсийг мэдээллийн сангаас татах
  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase.from('menu_items').select('*').eq('is_active', true).order('name');
      if (!error && data) {
        // Үлдэгдэл нь 0 биш хоолнуудыг л харуулна
        const availableItems = data.filter(item => item.stock === null || item.stock > 0);
        setMenuItems(availableItems);
      }
    } catch (err) {
      console.error("Цэс татахад алдаа:", err.message);
    }
  };

  const categories = ['Бүгд', ...new Set(menuItems.map(item => item.category || 'Бусад'))];
  const filteredMenu = activeCategory === 'Бүгд' ? menuItems : menuItems.filter(item => (item.category || 'Бусад') === activeCategory);

  // 2. Сагсны үйлдэл
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

  // 3. Захиалга илгээх функц (Төлбөр амжилттай болсны дараа)
  const submitOrder = async (paymentMethod) => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          total_amount: totalPrice, 
          order_type: orderType, 
          status: 'cooking', // Шууд гал тогоо руу орно
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
        item_type: orderType // Бүх хоол ижил төрөлтэй байна
      }));

      await supabase.from('order_items').insert(orderItemsData);

      // Үлдэгдлээс хасах
      for (const item of cart) {
        if (item.stock !== null) {
          const newStock = Math.max(0, item.stock - item.quantity);
          const isActive = newStock > 0;
          await supabase.from('menu_items').update({ stock: newStock, is_active: isActive }).eq('id', item.id);
        }
      }

      setSuccessOrderNumber(orderNum);
      setKioskState('success');
      
      // 5 секундын дараа автоматаар эхний хуудас руу шилжинэ
      setTimeout(() => {
        resetKiosk();
      }, 5000);
      
    } catch (err) {
      alert("Захиалга илгээхэд алдаа гарлаа: " + err.message);
      setKioskState('menu'); // Алдаа гарвал буцаад сагс руу шилжинэ
    }
  };

  const resetKiosk = () => {
    setCart([]);
    setOrderType('dine-in');
    setSelectedPayment(null);
    setSuccessOrderNumber('');
    setKioskState('welcome');
    fetchMenu(); // Цэсийг шинэчлэх (үлдэгдэл шалгах)
  };

  // 4. Төлбөр хийх үйл явцыг симуляци хийх
  const simulatePayment = (method) => {
    setSelectedPayment(method);
    setKioskState('processing');
    
    // Банкны API холбогдоогүй байгаа тул 3 секунд хүлээгээд амжилттай болгож байна
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', fontFamily: 'Arial, sans-serif', color: 'white', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '6rem', marginBottom: '20px' }}>🍔</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>Тавтай морилно уу</h1>
        <p style={{ fontSize: '1.5rem', color: '#94a3b8', marginBottom: '50px' }}>Та доорх сонголтуудаас сонгож захиалгаа эхлүүлнэ үү</p>
        
        <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '600px' }}>
          <button 
            onClick={() => { setOrderType('dine-in'); setKioskState('menu'); }}
            style={{ flex: 1, padding: '40px 20px', fontSize: '1.8rem', fontWeight: 'bold', borderRadius: '20px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}
          >
            <span style={{ fontSize: '3rem' }}>🍽️</span> ЗААЛАНД ИДЭХ
          </button>
          <button 
            onClick={() => { setOrderType('pickup'); setKioskState('menu'); }}
            style={{ flex: 1, padding: '40px 20px', fontSize: '1.8rem', fontWeight: 'bold', borderRadius: '20px', border: 'none', backgroundColor: '#ea580c', color: 'white', cursor: 'pointer', boxShadow: '0 10px 25px rgba(234, 88, 12, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}
          >
            <span style={{ fontSize: '3rem' }}>🛍️</span> АВЧ ЯВАХ
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
          {/* Толгойн хэсэг */}
          <div style={{ backgroundColor: 'white', padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={resetKiosk} style={{ padding: '12px 24px', fontSize: '1.1rem', backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              ⬅️ Буцах
            </button>
            <div style={{ backgroundColor: orderType === 'dine-in' ? '#eff6ff' : '#fff7ed', color: orderType === 'dine-in' ? '#1d4ed8' : '#c2410c', padding: '10px 20px', borderRadius: '10px', fontSize: '1.2rem', fontWeight: '900' }}>
              {orderType === 'dine-in' ? '🍽️ ЗААЛАНД' : '🛍️ АВЧ ЯВАХ'}
            </div>
          </div>

          {/* Ангилал */}
          <div style={{ padding: '20px 30px', display: 'flex', gap: '15px', overflowX: 'auto', backgroundColor: '#f8fafc' }}>
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                style={{ padding: '15px 30px', fontSize: '1.2rem', borderRadius: '30px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: activeCategory === cat ? '#0f172a' : 'white', color: activeCategory === cat ? 'white' : '#475569', boxShadow: activeCategory === cat ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Хоолны жагсаалт */}
          <div style={{ flex: 1, padding: '10px 30px 30px 30px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {filteredMenu.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => addToCart(item)}
                  style={{ backgroundColor: 'white', borderRadius: '16px', padding: '25px 15px', cursor: 'pointer', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '120px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}
                >
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', color: '#1e293b' }}>{item.name}</h3>
                  <div style={{ fontWeight: '900', color: '#3b82f6', fontSize: '1.4rem' }}>{item.price.toLocaleString()} ₮</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* БАРУУН ТАЛ: САГС */}
        <div style={{ flex: 3, backgroundColor: 'white', borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 20px rgba(0,0,0,0.05)', zIndex: 10 }}>
          <div style={{ padding: '25px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#0f172a', color: 'white' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', textAlign: 'center' }}>🛒 Миний сагс</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '50px', fontSize: '1.2rem' }}>Сагс хоосон байна<br/>Цэснээс хоолоо сонгоно уу</div>
            ) : (
              cart.map((item) => (
                <div key={item.cartId} style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.2rem', paddingRight: '10px' }}>{item.name}</div>
                    <div style={{ color: '#0f172a', fontSize: '1.2rem', fontWeight: 'bold' }}>{(item.price * item.quantity).toLocaleString()} ₮</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>{item.price.toLocaleString()} ₮ / ш</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '5px' }}>
                      <button onClick={() => updateQuantity(item.cartId, -1)} style={{ width: '40px', height: '40px', border: 'none', backgroundColor: 'white', borderRadius: '6px', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                      <strong style={{ minWidth: '25px', textAlign: 'center', fontSize: '1.3rem' }}>{item.quantity}</strong>
                      <button onClick={() => updateQuantity(item.cartId, 1)} style={{ width: '40px', height: '40px', border: 'none', backgroundColor: 'white', borderRadius: '6px', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Төлбөр хийх товч */}
          <div style={{ padding: '25px', borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 'bold' }}>Нийт дүн:</span>
              <strong style={{ fontSize: '2rem', color: '#0f172a' }}>{totalPrice.toLocaleString()} ₮</strong>
            </div>
            <button 
              onClick={() => setKioskState('payment_method')}
              disabled={cart.length === 0}
              style={{ width: '100%', padding: '20px', backgroundColor: cart.length === 0 ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.5rem', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', boxShadow: cart.length === 0 ? 'none' : '0 10px 20px rgba(16, 185, 129, 0.3)' }}
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
          <button onClick={() => setKioskState('menu')} style={{ padding: '15px 30px', fontSize: '1.2rem', backgroundColor: 'white', border: '2px solid #cbd5e1', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>⬅️ Буцах</button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h2 style={{ fontSize: '2rem', color: '#64748b', marginBottom: '10px' }}>Төлөх дүн</h2>
          <h1 style={{ fontSize: '4rem', color: '#0f172a', margin: '0 0 50px 0' }}>{totalPrice.toLocaleString()} ₮</h1>
          
          <div style={{ display: 'flex', gap: '30px', width: '100%', maxWidth: '800px', padding: '0 20px' }}>
            <button 
              onClick={() => simulatePayment('card')}
              style={{ flex: 1, padding: '50px 20px', backgroundColor: 'white', border: '3px solid #3b82f6', borderRadius: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.15)' }}
            >
              <div style={{ fontSize: '4rem' }}>💳</div>
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b' }}>БАНКНЫ КАРТ</span>
            </button>

            <button 
              onClick={() => simulatePayment('qpay')}
              style={{ flex: 1, padding: '50px 20px', backgroundColor: 'white', border: '3px solid #f59e0b', borderRadius: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', boxShadow: '0 10px 30px rgba(245, 158, 11, 0.15)' }}
            >
              <div style={{ fontSize: '4rem' }}>📱</div>
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b' }}>QPAY УНШУУЛАХ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Дэлгэц 4: ТӨЛБӨР УНШУУЛАХ (Хүлээх горим)
  if (kioskState === 'processing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', fontFamily: 'Arial, sans-serif', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Төлөх дүн: {totalPrice.toLocaleString()} ₮</h2>
        
        {selectedPayment === 'qpay' ? (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', margin: '40px 0' }}>
            {/* Түр хугацаанд зориулсан хуурамч QPay QR кодны зураг */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=QPay_Total_${totalPrice}`} alt="QPay QR" style={{ width: '300px', height: '300px' }} />
          </div>
        ) : (
          <div style={{ fontSize: '6rem', margin: '40px 0', animation: 'pulse 1.5s infinite' }}>💳</div>
        )}

        <h1 style={{ fontSize: '2rem', color: '#38bdf8' }}>
          {selectedPayment === 'qpay' ? 'QR кодыг банкны апп-аараа уншуулна уу...' : 'ПОС машин дээр картаа уншуулна уу...'}
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginTop: '20px' }}>(Төлбөр төлөгдсөний дараа автоматаар цааш шилжинэ)</p>
      </div>
    );
  }

  // Дэлгэц 5: АМЖИЛТТАЙ БОЛСОН
  if (kioskState === 'success') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#10b981', fontFamily: 'Arial, sans-serif', color: 'white', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '8rem', marginBottom: '20px' }}>✅</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Төлбөр амжилттай!</h1>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '30px 50px', borderRadius: '20px', marginBottom: '30px' }}>
          <p style={{ fontSize: '1.5rem', margin: '0 0 10px 0' }}>Таны захиалгын дугаар:</p>
          <h2 style={{ fontSize: '5rem', margin: 0, fontWeight: '900' }}>#{successOrderNumber}</h2>
        </div>
        <h2 style={{ fontSize: '2rem' }}>Таны хоол гал тогоо руу илгээгдлээ. 👨‍🍳</h2>
        <p style={{ fontSize: '1.2rem', marginTop: '20px', opacity: 0.8 }}>Баярлалаа! (Хэдэн секундын дараа автоматаар хаагдана)</p>
      </div>
    );
  }

  return null;
}

export default MenuPage;