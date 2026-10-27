import { addMonthsToDate } from '../utils/formatters';

/** Converte "10/02" ou "26/10" → ISO com ano (padrão 2026). */
export const paidAtFromDMY = (dmy, year = 2026) => {
  if (!dmy) return null;
  const [dd, mm] = String(dmy)
    .split('/')
    .map((p) => Number(String(p).trim()));
  if (!dd || !mm) return null;
  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
};

/** Próximo ciclo das parcelas em aberto (verdinho): a partir de 10/11/2026. */
export const OPEN_INSTALLMENTS_START = '2026-11-10';

/**
 * Gera as colunas da planilha (1º P–12º P).
 * - Pagas (vermelho): mantêm a data em que foram pagas
 * - Em aberto (verde): vencem a partir de 10/11 (mês a mês) — nenhuma atrasa antes disso
 * - Alerta "NÃO PAGOU": continua como alerta (não entra no ciclo normal)
 */
export const buildCustomInstallments = (items, firstDueDate = OPEN_INSTALLMENTS_START, options = {}) => {
  const padTo = options.padTo ?? 12;
  const saleKey = options.saleKey || 'sale';
  const openStart = options.openStart || OPEN_INSTALLMENTS_START;
  let openIndex = 0;

  const list = (items || []).map((item, idx) => {
    const number = idx + 1;
    const status = item.status || 'open';
    let dueDate;

    if (status === 'paid') {
      dueDate = item.paidAt || item.dueDate || addMonthsToDate(firstDueDate || openStart, idx);
    } else if (status === 'open') {
      // Verdinho: sempre a partir de 10/11/2026 (mês a mês)
      dueDate = addMonthsToDate(openStart, openIndex);
      openIndex += 1;
    } else if (status === 'warning') {
      // "NÃO PAGOU / NÃO PAGOU MAIS" — alerta real, fora do ciclo normal
      dueDate = item.dueDate || openStart;
    } else {
      dueDate = item.dueDate || addMonthsToDate(firstDueDate || openStart, idx);
    }

    const paidAt = status === 'paid' ? item.paidAt || dueDate : null;

    return {
      id: `${saleKey}-inst-${number}`,
      number,
      amount: Number(item.amount || 0),
      dueDate,
      status,
      note: item.note || '',
      paidAt,
    };
  });

  let emptyOffset = 0;
  while (list.length < padTo) {
    const number = list.length + 1;
    list.push({
      id: `${saleKey}-inst-${number}`,
      number,
      amount: 0,
      dueDate: addMonthsToDate(openStart, openIndex + emptyOffset),
      status: 'empty',
      note: '',
      paidAt: null,
    });
    emptyOffset += 1;
  }

  return list;
};

const sale = ({
  id,
  customerName,
  productName,
  installmentValue,
  firstDueDate,
  items,
  alertStatus = '',
  notes = '',
  unitCost = 0,
}) => {
  const active = (items || []).filter((i) => i.status !== 'empty');
  const totalAmount = active.reduce((s, i) => s + Number(i.amount || 0), 0);
  return {
    id,
    customerName,
    customerPhone: '',
    productId: id,
    productName,
    quantity: 1,
    unitCost,
    totalCost: unitCost,
    totalAmount,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: active.length || items.length,
    installmentValue,
    saleDate: firstDueDate,
    firstDueDate,
    alertStatus,
    notes,
    installments: buildCustomInstallments(items, firstDueDate, { saleKey: id }),
  };
};

// IDs/SKUs de produtos fictícios antigos — removidos automaticamente
export const DEMO_PRODUCT_IDS = [
  'prod-1',
  'prod-2',
  'prod-3',
  'prod-4',
  'prod-5',
  'prod-6',
  'prod-7',
  'prod-8',
];

export const DEMO_PRODUCT_SKUS = [
  'AS-NOTE-DELL15',
  'AS-IPH-13PM',
  'AS-IPH-11',
  'AS-NOTE-MEM',
  'AS-HD-SSD',
  'AS-NOTE-NITRO',
];

export const filterOutDemoProducts = (productList) => {
  if (!Array.isArray(productList)) return [];
  return productList.filter(
    (p) =>
      p &&
      !DEMO_PRODUCT_IDS.includes(p.id) &&
      !DEMO_PRODUCT_SKUS.includes(p.sku)
  );
};

export const INITIAL_PRODUCTS = [];

