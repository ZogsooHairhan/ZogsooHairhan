import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);

  const fetchPendingOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending') // Зөвхөн хүлээгдэж буй захиалгууд
      .order('created_at', { ascending: true });
    setOrders(data || []);
  };

  useEffect(() => { fetchPendingOrders(); }, []);

  const confirmOrder = async (id) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'paid' }) // Төлбөр хийгдсэнийг баталгаажуулна
      .eq('id', id);
    
    if (!error) {
      alert("Гал тогоо руу илгээгдлээ!");
      fetchPendingOrders();
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>💳 Касс / Админ</h1>
      {orders.map(order => (
        <div key={order.id} style={{ border: '1px solid gray', padding: '10px', marginBottom: '10px' }}>
          <p>Ширээ: {order.table_number} - {order.total_amount} ₮</p>
          <button onClick={() => confirmOrder(order.id)} style={{ background: 'blue', color: 'white' }}>
            Төлбөр баталгаажуулах (Paid)
          </button>
        </div>
      ))}
    </div>
  );
}