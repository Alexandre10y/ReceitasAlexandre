import { addMonthsToDate } from '../utils/formatters';

// Gera as 12 colunas da planilha (1º P até 12º P) ou quantidade customizada
export const buildCustomInstallments = (items, firstDueDate = '2026-04-10') => {
  return items.map((item, idx) => {
    const number = idx + 1;
    const dueDate = addMonthsToDate(firstDueDate, idx);
    return {
      id: `inst-${number}-${Math.random().toString(36).slice(2, 7)}`,
      number,
      amount: Number(item.amount || 0),
      dueDate,
      status: item.status || 'open', // 'paid' | 'open' | 'warning' | 'empty'
      note: item.note || '',
      paidAt: item.status === 'paid' ? dueDate : null,
    };
  });
};

// IDs e SKUs dos produtos de demonstração iniciais que devem ser removidos automaticamente,
// preservando apenas os produtos que o Alexandre cadastrou manualmente!
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

// Sem produtos fictícios de teste — mantém apenas o que o Alexandre cadastrar!
export const INITIAL_PRODUCTS = [];

// Planilha Real do Alexandre importada integralmente!
// Soma da coluna VALOR (installmentValue) = R$ 4.923,00 exatos!
export const INITIAL_SALES = [
  {
    id: 'sale-bruno-roque',
    customerName: 'Bruno Roque',
    customerPhone: '',
    productId: 'prod-1',
    productName: 'Equipamento / Acordo Bruno Roque',
    quantity: 1,
    unitCost: 2400,
    totalCost: 2400,
    totalAmount: 4500,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 11,
    installmentValue: 450,
    saleDate: '2026-01-10',
    firstDueDate: '2026-02-10',
    alertStatus: 'NÃO PAGOU MAIS',
    notes: 'Na 10ª P consta R$ 1.800 acumulado e na 11ª P: NÃO PAGOU MAIS',
    installments: buildCustomInstallments(
      [
        { amount: 450, status: 'paid' },
        { amount: 450, status: 'paid' },
        { amount: 450, status: 'paid' },
        { amount: 450, status: 'paid' },
        { amount: 450, status: 'paid' },
        { amount: 450, status: 'paid' },
        { amount: 450, status: 'open' },
        { amount: 450, status: 'open' },
        { amount: 450, status: 'open' },
        { amount: 1800, status: 'open', note: '1800' },
        { amount: 0, status: 'warning', note: 'NÃO PAGOU MAIS' },
      ],
      '2026-02-10'
    ),
  },
  {
    id: 'sale-alipher',
    customerName: 'Alipher Not (Memoria)',
    customerPhone: '',
    productId: 'prod-4',
    productName: 'Notebook + Upgrade Memória RAM',
    quantity: 1,
    unitCost: 1950,
    totalCost: 1950,
    totalAmount: 3230,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 10,
    installmentValue: 320,
    saleDate: '2026-03-10',
    firstDueDate: '2026-04-10',
    notes: 'Parcela base R$ 320 • 8ª P, 9ª P e 10ª P marcadas com R$ 330 cada',
    installments: buildCustomInstallments(
      [
        { amount: 320, status: 'paid' },
        { amount: 320, status: 'paid' },
        { amount: 320, status: 'paid' },
        { amount: 320, status: 'paid' },
        { amount: 320, status: 'paid' },
        { amount: 320, status: 'paid' },
        { amount: 320, status: 'paid' },
        { amount: 330, status: 'open', note: '330' },
        { amount: 330, status: 'open', note: '330' },
        { amount: 330, status: 'open', note: '330' },
      ],
      '2026-04-10'
    ),
  },
  {
    id: 'sale-silvano',
    customerName: 'Silvano (Iphone 13 pro max)',
    customerPhone: '',
    productId: 'prod-2',
    productName: 'Apple iPhone 13 Pro Max',
    quantity: 1,
    unitCost: 3100,
    totalCost: 3100,
    totalAmount: 3980,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 7,
    installmentValue: 330,
    saleDate: '2026-04-15',
    firstDueDate: '2026-05-15',
    notes: 'Parcelas de R$ 330 + 7ª P de R$ 2.000,00',
    installments: buildCustomInstallments(
      [
        { amount: 330, status: 'paid' },
        { amount: 330, status: 'paid' },
        { amount: 330, status: 'paid' },
        { amount: 330, status: 'paid' },
        { amount: 330, status: 'paid' },
        { amount: 330, status: 'paid' },
        { amount: 2000, status: 'open', note: '2000' },
      ],
      '2026-05-15'
    ),
  },
  {
    id: 'sale-igor',
    customerName: 'Igor (Iphone 11 )',
    customerPhone: '',
    productId: 'prod-3',
    productName: 'Apple iPhone 11',
    quantity: 1,
    unitCost: 1180,
    totalCost: 1180,
    totalAmount: 1480,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 5,
    installmentValue: 345,
    saleDate: '2026-06-10',
    firstDueDate: '2026-07-10',
    notes: 'Parcelas de R$ 345 + 5ª P restante de R$ 100,00',
    installments: buildCustomInstallments(
      [
        { amount: 345, status: 'paid' },
        { amount: 345, status: 'paid' },
        { amount: 345, status: 'paid' },
        { amount: 345, status: 'paid' },
        { amount: 100, status: 'open', note: '100' },
      ],
      '2026-07-10'
    ),
  },
  {
    id: 'sale-hullian',
    customerName: 'Hullian',
    customerPhone: '',
    productId: 'prod-1',
    productName: 'Venda Parcelada - Hullian',
    quantity: 1,
    unitCost: 1800,
    totalCost: 1800,
    totalAmount: 3000,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 10,
    installmentValue: 300,
    saleDate: '2026-06-15',
    firstDueDate: '2026-07-15',
    notes: 'Valor da parcela na planilha: R$ 300,00',
    installments: buildCustomInstallments(
      Array.from({ length: 10 }, (_, i) => ({
        amount: 300,
        status: i < 4 ? 'paid' : 'open',
      })),
      '2026-07-15'
    ),
  },
  {
    id: 'sale-thalisson',
    customerName: 'Thalisson',
    customerPhone: '',
    productId: 'prod-1',
    productName: 'Venda Parcelada - Thalisson',
    quantity: 1,
    unitCost: 1800,
    totalCost: 1800,
    totalAmount: 3000,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 10,
    installmentValue: 300,
    saleDate: '2026-06-20',
    firstDueDate: '2026-07-20',
    notes: 'Valor da parcela na planilha: R$ 300,00',
    installments: buildCustomInstallments(
      Array.from({ length: 10 }, (_, i) => ({
        amount: 300,
        status: i < 4 ? 'paid' : 'open',
      })),
      '2026-07-20'
    ),
  },
  {
    id: 'sale-mario-hd',
    customerName: 'Mario HD',
    customerPhone: '',
    productId: 'prod-5',
    productName: 'HD / SSD Upgrade - Mario',
    quantity: 1,
    unitCost: 190,
    totalCost: 190,
    totalAmount: 400,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 4,
    installmentValue: 100,
    saleDate: '2026-08-10',
    firstDueDate: '2026-09-10',
    notes: 'Valor da parcela na planilha: R$ 100,00',
    installments: buildCustomInstallments(
      [
        { amount: 100, status: 'paid' },
        { amount: 100, status: 'open' },
        { amount: 100, status: 'open' },
        { amount: 100, status: 'open' },
      ],
      '2026-09-10'
    ),
  },
  {
    id: 'sale-panato',
    customerName: 'Panato',
    customerPhone: '',
    productId: 'prod-1',
    productName: 'Venda Parcelada - Panato',
    quantity: 1,
    unitCost: 1900,
    totalCost: 1900,
    totalAmount: 3100,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 10,
    installmentValue: 310,
    saleDate: '2026-06-10',
    firstDueDate: '2026-07-10',
    notes: 'Valor da parcela na planilha: R$ 310,00',
    installments: buildCustomInstallments(
      Array.from({ length: 10 }, (_, i) => ({
        amount: 310,
        status: i < 3 ? 'paid' : 'open',
      })),
      '2026-07-10'
    ),
  },
  {
    id: 'sale-monge',
    customerName: 'Monge Celular',
    customerPhone: '',
    productId: 'prod-2',
    productName: 'Celular / Equipamento - Monge',
    quantity: 1,
    unitCost: 2400,
    totalCost: 2400,
    totalAmount: 3960,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 6,
    installmentValue: 660,
    saleDate: '2026-07-10',
    firstDueDate: '2026-08-10',
    notes: 'Valor da parcela na planilha: R$ 660,00',
    installments: buildCustomInstallments(
      Array.from({ length: 6 }, (_, i) => ({
        amount: 660,
        status: i < 2 ? 'paid' : 'open',
      })),
      '2026-08-10'
    ),
  },
  {
    id: 'sale-jorge',
    customerName: 'Jorge',
    customerPhone: '',
    productId: 'prod-1',
    productName: 'Equipamentos All System - Jorge',
    quantity: 1,
    unitCost: 3100,
    totalCost: 3100,
    totalAmount: 5244,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 6,
    installmentValue: 874,
    saleDate: '2026-07-15',
    firstDueDate: '2026-08-15',
    notes: 'Valor da parcela na planilha: R$ 874,00',
    installments: buildCustomInstallments(
      Array.from({ length: 6 }, (_, i) => ({
        amount: 874,
        status: i < 2 ? 'paid' : 'open',
      })),
      '2026-08-15'
    ),
  },
  {
    id: 'sale-thai',
    customerName: 'Thai Namorada do Mario',
    customerPhone: '',
    productId: 'prod-1',
    productName: 'Equipamento - Thai (Namorada do Mario)',
    quantity: 1,
    unitCost: 2100,
    totalCost: 2100,
    totalAmount: 3600,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 6,
    installmentValue: 600,
    saleDate: '2026-07-20',
    firstDueDate: '2026-08-20',
    notes: 'Valor da parcela na planilha: R$ 600,00',
    installments: buildCustomInstallments(
      Array.from({ length: 6 }, (_, i) => ({
        amount: 600,
        status: i < 2 ? 'paid' : 'open',
      })),
      '2026-08-20'
    ),
  },
  {
    id: 'sale-tiago-violao',
    customerName: 'Tiago Violão',
    customerPhone: '',
    productId: 'prod-5',
    productName: 'Venda Parcelada - Tiago Violão',
    quantity: 1,
    unitCost: 600,
    totalCost: 600,
    totalAmount: 1104,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 6,
    installmentValue: 184,
    saleDate: '2026-07-25',
    firstDueDate: '2026-08-25',
    notes: 'Valor da parcela na planilha: R$ 184,00',
    installments: buildCustomInstallments(
      Array.from({ length: 6 }, (_, i) => ({
        amount: 184,
        status: i < 2 ? 'paid' : 'open',
      })),
      '2026-08-25'
    ),
  },
  {
    id: 'sale-robert',
    customerName: 'Robert',
    customerPhone: '',
    productId: 'prod-5',
    productName: 'Venda Parcelada - Robert',
    quantity: 1,
    unitCost: 500,
    totalCost: 500,
    totalAmount: 900,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 6,
    installmentValue: 150,
    saleDate: '2026-08-05',
    firstDueDate: '2026-09-05',
    notes: 'Valor da parcela na planilha: R$ 150,00',
    installments: buildCustomInstallments(
      Array.from({ length: 6 }, (_, i) => ({
        amount: 150,
        status: i < 1 ? 'paid' : 'open',
      })),
      '2026-09-05'
    ),
  },
  {
    id: 'sale-pesqueiro',
    customerName: 'Pesqueiro',
    customerPhone: '',
    productId: 'prod-1',
    productName: 'Conta em Aberto - Pesqueiro',
    quantity: 1,
    unitCost: 0,
    totalCost: 0,
    totalAmount: 0,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 12,
    installmentValue: 0,
    saleDate: '2026-10-01',
    firstDueDate: '2026-10-15',
    notes: 'Linha da planilha aguardando definição de valor/parcelas (clique em qualquer célula para editar)',
    installments: buildCustomInstallments(
      Array.from({ length: 12 }, () => ({ amount: 0, status: 'empty' })),
      '2026-10-15'
    ),
  },
  {
    id: 'sale-elza',
    customerName: 'Elza',
    customerPhone: '',
    productId: 'prod-1',
    productName: 'Conta em Aberto - Elza',
    quantity: 1,
    unitCost: 0,
    totalCost: 0,
    totalAmount: 0,
    downPayment: 0,
    paymentMethod: 'Planilha All System',
    installmentsCount: 12,
    installmentValue: 0,
    saleDate: '2026-10-01',
    firstDueDate: '2026-10-15',
    notes: 'Linha da planilha aguardando definição de valor/parcelas (clique em qualquer célula para editar)',
    installments: buildCustomInstallments(
      Array.from({ length: 12 }, () => ({ amount: 0, status: 'empty' })),
      '2026-10-15'
    ),
  },
];

