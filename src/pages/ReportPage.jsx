import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';

// ==============================================
// ТОГТМОЛ, ТУСЛАХ ФУНКЦУУД
// ==============================================
const BRAND = 'Зогсоо Хайрхан';
const PAGE_SIZE = 1000; // Supabase нэг хүсэлтэд 1000-аас олон мөр өгдөггүй
const PAID_STATUSES = ['cooking', 'completed']; // касс төлбөр авсны дараа 'cooking' болдог
const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

// Өнгө нь төлбөрийн хэлбэрийг дагана (шүүлтүүр солиход өөрчлөгдөхгүй)
const PAYMENT_METHODS = [
  { key: 'cash', label: 'Бэлэн мөнгө', by: 'бэлэн мөнгөөр', color: '#2a78d6' },
  { key: 'ruble', label: 'Рубль (₮-өөр)', by: 'рублиэр', color: '#eb6834' },
  { key: 'card', label: 'Карт', by: 'картаар', color: '#1baf7a' },
  { key: 'qpay', label: 'QPay', by: 'QPay-ээр', color: '#eda100' },
  { key: 'transfer', label: 'Данс', by: 'дансаар', color: '#e87ba4' },
  { key: 'unknown', label: 'Тодорхойгүй', by: 'тодорхойгүй хэлбэрээр', color: '#8a8f98' },
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

const VIEWS = [
  { key: 'month', label: 'Сар' },
  { key: 'week', label: '7 хоног' },
  { key: 'day', label: 'Өдөр' },
];

const money = (n) => {
  const v = Math.round(n || 0);
  return `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('en-US')} ₮`;
};
const num = (n) => Math.round(n || 0).toLocaleString('en-US');
const percent = (part, whole) => (whole ? (part / whole) * 100 : 0);
const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const formatMD = (d) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const formatDateTime = (d) => `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseInputDate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const todayInput = () => toInputDate(new Date());

const dayRange = (date) => {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  return { start, end };
};
const startOfWeek = (date) => {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Даваа гарагаас эхэлнэ
  return d;
};
const isoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
};

// Сонгосон хугацааны эхлэл (сум товчоор шилжихэд хэрэглэнэ)
function shiftAnchor(view, anchorStr, step) {
  const a = parseInputDate(anchorStr);
  if (view === 'day') a.setDate(a.getDate() + step);
  else if (view === 'week') a.setDate(a.getDate() + step * 7);
  else { a.setDate(1); a.setMonth(a.getMonth() + step); }
  return toInputDate(a);
}

function periodStart(view, anchorStr) {
  const a = parseInputDate(anchorStr);
  if (view === 'day') return dayRange(a).start;
  if (view === 'week') return startOfWeek(a);
  return new Date(a.getFullYear(), a.getMonth(), 1);
}

// Сонгосон хугацаа, түүнтэй харьцуулах үе, тайланд гарах энгийн нэршил.
// Өдрийн тайланг өмнөх АЖИЛЛАСАН өдөртэй (ням, амралтын өдрийг алгасна) харьцуулна.
// Хугацаа дуусаагүй бол өмнөх үеийг мөн цаг/мөн үе хүртэл нь тасалж шударга харьцуулна.
function getPeriods(view, anchorStr, prevSalesDay) {
  const now = new Date();
  const anchor = parseInputDate(anchorStr);
  if (Number.isNaN(anchor.getTime())) return null;
  let current; let previous; const p = { view };

  if (view === 'day') {
    current = dayRange(anchor);
    const prevBase = prevSalesDay || new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 1);
    previous = dayRange(prevBase);
    const wd = WEEKDAYS[anchor.getDay()];
    const pwd = WEEKDAYS[prevBase.getDay()];
    const isToday = toInputDate(anchor) === todayInput();
    const live = now >= current.start && now <= current.end;
    Object.assign(p, {
      label: `${formatDate(anchor)}, ${wd} гараг`,
      prevLabel: `Өмнөх ажилласан өдөр: ${formatDate(prevBase)}, ${pwd} гараг${live ? ` (${formatTime(now)} хүртэл)` : ''}`,
      curShort: isToday ? 'Өнөөдөр' : formatMD(anchor),
      prevShort: `${pwd} (${formatMD(prevBase)})`,
      phrase: isToday ? 'Өнөөдөр' : `${formatDate(anchor)} өдөр`,
      compareWord: live ? `${pwd} гарагийн мөн цагаас` : `${pwd} гарагаас`,
      closureDate: anchorStr,
    });
  } else if (view === 'week') {
    const start = startOfWeek(anchor);
    const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(end); prevEnd.setDate(prevEnd.getDate() - 7);
    current = { start, end }; previous = { start: prevStart, end: prevEnd };
    const { year, week } = isoWeek(anchor);
    const live = now >= start && now <= end;
    Object.assign(p, {
      week,
      label: `${year} оны ${week}-р 7 хоног (${formatMD(start)} – ${formatMD(end)})`,
      prevLabel: `Өмнөх 7 хоног (${formatMD(prevStart)} – ${formatMD(prevEnd)})${live ? ', мөн үе хүртэл' : ''}`,
      curShort: live ? 'Энэ 7 хоног' : `${week}-р 7 хоног`,
      prevShort: 'Өмнөх 7 хоног',
      phrase: live ? 'Энэ 7 хоногт' : `${week}-р 7 хоногт`,
      compareWord: live ? 'өмнөх 7 хоногийн мөн үеэс' : 'өмнөх 7 хоногоос',
      closureDate: null,
    });
  } else {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevStart = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    const prevEnd = new Date(anchor.getFullYear(), anchor.getMonth(), 0, 23, 59, 59, 999);
    current = { start, end }; previous = { start: prevStart, end: prevEnd };
    const live = now >= start && now <= end;
    Object.assign(p, {
      label: `${start.getFullYear()} оны ${start.getMonth() + 1}-р сар`,
      prevLabel: `${prevStart.getFullYear()} оны ${prevStart.getMonth() + 1}-р сар${live ? ', мөн үе хүртэл' : ''}`,
      curShort: live ? 'Энэ сар' : `${start.getMonth() + 1}-р сар`,
      prevShort: `${prevStart.getMonth() + 1}-р сар`,
      phrase: live ? 'Энэ сард' : `${start.getMonth() + 1}-р сард`,
      compareWord: live ? 'өмнөх сарын мөн үеэс' : 'өмнөх сараас',
      closureDate: null,
    });
  }

  // Дуусаагүй хугацааг өмнөх үеийн мөн хэсэгтэй харьцуулна
  if (now >= current.start && now <= current.end) {
    const cut = new Date(previous.start.getTime() + (now - current.start));
    if (cut < previous.end) previous = { ...previous, end: cut };
  }
  return { ...p, current, previous };
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

// Сонгосон өдрөөс өмнөх, борлуулалт хийсэн хамгийн сүүлийн өдөр
async function findPreviousSalesDay(beforeDate) {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at')
    .in('status', PAID_STATUSES)
    .lt('created_at', beforeDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  return new Date(data[0].created_at);
}

function summarise(orders, expenses) {
  const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const income = paid.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const payments = Object.fromEntries(PAYMENT_METHODS.map(({ key }) => [key, { amount: 0, count: 0 }]));
  const types = Object.fromEntries(ORDER_TYPES.map(({ key }) => [key, { amount: 0, count: 0 }]));
  const items = {};
  const paidList = [];
  let ordersWithoutItems = 0;
  paid.forEach((o) => {
    const amount = o.total_amount || 0;
    const method = payments[o.payment_method] ? o.payment_method : 'unknown';
    payments[method].amount += amount;
    payments[method].count += 1;
    const typeKey = o.order_type === 'dine_in' ? 'dine-in' : (types[o.order_type] ? o.order_type : 'other');
    types[typeKey].amount += amount;
    types[typeKey].count += 1;
    if (o.created_at) paidList.push({ t: new Date(o.created_at), amount, method });
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
    paidList,
    ordersWithoutItems,
    expenseByCategory,
    expenses,
  };
}

// Графикийн тэнхлэг: өдөр → цаг, 7 хоног → Даваа..Ням, сар → 1..31
function buildBuckets(r, p) {
  const now = new Date();
  const buckets = [];
  let keyOf;
  if (p.view === 'day') {
    const hours = r.paidList.map((o) => o.t.getHours());
    const first = Math.min(9, ...hours);
    const last = Math.max(20, ...hours);
    for (let h = first; h <= last; h += 1) {
      const start = new Date(p.current.start); start.setHours(h, 0, 0, 0);
      buckets.push({ key: h, label: `${pad(h)}:00`, long: `${pad(h)}:00 – ${pad(h + 1)}:00`, start });
    }
    keyOf = (o) => o.t.getHours();
  } else {
    const d = new Date(p.current.start);
    while (d <= p.current.end) {
      buckets.push({
        key: formatDate(d),
        label: p.view === 'week' ? WEEKDAYS[d.getDay()] : String(d.getDate()),
        long: `${formatDate(d)}, ${WEEKDAYS[d.getDay()]}`,
        start: new Date(d),
      });
      d.setDate(d.getDate() + 1);
    }
    keyOf = (o) => formatDate(o.t);
  }
  const byKey = new Map();
  buckets.forEach((b) => {
    b.future = b.start > now;
    b.amount = 0; b.count = 0;
    b.methods = Object.fromEntries(PAYMENT_METHODS.map(({ key }) => [key, { amount: 0, count: 0 }]));
    byKey.set(b.key, b);
  });
  r.paidList.forEach((o) => {
    const b = byKey.get(keyOf(o));
    if (!b) return;
    b.amount += o.amount; b.count += 1;
    b.methods[o.method].amount += o.amount; b.methods[o.method].count += 1;
  });
  return buckets;
}

// Тайлангийн гол дүгнэлтийг энгийн өгүүлбэрээр
function buildInsights(r, prev, p, buckets) {
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

  const busiest = [...buckets].sort((a, b) => b.amount - a.amount)[0];
  if (busiest && busiest.amount > 0) {
    lines.push({
      text: <>{p.view === 'day' ? 'Хамгийн ачаалалтай цаг' : 'Хамгийн их орлоготой өдөр'}: <b>{busiest.long}</b> ({num(busiest.count)} захиалга, {money(busiest.amount)}).</>,
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

function ShareBar({ value, color }) {
  return (
    <div className="rp-bar" aria-hidden="true">
      <div className="rp-bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color || undefined }} />
    </div>
  );
}

const STYLES = `
  .rp-shell { display: flex; min-height: 100vh; font-family: 'Onest', Arial, sans-serif; font-weight: 500; color: #0f172a; background: #e9edf3; }
  .rp-shell * { box-sizing: border-box; }
  .rp-shell b, .rp-shell strong { font-weight: 700; }

  /* Зүүн цэс: тайлангийн хэсгүүд */
  .rp-side { width: 240px; flex-shrink: 0; background: #1d3264; color: #dbe3f3; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
  .rp-brand { padding: 22px 20px 18px; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .rp-brand-name { color: white; font-size: 1.4rem; font-weight: 800; line-height: 1.15; }
  .rp-brand-tag { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 4px; background: white; color: #1d3264; font-size: 0.75rem; font-weight: 800; }
  .rp-nav { display: flex; flex-direction: column; padding: 14px 0; gap: 2px; flex: 1; }
  .rp-nav button { display: flex; align-items: center; gap: 12px; padding: 14px 22px; color: #dbe3f3; font-size: 1.05rem; font-weight: 600; background: none; border: none; border-left: 4px solid transparent; cursor: pointer; text-align: left; font-family: inherit; }
  .rp-nav button:hover { color: white; background: rgba(255,255,255,0.06); }
  .rp-nav button[aria-current='page'] { background: #2c4a8a; color: white; font-weight: 800; border-left-color: #7cb4ff; }
  .rp-nav .rp-nav-bottom { margin-top: auto; }
  .rp-nav-icon { width: 24px; text-align: center; }

  .rp-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .rp-topbar { background: white; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 24px; border-bottom: 1px solid #dfe3ea; }
  .rp-topbar .rp-title { margin: 0; padding: 0; border: none; font-size: 1.5rem; font-weight: 800; color: #0f172a; text-align: left; }
  .rp-topbar-sub { font-size: 0.85rem; color: #475569; margin-top: 2px; }
  .rp-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .rp-btn { padding: 9px 16px; font-size: 0.95rem; font-weight: 700; border-radius: 4px; cursor: pointer; border: 1px solid #cfd5df; background: white; color: #1f2937; font-family: inherit; }
  .rp-btn:hover { border-color: #1890ff; color: #1890ff; }
  .rp-btn:disabled { opacity: 0.5; cursor: default; }
  .rp-btn-primary { background: #1d3264; border-color: #1d3264; color: white; }
  .rp-btn-primary:hover { background: #2c4a8a; color: white; border-color: #2c4a8a; }
  .rp-content { padding: 22px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-content: start; }

  .rp-card, .rp-summary, .rp-periodbar { background: white; border-radius: 6px; border: 1px solid #e0e5ed; break-inside: avoid; }

  /* Хугацаа сонгох мөр */
  .rp-periodbar { padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .rp-period-text { font-size: 0.95rem; color: #1e293b; line-height: 1.55; }
  .rp-period-text .rp-compare { color: #475569; font-size: 0.85rem; }
  .rp-period-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .rp-seg { display: inline-flex; }
  .rp-seg button { padding: 9px 18px; border: 1px solid #cfd5df; background: white; color: #1f2937; font-size: 0.95rem; font-weight: 600; cursor: pointer; margin-left: -1px; font-family: inherit; }
  .rp-seg button:first-child { border-radius: 4px 0 0 4px; margin-left: 0; }
  .rp-seg button:last-child { border-radius: 0 4px 4px 0; }
  .rp-seg button[aria-pressed='true'] { color: #1890ff; border-color: #1890ff; position: relative; z-index: 1; font-weight: 800; }
  .rp-datebar { display: flex; align-items: center; gap: 6px; }
  .rp-datebar input { padding: 8px 10px; border: 1px solid #cfd5df; border-radius: 4px; font-size: 0.95rem; font-weight: 600; color: #1f2937; background: white; font-family: inherit; min-height: 38px; }
  .rp-step { width: 38px; height: 38px; border: 1px solid #cfd5df; border-radius: 4px; background: white; font-size: 1.2rem; cursor: pointer; color: #334155; }
  .rp-step:disabled { opacity: 0.35; cursor: default; }

  .rp-section { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .rp-section-hidden { display: none; }
  .rp-section-title { margin: 0; font-size: 1.15rem; font-weight: 800; }

  .rp-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  @media (max-width: 760px) { .rp-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .rp-kpi { background: white; border: 1px solid #e0e5ed; border-radius: 6px; padding: 16px 18px; }
  .rp-kpi-label { font-size: 0.92rem; font-weight: 700; color: #334155; }
  .rp-kpi-value { margin: 6px 0 4px; font-size: clamp(1.2rem, 1.7vw, 1.6rem); font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rp-kpi-sub { font-size: 0.85rem; color: #475569; min-height: 1.1em; }
  .rp-kpi-hint { margin-top: 6px; font-size: 0.8rem; color: #64748b; line-height: 1.4; }

  .rp-pos { color: #047857; } .rp-neg { color: #b91c1c; } .rp-warn { color: #b45309; }
  .rp-delta { font-weight: 800; } .rp-good { color: #047857; } .rp-bad { color: #b91c1c; } .rp-muted { color: #64748b; font-weight: 500; }
  .rp-delta-word { font-weight: 500; color: #475569; }

  .rp-summary { border-left: 4px solid #1d3264; padding: 18px 20px; }
  .rp-summary ul { margin: 10px 0 0; padding: 0; list-style: none; display: grid; gap: 9px; }
  .rp-summary li { position: relative; padding-left: 22px; line-height: 1.55; font-size: 1rem; color: #0f172a; }
  .rp-summary li::before { content: '•'; position: absolute; left: 6px; color: #64748b; font-weight: 800; }
  .rp-summary li.good::before { content: '▲'; left: 2px; font-size: 0.75rem; top: 4px; color: #047857; }
  .rp-summary li.bad::before { content: '▼'; left: 2px; font-size: 0.75rem; top: 4px; color: #b91c1c; }
  .rp-summary li.warn { background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 8px 10px 8px 30px; color: #92400e; }
  .rp-summary li.warn::before { content: '!'; left: 12px; top: 8px; color: #b45309; }

  .rp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 20px; align-items: start; }
  .rp-grid > * { min-width: 0; }
  .rp-card { padding: 20px; }
  .rp-card-title, .rp-summary .rp-card-title { margin: 0 0 4px; padding: 0; border: none; font-size: 1.1rem; font-weight: 800; color: #0f172a; text-align: left; }
  .rp-card-note { margin: 0 0 14px; font-size: 0.86rem; color: #475569; line-height: 1.5; }
  .rp-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; font-variant-numeric: tabular-nums; }
  .rp-table th { text-align: left; padding: 8px 6px; font-size: 0.82rem; font-weight: 800; color: #475569; border-bottom: 2px solid #e2e8f0; }
  .rp-table td { padding: 10px 6px; border-bottom: 1px solid #eef1f5; vertical-align: middle; }
  .rp-table .r { text-align: right; white-space: nowrap; } .rp-table .c { text-align: center; }
  .rp-table .indent { padding-left: 22px; color: #334155; }
  .rp-table tr.rp-group td { font-weight: 800; color: #334155; padding-top: 14px; border-bottom: none; }
  .rp-table tr.rp-subtotal td { font-weight: 800; border-top: 1px solid #cbd5e1; }
  .rp-table tr.rp-total td { font-weight: 800; border-top: 2px solid #0f172a; border-bottom: none; font-size: 1rem; }
  .rp-table tr.rp-peak td { background: #eef4ff; font-weight: 800; }
  .rp-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
  .rp-bar { height: 8px; background: #eef1f5; border-radius: 4px; overflow: hidden; min-width: 60px; }
  .rp-bar-fill { height: 100%; background: #1d3264; }
  .rp-closure { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; background: #f0fdf4; color: #166534; padding: 14px 18px; border: 1px solid #bbf7d0; border-radius: 6px; }
  .rp-form { display: grid; gap: 12px; }
  .rp-form label { display: block; font-size: 0.9rem; font-weight: 700; color: #334155; margin-bottom: 4px; }
  .rp-form input, .rp-form select { width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1; background: white; font-size: 1rem; font-weight: 600; font-family: inherit; }
  .rp-del { background: none; border: none; color: #b91c1c; cursor: pointer; font-size: 0.85rem; font-weight: 800; padding: 4px; font-family: inherit; }
  .rp-glossary { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px 24px; }
  .rp-glossary div { font-size: 0.88rem; color: #334155; line-height: 1.5; }
  .rp-loading { padding: 50px; text-align: center; color: #475569; background: white; border-radius: 6px; }
  .rp-link { background: none; border: none; color: #1677d8; font-weight: 800; cursor: pointer; padding: 8px 0 0; font-family: inherit; font-size: 0.95rem; }
  .rp-print-only { display: none; }

  @media (max-width: 900px) {
    .rp-shell { flex-direction: column; }
    .rp-side { width: 100%; max-width: 100vw; height: auto; position: sticky; top: 0; z-index: 5; flex-direction: row; align-items: center; overflow-x: auto; }
    .rp-brand { border-bottom: none; padding: 10px 14px; flex-shrink: 0; }
    .rp-brand-name { font-size: 1.05rem; white-space: nowrap; }
    .rp-brand-tag { display: none; }
    .rp-nav { flex-direction: row; padding: 0; }
    .rp-nav button { padding: 15px 12px; white-space: nowrap; font-size: 0.95rem; border-left: none; border-bottom: 4px solid transparent; }
    .rp-nav button[aria-current='page'] { border-bottom-color: #7cb4ff; }
    .rp-nav .rp-nav-bottom { margin-top: 0; }
  }
  @media (max-width: 560px) {
    .rp-content { padding: 12px; gap: 14px; } .rp-topbar { padding: 12px 14px; }
    .rp-grid { grid-template-columns: 1fr; } .rp-table { font-size: 0.85rem; }
    .rp-table td, .rp-table th { padding: 8px 4px; } .rp-kpis { grid-template-columns: 1fr 1fr; gap: 10px; }
    .rp-card { overflow-x: auto; padding: 16px 14px; }
    .rp-seg { width: 100%; } .rp-seg button { flex: 1; padding: 9px 6px; }
    .rp-period-controls { width: 100%; } .rp-datebar { width: 100%; } .rp-datebar input { flex: 1; min-width: 0; }
  }
  @media print {
    @page { size: A4; margin: 12mm; }
    .rp-shell { background: white; display: block; }
    .rp-no-print { display: none !important; }
    .rp-print-only { display: block; }
    .rp-section-hidden { display: grid; }
    .rp-content { padding: 0; }
    .rp-topbar { padding: 0 0 10px; border-bottom: 2px solid #0f172a; margin-bottom: 12px; }
    .rp-grid { grid-template-columns: 1fr 1fr; }
    .rp-kpis { grid-template-columns: repeat(3, 1fr); }
  }
`;

const SECTIONS = [
  { key: 'overview', icon: '📊', label: 'Тойм' },
  { key: 'income', icon: '💰', label: 'Орлого' },
  { key: 'sales', icon: '🍽️', label: 'Хоол' },
  { key: 'expenses', icon: '🧾', label: 'Зарлага' },
  { key: 'profit', icon: '📑', label: 'Ашиг, алдагдал' },
];


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
  const [view, setView] = useState('day'); // day | week | month
  const [anchor, setAnchor] = useState(todayInput); // сонгосон өдөр (YYYY-MM-DD)
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [report, setReport] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [periods, setPeriods] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [shiftClosureData, setShiftClosureData] = useState(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const [section, setSection] = useState(() => {
    try { return localStorage.getItem('zogsoo-report-section') || 'overview'; } catch { return 'overview'; }
  });
  const selectSection = (key) => {
    setSection(key);
    try { localStorage.setItem('zogsoo-report-section', key); } catch { /* зөвхөн энэ удаад */ }
    window.scrollTo({ top: 0 });
  };
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
    const requestId = ++requestRef.current;
    setIsReportLoading(true);
    setLoadError('');
    try {
      const prevSalesDay = view === 'day' ? await findPreviousSalesDay(dayRange(parseInputDate(anchor)).start) : null;
      const p = getPeriods(view, anchor, prevSalesDay);
      if (!p) throw new Error('Огноо буруу байна');
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
    // Хугацаа солигдоход л дахин татна.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, view, anchor]);

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
  // ӨГӨГДӨЛ
  // ==============================================
  const r = report;
  const prev = previous;
  const p = periods;
  const buckets = useMemo(() => (r && p ? buildBuckets(r, p) : []), [r, p]);

  // ==============================================
  // НЭВТРЭХ ДЭЛГЭЦ
  // ==============================================
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e9edf3', fontFamily: "'Onest', Arial, sans-serif" }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center', width: '340px', maxWidth: 'calc(100vw - 32px)' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d3264', marginBottom: '4px' }}>{BRAND}</div>
          <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem' }}>Санхүүгийн тайлан</h2>
          <p style={{ color: '#475569', margin: '0 0 25px 0', fontSize: '0.92rem', fontWeight: 500 }}>Зөвхөн эрх бүхий ажилтан нэвтрэнэ.</p>
          <input type="email" placeholder="Цахим шуудан" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box', fontFamily: 'inherit' }} required />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '25px', boxSizing: 'border-box', fontFamily: 'inherit' }} required />
          <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '12px', fontSize: '1rem', backgroundColor: isLoggingIn ? '#94a3b8' : '#1d3264', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit' }}>
            {isLoggingIn ? 'Баталгаажуулж байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    );
  }

  // ==============================================
  // ТАЙЛАН
  // ==============================================
  const hasExpenses = r ? r.expenseTotal > 0 : false;
  const avgTicket = r && r.orderCount ? r.income / r.orderCount : 0;
  const prevAvgTicket = prev && prev.orderCount ? prev.income / prev.orderCount : 0;
  const margin = r ? percent(r.net, r.income) : 0;
  const itemTotal = r ? r.items.reduce((s, [, d]) => s + d.revenue, 0) : 0;
  const itemQty = r ? r.items.reduce((s, [, d]) => s + d.qty, 0) : 0;
  const visibleItems = r ? (showAllItems ? r.items : r.items.slice(0, 20)) : [];
  const expenseCategories = r && prev
    ? [...new Set([...Object.keys(r.expenseByCategory), ...Object.keys(prev.expenseByCategory)])]
    : [];
  const insights = r && prev && p ? buildInsights(r, prev, p, buckets) : [];
  const pastBuckets = buckets.filter((b) => !b.future);
  const bucketMax = Math.max(0, ...pastBuckets.map((b) => b.amount));
  const canGoNext = periodStart(view, shiftAnchor(view, anchor, 1)) <= new Date();
  const anchorWeek = isoWeek(parseInputDate(anchor));
  const ready = !isReportLoading && !loadError && r && prev && p;
  const current = SECTIONS.find((s) => s.key === section) || SECTIONS[0];
  const sectionClass = (key) => `rp-section${section === key ? '' : ' rp-section-hidden'}`;

  return (
    <div className="rp-shell">
      <style>{STYLES}</style>

      {/* ЗҮҮН ЦЭС: тайлангийн хэсгүүд */}
      <aside className="rp-side rp-no-print">
        <div className="rp-brand">
          <div className="rp-brand-name">{BRAND}</div>
          <span className="rp-brand-tag">Санхүү</span>
        </div>
        <nav className="rp-nav" aria-label="Тайлангийн хэсгүүд">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => selectSection(s.key)} aria-current={section === s.key ? 'page' : undefined}>
              <span className="rp-nav-icon" aria-hidden="true">{s.icon}</span>{s.label}
            </button>
          ))}
          <button className="rp-nav-bottom" onClick={handleLogout}><span className="rp-nav-icon" aria-hidden="true">⎋</span>Гарах</button>
        </nav>
      </aside>

      <div className="rp-main">
        <header className="rp-topbar">
          <div>
            <div className="rp-print-only" style={{ fontWeight: 800, letterSpacing: '0.06em', color: '#475569', fontSize: '0.8rem' }}>{BRAND.toUpperCase()} ЗООГИЙН ГАЗАР</div>
            <h1 className="rp-title"><span className="rp-no-print">{current.label}</span><span className="rp-print-only">Санхүүгийн тайлан</span></h1>
            {generatedAt && <div className="rp-topbar-sub">Шинэчилсэн: {formatDateTime(generatedAt)} · Бүх дүн төгрөгөөр (₮)</div>}
          </div>
          <div className="rp-actions rp-no-print">
            <button className="rp-btn" onClick={fetchAdvancedReport} disabled={isReportLoading}>↻ Шинэчлэх</button>
            <button className="rp-btn" onClick={() => window.print()} disabled={!r}>🖨 Хэвлэх / PDF</button>
          </div>
        </header>

        <div className="rp-content">
          {/* ХУГАЦАА */}
          <div className="rp-periodbar">
            <div className="rp-period-text">
              {p ? <>Тайлант хугацаа: <b>{p.label}</b><br /><span className="rp-compare">Харьцуулсан: {p.prevLabel}</span></> : 'Хугацаа сонгоно уу'}
            </div>
            <div className="rp-period-controls rp-no-print">
              <div className="rp-seg" role="group" aria-label="Хугацаа">
                {VIEWS.map(({ key, label }) => (
                  <button key={key} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>
                ))}
              </div>
              <div className="rp-datebar">
                <button className="rp-step" onClick={() => setAnchor(shiftAnchor(view, anchor, -1))} aria-label="Өмнөх">‹</button>
                {view === 'month' ? (
                  <input type="month" value={anchor.slice(0, 7)} max={todayInput().slice(0, 7)} aria-label="Сар сонгох"
                    onChange={(e) => { if (e.target.value) setAnchor(`${e.target.value}-01`); }} />
                ) : (
                  <input type="date" value={anchor} max={todayInput()} aria-label="Өдөр сонгох"
                    onChange={(e) => { if (e.target.value) setAnchor(e.target.value); }} />
                )}
                <button className="rp-step" onClick={() => setAnchor(shiftAnchor(view, anchor, 1))} disabled={!canGoNext} aria-label="Дараах">›</button>
                {anchor !== todayInput() && <button className="rp-btn" onClick={() => setAnchor(todayInput())}>Өнөөдөр</button>}
              </div>
            </div>
          </div>
          {view === 'week' && <div className="rp-muted rp-no-print" style={{ marginTop: '-12px', fontSize: '0.85rem' }}>{anchorWeek.year} оны {anchorWeek.week}-р 7 хоног (Даваа – Ням)</div>}

          {isReportLoading && <div className="rp-loading">Мэдээллийг татаж байна...</div>}
          {!isReportLoading && loadError && <div className="rp-loading" style={{ color: '#b91c1c' }}>{loadError}</div>}

          {ready && (
            <>
              {/* ТОЙМ */}
              <section className={sectionClass('overview')} aria-label="Тойм">
                <h2 className="rp-section-title rp-print-only">Тойм</h2>
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
                <div className="rp-kpis" aria-label="Гол үзүүлэлтүүд">
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
                </div>
                <section className="rp-summary" aria-label="Товч дүгнэлт">
                  <h2 className="rp-card-title">Товч дүгнэлт</h2>
                  <ul>
                    {insights.map((line, i) => <li key={i} className={line.tone || ''}>{line.text}</li>)}
                  </ul>
                </section>
              </section>

              {/* ОРЛОГО */}
              <section className={sectionClass('income')} aria-label="Орлого">
                <h2 className="rp-section-title rp-print-only">Орлого</h2>
                <div className="rp-grid">
                  <section className="rp-card">
                    <h2 className="rp-card-title">Төлбөрийн хэлбэрээр</h2>
                    <p className="rp-card-note">Мөнгө ямар хэлбэрээр орсныг харуулна. Рублийн төлбөрийг касс дээр оруулсан ханшаар төгрөгт шилжүүлсэн.</p>
                    <table className="rp-table">
                      <thead><tr><th>Хэлбэр</th><th className="c">Гүйлгээ</th><th className="r">Дүн</th><th className="r">Хувь</th><th aria-label="Хувь (зураас)" /></tr></thead>
                      <tbody>
                        {PAYMENT_METHODS.filter(({ key }) => key !== 'unknown' || r.payments.unknown.count).map(({ key, label, color }) => {
                          const pm = r.payments[key];
                          const share = percent(pm.amount, r.income);
                          return (
                            <tr key={key}>
                              <td><span className="rp-dot" style={{ background: color }} aria-hidden="true" />{label}</td><td className="c">{num(pm.count)}</td><td className="r">{money(pm.amount)}</td>
                              <td className="r">{share.toFixed(1)}%</td><td style={{ width: '22%' }}><ShareBar value={share} color={color} /></td>
                            </tr>
                          );
                        })}
                        <tr className="rp-total"><td>Нийт</td><td className="c">{num(r.orderCount)}</td><td className="r">{money(r.income)}</td><td className="r">{r.income ? '100.0%' : '0.0%'}</td><td /></tr>
                      </tbody>
                    </table>
                  </section>

                  <section className="rp-card">
                    <h2 className="rp-card-title">Үйлчилгээний төрлөөр</h2>
                    <p className="rp-card-note">Зааланд, авч явах, Тува захиалгын орлого.</p>
                    <table className="rp-table">
                      <thead><tr><th>Төрөл</th><th className="c">Захиалга</th><th className="r">Дүн</th><th className="r">Хувь</th><th aria-label="Хувь (зураас)" /></tr></thead>
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

                <section className="rp-card">
                  <h2 className="rp-card-title">{p.view === 'day' ? 'Цаг бүрийн орлого' : 'Өдөр бүрийн орлого'}</h2>
                  <p className="rp-card-note">Тодруулсан мөр нь хамгийн их орлоготой {p.view === 'day' ? 'цаг' : 'өдөр'}.</p>
                  {pastBuckets.length === 0 ? <p className="rp-muted">Мэдээлэл олдсонгүй.</p> : (
                    <table className="rp-table" id="rp-timeline">
                      <thead><tr><th>{p.view === 'day' ? 'Цаг' : 'Өдөр'}</th><th className="c">Захиалга</th><th className="r">Орлого</th><th aria-label="Харьцуулсан зураас" /></tr></thead>
                      <tbody>
                        {pastBuckets.map((b) => (
                          <tr key={b.key} className={b.amount > 0 && b.amount === bucketMax ? 'rp-peak' : ''}>
                            <td style={{ whiteSpace: 'nowrap' }}>{b.long}</td>
                            <td className="c">{b.count ? num(b.count) : <span className="rp-muted">—</span>}</td>
                            <td className="r">{b.amount ? money(b.amount) : <span className="rp-muted">—</span>}</td>
                            <td style={{ width: '32%' }}><ShareBar value={percent(b.amount, bucketMax)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              </section>

              {/* ХООЛ */}
              <section className={sectionClass('sales')} aria-label="Хоол">
                <h2 className="rp-section-title rp-print-only">Хоолны борлуулалт</h2>
                <section className="rp-card">
                  <h2 className="rp-card-title">Хоолны борлуулалт</h2>
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
                      {r.items.length > 20 && (
                        <button className="rp-link rp-no-print" onClick={() => setShowAllItems((v) => !v)}>
                          {showAllItems ? 'Эхний 20-ыг харуулах' : `Бүгдийг харуулах (${r.items.length})`}
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
              </section>

              {/* ЗАРЛАГА */}
              <section className={sectionClass('expenses')} aria-label="Зарлага">
                <h2 className="rp-section-title rp-print-only">Зарлага</h2>
                <div className="rp-grid">
                  <section className="rp-card">
                    <h2 className="rp-card-title">Зарлагын жагсаалт</h2>
                    {r.expenses.length === 0 ? <p className="rp-muted" style={{ marginTop: '10px' }}>Энэ хугацаанд зарлага бүртгэгдээгүй байна.</p> : (
                      <table className="rp-table" style={{ marginTop: '10px' }}>
                        <thead><tr><th>{p.view === 'day' ? 'Цаг' : 'Огноо'}</th><th>Ангилал</th><th>Тайлбар</th><th className="r">Дүн</th><th className="rp-no-print" aria-label="Устгах" /></tr></thead>
                        <tbody>
                          {r.expenses.map((exp) => (
                            <tr key={exp.id}>
                              <td className="rp-muted" style={{ whiteSpace: 'nowrap' }}>{p.view === 'day' ? formatTime(new Date(exp.created_at)) : formatDate(new Date(exp.created_at))}</td>
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
              </section>

              {/* АШИГ, АЛДАГДАЛ */}
              <section className={sectionClass('profit')} aria-label="Ашиг, алдагдал">
                <h2 className="rp-section-title rp-print-only">Ашиг, алдагдал</h2>
                <section className="rp-card">
                  <h2 className="rp-card-title">Орлого, зарлагын тайлан</h2>
                  <p className="rp-card-note">Харьцуулсан: {p.prevLabel}. Ногоон нь сайн, улаан нь анхаарах өөрчлөлт.</p>
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

                <section className="rp-card">
                  <h2 className="rp-card-title">Нэр томьёоны тайлбар</h2>
                  <div className="rp-glossary" style={{ marginTop: '10px' }}>
                    <div><b>Орлого</b> — төлбөр нь авагдсан бүх захиалгын дүн (гал тогоонд хийгдэж буй болон бэлэн болсон). Цуцлагдсан захиалга ороогүй.</div>
                    <div><b>Зарлага</b> — "Зарлага" хэсэгт бүртгэсэн цалин, түүхий эд, тог ус зэрэг зардал.</div>
                    <div><b>Цэвэр ашиг</b> — орлогоос зарлагыг хассан дүн. Хасах (−) тэмдэгтэй бол алдагдал.</div>
                    <div><b>Ашгийн хувь</b> — орлогын хэдэн хувь нь ашиг болж үлдсэн бэ.</div>
                    <div><b>Харьцуулалт</b> — өдрийг өмнөх ажилласан өдөртэй (амралтын өдрийг алгасна), дуусаагүй хугацааг өмнөх үеийн мөн цаг хүртэлх дүнтэй харьцуулна.</div>
                    <div><b>Рубль</b> — касс дээр оруулсан ханшаар төгрөгт шилжүүлж тооцсон.</div>
                  </div>
                </section>
              </section>
              <div className="rp-print-only rp-muted" style={{ fontSize: '0.8rem' }}>Хэвлэсэн: {formatDateTime(new Date())}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportPage;
