import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);

  const fetchPaidOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          menu_items (name)
        )
      `)
      .eq('status', 'paid')
      .order('created_at', { ascending: true });
    setOrders(data || []);
  };

  useEffect(() => {
    fetchPaidOrders();
    const channel = supabase.channel('kitchen-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPaidOrders)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const markAsDone = async (id) => {
    await supabase.from('orders').update({ status: 'completed' }).eq('id', id);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>👨‍🍳 Гал тогоо</h1>
      {orders.map(order => (
        <div key={order.id} style={{ border: '2px solid orange', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
          <h3>Захиалга: #{order.id.slice(-4).toUpperCase()}</h3>
          <p>Ширээ: {order.table_number}</p>
          <ul>
            {order.order_items.map((item, idx) => (
              <li key={idx}><strong>{item.menu_items?.name}</strong> x {item.quantity}</li>
            ))}
          </ul>
          <button onClick={() => markAsDone(order.id)} style={{ background: 'green', color: 'white', padding: '15px', width: '100%', border: 'none', borderRadius: '5px' }}>
            ✅ Бэлэн боллоо
          </button>
        </div>
      ))}
    </div>
  );
}