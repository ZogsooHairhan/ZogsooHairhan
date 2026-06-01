import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './MenuPage.css';

function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState('dine-in'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(''); 

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true); 

      if (error) throw error;
      setMenuItems(data);
    } catch (err) {
      console.error("Цэс татахад алдаа гарлаа:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: (parseInt(cartItem.quantity) || 0) + 1 } : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => {
      return prevCart
        .map((cartItem) =>
          cartItem.id === itemId ? { ...cartItem, quantity: (parseInt(cartItem.quantity) || 0) - 1 } : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0); 
    });
  };

  // ШИНЭ: Гараар тоо бичих үед ажиллах функц
  const handleManualQuantity = (itemId, value) => {
    setCart((prevCart) =>
      prevCart.map((cartItem) => {
        if (cartItem.id === itemId) {
          // Гараар устгаж хоосон болгохыг зөвшөөрнө, үгүй бол тоог нь авна
          return { ...cartItem, quantity: value === '' ? '' : parseInt(value, 10) };
        }
        return cartItem;
      })
    );
  };

  // ШИНЭ: Гараар бичиж дуусаад өөр газар дарах үед шалгах
  const handleInputBlur = (itemId, value) => {
    const qty = parseInt(value, 10);
    // Хэрэв тоо бичээгүй хоосон орхисон эсвэл 0 болгосон бол сагснаас бүрмөсөн устгах
    if (isNaN(qty) || qty <= 0) {
      setCart((prev) => prev.filter((c) => c.id !== itemId));
    }
  };

  // Нийт дүн бодохдоо хоосон ('') утгыг 0 гэж тооцох
  const totalPrice = cart.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    return sum + (item.price * qty);
  }, 0);

  const placeOrder = async () => {
    // Зөвхөн тоо нь 0-ээс их байгаа хоолнуудыг ялгаж авах
    const validCartItems = cart.filter(item => (parseInt(item.quantity, 10) || 0) > 0);

    if (validCartItems.length === 0) {
      alert("Таны сагс хоосон байна!");
      return;
    }

    if (!phone.trim()) {
      alert("Та утасны дугаараа оруулна уу.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
            table_number: '1',                 
            phone_number: phone, 
            total_amount: totalPrice,
            order_type: orderType,           
            status: 'pending'
        }])
        .select();

      if (orderError) throw orderError;
      const newOrder = orderData[0]; 

      const orderItemsData = validCartItems.map((item) => ({
        order_id: newOrder.id,        
        menu_item_id: item.id,        
        quantity: parseInt(item.quantity, 10),
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      setCart([]); 
      setPhone(''); 
      setOrderType('dine-in'); 
      setPlacedOrderId(newOrder.order_number); 
      setOrderSuccess(true); 

    } catch (err) {
      console.error("Захиалга илгээхэд алдаа гарлаа:", err);
      alert("Алдаа гарлаа: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const grouped = menuItems.reduce((acc, item) => {
    const cat = item.category || 'Бусад';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (isLoading) return (
    <div className="menu-container" style={{ textAlign: 'center', padding: '50px 20px' }}>
        <h2>⏳ Цэс уншиж байна...</h2>
        <p style={{ color: '#7f8c8d' }}>Түр хүлээнэ үү</p>
    </div>
  );

  if (orderSuccess) {
    return (
      <div className="menu-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '60px', marginBottom: '15px' }}>✅</div>
        <h2 style={{ color: '#10b981', marginBottom: '15px', fontSize: '1.8rem' }}>Захиалга илгээгдлээ!</h2>
        
        <div style={{ backgroundColor: '#fffbe1', padding: '15px', borderRadius: '10px', display: 'inline-block', marginBottom: '20px', border: '2px dashed #f39c12' }}>
          <span style={{ fontSize: '1.1rem', color: '#555', fontWeight: '500' }}>Таны захиалгын дугаар:</span><br/>
          <strong style={{ fontSize: '2.5rem', color: '#e74c3c', letterSpacing: '2px' }}>#{placedOrderId}</strong>
        </div>

        <p style={{ fontSize: '1.2rem', color: '#374151', lineHeight: '1.5', marginBottom: '30px', fontWeight: '500' }}>
          Та тооцоогоо хийж захиалгаа баталгаажуулна уу.
        </p>

        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'left', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '1rem' }}>Төлбөр шилжүүлэх данс:</p>
          <strong style={{ display: 'block', fontSize: '1.3rem', color: '#0f172a', marginBottom: '5px' }}>Хаан банк:MN34 000 500 5819 257 247</strong>
          <strong style={{ display: 'block', fontSize: '1.1rem', color: '#475569' }}>Хүлээн авагч: ӨЛЗИЙТОГТОХ СЭРЖМАА</strong>
        </div>

        <button 
          className="order-btn" 
          onClick={() => {
            setOrderSuccess(false);
            setPlacedOrderId('');
          }}
          style={{ backgroundColor: '#3b82f6', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)' }}
        >
          Шинээр захиалга өгөх
        </button>
      </div>
    );
  }

  return (
    <div className="menu-container">
      <h1>🍽️ Зогсоо Хайрхан зоогийн газар</h1>

      <div>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="group-title">{cat}</h2>
            {items.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id);
              
              // Хэрэв сагсанд байвал тоог нь авна (хоосон байвал '' байна)
              const quantity = cartItem ? cartItem.quantity : 0;
              const isAdded = cartItem !== undefined;

              return (
                <div key={item.id} className="menu-item">
                  <div className="item-info">
                    <h3>{item.name}</h3>
                    <p className="item-price">{item.price.toLocaleString()} ₮</p>
                  </div>
                  <div className="controls">
                    {isAdded && (
                      <button className="btn-remove" onClick={() => removeFromCart(item.id)}>-</button>
                    )}
                    
                    {/* ШИНЭЭР НЭМЭГДСЭН: Гараар тоо бичдэг хэсэг */}
                    {isAdded && (
                      <input 
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => handleManualQuantity(item.id, e.target.value)}
                        onBlur={(e) => handleInputBlur(item.id, e.target.value)}
                        style={{
                          width: '50px',
                          textAlign: 'center',
                          fontSize: '1.3rem',
                          fontWeight: '700',
                          border: '2px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '4px',
                          color: '#111827',
                          backgroundColor: '#fff',
                          outline: 'none'
                        }}
                      />
                    )}
                    
                    <button className="btn-add" onClick={() => addToCart(item)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="cart-summary">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, flex: 1 }}>Нийт дүн: <span>{totalPrice.toLocaleString()} ₮</span></h2>
            <button 
              onClick={() => setCart([])} 
              style={{ marginLeft: '15px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              🗑 Хоослох
            </button>
          </div>
          
          <ul className="cart-items-list">
            {cart.map((item) => (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px' }}>
                <span>{item.name}</span>
                <strong>{item.quantity} ш</strong>
              </li>
            ))}
          </ul>
          
          <input type="number" placeholder="Таны утасны дугаар (Заавал)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="dine-in">Сууж идэх</option>
            <option value="pickup">Аваад явах</option>
          </select>
          
          <button className="order-btn" onClick={placeOrder} disabled={isSubmitting}>
            {isSubmitting ? 'БАТАЛГААЖУУЛЖ БАЙНА...' : 'ЗАХИАЛАХ'}
          </button>
        </div>
      )}
    </div>
  );
}

export default MenuPage;