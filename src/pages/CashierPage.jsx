import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const RUB_RATE_KEY = 'zogsoo-rub-rate';
const PAYMENT_LABELS = { cash: 'Бэлэн', ruble: 'Рубль', card: 'Карт', qpay: 'QPay', transfer: 'Данс' };

function CashierPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

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
  const [receivedCash, setReceivedCash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false); // хоёр удаа хурдан дарахад давхар захиалга үүсэхээс сэргийлнэ

  // ₽ Рублийн төлбөр: ханшийг энэ төхөөрөмж дээр хадгална (1 ₽ = ? ₮)
  const [rubRate, setRubRate] = useState(() => {
    try { return localStorage.getItem(RUB_RATE_KEY) || ''; } catch { return ''; }
  });
  const [receivedRub, setReceivedRub] = useState('');
  const [rubField, setRubField] = useState('received'); // 'rate' | 'received'
  const [rubReplaceNext, setRubReplaceNext] = useState(false);

  const [historyOrders, setHistoryOrders] = useState([]);

  // Хоол нэмэх модал төлөвүүд
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');
  const [newMenuCategory, setNewMenuCategory] = useState('');
  const [isAddingMenu, setIsAddingMenu] = useState(false);

  const fetchMenu = async () => {
    try {
      // Цэсийг татахдаа дууссан байсан ч харуулна (гэхдээ саарал болгоно)
      const { data, error } = await supabase.from('menu_items').select('*').order('is_active', { ascending: false }).order('name');
      if (error) throw error;
      setMenuItems(data);
    } catch (err) {
      console.error("Цэс татахад алдаа:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    fetchMenu();
    // Гал тогоо хоолыг "ДУУССАН" болгох, үлдэгдэл өөрчлөхөд касс 1 минутын дотор мэдэнэ.
    const timer = setInterval(fetchMenu, 60000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

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
    if (!item.is_active || item.stock === 0) return alert("Энэ хоол дууссан байна!");

    setCart((prev) => {
      // Нэг хоолыг "Зааланд", "Авч явах" гэж тусад нь нэмсэн ч үлдэгдлийг нийлбэрээр нь шалгана
      const inCart = prev.filter(c => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0);
      if (item.stock !== null && inCart + 1 > item.stock) {
        alert(inCart === 0 ? `Уучлаарай, ${item.name} дууссан байна!` : `Уучлаарай, ${item.name} зөвхөн ${item.stock} ширхэг үлдсэн байна!`);
        return prev;
      }
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
        const otherQty = prev.filter(c => c.id === item.id && c.cartId !== cartId).reduce((sum, c) => sum + c.quantity, 0);
        if (delta > 0 && item.stock !== null && newQty + otherQty > item.stock) {
          alert(`Уучлаарай, ${item.name} зөвхөн ${item.stock} ширхэг үлдсэн байна!`);
          return item;
        }
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
  const cashOk = receivedCash === '' || changeAmount >= 0; // хоосон бол "таарсан" гэж үзнэ

  const rate = parseFloat(String(rubRate).replace(',', '.'));
  const isRateValid = Number.isFinite(rate) && rate > 0;
  const rubToPay = isRateValid ? Math.ceil(totalPrice / rate) : 0; // бүхэл рубль хүртэл дээш бөөрөнхийлнө
  const rubChange = Number(receivedRub) - rubToPay;
  const rubChangeMnt = isRateValid ? Math.round(rubChange * rate) : 0;

  const updateRubRate = (value) => {
    const cleaned = value.replace(/[^0-9.,]/g, '');
    setRubRate(cleaned);
    try { localStorage.setItem(RUB_RATE_KEY, cleaned); } catch { /* хадгалах боломжгүй бол зөвхөн энэ удаад */ }
  };

  // Рублийн алхамд нэг тоон товчлуур "Ханш" эсвэл "Өгсөн рубль" нүдийг бөглөнө (iPad-ын гар гарахгүй).
  // Нүдийг товшиж сонгоход эхний товч хуучин утгыг сольж бичнэ.
  const openRubStep = () => {
    setRubField(isRateValid ? 'received' : 'rate');
    setRubReplaceNext(true);
    setPaymentStep(3);
  };

  const selectRubField = (field) => {
    setRubField(field);
    setRubReplaceNext(true);
  };

  const handleRubKeypad = (value) => {
    const isDigit = /^\d+$/.test(value) && value.length <= 3 && value !== '500';
    if (rubField === 'rate') {
      const base = rubReplaceNext ? '' : String(rubRate);
      let next;
      if (value === 'C') next = '';
      else if (value === 'DEL') next = String(rubRate).slice(0, -1);
      else if (value === '.') next = /[.,]/.test(base) ? base : (base === '' ? '0.' : `${base}.`);
      else if (isDigit) next = (base === '0' ? value : base + value).slice(0, 8);
      else return; // рублийн хурдан товчнууд ханшид хамаарахгүй
      updateRubRate(next);
      setRubReplaceNext(false);
      return;
    }

    const base = rubReplaceNext ? '' : String(receivedRub);
    if (value === 'C') setReceivedRub('');
    else if (value === 'DEL') setReceivedRub(String(receivedRub).slice(0, -1));
    else if (value === 'EXACT') setReceivedRub(String(rubToPay));
    else if (value === '500' || value === '1000') setReceivedRub(value);
    else if (isDigit) setReceivedRub((base === '0' && value !== '0' && value !== '000') ? value : (base + value).slice(0, 9));
    else return;
    setRubReplaceNext(false);
  };

  const rubPadBtn = { padding: '8px 4px', minHeight: '46px', fontSize: '1.25rem', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#0f172a', cursor: 'pointer' };
  const rubTile = (active, invalid) => ({
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '2px', padding: '8px 10px',
    borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
    border: `2px solid ${active ? '#0f766e' : (invalid ? '#f87171' : '#cbd5e1')}`,
    backgroundColor: active ? '#f0fdfa' : '#f8fafc',
    boxShadow: active ? '0 0 0 3px rgba(15, 118, 110, 0.18)' : 'none',
  });

  const handleProcessPayment = async (paymentMethod) => {
    if (paymentMethod === 'cash' && receivedCash !== '' && Number(receivedCash) < totalPrice) {
      return alert('Өгсөн мөнгө хүрэхгүй байна!');
    }
    if (paymentMethod === 'ruble') {
      if (!isRateValid) return alert('Рублийн ханшаа оруулна уу!');
      if (receivedRub !== '' && Number(receivedRub) < rubToPay) return alert('Өгсөн рубль хүрэхгүй байна!');
    }
    if (cart.length === 0) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    setIsSubmitting(true);
    try {
      const uniqueTypes = [...new Set(cart.map(item => item.itemType))];
      const mainOrderType = uniqueTypes.length === 1 ? uniqueTypes[0] : 'mixed';

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ total_amount: totalPrice, order_type: mainOrderType, status: 'cooking', payment_method: paymentMethod, note: orderNote }])
        .select();

      if (orderError) throw orderError;
      const newOrder = orderData[0];

      const orderItemsData = cart.map((item) => ({
        order_id: newOrder.id, menu_item_id: item.id, quantity: item.quantity, price: item.price, item_type: item.itemType
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) {
        // Хоол нь хадгалагдаагүй захиалга гал тогоонд хоосон, тайланд илүү орлого болж үлдэхгүйн тулд цуцална
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', newOrder.id);
        throw new Error(`Хоолны жагсаалт хадгалагдсангүй, захиалгыг цуцаллаа. Дахин оролдоно уу.\n(${itemsError.message})`);
      }

      // Үлдэгдлийг хасах: гал тогоо өөрчилсөн байж болох тул хамгийн сүүлийн тоог авч хасна
      const stockIds = [...new Set(cart.filter(item => item.stock !== null).map(item => item.id))];
      if (stockIds.length) {
        const { data: fresh } = await supabase.from('menu_items').select('id, stock').in('id', stockIds);
        for (const id of stockIds) {
          const sold = cart.filter(item => item.id === id).reduce((sum, item) => sum + item.quantity, 0);
          const current = fresh?.find(m => m.id === id)?.stock;
          if (current === null) continue; // энэ хооронд хязгааргүй болгосон
          const base = typeof current === 'number' ? current : cart.find(item => item.id === id).stock;
          const newStock = Math.max(0, base - sold);
          await supabase.from('menu_items').update({ stock: newStock, is_active: newStock > 0 }).eq('id', id);
        }
      }

      alert(`Захиалга баталгаажлаа!\nДугаар: #${newOrder.order_number || String(newOrder.id).slice(-4).toUpperCase()}`);

      setCart([]); setOrderNote(''); setReceivedCash(''); setReceivedRub(''); setPaymentStep(1); setIsPaymentModalOpen(false);
      fetchMenu(); // Цэсийг шинэчилж үлдэгдлийг дахин дуудна

    } catch (err) {
      // 23514: өгөгдлийн сангийн дүрэм энэ төлбөрийн төрлийг (жишээ нь шинэ "Рубль") зөвшөөрөөгүй.
      if (err.code === '23514') {
        alert("Алдаа гарлаа: Энэ төлбөрийн төрлийг өгөгдлийн сан хүлээж авсангүй. Захиалга хадгалагдаагүй тул өөр төрлөөр төлүүлнэ үү.\n(" + err.message + ")");
      } else {
        alert("Алдаа гарлаа: " + err.message);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Шинэ хоол нэмэх функц (Кассчин шууд нэмнэ)
  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    if (!newMenuName.trim() || !newMenuPrice || !newMenuCategory.trim()) return alert("Мэдээллийг бүрэн оруулна уу!");
    if (!(Number(newMenuPrice) > 0)) return alert("Үнэ 0-ээс их байх ёстой!");
    setIsAddingMenu(true);
    try {
      const { error } = await supabase.from('menu_items').insert([{
        name: newMenuName.trim(), price: Number(newMenuPrice), category: newMenuCategory.trim(), is_active: true, stock: null
      }]);
      if (error) throw error;
      alert("Шинэ хоол амжилттай нэмэгдлээ!");
      setIsAddMenuModalOpen(false);
      setNewMenuName(''); setNewMenuPrice(''); setNewMenuCategory('');
      fetchMenu(); 
    } catch (err) { alert("Алдаа гарлаа: " + err.message); } 
    finally { setIsAddingMenu(false); }
  };

  const handleKeypad = (value) => {
    if (value === 'C') setReceivedCash('');
    else if (value === 'DEL') setReceivedCash(prev => String(prev).slice(0, -1));
    else if (value === 'EXACT') setReceivedCash(String(totalPrice));
    else if (value === '20000' || value === '50000') setReceivedCash(value);
    else setReceivedCash(prev => { const current = String(prev); if (current === '0' && value !== '0' && value !== '000') return value; return (current + value).slice(0, 9); });
  };

  const openPaymentModal = () => {
    // Өмнө нь цуцалсан тооцооны үлдсэн дүн дараагийн захиалгад орохгүй
    setReceivedCash(''); setReceivedRub(''); setPaymentStep(1); setIsPaymentModalOpen(true);
  };

  const getTypeLabel = (type) => { if(type === 'pickup') return 'Авч явах'; if(type === 'tuva') return 'Тува'; return 'Зааланд'; };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: "'Onest', Arial, sans-serif", fontWeight: 500 }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center', width: '340px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d3264', marginBottom: '4px' }}>Зогсоо Хайрхан</div>
          <h2 style={{ margin: '0 0 20px', color: '#0f172a', fontSize: '1.1rem' }}>Касс нэвтрэх</h2>
          <input type="email" placeholder="И-мэйл" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '12px', fontSize: '1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#0f172a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Нэвтрэх</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Onest', Arial, sans-serif", fontWeight: 500, backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 'bold', textAlign: 'left', border: 'none', padding: 0 }}>
                <span style={{ color: '#1d3264', fontWeight: 800 }}>Зогсоо Хайрхан</span>
                <span style={{ color: '#94a3b8', fontWeight: 400, margin: '0 10px' }}>|</span>Касс
              </h1>
              <button onClick={() => setIsAddMenuModalOpen(true)} style={{ padding: '8px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Шинэ хоол</button>
            </div>
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
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: activeCategory === cat ? '#0f172a' : 'white', color: activeCategory === cat ? 'white' : '#475569' }}>{cat}</button>
                ))}
              </div>

              {isLoading ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>Цэсийг уншиж байна...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {filteredMenu.map(item => {
                    const isOutOfStock = !item.is_active || item.stock === 0;
                    return (
                      <div key={item.id} onClick={() => !isOutOfStock && addToCart(item)} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '15px', cursor: isOutOfStock ? 'not-allowed' : 'pointer', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '80px', transition: '0.1s', opacity: isOutOfStock ? 0.4 : 1 }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#1e293b' }}>{item.name}</h3>
                        <div style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '1.1rem', marginBottom: '5px' }}>{Number(item.price || 0).toLocaleString()} ₮</div>
                        {isOutOfStock ? (
                          <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold' }}>ДУУССАН</span>
                        ) : (
                          item.stock !== null && <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>Үлдсэн: {item.stock}ш</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <tr><th style={{ padding: '12px', textAlign: 'left' }}>Цаг</th><th style={{ padding: '12px', textAlign: 'left' }}>Дугаар</th><th style={{ padding: '12px', textAlign: 'left' }}>Төрөл</th><th style={{ padding: '12px', textAlign: 'left' }}>Дүн</th><th style={{ padding: '12px', textAlign: 'left' }}>Төлбөр</th><th style={{ padding: '12px', textAlign: 'left' }}>Төлөв</th></tr>
                </thead>
                <tbody>
                  {historyOrders.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Өнөөдөр гүйлгээ алга байна.</td></tr>
                  )}
                  {historyOrders.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>{new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>#{order.order_number || String(order.id).slice(-4).toUpperCase()}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{order.order_type === 'pickup' ? 'Авч явах' : (order.order_type === 'tuva' ? 'Тува' : (order.order_type === 'mixed' ? 'Холимог' : 'Зааланд'))}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{order.total_amount?.toLocaleString()} ₮</td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{PAYMENT_LABELS[order.payment_method] || order.payment_method || '—'}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: order.status === 'completed' ? '#dcfce7' : (order.status === 'cancelled' ? '#fee2e2' : '#fef3c7'), color: order.status === 'completed' ? '#16a34a' : (order.status === 'cancelled' ? '#dc2626' : '#d97706') }}>{order.status === 'completed' ? 'Бэлэн' : (order.status === 'cancelled' ? 'Цуцлагдсан' : 'Хийгдэж буй')}</span></td>
                    </tr>
                  ))}
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
            {cart.map((item) => (
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
            ))}
          </div>

          <div style={{ padding: '20px', borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ color: '#64748b', fontWeight: 'bold' }}>Нийт дүн:</span>
              <strong style={{ fontSize: '1.6rem', color: '#0f172a' }}>{totalPrice.toLocaleString()} ₮</strong>
            </div>
            <button onClick={openPaymentModal} disabled={cart.length === 0} style={{ width: '100%', padding: '16px', backgroundColor: cart.length === 0 ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}>Тооцоо хийх</button>
          </div>
        </div>
      )}

      {/* ХООЛ НЭМЭХ МОДАЛ */}
      {isAddMenuModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#0f172a' }}>Шинэ хоол нэмэх</h2>
            <form onSubmit={handleAddMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Хоолны нэр:</label><input type="text" value={newMenuName} onChange={e => setNewMenuName(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '5px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Үнэ (MNT):</label><input type="number" value={newMenuPrice} onChange={e => setNewMenuPrice(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '5px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Ангилал:</label><input type="text" value={newMenuCategory} onChange={e => setNewMenuCategory(e.target.value)} required placeholder="Жишээ: Үндсэн хоол" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '5px', boxSizing: 'border-box' }} /></div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddMenuModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Цуцлах</button>
                <button type="submit" disabled={isAddingMenu} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>{isAddingMenu ? 'Нэмж байна...' : 'Хадгалах'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ТӨЛБӨРИЙН МОДАЛ (Numpad) */}
      {isPaymentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px 24px', borderRadius: '8px', width: '100%', maxWidth: '400px', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px', textAlign: 'center' }}><h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.6rem' }}>{totalPrice.toLocaleString()} ₮</h2></div>
            {paymentStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => setPaymentStep(2)} disabled={isSubmitting} style={{ padding: '15px', borderRadius: '8px', border: '2px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>Бэлэн мөнгө</button>
                <button onClick={openRubStep} disabled={isSubmitting} style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#0f766e', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>Рубль (₽)</button>
                <button onClick={() => handleProcessPayment('card')} disabled={isSubmitting} style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>Карт</button>
                <button onClick={() => handleProcessPayment('qpay')} disabled={isSubmitting} style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#f59e0b', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>QPay</button>
                <button onClick={() => handleProcessPayment('transfer')} disabled={isSubmitting} style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#8b5cf6', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>Данс</button>
                <button onClick={() => setIsPaymentModalOpen(false)} style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#ef4444', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>Цуцлах</button>
              </div>
            )}
            {paymentStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Өгсөн мөнгө ба хариулт хажуу хажуудаа — цонх жижиг, iPad-д багтана */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ border: '2px solid #3b82f6', backgroundColor: '#eff6ff', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ color: '#1e3a8a', fontSize: '0.85rem', fontWeight: 700 }}>Өгсөн мөнгө</div>
                    <div id="cash-received" style={{ color: '#0f172a', fontSize: '1.4rem', fontWeight: 800, textAlign: 'right' }}>{receivedCash ? Number(receivedCash).toLocaleString() : '0'} ₮</div>
                  </div>
                  <div style={{ backgroundColor: cashOk ? '#dcfce7' : '#fee2e2', border: `1px solid ${cashOk ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ color: cashOk ? '#166534' : '#991b1b', fontSize: '0.85rem', fontWeight: 700 }}>Хариулах дүн</div>
                    <div id="cash-change" style={{ color: cashOk ? '#15803d' : '#b91c1c', fontSize: '1.4rem', fontWeight: 800, textAlign: 'right' }}>{receivedCash === '' ? '0' : changeAmount.toLocaleString()} ₮</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <button onClick={() => handleKeypad('1')} style={rubPadBtn}>1</button><button onClick={() => handleKeypad('2')} style={rubPadBtn}>2</button><button onClick={() => handleKeypad('3')} style={rubPadBtn}>3</button><button onClick={() => handleKeypad('DEL')} style={{...rubPadBtn, backgroundColor: '#e2e8f0', color: '#475569'}}>⌫</button>
                  <button onClick={() => handleKeypad('4')} style={rubPadBtn}>4</button><button onClick={() => handleKeypad('5')} style={rubPadBtn}>5</button><button onClick={() => handleKeypad('6')} style={rubPadBtn}>6</button><button onClick={() => handleKeypad('20000')} style={{...rubPadBtn, backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '0.95rem'}}>20,000</button>
                  <button onClick={() => handleKeypad('7')} style={rubPadBtn}>7</button><button onClick={() => handleKeypad('8')} style={rubPadBtn}>8</button><button onClick={() => handleKeypad('9')} style={rubPadBtn}>9</button><button onClick={() => handleKeypad('50000')} style={{...rubPadBtn, backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '0.95rem'}}>50,000</button>
                  <button onClick={() => handleKeypad('C')} style={{...rubPadBtn, backgroundColor: '#fee2e2', color: '#ef4444'}}>C</button><button onClick={() => handleKeypad('0')} style={rubPadBtn}>0</button><button onClick={() => handleKeypad('000')} style={rubPadBtn}>000</button><button onClick={() => handleKeypad('EXACT')} style={{...rubPadBtn, backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.95rem'}}>Таарсан</button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setPaymentStep(1)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.05rem' }}>Буцах</button>
                  <button onClick={() => handleProcessPayment('cash')} disabled={isSubmitting || (receivedCash !== '' && changeAmount < 0)} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>{isSubmitting ? 'Уншиж байна...' : 'Баталгаажуулах'}</button>
                </div>
              </div>
            )}
            {paymentStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Аль нүдийг бөглөхөө товшиж сонгоно */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" id="rub-rate" aria-pressed={rubField === 'rate'} onClick={() => selectRubField('rate')} style={rubTile(rubField === 'rate', !isRateValid)}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Ханш: 1 ₽ = ? ₮</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: '900', color: rubRate ? '#0f172a' : '#94a3b8', textAlign: 'right' }}>{rubRate || 'оруулах'}</span>
                  </button>
                  <button type="button" id="rub-received" aria-pressed={rubField === 'received'} onClick={() => selectRubField('received')} style={rubTile(rubField === 'received', false)}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Өгсөн рубль (₽)</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>{receivedRub ? Number(receivedRub).toLocaleString() : '0'}</span>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ color: '#0f766e', fontSize: '0.8rem', fontWeight: 'bold' }}>Төлөх дүн</div>
                    <div style={{ color: '#0f766e', fontSize: isRateValid ? '1.4rem' : '0.95rem', fontWeight: '900', textAlign: 'right' }}>{isRateValid ? `${rubToPay.toLocaleString()} ₽` : 'Ханшаа оруулна уу'}</div>
                  </div>
                  <div style={{ backgroundColor: rubChange >= 0 ? '#dcfce7' : '#fee2e2', border: `1px solid ${rubChange >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ color: rubChange >= 0 ? '#166534' : '#991b1b', fontSize: '0.8rem', fontWeight: 'bold' }}>Хариулах дүн</div>
                    <div style={{ color: rubChange >= 0 ? '#15803d' : '#b91c1c', fontSize: '1.4rem', fontWeight: '900', textAlign: 'right' }}>{receivedRub === '' ? '0' : rubChange.toLocaleString()} ₽</div>
                    {receivedRub !== '' && isRateValid && (
                      <div style={{ color: rubChange >= 0 ? '#166534' : '#991b1b', fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'right' }}>≈ {rubChangeMnt.toLocaleString()} ₮</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <button onClick={() => handleRubKeypad('1')} style={rubPadBtn}>1</button><button onClick={() => handleRubKeypad('2')} style={rubPadBtn}>2</button><button onClick={() => handleRubKeypad('3')} style={rubPadBtn}>3</button><button onClick={() => handleRubKeypad('DEL')} style={{...rubPadBtn, backgroundColor: '#e2e8f0', color: '#475569'}}>⌫</button>
                  <button onClick={() => handleRubKeypad('4')} style={rubPadBtn}>4</button><button onClick={() => handleRubKeypad('5')} style={rubPadBtn}>5</button><button onClick={() => handleRubKeypad('6')} style={rubPadBtn}>6</button><button onClick={() => handleRubKeypad('500')} disabled={rubField === 'rate'} style={{...rubPadBtn, backgroundColor: '#ccfbf1', color: '#0f766e', fontSize: '0.95rem', opacity: rubField === 'rate' ? 0.35 : 1}}>500 ₽</button>
                  <button onClick={() => handleRubKeypad('7')} style={rubPadBtn}>7</button><button onClick={() => handleRubKeypad('8')} style={rubPadBtn}>8</button><button onClick={() => handleRubKeypad('9')} style={rubPadBtn}>9</button><button onClick={() => handleRubKeypad('1000')} disabled={rubField === 'rate'} style={{...rubPadBtn, backgroundColor: '#ccfbf1', color: '#0f766e', fontSize: '0.95rem', opacity: rubField === 'rate' ? 0.35 : 1}}>1,000 ₽</button>
                  <button onClick={() => handleRubKeypad('C')} style={{...rubPadBtn, backgroundColor: '#fee2e2', color: '#ef4444'}}>C</button><button onClick={() => handleRubKeypad('0')} style={rubPadBtn}>0</button>
                  {rubField === 'rate'
                    ? <button onClick={() => handleRubKeypad('.')} style={rubPadBtn}>.</button>
                    : <button onClick={() => handleRubKeypad('000')} style={rubPadBtn}>000</button>}
                  <button onClick={() => handleRubKeypad('EXACT')} disabled={!isRateValid || rubField === 'rate'} style={{...rubPadBtn, backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.95rem', opacity: (!isRateValid || rubField === 'rate') ? 0.35 : 1}}>Таарсан</button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setPaymentStep(1)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.05rem' }}>Буцах</button>
                  <button onClick={() => handleProcessPayment('ruble')} disabled={isSubmitting || !isRateValid || (receivedRub !== '' && rubChange < 0)} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: isRateValid ? '#0f766e' : '#94a3b8', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>{isSubmitting ? 'Уншиж байна...' : 'Баталгаажуулах'}</button>
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