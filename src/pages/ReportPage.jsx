import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ReportPage() {
  // ==============================================
  // AUTHENTICATION
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
    if (error) alert("Нэвтрэх алдаа: И-мэйл эсвэл нууц үг шалгана уу.");
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ==============================================
  // REPORT STATES
  // ==============================================
  const [reportFilter, setReportFilter] = useState('today'); // today, month, last_month, custom_date
  const [customDate, setCustomDate] = useState(''); 
  const [isReportLoading, setIsReportLoading] = useState(false);
  
  const [reportData, setReportData] = useState({ 
    totalIncome: 0, 
    totalExpense: 0,
    netProfit: 0,
    orderCount: 0, 
    cancelledCount: 0, 
    topItems: [], 
    paymentBreakdown: { cash: 0, card: 0, transfer: 0, qpay: 0 },
    expensesList: []
  });
  
  const [shiftClosureData, setShiftClosureData] = useState(null);

  // EXPENSE FORM STATES
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Цалин');
  const [expCustomDesc, setExpCustomDesc] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const getTodayString = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
  };

  useEffect(() => {
    if (!customDate) setCustomDate(getTodayString());
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchAdvancedReport();
  }, [isAuthenticated, reportFilter, customDate]);

  // ==============================================
  // DATA FETCHING LOGIC
  // ==============================================
  const fetchAdvancedReport = async () => {
    setIsReportLoading(true);
    try {
      const now = new Date();
      let startDate, endDate;
      let dateStringForClosure = null;

      if (reportFilter === 'today') {
        startDate = new Date(now.setHours(0,0,0,0));
        endDate = new Date(now.setHours(23,59,59,999));
        dateStringForClosure = getTodayString();
      } else if (reportFilter === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (reportFilter === 'last_month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (reportFilter === 'custom_date' && customDate) {
        const selected = new Date(customDate);
        startDate = new Date(selected.setHours(0,0,0,0));
        endDate = new Date(selected.setHours(23,59,59,999));
        dateStringForClosure = customDate;
      }

      if (!startDate || !endDate) return;

      // 1. Fetch closure data if it's a specific single day
      if (dateStringForClosure) {
        const { data: closureData } = await supabase.from('shift_closures').select('*').eq('closure_date', dateStringForClosure);
        setShiftClosureData((closureData && closureData.length > 0) ? closureData[0] : null);
      } else {
        setShiftClosureData(null);
      }

      // 2. Fetch Orders (Income)
      const { data: currentData } = await supabase
        .from('orders')
        .select(`total_amount, status, payment_method, order_items (quantity, price, menu_items (name))`)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['completed', 'cancelled']);

      // 3. Fetch Expenses (Outcome)
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      // Calculate Income
      let income = 0, count = 0, cancelled = 0, itemMap = {};
      let payments = { cash: 0, card: 0, transfer: 0, qpay: 0 };

      currentData?.forEach(order => {
        if (order.status === 'cancelled') {
          cancelled++;
        } else {
          income += order.total_amount || 0;
          count++;
          
          const method = order.payment_method || 'cash';
          if (payments[method] !== undefined) payments[method] += (order.total_amount || 0);
          else payments['cash'] += (order.total_amount || 0);

          order.order_items?.forEach(item => {
            const name = item.menu_items?.name || 'Устгагдсан хоол';
            if (!itemMap[name]) itemMap[name] = { qty: 0, revenue: 0 };
            itemMap[name].qty += item.quantity;
            itemMap[name].revenue += (item.quantity * (item.price || 0));
          });
        }
      });

      // Calculate Expenses
      let expenseTotal = 0;
      expenseData?.forEach(exp => {
        expenseTotal += Number(exp.amount) || 0;
      });

      setReportData({ 
        totalIncome: income,
        totalExpense: expenseTotal,
        netProfit: income - expenseTotal,
        orderCount: count, 
        cancelledCount: cancelled, 
        topItems: Object.entries(itemMap).sort((a, b) => b[1].qty - a[1].qty), 
        paymentBreakdown: payments,
        expensesList: expenseData || []
      });

    } catch (err) {
      console.error(err);
    } finally {
      setIsReportLoading(false);
    }
  };

  // ==============================================
  // EXPENSE SUBMISSION
  // ==============================================
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) return alert('Зарлагын дүнг зөв оруулна уу.');
    
    let finalDesc = expCategory;
    if (expCategory === 'Бусад') {
      if (!expCustomDesc) return alert('Зарлагын утгыг тайлбарлаж бичнэ үү.');
      finalDesc = expCustomDesc;
    }

    setIsAddingExpense(true);
    try {
      const { error } = await supabase.from('expenses').insert([{
        amount: Number(expAmount),
        category: expCategory,
        description: finalDesc
      }]);
      
      if (error) throw error;
      
      setExpAmount('');
      setExpCustomDesc('');
      fetchAdvancedReport();
    } catch (err) {
      alert("Алдаа: " + err.message);
    } finally {
      setIsAddingExpense(false);
    }
  };

  // ==============================================
  // EXPORT TO EXCEL (CSV)
  // ==============================================
  const exportToCSV = () => {
    let csvContent = "\uFEFF"; 
    
    let filterName = reportFilter === 'today' ? "Өнөөдөр" : (reportFilter === 'month' ? "Энэ сар" : (reportFilter === 'last_month' ? "Өнгөрсөн сар" : customDate));

    csvContent += `Тайлангийн хугацаа:,${filterName}\n\n`;
    
    csvContent += "--- САНХҮҮГИЙН НЭГДТЭГ ---\n";
    csvContent += `Нийт орлого:,${reportData.totalIncome} MNT\n`;
    csvContent += `Нийт зарлага:,${reportData.totalExpense} MNT\n`;
    csvContent += `Цэвэр ашиг/Алдагдал:,${reportData.netProfit} MNT\n\n`;

    csvContent += "--- ТӨЛБӨРИЙН ЗАДАРГАА ---\n";
    csvContent += `Бэлэн мөнгө:,${reportData.paymentBreakdown.cash} MNT\n`;
    csvContent += `Картаар:,${reportData.paymentBreakdown.card} MNT\n`;
    csvContent += `Дансаар:,${reportData.paymentBreakdown.transfer} MNT\n`;
    csvContent += `QPay:,${reportData.paymentBreakdown.qpay} MNT\n\n`;

    csvContent += "--- ГАРСАН ЗАРЛАГУУД ---\n";
    csvContent += "Төрөл/Утга,Дүн,Огноо\n";
    reportData.expensesList.forEach(exp => {
      const dateStr = new Date(exp.created_at).toLocaleString();
      csvContent += `"${exp.description}",${exp.amount},"${dateStr}"\n`;
    });
    csvContent += "\n";

    csvContent += "--- БОРЛУУЛАГДСАН ХООЛ ---\n";
    csvContent += "Хоолны нэр,Ширхэг,Орлого\n";
    reportData.topItems.forEach(item => {
      csvContent += `"${item[0]}",${item[1].qty},${item[1].revenue}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Sanhuu_Tailan_${filterName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==============================================
  // UI COMPONENTS (FORMAL, NO EMOJIS)
  // ==============================================
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'Arial, sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center', width: '340px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontWeight: '600' }}>Санхүүгийн Удирдлага</h2>
          <p style={{ color: '#64748b', margin: '0 0 25px 0', fontSize: '0.9rem' }}>Зөвхөн эрх бүхий ажилтан нэвтрэнэ.</p>
          <input type="email" placeholder="Цахим шуудан" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '12px', fontSize: '1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#0f172a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLoggingIn ? 'Баталгаажуулж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>Санхүүгийн нэгдсэн тайлан</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportToCSV} style={{ padding: '8px 16px', fontSize: '0.95rem', fontWeight: '600', border: '1px solid #10b981', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#10b981', color: 'white' }}>
            Тайлан татах (CSV)
          </button>
          <button onClick={() => window.location.href = '/admin'} style={{ padding: '8px 16px', fontSize: '0.95rem', fontWeight: '600', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white', color: '#475569' }}>
            Буцах
          </button>
          <button onClick={handleLogout} style={{ padding: '8px 16px', fontSize: '0.95rem', fontWeight: '600', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white', color: '#ef4444' }}>
            Гарах
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* FILTERS */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontWeight: '600', color: '#475569', marginRight: '10px' }}>Хугацаа:</span>
          
          <button onClick={() => setReportFilter('today')} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', backgroundColor: reportFilter === 'today' ? '#0f172a' : 'white', color: reportFilter === 'today' ? 'white' : '#475569' }}>Өнөөдөр</button>
          <button onClick={() => setReportFilter('month')} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', backgroundColor: reportFilter === 'month' ? '#0f172a' : 'white', color: reportFilter === 'month' ? 'white' : '#475569' }}>Энэ сар</button>
          <button onClick={() => setReportFilter('last_month')} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer', backgroundColor: reportFilter === 'last_month' ? '#0f172a' : 'white', color: reportFilter === 'last_month' ? 'white' : '#475569' }}>Өнгөрсөн сар</button>
          
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Тодорхой өдөр:</span>
            <input 
              type="date" 
              value={customDate} 
              onChange={(e) => { setCustomDate(e.target.value); setReportFilter('custom_date'); }} 
              style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#0f172a', fontWeight: '600', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* SHIFT CLOSURE INFO (Appears only on specific single days if closed) */}
        {shiftClosureData && (
          <div style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '15px 20px', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Касс хаагдсан байна (Ээлж дууссан)</strong>
              <span style={{ fontSize: '0.95rem' }}>
                Систем дэх бэлэн мөнгө: <b>{shiftClosureData.expected_cash.toLocaleString()}</b> | 
                Кассанд тоолсон: <b>{shiftClosureData.actual_cash.toLocaleString()}</b>
              </span>
            </div>
            {shiftClosureData.difference !== 0 && (
              <div style={{ color: shiftClosureData.difference < 0 ? '#b91c1c' : '#a16207', fontWeight: 'bold', fontSize: '1.1rem', backgroundColor: 'white', padding: '6px 12px', borderRadius: '4px', border: '1px solid currentColor' }}>
                Зөрүү: {shiftClosureData.difference.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {isReportLoading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Мэдээллийг татаж байна...</div>
        ) : (
          <>
            {/* KPI CARDS (INCOME, EXPENSE, PROFIT) */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px', backgroundColor: 'white', padding: '25px', borderRadius: '6px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Нийт орлого</div>
                <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#0f172a' }}>{reportData.totalIncome.toLocaleString()}</div>
              </div>
              
              <div style={{ flex: 1, minWidth: '250px', backgroundColor: 'white', padding: '25px', borderRadius: '6px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444' }}>
                <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Нийт зарлага</div>
                <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#ef4444' }}>{reportData.totalExpense.toLocaleString()}</div>
              </div>

              <div style={{ flex: 1, minWidth: '250px', backgroundColor: 'white', padding: '25px', borderRadius: '6px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981' }}>
                <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Цэвэр ашиг (Орлого - Зарлага)</div>
                <div style={{ fontSize: '2.2rem', fontWeight: '700', color: reportData.netProfit < 0 ? '#ef4444' : '#10b981' }}>
                  {reportData.netProfit.toLocaleString()}
                </div>
              </div>
            </div>

            {/* MAIN TWO COLUMNS */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              
              {/* LEFT COLUMN: INCOME DETAILS */}
              <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Payment Breakdown */}
                <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Орлогын бүтэц (Төлбөрийн хэлбэрээр)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                    <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>Бэлэн мөнгө</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>{reportData.paymentBreakdown.cash.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>Карт</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>{reportData.paymentBreakdown.card.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>Данс</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>{reportData.paymentBreakdown.transfer.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>QPay</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>{reportData.paymentBreakdown.qpay.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                    <div style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Амжилттай захиалга:</span> <strong style={{ float: 'right' }}>{reportData.orderCount}</strong>
                    </div>
                    <div style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Цуцлагдсан захиалга:</span> <strong style={{ float: 'right', color: '#ef4444' }}>{reportData.cancelledCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Sales Items */}
                <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Бараа борлуулалтын дэлгэрэнгүй</h3>
                  {reportData.topItems.length === 0 ? <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Мэдээлэл олдсонгүй.</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                          <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: '600' }}>Утга</th>
                          <th style={{ textAlign: 'center', padding: '10px 0', fontWeight: '600' }}>Тоо хэмжээ</th>
                          <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: '600' }}>Дүн</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topItems.map(([name, data], idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 0', color: '#334155' }}>{name}</td>
                            <td style={{ padding: '12px 0', textAlign: 'center', fontWeight: '600' }}>{data.qty}</td>
                            <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '600' }}>{data.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: EXPENSE MANAGEMENT */}
              <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Expense Form */}
                <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Зарлага бүртгэх</h3>
                  <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '5px' }}>Зарлагын дүн (MNT)</label>
                      <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} required placeholder="0" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '5px' }}>Зарлагын төрөл</label>
                      <select value={expCategory} onChange={e => setExpCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: 'white' }}>
                        <option value="Цалин">Ажилчдын цалин, урамшуулал</option>
                        <option value="Тог, ус, ашиглалт">Тог, ус, ашиглалтын зардал</option>
                        <option value="Түүхий эд, агуулах">Түүхий эд, агуулахын татан авалт</option>
                        <option value="Бусад">Бусад (Гараар бичих)</option>
                      </select>
                    </div>

                    {expCategory === 'Бусад' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '5px' }}>Зарлагын утга (Тайлбар)</label>
                        <input type="text" value={expCustomDesc} onChange={e => setExpCustomDesc(e.target.value)} required placeholder="Жишээ: Бичиг хэргийн хэрэгсэл" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                    )}

                    <button type="submit" disabled={isAddingExpense} style={{ padding: '12px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }}>
                      {isAddingExpense ? 'Хадгалж байна...' : 'Зарлага бүртгэх'}
                    </button>
                  </form>
                </div>

                {/* Expense List */}
                <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Сонгосон хугацааны зарлагууд</h3>
                  {reportData.expensesList.length === 0 ? <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Энэ хугацаанд зарлага бүртгэгдээгүй байна.</p> : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                            <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: '600' }}>Огноо</th>
                            <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: '600' }}>Утга</th>
                            <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: '600' }}>Дүн</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.expensesList.map((exp) => (
                            <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 0', color: '#64748b' }}>{new Date(exp.created_at).toLocaleDateString()}</td>
                              <td style={{ padding: '10px 0', color: '#334155', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exp.description}>
                                {exp.description}
                              </td>
                              <td style={{ padding: '10px 0', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>
                                {Number(exp.amount).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReportPage;