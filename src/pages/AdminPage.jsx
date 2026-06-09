import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);

  const fetchPendingOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          menu_items (name)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setOrders(data || []);
  };

  useEffect(() => { fetchPendingOrders(); }, []);

  const confirmOrder = async (id) => {
    await supabase.from('orders').update({ status: 'paid' }).eq('id', id);
    fetchPendingOrders();
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>💳 Касс / Админ</h1>
      {orders.map(order => (
        <div key={order.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '10px', marginBottom: '10px' }}>
          <h3>Захиалга: #{order.id.slice(-4).toUpperCase()}</h3>
          <p>Ширээ: {order.table_number}</p>
          <ul>
            {order.order_items.map((item, idx) => (
              <li key={idx}>{item.menu_items?.name} - {item.quantity} ширхэг</li>
            ))}
          </ul>
          <button onClick={() => confirmOrder(order.id)} style={{ background: 'blue', color: 'white', padding: '10px', border: 'none', borderRadius: '5px' }}>
            Төлбөр баталгаажуулах
          </button>
        </div>
      ))}
    </div>
  );
}