/**
 * Planilha canônica All System — 18 pessoas · Soma VALOR = R$ 5.532,90
 * Fonte: planilha ao vivo do Alexandre (26/10/2026)
 */
export const PLANILHA_SEED_VERSION = 'planilha_18_vencimento_2026_11_10';

export const INITIAL_SALES = [
  sale({
    id: 'sale-elza-notebook',
    customerName: 'Elza Notebook',
    productName: 'Notebook i3 n405u',
    installmentValue: 230,
    firstDueDate: OPEN_INSTALLMENTS_START,
    unitCost: 900,
    notes: '5 parcelas de R$ 230 em aberto — ciclo a partir de 10/11',
    items: Array.from({ length: 5 }, () => ({ amount: 230, status: 'open' })),
  }),
  sale({
    id: 'sale-caio-imports',
    customerName: 'Caio Imports',
    productName: 'Caio Imports',
    installmentValue: 49.9,
    firstDueDate: OPEN_INSTALLMENTS_START,
    unitCost: 400,
    notes: '12x de R$ 49,90 — ciclo a partir de 10/11',
    items: Array.from({ length: 12 }, () => ({ amount: 49.9, status: 'open' })),
  }),
  sale({
    id: 'sale-alipher-iphone13',
    customerName: 'Alipher',
    productName: 'Iphone 13 pro',
    installmentValue: 160,
    firstDueDate: OPEN_INSTALLMENTS_START,
    unitCost: 1200,
    notes: '10x de R$ 160 em aberto — ciclo a partir de 10/11',
    items: Array.from({ length: 10 }, () => ({ amount: 160, status: 'open' })),
  }),
  sale({
    id: 'sale-bruno-roque',
    customerName: 'Bruno Roque',
    productName: 'Equipamento / Acordo Bruno Roque',
    installmentValue: 450,
    firstDueDate: '2026-02-10',
    unitCost: 2400,
    alertStatus: 'NÃO PAGOU MAIS',
    notes: '10ª P R$ 1.800 · 11ª P: NÃO PAGOU MAIS',
    items: [
      { amount: 450, status: 'paid', paidAt: paidAtFromDMY('10/02') },
      { amount: 450, status: 'paid', paidAt: paidAtFromDMY('10/03') },
      { amount: 450, status: 'paid', paidAt: paidAtFromDMY('10/04') },
      { amount: 450, status: 'paid', paidAt: paidAtFromDMY('10/05') },
      { amount: 450, status: 'paid', paidAt: paidAtFromDMY('10/06') },
      { amount: 450, status: 'paid', paidAt: paidAtFromDMY('10/07') },
      { amount: 450, status: 'open' },
      { amount: 450, status: 'open' },
      { amount: 450, status: 'open' },
      { amount: 1800, status: 'open', note: '1800' },
      { amount: 0, status: 'warning', note: 'NÃO PAGOU MAIS' },
    ],
  }),
  sale({
    id: 'sale-alipher-memoria',
    customerName: 'Alipher Not (Memoria)',
    productName: 'Notebook + Upgrade Memória RAM',
    installmentValue: 320,
    firstDueDate: OPEN_INSTALLMENTS_START,
    unitCost: 1950,
    notes: '1ª P paga 26/10 · abertas a partir de 10/11 · 8ª–10ª P com R$ 330',
    items: [
      { amount: 320, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 320, status: 'open' },
      { amount: 320, status: 'open' },
      { amount: 320, status: 'open' },
      { amount: 320, status: 'open' },
      { amount: 320, status: 'open' },
      { amount: 320, status: 'open' },
      { amount: 330, status: 'open', note: '330' },
      { amount: 330, status: 'open', note: '330' },
      { amount: 330, status: 'open', note: '330' },
    ],
  }),
  sale({
    id: 'sale-silvano',
    customerName: 'Silvano (Iphone 13 pro max)',
    productName: 'Apple iPhone 13 Pro Max',
    installmentValue: 330,
    firstDueDate: '2026-05-15',
    unitCost: 3100,
    notes: '5 pagas · 3 em aberto de R$ 330',
    items: [
      { amount: 330, status: 'paid', paidAt: paidAtFromDMY('15/05') },
      { amount: 330, status: 'paid', paidAt: paidAtFromDMY('15/06') },
      { amount: 330, status: 'paid', paidAt: paidAtFromDMY('15/07') },
      { amount: 330, status: 'paid', paidAt: paidAtFromDMY('15/08') },
      { amount: 330, status: 'paid', paidAt: paidAtFromDMY('15/09') },
      { amount: 330, status: 'open' },
      { amount: 330, status: 'open' },
      { amount: 330, status: 'open' },
    ],
  }),
  sale({
    id: 'sale-igor',
    customerName: 'Igor (Iphone 11 )',
    productName: 'Apple iPhone 11',
    installmentValue: 345,
    firstDueDate: '2026-07-10',
    unitCost: 1180,
    notes: '5ª P restante R$ 100',
    items: [
      { amount: 345, status: 'paid', paidAt: paidAtFromDMY('10/07') },
      { amount: 345, status: 'paid', paidAt: paidAtFromDMY('10/08') },
      { amount: 345, status: 'paid', paidAt: paidAtFromDMY('10/09') },
      { amount: 345, status: 'open' },
      { amount: 100, status: 'open', note: '100' },
    ],
  }),
  sale({
    id: 'sale-hullian',
    customerName: 'Hullian',
    productName: 'Venda Parcelada - Hullian',
    installmentValue: 300,
    firstDueDate: '2026-07-15',
    unitCost: 1800,
    items: [
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('15/07') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('15/08') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('15/09') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('15/10') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 300, status: 'open' },
    ],
  }),
  sale({
    id: 'sale-thalisson',
    customerName: 'Thalisson',
    productName: 'Venda Parcelada - Thalisson',
    installmentValue: 300,
    firstDueDate: '2026-07-20',
    unitCost: 1800,
    items: [
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('20/07') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('20/08') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('20/09') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('20/10') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 300, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 300, status: 'open' },
    ],
  }),
  sale({
    id: 'sale-mario-hd',
    customerName: 'Mario HD',
    productName: 'HD / SSD Upgrade - Mario',
    installmentValue: 100,
    firstDueDate: '2026-09-10',
    unitCost: 190,
    items: [
      { amount: 100, status: 'paid', paidAt: paidAtFromDMY('10/09') },
      { amount: 100, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 100, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 100, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 100, status: 'paid', paidAt: paidAtFromDMY('26/10') },
      { amount: 100, status: 'open' },
      { amount: 100, status: 'open' },
      { amount: 100, status: 'open' },
      { amount: 100, status: 'open' },
    ],
  }),
  sale({
    id: 'sale-panato',
    customerName: 'Panato',
    productName: 'Venda Parcelada - Panato',
    installmentValue: 310,
    firstDueDate: '2026-07-10',
    unitCost: 1900,
    items: [
      { amount: 310, status: 'paid', paidAt: paidAtFromDMY('10/07') },
      { amount: 310, status: 'paid', paidAt: paidAtFromDMY('10/08') },
      { amount: 310, status: 'paid', paidAt: paidAtFromDMY('10/09') },
      { amount: 310, status: 'open' },
      { amount: 310, status: 'open' },
      { amount: 310, status: 'open' },
      { amount: 310, status: 'open' },
    ],
  }),
  sale({
    id: 'sale-monge',
    customerName: 'Monge Celular',
    productName: 'Celular / Equipamento - Monge',
    installmentValue: 660,
    firstDueDate: '2026-08-10',
    unitCost: 2400,
    items: [
      { amount: 660, status: 'paid', paidAt: paidAtFromDMY('10/08') },
      { amount: 660, status: 'open' },
      { amount: 660, status: 'open' },
      { amount: 660, status: 'open' },
      { amount: 660, status: 'open' },
    ],
  }),
  sale({
    id: 'sale-jorge',
    customerName: 'Jorge',
    productName: 'Equipamentos All System - Jorge',
    installmentValue: 874,
    firstDueDate: '2026-08-15',
    unitCost: 3100,
    items: [
      { amount: 874, status: 'paid', paidAt: paidAtFromDMY('15/08') },
      { amount: 874, status: 'paid', paidAt: paidAtFromDMY('15/09') },
      { amount: 874, status: 'open' },
      { amount: 874, status: 'open' },
      { amount: 874, status: 'open' },
      { amount: 874, status: 'open' },
    ],
  }),
  sale({
    id: 'sale-thai',
    customerName: 'Thai Namorada do Mario',
    productName: 'Equipamento - Thai (Namorada do Mario)',
    installmentValue: 600,
    firstDueDate: '2026-08-20',
    unitCost: 2100,
    items: [
      { amount: 600, status: 'paid', paidAt: paidAtFromDMY('20/08') },
      ...Array.from({ length: 9 }, () => ({ amount: 600, status: 'open' })),
    ],
  }),
  sale({
    id: 'sale-tiago-violao',
    customerName: 'Tiago Violão',
    productName: 'Venda Parcelada - Tiago Violão',
    installmentValue: 184,
    firstDueDate: '2026-08-25',
    unitCost: 600,
    items: [
      { amount: 184, status: 'paid', paidAt: paidAtFromDMY('25/08') },
      { amount: 184, status: 'paid', paidAt: paidAtFromDMY('25/09') },
      { amount: 184, status: 'open' },
      { amount: 184, status: 'open' },
      { amount: 184, status: 'open' },
    ],
  }),
  sale({
    id: 'sale-robert',
    customerName: 'Robert',
    productName: 'Venda Parcelada - Robert',
    installmentValue: 150,
    firstDueDate: '2026-09-05',
    unitCost: 500,
    alertStatus: 'NÃO PAGOU',
    notes: '7ª coluna: NÃO PAGOU',
    items: [
      { amount: 150, status: 'paid', paidAt: paidAtFromDMY('05/09') },
      { amount: 150, status: 'open' },
      { amount: 150, status: 'open' },
      { amount: 150, status: 'open' },
      { amount: 150, status: 'open' },
      { amount: 150, status: 'open' },
      { amount: 0, status: 'warning', note: 'NÃO PAGOU' },
    ],
  }),
  sale({
    id: 'sale-pesqueiro',
    customerName: 'Pesqueiro',
    productName: 'Conta em Aberto - Pesqueiro',
    installmentValue: 85,
    firstDueDate: OPEN_INSTALLMENTS_START,
    unitCost: 0,
    notes: '12x de R$ 85 em aberto — ciclo a partir de 10/11',
    items: Array.from({ length: 12 }, () => ({ amount: 85, status: 'open' })),
  }),
  sale({
    id: 'sale-elza',
    customerName: 'Elza',
    productName: 'Conta em Aberto - Elza',
    installmentValue: 85,
    firstDueDate: OPEN_INSTALLMENTS_START,
    unitCost: 0,
    notes: '12x de R$ 85 em aberto — ciclo a partir de 10/11',
    items: Array.from({ length: 12 }, () => ({ amount: 85, status: 'open' })),
  }),
];

