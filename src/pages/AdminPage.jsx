import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [cancelledTotal, setCancelledTotal] = useState(0);
  const [soldItems, setSoldItems] = useState([]);

  // Auth болон Data fetch хийх хэсэг
  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchOrders();
  }, [isAuthenticated]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Нэвтрэхэд алдаа гарлаа!");
    setIsLoggingIn(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items (quantity, menu_items (name))`)
      .in('status', ['pending', 'cooking'])
      .order('created_at', { ascending: false });
    if (!error) setOrders(data);
    setIsLoadingOrders(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchOrders();
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' }}>
        <form onSubmit={handleLogin} style={{ padding: '40px', background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <h2>Админ нэвтрэх</h2>
          <input type="email" placeholder="И-мэйл" onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '15px', marginBottom: '10px' }} />
          <input type="password" placeholder="Нууц үг" onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '15px', marginBottom: '20px' }} />
          <button type="submit" style={{ width: '100%', padding: '15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '10px' }}>{isLoggingIn ? '...' : 'Нэвтрэх'}</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '30px' }}>👨‍🍳 Удирдлагын дэлгэц</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '30px' }}>
        {orders.map((order) => (
          <div key={order.id} style={{ 
            backgroundColor: 'white', padding: '30px', borderRadius: '20px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderTop: '15px solid #3498db' 
          }}>
            <h2 style={{ fontSize: '2.2rem', margin: '0 0 20px 0' }}>Захиалга №{order.id.slice(-4).toUpperCase()}</h2>
            <ul style={{ fontSize: '1.5rem', paddingLeft: '20px' }}>
              {order.order_items?.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '10px' }}>
                  {item.menu_items?.name} - <b>{item.quantity} ш</b>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button onClick={() => updateOrderStatus(order.id, 'cooking')} style={{ flex: 1, padding: '20px', fontSize: '1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px' }}>Төлбөр авсан</button>
              <button onClick={() => updateOrderStatus(order.id, 'completed')} style={{ flex: 1, padding: '20px', fontSize: '1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px' }}>Бэлэн боллоо</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminPage;