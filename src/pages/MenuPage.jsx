import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './MenuPage.css';

function MenuPage() {
  const [orderType, setOrderType] = useState(null); // 'dine_in' or 'pickup'
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['Бүгд']);
  const [selectedCategory, setSelectedCategory] = useState('Бүгд');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [note, setNote] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [finalOrderNumber, setFinalOrderNumber] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
      setMenuItems(data || []);

      const cats = ['Бүгд', ...new Set(data.map(item => item.category).filter(Boolean))];
      setCategories(cats);
    } catch (err) {
      console.error('Цэс татахад алдаа гарлаа:', err.message);
    }
  };

  const addToCart = (item) => {
    if (item.stock === 0) return;
    setCart(prevCart => {
      const existing = prevCart.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prevCart.map(cartItem => 
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Захиалга баталгаажуулах (Касс дээр төлөх горим)
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);

    try {
      // 1. orders хүснэгт рүү үндсэн захиалгыг хадгалах
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_type: orderType === 'dine_in' ? 'dine_in' : 'pickup',
          status: 'cooking',
          note: note,
          total_price: totalPrice
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. захиалга доторх хоолнуудыг order_items рүү хадгалах
      const orderItemsData = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        item_type: orderType === 'dine_in' ? 'dine_in' : 'pickup'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      setFinalOrderNumber(orderData.order_number || String(orderData.id).slice(-4).toUpperCase());
      setOrderPlaced(true);
      setCart([]);
      setNote('');
    } catch (err) {
      alert('Захиалга илгээхэд алдаа гарлаа: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'Бүгд' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 1. Захиалгын төрөл сонгох хуудас (Утсанд зориулж хэмжээг жижигрүүлж гоё болгосон)
  if (!orderType) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '480px', backgroundColor: 'white', padding: '30px 20px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 5vw, 1.8rem)', color: '#ea580c', margin: '0 0 8px 0', fontWeight: '800' }}>ЗОГСОО ХАЙРХАН</h2>
          <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '25px', fontWeight: '600' }}>Зоогийн газар • Тавтай морилно уу</p>
          
          <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', color: '#0f172a', marginBottom: '8px' }}>Захиалгын төрөл сонгоно уу</h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '25px' }}>Та доорх сонголтуудаас сонгож захиалгаа эхлүүлнэ үү</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button 
              onClick={() => setOrderType('dine_in')}
              style={{ padding: '20px 10px', backgroundColor: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '2rem' }}>🍽️</span>
              <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e40af' }}>ЗААЛАНД ИДЭХ</span>
            </button>

            <button 
              onClick={() => setOrderType('pickup')}
              style={{ padding: '20px 10px', backgroundColor: '#fff7ed', border: '2px solid #ea580c', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '2rem' }}>🛍️</span>
              <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#c2410c' }}>АВЧ ЯВАХ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Захиалга амжилттай өгөгдсөн үеийн дэлгэц (Касс дээр төлөх заавартай)
  if (orderPlaced) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '35px 25px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '60px', marginBottom: '15px' }}>🎉</div>
          <h2 style={{ color: '#0f172a', marginBottom: '10px', fontSize: '1.5rem' }}>Захиалга амжилттай илгээгдлээ!</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '20px' }}>Таны захиалгын дугаар:</p>
          <div style={{ fontSize: '3rem', fontWeight: '900', color: '#ea580c', backgroundColor: '#fff7ed', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '2px dashed #fed7aa' }}>
            #{finalOrderNumber}
          </div>
          
          {/* Касс дээр төлөх анхааруулга */}
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '15px', borderRadius: '10px', color: '#991b1b', fontWeight: 'bold', marginBottom: '25px', fontSize: '1.05rem' }}>
            💳 Касс дээр очоод тооцоогоо хийнэ үү!
          </div>

          <button 
            onClick={() => { setOrderPlaced(false); setOrderType(null); }}
            style={{ width: '100%', padding: '14px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
          >
            Шинэ захиалга өгөх
          </button>
        </div>
      </div>
    );
  }

  // 2 & 3. Меню болон сагсны хэсэг
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '90px', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: 'white', padding: '15px 20px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#ea580c', fontWeight: '800' }}>ЗОГСОО ХАЙРХАН</h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>
            {orderType === 'dine_in' ? '🍽️ Зааланд идэх' : '🛍️ Авч явах'}
          </span>
        </div>
        <button 
          onClick={() => setOrderType(null)}
          style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Төрөл солих
        </button>
      </div>

      {/* Search & Categories */}
      <div style={{ padding: '15px 20px' }}>
        <input 
          type="text" 
          placeholder="🔍 Хоол хайх..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white', marginBottom: '12px' }}
        />

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', cursor: 'pointer', backgroundColor: selectedCategory === cat ? '#ea580c' : 'white', color: selectedCategory === cat ? 'white' : '#64748b', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
        {filteredItems.map(item => {
          const isSoldOut = item.stock === 0;
          return (
            <div 
              key={item.id} 
              style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: isSoldOut ? 0.6 : 1, boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}
            >
              {item.image_url && (
                <div style={{ width: '100%', height: '120px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                  <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#1e293b' }}>{item.name}</h4>
                  <p style={{ margin: 0, color: '#ea580c', fontWeight: 'bold', fontSize: '0.95rem' }}>{item.price?.toLocaleString()} ₮</p>
                </div>
                <button 
                  onClick={() => addToCart(item)}
                  disabled={isSoldOut}
                  style={{ marginTop: '10px', width: '100%', padding: '10px', backgroundColor: isSoldOut ? '#94a3b8' : '#ea580c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isSoldOut ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}
                >
                  {isSoldOut ? 'Дууссан' : 'Сагслах'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {totalItemsCount > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '15px 20px', backgroundColor: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block' }}>Нийт үнэ ({totalItemsCount} ш)</span>
            <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{totalPrice.toLocaleString()} ₮</strong>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            style={{ padding: '12px 25px', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' }}
          >
            Сагсыг харах 🛒
          </button>
        </div>
      )}

      {/* Cart Modal / Drawer */}
      {isCartOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Таны сагс</h3>
              <button 
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#1e293b' }}>{item.name}</h4>
                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{(item.price * item.quantity).toLocaleString()} ₮</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Нэмэлт хүсэлт (сонголттой):</label>
                <textarea 
                  placeholder="Жишээ: Соус тусад нь өгөөрэй..." 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '60px', boxSizing: 'border-box', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            {/* Modal Footer / Checkout */}
            <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 'bold' }}>Нийт дүүн:</span>
                <strong style={{ fontSize: '1.3rem', color: '#0f172a' }}>{totalPrice.toLocaleString()} ₮</strong>
              </div>

              {/* Касс дээр төлөх сануулга */}
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '10px 12px', borderRadius: '8px', color: '#b45309', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
                ℹ️ Захиалга өгсний дараа касс дээр очоод тооцоогоо хийнэ үү.
              </div>

              <button 
                onClick={() => { setIsCartOpen(false); handleCheckout(); }}
                disabled={isLoading}
                style={{ width: '100%', padding: '15px', backgroundColor: isLoading ? '#94a3b8' : '#ea580c', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                {isLoading ? 'Илгээж байна...' : 'Захиалга баталгаажуулах'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default MenuPage;