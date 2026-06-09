import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);

  const fetchPaidOrders = async () => {
    // Зөвхөн status нь 'paid' байгаа захиалгуудыг татна
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .order('created_at', { ascending: true });
    
    if (error) console.error("Алдаа:", error);
    else setOrders(data || []);
  };

  useEffect(() => {
    fetchPaidOrders();
    // Realtime тохиргоо (шинэ захиалга ирэхэд автоматаар шинэчлэгдэнэ)
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPaidOrders)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const markAsDone = async (id) => {
    await supabase.from('orders').update({ status: 'completed' }).eq('id', id);
    fetchPaidOrders();
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>👨‍🍳 Гал тогооны дэлгэц</h1>
      {orders.length === 0 ? <p>Одоогоор шинэ захиалга алга.</p> : orders.map(order => (
        <div key={order.id} style={{ border: '2px solid orange', padding: '15px', marginBottom: '10px' }}>
          <h3>Ширээ: {order.table_number}</h3>
          <p>Захиалгын ID: {order.id.slice(-4)}</p>
          <button onClick={() => markAsDone(order.id)} style={{ background: 'green', color: 'white', padding: '10px' }}>
            ✅ Бэлэн боллоо
          </button>
        </div>
      ))}
    </div>
  );
}