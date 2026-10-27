import React, { useEffect, useState } from 'react';
import { X, MessageCircle, Printer, CheckCheck, Trash2, Phone } from 'lucide-react';
import { formatCurrency, formatDate, buildSaleWhatsAppUrl, printSaleStatement, isOverdue } from '../utils/formatters';
import { productLabel, saleMoney } from '../utils/finance';

const sealClass = {
  'Em dia': 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
  Atrasado: 'bg-amber-500/20 text-amber-800 dark:text-amber-200',
  Quitado: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
};

export default function CustomerSheet({
  sale,
  askPhone = false,
  focusInstallment = null,
  onClose,
  onSavePhone,
  onMarkAllPaid,
  onRequestDelete,
}) {
  const [phone, setPhone] = useState(sale?.customerPhone || '');
  const [phoneHint, setPhoneHint] = useState(askPhone ? 'Informe o WhatsApp para abrir a conversa.' : '');

  useEffect(() => {
    setPhone(sale?.customerPhone || '');
  }, [sale?.id, sale?.customerPhone]);

  if (!sale) return null;

  const money = saleMoney(sale);
  const highlighted = focusInstallment || money.nextOpen?.number;

  const openChat = (installment) => {
    const nextSale = { ...sale, customerPhone: phone };
    const url = buildSaleWhatsAppUrl(nextSale, installment || money.nextOpen);
    if (!url) {
      setPhoneHint('Informe o WhatsApp para abrir a conversa.');
      return;
    }
    if (phone.trim() !== (sale.customerPhone || '').trim()) onSavePhone?.(phone.trim());
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const savePhone = () => {
    const trimmed = phone.trim();
    if (trimmed === (sale.customerPhone || '')) return;
    onSavePhone?.(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">
                {sale.customerName}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${sealClass[money.seal]}`}>
                {money.seal}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {productLabel(sale)}
              {sale.saleDate ? ` · venda ${formatDate(sale.saleDate)}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Entrada</span>
              <strong className="tabular-nums text-sm">{formatCurrency(sale.downPayment || 0)}</strong>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 p-3">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Recebido</span>
              <strong className="tabular-nums text-sm text-emerald-700 dark:text-emerald-300">{formatCurrency(money.paidSum)}</strong>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo</span>
              <strong className="tabular-nums text-sm">{formatCurrency(money.openSum)}</strong>
            </div>
          </div>

          <div className={`rounded-2xl border p-3 space-y-2 ${phoneHint ? 'border-amber-400 bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              WhatsApp
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onBlur={savePhone}
                placeholder="DDD + número"
                className="flex-1 px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={() => openChat(money.nextOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Cobrar
              </button>
            </div>
            {phoneHint && <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{phoneHint}</p>}
          </div>

          {sale.notes && (
            <p className="text-xs text-slate-600 dark:text-slate-300 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              {sale.notes}
            </p>
          )}

          <div className="space-y-2">
            {(sale.installments || []).map((inst) => {
              const overdue = inst.status === 'open' && isOverdue(inst.dueDate, inst.status);
              const active = highlighted === inst.number;
              return (
                <div
                  key={inst.id || inst.number}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                    active ? 'border-amber-400' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {inst.number}º P · {formatCurrency(inst.amount)}
                    </div>
                    <div className="text-slate-500">
                      Vence {formatDate(inst.dueDate)}
                      {inst.status === 'paid' && inst.paidAt ? ` · pago em ${formatDate(inst.paidAt)}` : ''}
                      {inst.note ? ` · ${inst.note}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inst.status === 'paid'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : overdue || inst.status === 'warning'
                            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {inst.status === 'paid' ? 'Pago' : inst.status === 'warning' ? 'Alerta' : overdue ? 'Atrasado' : 'Em aberto'}
                    </span>
                    {(overdue || inst.status === 'warning') && (
                      <button
                        type="button"
                        onClick={() => openChat(inst)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white"
                        title="WhatsApp desta parcela"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => printSaleStatement({ ...sale, customerPhone: phone })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir extrato
            </button>
            {onMarkAllPaid && money.openSum > 0 && (
              <button
                type="button"
                onClick={() => onMarkAllPaid(sale.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Quitar em aberto
              </button>
            )}
            {onRequestDelete && (
              <button
                type="button"
                onClick={() => onRequestDelete(sale)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Tirar da planilha
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
