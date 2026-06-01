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

  // ========================================================
  // ЗАХИАЛГА ИЛГЭЭХ БОЛОН ШАЛГАХ ФУНКЦ
  // ========================================================
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

    // 🔒 ШИНЭЭР НЭМЭГДСЭН: Сууж идэх үед уух юм шалгах логик
    if (orderType === 'dine-in') {
      // Сагсанд байгаа хоолнууд дундаас ангилал (category) нь "уух", "ундаа", "цай" гэсэн үг агуулж байгааг хайх
      const hasDrink = validCartItems.some(item => {
        const categoryName = (item.category || '').toLowerCase();
        return categoryName.includes('уух') || categoryName.includes('ундаа') || categoryName.includes('цай');
      });

      if (!hasDrink) {
        alert("⚠️ Сууж идэх тохиолдолд заавал дор хаяж нэг уух юм (ундаа, цай гм) сонгох шаардлагатай.");
        return; // Захиалгыг цааш явуулахгүй зогсооно
      }
    }

    setIsSubmitting(true);

    try {
      const currentTotal = totalPrice;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
            table_number: '1',                 
            phone_number: phone, 
            total_amount: currentTotal,
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

      setPlacedOrderTotal(currentTotal); 
      setCart([]); 
      setPhone(''); 
      setOrderType('dine-in'); 
      setPlacedOrderId(newOrder.order_number); 
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
      <div className="menu-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '60px', marginBottom: '15px' }}>✅</div>
        <h2 style={{ color: '#10b981', marginBottom: '15px', fontSize: '1.8rem' }}>Захиалга илгээгдлээ!</h2>
        
        <div style={{ backgroundColor: '#fffbe1', padding: '15px', borderRadius: '10px', display: 'inline-block', marginBottom: '20px', border: '2px dashed #f39c12' }}>
          <span style={{ fontSize: '1.1rem', color: '#555', fontWeight: '500' }}>Таны захиалгын дугаар:</span><br/>
          <strong style={{ fontSize: '2.5rem', color: '#e74c3c', letterSpacing: '2px' }}>#{placedOrderId}</strong>
        </div>

        <p style={{ fontSize: '1.1rem', color: '#374151', lineHeight: '1.5', marginBottom: '20px', fontWeight: '500' }}>
          Та тооцоогоо хийж захиалгаа баталгаажуулна уу.
        </p>

        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '18px', borderRadius: '12px', marginBottom: '25px', fontSize: '1.3rem', color: '#16a34a', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          💵 Төлөх нийт дүн: <span style={{ fontSize: '1.5rem', color: '#15803d' }}>{placedOrderTotal.toLocaleString()} ₮</span>
        </div>

        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'left', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '1rem' }}>Төлбөр шилжүүлэх данс:</p>
          <strong style={{ display: 'block', fontSize: '1.2rem', color: '#0f172a', marginBottom: '5px' }}>Хаан банк: MN340005005819257247</strong>
          <strong style={{ display: 'block', fontSize: '1.1rem', color: '#475569' }}>Хүлээн авагч: ӨЛЗИЙТОГТОХ СЭРЖМАА</strong>
        </div>

        <button 
          className="order-btn" 
          onClick={() => {
            setOrderSuccess(false);
            setPlacedOrderId('');
            setPlacedOrderTotal(0);
          }}
          style={{ backgroundColor: '#3b82f6' }}
        >
          Шинээр захиалга өгөх
        </button>
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

      {cart.length > 0 && !isCartOpen && (
        <div className="floating-cart-wrapper">
          <button className="floating-cart-btn" onClick={() => setIsCartOpen(true)}>
            <span>🛒 Сагсанд {totalItemsCount} ш</span>
            <span>{totalPrice.toLocaleString()} ₮</span>
          </button>
        </div>
      )}

      {isCartOpen && (
        <div className="cart-modal-overlay" onClick={(e) => {
          if (e.target.className === 'cart-modal-overlay') setIsCartOpen(false);
        }}>
          <div className="cart-modal-content">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Таны сагс</h2>
              <button className="close-modal-btn" onClick={() => setIsCartOpen(false)}>✖</button>
            </div>

            <div className="cart-summary" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, flex: 1, fontSize: '1.2rem' }}>Нийт дүн: <span style={{ color: '#e63946' }}>{totalPrice.toLocaleString()} ₮</span></h2>
                <button 
                  onClick={() => { setCart([]); setIsCartOpen(false); }} 
                  style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  🗑 Хоослох
                </button>
              </div>
              
              <ul className="cart-items-list" style={{ maxHeight: '250px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
                {cart.map((item) => (
                  <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.1rem' }}>
                    <span style={{ color: '#475569' }}>{item.name}</span>
                    <strong style={{ color: '#0f172a' }}>{item.quantity} ш</strong>
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
            
          </div>
        </div>
      )}

    </div>
  );
}

export default MenuPage;