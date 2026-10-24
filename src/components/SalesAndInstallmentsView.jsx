import React, { useState } from 'react';
import { Plus, FileSpreadsheet, X } from 'lucide-react';
import InstallmentMatrix from './InstallmentMatrix';
import { formatCurrency, getYearMonthKey } from '../utils/formatters';

export default function SalesAndInstallmentsView({
  sales,
  onToggleInstallment,
  onUpdateInstallmentCell,
  onUpdateSaleBaseValue,
  onQuickAddRow,
  onImportCsvRows,
  onMarkAllPaid,
  onDeleteSale,
  colorScheme,
  onToggleColorScheme,
  onOpenNewSale,
}) {
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');

  let totalBaseMonthlySum = 0;
  let totalPaidAll = 0;
  let totalOpenAll = 0;
  let openInstallmentsCount = 0;

  sales.forEach((s) => {
    totalBaseMonthlySum += Number(s.installmentValue || 0);
    totalPaidAll += Number(s.downPayment || 0);
    (s.installments || []).forEach((i) => {
      const amt = Number(i.amount || 0);
      if (i.status === 'paid') {
        totalPaidAll += amt;
      } else if (i.status === 'open') {
        totalOpenAll += amt;
        openInstallmentsCount += 1;
      }
    });
  });

  const handleImportSubmit = (e) => {
    e.preventDefault();
    if (!csvText.trim() || !onImportCsvRows) return;
    onImportCsvRows(csvText);
    setCsvText('');
    setShowCsvModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Planilha Oficial do Alexandre (1º P ao 12º P)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Todas as 15 pessoas da sua planilha já estão lançadas abaixo! Clique nas células para pintar (Vermelho = Pago | Verde = Aberto) ou clique em "Tirar" para excluir da linha
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Importar / Colar CSV
          </button>

          <button
            type="button"
            onClick={onOpenNewSale}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nova Pessoa / Venda
          </button>
        </div>
      </div>

      {/* Resumo Rápido das Parcelas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400 block">
            Soma Coluna VALOR (Mensal)
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {formatCurrency(totalBaseMonthlySum)}
          </span>
          <span className="text-xs text-slate-500">Soma das linhas ativas na tabela</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400 block">
            Total Já Pago (Vermelhinho)
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {formatCurrency(totalPaidAll)}
          </span>
          <span className="text-xs text-slate-500">Parcelas já baixadas</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
            Falta Receber (Verdinho)
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {formatCurrency(totalOpenAll)}
          </span>
          <span className="text-xs text-slate-500">Em {openInstallmentsCount} parcelas em aberto</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400 block">
            Se Receber Tudo Hoje
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
            {formatCurrency(totalPaidAll + totalOpenAll)}
          </span>
          <span className="text-xs text-slate-500">Caixa + Todas as parcelas abertas</span>
        </div>
      </div>

      {/* Matriz Visual Completa (Planilha 1º P a 12º P + Cards) */}
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
        compact={false}
      />

      {/* Modal para Colar Novas Linhas do Excel/Planilha */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Importar Linhas da Planilha (CSV / Excel)
              </h3>
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cole linhas no formato <code>PESSOA,VALOR,1º P,2º P...</code> para adicionar automaticamente novas pessoas:
              </p>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Exemplo:&#10;Carlos Notebook,350,350,350,,,,,,,,"
                className="w-full p-3 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
                >
                  Importar Linhas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
