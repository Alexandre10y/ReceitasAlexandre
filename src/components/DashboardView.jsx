import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  CalendarClock,
  ShieldAlert,
  Users,
  Sparkles,
  Award,
  Flame,
  PackageCheck,
  Plus,
  AlertCircle,
  MessageCircle,
  Calculator,
  ChevronRight,
} from 'lucide-react';
import {
  formatCurrency,
  formatPercent,
  getYearMonthKey,
  getMonthYearLabel,
  isOverdue,
  buildWhatsAppUrl,
} from '../utils/formatters';
import InstallmentMatrix from './InstallmentMatrix';

export default function DashboardView({
  products,
  sales,
  warranties,
  onToggleInstallment,
  onUpdateInstallmentCell,
  onUpdateSaleBaseValue,
  onQuickAddRow,
  onMarkAllPaid,
  onDeleteSale,
  onIncrementSearchCount,
  colorScheme,
  onToggleColorScheme,
  onNavigate,
  onOpenNewSale,
}) {
  const [anticipationRate, setAnticipationRate] = useState(0);
  const currentYearMonth = new Date().toISOString().slice(0, 7);

  let totalBaseMonthlyColumn = 0; // Soma da coluna VALOR (R$ 4.923,00 da planilha)
  let totalGrossRevenue = 0;
  let totalProductCost = 0;
  let totalReceivedCash = 0;
  let totalFutureReceivables = 0;
  let totalOverdueAmount = 0;
  let totalOpenInstallmentsCount = 0;
  let thisMonthTotal = 0;
  let thisMonthReceived = 0;
  let thisMonthOpen = 0;

  const monthlyProjectionMap = {};

  sales.forEach((sale) => {
    totalBaseMonthlyColumn += Number(sale.installmentValue || 0);
    totalProductCost += Number(sale.totalCost || 0);
    totalReceivedCash += Number(sale.downPayment || 0);

    (sale.installments || []).forEach((inst) => {
      if (inst.status === 'empty' || inst.status === 'warning') return;
      const amt = Number(inst.amount || 0);
      totalGrossRevenue += amt;
      const ym = getYearMonthKey(inst.dueDate);

      if (ym) {
        if (!monthlyProjectionMap[ym]) {
          monthlyProjectionMap[ym] = {
            ym,
            label: getMonthYearLabel(inst.dueDate),
            paid: 0,
            open: 0,
            total: 0,
            count: 0,
          };
        }
        monthlyProjectionMap[ym].total += amt;
        monthlyProjectionMap[ym].count += 1;
      }

      if (inst.status === 'paid') {
        totalReceivedCash += amt;
        if (ym && monthlyProjectionMap[ym]) monthlyProjectionMap[ym].paid += amt;
      } else if (inst.status === 'open') {
        totalFutureReceivables += amt;
        totalOpenInstallmentsCount += 1;
        if (ym && monthlyProjectionMap[ym]) monthlyProjectionMap[ym].open += amt;
        if (isOverdue(inst.dueDate, inst.status)) {
          totalOverdueAmount += amt;
        }
      }

      if (ym === currentYearMonth) {
        thisMonthTotal += amt;
        if (inst.status === 'paid') {
          thisMonthReceived += amt;
        } else if (inst.status === 'open') {
          thisMonthOpen += amt;
        }
      }
    });
  });

  const totalWarrantyCost = warranties.reduce((acc, w) => acc + Number(w.cost || 0), 0);
  const grossProfitProjected = totalGrossRevenue - totalProductCost;
  const netProfitProjected = grossProfitProjected - totalWarrantyCost;
  const netMarginPercent =
    totalGrossRevenue > 0 ? (netProfitProjected / totalGrossRevenue) * 100 : 0;

  const collectionRatio = totalGrossRevenue > 0 ? totalReceivedCash / totalGrossRevenue : 0;
  const realizedNetProfit =
    totalReceivedCash - totalProductCost * collectionRatio - totalWarrantyCost;

  const todayDate = new Date();
  const discountedReceivables = sales.reduce((acc, sale) => {
    return (
      acc +
      (sale.installments || []).reduce((sub, inst) => {
        if (inst.status !== 'open') return sub;
        const amt = Number(inst.amount || 0);
        if (anticipationRate <= 0) return sub + amt;
        const due = new Date(inst.dueDate);
        const monthsDiff = Math.max(
          0,
          (due.getFullYear() - todayDate.getFullYear()) * 12 +
            (due.getMonth() - todayDate.getMonth())
        );
        const discounted = amt / Math.pow(1 + anticipationRate / 100, monthsDiff);
        return sub + discounted;
      }, 0)
    );
  }, 0);

  const totalIfAllMoneyToday = totalReceivedCash + discountedReceivables;
  const netIfAllMoneyToday = totalIfAllMoneyToday - totalProductCost - totalWarrantyCost;

  const inventorySaleValue = products.reduce(
    (acc, p) => acc + Number(p.salePrice || 0) * Number(p.stock || 0),
    0
  );

  const sortedMonths = Object.values(monthlyProjectionMap).sort((a, b) =>
    a.ym.localeCompare(b.ym)
  );
  const maxMonthValue = Math.max(...sortedMonths.map((m) => m.total), 1);

  const activeDebtors = sales
    .map((sale) => {
      const openList = (sale.installments || []).filter((i) => i.status === 'open');
      const paidList = (sale.installments || []).filter((i) => i.status === 'paid');
      const openSum = openList.reduce((a, b) => a + Number(b.amount || 0), 0);
      return {
        ...sale,
        openCount: openList.length,
        paidCount: paidList.length,
        openSum,
        nextInstallment: openList[0] || null,
      };
    })
    .filter((s) => s.openCount > 0 || s.alertStatus)
    .sort((a, b) => b.openSum - a.openSum);

  const mostSoldProducts = [...products].sort((a, b) => b.totalSold - a.totalSold).slice(0, 4);
  const mostSearchedProducts = [...products]
    .sort((a, b) => b.searchCount - a.searchCount)
    .slice(0, 4);
  const mostPurchasedProducts = [...products]
    .sort((a, b) => b.totalPurchased - a.totalPurchased)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Banner Boas-vindas Alexandre */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white p-5 sm:p-7 shadow-lg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>All System • Painel do Alexandre Beroni + Gemini IA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Sua Planilha de Devedores + Catálogo IA
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
              Todos os 15 nomes da sua planilha (Soma Coluna VALOR:{' '}
              <strong>{formatCurrency(totalBaseMonthlyColumn)}</strong>) já estão integrados abaixo, além do autopreenchimento de Notebooks com Gemini IA!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenNewSale}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Nova Venda Parcelada
            </button>
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/40 text-white border border-white/25 font-semibold text-sm transition"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Cadastrar Notebook com IA
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Se eu fosse ter todo esse dinheiro hoje */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Todo Esse Dinheiro Hoje
              </span>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(totalIfAllMoneyToday)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Já pago: <strong className="text-rose-500">{formatCurrency(totalReceivedCash)}</strong> + Em aberto: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(discountedReceivables)}</strong>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span className="inline-flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                Simular desconto antecipação:
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {anticipationRate === 0 ? '0% (Integral)' : `${anticipationRate}% a.m.`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={anticipationRate}
              onChange={(e) => setAnticipationRate(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
          </div>
        </div>

        {/* Card 2: Soma Coluna VALOR & Parcelas Abertas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Soma Mensal Planilha (VALOR)
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CalendarClock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(totalBaseMonthlyColumn)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Soma exata da coluna <strong>VALOR</strong> das {sales.length} pessoas
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Total acumulado a receber ({totalOpenInstallmentsCount}x):
            </span>
            <strong className="text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalFutureReceivables)}
            </strong>
          </div>
        </div>

        {/* Card 3: Margem & Perspectiva de Lucro */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Lucro Líquido & Margem
              </span>
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(netProfitProjected)}
              </div>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {formatPercent(netMarginPercent)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Receita Total: <strong>{formatCurrency(totalGrossRevenue)}</strong>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Lucro já realizado hoje:</span>
            <strong className="text-violet-600 dark:text-violet-400">
              {formatCurrency(realizedNetProfit)}
            </strong>
          </div>
        </div>

        {/* Card 4: Garantias Cobertas & Estoque */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Garantias & Perdas
              </span>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
              {formatCurrency(totalWarrantyCost)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {warranties.length} garantias cobertas registradas
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Produtos em Estoque:</span>
            <strong className="text-slate-800 dark:text-slate-200">
              {formatCurrency(inventorySaleValue)}
            </strong>
          </div>
        </div>
      </div>

      {/* Planilha Interativa 1º P ao 12º P Direto na Home */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Sua Planilha Interativa (1º P ao 12º P) — Clique nas células para pintar!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Todos os dados de Bruno Roque, Alipher Not, Silvano, Igor, Hullian, Thalisson, Mario HD, Panato, Monge Celular, Jorge, Thai, Tiago Violão, Robert, Pesqueiro e Elza:
          </p>
        </div>

        <InstallmentMatrix
          sales={sales}
          onToggleInstallment={onToggleInstallment}
          onUpdateInstallmentCell={onUpdateInstallmentCell}
          onUpdateSaleBaseValue={onUpdateSaleBaseValue}
          onQuickAddRow={onQuickAddRow}
          onMarkAllPaid={onMarkAllPaid}
          onDeleteSale={onDeleteSale}
          colorScheme={colorScheme}
          onToggleColorScheme={onToggleColorScheme}
          compact={true}
        />
      </div>

      {/* Inteligência de Produtos: Mais Vendidos, Mais Buscados e Mais Comprados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Produtos Mais Vendidos
              </h3>
              <p className="text-[11px] text-slate-500">Campeões de saída na All System</p>
            </div>
          </div>
          <div className="space-y-3">
            {mostSoldProducts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    #{idx + 1} MAIS VENDIDO
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Margem: {formatCurrency(p.salePrice - p.costPrice)}/un
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {p.totalSold} un
                  </span>
                  <span className="block text-[10px] text-slate-400">Estoque: {p.stock}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Produtos Mais Buscados
              </h3>
              <p className="text-[11px] text-slate-500">Termômetro de procura de clientes</p>
            </div>
          </div>
          <div className="space-y-3">
            {mostSearchedProducts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    #{idx + 1} EM PROCURA
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-slate-500">Disponível: {p.stock} un</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                      {p.searchCount}
                    </span>
                    <span className="block text-[10px] text-slate-400">buscas</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onIncrementSearchCount(p.id)}
                    className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-bold transition"
                  >
                    +1
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Produtos que Mais Comprei
              </h3>
              <p className="text-[11px] text-slate-500">Maior volume histórico de compra</p>
            </div>
          </div>
          <div className="space-y-3">
            {mostPurchasedProducts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    #{idx + 1} MAIS COMPRADO
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Custo un.: {formatCurrency(p.costPrice)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {p.totalPurchased} un
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Investido: {formatCurrency(p.totalPurchased * p.costPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
