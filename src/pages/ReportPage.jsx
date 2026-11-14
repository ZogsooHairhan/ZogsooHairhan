import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// ==============================================
// ТОГТМОЛ, ТУСЛАХ ФУНКЦУУД
// ==============================================
const PAGE_SIZE = 1000; // Supabase нэг хүсэлтэд 1000-аас олон мөр өгдөггүй
const PAID_STATUSES = ['cooking', 'completed']; // касс төлбөр авсны дараа 'cooking' болдог

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Бэлэн мөнгө' },
  { key: 'ruble', label: 'Рубль (₮-өөр)' },
  { key: 'card', label: 'Карт' },
  { key: 'qpay', label: 'QPay' },
  { key: 'transfer', label: 'Данс' },
  { key: 'unknown', label: 'Тодорхойгүй' },
];

const ORDER_TYPES = [
  { key: 'dine-in', label: 'Зааланд' },
  { key: 'pickup', label: 'Авч явах' },
  { key: 'tuva', label: 'Тува' },
  { key: 'mixed', label: 'Холимог' },
  { key: 'other', label: 'Бусад' },
];

const EXPENSE_LABELS = {
  'Цалин': 'Цалин, урамшуулал',
  'Тог, ус, ашиглалт': 'Тог, ус, ашиглалт',
  'Түүхий эд, агуулах': 'Түүхий эд, агуулах',
  'Бусад': 'Бусад зардал',
};

