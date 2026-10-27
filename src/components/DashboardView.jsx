import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  CalendarClock,
  ShieldAlert,
  AlertCircle,
  Plus,
  MessageCircle,
  Calculator,
  Package,
} from 'lucide-react';
import { formatCurrency, formatPercent, buildSaleWhatsAppUrl, localTodayISO } from '../utils/formatters';
import {
  PERIOD_OPTIONS,
  computeFinance,
  inventorySnapshot,
  rankSalesByProduct,
} from '../utils/finance';

const monthTitle = (iso) => {
  const [year, month] = iso.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

function MoneyCard({ label, value, hint, tone = 'slate', children }) {
  const tones = {
    slate: 'text-slate-500 dark:text-slate-400',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    amber: 'text-amber-700 dark:text-amber-300',
    violet: 'text-violet-700 dark:text-violet-300',
    rose: 'text-rose-700 dark:text-rose-300',
  };
  return (
    <div className="h-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
      <span className={`text-[11px] font-bold uppercase tracking-wider ${tones[tone]}`}>{label}</span>
      <div className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white tracking-tight">
        {value}
      </div>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

export default function DashboardView({
  products,
  sales,
  warranties,
  onNavigate,
  onOpenNewSale,
  onOpenCustomer,
}) {
  const [period, setPeriod] = useState('all');
  const [anticipationRate, setAnticipationRate] = useState(0);
  const today = localTodayISO();
  const finance = computeFinance(sales, { period, anticipationRate, warranties, asOf: today });
  const stock = inventorySnapshot(products);
  const ranking = rankSalesByProduct(sales).slice(0, 4);
  const demanded = [...products]
    .filter((product) => Number(product.searchCount) > 0)
    .sort((a, b) => Number(b.searchCount) - Number(a.searchCount))
    .slice(0, 4);
  const maxMonth = Math.max(...finance.months.map((month) => month.total), 1);
  const periodLabel = PERIOD_OPTIONS.find((item) => item.id === period)?.label || 'Tudo';

  const openChat = (debtor) => {
    const sale = sales.find((item) => item.id === debtor.id);
    if (!sale) return;
    const url = buildSaleWhatsAppUrl(sale, debtor.next);
    if (!url) {
      onOpenCustomer?.(sale.id, { askPhone: true, instNumber: debtor.next?.number });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{monthTitle(today)}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {finance.activePeople} {finance.activePeople === 1 ? 'pessoa ativa' : 'pessoas ativas'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Entra neste mês{' '}
            <strong className="tabular-nums">{formatCurrency(finance.thisMonth.total)}</strong>
            {' · '}
            Atrasado{' '}
            <strong className="tabular-nums text-amber-700 dark:text-amber-300">
              {formatCurrency(finance.overdue)}
            </strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewSale}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova venda
          </button>
          <button
            type="button"
            onClick={() => onNavigate('installments')}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
          >
            Abrir parcelas
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              period === item.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MoneyCard
          label="Recebido"
          tone="emerald"
          value={formatCurrency(finance.received)}
          hint={`${periodLabel} · taxa de recebimento ${formatPercent(finance.collectionRatio * 100)}`}
        />
        <MoneyCard
          label="A receber"
          value={formatCurrency(finance.open)}
          hint={`${periodLabel} · ticket médio ${formatCurrency(finance.averageTicket)}`}
        />
        <MoneyCard
          label="Atrasado"
          tone="amber"
          value={formatCurrency(finance.overdue)}
          hint={`${finance.overdueCount} parcelas fora do prazo, em qualquer mês`}
        />
        <MoneyCard
          label="Previsto no mês"
          tone="violet"
          value={formatCurrency(finance.thisMonth.total)}
          hint={`Recebido ${formatCurrency(finance.thisMonth.received)} · em aberto ${formatCurrency(finance.thisMonth.open)}`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white">Caixa por mês</h2>
              <p className="text-xs text-slate-500">Recebido e em aberto · {periodLabel}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Recebido</span>
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-600" /> Em aberto</span>
            </div>
          </div>
          {finance.months.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Nenhuma parcela neste período.</p>
          ) : (
            <div className="space-y-2.5">
              {finance.months.map((month) => (
                <div key={month.ym} className="grid grid-cols-[4.8rem_1fr_5.6rem] gap-2 items-center">
                  <span className="text-[11px] font-semibold text-slate-500 capitalize">{month.label}</span>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${(month.paid / maxMonth) * 100}%` }} />
                    <div className="h-full bg-slate-300 dark:bg-slate-600" style={{ width: `${(month.open / maxMonth) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums text-right">{formatCurrency(month.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h2 className="font-extrabold text-slate-900 dark:text-white">Quem cobrar agora</h2>
          </div>
          {finance.debtors.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Nenhuma parcela atrasada.</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-80 pr-1">
              {finance.debtors.map((debtor) => (
                <div key={debtor.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                  <button type="button" onClick={() => onOpenCustomer?.(debtor.id)} className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-bold truncate">{debtor.customerName}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      Atraso {formatCurrency(debtor.overdueSum)} · saldo {formatCurrency(debtor.openSum)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openChat(debtor)}
                    className="p-2 rounded-xl bg-emerald-600 text-white shrink-0"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MoneyCard
          label="Lucro com custo informado"
          tone="emerald"
          value={finance.informed.sales > 0 ? formatCurrency(finance.informed.profit) : '—'}
          hint={
            finance.informed.sales > 0
              ? `Margem ${formatPercent(finance.informed.margin)} sobre ${formatCurrency(finance.informed.revenue)}`
              : 'Nenhuma venda deste período tem custo digitado.'
          }
        >
          <p className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
            Custo estimado fora deste número: {finance.estimated.sales} vendas, {formatCurrency(finance.estimated.revenue)} de receita.
          </p>
        </MoneyCard>

        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" />
            Se receber tudo hoje
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums">{formatCurrency(finance.netIfAllToday)}</div>
          <p className="text-xs text-slate-500 mt-1">
            Caixa {formatCurrency(finance.cashReceivedAll)} + a receber com desconto {formatCurrency(finance.discountedOpen)}, menos custo informado e garantias.
          </p>
          <div className="mt-auto pt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="inline-flex items-center gap-1"><Calculator className="w-3.5 h-3.5" /> Antecipação</span>
              <span className="font-bold">{anticipationRate === 0 ? '0% (integral)' : `${anticipationRate}% a.m.`}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={anticipationRate}
              onChange={(event) => setAnticipationRate(Number(event.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('warranties')}
          className="h-full text-left bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 inline-flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Garantias
          </span>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
            {formatCurrency(finance.warrantyCost)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {formatPercent(finance.warrantyPercent)} da receita ({periodLabel.toLowerCase()}). Resultado do mês, depois das garantias do mês: {formatCurrency(finance.monthResult)}.
          </p>
          <p className="text-xs text-slate-500 mt-3 inline-flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            Atraso 1–30 dias {formatCurrency(finance.aging.d1_30)} · 31–60 {formatCurrency(finance.aging.d31_60)} · 61+ {formatCurrency(finance.aging.d61)}
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <h3 className="font-extrabold text-sm mb-3 inline-flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Mais vendidos nas vendas
          </h3>
          {ranking.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma venda para ranquear.</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((item, index) => (
                <div key={item.key} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
                    <p className="text-xs font-bold truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.qty} un · {item.marginKnown ? `margem ${formatCurrency(item.margin)}` : 'margem sem custo informado'}
                    </p>
                  </div>
                  <strong className="text-xs tabular-nums shrink-0">{formatCurrency(item.revenue)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <h3 className="font-extrabold text-sm mb-3 inline-flex items-center gap-2">
            <Package className="w-4 h-4" />
            Estoque parado
          </h3>
          {products.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum produto cadastrado.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="flex justify-between"><span className="text-slate-500">Custo parado</span><strong className="tabular-nums">{formatCurrency(stock.cost)}</strong></p>
              <p className="flex justify-between"><span className="text-slate-500">Valor de venda</span><strong className="tabular-nums">{formatCurrency(stock.sale)}</strong></p>
              {stock.low.length === 0 ? (
                <p className="text-xs text-slate-500 pt-2">Nenhum item com estoque 0 ou 1.</p>
              ) : (
                <div className="pt-2 space-y-1">
                  {stock.low.map((product) => (
                    <p key={product.id} className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {product.name}: {Number(product.stock) === 0 ? 'sem estoque' : '1 unidade'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {demanded.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-sm mb-3">O que o cliente mais pede</h3>
            <div className="space-y-2">
              {demanded.map((product) => (
                <div key={product.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold truncate pr-2">{product.name}</span>
                  <span className="tabular-nums text-slate-500">{product.searchCount} buscas</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
