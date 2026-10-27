import React, { useState } from 'react';
import {
  Palette,
  CheckCheck,
  Search,
  Trash2,
  Table,
  LayoutGrid,
  Edit3,
  Plus,
  X,
  UserPlus,
  Calendar,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import { formatCurrency, formatDate, isOverdue, localTodayISO, buildSaleWhatsAppUrl } from '../utils/formatters';
import { computeFinance, saleMoney } from '../utils/finance';
import CustomerSheet from './CustomerSheet';

const formatDayMonth = (isoStr) => {
  if (!isoStr) return '';
  const parts = String(isoStr).slice(0, 10).split('-');
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}`;
};

const sealClass = {
  'Em dia': 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
  Atrasado: 'bg-amber-500/20 text-amber-800 dark:text-amber-200',
  Quitado: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
};

export default function InstallmentMatrix({
  sales,
  onToggleInstallment,
  onUpdateInstallmentCell,
  onUpdateSaleBaseValue,
  onQuickAddRow,
  onMarkAllPaid,
  onDeleteSale,
  onUpdateSale,
  colorScheme,
  onToggleColorScheme,
  laneFilter = 'all',
  focusSale = null,
  onFocusHandled,
}) {
  const todayIso = localTodayISO();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
      ? 'cards'
      : 'spreadsheet'
  );
  const [editingCell, setEditingCell] = useState(null);
  const [editingBaseSale, setEditingBaseSale] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const activeSheet = sheet || (focusSale?.id ? focusSale : null);
  const [quickName, setQuickName] = useState('');
  const [quickValor, setQuickValor] = useState('');
  const [quickCount, setQuickCount] = useState(10);
  const [quickAddedSuccess, setQuickAddedSuccess] = useState('');

  const handleQuickAddSubmit = (event) => {
    event.preventDefault();
    const trimmed = quickName.trim();
    if (!trimmed || !onQuickAddRow) return;
    const parsedVal = Number(String(quickValor).replace(',', '.')) || 0;
    const parsedCount = Number(quickCount) || 10;
    setSearchTerm('');
    setStatusFilter('all');
    onQuickAddRow(trimmed, parsedVal, parsedCount, todayIso);
    setQuickName('');
    setQuickValor('');
    setQuickAddedSuccess(`"${trimmed}" entrou no topo da tabela.`);
    setTimeout(() => setQuickAddedSuccess(''), 4000);
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    const money = saleMoney(sale, todayIso);
    if (statusFilter === 'open' && money.openCount === 0) return false;
    if (statusFilter === 'overdue' && money.seal !== 'Atrasado') return false;
    if (statusFilter === 'completed' && money.seal !== 'Quitado') return false;
    if (laneFilter === 'dueToday' && money.dueToday.length === 0) return false;
    if (laneFilter === 'due7' && money.dueSoon.length === 0) return false;
    if (laneFilter === 'overdue' && money.seal !== 'Atrasado') return false;
    if (laneFilter === 'paid' && money.seal !== 'Quitado') return false;
    return true;
  });

  const summary = computeFinance(filteredSales, { period: 'all', asOf: todayIso });
  const sheetSale = activeSheet ? sales.find((sale) => sale.id === activeSheet.id) : null;

  const getCellStyle = (inst) => {
    if (!inst || inst.status === 'empty') {
      return {
        bg: 'bg-slate-100/70 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-400',
        label: 'Vazio',
      };
    }
    if (inst.status === 'warning' || String(inst.note || '').includes('NÃO PAGOU')) {
      return {
        bg: 'bg-amber-500/25 dark:bg-amber-500/30 border-amber-500 text-amber-950 dark:text-amber-100 font-black',
        label: 'Alerta',
      };
    }
    if (inst.status === 'paid') {
      if (colorScheme === 'alexandre') {
        return {
          bg: 'bg-rose-500/20 dark:bg-rose-500/25 border-rose-500/60 text-rose-800 dark:text-rose-200',
          label: 'Pago',
        };
      }
      return {
        bg: 'bg-emerald-500/20 dark:bg-emerald-500/25 border-emerald-500/60 text-emerald-900 dark:text-emerald-200',
        label: 'Pago',
      };
    }
    if (isOverdue(inst.dueDate, inst.status)) {
      return {
        bg: 'bg-amber-400/25 dark:bg-amber-500/20 border-amber-500 text-amber-950 dark:text-amber-100',
        label: 'Atrasado',
      };
    }
    if (colorScheme === 'alexandre') {
      return {
        bg: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/50 text-emerald-900 dark:text-emerald-200',
        label: 'Aberto',
      };
    }
    return {
      bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100',
      label: 'Aberto',
    };
  };

  const openWhatsApp = (sale, inst) => {
    const url = buildSaleWhatsAppUrl(sale, inst);
    if (!url) {
      setSheet({ id: sale.id, askPhone: true, instNumber: inst?.number || null });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveCellEdit = (event) => {
    event.preventDefault();
    if (!editingCell || !onUpdateInstallmentCell) return;
    onUpdateInstallmentCell(editingCell.saleId, editingCell.number, {
      amount: Number(String(editingCell.amount).replace(',', '.')) || 0,
      status: editingCell.status,
      note: editingCell.note,
      paidAt: editingCell.status === 'paid' ? editingCell.paidAt || todayIso : null,
      dueDate: editingCell.dueDate || todayIso,
    });
    setEditingCell(null);
  };

  const handleSaveBaseValueEdit = (event) => {
    event.preventDefault();
    if (!editingBaseSale || !onUpdateSaleBaseValue) return;
    onUpdateSaleBaseValue(
      editingBaseSale.saleId,
      Number(String(editingBaseSale.installmentValue).replace(',', '.')) || 0,
      Number(editingBaseSale.installmentsCount) || 10,
      { reapplyOpen: editingBaseSale.reapplyOpen !== false }
    );
    setEditingBaseSale(null);
  };

  const renderCell = (sale, inst, rowBaseVal, number) => {
    if (!inst) {
      return (
        <button
          type="button"
          onClick={() =>
            setEditingCell({
              saleId: sale.id,
              customerName: sale.customerName,
              number,
              amount: rowBaseVal || 0,
              status: 'open',
              note: '',
              paidAt: todayIso,
              dueDate: todayIso,
            })
          }
          className="w-full h-12 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-300"
        >
          +
        </button>
      );
    }
    const style = getCellStyle(inst);
    const overdue = inst.status === 'open' && isOverdue(inst.dueDate, inst.status);
    const dateLabel =
      inst.status === 'paid'
        ? `Pago ${formatDayMonth(inst.paidAt)}`
        : formatDayMonth(inst.dueDate) || style.label;
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => onToggleInstallment(sale.id, number)}
          className={`w-full h-12 px-1 rounded-lg border text-center flex flex-col items-center justify-center ${style.bg}`}
          title={`${sale.customerName} · ${number}º P · vence ${formatDate(inst.dueDate)}`}
        >
          {inst.status === 'warning' || String(inst.note || '').includes('NÃO PAGOU') ? (
            <span className="text-[9px] leading-tight font-black uppercase">{inst.note || 'Não pagou'}</span>
          ) : inst.status === 'empty' ? (
            <span className="text-[10px]">-</span>
          ) : (
            <>
              <span className="text-[11px] font-extrabold leading-none tabular-nums">R$ {inst.amount}</span>
              <span className="text-[8px] font-bold uppercase mt-0.5 leading-none">{dateLabel}</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setEditingCell({
              saleId: sale.id,
              customerName: sale.customerName,
              number,
              amount: inst.amount,
              status: inst.status,
              note: inst.note || '',
              paidAt: inst.paidAt || todayIso,
              dueDate: inst.dueDate || todayIso,
            });
          }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center"
          title="Editar parcela"
        >
          <Edit3 className="w-2.5 h-2.5" />
        </button>
        {(overdue || inst.status === 'warning') && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openWhatsApp(sale, inst);
            }}
            className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center"
            title="Cobrar no WhatsApp"
          >
            <MessageCircle className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
          <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Recebido no filtro</span>
          <strong className="block text-lg tabular-nums">{formatCurrency(summary.received)}</strong>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
          <span className="text-[10px] font-bold uppercase text-slate-500">A receber no filtro</span>
          <strong className="block text-lg tabular-nums">{formatCurrency(summary.open)}</strong>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
          <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">Atrasado no filtro</span>
          <strong className="block text-lg tabular-nums">{formatCurrency(summary.overdue)}</strong>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
          <span className="text-[10px] font-bold uppercase text-slate-500">Pessoas no filtro</span>
          <strong className="block text-lg tabular-nums">{filteredSales.length}</strong>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('spreadsheet')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'spreadsheet' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : ''}`}
            >
              <Table className="w-3.5 h-3.5" />
              Planilha
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'cards' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : ''}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
          </div>
          <button
            type="button"
            onClick={onToggleColorScheme}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800"
          >
            <Palette className="w-4 h-4" />
            {colorScheme === 'alexandre' ? 'Paleta Alexandre' : 'Paleta bancária'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar pessoa ou produto"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <option value="all">Todas ({sales.length})</option>
            <option value="open">Em aberto</option>
            <option value="overdue">Atrasadas</option>
            <option value="completed">Quitadas</option>
          </select>
        </div>
      </div>

      {onQuickAddRow && (
        <form onSubmit={handleQuickAddSubmit} className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-extrabold inline-flex items-center gap-1.5 px-2">
            <UserPlus className="w-4 h-4" />
            Inclusão rápida
          </span>
          <input
            type="text"
            required
            value={quickName}
            onChange={(event) => setQuickName(event.target.value)}
            placeholder="Nome da pessoa"
            className="flex-1 min-w-[180px] px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />
          <input
            type="number"
            step="0.01"
            value={quickValor}
            onChange={(event) => setQuickValor(event.target.value)}
            placeholder="Valor da parcela"
            className="w-36 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />
          <select
            value={quickCount}
            onChange={(event) => setQuickCount(Number(event.target.value))}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => (
              <option key={count} value={count}>{count}x</option>
            ))}
          </select>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold">
            <Plus className="w-3.5 h-3.5" />
            Incluir
          </button>
          {quickAddedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {quickAddedSuccess}
            </span>
          )}
        </form>
      )}

      {filteredSales.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
          Nenhuma pessoa neste filtro.
        </div>
      )}

      {viewMode === 'spreadsheet' && filteredSales.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            Clique na parcela para dar baixa. O lápis edita valor e data. Âmbar é atraso pela data. No celular, a visão em cards evita a rolagem larga.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1260px]">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-3 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 min-w-[220px]">Pessoa</th>
                  <th className="py-3 px-2 text-right min-w-[90px]">Valor</th>
                  {Array.from({ length: 12 }, (_, index) => (
                    <th key={index} className="py-3 px-1 text-center min-w-[82px]">{index + 1}º P</th>
                  ))}
                  <th className="py-3 px-3 text-right min-w-[110px]">Saldo</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {filteredSales.map((sale) => {
                  const money = saleMoney(sale, todayIso);
                  const rowBaseVal = Number(sale.installmentValue ?? sale.baseValue ?? 0);
                  return (
                    <tr key={sale.id}>
                      <td className="py-2.5 px-3 sticky left-0 z-10 bg-white dark:bg-slate-900">
                        <button type="button" onClick={() => setSheet({ id: sale.id })} className="block text-left font-bold truncate max-w-[180px]">
                          {sale.customerName}
                        </button>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold ${sealClass[money.seal]}`}>
                          {money.seal}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-extrabold tabular-nums">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingBaseSale({
                              saleId: sale.id,
                              customerName: sale.customerName,
                              installmentValue: rowBaseVal,
                              installmentsCount: sale.installments?.length || sale.installmentsCount || 10,
                              reapplyOpen: true,
                            })
                          }
                          className="inline-flex items-center gap-1"
                        >
                          {rowBaseVal > 0 ? formatCurrency(rowBaseVal) : 'Definir'}
                          <Edit3 className="w-3 h-3 opacity-50" />
                        </button>
                      </td>
                      {Array.from({ length: 12 }, (_, index) => {
                        const number = index + 1;
                        const inst = (sale.installments || []).find((item) => item.number === number);
                        return (
                          <td key={number} className="p-1">
                            {renderCell(sale, inst, rowBaseVal, number)}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-extrabold tabular-nums">{formatCurrency(money.openSum)}</td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onMarkAllPaid && money.openSum > 0 && (
                            <button type="button" onClick={() => onMarkAllPaid(sale.id)} className="p-1.5 rounded-lg text-emerald-700" title="Quitar em aberto">
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteSale && (
                            <button type="button" onClick={() => setPendingDelete(sale)} className="p-1.5 rounded-lg text-rose-600" title="Tirar da planilha">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white text-xs font-bold">
                  <td className="py-3 px-3 sticky left-0 bg-slate-900">Total ({filteredSales.length})</td>
                  <td className="py-3 px-2 text-right tabular-nums">
                    {formatCurrency(filteredSales.reduce((acc, sale) => acc + Number(sale.installmentValue || 0), 0))}
                  </td>
                  <td colSpan={12} className="py-3 px-3 text-center">
                    Recebido {formatCurrency(summary.received)} · Em aberto {formatCurrency(summary.open)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(summary.open)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="space-y-4">
          {filteredSales.map((sale) => {
            const money = saleMoney(sale, todayIso);
            const rowBaseVal = Number(sale.installmentValue ?? sale.baseValue ?? 0);
            return (
              <div key={sale.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <button type="button" onClick={() => setSheet({ id: sale.id })} className="font-bold text-base text-left">
                      {sale.customerName}
                    </button>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sealClass[money.seal]}`}>{money.seal}</span>
                      <span className="text-[11px] text-slate-500">Base {formatCurrency(rowBaseVal)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block">Saldo</span>
                    <strong className="tabular-nums">{formatCurrency(money.openSum)}</strong>
                    {onDeleteSale && (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(sale)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                        Tirar
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-3">
                  {(sale.installments || []).map((inst) => (
                    <div key={inst.id || inst.number}>{renderCell(sale, inst, rowBaseVal, inst.number)}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sheetSale && (
        <CustomerSheet
          sale={sheetSale}
          askPhone={activeSheet.askPhone}
          focusInstallment={activeSheet.instNumber}
          onClose={() => {
            setSheet(null);
            onFocusHandled?.();
          }}
          onSavePhone={(phone) => onUpdateSale?.(sheetSale.id, { customerPhone: phone })}
          onMarkAllPaid={onMarkAllPaid}
          onRequestDelete={(sale) => {
            setSheet(null);
            setPendingDelete(sale);
          }}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-base">Tirar {pendingDelete.customerName} da planilha?</h3>
            <p className="text-xs text-slate-500 mt-2">
              Se esta venda estiver ligada a um produto do estoque, a quantidade volta para o estoque.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setPendingDelete(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSale?.(pendingDelete.id);
                  setPendingDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white"
              >
                Tirar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold">{editingCell.number}º P — {editingCell.customerName}</h3>
              <button type="button" onClick={() => setEditingCell(null)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveCellEdit} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">
                  Valor
                  <input type="number" step="0.01" value={editingCell.amount} onChange={(event) => setEditingCell({ ...editingCell, amount: event.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                </label>
                <label className="text-xs font-bold">
                  Situação
                  <select value={editingCell.status} onChange={(event) => setEditingCell({ ...editingCell, status: event.target.value, paidAt: event.target.value === 'paid' ? editingCell.paidAt || todayIso : editingCell.paidAt })} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <option value="paid">Pago</option>
                    <option value="open">Em aberto</option>
                    <option value="warning">Alerta</option>
                    <option value="empty">Vazio</option>
                  </select>
                </label>
              </div>
              <label className="text-xs font-bold block">
                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Pago em</span>
                <input type="date" value={editingCell.paidAt || todayIso} onChange={(event) => setEditingCell({ ...editingCell, paidAt: event.target.value, status: 'paid' })} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">
                  Vencimento
                  <input type="date" value={editingCell.dueDate || todayIso} onChange={(event) => setEditingCell({ ...editingCell, dueDate: event.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                </label>
                <label className="text-xs font-bold">
                  Observação
                  <input type="text" value={editingCell.note} onChange={(event) => setEditingCell({ ...editingCell, note: event.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingCell(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingBaseSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold">Valor base — {editingBaseSale.customerName}</h3>
            <form onSubmit={handleSaveBaseValueEdit} className="space-y-3 mt-4">
              <label className="text-xs font-bold block">
                Valor da parcela
                <input type="number" step="0.01" value={editingBaseSale.installmentValue} onChange={(event) => setEditingBaseSale({ ...editingBaseSale, installmentValue: event.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </label>
              <label className="text-xs font-bold block">
                Quantidade (1 a 12)
                <input type="number" min="1" max="12" value={editingBaseSale.installmentsCount} onChange={(event) => setEditingBaseSale({ ...editingBaseSale, installmentsCount: event.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              </label>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={editingBaseSale.reapplyOpen !== false}
                  onChange={(event) => setEditingBaseSale({ ...editingBaseSale, reapplyOpen: event.target.checked })}
                  className="mt-0.5"
                />
                <span>Reaplicar só nas parcelas em aberto que ainda estão no valor antigo. Pagas, alertas e valores diferentes (como uma última parcela maior) ficam como estão.</span>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingBaseSale(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">Aplicar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
