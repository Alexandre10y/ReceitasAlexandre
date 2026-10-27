import {
  addMonthsToDate,
  getMonthYearLabel,
  isOverdue,
  localTodayISO,
} from './formatters';

export const addDaysISO = (iso, days) => {
  const parts = String(iso || localTodayISO()).split('-').map(Number);
  const date = new Date(parts[0], (parts[1] || 1) - 1, (parts[2] || 1) + Number(days || 0));
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const daysPastDue = (dueDate, today = localTodayISO()) => {
  if (!dueDate || dueDate >= today) return 0;
  const [y, m, d] = dueDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date(ty, tm - 1, td);
  return Math.round((now - due) / 86400000);
};

export const resolveCostSource = (sale) => {
  if (sale?.costSource === 'informed' || sale?.costSource === 'estimated') return sale.costSource;
  const notes = String(sale?.notes || '');
  if (notes.includes('Importado via CSV') || notes.includes('Adicionado direto na linha')) {
    return 'estimated';
  }
  if (sale?.productId) return 'informed';
  if (Number(sale?.totalCost) > 0) return 'informed';
  return 'estimated';
};

export const saleRevenue = (sale) => {
  const installments = (sale?.installments || [])
    .filter((inst) => inst.status !== 'empty' && inst.status !== 'warning')
    .reduce((acc, inst) => acc + (Number(inst.amount) || 0), 0);
  return installments + (Number(sale?.downPayment) || 0);
};

export const productLabel = (sale) => {
  const name = String(sale?.productName || '').trim();
  const loose =
    !name ||
    name === sale?.customerName ||
    name.startsWith('Planilha') ||
    sale?.category === 'Planilha / Avulso';
  return loose ? 'Avulso' : name;
};

export const saleMoney = (sale, today = localTodayISO()) => {
  const installments = sale?.installments || [];
  let openSum = 0;
  let paidSum = Number(sale?.downPayment) || 0;
  let overdueSum = 0;
  let openCount = 0;
  let paidCount = 0;
  let hasWarning = Boolean(sale?.alertStatus);
  const overdueInst = [];
  const openInst = [];

  installments.forEach((inst) => {
    const amount = Number(inst.amount) || 0;
    if (inst.status === 'warning' || String(inst.note || '').includes('NÃO PAGOU')) {
      hasWarning = true;
    }
    if (inst.status === 'paid') {
      paidSum += amount;
      paidCount += 1;
    }
    if (inst.status === 'open') {
      openSum += amount;
      openCount += 1;
      openInst.push(inst);
      if (isOverdue(inst.dueDate, inst.status)) {
        overdueSum += amount;
        overdueInst.push(inst);
      }
    }
  });

  overdueInst.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  openInst.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const soonEnd = addDaysISO(today, 7);
  const dueToday = openInst.filter((inst) => inst.dueDate === today);
  const dueSoon = openInst.filter((inst) => inst.dueDate > today && inst.dueDate <= soonEnd);

  let seal = 'Em dia';
  if (overdueInst.length > 0 || hasWarning) seal = 'Atrasado';
  else if (openCount === 0 && paidCount > 0) seal = 'Quitado';

  return {
    openSum,
    paidSum,
    overdueSum,
    openCount,
    paidCount,
    hasWarning,
    overdueInst,
    openInst,
    dueToday,
    dueSoon,
    seal,
    nextOpen: overdueInst[0] || openInst[0] || null,
  };
};

export const saleMatchesLane = (sale, lane, today = localTodayISO()) => {
  if (!lane || lane === 'all') return true;
  const money = saleMoney(sale, today);
  if (lane === 'dueToday') return money.dueToday.length > 0;
  if (lane === 'due7') return money.dueSoon.length > 0;
  if (lane === 'overdue') return money.seal === 'Atrasado';
  if (lane === 'paid') return money.seal === 'Quitado';
  return true;
};

export const laneSummary = (sales, today = localTodayISO()) => {
  const empty = () => ({ people: 0, count: 0, amount: 0 });
  const summary = {
    dueToday: empty(),
    due7: empty(),
    overdue: empty(),
    paid: empty(),
  };
  (sales || []).forEach((sale) => {
    const money = saleMoney(sale, today);
    if (money.dueToday.length > 0) {
      summary.dueToday.people += 1;
      summary.dueToday.count += money.dueToday.length;
      summary.dueToday.amount += money.dueToday.reduce(
        (acc, inst) => acc + (Number(inst.amount) || 0),
        0
      );
    }
    if (money.dueSoon.length > 0) {
      summary.due7.people += 1;
      summary.due7.count += money.dueSoon.length;
      summary.due7.amount += money.dueSoon.reduce(
        (acc, inst) => acc + (Number(inst.amount) || 0),
        0
      );
    }
    if (money.seal === 'Atrasado') {
      summary.overdue.people += 1;
      summary.overdue.count += money.overdueInst.length;
      summary.overdue.amount += money.overdueSum;
    }
    if (money.seal === 'Quitado') summary.paid.people += 1;
  });
  return summary;
};

const monthsUntil = (dueStr, today) => {
  if (!dueStr) return 0;
  const [year, month] = dueStr.split('-').map(Number);
  const [todayYear, todayMonth] = today.split('-').map(Number);
  return Math.max(0, (year - todayYear) * 12 + (month - todayMonth));
};

const discountAmount = (amount, dueStr, today, rate) => {
  if (!rate) return amount;
  return amount / Math.pow(1 + rate / 100, monthsUntil(dueStr, today));
};

const dateInPeriod = (dateStr, period, today) => {
  if (period === 'all') return true;
  if (!dateStr) return false;
  if (period === 'month') return dateStr.slice(0, 7) === today.slice(0, 7);
  if (period === 'year') return dateStr.slice(0, 4) === today.slice(0, 4);
  if (period === 'next3') {
    const start = `${today.slice(0, 7)}-01`;
    const end = addMonthsToDate(today, 3);
    return dateStr >= start && dateStr <= end;
  }
  return true;
};

export const rebuildInstallmentsForBaseChange = (
  sale,
  newBaseValue,
  count,
  { reapplyOpen = true } = {}
) => {
  const nextBase = Number(newBaseValue) || 0;
  const oldBase = Number(sale.installmentValue ?? sale.baseValue ?? 0);
  const existing = sale.installments || [];
  const targetCount = Math.min(12, Math.max(1, Number(count) || existing.length || 1));
  const firstDue = sale.firstDueDate || existing[0]?.dueDate || localTodayISO();
  const next = [];

  for (let index = 0; index < targetCount; index += 1) {
    const number = index + 1;
    const found = existing.find((inst) => inst.number === number);
    if (!found) {
      next.push({
        id: `inst-${Date.now()}-${number}`,
        number,
        amount: nextBase,
        dueDate: addMonthsToDate(firstDue, index),
        status: 'open',
        note: '',
        paidAt: null,
      });
      continue;
    }
    const exceptional =
      oldBase > 0 && Math.abs((Number(found.amount) || 0) - oldBase) > 0.009;
    const locked =
      found.status === 'paid' ||
      found.status === 'warning' ||
      !reapplyOpen ||
      exceptional;
    next.push({
      ...found,
      number,
      amount: locked ? Number(found.amount) || 0 : nextBase,
    });
  }

  existing.forEach((inst) => {
    if (next.some((item) => item.number === inst.number)) return;
    const exceptional =
      oldBase > 0 && Math.abs((Number(inst.amount) || 0) - oldBase) > 0.009;
    const keep =
      inst.status === 'paid' ||
      inst.status === 'warning' ||
      exceptional ||
      !reapplyOpen;
    if (keep) next.push(inst);
  });
  next.sort((a, b) => a.number - b.number);

  const installmentTotal = next.reduce((acc, inst) => {
    if (inst.status === 'empty' || inst.status === 'warning') return acc;
    return acc + (Number(inst.amount) || 0);
  }, 0);

  return {
    ...sale,
    installmentValue: nextBase,
    baseValue: nextBase,
    installmentsCount: targetCount,
    totalAmount: installmentTotal + (Number(sale.downPayment) || 0),
    totalPrice: installmentTotal + (Number(sale.downPayment) || 0),
    installments: next,
  };
};

export const rankSalesByProduct = (sales) => {
  const map = new Map();
  (sales || []).forEach((sale) => {
    const name = productLabel(sale);
    const key = name;
    if (!map.has(key)) {
      map.set(key, {
        key,
        name,
        qty: 0,
        revenue: 0,
        informedCost: 0,
        informedRevenue: 0,
        sales: 0,
      });
    }
    const row = map.get(key);
    const revenue = saleRevenue(sale);
    row.qty += Number(sale.quantity) || 1;
    row.sales += 1;
    row.revenue += revenue;
    if (resolveCostSource(sale) === 'informed') {
      row.informedCost += Number(sale.totalCost) || 0;
      row.informedRevenue += revenue;
    }
  });
  return [...map.values()]
    .map((row) => ({
      ...row,
      margin: row.informedRevenue - row.informedCost,
      marginKnown: row.informedCost > 0 || row.informedRevenue > 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
};

export const inventorySnapshot = (products) => {
  const list = products || [];
  const cost = list.reduce(
    (acc, product) => acc + (Number(product.costPrice) || 0) * (Number(product.stock) || 0),
    0
  );
  const sale = list.reduce(
    (acc, product) => acc + (Number(product.salePrice) || 0) * (Number(product.stock) || 0),
    0
  );
  const low = list.filter((product) => Number(product.stock) <= 1);
  return { cost, sale, low };
};

export const computeFinance = (sales, options = {}) => {
  const today = options.asOf || localTodayISO();
  const period = options.period || 'all';
  const rate = Number(options.anticipationRate) || 0;
  const warranties = options.warranties || [];
  const currentYm = today.slice(0, 7);
  const monthMap = {};

  let received = 0;
  let open = 0;
  let planned = 0;
  let overdueAll = 0;
  let overdueCount = 0;
  let discountedOpen = 0;
  let cashReceivedAll = 0;
  let activePeople = 0;
  let informedRevenue = 0;
  let informedCost = 0;
  let informedSales = 0;
  let estimatedRevenue = 0;
  let estimatedCost = 0;
  let estimatedSales = 0;
  let salesInPeriod = 0;
  const thisMonth = { total: 0, received: 0, open: 0, overdue: 0 };
  const aging = { d1_30: 0, d31_60: 0, d61: 0, c1_30: 0, c31_60: 0, c61: 0 };
  const debtors = [];

  (sales || []).forEach((sale) => {
    const money = saleMoney(sale, today);
    if (money.openCount > 0) activePeople += 1;
    if (money.seal === 'Atrasado') {
      debtors.push({
        id: sale.id,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone || '',
        productName: productLabel(sale),
        overdueSum: money.overdueSum,
        openSum: money.openSum,
        next: money.nextOpen,
        seal: money.seal,
        hasWarning: money.hasWarning,
        overdueCount: money.overdueInst.length,
      });
    }

    const source = resolveCostSource(sale);
    const fullRevenue = saleRevenue(sale);
    let periodRevenue = 0;
    let touched = false;

    if ((Number(sale.downPayment) || 0) > 0 && dateInPeriod(sale.saleDate || sale.firstDueDate, period, today)) {
      const down = Number(sale.downPayment) || 0;
      received += down;
      planned += down;
      cashReceivedAll += down;
      periodRevenue += down;
      touched = true;
    } else {
      cashReceivedAll += Number(sale.downPayment) || 0;
    }

    (sale.installments || []).forEach((inst) => {
      if (inst.status === 'empty') return;
      const amount = Number(inst.amount) || 0;
      const due = inst.dueDate || '';
      const overdue = inst.status === 'open' && isOverdue(due, inst.status);

      if (inst.status === 'open') {
        discountedOpen += discountAmount(amount, due, today, rate);
        if (overdue) {
          overdueAll += amount;
          overdueCount += 1;
          const days = daysPastDue(due, today);
          if (days <= 30) {
            aging.d1_30 += amount;
            aging.c1_30 += 1;
          } else if (days <= 60) {
            aging.d31_60 += amount;
            aging.c31_60 += 1;
          } else {
            aging.d61 += amount;
            aging.c61 += 1;
          }
        }
      }

      if (inst.status === 'paid') cashReceivedAll += amount;

      if (due.slice(0, 7) === currentYm && inst.status !== 'warning') {
        thisMonth.total += amount;
        if (inst.status === 'paid') thisMonth.received += amount;
        if (inst.status === 'open') {
          thisMonth.open += amount;
          if (overdue) thisMonth.overdue += amount;
        }
      }

      if (inst.status === 'warning' || !dateInPeriod(due, period, today)) return;
      touched = true;
      planned += amount;
      periodRevenue += amount;
      const ym = due.slice(0, 7);
      if (!monthMap[ym]) {
        monthMap[ym] = {
          ym,
          label: getMonthYearLabel(due),
          paid: 0,
          open: 0,
          total: 0,
        };
      }
      monthMap[ym].total += amount;
      if (inst.status === 'paid') {
        received += amount;
        monthMap[ym].paid += amount;
      } else if (inst.status === 'open') {
        open += amount;
        monthMap[ym].open += amount;
      }
    });

    if (touched) salesInPeriod += 1;
    const ratio = fullRevenue > 0 ? periodRevenue / fullRevenue : 0;
    if (source === 'informed') {
      informedSales += ratio > 0 ? 1 : 0;
      informedRevenue += periodRevenue;
      informedCost += (Number(sale.totalCost) || 0) * ratio;
    } else if (ratio > 0) {
      estimatedSales += 1;
      estimatedRevenue += periodRevenue;
      estimatedCost += (Number(sale.totalCost) || 0) * ratio;
    }
  });

  debtors.sort((a, b) => b.overdueSum - a.overdueSum || b.openSum - a.openSum);

  const warrantyCost = warranties.reduce((acc, item) => {
    if (!dateInPeriod(item.date, period, today)) return acc;
    return acc + (Number(item.cost) || 0);
  }, 0);
  const warrantyCostAll = warranties.reduce((acc, item) => acc + (Number(item.cost) || 0), 0);
  const gross = received + open;
  const informedProfit = informedRevenue - informedCost - warrantyCost;
  const informedMargin = informedRevenue > 0 ? (informedProfit / informedRevenue) * 100 : 0;
  const collectionRatio = planned > 0 ? received / planned : 0;
  const netIfAllToday = cashReceivedAll + discountedOpen - informedCostShare(sales) - warrantyCostAll;

  return {
    today,
    period,
    activePeople,
    received,
    open,
    planned,
    overdue: overdueAll,
    overdueCount,
    gross,
    thisMonth,
    cashReceivedAll,
    discountedOpen,
    netIfAllToday,
    collectionRatio,
    averageTicket: salesInPeriod > 0 ? gross / salesInPeriod : 0,
    informed: {
      revenue: informedRevenue,
      cost: informedCost,
      profit: informedProfit,
      margin: informedMargin,
      sales: informedSales,
    },
    estimated: {
      revenue: estimatedRevenue,
      cost: estimatedCost,
      sales: estimatedSales,
    },
    warrantyCost,
    warrantyCostAll,
    warrantyPercent: gross > 0 ? (warrantyCost / gross) * 100 : 0,
    aging,
    months: Object.values(monthMap).sort((a, b) => a.ym.localeCompare(b.ym)),
    debtors,
    monthResult: thisMonth.received - warranties
      .filter((item) => String(item.date || '').slice(0, 7) === currentYm)
      .reduce((acc, item) => acc + (Number(item.cost) || 0), 0),
  };
};

const informedCostShare = (sales) =>
  (sales || []).reduce((acc, sale) => {
    if (resolveCostSource(sale) !== 'informed') return acc;
    return acc + (Number(sale.totalCost) || 0);
  }, 0);

export const PERIOD_OPTIONS = [
  { id: 'month', label: 'Este mês' },
  { id: 'next3', label: 'Próximos 3 meses' },
  { id: 'year', label: 'Este ano' },
  { id: 'all', label: 'Tudo' },
];