export const INITIAL_WARRANTIES = [
  {
    id: 'war-1',
    productId: 'prod-4',
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
    productId: 'prod-3',
    productName: 'Apple iPhone 11 128GB',
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
    title: 'Verificar situação do Bruno Roque (R$ 1.800 em aberto - NÃO PAGOU MAIS)',
    category: 'Cobrança',
    priority: 'alta',
    dueDate: '2026-10-24',
    completed: false,
  },
  {
    id: 'task-2',
    title: 'Receber 8ª parcela (R$ 330,00) do Alipher Not (Memoria)',
    category: 'Cobrança',
    priority: 'alta',
    dueDate: '2026-10-25',
    completed: false,
  },
  {
    id: 'task-3',
    title: 'Acompanhar parcela de R$ 2.000,00 do Silvano (iPhone 13 Pro Max)',
    category: 'Financeiro',
    priority: 'alta',
    dueDate: '2026-10-26',
    completed: false,
  },
  {
    id: 'task-4',
    title: 'Cobrar últimos R$ 100,00 do Igor (iPhone 11 - 5ª P)',
    category: 'Cobrança',
    priority: 'media',
    dueDate: '2026-10-27',
    completed: false,
  },
  {
    id: 'task-5',
    title: 'Atualizar valores das linhas Pesqueiro e Elza na planilha do sistema',
    category: 'Gestão',
    priority: 'baixa',
    dueDate: '2026-10-28',
    completed: false,
  },
];
