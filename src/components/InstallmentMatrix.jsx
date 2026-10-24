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
} from 'lucide-react';
import {
  formatCurrency,
  isOverdue,
} from '../utils/formatters';

const formatDayMonth = (isoStr) => {
  if (!isoStr) return '';
  const parts = String(isoStr).slice(0, 10).split('-');
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}`;
};

const formatFullDateBr = (isoStr) => {
  if (!isoStr) return '';
  const parts = String(isoStr).slice(0, 10).split('-');
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function InstallmentMatrix({
  sales,
  onToggleInstallment,
  onUpdateInstallmentCell,
  onUpdateSaleBaseValue,
  onQuickAddRow,
  onMarkAllPaid,
  onDeleteSale,
  colorScheme,
  onToggleColorScheme,
  compact = false,
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | open | overdue | completed
  const [viewMode, setViewMode] = useState('spreadsheet'); // 'spreadsheet' (1º P a 12º P) | 'cards'
  const [editingCell, setEditingCell] = useState(null);
  const [editingBaseSale, setEditingBaseSale] = useState(null);

  // Estado para adicionar uma linha rápida direto na tabela
  const [quickName, setQuickName] = useState('');
  const [quickValor, setQuickValor] = useState('');
  const [quickCount, setQuickCount] = useState(10);
  const [quickAddedSuccess, setQuickAddedSuccess] = useState('');

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    const trimmed = quickName.trim();
    if (!trimmed || !onQuickAddRow) return;
    const parsedVal = Number(String(quickValor).replace(',', '.')) || 0;
    const parsedCount = Number(quickCount) || 10;

    // Limpa filtros ativos para garantir que a nova linha apareça imediatamente no topo da tabela
    setSearchTerm('');
    setStatusFilter('all');

    onQuickAddRow(trimmed, parsedVal, parsedCount, todayIso);
    setQuickName('');
    setQuickValor('');
    setQuickAddedSuccess(`"${trimmed}" incluído no topo da tabela!`);
    setTimeout(() => setQuickAddedSuccess(''), 4000);
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.productName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const openInstallments = (sale.installments || []).filter((i) => i.status === 'open');
    const hasWarning =
      sale.alertStatus ||
      (sale.installments || []).some(
        (i) => i.status === 'warning' || isOverdue(i.dueDate, i.status)
      );

    if (statusFilter === 'open' && openInstallments.length === 0) return false;
    if (statusFilter === 'overdue' && !hasWarning) return false;
    if (statusFilter === 'completed' && openInstallments.length > 0) return false;

    return true;
  });

  const totalBaseValorColumn = filteredSales.reduce(
    (acc, s) => acc + Number(s.installmentValue ?? s.baseValue ?? 0),
    0
  );

  const totalPaidGlobal = filteredSales.reduce((acc, s) => {
    const paidSum = (s.installments || [])
      .filter((i) => i.status === 'paid')
      .reduce((sub, i) => sub + Number(i.amount || 0), 0);
    return acc + Number(s.downPayment || 0) + paidSum;
  }, 0);

  const totalOpenGlobal = filteredSales.reduce((acc, s) => {
    const openSum = (s.installments || [])
      .filter((i) => i.status === 'open')
      .reduce((sub, i) => sub + Number(i.amount || 0), 0);
    return acc + openSum;
  }, 0);

  const getCellStyle = (inst) => {
    if (!inst || inst.status === 'empty') {
      return {
        bg: 'bg-slate-100/70 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-indigo-400',
        badge: 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
        label: 'VAZIO',
      };
    }

    if (inst.status === 'warning' || (inst.note && inst.note.includes('NÃO PAGOU'))) {
      return {
        bg: 'bg-amber-500/25 dark:bg-amber-500/30 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/50 font-black',
        badge: 'bg-amber-600 text-white',
        label: inst.note || 'ALERTA',
      };
    }

    const paid = inst.status === 'paid';

    if (colorScheme === 'alexandre') {
      if (paid) {
        return {
          bg: 'bg-rose-500/20 dark:bg-rose-500/25 border-rose-500/60 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30',
          badge: 'bg-rose-600 text-white',
          label: 'PAGO',
        };
      }
      return {
        bg: 'bg-emerald-500/20 dark:bg-emerald-500/25 border-emerald-500/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/35',
        badge: 'bg-emerald-600 text-white',
        label: 'ABERTO',
      };
    } else {
      if (paid) {
        return {
          bg: 'bg-emerald-500/20 dark:bg-emerald-500/25 border-emerald-500/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/30',
          badge: 'bg-emerald-600 text-white',
          label: 'PAGO',
        };
      }
      return {
        bg: 'bg-sky-500/20 dark:bg-sky-500/25 border-sky-500/60 text-sky-900 dark:text-sky-200 hover:bg-sky-500/30',
        badge: 'bg-sky-600 text-white',
        label: 'ABERTO',
      };
    }
  };

  const handleSaveCellEdit = (e) => {
    e.preventDefault();
    if (!editingCell || !onUpdateInstallmentCell) return;
    onUpdateInstallmentCell(editingCell.saleId, editingCell.number, {
      amount: Number(String(editingCell.amount).replace(',', '.')) || 0,
      status: editingCell.status,
      note: editingCell.note,
      paidAt:
        editingCell.status === 'paid'
          ? editingCell.paidAt || todayIso
          : null,
      dueDate: editingCell.dueDate || todayIso,
    });
    setEditingCell(null);
  };

  const handleSaveBaseValueEdit = (e) => {
    e.preventDefault();
    if (!editingBaseSale || !onUpdateSaleBaseValue) return;
    onUpdateSaleBaseValue(
      editingBaseSale.saleId,
      Number(String(editingBaseSale.installmentValue).replace(',', '.')) || 0,
      Number(editingBaseSale.installmentsCount) || 10
    );
    setEditingBaseSale(null);
  };

  return (
    <div className="space-y-4">
      {/* Barra de controles e alternância Planilha (1º P a 12º P) vs Cards */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('spreadsheet')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'spreadsheet'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Planilha (1º P ao 12º P)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Visão em Cards
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleColorScheme}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100 transition"
          >
            <Palette className="w-4 h-4" />
            {colorScheme === 'alexandre'
              ? 'Cores Alexandre (Vermelho = Pago | Verde = Aberto)'
              : 'Cores Bancárias (Verde = Pago | Azul = Aberto)'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar pessoa ou item..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <option value="all">Todas as Linhas ({sales.length})</option>
            <option value="open">Com Parcelas em Aberto</option>
            <option value="overdue">Com Alerta / Atraso</option>
            <option value="completed">100% Quitados (Para revisar/excluir)</option>
          </select>
        </div>
      </div>

      {/* BARRA RÁPIDA PARA ADICIONAR NOVA LINHA DIRETO NA TABELA */}
      {onQuickAddRow && (
        <form
          onSubmit={handleQuickAddSubmit}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-2.5"
        >
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1.5 px-2">
            <UserPlus className="w-4 h-4" />
            Adicionar Rápido na Linha:
          </span>
          <input
            type="text"
            required
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            placeholder="Nome da Pessoa / Serviço (ex: João Manutenção)"
            className="flex-1 min-w-[180px] px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />
          <input
            type="number"
            step="0.01"
            value={quickValor}
            onChange={(e) => setQuickValor(e.target.value)}
            placeholder="Valor Parcela (Ex: 330)"
            className="w-40 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />
          <select
            value={quickCount}
            onChange={(e) => setQuickCount(Number(e.target.value))}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n} value={n}>
                {n}x parcelas
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Incluir na Tabela
          </button>

          {quickAddedSuccess && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {quickAddedSuccess}
            </span>
          )}
        </form>
      )}

      {/* MODO 1: VISÃO PLANILHA FIEL (PESSOAS | VALOR | 1º P ... 12º P) */}
      {viewMode === 'spreadsheet' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-600 dark:text-slate-300">
                • <strong>Clique na parcela</strong> para pintar de PAGO (já grava a <strong>data de hoje automaticamente</strong>) •{' '}
                Clique no <strong>lapisinho (✎)</strong> da parcela para escolher/alterar a <strong>data exata do pagamento</strong>!
              </span>
            </div>
            <div className="font-bold text-indigo-600 dark:text-indigo-400">
              Soma Coluna VALOR: {formatCurrency(totalBaseValorColumn)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1260px]">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-3 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 min-w-[240px] border-r border-slate-200 dark:border-slate-700">
                    PESSOAS (E BOTÃO TIRAR DA LINHA)
                  </th>
                  <th className="py-3 px-2.5 text-right min-w-[95px] border-r border-slate-200 dark:border-slate-700">
                    VALOR
                  </th>
                  {Array.from({ length: 12 }, (_, idx) => (
                    <th
                      key={idx}
                      className="py-3 px-1.5 text-center min-w-[82px] border-r border-slate-200/60 dark:border-slate-800"
                    >
                      {idx + 1}º P
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right min-w-[110px]">FALTA RECEBER</th>
                  <th className="py-3 px-3 text-center min-w-[110px]">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {filteredSales.map((sale) => {
                  const openInstallments = (sale.installments || []).filter(
                    (i) => i.status === 'open'
                  );
                  const paidInstallments = (sale.installments || []).filter(
                    (i) => i.status === 'paid'
                  );
                  const openSum = openInstallments.reduce(
                    (acc, i) => acc + Number(i.amount || 0),
                    0
                  );
                  const isFullyPaid =
                    paidInstallments.length > 0 && openInstallments.length === 0;
                  const rowBaseVal = Number(sale.installmentValue ?? sale.baseValue ?? 0);

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Coluna PESSOAS + Botão Manual de Excluir / Tirar da Linha logo ao lado! */}
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span
                              className="block truncate max-w-[155px]"
                              title={sale.customerName}
                            >
                              {sale.customerName}
                            </span>
                            {sale.productName &&
                              sale.productName !== sale.customerName &&
                              !sale.productName.startsWith('Planilha -') && (
                                <span className="block truncate max-w-[155px] text-[10px] font-medium text-slate-400">
                                  {sale.productName}
                                </span>
                              )}
                            {isFullyPaid && (
                              <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                ✓ Quitado (Clique na lixeira p/ tirar)
                              </span>
                            )}
                          </div>

                          {onDeleteSale && (
                            <button
                              type="button"
                              onClick={() => onDeleteSale(sale.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white border border-rose-500/20 transition shrink-0"
                              title={`Tirar ${sale.customerName} da planilha`}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Tirar</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Coluna VALOR (Base Mensal) */}
                      <td className="py-2.5 px-2.5 text-right font-extrabold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingBaseSale({
                              saleId: sale.id,
                              customerName: sale.customerName,
                              installmentValue: rowBaseVal,
                              installmentsCount: sale.installments?.length || 10,
                            })
                          }
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1"
                          title="Clique para definir ou alterar o VALOR base e nº de parcelas desta pessoa"
                        >
                          {rowBaseVal > 0 ? formatCurrency(rowBaseVal) : 'Definir'}
                          <Edit3 className="w-3 h-3 opacity-50" />
                        </button>
                      </td>

                      {/* Colunas 1º P até 12º P */}
                      {Array.from({ length: 12 }, (_, idx) => {
                        const number = idx + 1;
                        const inst = (sale.installments || []).find(
                          (item) => item.number === number
                        );

                        if (!inst) {
                          return (
                            <td
                              key={number}
                              className="p-1 text-center border-r border-slate-100 dark:border-slate-800/60"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingCell({
                                    saleId: sale.id,
                                    customerName: sale.customerName,
                                    number,
                                    amount: rowBaseVal || 300,
                                    status: 'open',
                                    note: '',
                                    paidAt: todayIso,
                                    dueDate: todayIso,
                                  })
                                }
                                className="w-full h-11 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-300 dark:text-slate-600 hover:border-indigo-400 hover:text-indigo-400 transition flex items-center justify-center"
                                title={`Adicionar ${number}ª parcela para ${sale.customerName}`}
                              >
                                +
                              </button>
                            </td>
                          );
                        }

                        const style = getCellStyle(inst);
                        const paidDateShort = inst.paidAt ? formatDayMonth(inst.paidAt) : '';
                        const dueDateShort = inst.dueDate ? formatDayMonth(inst.dueDate) : '';

                        return (
                          <td
                            key={number}
                            className="p-1 border-r border-slate-100 dark:border-slate-800/60"
                          >
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={() => onToggleInstallment(sale.id, number)}
                                onDoubleClick={() =>
                                  setEditingCell({
                                    saleId: sale.id,
                                    customerName: sale.customerName,
                                    number,
                                    amount: inst.amount,
                                    status: inst.status,
                                    note: inst.note || '',
                                    paidAt: inst.paidAt || todayIso,
                                    dueDate: inst.dueDate || todayIso,
                                  })
                                }
                                className={`w-full h-11 px-1.5 rounded-lg border text-center flex flex-col items-center justify-center transition active:scale-95 ${style.bg}`}
                                title={
                                  inst.status === 'paid'
                                    ? `${sale.customerName} • ${number}º P — PAGO em ${
                                        inst.paidAt ? formatFullDateBr(inst.paidAt) : 'data registrada'
                                      } (Clique no lapisinho ✎ para mudar a data de pagamento)`
                                    : `${sale.customerName} • ${number}º P — EM ABERTO (Venc: ${
                                        inst.dueDate ? formatFullDateBr(inst.dueDate) : '-'
                                      }) • Clique para dar baixa com a data de hoje!`
                                }
                              >
                                {inst.status === 'warning' ||
                                (inst.note && inst.note.includes('NÃO PAGOU')) ? (
                                  <span className="text-[9px] leading-tight font-black uppercase">
                                    {inst.note || 'NÃO PAGOU'}
                                  </span>
                                ) : inst.status === 'empty' ? (
                                  <span className="text-[10px] opacity-50">-</span>
                                ) : (
                                  <>
                                    <span className="text-[11px] font-extrabold leading-none">
                                      R$ {inst.amount}
                                    </span>
                                    <span className="text-[8px] font-bold uppercase opacity-85 mt-0.5 leading-none">
                                      {inst.status === 'paid' && paidDateShort
                                        ? `PAGO ${paidDateShort}`
                                        : inst.status === 'open' && dueDateShort
                                        ? `ABERTO`
                                        : style.label}
                                    </span>
                                  </>
                                )}
                              </button>

                              {/* Botão Lapisinho (✎) sempre visível no cantinho para marcar data de pagamento ou editar valor */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                className="opacity-75 hover:opacity-100 absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center shadow hover:scale-110 transition"
                                title="Clicar no lapisinho para marcar data de pagamento, vencimento ou valor"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* FALTA RECEBER */}
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(openSum)}
                      </td>

                      {/* AÇÕES NO FIM DA LINHA */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onMarkAllPaid && openSum > 0 && (
                            <button
                              type="button"
                              onClick={() => onMarkAllPaid(sale.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="Pintar todas as parcelas como Pagas (Data de hoje)"
                            >
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteSale && (
                            <button
                              type="button"
                              onClick={() => onDeleteSale(sale.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white transition"
                              title="Excluir / Tirar desta linha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Rodapé TOTAL */}
              <tfoot>
                <tr className="bg-slate-900 text-white dark:bg-slate-800 font-extrabold text-xs">
                  <td className="py-3.5 px-3 sticky left-0 bg-slate-900 dark:bg-slate-800">
                    TOTAL ({filteredSales.length} PESSOAS)
                  </td>
                  <td className="py-3.5 px-2.5 text-right text-amber-400">
                    {formatCurrency(totalBaseValorColumn)}
                  </td>
                  <td colSpan={12} className="py-3.5 px-4 text-center text-slate-300">
                    Total Já Pago (Vermelhinho):{' '}
                    <strong className="text-rose-400">{formatCurrency(totalPaidGlobal)}</strong> •{' '}
                    Total em Aberto nas Parcelas (Verdinho):{' '}
                    <strong className="text-emerald-400">{formatCurrency(totalOpenGlobal)}</strong>
                  </td>
                  <td className="py-3.5 px-3 text-right text-emerald-400 text-sm">
                    {formatCurrency(totalOpenGlobal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODO 2: VISÃO EM CARDS (Com Botão Excluir + Data de Pagamento + Lapisinho em Cada Card!) */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {filteredSales.map((sale) => {
            const paidInstallments = (sale.installments || []).filter((i) => i.status === 'paid');
            const openInstallments = (sale.installments || []).filter((i) => i.status === 'open');
            const totalPaid =
              Number(sale.downPayment || 0) +
              paidInstallments.reduce((acc, i) => acc + Number(i.amount || 0), 0);
            const totalOpen = openInstallments.reduce((acc, i) => acc + Number(i.amount || 0), 0);
            const rowBaseVal = Number(sale.installmentValue ?? sale.baseValue ?? 0);

            return (
              <div
                key={sale.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {sale.customerName}
                      </h4>
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        Valor Base: {formatCurrency(rowBaseVal)}
                      </span>
                      {openInstallments.length === 0 && paidInstallments.length > 0 && (
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Quitado 100%
                        </span>
                      )}
                    </div>
                    {sale.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {sale.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block">Já Pagou</span>
                      <strong className="text-sm text-slate-700 dark:text-slate-300">
                        {formatCurrency(totalPaid)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block">
                        Falta Pagar
                      </span>
                      <strong className="text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalOpen)}
                      </strong>
                    </div>

                    {onDeleteSale && (
                      <button
                        type="button"
                        onClick={() => onDeleteSale(sale.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        Tirar da Linha
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-3">
                  {(sale.installments || []).map((inst) => {
                    const style = getCellStyle(inst);
                    return (
                      <div key={inst.id || inst.number} className="relative">
                        <button
                          type="button"
                          onClick={() => onToggleInstallment(sale.id, inst.number)}
                          className={`w-full p-2.5 rounded-xl border text-left transition active:scale-95 ${style.bg}`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold pr-4">
                            <span>{inst.number}º P</span>
                            <span className={`px-1 rounded text-[8px] ${style.badge}`}>
                              {style.label}
                            </span>
                          </div>
                          <div className="text-xs font-extrabold mt-1">
                            {inst.status === 'warning'
                              ? inst.note
                              : formatCurrency(inst.amount)}
                          </div>
                          <div className="text-[9px] opacity-80 mt-0.5 font-semibold">
                            {inst.status === 'paid' && inst.paidAt
                              ? `✓ Pago: ${formatFullDateBr(inst.paidAt)}`
                              : inst.dueDate
                              ? `Venc: ${formatFullDateBr(inst.dueDate)}`
                              : ''}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCell({
                              saleId: sale.id,
                              customerName: sale.customerName,
                              number: inst.number,
                              amount: inst.amount,
                              status: inst.status,
                              note: inst.note || '',
                              paidAt: inst.paidAt || todayIso,
                              dueDate: inst.dueDate || todayIso,
                            });
                          }}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900/80 text-white dark:bg-white/90 dark:text-slate-900 flex items-center justify-center shadow hover:scale-110 transition"
                          title="Editar data de pagamento ou valor desta parcela"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição de Célula Individual (Lapisinho ✎ com Data de Pagamento e Vencimento) */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Edição de Parcela & Data de Baixa
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {editingCell.number}º P — {editingCell.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCellEdit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Valor desta Parcela (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCell.amount}
                    onChange={(e) =>
                      setEditingCell({ ...editingCell, amount: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Status / Cor na Planilha
                  </label>
                  <select
                    value={editingCell.status}
                    onChange={(e) =>
                      setEditingCell({
                        ...editingCell,
                        status: e.target.value,
                        paidAt:
                          e.target.value === 'paid'
                            ? editingCell.paidAt || todayIso
                            : editingCell.paidAt,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="paid">Vermelhinho (PAGO / Baixado)</option>
                    <option value="open">Verdinho (EM ABERTO / A Receber)</option>
                    <option value="warning">Alerta (Ex: NÃO PAGOU MAIS)</option>
                    <option value="empty">Vazio (Sem parcela nesta coluna)</option>
                  </select>
                </div>
              </div>

              {/* CAMPO DE DATA DE PAGAMENTO (Para mensurar exatamente quando foi paga) */}
              <div className="p-3.5 rounded-2xl bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-rose-800 dark:text-rose-300 inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Data em que foi Paga (Baixa):
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCell({
                        ...editingCell,
                        status: 'paid',
                        paidAt: todayIso,
                      })
                    }
                    className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-rose-600 text-white hover:bg-rose-500 transition"
                  >
                    Marcar Pago Hoje ({formatDayMonth(todayIso)})
                  </button>
                </div>
                <input
                  type="date"
                  value={editingCell.paidAt || todayIso}
                  onChange={(e) =>
                    setEditingCell({
                      ...editingCell,
                      paidAt: e.target.value,
                      status: 'paid', // Ao escolher a data de pagamento, já marca como Pago automaticamente!
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800"
                />
                <p className="text-[10px] text-rose-700 dark:text-rose-300/80">
                  Ao escolher uma data aqui, a parcela já fica marcada como <strong>PAGA</strong> nessa data para você mensurar depois.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={editingCell.dueDate || todayIso}
                    onChange={(e) =>
                      setEditingCell({ ...editingCell, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Observação na Célula
                  </label>
                  <input
                    type="text"
                    value={editingCell.note}
                    onChange={(e) =>
                      setEditingCell({ ...editingCell, note: e.target.value })
                    }
                    placeholder="Ex: Pix / Dinheiro"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                >
                  Salvar Parcela & Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Definir VALOR Base e Preencher Parcelas */}
      {editingBaseSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Configurar Parcelas — {editingBaseSale.customerName}
            </h3>
            <form onSubmit={handleSaveBaseValueEdit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Valor Base da Parcela (Coluna VALOR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingBaseSale.installmentValue}
                  onChange={(e) =>
                    setEditingBaseSale({
                      ...editingBaseSale,
                      installmentValue: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Quantidade de Parcelas Ativas (1 a 12)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={editingBaseSale.installmentsCount}
                  onChange={(e) =>
                    setEditingBaseSale({
                      ...editingBaseSale,
                      installmentsCount: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBaseSale(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
                >
                  Aplicar na Planilha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
