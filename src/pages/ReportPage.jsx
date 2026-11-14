import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

// ==============================================
// ТОГТМОЛ, ТУСЛАХ ФУНКЦУУД
// ==============================================
const PAGE_SIZE = 1000; // Supabase нэг хүсэлтэд 1000-аас олон мөр өгдөггүй
const PAID_STATUSES = ['cooking', 'completed']; // касс төлбөр авсны дараа 'cooking' болдог

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Бэлэн мөнгө', by: 'бэлэн мөнгөөр' },
  { key: 'ruble', label: 'Рубль (₮-өөр)', by: 'рублиэр' },
  { key: 'card', label: 'Карт', by: 'картаар' },
  { key: 'qpay', label: 'QPay', by: 'QPay-ээр' },
  { key: 'transfer', label: 'Данс', by: 'дансаар' },
  { key: 'unknown', label: 'Тодорхойгүй', by: 'тодорхойгүй хэлбэрээр' },
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

const money = (n) => {
  const v = Math.round(n || 0);
  return `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('en-US')} ₮`;
};
const num = (n) => Math.round(n || 0).toLocaleString('en-US');
const percent = (part, whole) => (whole ? (part / whole) * 100 : 0);
const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const formatDateTime = (d) => `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const getTodayString = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
};

const dayRange = (date) => {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Сонгосон хугацаа, түүнтэй харьцуулах өмнөх үе, тайланд гарах энгийн нэршил
function getPeriods(filter, customDate) {
  const now = new Date();
  if (filter === 'today' || filter === 'custom_date') {
    const base = filter === 'today' ? now : new Date(`${customDate}T00:00:00`);
    if (Number.isNaN(base.getTime())) return null;
    const prevDay = new Date(base); prevDay.setDate(prevDay.getDate() - 1);
    const isToday = formatDate(base) === formatDate(now);
    return {
      kind: 'day',
      current: dayRange(base), previous: dayRange(prevDay),
      label: formatDate(base), prevLabel: `Өмнөх өдөр (${formatDate(prevDay)})`,
      curShort: isToday ? 'Өнөөдөр' : formatDate(base),
      prevShort: isToday ? 'Өчигдөр' : formatDate(prevDay),
      phrase: isToday ? 'Өнөөдөр' : `${formatDate(base)} өдөр`,
      compareWord: isToday ? 'өчигдрөөс' : 'өмнөх өдрөөс',
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
      kind: 'month',
      current: { start, end }, previous: { start: prevStart, end: prevEnd },
      label: `${now.getFullYear()} оны ${now.getMonth() + 1}-р сар (${formatDate(start)} – ${formatDate(now)})`,
      prevLabel: `Өмнөх сарын мөн үе (${formatDate(prevStart)} – ${formatDate(prevEnd)})`,
      curShort: 'Энэ сар', prevShort: 'Өмнөх сар (мөн үе)',
      phrase: `Энэ сард (${now.getMonth() + 1}/1 – ${now.getMonth() + 1}/${now.getDate()})`,
      compareWord: 'өмнөх сарын мөн үеэс',
      closureDate: null,
    };
  }
  if (filter === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    return {
      kind: 'month',
      current: { start, end }, previous: { start: prevStart, end: prevEnd },
      label: `${start.getFullYear()} оны ${start.getMonth() + 1}-р сар`,
      prevLabel: `${prevStart.getFullYear()} оны ${prevStart.getMonth() + 1}-р сар`,
      curShort: `${start.getMonth() + 1}-р сар`, prevShort: `${prevStart.getMonth() + 1}-р сар`,
      phrase: `${start.getMonth() + 1}-р сард`,
      compareWord: 'өмнөх сараас',
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
  const byHour = Array.from({ length: 24 }, () => ({ amount: 0, count: 0 }));
  const byDay = {};
  let ordersWithoutItems = 0;
  paid.forEach((o) => {
    const amount = o.total_amount || 0;
    const method = payments[o.payment_method] ? o.payment_method : 'unknown';
    payments[method].amount += amount;
    payments[method].count += 1;
    const typeKey = o.order_type === 'dine_in' ? 'dine-in' : (types[o.order_type] ? o.order_type : 'other');
    types[typeKey].amount += amount;
    types[typeKey].count += 1;
    if (o.created_at) {
      const d = new Date(o.created_at);
      byHour[d.getHours()].amount += amount;
      byHour[d.getHours()].count += 1;
      const dayKey = formatDate(d);
      if (!byDay[dayKey]) byDay[dayKey] = { amount: 0, count: 0 };
      byDay[dayKey].amount += amount;
      byDay[dayKey].count += 1;
    }
    if (o.order_items && o.order_items.length === 0) ordersWithoutItems += 1;
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
    byHour,
    byDay,
    ordersWithoutItems,
    expenseByCategory,
    expenses,
  };
}

// Цаг (өдрийн тайлан) эсвэл өдөр (сарын тайлан) тус бүрийн орлого
function getTimeline(r, p) {
  if (p.kind === 'day') {
    const hours = r.byHour.map((v, h) => ({ ...v, h })).filter((v) => v.count > 0);
    if (!hours.length) return [];
    const first = hours[0].h;
    const last = hours[hours.length - 1].h;
    return r.byHour.slice(first, last + 1).map((v, i) => ({ ...v, label: `${pad(first + i)}:00 – ${pad(first + i + 1)}:00` }));
  }
  const rows = [];
  const d = new Date(p.current.start);
  while (d <= p.current.end) {
    const key = formatDate(d);
    rows.push({ label: key, ...(r.byDay[key] || { amount: 0, count: 0 }) });
    d.setDate(d.getDate() + 1);
  }
  return rows;
}

// Тайлангийн гол дүгнэлтийг энгийн өгүүлбэрээр
function buildInsights(r, prev, p, timeline) {
  const lines = [];
  if (r.orderCount === 0) {
    lines.push({ text: `${p.phrase} төлбөр төлөгдсөн захиалга бүртгэгдээгүй байна.` });
  } else {
    lines.push({ text: <>{p.phrase} <b>{num(r.orderCount)}</b> захиалгаас нийт <b>{money(r.income)}</b> орлого орсон. Нэг захиалга дунджаар <b>{money(r.income / r.orderCount)}</b>.</> });
  }

  if (prev.income > 0) {
    const diff = r.income - prev.income;
    const pct = Math.abs(percent(diff, prev.income)).toFixed(1);
    if (Math.abs(diff) < 1) lines.push({ text: `Орлого ${p.compareWord} өөрчлөгдөөгүй.` });
    else lines.push({ tone: diff > 0 ? 'good' : 'bad', text: <>Орлого {p.compareWord} <b>{money(Math.abs(diff))}</b> ({pct}%) {diff > 0 ? 'их' : 'бага'} байна.</> });
  } else {
    lines.push({ text: 'Харьцуулах өмнөх үед борлуулалт бүртгэгдээгүй.' });
  }

  if (r.expenseTotal === 0) {
    lines.push({ tone: 'warn', text: 'Энэ хугацаанд зарлага бүртгэгдээгүй тул цэвэр ашиг орлоготой тэнцүү гарч байна. Бодит ашгийг харахын тулд цалин, түүхий эд зэрэг зарлагаа доор бүртгэнэ үү.' });
  } else if (r.net >= 0) {
    lines.push({ tone: 'good', text: <>Зарлага <b>{money(r.expenseTotal)}</b> гарсны дараа <b>{money(r.net)}</b> цэвэр ашиг үлдсэн: 100 ₮ орлого тутмаас {Math.round(percent(r.net, r.income))} ₮.</> });
  } else {
    lines.push({ tone: 'bad', text: <>Зарлага (<b>{money(r.expenseTotal)}</b>) орлогоос их байгаа тул <b>{money(Math.abs(r.net))}</b> алдагдалтай байна.</> });
  }

  if (r.items.length) {
    const [name, d] = r.items[0];
    lines.push({ text: <>Хамгийн их орлого оруулсан хоол: <b>{name}</b> — {num(d.qty)} ширхэг, {money(d.revenue)}.</> });
  }

  const topPay = PAYMENT_METHODS.map((m) => ({ ...m, ...r.payments[m.key] })).sort((a, b) => b.amount - a.amount)[0];
  if (topPay && topPay.amount > 0) {
    lines.push({ text: <>Төлбөрийн хамгийн их хэсэг нь {topPay.by} орсон: {money(topPay.amount)} ({percent(topPay.amount, r.income).toFixed(0)}%).</> });
  }

  const busiest = [...timeline].sort((a, b) => b.amount - a.amount)[0];
  if (busiest && busiest.amount > 0) {
    lines.push({
      text: p.kind === 'day'
        ? <>Хамгийн ачаалалтай цаг: <b>{busiest.label}</b> ({num(busiest.count)} захиалга, {money(busiest.amount)}).</>
        : <>Хамгийн их орлоготой өдөр: <b>{busiest.label}</b> ({num(busiest.count)} захиалга, {money(busiest.amount)}).</>,
    });
  }

  if (r.cancelledCount > 0) {
    lines.push({ text: `${num(r.cancelledCount)} захиалга цуцлагдсан. Тэдгээр нь орлогод ороогүй.` });
  }
  if (r.ordersWithoutItems > 0) {
    lines.push({ tone: 'warn', text: `${num(r.ordersWithoutItems)} захиалгад хоолны бүртгэл алга (касс хадгалах үед тасалдсан байж болзошгүй). Тэдний дүн орлогод орсон тул шалгана уу.` });
  }
  return lines;
}

// ==============================================
// ЖИЖИГ ДҮРСЛЭЛҮҮД
// ==============================================
function Delta({ current, previous, inverse = false, word = '' }) {
  if (!previous) return <span className="rp-delta rp-muted">Өмнө нь бүртгэлгүй</span>;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.05) return <span className="rp-delta rp-muted">Өөрчлөлтгүй</span>;
  const good = inverse ? change < 0 : change > 0;
  return (
    <span className={`rp-delta ${good ? 'rp-good' : 'rp-bad'}`}>
      {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%{word && <span className="rp-delta-word"> {word}</span>}
    </span>
  );
}

function Kpi({ label, hint, value, sub, tone }) {
  return (
    <div className="rp-kpi">
      <div className="rp-kpi-label">{label}</div>
      <div className={`rp-kpi-value ${tone || ''}`}>{value}</div>
      <div className="rp-kpi-sub">{sub}</div>
      {hint && <div className="rp-kpi-hint">{hint}</div>}
    </div>
  );
}

function ShareBar({ value }) {
  return (
    <div className="rp-bar" aria-hidden="true">
      <div className="rp-bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
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
  .rp-btn:disabled { opacity: 0.5; cursor: default; }
  .rp-btn-primary { background: #0f172a; border-color: #0f172a; color: white; }
  .rp-btn-danger { color: #b91c1c; border-color: #fecaca; }
  .rp-filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; background: white; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; }
  .rp-filter { padding: 7px 14px; border-radius: 4px; border: 1px solid #cbd5e1; font-weight: 600; cursor: pointer; background: white; color: #475569; }
  .rp-filter[aria-pressed='true'] { background: #0f172a; border-color: #0f172a; color: white; }
  .rp-summary { background: white; border: 1px solid #e2e8f0; border-left: 4px solid #0f766e; border-radius: 6px; padding: 18px 20px; margin-bottom: 20px; break-inside: avoid; }
  .rp-summary ul { margin: 10px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; }
  .rp-summary li { position: relative; padding-left: 22px; line-height: 1.5; font-size: 0.95rem; color: #1e293b; }
  .rp-summary li::before { content: '•'; position: absolute; left: 6px; color: #94a3b8; font-weight: 700; }
  .rp-summary li.good::before { content: '▲'; left: 2px; font-size: 0.75rem; top: 3px; color: #047857; }
  .rp-summary li.bad::before { content: '▼'; left: 2px; font-size: 0.75rem; top: 3px; color: #b91c1c; }
  .rp-summary li.warn { background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 8px 10px 8px 30px; color: #92400e; }
  .rp-summary li.warn::before { content: '!'; left: 12px; top: 8px; color: #b45309; }
  .rp-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .rp-kpi { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; }
  .rp-kpi-label { font-size: 0.85rem; font-weight: 700; color: #475569; }
  .rp-kpi-value { margin: 6px 0 4px; font-size: 1.55rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .rp-kpi-sub { font-size: 0.82rem; color: #64748b; min-height: 1.1em; }
  .rp-kpi-hint { margin-top: 6px; font-size: 0.76rem; color: #94a3b8; line-height: 1.4; }
  .rp-pos { color: #047857; } .rp-neg { color: #b91c1c; } .rp-warn { color: #b45309; }
  .rp-delta { font-weight: 700; } .rp-good { color: #047857; } .rp-bad { color: #b91c1c; } .rp-muted { color: #94a3b8; font-weight: 400; }
  .rp-delta-word { font-weight: 400; color: #64748b; }
  .rp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 20px; margin-bottom: 20px; }
  .rp-card { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; break-inside: avoid; }
  .rp-page .rp-card-title { margin: 0 0 4px; padding: 0; border: none; font-size: 1.05rem; font-weight: 700; color: #0f172a; text-align: left; }
  .rp-card-note { margin: 0 0 14px; font-size: 0.82rem; color: #64748b; line-height: 1.5; }
  .rp-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
  .rp-table th { text-align: left; padding: 8px 6px; font-size: 0.78rem; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  .rp-table td { padding: 9px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .rp-table .r { text-align: right; white-space: nowrap; } .rp-table .c { text-align: center; }
  .rp-table .indent { padding-left: 22px; color: #475569; }
  .rp-table tr.rp-group td { font-weight: 700; color: #475569; padding-top: 14px; border-bottom: none; }
  .rp-table tr.rp-subtotal td { font-weight: 700; border-top: 1px solid #cbd5e1; }
  .rp-table tr.rp-total td { font-weight: 700; border-top: 2px solid #0f172a; border-bottom: none; font-size: 0.98rem; }
  .rp-table tr.rp-peak td { background: #f0fdfa; font-weight: 700; }
  .rp-bar { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; min-width: 60px; }
  .rp-bar-fill { height: 100%; background: #0f766e; }
  .rp-scroll { max-height: 420px; overflow-y: auto; }
  .rp-closure { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; background: #f0fdf4; color: #166534; padding: 14px 18px; border: 1px solid #bbf7d0; border-radius: 6px; margin-bottom: 20px; }
  .rp-form { display: grid; gap: 12px; }
  .rp-form label { display: block; font-size: 0.85rem; color: #475569; margin-bottom: 4px; }
  .rp-form input, .rp-form select { width: 100%; padding: 9px 10px; border-radius: 4px; border: 1px solid #cbd5e1; background: white; font-size: 0.95rem; }
  .rp-del { background: none; border: none; color: #b91c1c; cursor: pointer; font-size: 0.82rem; font-weight: 700; padding: 4px; }
  .rp-glossary { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px 24px; margin: 8px 0 12px; }
  .rp-glossary div { font-size: 0.82rem; color: #475569; line-height: 1.5; }
  .rp-notes { font-size: 0.8rem; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  .rp-loading { padding: 50px; text-align: center; color: #64748b; }
  .rp-link { background: none; border: none; color: #0f766e; font-weight: 700; cursor: pointer; padding: 8px 0 0; }
  .rp-print-only { display: none; }
  @media (max-width: 520px) {
    .rp-page { padding: 14px; } .rp-grid { grid-template-columns: 1fr; } .rp-table { font-size: 0.8rem; }
    .rp-table td, .rp-table th { padding: 7px 4px; } .rp-kpis { grid-template-columns: 1fr 1fr; } .rp-kpi-value { font-size: 1.2rem; }
  }
  @media print {
    @page { size: A4; margin: 14mm; }
    .rp-page { background: white; padding: 0; }
    .rp-no-print { display: none !important; }
    .rp-print-only { display: block; }
    .rp-card, .rp-kpi, .rp-summary { border-color: #cbd5e1; }
    .rp-grid { grid-template-columns: 1fr 1fr; }
    .rp-kpis { grid-template-columns: repeat(3, 1fr); }
    .rp-scroll { max-height: none; overflow: visible; }
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

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

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
  const requestRef = useRef(0); // хурдан шүүлтүүр солиход хуучин хариу шинийг дарахаас сэргийлнэ

  // Зарлагын маягт
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Цалин');
  const [expCustomDesc, setExpCustomDesc] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ==============================================
  // ӨГӨГДӨЛ ТАТАХ
  // ==============================================
  const fetchAdvancedReport = async () => {
    const p = getPeriods(reportFilter, customDate);
    if (!p) return;
    const requestId = ++requestRef.current;
    setIsReportLoading(true);
    setLoadError('');
    try {
      const [orders, expenses, prevOrders, prevExpenses, closure] = await Promise.all([
        fetchAllRows(ordersQuery(p.current, 'id, created_at, total_amount, status, payment_method, order_type, order_items (quantity, price, menu_items (name))')),
        fetchAllRows(expensesQuery(p.current)),
        fetchAllRows(ordersQuery(p.previous, 'id, total_amount, status, payment_method, order_type')),
        fetchAllRows(expensesQuery(p.previous)),
        p.closureDate
          ? supabase.from('shift_closures').select('*').eq('closure_date', p.closureDate)
          : Promise.resolve({ data: null }),
      ]);
      if (requestId !== requestRef.current) return;
      setPeriods(p);
      setReport(summarise(orders, expenses));
      setPrevious(summarise(prevOrders, prevExpenses));
      setShiftClosureData(closure.data?.[0] || null);
      setGeneratedAt(new Date());
      setShowAllItems(false);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error(err);
      setLoadError('Тайлангийн мэдээллийг татахад алдаа гарлаа. Интернэтээ шалгаад "Шинэчлэх" дарна уу.');
    } finally {
      if (requestId === requestRef.current) setIsReportLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchAdvancedReport();
    // Шүүлтүүр солигдоход л дахин татна.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, reportFilter, customDate]);

  // ==============================================
  // ЗАРЛАГА БҮРТГЭХ, УСТГАХ
  // ==============================================
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) return alert('Зарлагын дүнг зөв оруулна уу.');

    let finalDesc = expCategory;
    if (expCategory === 'Бусад') {
      if (!expCustomDesc.trim()) return alert('Зарлагын утгыг тайлбарлаж бичнэ үү.');
      finalDesc = expCustomDesc.trim();
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

  const handleDeleteExpense = async (exp) => {
    if (!window.confirm(`"${exp.description || exp.category}" — ${money(exp.amount)} зарлагыг устгах уу?`)) return;
    setDeletingId(exp.id);
    try {
      const { data, error } = await supabase.from('expenses').delete().eq('id', exp.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Устгах эрх алга эсвэл зарлага олдсонгүй.');
      fetchAdvancedReport();
    } catch (err) {
      alert("Устгаж чадсангүй: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ==============================================
  // НЭВТРЭХ ДЭЛГЭЦ
  // ==============================================
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'Arial, sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center', width: '340px', maxWidth: 'calc(100vw - 32px)' }}>
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
  const p = periods;
  const hasExpenses = r ? r.expenseTotal > 0 : false;
  const avgTicket = r && r.orderCount ? r.income / r.orderCount : 0;
  const prevAvgTicket = prev && prev.orderCount ? prev.income / prev.orderCount : 0;
  const margin = r ? percent(r.net, r.income) : 0;
  const itemTotal = r ? r.items.reduce((s, [, d]) => s + d.revenue, 0) : 0;
  const itemQty = r ? r.items.reduce((s, [, d]) => s + d.qty, 0) : 0;
  const visibleItems = r ? (showAllItems ? r.items : r.items.slice(0, 15)) : [];
  const expenseCategories = r && prev
    ? [...new Set([...Object.keys(r.expenseByCategory), ...Object.keys(prev.expenseByCategory)])]
    : [];
  const timeline = r && p ? getTimeline(r, p) : [];
  const timelineMax = Math.max(0, ...timeline.map((t) => t.amount));
  const insights = r && prev && p ? buildInsights(r, prev, p, timeline) : [];
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
          {p && (
            <div className="rp-meta">
              <div>Тайлант хугацаа: <strong>{p.label}</strong></div>
              <div>Харьцуулсан үе: {p.prevLabel}</div>
              {generatedAt && <div>Мэдээлэл шинэчилсэн: {formatDateTime(generatedAt)} · Бүх дүн төгрөгөөр (₮)</div>}
            </div>
          )}
        </div>
        <div className="rp-actions rp-no-print">
          <button className="rp-btn" onClick={fetchAdvancedReport} disabled={isReportLoading}>↻ Шинэчлэх</button>
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
            max={getTodayString()}
            onChange={(e) => { if (!e.target.value) return; setCustomDate(e.target.value); setReportFilter('custom_date'); }}
            className="rp-filter"
            aria-pressed={reportFilter === 'custom_date'}
          />
        </div>
      </div>

      {/* ЭЭЛЖ ХААЛТ (хуучин бүртгэл) */}
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

      {!isReportLoading && !loadError && r && prev && p && (
        <>
          {/* ТОВЧ ДҮГНЭЛТ */}
          <section className="rp-summary" aria-label="Товч дүгнэлт">
            <h2 className="rp-card-title">Товч дүгнэлт</h2>
            <ul>
              {insights.map((line, i) => <li key={i} className={line.tone || ''}>{line.text}</li>)}
            </ul>
          </section>

          {/* ГОЛ ҮЗҮҮЛЭЛТ */}
          <section className="rp-kpis" aria-label="Гол үзүүлэлтүүд">
            <Kpi label="Нийт орлого" value={money(r.income)} sub={<Delta current={r.income} previous={prev.income} word={p.compareWord} />} hint="Төлбөр нь авагдсан бүх захиалгын дүн" />
            <Kpi label="Нийт зарлага" value={money(r.expenseTotal)} tone={hasExpenses ? '' : 'rp-warn'}
              sub={hasExpenses ? <Delta current={r.expenseTotal} previous={prev.expenseTotal} inverse word={p.compareWord} /> : <span className="rp-warn">Зарлага бүртгэгдээгүй</span>}
              hint="Цалин, түүхий эд, тог ус гэх мэт" />
            <Kpi label="Цэвэр ашиг" value={money(r.net)} tone={r.net < 0 ? 'rp-neg' : (hasExpenses ? 'rp-pos' : '')}
              sub={hasExpenses ? <Delta current={r.net} previous={prev.net} word={p.compareWord} /> : <span className="rp-warn">Зарлага оруулаагүй тул бодит бус</span>}
              hint="Орлого − Зарлага" />
            <Kpi label="Ашгийн хувь" value={hasExpenses ? `${margin.toFixed(1)}%` : '—'} tone={margin < 0 ? 'rp-neg' : ''}
              sub={hasExpenses ? `100 ₮ орлогоос ${Math.round(margin)} ₮ ашиг` : 'Зарлага бүртгэсний дараа гарна'}
              hint={prev.expenseTotal > 0 ? `${p.prevShort}: ${percent(prev.net, prev.income).toFixed(1)}%` : null} />
            <Kpi label="Захиалгын тоо" value={num(r.orderCount)} sub={<Delta current={r.orderCount} previous={prev.orderCount} word={p.compareWord} />} hint={r.cancelledCount ? `Цуцлагдсан ${num(r.cancelledCount)} захиалга ороогүй` : 'Цуцлагдсан захиалга ороогүй'} />
            <Kpi label="Нэг захиалгын дундаж" value={money(avgTicket)} sub={<Delta current={avgTicket} previous={prevAvgTicket} word={p.compareWord} />} hint="Орлого ÷ захиалгын тоо" />
          </section>

          <div className="rp-grid">
            {/* ОРЛОГО, ЗАРЛАГЫН ТАЙЛАН */}
            <section className="rp-card">
              <h2 className="rp-card-title">Орлого, зарлагын тайлан</h2>
              <p className="rp-card-note">Харьцуулсан үе: {p.prevLabel}. Ногоон нь сайн, улаан нь анхаарах өөрчлөлт.</p>
              <table className="rp-table">
                <thead>
                  <tr><th>Үзүүлэлт</th><th className="r">{p.curShort}</th><th className="r">{p.prevShort}</th><th className="r">Өөрчлөлт</th></tr>
                </thead>
                <tbody>
                  <tr className="rp-subtotal">
                    <td>Борлуулалтын орлого</td>
                    <td className="r">{money(r.income)}</td><td className="r">{money(prev.income)}</td>
                    <td className="r"><Delta current={r.income} previous={prev.income} /></td>
                  </tr>
                  <tr className="rp-group"><td colSpan={4}>Зарлага</td></tr>
                  {expenseCategories.length === 0 && (
                    <tr><td className="indent rp-muted" colSpan={4}>Аль ч үед зарлага бүртгэгдээгүй</td></tr>
                  )}
                  {expenseCategories.map((cat) => (
                    <tr key={cat}>
                      <td className="indent">{EXPENSE_LABELS[cat] || cat}</td>
                      <td className="r">{money(r.expenseByCategory[cat] || 0)}</td>
                      <td className="r">{money(prev.expenseByCategory[cat] || 0)}</td>
                      <td className="r"><Delta current={r.expenseByCategory[cat] || 0} previous={prev.expenseByCategory[cat] || 0} inverse /></td>
                    </tr>
                  ))}
                  <tr className="rp-subtotal">
                    <td>Нийт зарлага</td>
                    <td className="r">{money(r.expenseTotal)}</td><td className="r">{money(prev.expenseTotal)}</td>
                    <td className="r"><Delta current={r.expenseTotal} previous={prev.expenseTotal} inverse /></td>
                  </tr>
                  <tr className="rp-total">
                    <td>{r.net < 0 ? 'Алдагдал' : 'Цэвэр ашиг'} <span className="rp-muted" style={{ fontSize: '0.8rem' }}>(орлого − зарлага)</span></td>
                    <td className={`r ${r.net < 0 ? 'rp-neg' : 'rp-pos'}`}>{money(r.net)}</td>
                    <td className={`r ${prev.net < 0 ? 'rp-neg' : ''}`}>{money(prev.net)}</td>
                    <td className="r"><Delta current={r.net} previous={prev.net} /></td>
                  </tr>
                </tbody>
              </table>
              <table className="rp-table" style={{ marginTop: '14px' }}>
                <tbody>
                  <tr><td>Ашгийн хувь</td><td className="r">{hasExpenses ? `${margin.toFixed(1)}%` : '— (зарлага бүртгэгдээгүй)'}</td></tr>
                  <tr><td>Нэг захиалгын дундаж</td><td className="r">{money(avgTicket)}</td></tr>
                  <tr><td>Цуцлагдсан захиалга</td><td className="r">{num(r.cancelledCount)}</td></tr>
                </tbody>
              </table>
            </section>

            <div style={{ display: 'grid', gap: '20px', alignContent: 'start' }}>
              {/* ТӨЛБӨРИЙН ХЭЛБЭР */}
              <section className="rp-card">
                <h2 className="rp-card-title">Орлого — төлбөрийн хэлбэрээр</h2>
                <p className="rp-card-note">Мөнгө ямар хэлбэрээр орсныг харуулна. Рублийн төлбөрийг касс дээр оруулсан ханшаар төгрөгт шилжүүлсэн.</p>
                <table className="rp-table">
                  <thead><tr><th>Хэлбэр</th><th className="c">Гүйлгээ</th><th className="r">Дүн</th><th className="r">Хувь</th><th aria-label="График" /></tr></thead>
                  <tbody>
                    {PAYMENT_METHODS.filter(({ key }) => key !== 'unknown' || r.payments.unknown.count).map(({ key, label }) => {
                      const pm = r.payments[key];
                      const share = percent(pm.amount, r.income);
                      return (
                        <tr key={key}>
                          <td>{label}</td><td className="c">{num(pm.count)}</td><td className="r">{money(pm.amount)}</td>
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
            {/* ЦАГААР / ӨДРӨӨР */}
            <section className="rp-card">
              <h2 className="rp-card-title">{p.kind === 'day' ? 'Орлого — цагаар' : 'Орлого — өдрөөр'}</h2>
              <p className="rp-card-note">{p.kind === 'day' ? 'Аль цагт хамгийн их ачаалалтай байсныг харуулна. Тодруулсан мөр нь хамгийн их орлоготой цаг.' : 'Өдөр бүрийн орлого. Тодруулсан мөр нь хамгийн их орлоготой өдөр.'}</p>
              {timeline.length === 0 ? <p className="rp-muted">Мэдээлэл олдсонгүй.</p> : (
                <div className="rp-scroll">
                  <table className="rp-table">
                    <thead><tr><th>{p.kind === 'day' ? 'Цаг' : 'Өдөр'}</th><th className="c">Захиалга</th><th className="r">Орлого</th><th aria-label="График" /></tr></thead>
                    <tbody>
                      {timeline.map((t) => (
                        <tr key={t.label} className={t.amount > 0 && t.amount === timelineMax ? 'rp-peak' : ''}>
                          <td style={{ whiteSpace: 'nowrap' }}>{t.label}</td>
                          <td className="c">{t.count ? num(t.count) : <span className="rp-muted">—</span>}</td>
                          <td className="r">{t.amount ? money(t.amount) : <span className="rp-muted">—</span>}</td>
                          <td style={{ width: '30%' }}><ShareBar value={percent(t.amount, timelineMax)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* БОРЛУУЛАЛТ (ХООЛООР) */}
            <section className="rp-card">
              <h2 className="rp-card-title">Борлуулалт — хоолоор</h2>
              <p className="rp-card-note">Хамгийн их орлого оруулсан хоол эхэндээ. Захиалсан үеийн үнээр тооцсон.</p>
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
                  {Math.abs(itemTotal - r.income) >= 1 && (
                    <p className="rp-card-note" style={{ marginTop: '10px', marginBottom: 0 }}>
                      Хоолны нийлбэр нийт орлогоос {money(Math.abs(itemTotal - r.income))}-өөр {itemTotal > r.income ? 'их' : 'бага'} байна
                      {r.ordersWithoutItems > 0 ? ` (${num(r.ordersWithoutItems)} захиалгад хоолны бүртгэл алга)` : ''}.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>

          <div className="rp-grid">
            {/* ЗАРЛАГЫН ЖАГСААЛТ */}
            <section className="rp-card">
              <h2 className="rp-card-title">Зарлагын жагсаалт</h2>
              {r.expenses.length === 0 ? <p className="rp-muted" style={{ marginTop: '10px' }}>Энэ хугацаанд зарлага бүртгэгдээгүй байна.</p> : (
                <table className="rp-table" style={{ marginTop: '10px' }}>
                  <thead><tr><th>{p.kind === 'day' ? 'Цаг' : 'Огноо'}</th><th>Ангилал</th><th>Тайлбар</th><th className="r">Дүн</th><th className="rp-no-print" aria-label="Устгах" /></tr></thead>
                  <tbody>
                    {r.expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="rp-muted" style={{ whiteSpace: 'nowrap' }}>{p.kind === 'day' ? formatTime(new Date(exp.created_at)) : formatDate(new Date(exp.created_at))}</td>
                        <td>{EXPENSE_LABELS[exp.category] || exp.category}</td>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exp.description}>{exp.description}</td>
                        <td className="r">{money(exp.amount)}</td>
                        <td className="r rp-no-print">
                          <button className="rp-del" onClick={() => handleDeleteExpense(exp)} disabled={deletingId === exp.id} aria-label="Зарлага устгах">
                            {deletingId === exp.id ? '...' : 'Устгах'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="rp-total"><td colSpan={3}>Нийт зарлага</td><td className="r">{money(r.expenseTotal)}</td><td className="rp-no-print" /></tr>
                  </tbody>
                </table>
              )}
            </section>

            {/* ЗАРЛАГА БҮРТГЭХ */}
            <section className="rp-card rp-no-print">
              <h2 className="rp-card-title">Зарлага бүртгэх</h2>
              <p className="rp-card-note">Бүртгэсэн зарлага өнөөдрийн огноогоор орж, цэвэр ашгийг шууд тооцно.</p>
              <form onSubmit={handleAddExpense} className="rp-form">
                <div>
                  <label htmlFor="exp-amount">Зарлагын дүн (₮)</label>
                  <input id="exp-amount" type="number" inputMode="numeric" min="1" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required placeholder="0" />
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
          </div>

          <footer className="rp-notes">
            <strong style={{ color: '#475569' }}>Нэр томьёоны тайлбар</strong>
            <div className="rp-glossary">
              <div><b>Орлого</b> — төлбөр нь авагдсан бүх захиалгын дүн (гал тогоонд хийгдэж буй болон бэлэн болсон). Цуцлагдсан захиалга ороогүй.</div>
              <div><b>Зарлага</b> — энэ хуудсанд бүртгэсэн цалин, түүхий эд, тог ус зэрэг зардал.</div>
              <div><b>Цэвэр ашиг</b> — орлогоос зарлагыг хассан дүн. Хасах (−) тэмдэгтэй бол алдагдал.</div>
              <div><b>Ашгийн хувь</b> — орлогын хэдэн хувь нь ашиг болж үлдсэн бэ.</div>
              <div><b>Нэг захиалгын дундаж</b> — нэг захиалга дунджаар хэдэн төгрөг байсан бэ.</div>
              <div><b>▲ / ▼</b> — {p.compareWord} хэдэн хувиар өссөн (ногоон = сайн) эсвэл буурсан (улаан = анхаарах).</div>
            </div>
            Бүх дүн төгрөгөөр (₮). Рублийн төлбөрийг касс дээр оруулсан ханшаар төгрөгт шилжүүлсэн дүнгээр тооцсон.
            <span className="rp-print-only">Хэвлэсэн: {formatDateTime(new Date())}</span>
          </footer>
        </>
      )}
    </div>
  );
}

export default ReportPage;
