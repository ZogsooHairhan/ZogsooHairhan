import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminPage() {
  // --- АУТЕНТИКАЦИ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("❌ Нэвтрэх алдаа!");
    setIsLoggingIn(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  // --- ҮНДСЭН ТӨЛӨВҮҮД ---
  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [cancelledTotal, setCancelledTotal] = useState(0);
  const [soldItems, setSoldItems] = useState([]);

  // --- 1. ЗАХИАЛГА ТАТАХ (ЗӨВ ХОЛБООС) ---
  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *, 
          order_items (
            quantity, 
            price, 
            menu_items (name)
          )
        `)
        .in('status', ['pending', 'cooking']) 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Алдаа:", err.message);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const channel = supabase
        .channel('realtime_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [isAuthenticated]);

  const updateOrderStatus = async (orderId, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchOrders();
  };

  // --- 2. ТАЙЛАН ---
  const fetchDailyReport = async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('orders')
      .select(`
        total_amount, status,
        order_items ( quantity, menu_items (name) )
      `)
      .gte('created_at', startOfToday.toISOString())
      .in('status', ['cooking', 'completed', 'cancelled']);

    let totalIncome = 0;
    let cancelledCount = 0;
    const itemsCount = {};

    data?.forEach(order => {
      if (order.status === 'cancelled') {
        cancelledCount++;
      } else {
        totalIncome += order.total_amount || 0;
        order.order_items.forEach(item => {
          const name = item.menu_items?.name || 'Устгагдсан хоол';
          itemsCount[name] = (itemsCount[name] || 0) + item.quantity;
        });
      }
    });

    setDailyTotal(totalIncome);
    setCancelledTotal(cancelledCount);
    setSoldItems(Object.entries(itemsCount).sort((a, b) => b[1] - a[1]));
  };

  // --- UI ХЭСЭГ ---
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <form onSubmit={handleLogin} style={{ padding: '40px', boxShadow: '0 0 20px rgba(0,0,0,0.1)' }}>
          <h2>Админ нэвтрэх</h2>
          <input type="email" placeholder="И-мэйл" onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Нууц үг" onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">Нэвтрэх</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>👨‍🍳 Удирдлагын дэлгэц</h1>
      <nav>
        <button onClick={() => setActiveTab('orders')}>📋 Захиалгууд</button>
        <button onClick={() => {setActiveTab('report'); fetchDailyReport();}}>📊 Тайлан</button>
        <button onClick={handleLogout}>🚪 Гарах</button>
      </nav>

      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
          {orders.map((order) => (
            <div key={order.id} style={{ border: '1px solid #ccc', padding: '15px' }}>
              {/* ЭНД Захиалгын дугаарыг order_number-ээр нь харуулж байна */}
              <h3>Захиалга #{order.order_number || order.id.slice(-4)}</h3>
              <p>Төрөл: {order.order_type}</p>
              <ul>
                {order.order_items?.map((item, idx) => (
                  <li key={idx}>{item.menu_items?.name} - {item.quantity}ш</li>
                ))}
              </ul>
              <button onClick={() => updateOrderStatus(order.id, 'cooking')}>Төлбөр авсан</button>
              <button onClick={() => updateOrderStatus(order.id, 'completed')}>Бэлэн боллоо</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'report' && (
        <div>
          <h2>Өнөөдрийн орлого: {dailyTotal.toLocaleString()} ₮</h2>
          <p>Цуцлагдсан: {cancelledTotal}ш</p>
        </div>
      )}
    </div>
  );
}

export default AdminPage;