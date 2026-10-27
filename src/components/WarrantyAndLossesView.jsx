import React, { useState } from 'react';
import { ShieldAlert, Plus, CheckCircle2, Clock, Trash2, MapPin, Wrench, X } from 'lucide-react';
import { formatCurrency, formatDate, formatPercent, localTodayISO } from '../utils/formatters';
import { computeFinance } from '../utils/finance';

export default function WarrantyAndLossesView({
  warranties,
  products,
  sales = [],
  onAddWarranty,
  onToggleWarrantyStatus,
  onDeleteWarranty,
}) {
  const [showModal, setShowModal] = useState(false);
  const todayStr = localTodayISO();

  const [form, setForm] = useState({
    productId: products[0]?.id || '',
    customerName: '',
    date: todayStr,
    type: 'Garantia Coberta (Peça / Reparo)',
    whereCovered: 'Bancada All System / Estoque Próprio',
    cost: '',
    status: 'Resolvido',
    notes: '',
  });

  const handleSave = (e) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === form.productId);
    onAddWarranty({
      ...form,
      productName: prod ? prod.name : 'Produto Avulso',
      cost: Number(form.cost) || 0,
    });
    setForm({
      ...form,
      customerName: '',
      cost: '',
      notes: '',
    });
    setShowModal(false);
  };

  const totalCost = warranties.reduce((acc, w) => acc + Number(w.cost || 0), 0);
  const resolvedCount = warranties.filter((w) => w.status === 'Resolvido').length;
  const pendingCount = warranties.length - resolvedCount;
  const finance = computeFinance(sales, { period: 'all', warranties, asOf: todayStr });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Garantias Cobertas & Controle de Perdas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Saiba exatamente quanto perdeu ou investiu em garantias, em qual cliente e onde foi coberto
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Registrar Garantia / Perda
        </button>
      </div>

      {/* KPIs de Garantias */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400 block">
            Custo Total Absorvido
          </span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {formatCurrency(totalCost)}
          </span>
          <span className="text-xs text-slate-500">
            {formatPercent(finance.warrantyPercent)} da receita ({formatCurrency(finance.gross)})
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
            Garantias Resolvidas
          </span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {resolvedCount} casos
          </span>
          <span className="text-xs text-slate-500">Clientes atendidos com sucesso</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 block">
            Em Andamento / Bancada
          </span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {pendingCount} casos
          </span>
          <span className="text-xs text-slate-500">Aguardando peça ou fornecedor</span>
        </div>
      </div>

      {/* Lista de Garantias */}
      <div className="space-y-3">
        {warranties.map((w) => (
          <div
            key={w.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  {w.type}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                    w.status === 'Resolvido'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {w.status}
                </span>
                <span className="text-xs text-slate-400">{formatDate(w.date)}</span>
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {w.productName} — <span className="text-indigo-600 dark:text-indigo-400">{w.customerName}</span>
              </h3>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <strong>Onde cobriu:</strong> {w.whereCovered}
                </span>
              </div>

              {w.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">{w.notes}</p>
              )}
            </div>

            <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
              <div className="text-left md:text-right">
                <span className="text-[10px] uppercase text-slate-400 block">Custo / Perda</span>
                <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
                  - {formatCurrency(w.cost)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleWarrantyStatus(w.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  {w.status === 'Resolvido' ? 'Reabrir' : 'Marcar Resolvido'}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteWarranty(w.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Nova Garantia / Perda */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                Registrar Garantia ou Perda
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Produto Acionado
                </label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Ex: Mercado Bom Preço"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Custo para All System (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    placeholder="Ex: 140.00"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Onde e Como Foi Coberta a Garantia? *
                </label>
                <input
                  type="text"
                  required
                  value={form.whereCovered}
                  onChange={(e) => setForm({ ...form, whereCovered: e.target.value })}
                  placeholder="Ex: Troca imediata do estoque / Assistência parceira / No local do cliente"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Tipo de Ocorrência
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="Garantia Coberta (Peça / Reparo)">Garantia (Peça / Reparo)</option>
                    <option value="Garantia Coberta (Troca Produto Novo)">Troca por Produto Novo</option>
                    <option value="Perda / Avaria de Estoque">Perda / Avaria</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Observações do Caso
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Detalhes do defeito ou acordo com fornecedor"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
