import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { formatCurrency, formatPercent, addMonthsToDate, localTodayISO, formatDate } from '../utils/formatters';
import { fetchProductSpecsWithGemini } from '../services/geminiService';

const field =
  'w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500';
const label = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1';

export default function NewSaleModal({ isOpen, onClose, products, onCreateSale }) {
  const todayStr = localTodayISO();
  const nextMonthStr = addMonthsToDate(todayStr, 1);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [manualUnitCost, setManualUnitCost] = useState('');
  const [costTouched, setCostTouched] = useState(false);
  const [isAiFilling, setIsAiFilling] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [payMode, setPayMode] = useState('installments'); // 'cash' | 'installments'
  const [cashTotal, setCashTotal] = useState('');
  const [cashDate, setCashDate] = useState(todayStr);

  const [downPayment, setDownPayment] = useState(0);
  const [installmentsCount, setInstallmentsCount] = useState(10);
  const [installmentValue, setInstallmentValue] = useState(330);
  const [alreadyPaidCount, setAlreadyPaidCount] = useState(0);
  const [paidDateForInitial, setPaidDateForInitial] = useState(todayStr);
  const [firstDueDate, setFirstDueDate] = useState(nextMonthStr);
  const [notes, setNotes] = useState('');

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  useEffect(() => {
    if (!selectedProduct) return;
    setCustomProductName(selectedProduct.name);
    setManualUnitCost(Number(selectedProduct.costPrice || 0));
    setCostTouched(true);
    setCashTotal(Number(selectedProduct.salePrice || 0) * Number(quantity || 1));
  }, [selectedProductId]);

  useEffect(() => {
    if (!selectedProduct) return;
    const totalSuggested = Number(selectedProduct.salePrice) * Number(quantity || 1);
    const remaining = Math.max(0, totalSuggested - Number(downPayment || 0));
    const count = Math.max(1, Number(installmentsCount || 10));
    setInstallmentValue(Number((remaining / count).toFixed(2)));
    setCashTotal(totalSuggested);
  }, [selectedProductId, quantity, downPayment, installmentsCount]);

  if (!isOpen) return null;

  const handleAutoFill = async () => {
    const query = (customProductName || '').trim();
    if (!query) return;
    setIsAiFilling(true);
    setAiNote('');
    try {
      const specs = await fetchProductSpecsWithGemini(query);
      setCustomProductName(specs.name || query);
      setManualUnitCost(Number(specs.costPrice || 0));
      setCostTouched(true);
      const suggestedSale = Number(specs.salePrice || 0);
      if (suggestedSale > 0) {
        setCashTotal(suggestedSale);
        const count = Math.max(1, Number(installmentsCount || 10));
        setInstallmentValue(Number((suggestedSale / count).toFixed(2)));
      }
      setAiNote(
        specs.source === 'gemini'
          ? `Ficha encontrada na web${specs.matchedModel ? `: ${specs.matchedModel}` : ''}. Confira o custo antes de salvar.`
          : 'A busca na web falhou; os valores são uma estimativa. Confira antes de salvar.'
      );
    } finally {
      setIsAiFilling(false);
    }
  };

  const applyPreset = (name, total, cost, count) => {
    setSelectedProductId('');
    setCustomProductName(name);
    setManualUnitCost(cost);
    setCostTouched(true);
    setCashTotal(total);
    if (count === 1) {
      setPayMode('cash');
    } else {
      setPayMode('installments');
      setInstallmentsCount(count);
      setInstallmentValue(Number((total / count).toFixed(2)));
    }
  };

  const unitCost = selectedProduct ? Number(selectedProduct.costPrice || 0) : Number(manualUnitCost || 0);
  const totalCost = unitCost * Number(quantity || 1);
  const costInformed = Boolean(selectedProduct) || costTouched;

  const isCash = payMode === 'cash';
  const count = isCash ? 1 : Math.min(12, Math.max(1, Number(installmentsCount || 1)));
  const totalSaleAmount = isCash
    ? Number(cashTotal || 0)
    : Number(downPayment || 0) + count * Number(installmentValue || 0);
  const profit = totalSaleAmount - totalCost;
  const margin = totalSaleAmount > 0 ? (profit / totalSaleAmount) * 100 : 0;

  const previewPaid = Math.min(count, Math.max(0, Number(alreadyPaidCount || 0)));
  const preview = isCash
    ? [{ number: 1, amount: Number(cashTotal || 0), dueDate: cashDate || todayStr, status: 'paid', paidAt: cashDate || todayStr }]
    : Array.from({ length: count }, (_, idx) => {
        const number = idx + 1;
        const isPaid = number <= previewPaid;
        return {
          number,
          amount: Number(installmentValue) || 0,
          dueDate: addMonthsToDate(firstDueDate, idx),
          status: isPaid ? 'paid' : 'open',
          paidAt: isPaid ? paidDateForInitial || todayStr : null,
        };
      });

  const reset = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomProductName('');
    setSelectedProductId('');
    setManualUnitCost('');
    setCostTouched(false);
    setAiNote('');
    setQuantity(1);
    setPayMode('installments');
    setCashTotal('');
    setCashDate(todayStr);
    setDownPayment(0);
    setInstallmentsCount(10);
    setInstallmentValue(330);
    setAlreadyPaidCount(0);
    setNotes('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!customerName.trim()) return;
    if (isCash && Number(cashTotal) <= 0) return;

    const finalProductName =
      customProductName.trim() || (selectedProduct ? selectedProduct.name : 'Venda avulsa');

    const installments = preview.map((item) => ({
      id: `inst-${Date.now()}-${item.number}`,
      ...item,
    }));

    onCreateSale({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      productId: selectedProduct ? selectedProduct.id : null,
      productName: finalProductName,
      quantity: Number(quantity) || 1,
      unitCost,
      totalCost,
      costSource: costInformed ? 'informed' : 'estimated',
      totalAmount: totalSaleAmount,
      totalPrice: totalSaleAmount,
      downPayment: isCash ? 0 : Number(downPayment) || 0,
      paymentMethod: isCash ? 'À vista' : 'Parcelado',
      installmentsCount: count,
      installmentValue: isCash ? Number(cashTotal) || 0 : Number(installmentValue) || 0,
      baseValue: isCash ? Number(cashTotal) || 0 : Number(installmentValue) || 0,
      saleDate: isCash ? cashDate || todayStr : todayStr,
      firstDueDate: isCash ? cashDate || todayStr : firstDueDate,
      notes: notes.trim() || finalProductName,
      installments,
    });

    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white dark:bg-slate-950 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-lg">Nova venda</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Pessoa *</label>
              <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome de quem está comprando" className={field} />
            </div>
            <div>
              <label className={label}>WhatsApp</label>
              <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="DDD + número" className={field} />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">O que está vendendo</span>
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => applyPreset('Mão de obra / manutenção', 250, 0, 1)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800">Mão de obra</button>
                <button type="button" onClick={() => applyPreset('Formatação + limpeza', 180, 0, 1)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800">Formatação</button>
                <button type="button" onClick={() => applyPreset('Reparo de placa / tela', 600, 220, 3)} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800">Reparo</button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customProductName}
                onChange={(e) => setCustomProductName(e.target.value)}
                placeholder="Produto ou serviço (ex: Dell Inspiron 3520 i5, iPhone 13, troca de tela)"
                className={field}
              />
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={isAiFilling || !customProductName.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shrink-0 disabled:opacity-50"
              >
                {isAiFilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Buscar ficha
              </button>
            </div>
            {aiNote && <p className="text-xs text-slate-500">{aiNote}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7">
                <label className={label}>Produto do estoque (opcional)</label>
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className={field}>
                  <option value="">Sem vínculo com o estoque</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.salePrice)} — estoque {p.stock}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Qtd.</label>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={field} />
              </div>
              <div className="sm:col-span-3">
                <label className={label}>Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedProduct ? selectedProduct.costPrice : manualUnitCost}
                  onChange={(e) => {
                    setManualUnitCost(e.target.value);
                    setCostTouched(true);
                  }}
                  disabled={Boolean(selectedProduct)}
                  placeholder="0 se só mão de obra"
                  className={field}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Pagamento</span>
              <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setPayMode('cash')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${isCash ? 'bg-white dark:bg-slate-950 shadow-sm' : 'text-slate-500'}`}
                >
                  À vista
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode('installments')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!isCash ? 'bg-white dark:bg-slate-950 shadow-sm' : 'text-slate-500'}`}
                >
                  Parcelado
                </button>
              </div>
            </div>

            {isCash ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                <div>
                  <label className={label}>Valor recebido (R$) *</label>
                  <input type="number" step="0.01" min="0" required value={cashTotal} onChange={(e) => setCashTotal(e.target.value)} placeholder="Ex: 250" className={`${field} text-lg font-extrabold`} />
                </div>
                <div>
                  <label className={label}>Pago em</label>
                  <input type="date" value={cashDate} onChange={(e) => setCashDate(e.target.value)} className={field} />
                </div>
                <p className="sm:col-span-2 text-xs text-slate-500">Entra na planilha como 1 parcela já paga nessa data.</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex flex-wrap gap-1">
                  {[2, 3, 4, 6, 10, 12].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallmentsCount(n)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        Number(installmentsCount) === n ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={label}>Parcelas (1 a 12)</label>
                    <input type="number" min="1" max="12" value={installmentsCount} onChange={(e) => setInstallmentsCount(e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className={label}>Valor da parcela (R$)</label>
                    <input type="number" step="0.01" value={installmentValue} onChange={(e) => setInstallmentValue(e.target.value)} className={`${field} font-extrabold`} />
                  </div>
                  <div>
                    <label className={label}>Entrada (R$)</label>
                    <input type="number" step="0.01" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className={label}>1º vencimento</label>
                    <input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className={label}>Já pagas no ato</label>
                    <input type="number" min="0" max={count} value={alreadyPaidCount} onChange={(e) => setAlreadyPaidCount(e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className={label}>Data das já pagas</label>
                    <input type="date" value={paidDateForInitial} onChange={(e) => setPaidDateForInitial(e.target.value)} className={field} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {preview.map((p) => (
                    <span
                      key={p.number}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                        p.status === 'paid'
                          ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/40'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p.number}º · {formatDate(p.dueDate)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-center">
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">Total</span>
              <strong className="text-base tabular-nums">{formatCurrency(totalSaleAmount)}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">Custo</span>
              <strong className="text-base tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(totalCost)}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">{costInformed ? 'Lucro' : 'Custo não informado'}</span>
              <strong className="text-base tabular-nums text-emerald-700 dark:text-emerald-300">
                {costInformed ? `${formatCurrency(profit)} (${formatPercent(margin)})` : '—'}
              </strong>
            </div>
          </section>

          <div>
            <label className={label}>Observações</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: combinado todo dia 15 via Pix" className={field} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <CheckCircle2 className="w-4 h-4" />
              {isCash ? `Registrar à vista (${formatCurrency(cashTotal || 0)})` : `Lançar ${count}x de ${formatCurrency(installmentValue)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
