import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ReportPage() {
  // ==============================================
  // 🔒 AUTH (НЭВТРЭХ ХЭСЭГ)
  // ==============================================
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
    if (error) alert("❌ Нэвтрэх алдаа: И-мэйл эсвэл нууц үг буруу байна.");
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ==============================================
  // 📊 ТАЙЛАНГИЙН ТӨЛӨВҮҮД БОЛОН ЛОГИК
  // ==============================================
  const [reportFilter, setReportFilter] = useState('today'); // 'today' эсвэл 'month'
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportData, setReportData] = useState({
    totalAmount: 0, orderCount: 0, cancelledCount: 0, topItems: [], compareText: '', comparePercent: 0, diffAmount: 0
  });

  useEffect(() => {
    if (isAuthenticated) fetchAdvancedReport(reportFilter);
  }, [isAuthenticated, reportFilter]);

  const fetchAdvancedReport = async (filter) => {
    setIsReportLoading(true);
    try {
      const now = new Date();
      let startDate, endDate, prevStartDate, prevEndDate;

      if (filter === 'today') {
        startDate = new Date(now.setHours(0,0,0,0));
        endDate = new Date(now.setHours(23,59,59,999));
        const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
        prevStartDate = new Date(yesterday.setHours(0,0,0,0));
        prevEndDate = new Date(yesterday.setHours(23,59,59,999));
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      }

      const { data: currentData, error: currentError } = await supabase
        .from('orders')
        .select(`total_amount, status, order_items (quantity, price, menu_items (name))`)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['completed', 'cancelled']);

      if (currentError) throw currentError;

      const { data: prevData } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString())
        .eq('status', 'completed');

      let total = 0, count = 0, cancelled = 0, itemMap = {};

      currentData?.forEach(order => {
        if (order.status === 'cancelled') cancelled++;
        else {
          total += order.total_amount || 0;
          count++;
          order.order_items?.forEach(item => {
            const name = item.menu_items?.name || 'Устгагдсан хоол';
            if (!itemMap[name]) itemMap[name] = { qty: 0, revenue: 0 };
            itemMap[name].qty += item.quantity;
            itemMap[name].revenue += (item.quantity * (item.price || 0));
          });
        }
      });

      const prevTotal = prevData?.reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0;
      const diff = total - prevTotal;
      const percent = prevTotal === 0 ? (total > 0 ? 100 : 0) : ((diff / prevTotal) * 100);

      setReportData({
        totalAmount: total, orderCount: count, cancelledCount: cancelled,
        topItems: Object.entries(itemMap).sort((a, b) => b[1].qty - a[1].qty),
        compareText: filter === 'today' ? 'Өчигдөртэй харьцуулахад' : 'Өмнөх сартай харьцуулахад',
        comparePercent: percent.toFixed(1), diffAmount: diff
      });
    } catch (err) {
      console.error("Тайлан татахад алдаа:", err.message);
    } finally {
      setIsReportLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center', width: '340px' }}>
          <div style={{ fontSize: '50px', marginBottom: '15px' }}>📈</div>
          <h2 style={{ marginBottom: '10px', color: '#0f172a' }}>Санхүүгийн тайлан</h2>
          <p style={{ color: '#64748b', marginBottom: '25px', fontSize: '0.9rem' }}>Зөвхөн эрх бүхий удирдлага нэвтэрнэ үү</p>
          <input type="email" placeholder="И-мэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '15px', fontSize: '1.1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLoggingIn ? 'Шалгаж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* ТОЛГОЙ ХЭСЭГ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: 'clamp(1.6rem, 4vw, 2.3rem)' }}>📈 Санхүүгийн Тайлан</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.location.href = '/admin'} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'white', color: '#475569' }}>
            ⬅️ Админ руу буцах
          </button>
          <button onClick={handleLogout} style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white' }}>
            🚪 Гарах
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', backgroundColor: 'white', padding: '10px', borderRadius: '12px', width: 'fit-content', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <button onClick={() => setReportFilter('today')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: reportFilter === 'today' ? '#0f172a' : 'transparent', color: reportFilter === 'today' ? 'white' : '#64748b' }}>📅 Өнөөдөр</button>
          <button onClick={() => setReportFilter('month')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: reportFilter === 'month' ? '#0f172a' : 'transparent', color: reportFilter === 'month' ? 'white' : '#64748b' }}>📆 Энэ сар</button>
        </div>

        {isReportLoading ? (
          <h2 style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>Тайлан нэгтгэж байна...</h2>
        ) : (
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '1.2rem', fontWeight: '600' }}>{reportFilter === 'today' ? 'Өнөөдрийн орлого' : 'Энэ сарын орлого'}</h3>
                <h1 style={{ margin: 0, color: '#0f172a', fontSize: '3rem', fontWeight: '900' }}>{reportData.totalAmount.toLocaleString()} ₮</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: '800', padding: '4px 8px', borderRadius: '6px', backgroundColor: reportData.diffAmount >= 0 ? '#dcfce7' : '#fee2e2', color: reportData.diffAmount >= 0 ? '#16a34a' : '#ef4444' }}>
                    {reportData.diffAmount >= 0 ? '▲' : '▼'} {Math.abs(reportData.comparePercent)}%
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{reportData.compareText}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#64748b', fontWeight: '600' }}>Захиалгын тоо</h4>
                  <span style={{ fontSize: '2rem', color: '#3b82f6', fontWeight: '900' }}>{reportData.orderCount} <span style={{fontSize:'1rem'}}>ш</span></span>
                </div>
                <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#64748b', fontWeight: '600' }}>Цуцлагдсан</h4>
                  <span style={{ fontSize: '2rem', color: '#ef4444', fontWeight: '900' }}>{reportData.cancelledCount} <span style={{fontSize:'1rem'}}>ш</span></span>
                </div>
              </div>
            </div>

            <div style={{ flex: '2 1 450px', backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '1.4rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', fontWeight: '800' }}>🍽️ Борлуулагдсан хоолны дэлгэрэнгүй</h3>
              {reportData.topItems.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', marginTop: '30px', fontSize: '1.1rem' }}>Одоогоор борлуулалт алга байна.</p>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase' }}>
                    <span style={{ flex: 2 }}>Хоолны нэр</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>Ширхэг</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>Нийт үнэ</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {reportData.topItems.map(([name, data], idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f1f5f9', fontSize: '1.1rem' }}>
                        <span style={{ flex: 2, color: '#334155', fontWeight: '700' }}>{name}</span>
                        <strong style={{ flex: 1, textAlign: 'center', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '20px', width: 'fit-content', margin: '0 auto' }}>{data.qty} ш</strong>
                        <span style={{ flex: 1, textAlign: 'right', color: '#0f172a', fontWeight: '800' }}>{data.revenue.toLocaleString()} ₮</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportPage;