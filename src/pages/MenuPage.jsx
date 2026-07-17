import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './MenuPage.css?v=1.0.1';

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
  
  // ШИНЭЭР НЭМЭГДСЭН: Захиалсан хоолнуудын жагсаалтыг хадгалах
  const [placedItems, setPlacedItems] = useState([]);

  // ✨ ЖИШЭЭ ШИГ: Идэвхтэй байгаа ангиллыг хянах төлөв
  const [activeCategory, setActiveCategory] = useState('Бүгд');

  // ✨ IMAGE_6 ШИГ: Хоолны дэлгэрэнгүйг харуулах модал төлөвүүд
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailQuantity, setDetailQuantity] = useState(1);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const categoryRefs = useRef({});

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

  // Ангилал руу шууд гүйлгэж очих (Scroll) функц
  const handleCategoryClick = (category) => {
    setActiveCategory(category);
    if (category === 'Бүгд') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = categoryRefs.current[category];
      if (element) {
        const offset = 140; // Дээд талын хөвдөг цэсний зайг тооцно
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  // Сагсанд нэмэх үндсэн функцүүд
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
    setSelectedItem(null); // Дэлгэрэнгүй цонхыг хаана
    setDetailQuantity(1);
  };

  const updateCartQuantity = (itemId, amount) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.id === itemId) {
          const newQty = (parseInt(item.quantity) || 0) + amount;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * (parseInt(item.quantity) || 0)), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);

  const placeOrder = async () => {
    const validCartItems = cart.filter(item => (parseInt(item.quantity, 10) || 0) > 0);
    if (validCartItems.length === 0) { alert("Сагс хоосон байна!"); return; }
    if (!phone.trim()) { alert("Утасны дугаараа оруулна уу."); return; }

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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // Амжилттай болсны дараах өгөгдлүүдээ хадгалах
      setPlacedItems([...validCartItems]); 
      setPlacedOrderTotal(currentTotal); 
      setPlacedOrderType(currentOrderType);
      setPlacedOrderPhone(currentPhone);
      setPlacedOrderId(newOrder.id); // Хэрэв танд order_number гэж байвал newOrder.order_number-оор солиорой
      
      // Сагсаа цэвэрлэж хуудсаа солих
      setCart([]); setPhone(''); setOrderType('dine-in'); setIsCartOpen(false); setOrderSuccess(true); 
    } catch (err) {
      alert("Алдаа гарлаа: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['Бүгд', ...new Set(menuItems.map(item => item.category || 'Бусад'))];

  const grouped = menuItems.reduce((acc, item) => {
    const cat = item.category || 'Бусад';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (isLoading) return (
    <div className="menu-container" style={{ textAlign: 'center', padding: '50px 20px' }}>
        <h2>⏳ Цэс уншиж байна...</h2>
    </div>
  );

  // ---------------------------------------------------------
  // ШИНЭЧЛЭГДСЭН МАШ ЦЭВЭРХЭН "ЗАХИАЛГА АМЖИЛТТАЙ" ХУУДАС
  // ---------------------------------------------------------
  if (orderSuccess) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '60px', marginBottom: '10px' }}>⏳</div>
            <h1 style={{ color: '#d97706', fontSize: '1.8rem', fontWeight: '800', margin: '0' }}>Төлбөр хүлээгдэж байна</h1>
          </div>

          {/* Захиалгын дугаар */}
          <div style={{ border: '2px dashed #f59e0b', backgroundColor: '#fffbeb', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '25px' }}>
            <span style={{ fontSize: '1.1rem', color: '#b45309', fontWeight: '600' }}>Таны захиалгын дугаар</span>
            <div style={{ fontSize: '4.5rem', color: '#b45309', fontWeight: '900', lineHeight: '1', marginTop: '5px' }}>#{placedOrderId}</div>
          </div>

          {/* Захиалсан хоолны жагсаалт */}
          <div style={{ marginBottom: '25px' }}>
            {placedItems.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#334155', fontSize: '1.1rem', fontWeight: '500' }}>
                <span>
                  {item.name} <span style={{ color: '#94a3b8', fontWeight: '700', marginLeft: '5px' }}>x {item.quantity}</span>
                </span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>
                  {(item.price * item.quantity).toLocaleString()} ₮
                </span>
              </div>
            ))}
          </div>

          {/* Нийт дүн */}
          <div style={{ backgroundColor: '#f0fdf4', padding: '15px 20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <span style={{ color: '#16a34a', fontSize: '1.2rem', fontWeight: '700' }}>Төлөх дүн:</span>
            <span style={{ color: '#15803d', fontSize: '1.8rem', fontWeight: '900' }}>{placedOrderTotal.toLocaleString()} ₮</span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
             <p style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: '700', margin: '0' }}>⚠️ Кассанд тооцоогоо хийснээр таны захиалга баталгаажна.</p>
          </div>

          {/* Баталгаажуулах товч - Дарахад хуудас шинэчлэгдэж дараагийн хүн ашиглахад бэлэн болно */}
          <button 
            onClick={() => window.location.reload()}
            style={{ width: '100%', padding: '18px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '16px', fontSize: '1.3rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)' }}
          >
            Кассанд баталгаажуулах
          </button>

        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // ҮНДСЭН ЦЭСНИЙ ХЭСЭГ 
  // ---------------------------------------------------------
  return (
    <div className="menu-container" style={{ paddingTop: '110px' }}>
      
      {/* 🔝 ХӨВДӨГ ТОЛГОЙ БОЛОН АНГИЛЛЫН СЕКЦ */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: '#ffffff', zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '10px 0' }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 10px 0', fontSize: '1.5rem', color: '#0f172a', fontWeight: '900' }}>🍽️ Зогсоо Хайрхан</h1>
        
        {/* Хэвтээ тэнхлэгээр гүйдэг ангиллууд */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '0 15px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                backgroundColor: activeCategory === cat ? '#1e293b' : '#f1f5f9',
                color: activeCategory === cat ? '#ffffff' : '#475569',
                transition: '0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 🍔 ХООЛНЫ ЖАГСААЛТ */}
      <div>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} ref={el => categoryRefs.current[cat] = el}>
            <h2 className="group-title" style={{ fontSize: '1.3rem', margin: '20px 15px 10px 15px', color: '#0f172a', fontWeight: '800' }}>{cat}</h2>
            {items.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id);
              const quantity = cartItem ? cartItem.quantity : 0;

              return (
                <div 
                  key={item.id} 
                  className="menu-item"
                  onClick={() => {
                    setSelectedItem(item);
                    setDetailQuantity(1);
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', margin: '0 15px 12px 15px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}
                >
                  <div className="item-info" style={{ flex: 1, paddingRight: '15px' }}>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '700' }}>{item.name}</h3>
                    <p className="item-price" style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#1e293b' }}>{item.price.toLocaleString()} ₮</p>
                    {quantity > 0 && (
                      <span style={{ display: 'inline-block', marginTop: '8px', backgroundColor: '#fff7ed', color: '#c2410c', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700' }}>
                        Сагсанд {quantity} ш байна
                      </span>
                    )}
                  </div>
                  
                  {/* Баруун талын хоолны зураг */}
                  <div style={{ position: 'relative', width: '85px', height: '85px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                    <img 
                      src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'} 
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 🛒 ЖАНБАГУНИ (ЖАГСААЛТ ХАРАХ ТОГТМОЛ ШАР ТОВЧЛУУР) */}
      {cart.length > 0 && !isCartOpen && (
        <div style={{ position: 'fixed', bottom: '20px', left: '15px', right: '15px', zIndex: 90 }}>
          <button 
            onClick={() => setIsCartOpen(true)}
            style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#ffcc00', color: '#1e293b', fontSize: '1.25rem', fontWeight: '900', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 24px rgba(255, 204, 0, 0.35)', cursor: 'pointer' }}
          >
            <span style={{ background: '#1e293b', color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '0.95rem' }}>{totalItemsCount}</span>
            <span>{totalPrice.toLocaleString()} ₮ • Сагс үзэх</span>
            <span>🛒</span>
          </button>
        </div>
      )}

      {/* 🔎 ХООЛНЫ ДЭЛГЭРЭНГҮЙ СУУРЬ ТОО СОНГОХ МОДАЛ ЦОНХ */}
      {selectedItem && (
        <div className="cart-modal-overlay" onClick={(e) => { if (e.target.className === 'cart-modal-overlay') setSelectedItem(null); }}>
          <div className="cart-modal-content" style={{ borderRadius: '24px 24px 0 0', padding: 0, overflow: 'hidden' }}>
            
            {/* Буцах дугуй товчлуур */}
            <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(255,255,255,0.9)', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              ⟨
            </button>

            {/* Том зураг */}
            <div style={{ width: '100%', height: '240px', backgroundColor: '#f1f5f9' }}>
              <img 
                src={selectedItem.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'} 
                alt={selectedItem.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Хоолны мэдээлэл */}
            <div style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#0f172a', fontWeight: '800' }}>{selectedItem.name}</h2>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e293b', borderBottom: '2px solid #0f172a', paddingBottom: '15px', marginBottom: '20px' }}>
                {selectedItem.price.toLocaleString()} ₮
              </div>

              {/* Суурь тоо сонгох хэсэг */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#475569' }}>Суурь тоо:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #cbd5e1', borderRadius: '25px', padding: '4px 12px', background: '#f8fafc' }}>
                  <button onClick={() => setDetailQuantity(prev => Math.max(1, prev - 1))} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', fontWeight: 'bold', width: '30px', cursor: 'pointer' }}>-</button>
                  <strong style={{ fontSize: '1.3rem', width: '30px', textAlign: 'center' }}>{detailQuantity}</strong>
                  <button onClick={() => setDetailQuantity(prev => prev + 1)} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', fontWeight: 'bold', width: '30px', cursor: 'pointer' }}>+</button>
                </div>
              </div>

              {/* ⚡ ШАР ТОД ТОВЧЛУУР: САТСАНД ХИЙХ */}
              <button 
                onClick={() => handleAddToWithQty(selectedItem, detailQuantity)}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#ffcc00', color: '#1e293b', fontSize: '1.25rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 204, 0, 0.3)' }}
              >
                {(selectedItem.price * detailQuantity).toLocaleString()} ₮ Сагсанд хийх
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🛍️ МИНИЙ САГС МОДАЛ ЦОНХ */}
      {isCartOpen && (
        <div className="cart-modal-overlay" onClick={(e) => { if (e.target.className === 'cart-modal-overlay') setIsCartOpen(false); }}>
          <div className="cart-modal-content" style={{ borderRadius: '24px 24px 0 0', padding: '24px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', fontWeight: '800' }}>Таны сагс</h2>
              <button className="close-modal-btn" onClick={() => setIsCartOpen(false)} style={{ background: '#f1f5f9', width: '36px', height: '36px', borderRadius: '50%', border: 'none' }}>✖</button>
            </div>

            <div className="cart-summary" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
              <ul className="cart-items-list" style={{ maxHeight: '200px', overflowY: 'auto', padding: 0, margin: '0 0 20px 0', borderBottom: '1px solid #f1f5f9' }}>
                {cart.map((item) => (
                  <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '1.15rem' }}>
                    <span style={{ color: '#334155', fontWeight: '700' }}>{item.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button onClick={() => updateCartQuantity(item.id, -1)} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '50%', width: '28px', height: '28px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                      <strong style={{ minWidth: '20px', textAlign: 'center' }}>{item.quantity}</strong>
                      <button onClick={() => updateCartQuantity(item.id, 1)} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '50%', width: '28px', height: '28px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '14px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Нийт төлөх дүн:</span>
                <strong style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: '900' }}>{totalPrice.toLocaleString()} ₮</strong>
              </div>
              
              <input type="number" placeholder="Таны утасны дугаар (Заавал)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1.1rem', marginBottom: '12px', boxSizing: 'border-box' }} />
              <select value={orderType} onChange={(e) => setOrderType(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1.1rem', marginBottom: '20px', boxSizing: 'border-box', backgroundColor: '#fff' }}>
                <option value="dine-in">🍽️ Сууж идэх</option>
                <option value="pickup">🛍️ Аваад явах</option>
              </select>
              
              <button className="order-btn" onClick={placeOrder} disabled={isSubmitting} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#ffcc00', color: '#1e293b', fontSize: '1.25rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 204, 0, 0.2)' }}>
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