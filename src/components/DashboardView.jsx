import React, { useState } from 'react';
import { Plus, MessageCircle, ChevronDown } from 'lucide-react';
import { formatCurrency, formatPercent, buildSaleWhatsAppUrl, localTodayISO } from '../utils/formatters';
import { PERIOD_OPTIONS, computeFinance } from '../utils/finance';

const monthTitle = (iso) => {
  const [year, month] = iso.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

function Stat({ label, value, hint, tone = '' }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className={`mt-1 text-2xl font-extrabold tabular-nums tracking-tight ${tone}`}>{value}</div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function DashboardView({ sales, warranties, onNavigate, onOpenNewSale, onOpenCustomer }) {
  const [period, setPeriod] = useState('all');
  const [showMore, setShowMore] = useState(false);
  const today = localTodayISO();
  const finance = computeFinance(sales, { period, warranties, asOf: today });
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
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{monthTitle(today)}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {finance.activePeople} {finance.activePeople === 1 ? 'pessoa pagando' : 'pessoas pagando'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Previsto neste mês <strong className="tabular-nums">{formatCurrency(finance.thisMonth.total)}</strong>
            {' · '}já entrou <strong className="tabular-nums">{formatCurrency(finance.thisMonth.received)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          >
            {PERIOD_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onOpenNewSale}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova venda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          label="Recebido"
          value={formatCurrency(finance.received)}
          hint={`${periodLabel} · ${formatPercent(finance.collectionRatio * 100)} do previsto`}
          tone="text-emerald-700 dark:text-emerald-300"
        />
        <Stat label="A receber" value={formatCurrency(finance.open)} hint={periodLabel} />
        <Stat
          label="Atrasado"
          value={formatCurrency(finance.overdue)}
          hint={`${finance.overdueCount} ${finance.overdueCount === 1 ? 'parcela vencida' : 'parcelas vencidas'}`}
          tone="text-amber-700 dark:text-amber-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold">Quem cobrar agora</h2>
            <button type="button" onClick={() => onNavigate('installments')} className="text-xs font-bold text-slate-500 hover:underline">
              Ver parcelas
            </button>
          </div>
          {finance.debtors.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Ninguém atrasado.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {finance.debtors.map((debtor) => (
                <div key={debtor.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                  <button type="button" onClick={() => onOpenCustomer?.(debtor.id)} className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-bold truncate">{debtor.customerName}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {debtor.overdueCount > 0
                        ? `${formatCurrency(debtor.overdueSum)} vencido`
                        : 'marcado como não pagou'}
                      {' · '}saldo {formatCurrency(debtor.openSum)}
                    </span>
                  </button>
                  <button type="button" onClick={() => openChat(debtor)} className="p-2 rounded-xl bg-emerald-600 text-white shrink-0" title="WhatsApp">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold">Caixa por mês</h2>
            <span className="text-[11px] font-bold text-slate-500 inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Recebido</span>
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-600" />Em aberto</span>
            </span>
          </div>
          {finance.months.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nenhuma parcela neste período.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {finance.months.map((month) => (
                <div key={month.ym} className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-2 items-center">
                  <span className="text-[11px] font-semibold text-slate-500 capitalize">{month.label}</span>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${(month.paid / maxMonth) * 100}%` }} />
                    <div className="h-full bg-slate-300 dark:bg-slate-600" style={{ width: `${(month.open / maxMonth) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums text-right">{formatCurrency(month.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setShowMore((value) => !value)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold"
        >
          Resultado e detalhes
          <ChevronDown className={`w-4 h-4 transition ${showMore ? 'rotate-180' : ''}`} />
        </button>
        {showMore && (
          <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-500">Lucro com custo informado</span>
              <strong className="block text-lg tabular-nums">
                {finance.informed.sales > 0 ? formatCurrency(finance.informed.profit) : '—'}
              </strong>
              <span className="text-xs text-slate-500">
                {finance.informed.sales > 0
                  ? `Margem ${formatPercent(finance.informed.margin)}`
                  : 'Nenhuma venda com custo digitado'}
                {finance.estimated.sales > 0 ? ` · ${finance.estimated.sales} com custo estimado fora da conta` : ''}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-500">Se receber tudo hoje</span>
              <strong className="block text-lg tabular-nums">{formatCurrency(finance.netIfAllToday)}</strong>
              <span className="text-xs text-slate-500">Caixa + aberto, menos custo informado e garantias</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-500">Garantias</span>
              <strong className="block text-lg tabular-nums">{formatCurrency(finance.warrantyCost)}</strong>
              <span className="text-xs text-slate-500">{formatPercent(finance.warrantyPercent)} da receita</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-500">Atraso por tempo</span>
              <strong className="block text-lg tabular-nums">{formatCurrency(finance.aging.d1_30)}</strong>
              <span className="text-xs text-slate-500">
                até 30 dias · 31–60: {formatCurrency(finance.aging.d31_60)} · 61+: {formatCurrency(finance.aging.d61)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