export const INITIAL_WARRANTIES = [
  {
    id: 'war-1',
    productId: 'sale-alipher-memoria',
    productName: 'Notebook + Upgrade Memória RAM',
    customerName: 'Alipher Not (Memoria)',
    date: '2026-09-18',
    type: 'Garantia Coberta (Ajuste de Memória)',
    whereCovered: 'Bancada Técnica All System',
    cost: 85,
    status: 'Resolvido',
    notes: 'Troca preventiva de pente DDR4 em garantia.',
  },
  {
    id: 'war-2',
    productId: 'sale-igor',
    productName: 'Apple iPhone 11',
    customerName: 'Igor (Iphone 11)',
    date: '2026-10-04',
    type: 'Garantia Coberta (Cabo / Carregador)',
    whereCovered: 'Troca imediata do estoque próprio All System',
    cost: 65,
    status: 'Resolvido',
    notes: 'Substituição de acessório em garantia.',
  },
];

export const INITIAL_TASKS = [
  {
    id: 'task-1',
    title: 'Cobrar Bruno Roque — R$ 1.800 + NÃO PAGOU MAIS',
    category: 'Cobrança',
    priority: 'alta',
    dueDate: '2026-10-27',
    completed: false,
  },
  {
    id: 'task-2',
    title: 'Acompanhar Robert (marcação NÃO PAGOU)',
    category: 'Cobrança',
    priority: 'alta',
    dueDate: '2026-10-27',
    completed: false,
  },
  {
    id: 'task-3',
    title: 'Receber parcelas em aberto Elza Notebook / Caio / Alipher iPhone',
    category: 'Financeiro',
    priority: 'media',
    dueDate: '2026-10-28',
    completed: false,
  },
  {
    id: 'task-4',
    title: 'Conferir Pesqueiro e Elza (12x R$ 85)',
    category: 'Gestão',
    priority: 'baixa',
    dueDate: '2026-10-30',
    completed: false,
  },
];
