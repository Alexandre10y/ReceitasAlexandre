import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wrench, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { formatCurrency, formatPercent, addMonthsToDate, localTodayISO } from '../utils/formatters';
import { fetchProductSpecsWithGemini } from '../services/geminiService';

const formatBrDate = (isoStr) => {
  if (!isoStr) return '';
  const parts = String(isoStr).slice(0, 10).split('-');
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function NewSaleModal({ isOpen, onClose, products, onCreateSale }) {
  const todayStr = localTodayISO();
  const nextMonthStr = addMonthsToDate(todayStr, 1);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Permite deixar SEM selecionar produto do estoque ('') para digitar livremente (Manutenção, Mão de Obra, etc.)
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [manualUnitCost, setManualUnitCost] = useState(0);
  const [costTouched, setCostTouched] = useState(false);
  const [isAiFilling, setIsAiFilling] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [downPayment, setDownPayment] = useState(0);
  const [installmentsCount, setInstallmentsCount] = useState(10);
  const [installmentValue, setInstallmentValue] = useState(330);
  const [alreadyPaidCount, setAlreadyPaidCount] = useState(0);
  const [paidDateForInitial, setPaidDateForInitial] = useState(todayStr);
  const [firstDueDate, setFirstDueDate] = useState(nextMonthStr);
  const [paymentMethod, setPaymentMethod] = useState('Parcelado All System (Planilha)');
  const [notes, setNotes] = useState('');

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  // Quando o usuário escolhe um produto cadastrado no estoque, preenche automaticamente os valores
  useEffect(() => {
    if (!selectedProduct) return;
    setCustomProductName(selectedProduct.name);
    setManualUnitCost(Number(selectedProduct.costPrice || 0));
    setCostTouched(true);
    setInstallmentsCount(10);
  }, [selectedProductId]);

  useEffect(() => {
    if (!selectedProduct) return;
    const totalSuggested = Number(selectedProduct.salePrice) * Number(quantity || 1);
    const remaining = Math.max(0, totalSuggested - Number(downPayment || 0));
    const count = Math.max(1, Number(installmentsCount || 10));
    setInstallmentValue(Number((remaining / count).toFixed(2)));
  }, [selectedProductId, quantity, downPayment, installmentsCount]);

  if (!isOpen) return null;

  const handleInstallmentsChange = (newCount) => {
    const count = Math.max(1, Number(newCount || 1));
    setInstallmentsCount(count);
    if (selectedProduct) {
      const totalSuggested = Number(selectedProduct.salePrice) * Number(quantity || 1);
      const remaining = Math.max(0, totalSuggested - Number(downPayment || 0));
      setInstallmentValue(Number((remaining / count).toFixed(2)));
    }
  };

  // Preenchimento automático via Gemini IA mesmo para itens não cadastrados no estoque
  const handleAutoFillFromText = async () => {
    const query = (customProductName || customerName || '').trim();
    if (!query) return;
    setIsAiFilling(true);
    try {
      const lower = query.toLowerCase();
      if (
        lower.includes('manutenção') ||
        lower.includes('manutencao') ||
        lower.includes('mão de obra') ||
        lower.includes('mao de obra') ||
        lower.includes('formatação') ||
        lower.includes('formatacao') ||
        lower.includes('reparo') ||
        lower.includes('conserto')
      ) {
        setCustomProductName(query);
        setManualUnitCost(0);
        setCostTouched(true);
        setInstallmentsCount(2);
        setInstallmentValue(150);
      } else {
        const specs = await fetchProductSpecsWithGemini(query);
        setCustomProductName(specs.name || query);
        setManualUnitCost(Number(specs.costPrice || 0));
        setCostTouched(true);
        const count = Math.max(1, Number(installmentsCount || 10));
        const suggestedSale = Number(specs.salePrice || 330);
        setInstallmentValue(Number((suggestedSale / count).toFixed(2)));
      }
    } finally {
      setIsAiFilling(false);
    }
  };

  const applyQuickServicePreset = (label, suggestedTotal, cost, defaultCount) => {
    setSelectedProductId('');
    setCustomProductName(label);
    setManualUnitCost(cost);
    setCostTouched(true);
    setInstallmentsCount(defaultCount);
    setInstallmentValue(Number((suggestedTotal / defaultCount).toFixed(2)));
  };

  const totalSaleAmount =
    Number(downPayment || 0) + Number(installmentsCount || 1) * Number(installmentValue || 0);
  const unitCost = selectedProduct
    ? Number(selectedProduct.costPrice || 0)
    : Number(manualUnitCost || 0);
  const totalCost = unitCost * Number(quantity || 1);
  const costInformed = Boolean(selectedProduct) || costTouched;
  const estimatedProfit = totalSaleAmount - totalCost;
  const estimatedMargin = totalSaleAmount > 0 ? (estimatedProfit / totalSaleAmount) * 100 : 0;

  // Prévia das parcelas e datas de vencimento
  const previewCount = Math.min(12, Math.max(1, Number(installmentsCount || 1)));
  const previewPaid = Math.min(previewCount, Math.max(0, Number(alreadyPaidCount || 0)));
  const previewInstallments = Array.from({ length: previewCount }, (_, idx) => {
    const number = idx + 1;
    const dueDate = addMonthsToDate(firstDueDate, idx);
    const isPaid = number <= previewPaid;
    return {
      number,
      amount: Number(installmentValue) || 0,
      dueDate,
      status: isPaid ? 'paid' : 'open',
      paidAt: isPaid ? paidDateForInitial || todayStr : null,
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const count = Math.max(1, Number(installmentsCount));
    const paidCount = Math.min(count, Math.max(0, Number(alreadyPaidCount)));
    const finalProductName =
      customProductName.trim() ||
      (selectedProduct ? selectedProduct.name : 'Serviço / Venda Avulsa');

    const installments = Array.from({ length: count }, (_, idx) => {
      const number = idx + 1;
      const dueDate = addMonthsToDate(firstDueDate, idx);
      const isPaid = number <= paidCount;
      return {
        id: `inst-${Date.now()}-${number}`,
        number,
        amount: Number(installmentValue) || 0,
        dueDate,
        status: isPaid ? 'paid' : 'open',
        paidAt: isPaid ? paidDateForInitial || todayStr : null,
      };
    });

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
      downPayment: Number(downPayment) || 0,
      paymentMethod,
      installmentsCount: count,
      installmentValue: Number(installmentValue) || 0,
      baseValue: Number(installmentValue) || 0,
      saleDate: todayStr,
      firstDueDate,
      notes: notes.trim() || finalProductName,
      installments,
    });

    setCustomerName('');
    setCustomerPhone('');
    setCustomProductName('');
    setSelectedProductId('');
    setManualUnitCost(0);
    setCostTouched(false);
    setNotes('');
    setAlreadyPaidCount(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              All System • Lançamento Aberto ou do Estoque
            </span>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
              Nova Pessoa / Venda / Manutenção / Mão de Obra
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* 1. Dados da Pessoa / Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Nome da Pessoa / Cliente na Linha *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Marcos (Manutenção Notebook)"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                WhatsApp (Opcional)
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ex: 11998765432"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* 2. Produto, Manutenção ou Mão de Obra (Aberto para digitar ou selecionar do estoque) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                Produto, Manutenção ou Mão de Obra (Aberto — não precisa estar cadastrado)
              </label>

              {/* Atalhos rápidos de Mão de Obra / Manutenção */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    applyQuickServicePreset('Mão de Obra / Manutenção', 250, 0, 1)
                  }
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition"
                >
                  + Mão de Obra
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyQuickServicePreset('Formatação + Limpeza + Pasta Térmica', 180, 0, 1)
                  }
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition"
                >
                  + Formatação
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyQuickServicePreset('Reparo de Placa / Troca de Tela', 600, 220, 3)
                  }
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition"
                >
                  + Reparo / Tela
                </button>
              </div>
            </div>

            {/* Campo livre para digitar qualquer item ou serviço + Botão Auto-Preencher IA */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customProductName}
                onChange={(e) => setCustomProductName(e.target.value)}
                placeholder="Digite livremente (Ex: Manutenção Placa, Mão de Obra, Dongle, Dell i5...) ou deixe em branco"
                className="flex-1 px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={handleAutoFillFromText}
                disabled={isAiFilling}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-extrabold shadow-sm transition shrink-0"
                title="Preenche automaticamente sugestão de valor e parcelas com Gemini IA"
              >
                {isAiFilling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Auto-Preencher (IA)
              </button>
            </div>

            {/* Opção de vincular a um produto do estoque (100% Opcional) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Vincular ao Estoque Cadastrado (Opcional)
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                >
                  <option value="">Sem produto do estoque (manutenção ou avulso)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.salePrice)} — estoque {p.stock}
                      {Number(p.stock) <= 1 ? ' — acabando' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Qtd.
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Custo Peça (R$ - Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedProduct ? selectedProduct.costPrice : manualUnitCost}
                  onChange={(e) => {
                    setManualUnitCost(e.target.value);
                    setCostTouched(true);
                  }}
                  disabled={Boolean(selectedProduct)}
                  placeholder="0 se mão de obra"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* 3. Configuração das Parcelas e Datas de Vencimento */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-indigo-800 dark:text-indigo-300 inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Configuração das Parcelas e Datas de Vencimento
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {[1, 2, 3, 4, 6, 10, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleInstallmentsChange(n)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      Number(installmentsCount) === n
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {n === 1 ? 'À Vista (1x)' : `${n}x`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Nº de Parcelas (1 a 12)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={installmentsCount}
                  onChange={(e) => handleInstallmentsChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Valor de Cada Parcela (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={installmentValue}
                  onChange={(e) => setInstallmentValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Entrada Inicial (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Data do 1º Vencimento
                </label>
                <input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Parcelas já pagas no ato
                </label>
                <input
                  type="number"
                  min="0"
                  max={installmentsCount}
                  value={alreadyPaidCount}
                  onChange={(e) => setAlreadyPaidCount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Data das parcelas já pagas
                </label>
                <input
                  type="date"
                  value={paidDateForInitial}
                  onChange={(e) => setPaidDateForInitial(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Prévia automática dos vencimentos mês a mês */}
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/50">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-1.5">
                Cronograma de Vencimentos Gerado ({previewInstallments.length}x de{' '}
                {formatCurrency(installmentValue)}):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {previewInstallments.map((p) => (
                  <span
                    key={p.number}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      p.status === 'paid'
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/40'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    <strong>{p.number}º P:</strong> {formatBrDate(p.dueDate)}{' '}
                    {p.status === 'paid' ? '(PAGO)' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Preview de Margem e Lucro da Venda */}
          <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 text-center">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Total na Planilha</span>
              <strong className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(totalSaleAmount)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Custo / Peça</span>
              <strong className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                {formatCurrency(totalCost)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">
                {costInformed ? 'Lucro desta venda' : 'Custo não informado'}
              </span>
              <strong className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                {costInformed
                  ? `${formatCurrency(estimatedProfit)} (${formatPercent(estimatedMargin)})`
                  : '—'}
              </strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Combinado pagamento todo dia 15 via PIX"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              Incluir na Planilha ({installmentsCount}x de {formatCurrency(installmentValue)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
