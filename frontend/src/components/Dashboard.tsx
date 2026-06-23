import { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Metrics {
  total_income: number;
  total_spend: number;
  savings: number;
  savings_rate: number;
  recurring_commitments: number;
  date_range: string;
  transaction_count: number;
  category_spending: { name: string; value: number }[];
  monthly_trend: { month: string; spend: number; income: number }[];
  biggest_transaction: {
    date: string;
    description: string;
    amount: number;
    category: string;
  } | null;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  is_recurring: boolean;
}

const COLORS = ['#8b5cf6', '#d97706', '#22c55e', '#ec4899', '#a855f7', '#3b82f6', '#ef4444', '#14b8a6', '#f59e0b'];

const REPORT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; }
  .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px 32px; }
  .header h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { font-size: 11px; opacity: 0.85; margin-top: 4px; }
  .container { max-width: 900px; margin: 0 auto; padding: 28px 32px; }
  .section { margin-bottom: 36px; }
  .section-title { font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #10b981; padding-bottom: 6px; margin-bottom: 14px; }
  .section-title.purple { border-color: #7c3aed; }
  .section-title.blue { border-color: #3b82f6; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
  .card-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .card-value { font-size: 20px; font-weight: 700; }
  .card-value.green { color: #10b981; }
  .card-value.red { color: #dc2626; }
  .card-value.dark { color: #0f172a; }
  .banner { background: #faf5ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 10px 16px; color: #6d28d9; font-weight: 600; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #10b981; color: white; }
  thead.purple tr { background: #7c3aed; }
  thead.blue tr { background: #3b82f6; }
  th { padding: 10px 12px; font-weight: 600; text-align: left; }
  td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) td { background: #f8fafc; }
  .credit { color: #16a34a; font-weight: 700; }
  .debit  { color: #dc2626; font-weight: 700; }
  .badge { background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
  .badge.purple { background: #ede9fe; color: #6d28d9; }
  .rec-badge { background: #faf5ff; color: #7c3aed; border: 1px solid #ddd6fe; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
  .insight-card { display: flex; align-items: flex-start; gap: 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; color: #1e40af; font-size: 12px; line-height: 1.5; }
  .dot { font-weight: 900; font-size: 18px; line-height: 1.2; flex-shrink: 0; }
  @page { margin: 12mm; }
  @media print { .container { padding: 0; } .section { page-break-inside: avoid; } }
`;

const Dashboard = ({ onUploadAnother }: { onUploadAnother: () => void }) => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Summary');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const metricsRes = await axios.get('/api/metrics/');
        const txnRes = await axios.get('/api/metrics/transactions');
        setMetrics(metricsRes.data);
        setTransactions(txnRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'Insights' && !insights) {
      axios.get('/api/metrics/insights')
        .then(res => setInsights(res.data.insights))
        .catch(err => console.error('Failed to fetch insights', err));
    }
  }, [activeTab, insights]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-[#f1f5f9] min-h-screen">
        <Loader2 className="w-12 h-12 text-[#10b981] animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Crunching your financial data...</p>
      </div>
    );
  }

  if (!metrics) {
    return <div className="text-center text-red-500 py-10 bg-[#f1f5f9] min-h-screen">Failed to load insights.</div>;
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const formattedBarData = metrics.monthly_trend.map(m => ({
    ...m,
    monthFormatted: formatMonth(m.month),
  }));

  // For single-month data, bar width should fill the chart nicely
  const barMaxSize = formattedBarData.length <= 2 ? 80 : 50;

  const recurringTxns = transactions.filter(t => t.is_recurring);
  const recurringCount = recurringTxns.length;

  // HTML helpers for Print/Share
  const buildSummaryHTML = () => {
    const catRows = metrics.category_spending
      .map(c => `<tr><td>${c.name}</td><td class="debit">${formatCurrency(c.value)}</td></tr>`)
      .join('');
    return `
      <div class="section">
        <div class="section-title">Financial Summary</div>
        <div class="cards">
          <div class="card"><div class="card-label">Total Income</div><div class="card-value green">${formatCurrency(metrics.total_income)}</div></div>
          <div class="card"><div class="card-label">Total Spend</div><div class="card-value red">${formatCurrency(metrics.total_spend)}</div></div>
          <div class="card"><div class="card-label">Net Savings</div><div class="card-value green">${formatCurrency(metrics.savings)}</div></div>
          <div class="card"><div class="card-label">Savings Rate</div><div class="card-value dark">${metrics.savings_rate.toFixed(1)}%</div></div>
        </div>
        <div class="banner">Recurring Commitments: ${formatCurrency(metrics.recurring_commitments)} / month</div>
        <div class="section-title blue">Spending by Category</div>
        <table><thead class="blue"><tr><th>Category</th><th>Amount</th></tr></thead><tbody>${catRows}</tbody></table>
      </div>`;
  };

  const buildTransactionsHTML = () => {
    const rows = transactions.map(t =>
      `<tr>
        <td>${t.date}</td><td>${t.description}</td>
        <td><span class="badge">${t.category}</span></td>
        <td>${t.type}</td>
        <td class="${t.type === 'CREDIT' ? 'credit' : 'debit'}">${t.type === 'CREDIT' ? '+' : '-'}${formatCurrency(t.amount)}</td>
        <td>${t.is_recurring ? '<span class="rec-badge">Recurring</span>' : ''}</td>
      </tr>`
    ).join('');
    return `
      <div class="section">
        <div class="section-title">All Transactions</div>
        <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th><th>Recurring</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>`;
  };

  const buildRecurringHTML = () => {
    const rows = recurringTxns.map(t =>
      `<tr>
        <td>${t.date}</td><td>${t.description}</td>
        <td><span class="badge purple">${t.category}</span></td>
        <td>${t.type}</td>
        <td class="${t.type === 'CREDIT' ? 'credit' : 'debit'}">${t.type === 'CREDIT' ? '+' : '-'}${formatCurrency(t.amount)}</td>
      </tr>`
    ).join('');
    return `
      <div class="section">
        <div class="section-title purple">Recurring Subscriptions &amp; EMIs</div>
        <table><thead class="purple"><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">No recurring transactions found.</td></tr>'}</tbody></table>
      </div>`;
  };

  const buildInsightsHTML = (ins: string[] | null) => {
    const cards = ins && ins.length > 0
      ? ins.map((i, idx) => `<div class="insight-card"><span class="dot">•</span><span>${idx + 1}. ${i}</span></div>`).join('')
      : '<div class="insight-card"><span class="dot">•</span><span>No insights available.</span></div>';
    return `
      <div class="section">
        <div class="section-title blue">AI Financial Insights</div>
        ${cards}
      </div>`;
  };

  const openPrintWindow = (title: string, body: string) => {
    const meta = `Period: ${metrics.date_range} &nbsp;|&nbsp; ${metrics.transaction_count} Transactions &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}`;
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Rupee Radar - ${title}</title>
<style>${REPORT_CSS}</style></head>
<body>
  <div class="header">
    <h1>Rupee Radar - ${title}</h1>
    <p>${meta}</p>
  </div>
  <div class="container">${body}</div>
  <script>window.onload=()=>{window.print()};<\/script>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // DELETE
  const handleDeleteData = async () => {
    if (window.confirm('Are you sure you want to delete all your financial data? This cannot be undone.')) {
      try {
        await axios.delete('/api/metrics/');
        onUploadAnother();
      } catch (err) {
        console.error('Failed to delete data', err);
        alert('Failed to delete data. Please try again.');
      }
    }
  };

  // DOWNLOAD PDF - Premium visual 5-page report
  const handleDownloadPDF = async () => {
    let ins = insights;
    if (!ins) {
      try {
        const res = await axios.get('/api/metrics/insights');
        ins = res.data.insights;
        setInsights(ins);
      } catch {
        ins = ['Could not fetch AI insights at this time.'];
      }
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const generated = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // ASCII-safe currency (Helvetica does not support the Rs symbol)
    const fmt = (val: number) =>
      'Rs. ' + Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Shared footer
    const addFooter = (pageLabel: string) => {
      doc.setFillColor(248, 249, 250);
      doc.rect(0, H - 10, W, 10, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.line(0, H - 10, W, H - 10);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
      doc.text('Rupee Radar - Confidential Financial Report', 14, H - 4);
      doc.text(pageLabel, W - 14, H - 4, { align: 'right' });
    };

    // Shared section label with colored left bar + horizontal rule
    const sectionLabel = (label: string, y: number, rgb: [number, number, number]) => {
      doc.setFillColor(...rgb);
      doc.rect(14, y - 4, 4, 8, 'F');
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(label, 21, y + 1);
      doc.setDrawColor(230, 230, 230);
      doc.line(21, y + 3, W - 14, y + 3);
      return y + 9;
    };

    // KPI card helper
    const kw = (W - 24 - 18) / 4;
    const kpiDefs = [
      { label: 'Total Income',  value: fmt(metrics.total_income),            fg: [6, 120, 80]   as [number,number,number], bg: [236, 253, 245] as [number,number,number], border: [16, 185, 129] as [number,number,number] },
      { label: 'Total Spend',   value: fmt(metrics.total_spend),             fg: [153, 27, 27]  as [number,number,number], bg: [254, 242, 242] as [number,number,number], border: [220, 38, 38]  as [number,number,number] },
      { label: 'Net Savings',   value: fmt(metrics.savings),                 fg: [6, 120, 80]   as [number,number,number], bg: [236, 253, 245] as [number,number,number], border: [16, 185, 129] as [number,number,number] },
      { label: 'Savings Rate',  value: `${metrics.savings_rate.toFixed(1)}%`, fg: [30, 64, 175] as [number,number,number], bg: [239, 246, 255] as [number,number,number], border: [59, 130, 246] as [number,number,number] },
    ];

    const drawKpiCards = (startY: number, cardW: number, startX: number, h: number) => {
      kpiDefs.forEach((k, i) => {
        const kx = startX + i * (cardW + 5);
        doc.setFillColor(200, 210, 205);
        doc.roundedRect(kx + 0.8, startY + 0.8, cardW, h, 2, 2, 'F');
        doc.setFillColor(...k.bg);
        doc.roundedRect(kx, startY, cardW, h, 2, 2, 'F');
        doc.setFillColor(...k.border);
        doc.roundedRect(kx, startY, cardW, 3, 1, 1, 'F');
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text(k.label.toUpperCase(), kx + 3, startY + 9);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...k.fg);
        const vl = doc.splitTextToSize(k.value, cardW - 5);
        doc.text(vl, kx + 3, startY + 17);
      });
    };

    // === COVER PAGE ===
    // Dark green hero — ends at y=92, just below last text at y=86
    doc.setFillColor(6, 95, 70);
    doc.rect(0, 0, W, 92, 'F');
    // Bright green accent stripe (4mm) at the very bottom of the hero
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 88, W, 4, 'F');
    // Decorative concentric circles top-right (inside hero)
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    for (let r = 12; r <= 55; r += 14) doc.circle(W - 18, 22, r, 'S');
    doc.setLineWidth(0.2);

    // Title block
    doc.setFontSize(34); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('Rupee Radar', 18, 32);
    doc.setFontSize(13); doc.setFont('helvetica', 'normal'); doc.setTextColor(167, 243, 208);
    doc.text('Personal Finance Report', 18, 44);
    // Divider line
    doc.setDrawColor(167, 243, 208); doc.setLineWidth(0.6);
    doc.line(18, 49, 105, 49);
    doc.setLineWidth(0.2);
    // Metadata
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(167, 243, 208);
    doc.text(`Period: ${metrics.date_range}`, 18, 58);
    doc.text(`Transactions: ${metrics.transaction_count}`, 18, 66);
    doc.text(`Generated: ${generated}`, 18, 74);

    // White content card — starts just 6mm after the green ends
    const cardStartY = 98;
    const cardHeight = 165;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, cardStartY, W - 24, cardHeight, 3, 3, 'F');
    doc.setDrawColor(210, 225, 218);
    doc.roundedRect(12, cardStartY, W - 24, cardHeight, 3, 3, 'S');

    // "At a Glance" heading inside card
    const glanceY = cardStartY + 10;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(6, 95, 70);
    doc.text('At a Glance', 22, glanceY);
    doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.5);
    doc.line(22, glanceY + 2, 75, glanceY + 2); doc.setLineWidth(0.2);

    // KPI cards (height 26, starting 6mm after heading)
    drawKpiCards(glanceY + 6, kw, 18, 26);

    // Recurring highlight
    const recurY = glanceY + 40;
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(18, recurY, W - 36, 13, 2, 2, 'F');
    doc.setDrawColor(167, 139, 250);
    doc.roundedRect(18, recurY, W - 36, 13, 2, 2, 'S');
    doc.setFillColor(109, 40, 217); doc.roundedRect(18, recurY, 5, 13, 1, 1, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(109, 40, 217);
    doc.text(`Recurring Commitments: ${fmt(metrics.recurring_commitments)} / month`, 27, recurY + 8.5);

    // Table of contents
    const tocY = recurY + 20;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('Contents', 22, tocY);
    doc.setDrawColor(200, 200, 200); doc.line(22, tocY + 2, W - 22, tocY + 2);
    const toc = [
      'Page 2  -  Financial Summary & Spending Breakdown',
      'Page 3  -  Recurring Subscriptions & EMIs',
      'Page 4  -  All Transactions',
      'Page 5  -  AI Financial Insights',
    ];
    toc.forEach((item, i) => {
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 80, 70);
      doc.text(`${i + 1}.   ${item}`, 24, tocY + 11 + i * 8);
    });
    addFooter('Cover Page');


    // === PAGE 2: FINANCIAL SUMMARY ===
    doc.addPage();
    doc.setFillColor(6, 95, 70); doc.rect(0, 0, W, 18, 'F');
    doc.setFillColor(16, 185, 129); doc.rect(0, 14, W, 4, 'F');
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('Financial Summary', 14, 11);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(167, 243, 208);
    doc.text(`${metrics.date_range}  |  ${metrics.transaction_count} txns  |  ${generated}`, W - 14, 11, { align: 'right' });

    drawKpiCards(22, kw, 14, 26);
    let cy = 55;

    // Category spending bars
    cy = sectionLabel('Spending by Category', cy, [16, 185, 129]);
    const totalSpend = metrics.total_spend || 1;
    const catColors: [number, number, number][] = [
      [139, 92, 246],[217, 119, 6],[34, 197, 94],[236, 72, 153],
      [168, 85, 247],[59, 130, 246],[239, 68, 68],[20, 184, 166],[245, 158, 11],
    ];
    const barAreaW = W - 28 - 52;
    metrics.category_spending.forEach((cat, idx) => {
      const pct = Math.min(cat.value / totalSpend, 1);
      const rowY = cy + idx * 11;
      const rc = catColors[idx % catColors.length];
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
      const lbl = cat.name.length > 18 ? cat.name.substring(0, 18) + '..' : cat.name;
      doc.text(lbl, 14, rowY + 4.5);
      doc.setFillColor(228, 230, 235);
      doc.roundedRect(57, rowY + 1, barAreaW, 5.5, 1, 1, 'F');
      doc.setFillColor(...rc);
      if (pct > 0) doc.roundedRect(57, rowY + 1, barAreaW * pct, 5.5, 1, 1, 'F');
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...rc);
      doc.text(fmt(cat.value), W - 14, rowY + 5, { align: 'right' });
    });
    cy += metrics.category_spending.length * 11 + 5;

    // Monthly Trend table
    cy = sectionLabel('Monthly Spending Trend', cy, [59, 130, 246]);
    autoTable(doc, {
      head: [['Month', 'Income', 'Spend', 'Net']],
      body: metrics.monthly_trend.map(m => [
        m.month,
        fmt(m.income || 0),
        fmt(m.spend || 0),
        fmt((m.income || 0) - (m.spend || 0)),
      ]),
      startY: cy,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold', textColor: [6, 120, 70] },
        2: { halign: 'right', fontStyle: 'bold', textColor: [153, 27, 27] },
        3: { halign: 'right', fontStyle: 'bold' },
      },
      tableLineColor: [200, 210, 230], tableLineWidth: 0.2,
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const inc = metrics.monthly_trend[data.row.index]?.income ?? 0;
          const spd = metrics.monthly_trend[data.row.index]?.spend ?? 0;
          data.cell.styles.textColor = inc >= spd ? [6, 120, 70] : [153, 27, 27];
        }
      },
    });

    addFooter('Page 2 of 5');

    // === PAGE 3: RECURRING ===
    doc.addPage();
    doc.setFillColor(76, 5, 150); doc.rect(0, 0, W, 18, 'F');
    doc.setFillColor(126, 34, 206); doc.rect(0, 14, W, 4, 'F');
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('Recurring Subscriptions & EMIs', 14, 11);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(216, 180, 254);
    doc.text(`${recurringTxns.length} recurring payments detected`, W - 14, 11, { align: 'right' });

    const recTotal = recurringTxns.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
    doc.setFillColor(245, 240, 255); doc.setDrawColor(167, 139, 250);
    doc.roundedRect(14, 22, W - 28, 14, 2, 2, 'FD');
    doc.setFillColor(109, 40, 217); doc.roundedRect(14, 22, 4, 14, 1, 1, 'F');
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(109, 40, 217);
    doc.text(`Total Recurring Spend: ${fmt(recTotal)} / month`, 22, 30.5);

    const recRows = recurringTxns.map(t => [
      t.date,
      t.description.length > 42 ? t.description.substring(0, 42) + '...' : t.description,
      t.category,
      t.type,
      `${t.type === 'CREDIT' ? '+' : '-'}${fmt(t.amount)}`,
    ]);
    autoTable(doc, {
      head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
      body: recRows.length > 0 ? recRows : [['No recurring transactions found.', '', '', '', '']],
      startY: 40,
      theme: 'striped',
      styles: { fontSize: 8.5, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 } },
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [250, 245, 255] },
      columnStyles: { 0: { cellWidth: 22 }, 4: { halign: 'right', cellWidth: 32 } },
      tableLineColor: [220, 200, 245], tableLineWidth: 0.2,
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const v = (data.row.raw as string[])[4] ?? '';
          data.cell.styles.textColor = v.startsWith('+') ? [16, 122, 70] : [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && data.column.index === 3) {
          const v = (data.row.raw as string[])[3] ?? '';
          data.cell.styles.textColor = v === 'CREDIT' ? [16, 122, 70] : [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    addFooter('Page 3 of 5');

    // === PAGE 4: ALL TRANSACTIONS ===
    doc.addPage();
    doc.setFillColor(6, 95, 70); doc.rect(0, 0, W, 18, 'F');
    doc.setFillColor(16, 185, 129); doc.rect(0, 14, W, 4, 'F');
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('All Transactions', 14, 11);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(167, 243, 208);
    doc.text(`${transactions.length} total transactions`, W - 14, 11, { align: 'right' });

    const allRows = transactions.map(t => [
      t.date,
      t.description.length > 42 ? t.description.substring(0, 42) + '...' : t.description,
      t.category,
      t.type,
      `${t.type === 'CREDIT' ? '+' : '-'}${fmt(t.amount)}`,
      t.is_recurring ? 'Yes' : '-',
    ]);
    autoTable(doc, {
      head: [['Date', 'Description', 'Category', 'Type', 'Amount', 'Recur.']],
      body: allRows,
      startY: 22,
      theme: 'striped',
      styles: { fontSize: 7.8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
      headStyles: { fillColor: [6, 95, 70], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      columnStyles: {
        0: { cellWidth: 22 }, 4: { halign: 'right', cellWidth: 30 }, 5: { halign: 'center', cellWidth: 14 },
      },
      tableLineColor: [180, 220, 205], tableLineWidth: 0.2,
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const v = (data.row.raw as string[])[4] ?? '';
          data.cell.styles.textColor = v.startsWith('+') ? [6, 120, 70] : [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && data.column.index === 3) {
          const v = (data.row.raw as string[])[3] ?? '';
          data.cell.styles.textColor = v === 'CREDIT' ? [6, 120, 70] : [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && data.column.index === 5) {
          if ((data.row.raw as string[])[5] === 'Yes') {
            data.cell.styles.textColor = [109, 40, 217];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
    addFooter('Page 4 of 5');

    // === PAGE 5: AI INSIGHTS ===
    doc.addPage();
    doc.setFillColor(29, 78, 216); doc.rect(0, 0, W, 18, 'F');
    doc.setFillColor(59, 130, 246); doc.rect(0, 14, W, 4, 'F');
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('AI Financial Insights', 14, 11);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(186, 212, 250);
    doc.text('Personalized recommendations based on your data', W - 14, 11, { align: 'right' });

    const insColors: [number, number, number][] = [
      [29, 78, 216],[109, 40, 217],[6, 95, 70],[153, 27, 27],[30, 58, 138],
    ];
    let iy = 26;

    if (ins && ins.length > 0) {
      ins.forEach((insight, idx) => {
        const ic = insColors[idx % insColors.length];
        const lines = doc.splitTextToSize(insight, W - 50);
        const cardH = Math.max(lines.length * 5.5 + 14, 22);

        if (iy + cardH > H - 14) {
          addFooter('Page 5 of 5');
          doc.addPage();
          doc.setFillColor(29, 78, 216); doc.rect(0, 0, W, 18, 'F');
          doc.setFillColor(59, 130, 246); doc.rect(0, 14, W, 4, 'F');
          doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
          doc.text('AI Financial Insights (cont.)', 14, 11);
          iy = 26;
        }

        // Shadow
        doc.setFillColor(210, 220, 240);
        doc.roundedRect(15.5, iy + 1.2, W - 29, cardH, 3, 3, 'F');
        // Card
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(...ic); doc.setLineWidth(0.4);
        doc.roundedRect(14, iy, W - 28, cardH, 3, 3, 'FD');
        doc.setLineWidth(0.2);
        // Left accent bar
        doc.setFillColor(...ic);
        doc.roundedRect(14, iy, 5, cardH, 2, 2, 'F');
        // Numbered circle badge
        doc.setFillColor(...ic);
        doc.circle(27, iy + cardH / 2, 5, 'F');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
        doc.text(`${idx + 1}`, 27, iy + cardH / 2 + 2.5, { align: 'center' });
        // Insight text
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 58, 138);
        doc.text(lines, 36, iy + 8);
        iy += cardH + 6;
      });
    } else {
      doc.setFillColor(243, 244, 246); doc.roundedRect(14, iy, W - 28, 20, 2, 2, 'F');
      doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(107, 114, 128);
      doc.text('No insights available. Visit the Insights tab first to load them.', 20, iy + 12);
    }

    addFooter('Page 5 of 5');
    doc.save('RupeeRadar_Report.pdf');
  };

  // PRINT/SHARE - current tab only
  const handlePrintShare = () => {
    let title = '';
    let body = '';

    if (activeTab === 'Summary') {
      title = 'Summary';
      body = buildSummaryHTML();
    } else if (activeTab === 'Transactions') {
      title = 'All Transactions';
      body = buildTransactionsHTML();
    } else if (activeTab === 'Recurring') {
      title = 'Recurring Subscriptions & EMIs';
      body = buildRecurringHTML();
    } else if (activeTab === 'Insights') {
      title = 'AI Financial Insights';
      body = buildInsightsHTML(insights);
    }

    openPrintWindow(title, body);
  };

  // RENDER
  return (
    <div className="min-h-screen bg-[#f1f5f9] w-full text-gray-900 font-sans pb-24">
      <div className="max-w-7xl mx-auto px-6 pt-10">

        <button
          onClick={onUploadAnother}
          className="flex items-center text-[#10b981] hover:text-[#059669] text-sm font-medium transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Upload another
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">Spending Analysis</h1>
            <p className="text-sm text-gray-500">
              uploaded_statement.csv • {metrics.transaction_count} transactions • {metrics.date_range}
            </p>
          </div>

          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              ⬇ Download PDF
            </button>
            <button
              onClick={handlePrintShare}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              🖨 Print / Share
            </button>
            <button
              onClick={handleDeleteData}
              className="text-[#991b1b] hover:text-[#7f1d1d] hover:underline text-sm font-medium transition-colors"
            >
              Delete my data
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-8 border-b border-gray-200 mb-8">
          {['Summary', 'Transactions', 'Recurring', 'Insights'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab ? 'text-[#10b981]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'Recurring' && recurringCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                  {recurringCount}
                </span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]" />
              )}
            </button>
          ))}
        </div>

        {/* SUMMARY TAB */}
        {activeTab === 'Summary' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Total Income</p>
                <p className="text-2xl font-bold text-[#10b981]">{formatCurrency(metrics.total_income)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Total Spend</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.total_spend)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Savings</p>
                <p className="text-2xl font-bold text-[#10b981]">{formatCurrency(metrics.savings)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Savings Rate</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.savings_rate.toFixed(1)}%</p>
              </div>
            </div>

            <div className="bg-[#faf5ff] border border-[#e9d5ff] rounded-xl p-4 flex items-center shadow-sm">
              <p className="text-sm font-medium text-[#7e22ce]">
                Recurring commitments: <span className="font-bold">{formatCurrency(metrics.recurring_commitments)}/month</span>
              </p>
            </div>

            {metrics.biggest_transaction && (
              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Biggest Transaction</p>
                <p className="text-lg font-bold text-gray-900">{metrics.biggest_transaction.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {metrics.biggest_transaction.date} • {metrics.biggest_transaction.category}
                </p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {formatCurrency(metrics.biggest_transaction.amount)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-4">Spend by Category</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={metrics.category_spending} cx="50%" cy="50%" innerRadius={0} outerRadius={110} dataKey="value" stroke="none">
                          {metrics.category_spending.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                    {metrics.category_spending.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center text-xs font-medium" style={{ color: COLORS[idx % COLORS.length] }}>
                        <div className="w-3 h-3 mr-1.5 rounded-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-4">Monthly Trend</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  {formattedBarData.length === 0 ? (
                    <div className="h-[310px] flex items-center justify-center text-gray-400 text-sm">
                      No monthly trend data available.
                    </div>
                  ) : (
                    <div className="h-[310px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={formattedBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="monthFormatted" axisLine tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} dx={-10} />
                          <Tooltip
                            formatter={(value: any, name: any) => [
                              formatCurrency(Number(value)),
                              name === 'spend' ? 'Spend' : 'Income'
                            ]}
                            cursor={{ fill: '#f3f4f6' }}
                          />
                          <Legend
                            formatter={(value) => value === 'spend' ? 'Spend' : 'Income'}
                            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                          />
                          <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={barMaxSize} name="income" />
                          <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={barMaxSize} name="spend" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'Transactions' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">{txn.date}</td>
                      <td className="px-6 py-4"><div className="font-medium text-gray-900">{txn.description}</div></td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{txn.category}</span>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-gray-900'}`}>
                        {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RECURRING TAB */}
        {activeTab === 'Recurring' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-gray-100 bg-[#faf5ff]">
              <h3 className="text-lg font-bold text-[#7e22ce]">Recurring Subscriptions & EMIs</h3>
              <p className="text-sm text-purple-600 mt-1">Review the recurring payments detected by the AI.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recurringTxns.map(txn => (
                    <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">{txn.date}</td>
                      <td className="px-6 py-4"><div className="font-medium text-gray-900">{txn.description}</div></td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{txn.category}</span>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-gray-900'}`}>
                        {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </td>
                    </tr>
                  ))}
                  {recurringTxns.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No recurring transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === 'Insights' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-in fade-in">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              AI Financial Insights
            </h2>
            <div className="space-y-4">
              {!insights ? (
                <div className="flex items-center text-gray-500 py-4">
                  <Loader2 className="w-5 h-5 mr-3 animate-spin text-blue-500" />
                  Generating personalized insights...
                </div>
              ) : (
                insights.map((insight, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-900 flex items-start">
                    <span className="text-blue-500 mr-3 mt-0.5">•</span>
                    <p className="font-medium text-sm leading-relaxed">{insight}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
