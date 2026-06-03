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
  
  // ✨ ШИНЭ ТӨЛӨВҮҮД: Идэвхтэй ангилал болон Сонгосон хоолны дэлгэрэнгүй цонх
  const [activeCategory, setActiveCategory] = useState('Бүгд');
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailQuantity, setDetailQuantity] = useState(1);

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

  // Ангиллуудыг ялган авах (Дээд талын цэсэнд зориулж)
  const categories = ['Бүгд', ...new Set(menuItems.map(item => item.category || 'Бусад'))];

  // Сагсанд олноор нь нэмэх функц (Дэлгэрэнгүй цонхноос)
  const handleAddToWithQty = (item, qty) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: (parseInt(cartItem.quantity) || 0) + qty } : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: qty }];
    });
    setSelectedItem(null); // Цонхыг хаах
    setDetailQuantity(1); // Тоог устгах
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => {
      const newCart = prevCart
        .map((cartItem) =>
          cartItem.id === itemId ? { ...cartItem, quantity: (parseInt(cartItem.quantity) || 0) - 1 } : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0); 
      if (newCart.length === 0) setIsCartOpen(false);
      return newCart;
    });
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * (parseInt(item.quantity, 10) || 0)), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);

  const placeOrder = async () => {
    const validCartItems = cart.filter(item => (parseInt(item.quantity, 10) || 0) > 0);
    if (validCartItems.length === 0) { alert("Таны сагс хоосон байна!"); return; }
    if (!phone.trim()) { alert("Та утасны дугаараа оруулна уу."); return; }

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
        .insert([{ table_number: '1', phone_number: currentPhone, total_amount: currentTotal, order_type: currentOrderType, status: 'pending' }])
        .select();

      if (orderError) throw orderError;
      const newOrder = orderData[0]; 

      const orderItemsData = validCartItems.map((item) => ({
        order_id: newOrder.id, menu_item_id: item.id, quantity: parseInt(item.quantity, 10), price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) throw itemsError;

      setPlacedOrderTotal(currentTotal); 
      setPlacedOrderType(currentOrderType);
      setPlacedOrderPhone(currentPhone);
      setPlacedOrderId(newOrder.order_number); 
      setCart([]); setPhone(''); setOrderType('dine-in'); setIsCartOpen(false); setOrderSuccess(true); 
    } catch (err) {
      alert("Алдаа гарлаа: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ангиллаар хоолыг шүүж харуулах
  const filteredItems = activeCategory === 'Бүгд' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  if (isLoading) return <div className="menu-container" style={{ textAlign: 'center', padding: '50px 20px' }}><h2>⏳ Цэс уншиж байна...</h2></div>;

  if (orderSuccess) {
    return (
      <div className="menu-container" style={{ padding: '35px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '65px', marginBottom: '10px' }}>⏱️</div>
        <h1 style={{ color: '#d97706', fontSize: '2.1rem', fontWeight: '800' }}>Төлбөр хүлээгдэж байна</h1>
        <div style={{ backgroundColor: '#fffbeb', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '2px dashed #f59e0b' }}>
          <span style={{ fontSize: '1.1rem', color: '#b45309' }}>Таны захиалгын дугаар</span>
          <strong style={{ fontSize: '4.5rem', color: '#b45309', display: 'block' }}>#{placedOrderId}</strong>
        </div>
        <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0', padding: '20px', borderRadius: '16px', marginBottom: '20px', fontSize: '1.4rem', color: '#16a34a', fontWeight: 'bold' }}>
          💵 Төлөх нийт дүн: <span style={{ fontSize: '1.9rem', color: '#15803d' }}>{placedOrderTotal.toLocaleString()} ₮</span>
        </div>
        {placedOrderType === 'pickup' && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontWeight: '600' }}>
            🛍️ Аваад явах санамж: Сав баглаа боодлын үнээс хамаарч касс дээр үнэ бага зэрэг нэмэгдэж болзошгүй.
          </div>
        )}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
          <strong>Хаан банк: <span style={{ color: '#2563eb' }}>MN340005005819257247</span></strong><br/>
          <strong>Хүлээн авагч: ӨЛЗИЙТОГТОХ СЭРЖМАА</strong>
        </div>
        <div style={{ backgroundColor: '#eff6ff', padding: '18px', borderRadius: '16px', marginBottom: '25px', textAlign: 'left' }}>
          <span style={{ color: '#1e40af', fontWeight: '700' }}>✍️ Гүйлгээний утга:</span>
          <p style={{ margin: '5px 0' }}>Утасны дугаар, захиалгын номер хамт оруулна уу.</p>
          <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px dashed #93c5fd' }}>
            Жишээ нь: <strong>{placedOrderPhone} #{placedOrderId}</strong>
          </div>
        </div>
        <p style={{ color: '#ef4444', fontSize: '1.25rem', fontWeight: '800' }}>⚠️ Тооцоогоо хийж кассанд баталгаажуулахгүй бол захиалга хийгдэж эхлэхгүй!</p>
        <p style={{ color: '#475569', fontSize: '1.25rem', fontWeight: '700', fontStyle: 'italic' }}>🌹 Манайхаар үйлчлүүлсэн танд баярлалаа! 🌹</p>
      </div>
    );
  }

  return (
    <div className="menu-container" style={{ padding: '0 0 80px 0' }}>
      <h1 style={{ textAlign: 'center', padding: '20px 0 10px 0', margin: 0, fontSize: '1.8rem' }}>🍽️ Зогсоо Хайрхан</h1>

      {/* 🏷️ ШИНЭ: Дээд талын хөвдөг ангиллууд (image_2 шиг) */}
      <div className="category-scroll-container">
        {categories.map(cat => (
          <button 
            key={cat} 
            className={`category-tag-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 🍔 ШИНЭ: Хоолны жагсаалт (Баруун талдаа зурагтай - image_2 шиг) */}
      <div style={{ padding: '0 15px' }}>
        {filteredItems.map((item) => {
          const cartItem = cart.find((c) => c.id === item.id);
          return (
            <div key={item.id} className="modern-menu-item" onClick={() => { setSelectedItem(item); setDetailQuantity(1); }}>
              <div className="modern-item-info">
                <h3>{item.name}</h3>
                <p className="modern-item-price">{item.price.toLocaleString()} ₮</p>
                {item.category && <span className="modern-item-cat">{item.category}</span>}
              </div>
              <div className="modern-item-image-wrapper">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="modern-item-img" />
                ) : (
                  <div className="modern-item-no-img">🍲</div>
                )}
                {cartItem && <div className="modern-item-badge">{cartItem.quantity}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🛒 ДООД ТАЛЫН ХӨВДӨГ ШАР СAГС (image_2 шиг) */}
      {cart.length > 0 && !isCartOpen && (
        <div className="modern-floating-cart-wrapper">
          <button className="modern-floating-cart-btn" onClick={() => setIsCartOpen(true)}>
            <span>{totalPrice.toLocaleString()} ₮ • Сагс үзэх ({totalItemsCount})</span>
          </button>
        </div>
      )}

      {/* 🔍 ШИНЭ: ХООЛНЫ ДЭЛГЭРЭНГҮЙ ЦОНХ (image_3 шиг Modal) */}
      {selectedItem && (
        <div className="detail-modal-overlay" onClick={(e) => { if(e.target.className === 'detail-modal-overlay') setSelectedItem(null); }}>
          <div className="detail-modal-content">
            <button className="detail-close-btn" onClick={() => setSelectedItem(null)}>❮</button>
            
            <div className="detail-image-box">
              {selectedItem.image_url ? (
                <img src={selectedItem.image_url} alt={selectedItem.name} />
              ) : (
                <div className="detail-no-image">🍲</div>
              )}
            </div>

            <div className="detail-info-box">
              <h2>{selectedItem.name}</h2>
              <p className="detail-price">{selectedItem.price.toLocaleString()} ₮</p>
              
              <div className="detail-qty-section">
                <span>Суурь тоо:</span>
                <div className="detail-qty-controls">
                  <button onClick={() => setDetailQuantity(prev => Math.max(1, prev - 1))}>-</button>
                  <span>{detailQuantity}</span>
                  <button onClick={() => setDetailQuantity(prev => prev + 1)}>+</button>
                </div>
              </div>

              <button className="detail-add-btn" onClick={() => handleAddToWithQty(selectedItem, detailQuantity)}>
                {(selectedItem.price * detailQuantity).toLocaleString()} ₮ Сагсанд хийх
              </button>
            </div>
          </div>
        </div>
      )}

      {/* САГСНЫ МОДАЛ ЦОНХ */}
      {isCartOpen && (
        <div className="cart-modal-overlay" onClick={(e) => { if (e.target.className === 'cart-modal-overlay') setIsCartOpen(false); }}>
          <div className="cart-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Таны сагс</h2>
              <button className="close-modal-btn" onClick={() => setIsCartOpen(false)}>✖</button>
            </div>
            <div className="cart-summary" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, flex: 1, fontSize: '1.2rem' }}>Нийт дүн: <span style={{ color: '#e63946' }}>{totalPrice.toLocaleString()} ₮</span></h2>
                <button onClick={() => { setCart([]); setIsCartOpen(false); }} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>🗑 Хоослох</button>
              </div>
              <ul className="cart-items-list" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', padding: 0, listStyle: 'none' }}>
                {cart.map((item) => (
                  <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.1rem' }}>
                    <span>{item.name}</span>
                    <div>
                      <button onClick={() => removeFromCart(item.id)} style={{ padding: '2px 8px', marginRight: '8px', cursor: 'pointer' }}>-</button>
                      <strong>{item.quantity} ш</strong>
                    </div>
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