const money = (n) => `${Math.round(n || 0).toLocaleString('en-US')} ₮`;
const num = (n) => Math.round(n || 0).toLocaleString('en-US');
const percent = (part, whole) => (whole ? (part / whole) * 100 : 0);
const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const formatDateTime = (d) => `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

const getTodayString = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
};

const dayRange = (date) => {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Сонгосон хугацаа ба харьцуулах өмнөх үе
function getPeriods(filter, customDate) {
  const now = new Date();
  if (filter === 'today' || filter === 'custom_date') {
    const base = filter === 'today' ? now : new Date(`${customDate}T00:00:00`);
    if (Number.isNaN(base.getTime())) return null;
    const current = dayRange(base);
    const prevDay = new Date(base); prevDay.setDate(prevDay.getDate() - 1);
    return {
      current, previous: dayRange(prevDay),
      label: formatDate(base), prevLabel: `Өмнөх өдөр (${formatDate(prevDay)})`,
      closureDate: filter === 'today' ? getTodayString() : customDate,
    };
  }
  if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), prevMonthDays), 23, 59, 59, 999);
    return {
      current: { start, end }, previous: { start: prevStart, end: prevEnd },
      label: `${now.getFullYear()} оны ${now.getMonth() + 1}-р сар (${formatDate(start)} – ${formatDate(now)})`,
      prevLabel: `Өмнөх сарын мөн үе (${formatDate(prevStart)} – ${formatDate(prevEnd)})`,
      closureDate: null,
    };
  }
  if (filter === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    return {
      current: { start, end }, previous: { start: prevStart, end: prevEnd },
      label: `${start.getFullYear()} оны ${start.getMonth() + 1}-р сар`,
      prevLabel: `${prevStart.getFullYear()} оны ${prevStart.getMonth() + 1}-р сар`,
      closureDate: null,
    };
  }
  return null;
}

// 1000 мөрийн хязгаараас хэтрэх үед хуудаслан бүгдийг татна
async function fetchAllRows(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

const ordersQuery = (range, columns) => () => supabase
  .from('orders')
  .select(columns)
  .gte('created_at', range.start.toISOString())
  .lte('created_at', range.end.toISOString())
  .in('status', [...PAID_STATUSES, 'cancelled'])
  .order('id', { ascending: true });

const expensesQuery = (range) => () => supabase
  .from('expenses')
  .select('*')
  .gte('created_at', range.start.toISOString())
  .lte('created_at', range.end.toISOString())
  .order('created_at', { ascending: false });

function summarise(orders, expenses) {
  const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const income = paid.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const payments = Object.fromEntries(PAYMENT_METHODS.map(({ key }) => [key, { amount: 0, count: 0 }]));
  const types = Object.fromEntries(ORDER_TYPES.map(({ key }) => [key, { amount: 0, count: 0 }]));
  const items = {};
  paid.forEach((o) => {
    const method = payments[o.payment_method] ? o.payment_method : 'unknown';
    payments[method].amount += o.total_amount || 0;
    payments[method].count += 1;
    const typeKey = o.order_type === 'dine_in' ? 'dine-in' : (types[o.order_type] ? o.order_type : 'other');
    types[typeKey].amount += o.total_amount || 0;
    types[typeKey].count += 1;
    o.order_items?.forEach((item) => {
      const name = item.menu_items?.name?.trim() || 'Устгагдсан хоол';
      if (!items[name]) items[name] = { qty: 0, revenue: 0 };
      items[name].qty += item.quantity || 0;
      items[name].revenue += (item.quantity || 0) * (item.price || 0);
    });
  });

  const expenseByCategory = {};
  expenses.forEach((e) => {
    const key = e.category || 'Бусад';
    expenseByCategory[key] = (expenseByCategory[key] || 0) + (Number(e.amount) || 0);
  });

  return {
    income,
    expenseTotal,
    net: income - expenseTotal,
    orderCount: paid.length,
    cancelledCount: orders.length - paid.length,
    payments,
    types,
    items: Object.entries(items).sort((a, b) => b[1].revenue - a[1].revenue),
    expenseByCategory,
    expenses,
  };
}

// ==============================================
// ЖИЖИГ ДҮРСЛЭЛҮҮД
// ==============================================
function Delta({ current, previous, inverse = false }) {
  if (!previous) return <span className="rp-delta rp-muted">Харьцуулах өгөгдөлгүй</span>;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.05) return <span className="rp-delta rp-muted">Өөрчлөлтгүй</span>;
  const good = inverse ? change < 0 : change > 0;
  return (
    <span className={`rp-delta ${good ? 'rp-good' : 'rp-bad'}`}>
      {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className="rp-kpi">
      <div className="rp-kpi-label">{label}</div>
      <div className={`rp-kpi-value ${tone || ''}`}>{value}</div>
      <div className="rp-kpi-sub">{sub}</div>
    </div>
  );
}

function ShareBar({ value }) {
  return (
    <div className="rp-bar" aria-hidden="true">
      <div className="rp-bar-fill" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

const STYLES = `
  .rp-page { padding: 28px; font-family: Arial, sans-serif; background: #f8fafc; min-height: 100vh; box-sizing: border-box; color: #0f172a; }
  .rp-page * { box-sizing: border-box; }
  .rp-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
  .rp-org { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }
  .rp-page .rp-title { margin: 4px 0 6px; padding: 0; border: none; font-size: 1.7rem; font-weight: 700; color: #0f172a; text-align: left; }
  .rp-meta { font-size: 0.9rem; color: #475569; line-height: 1.6; }
  .rp-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .rp-btn { padding: 8px 14px; font-size: 0.9rem; font-weight: 600; border-radius: 4px; cursor: pointer; border: 1px solid #cbd5e1; background: white; color: #334155; }
  .rp-btn-primary { background: #0f172a; border-color: #0f172a; color: white; }
  .rp-btn-danger { color: #b91c1c; border-color: #fecaca; }
  .rp-filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; background: white; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; }
  .rp-filter { padding: 7px 14px; border-radius: 4px; border: 1px solid #cbd5e1; font-weight: 600; cursor: pointer; background: white; color: #475569; }
  .rp-filter[aria-pressed='true'] { background: #0f172a; border-color: #0f172a; color: white; }
  .rp-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .rp-kpi { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; }
  .rp-kpi-label { font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  .rp-kpi-value { margin: 6px 0 4px; font-size: 1.55rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .rp-kpi-sub { font-size: 0.82rem; color: #64748b; min-height: 1.1em; }
  .rp-pos { color: #047857; } .rp-neg { color: #b91c1c; }
  .rp-delta { font-weight: 700; } .rp-good { color: #047857; } .rp-bad { color: #b91c1c; } .rp-muted { color: #94a3b8; font-weight: 400; }
  .rp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 20px; margin-bottom: 20px; }
  .rp-card { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; break-inside: avoid; }
  .rp-card + .rp-card { margin-top: 0; }
  .rp-page .rp-card-title { margin: 0 0 4px; padding: 0; border: none; font-size: 1.05rem; font-weight: 700; color: #0f172a; text-align: left; }
  .rp-card-note { margin: 0 0 14px; font-size: 0.82rem; color: #64748b; }
  .rp-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
  .rp-table th { text-align: left; padding: 8px 6px; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
  .rp-table td { padding: 9px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .rp-table .r { text-align: right; } .rp-table .c { text-align: center; }
  .rp-table .indent { padding-left: 22px; color: #475569; }
  .rp-table tr.rp-subtotal td { font-weight: 700; border-top: 1px solid #cbd5e1; }
  .rp-table tr.rp-total td { font-weight: 700; border-top: 2px solid #0f172a; border-bottom: none; font-size: 0.98rem; }
  .rp-bar { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; min-width: 60px; }
  .rp-bar-fill { height: 100%; background: #0f766e; }
  .rp-closure { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; background: #f0fdf4; color: #166534; padding: 14px 18px; border: 1px solid #bbf7d0; border-radius: 6px; margin-bottom: 20px; }
  .rp-form { display: grid; gap: 12px; }
  .rp-form label { display: block; font-size: 0.85rem; color: #475569; margin-bottom: 4px; }
  .rp-form input, .rp-form select { width: 100%; padding: 9px 10px; border-radius: 4px; border: 1px solid #cbd5e1; background: white; font-size: 0.95rem; }
  .rp-notes { font-size: 0.8rem; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  .rp-loading { padding: 50px; text-align: center; color: #64748b; }
  .rp-link { background: none; border: none; color: #0f766e; font-weight: 700; cursor: pointer; padding: 8px 0 0; }
  .rp-print-only { display: none; }
  @media (max-width: 520px) { .rp-page { padding: 14px; } .rp-grid { grid-template-columns: 1fr; } .rp-table { font-size: 0.82rem; } }
  @media print {
    @page { size: A4; margin: 14mm; }
    .rp-page { background: white; padding: 0; }
    .rp-no-print { display: none !important; }
    .rp-print-only { display: block; }
    .rp-card, .rp-kpi { border-color: #cbd5e1; }
    .rp-grid { grid-template-columns: 1fr 1fr; }
    .rp-kpis { grid-template-columns: repeat(3, 1fr); }
  }
`;

function ReportPage() {
  // ==============================================
  // НЭВТРЭЛТ
  // ==============================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
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
  // ТАЙЛАНГИЙН ТӨЛӨВ
  // ==============================================
  const [reportFilter, setReportFilter] = useState('today'); // today, month, last_month, custom_date
  const [customDate, setCustomDate] = useState(getTodayString);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [report, setReport] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [periods, setPeriods] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [shiftClosureData, setShiftClosureData] = useState(null);
  const [showAllItems, setShowAllItems] = useState(false);

  // Зарлагын маягт
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Цалин');
  const [expCustomDesc, setExpCustomDesc] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  useEffect(() => {
    if (isAuthenticated) fetchAdvancedReport();
    // Шүүлтүүр солигдоход л дахин татна.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, reportFilter, customDate]);

  // ==============================================
  // ӨГӨГДӨЛ ТАТАХ
  // ==============================================
  const fetchAdvancedReport = async () => {
    const p = getPeriods(reportFilter, customDate);
    if (!p) return;
    setIsReportLoading(true);
    setLoadError('');
    try {
      const [orders, expenses, prevOrders, prevExpenses, closure] = await Promise.all([
        fetchAllRows(ordersQuery(p.current, 'id, total_amount, status, payment_method, order_type, order_items (quantity, price, menu_items (name))')),
        fetchAllRows(expensesQuery(p.current)),
        fetchAllRows(ordersQuery(p.previous, 'id, total_amount, status, payment_method, order_type')),
        fetchAllRows(expensesQuery(p.previous)),
        p.closureDate
          ? supabase.from('shift_closures').select('*').eq('closure_date', p.closureDate)
          : Promise.resolve({ data: null }),
      ]);
      setPeriods(p);
      setReport(summarise(orders, expenses));
      setPrevious(summarise(prevOrders, prevExpenses));
      setShiftClosureData(closure.data?.[0] || null);
      setGeneratedAt(new Date());
      setShowAllItems(false);
    } catch (err) {
      console.error(err);
      setLoadError('Тайлангийн мэдээллийг татахад алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setIsReportLoading(false);
    }
  };

  // ==============================================
  // ЗАРЛАГА БҮРТГЭХ
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
        description: finalDesc,
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
  // НЭВТРЭХ ДЭЛГЭЦ
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

  // ==============================================
  // ТАЙЛАН
  // ==============================================
  const r = report;
  const prev = previous;
  const avgTicket = r && r.orderCount ? r.income / r.orderCount : 0;
  const prevAvgTicket = prev && prev.orderCount ? prev.income / prev.orderCount : 0;
  const margin = r ? percent(r.net, r.income) : 0;
  const itemTotal = r ? r.items.reduce((s, [, d]) => s + d.revenue, 0) : 0;
  const itemQty = r ? r.items.reduce((s, [, d]) => s + d.qty, 0) : 0;
  const visibleItems = r ? (showAllItems ? r.items : r.items.slice(0, 15)) : [];
  const expenseCategories = r && prev
    ? [...new Set([...Object.keys(r.expenseByCategory), ...Object.keys(prev.expenseByCategory)])]
    : [];
  const filters = [
    { key: 'today', label: 'Өнөөдөр' },
    { key: 'month', label: 'Энэ сар' },
    { key: 'last_month', label: 'Өнгөрсөн сар' },
  ];

  return (
    <div className="rp-page">
      <style>{STYLES}</style>

      {/* ТОЛГОЙ ХЭСЭГ */}
      <header className="rp-header">
        <div>
          <div className="rp-org">Зогсоо Хайрхан зоогийн газар</div>
          <h1 className="rp-title">Санхүүгийн нэгдсэн тайлан</h1>
          {periods && (
            <div className="rp-meta">
              <div>Тайлант хугацаа: <strong>{periods.label}</strong></div>
              <div>Харьцуулсан үе: {periods.prevLabel}</div>
              {generatedAt && <div>Үүсгэсэн: {formatDateTime(generatedAt)} · Нэгж: төгрөг (₮)</div>}
            </div>
          )}
        </div>
        <div className="rp-actions rp-no-print">
          <button className="rp-btn rp-btn-primary" onClick={() => window.print()} disabled={!r}>Хэвлэх / PDF</button>
          <button className="rp-btn" onClick={() => { window.location.href = '/cashier'; }}>Касс</button>
          <button className="rp-btn rp-btn-danger" onClick={handleLogout}>Гарах</button>
        </div>
      </header>

      {/* ХУГАЦАА */}
      <div className="rp-filters rp-no-print">
        <span style={{ fontWeight: 600, color: '#475569', marginRight: '6px' }}>Хугацаа:</span>
        {filters.map(({ key, label }) => (
          <button key={key} className="rp-filter" aria-pressed={reportFilter === key} onClick={() => setReportFilter(key)}>{label}</button>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          <span style={{ fontSize: '0.88rem', color: '#64748b' }}>Тодорхой өдөр:</span>
          <input
            type="date"
            value={customDate}
            onChange={(e) => { setCustomDate(e.target.value); setReportFilter('custom_date'); }}
            className="rp-filter"
            aria-pressed={reportFilter === 'custom_date'}
          />
        </div>
      </div>

      {/* ЭЭЛЖ ХААЛТ */}
      {shiftClosureData && (
        <div className="rp-closure">
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Ээлж хаагдсан</strong>
            <span style={{ fontSize: '0.92rem' }}>
              Систем дэх бэлэн мөнгө: <b>{money(shiftClosureData.expected_cash)}</b> · Кассанд тоолсон: <b>{money(shiftClosureData.actual_cash)}</b>
            </span>
          </div>
          {shiftClosureData.difference !== 0 && (
            <strong style={{ color: shiftClosureData.difference < 0 ? '#b91c1c' : '#a16207' }}>Зөрүү: {money(shiftClosureData.difference)}</strong>
          )}
        </div>
      )}

      {isReportLoading && <div className="rp-loading">Мэдээллийг татаж байна...</div>}
      {!isReportLoading && loadError && <div className="rp-loading" style={{ color: '#b91c1c' }}>{loadError}</div>}

      {!isReportLoading && !loadError && r && prev && (
        <>
          {/* ГОЛ ҮЗҮҮЛЭЛТ */}
          <section className="rp-kpis" aria-label="Гол үзүүлэлтүүд">
            <Kpi label="Нийт орлого" value={money(r.income)} sub={<Delta current={r.income} previous={prev.income} />} />
            <Kpi label="Нийт зарлага" value={money(r.expenseTotal)} sub={<Delta current={r.expenseTotal} previous={prev.expenseTotal} inverse />} />
            <Kpi label="Цэвэр ашиг" value={money(r.net)} tone={r.net < 0 ? 'rp-neg' : 'rp-pos'} sub={<Delta current={r.net} previous={prev.net} />} />
            <Kpi label="Ашгийн маржин" value={`${margin.toFixed(1)}%`} tone={margin < 0 ? 'rp-neg' : ''} sub={`Өмнөх үе: ${percent(prev.net, prev.income).toFixed(1)}%`} />
            <Kpi label="Борлуулалтын тоо" value={num(r.orderCount)} sub={<Delta current={r.orderCount} previous={prev.orderCount} />} />
            <Kpi label="Дундаж чек" value={money(avgTicket)} sub={<Delta current={avgTicket} previous={prevAvgTicket} />} />
          </section>

          <div className="rp-grid">
            {/* ОРЛОГО, ЗАРЛАГЫН ТАЙЛАН */}
            <section className="rp-card">
              <h2 className="rp-card-title">Орлого, зарлагын тайлан</h2>
              <p className="rp-card-note">Тайлант үеийг өмнөх үетэй харьцуулав.</p>
              <table className="rp-table">
                <thead>
                  <tr><th>Үзүүлэлт</th><th className="r">Тайлант үе</th><th className="r">Өмнөх үе</th><th className="r">Өөрчлөлт</th></tr>
                </thead>
                <tbody>
                  <tr className="rp-subtotal">
                    <td>Борлуулалтын орлого</td>
                    <td className="r">{money(r.income)}</td><td className="r">{money(prev.income)}</td>
                    <td className="r"><Delta current={r.income} previous={prev.income} /></td>
                  </tr>
                  {expenseCategories.map((cat) => (
                    <tr key={cat}>
                      <td className="indent">{EXPENSE_LABELS[cat] || cat}</td>
                      <td className="r">({money(r.expenseByCategory[cat] || 0)})</td>
                      <td className="r">({money(prev.expenseByCategory[cat] || 0)})</td>
                      <td className="r"><Delta current={r.expenseByCategory[cat] || 0} previous={prev.expenseByCategory[cat] || 0} inverse /></td>
                    </tr>
                  ))}
                  <tr className="rp-subtotal">
                    <td>Нийт зарлага</td>
                    <td className="r">({money(r.expenseTotal)})</td><td className="r">({money(prev.expenseTotal)})</td>
                    <td className="r"><Delta current={r.expenseTotal} previous={prev.expenseTotal} inverse /></td>
                  </tr>
                  <tr className="rp-total">
                    <td>Цэвэр ашиг (алдагдал)</td>
                    <td className={`r ${r.net < 0 ? 'rp-neg' : 'rp-pos'}`}>{money(r.net)}</td>
                    <td className={`r ${prev.net < 0 ? 'rp-neg' : ''}`}>{money(prev.net)}</td>
                    <td className="r"><Delta current={r.net} previous={prev.net} /></td>
                  </tr>
                </tbody>
              </table>
              <table className="rp-table" style={{ marginTop: '14px' }}>
                <tbody>
                  <tr><td>Ашгийн маржин</td><td className="r">{margin.toFixed(1)}%</td></tr>
                  <tr><td>Дундаж чек</td><td className="r">{money(avgTicket)}</td></tr>
                  <tr><td>Цуцлагдсан захиалга</td><td className="r">{num(r.cancelledCount)}</td></tr>
                </tbody>
              </table>
            </section>

            <div style={{ display: 'grid', gap: '20px', alignContent: 'start' }}>
              {/* ТӨЛБӨРИЙН ХЭЛБЭР */}
              <section className="rp-card">
                <h2 className="rp-card-title">Орлого — төлбөрийн хэлбэрээр</h2>
                <p className="rp-card-note">Рублийн төлбөрийг авсан үеийн төгрөгийн дүнгээр тооцов.</p>
                <table className="rp-table">
                  <thead><tr><th>Хэлбэр</th><th className="c">Гүйлгээ</th><th className="r">Дүн</th><th className="r">Хувь</th><th aria-label="График" /></tr></thead>
                  <tbody>
                    {PAYMENT_METHODS.filter(({ key }) => key !== 'unknown' || r.payments.unknown.count).map(({ key, label }) => {
                      const p = r.payments[key];
                      const share = percent(p.amount, r.income);
                      return (
                        <tr key={key}>
                          <td>{label}</td><td className="c">{num(p.count)}</td><td className="r">{money(p.amount)}</td>
                          <td className="r">{share.toFixed(1)}%</td><td style={{ width: '22%' }}><ShareBar value={share} /></td>
                        </tr>
                      );
                    })}
                    <tr className="rp-total"><td>Нийт</td><td className="c">{num(r.orderCount)}</td><td className="r">{money(r.income)}</td><td className="r">{r.income ? '100.0%' : '0.0%'}</td><td /></tr>
                  </tbody>
                </table>
              </section>

              {/* ҮЙЛЧИЛГЭЭНИЙ ТӨРӨЛ */}
              <section className="rp-card">
                <h2 className="rp-card-title">Орлого — үйлчилгээний төрлөөр</h2>
                <table className="rp-table" style={{ marginTop: '10px' }}>
                  <thead><tr><th>Төрөл</th><th className="c">Захиалга</th><th className="r">Дүн</th><th className="r">Хувь</th><th aria-label="График" /></tr></thead>
                  <tbody>
                    {ORDER_TYPES.filter(({ key }) => r.types[key].count).map(({ key, label }) => {
                      const t = r.types[key];
                      const share = percent(t.amount, r.income);
                      return (
                        <tr key={key}>
                          <td>{label}</td><td className="c">{num(t.count)}</td><td className="r">{money(t.amount)}</td>
                          <td className="r">{share.toFixed(1)}%</td><td style={{ width: '22%' }}><ShareBar value={share} /></td>
                        </tr>
                      );
                    })}
                    {r.orderCount === 0 && <tr><td colSpan={5} className="rp-muted">Энэ хугацаанд борлуулалт алга.</td></tr>}
                  </tbody>
                </table>
              </section>
            </div>
          </div>

          <div className="rp-grid">
            {/* БОРЛУУЛАЛТ (ХООЛООР) */}
            <section className="rp-card">
              <h2 className="rp-card-title">Борлуулалт — хоолоор</h2>
              <p className="rp-card-note">Орлогоор нь эрэмбэлэв. Захиалгын үеийн үнээр тооцсон.</p>
              {r.items.length === 0 ? <p className="rp-muted">Мэдээлэл олдсонгүй.</p> : (
                <>
                  <table className="rp-table">
                    <thead><tr><th className="c">№</th><th>Хоол</th><th className="r">Тоо</th><th className="r">Орлого</th><th className="r">Хувь</th></tr></thead>
                    <tbody>
                      {visibleItems.map(([name, d], idx) => (
                        <tr key={name}>
                          <td className="c rp-muted">{idx + 1}</td><td>{name}</td><td className="r">{num(d.qty)}</td>
                          <td className="r">{money(d.revenue)}</td><td className="r">{percent(d.revenue, itemTotal).toFixed(1)}%</td>
                        </tr>
                      ))}
                      <tr className="rp-total"><td /><td>Нийт ({r.items.length} нэр төрөл)</td><td className="r">{num(itemQty)}</td><td className="r">{money(itemTotal)}</td><td className="r">100.0%</td></tr>
                    </tbody>
                  </table>
                  {r.items.length > 15 && (
                    <button className="rp-link rp-no-print" onClick={() => setShowAllItems((v) => !v)}>
                      {showAllItems ? 'Эхний 15-ыг харуулах' : `Бүгдийг харуулах (${r.items.length})`}
                    </button>
                  )}
                </>
              )}
            </section>

            <div style={{ display: 'grid', gap: '20px', alignContent: 'start' }}>
              {/* ЗАРЛАГА БҮРТГЭХ */}
              <section className="rp-card rp-no-print">
                <h2 className="rp-card-title">Зарлага бүртгэх</h2>
                <form onSubmit={handleAddExpense} className="rp-form" style={{ marginTop: '12px' }}>
                  <div>
                    <label htmlFor="exp-amount">Зарлагын дүн (₮)</label>
                    <input id="exp-amount" type="number" min="1" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required placeholder="0" />
                  </div>
                  <div>
                    <label htmlFor="exp-category">Зарлагын төрөл</label>
                    <select id="exp-category" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                      <option value="Цалин">Ажилчдын цалин, урамшуулал</option>
                      <option value="Тог, ус, ашиглалт">Тог, ус, ашиглалтын зардал</option>
                      <option value="Түүхий эд, агуулах">Түүхий эд, агуулахын татан авалт</option>
                      <option value="Бусад">Бусад (гараар бичих)</option>
                    </select>
                  </div>
                  {expCategory === 'Бусад' && (
                    <div>
                      <label htmlFor="exp-desc">Зарлагын утга (тайлбар)</label>
                      <input id="exp-desc" type="text" value={expCustomDesc} onChange={(e) => setExpCustomDesc(e.target.value)} required placeholder="Жишээ: Бичиг хэргийн хэрэгсэл" />
                    </div>
                  )}
                  <button type="submit" disabled={isAddingExpense} className="rp-btn rp-btn-primary" style={{ padding: '11px' }}>
                    {isAddingExpense ? 'Хадгалж байна...' : 'Зарлага бүртгэх'}
                  </button>
                </form>
              </section>

              {/* ЗАРЛАГЫН ЖАГСААЛТ */}
              <section className="rp-card">
                <h2 className="rp-card-title">Зарлагын жагсаалт</h2>
                {r.expenses.length === 0 ? <p className="rp-muted" style={{ marginTop: '10px' }}>Энэ хугацаанд зарлага бүртгэгдээгүй байна.</p> : (
                  <table className="rp-table" style={{ marginTop: '10px' }}>
                    <thead><tr><th>Огноо</th><th>Ангилал</th><th>Тайлбар</th><th className="r">Дүн</th></tr></thead>
                    <tbody>
                      {r.expenses.map((exp) => (
                        <tr key={exp.id}>
                          <td className="rp-muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(new Date(exp.created_at))}</td>
                          <td>{EXPENSE_LABELS[exp.category] || exp.category}</td>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exp.description}>{exp.description}</td>
                          <td className="r">{money(exp.amount)}</td>
                        </tr>
                      ))}
                      <tr className="rp-total"><td colSpan={3}>Нийт зарлага</td><td className="r">{money(r.expenseTotal)}</td></tr>
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </div>

          <footer className="rp-notes">
            Тайлбар: Орлогод төлбөр нь авагдсан бүх захиалга (гал тогоонд хийгдэж буй болон бэлэн болсон) орсон, цуцлагдсан захиалга ороогүй.
            Бүх дүн төгрөгөөр (₮). Рублийн төлбөрийг касс дээр оруулсан ханшаар төгрөгт шилжүүлсэн дүнгээр тооцсон.
            <span className="rp-print-only">Хэвлэсэн: {formatDateTime(new Date())}</span>
          </footer>
        </>
      )}
    </div>
  );
}

export default ReportPage;
