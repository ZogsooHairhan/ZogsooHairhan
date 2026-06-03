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
  const [placedOrderTotal, setPlacedOrderTotal] = useState(0);
  
  const [placedOrderType, setPlacedOrderType] = useState('dine-in');
  const [placedOrderPhone, setPlacedOrderPhone] = useState('');

  const [isCartOpen, setIsCartOpen] = useState(false);

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
      const newCart = prevCart
        .map((cartItem) =>
          cartItem.id === itemId ? { ...cartItem, quantity: (parseInt(cartItem.quantity) || 0) - 1 } : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0); 
      
      if (newCart.length === 0) {
        setIsCartOpen(false);
      }
      return newCart;
    });
  };

  const handleManualQuantity = (itemId, value) => {
    setCart((prevCart) =>
      prevCart.map((cartItem) => {
        if (cartItem.id === itemId) {
          return { ...cartItem, quantity: value === '' ? '' : parseInt(value, 10) };
        }
        return cartItem;
      })
    );
  };

  const handleInputBlur = (itemId, value) => {
    const qty = parseInt(value, 10);
    if (isNaN(qty) || qty <= 0) {
      setCart((prev) => {
        const newCart = prev.filter((c) => c.id !== itemId);
        if (newCart.length === 0) setIsCartOpen(false);
        return newCart;
      });
    }
  };

  const totalPrice = cart.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    return sum + (item.price * qty);
  }, 0);

  const totalItemsCount = cart.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);

  const placeOrder = async () => {
    const validCartItems = cart.filter(item => (parseInt(item.quantity, 10) || 0) > 0);

    if (validCartItems.length === 0) {
      alert("Таны сагс хоосон байна!");
      return;
    }

    if (!phone.trim()) {
      alert("Та утасны дугаараа оруулна уу.");
      return;
    }

    if (orderType === 'dine-in') {
      const hasDrink = validCartItems.some(item => {
        const categoryName = (item.category || '').toLowerCase();
        return categoryName.includes('уух') || categoryName.includes('ундаа') || categoryName.includes('цай');
      });

      if (!hasDrink) {
        alert("⚠️ Сууж идэх тохиолдолд заавал дор хаяж нэг уух юм (ундаа, цай гм) сонгох шаардлагатай.");
        return; 
      }
    }

    setIsSubmitting(true);

    try {
      const currentTotal = totalPrice;
      const currentOrderType = orderType;
      const currentPhone = phone;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
            table_number: '1',                 
            phone_number: currentPhone, 
            total_amount: currentTotal,
            order_type: currentOrderType,           
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

      setPlacedOrderTotal(currentTotal); 
      setPlacedOrderType(currentOrderType);
      setPlacedOrderPhone(currentPhone);
      setPlacedOrderId(newOrder.order_number); 

      setCart([]); 
      setPhone(''); 
      setOrderType('dine-in'); 
      setIsCartOpen(false); 
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
      <div className="menu-container" style={{ padding: '35px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ fontSize: '65px', marginBottom: '10px' }}>⏱️</div>
          <h1 style={{ color: '#d97706', fontSize: '2.1rem', fontWeight: '800', margin: '0 0 5px 0' }}>
            Төлбөр хүлээгдэж байна
          </h1>
        </div>

        <div style={{ backgroundColor: '#fffbeb', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '2px dashed #f59e0b', textAlign: 'center' }}>
          <span style={{ fontSize: '1.1rem', color: '#b45309', fontWeight: '600' }}>Таны захиалгын дугаар</span><br/>
          <strong style={{ fontSize: '4.5rem', color: '#b45309', display: 'block', margin: '5px 0', lineHeight: '1' }}>
            #{placedOrderId}
          </strong>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0', padding: '20px', borderRadius: '16px', marginBottom: '20px', textAlign: 'center', fontSize: '1.4rem', color: '#16a34a', fontWeight: 'bold' }}>
          💵 Төлөх нийт дүн: <span style={{ fontSize: '1.9rem', color: '#15803d', display: 'block', marginTop: '5px' }}>{placedOrderTotal.toLocaleString()} ₮</span>
        </div>

        {placedOrderType === 'pickup' && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontSize: '1.05rem', fontWeight: '600', lineHeight: '1.4' }}>
            🛍️ Аваад явах санамж: Сав баглаа боодлын үнээс хамаарч касс дээр нийт үнэ бага зэрэг нэмэгдэж болзошгүйг анхаарна уу.
          </div>
        )}

        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '0.95rem', fontWeight: '500' }}>Төлбөр шилжүүлэх данс:</p>
          <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a', marginBottom: '6px', letterSpacing: '0.5px' }}>
            Хаан банк: <span style={{ color: '#2563eb' }}>MN340005005819257247</span>
          </strong>
          <strong style={{ display: 'block', fontSize: '1.1rem', color: '#334155' }}>
            Хүлээн авагч: ӨЛЗИЙТОГТОХ СЭРЖМАА
          </strong>
        </div>

        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '18px', borderRadius: '16px', marginBottom: '25px' }}>
          <span style={{ display: 'block', color: '#1e40af', fontWeight: '700', fontSize: '1.1rem', marginBottom: '8px' }}>
            ✍️ Гүйлгээний утга:
          </span>
          <p style={{ margin: '0', color: '#1e3a8a', fontSize: '1.15rem', lineHeight: '1.5' }}>
            Гүйлгээний утга дээр өөрийн <strong style={{ color: '#dc2626' }}>утасны дугаар</strong> болон <strong style={{ color: '#dc2626' }}>захиалгын номерыг</strong> заавал хамт оруулна уу.
          </p>
          <div style={{ marginTop: '10px', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px dashed #93c5fd', fontSize: '1.05rem', color: '#475569' }}>
            💡 Жишээ нь: <strong style={{ color: '#0f172a' }}>{placedOrderPhone} #{placedOrderId}</strong>
          </div>
        </div>

        <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '20px', textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontSize: '1.25rem', fontWeight: '800', margin: '0 0 15px 0', lineHeight: '1.5' }}>
            ⚠️ Тооцоогоо хийж <strong style={{ textDecoration: 'underline' }}>кассанд баталгаажуулахгүй бол</strong> захиалга хийгдэж эхлэхгүйг анхаарна уу!
          </p>
          <p style={{ color: '#475569', fontSize: '1.25rem', fontWeight: '700', margin: '20px 0 0 0', fontStyle: 'italic', letterSpacing: '0.3px' }}>
            🌹 Манайхаар үйлчлүүлсэн танд баярлалаа! 🌹
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-container">
      <h1>🍽️ Зогсоо Хайрхан</h1>

      <div>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="group-title">{cat}</h2>
            {items.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id);
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
                    {isAdded && (
                      <input 
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => handleManualQuantity(item.id, e.target.value)}
                        onBlur={(e) => handleInputBlur(item.id, e.target.value)}
                        style={{ width: '50px', textAlign: 'center', fontSize: '1.3rem', fontWeight: '700', border: '2px solid #cbd5e1', borderRadius: '8px', padding: '4px', color: '#111827', backgroundColor: '#fff', outline: 'none' }}
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

      {/* 🛒 ДООД ТАЛЫН ХӨВДӨГ САТСНЫ ТОВЧЛУУР */}
      {cart.length > 0 && !isCartOpen && (
        <div className="floating-cart-wrapper">
          <button className="floating-cart-btn" onClick={() => setIsCartOpen(true)}>
            <span>🛒 Сагсанд {totalItemsCount} ш</span>
            <span>{totalPrice.toLocaleString()} ₮</span>
          </button>
        </div>
      )}

      {/* 🛍️ МИНИЙ САГС МОДАЛ ЦОНХ */}
      {isCartOpen && (
        <div className="cart-modal-overlay" onClick={(e) => {
          if (e.target.className === 'cart-modal-overlay') setIsCartOpen(false);
        }}>
          <div className="cart-modal-content">
            
            {/* Толгой хэсэг */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', fontWeight: '800' }}>Таны сагс</h2>
              <button 
                className="close-modal-btn" 
                onClick={() => setIsCartOpen(false)}
              >
                ✖
              </button>
            </div>

            {/* Скролл хийгддэг хоолны жагсаалт */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {cart.map((item) => (
                  <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '1.2rem', paddingBottom: '10px', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ color: '#334155', fontWeight: '700' }}>{item.name}</span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }}
                      >
                        -
                      </button>
                      <strong style={{ color: '#0f172a', minWidth: '25px', textAlign: 'center', fontSize: '1.25rem' }}>{item.quantity} ш</strong>
                      <button 
                        onClick={() => addToCart(item)}
                        style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Доод талын бөглөх форм болон товчлуур */}
            <div className="cart-summary" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: '#f8fafc', padding: '12px 15px', borderRadius: '12px' }}>
                <span style={{ fontSize: '1.05rem', color: '#64748b', fontWeight: '600' }}>Нийт төлөх дүн:</span>
                <strong style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: '900' }}>{totalPrice.toLocaleString()} ₮</strong>
              </div>
              
              <input 
                type="number" 
                placeholder="Таны утасны дугаар (Заавал)" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
              
              <select 
                value={orderType} 
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="dine-in">🍽️ Сууж идэх</option>
                <option value="pickup">🛍️ Аваад явах</option>
              </select>
              
              <button 
                className="order-btn" 
                onClick={placeOrder} 
                disabled={isSubmitting}
                style={{ backgroundColor: '#ffcc00', color: '#1e293b' }}
              >
                {isSubmitting ? 'БАТАЛГААЖУУЛЖ БАЙНА...' : `${totalPrice.toLocaleString()} ₮ Захиалах`}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}

export default MenuPage;