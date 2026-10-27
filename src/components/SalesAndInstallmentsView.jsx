import React, { useMemo, useState } from 'react';
import { Plus, FileSpreadsheet, X } from 'lucide-react';
import InstallmentMatrix from './InstallmentMatrix';
import { formatCurrency, localTodayISO } from '../utils/formatters';
import { laneSummary } from '../utils/finance';

export default function SalesAndInstallmentsView({
  sales,
  onToggleInstallment,
  onUpdateInstallmentCell,
  onUpdateSaleBaseValue,
  onQuickAddRow,
  onImportCsvRows,
  onMarkAllPaid,
  onDeleteSale,
  onUpdateSale,
  colorScheme,
  onToggleColorScheme,
  onOpenNewSale,
  focusSale,
  onFocusHandled,
}) {
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [lane, setLane] = useState('all');
  const lanes = useMemo(() => laneSummary(sales, localTodayISO()), [sales]);

  const chips = [
    { id: 'dueToday', label: 'Vence hoje', data: lanes.dueToday },
    { id: 'due7', label: 'Vence em 7 dias', data: lanes.due7 },
    { id: 'overdue', label: 'Atrasado', data: lanes.overdue },
    { id: 'paid', label: 'Quitado', data: lanes.paid },
  ];

  const handleImportSubmit = (event) => {
    event.preventDefault();
    if (!csvText.trim() || !onImportCsvRows) return;
    onImportCsvRows(csvText);
    setCsvText('');
    setShowCsvModal(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Parcelas</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            O resumo abaixo acompanha a busca e o filtro. Clique no nome para abrir a ficha.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Colar CSV
          </button>
          <button
            type="button"
            onClick={onOpenNewSale}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova venda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {chips.map((chip) => {
          const active = lane === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setLane(active ? 'all' : chip.id)}
              className={`text-left rounded-2xl border px-3 py-3 ${
                active
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wide">{chip.label}</span>
              <span className="block text-lg font-extrabold tabular-nums mt-1">
                {chip.id === 'paid' ? chip.data.people : formatCurrency(chip.data.amount)}
              </span>
              <span className={`block text-[11px] ${active ? 'opacity-80' : 'text-slate-500'}`}>
                {chip.data.people} {chip.data.people === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </button>
          );
        })}
      </div>

      <InstallmentMatrix
        sales={sales}
        onToggleInstallment={onToggleInstallment}
        onUpdateInstallmentCell={onUpdateInstallmentCell}
        onUpdateSaleBaseValue={onUpdateSaleBaseValue}
        onQuickAddRow={onQuickAddRow}
        onMarkAllPaid={onMarkAllPaid}
        onDeleteSale={onDeleteSale}
        onUpdateSale={onUpdateSale}
        colorScheme={colorScheme}
        onToggleColorScheme={onToggleColorScheme}
        laneFilter={lane}
        focusSale={focusSale}
        onFocusHandled={onFocusHandled}
      />

      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold">Colar linhas da planilha</h3>
              <button type="button" onClick={() => setShowCsvModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleImportSubmit} className="space-y-3 mt-4">
              <p className="text-xs text-slate-500">Formato: pessoa, valor, 1º P, 2º P... O custo entra como estimado.</p>
              <textarea
                rows={5}
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                placeholder="Carlos,350,350,350"
                className="w-full p-3 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCsvModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">Importar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
