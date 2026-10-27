import React, { useState } from 'react';
import {
  Plus,
  Search,
  Flame,
  Edit3,
  Trash2,
  PackagePlus,
  X,
  Sparkles,
  Cpu,
  HardDrive,
  Monitor,
  MemoryStick,
  Loader2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { inventorySnapshot } from '../utils/finance';
import { fetchProductSpecsWithGemini, getGeminiApiKey, saveGeminiApiKey } from '../services/geminiService';

const CATEGORIES = ['Notebooks', 'Notebooks Gamer', 'Smartphones', 'Apple / MacBooks', 'Hardware & Upgrades', 'Periféricos', 'Outros'];
const CONDITIONS = ['Seminovo / Revisado', 'Seminovo Premium', 'Novo Lacrado', 'Usado com marcas', 'Para peças'];
const QUICK_MODELS = ['Dell Inspiron 15 3520 i5', 'Lenovo IdeaPad 3 82MD', 'Acer Nitro 5 AN515-57', 'Samsung Galaxy Book2', 'MacBook Air M1 A2337', 'iPhone 13 128GB'];

const input =
  'w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 placeholder:text-slate-400';
const labelCls = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1';

const emptyForm = () => ({
  sku: `AS-${Math.floor(100 + Math.random() * 900)}`,
  name: '',
  category: 'Notebooks',
  processor: '',
  ram: '',
  storage: '',
  screen: '',
  gpu: '',
  condition: 'Seminovo / Revisado',
  costPrice: '',
  salePrice: '',
  stock: 1,
  totalPurchased: 1,
  totalSold: 0,
  searchCount: 0,
  supplier: '',
  warrantyMonths: 6,
  notes: '',
});

function Section({ step, title, hint, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-extrabold inline-flex items-center justify-center">
          {step}
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold leading-tight">{title}</h4>
          {hint && <p className="text-[11px] text-slate-500 leading-tight">{hint}</p>}
        </div>
      </header>
      <div className="p-4 bg-white dark:bg-slate-950">{children}</div>
    </section>
  );
}

function SpecField({ icon: Icon, label, value, onChange, placeholder }) {
  return (
    <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 focus-within:ring-2 focus-within:ring-slate-400 dark:focus-within:ring-slate-500 bg-white dark:bg-slate-900">
      <Icon className="w-4 h-4 mt-1 text-slate-400 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm font-semibold focus:outline-none placeholder:font-normal placeholder:text-slate-400"
        />
      </span>
    </label>
  );
}

export default function ProductsView({
  products,
  sales = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onIncrementSearchCount,
  onRegisterPurchase,
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState(2);
  const [restockCost, setRestockCost] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const [quickQuery, setQuickQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { source, confidence, matchedModel, sources, error, variants, query }
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getGeminiApiKey());

  const [form, setForm] = useState(emptyForm);

  const openCreateModal = (prefillName = '') => {
    setEditingProduct(null);
    setAiResult(null);
    setForm({ ...emptyForm(), name: prefillName });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setAiResult(null);
    setForm({
      ...emptyForm(),
      ...product,
      costPrice: product.costPrice ?? '',
      salePrice: product.salePrice ?? '',
      stock: product.stock ?? 0,
      totalPurchased: product.totalPurchased ?? 0,
      totalSold: product.totalSold ?? 0,
      searchCount: product.searchCount ?? 0,
      warrantyMonths: product.warrantyMonths ?? 6,
    });
    setShowModal(true);
  };

  const runAutoFill = async (queryToUse, openModalIfClosed = false) => {
    const query = (queryToUse || form.name || '').trim();
    if (!query) return;
    setIsAiLoading(true);
    if (openModalIfClosed) {
      setEditingProduct(null);
      setForm({ ...emptyForm(), name: query });
      setAiResult(null);
      setShowModal(true);
    }
    try {
      const specs = await fetchProductSpecsWithGemini(query);
      setForm((prev) => ({
        ...prev,
        sku: prev.sku || specs.sku,
        name: specs.name || prev.name,
        category: specs.category || prev.category,
        processor: specs.processor || '',
        ram: specs.ram || '',
        storage: specs.storage || '',
        screen: specs.screen || '',
        gpu: specs.gpu || '',
        condition: specs.condition || prev.condition,
        costPrice: specs.costPrice || prev.costPrice,
        salePrice: specs.salePrice || prev.salePrice,
        warrantyMonths: specs.warrantyMonths || prev.warrantyMonths,
        notes: specs.notes || prev.notes,
      }));
      setAiResult({
        query,
        source: specs.source,
        confidence: specs.confidence,
        matchedModel: specs.matchedModel,
        sources: specs.sources || [],
        error: specs.error || '',
        variants: specs.variants || '',
        grounded: specs.grounded !== false,
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      name: form.name.trim(),
      costPrice: Number(form.costPrice) || 0,
      salePrice: Number(form.salePrice) || 0,
      stock: Number(form.stock) || 0,
      totalPurchased: Number(form.totalPurchased) || 0,
      totalSold: Number(form.totalSold) || 0,
      searchCount: Number(form.searchCount) || 0,
      warrantyMonths: Number(form.warrantyMonths) || 6,
    };
    if (editingProduct) onUpdateProduct({ ...editingProduct, ...payload });
    else onAddProduct(payload);
    setShowModal(false);
    setQuickQuery('');
  };

  const handleConfirmRestock = (event) => {
    event.preventDefault();
    if (!restockProduct || Number(restockQty) <= 0) return;
    onRegisterPurchase(restockProduct.id, Number(restockQty), restockCost !== '' ? Number(restockCost) : restockProduct.costPrice);
    setRestockProduct(null);
  };

  const handleSaveGeminiKey = (event) => {
    event.preventDefault();
    saveGeminiApiKey(geminiKeyInput);
    setShowApiKeyModal(false);
  };

  const term = search.toLowerCase();
  const filtered = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term) ||
        (p.processor || '').toLowerCase().includes(term) ||
        (p.category || '').toLowerCase().includes(term)
    )
    .sort((a, b) => {
      if (sortBy === 'most_sold') return b.totalSold - a.totalSold;
      if (sortBy === 'most_searched') return b.searchCount - a.searchCount;
      if (sortBy === 'highest_margin') return b.salePrice - b.costPrice - (a.salePrice - a.costPrice);
      if (sortBy === 'low_stock') return a.stock - b.stock;
      return 0;
    });

  const stock = inventorySnapshot(products);
  const demanded = [...products]
    .filter((product) => Number(product.searchCount) > 0)
    .sort((a, b) => Number(b.searchCount) - Number(a.searchCount));

  const formCost = Number(form.costPrice) || 0;
  const formSale = Number(form.salePrice) || 0;
  const formProfit = formSale - formCost;
  const formMargin = formSale > 0 ? (formProfit / formSale) * 100 : 0;

  const confidenceLabel = { alta: 'Confiança alta', media: 'Confiança média', baixa: 'Confiança baixa' };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Produtos</h1>
          <p className="text-sm text-slate-500">
            {products.length} {products.length === 1 ? 'cadastrado' : 'cadastrados'} · custo parado {formatCurrency(stock.cost)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowApiKeyModal(true)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Chave da API Gemini"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Cadastrar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-extrabold">Cadastro rápido pela ficha do modelo</h3>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            runAutoFill(quickQuery, true);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={quickQuery}
            onChange={(event) => setQuickQuery(event.target.value)}
            placeholder="Modelo, part number ou service tag — ex: Inspiron 3520, 82MD0007BR, A2337, JX9K2L3"
            className={input}
          />
          <button
            type="submit"
            disabled={isAiLoading || !quickQuery.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm shrink-0 disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar ficha
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_MODELS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setQuickQuery(preset);
                runAutoFill(preset, true);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              {preset}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          Quanto mais exato o código, melhor: a etiqueta embaixo do notebook (service tag, part number, S/N) acerta muito mais do que só "Dell i5".
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar no estoque"
            className={`${input} pl-10`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'default', label: 'Todos' },
            { id: 'most_sold', label: 'Mais vendidos' },
            { id: 'most_searched', label: 'Mais pedidos' },
            { id: 'highest_margin', label: 'Maior margem' },
            { id: 'low_stock', label: 'Estoque baixo' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSortBy(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold ${
                sortBy === tab.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {stock.low.length > 0 && (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 flex flex-wrap gap-x-4 gap-y-1">
          <strong className="inline-flex items-center gap-1"><AlertTriangle className="w-4 h-4" />Repor:</strong>
          {stock.low.map((product) => (
            <span key={product.id}>
              {product.name} ({Number(product.stock) === 0 ? 'zerado' : '1 un'})
            </span>
          ))}
        </div>
      )}

      {demanded.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Mais pedidos:</span>
          {demanded.slice(0, 6).map((product) => (
            <span key={product.id} className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">
              {product.name} · {product.searchCount}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
            {products.length === 0 ? 'Nenhum produto ainda. Digite um modelo acima e deixe a ficha vir pronta.' : 'Nada encontrado com esse filtro.'}
          </div>
        )}
        {filtered.map((product) => {
          const linkedSales = sales.filter((sale) => sale.productId === product.id).length;
          const unitProfit = Number(product.salePrice) - Number(product.costPrice);
          const marginPct = product.salePrice > 0 ? (unitProfit / Number(product.salePrice)) * 100 : 0;
          const specs = [product.processor, product.ram, product.storage, product.screen, product.gpu].filter((item) => item && item !== 'N/A');

          return (
            <div key={product.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {product.category} · {product.sku}
                  </span>
                  <h3 className="font-bold text-sm leading-snug mt-0.5">{product.name}</h3>
                </div>
                <span
                  className={`px-2 py-1 text-[11px] font-extrabold rounded-lg shrink-0 ${
                    Number(product.stock) === 0
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      : Number(product.stock) <= 1
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {Number(product.stock) === 0 ? 'Zerado' : `${product.stock} un`}
                </span>
              </div>

              {specs.length > 0 && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{specs.join(' · ')}</p>
              )}

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-center">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Custo</span>
                  <strong className="text-xs tabular-nums">{formatCurrency(product.costPrice)}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Venda</span>
                  <strong className="text-xs tabular-nums">{formatCurrency(product.salePrice)}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Lucro</span>
                  <strong className="text-xs tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(unitProfit)} · {formatPercent(marginPct)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>10x de <strong className="tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(Number(product.salePrice) / 10)}</strong></span>
                <span>
                  {product.totalSold} vendidos{linkedSales > 0 ? ` · ${linkedSales} na planilha` : ''} · {product.searchCount} pedidos
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRestockProduct(product);
                      setRestockQty(2);
                      setRestockCost(product.costPrice);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    Compra
                  </button>
                  <button
                    type="button"
                    onClick={() => onIncrementSearchCount(product.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800"
                    title="Cliente pediu esse produto"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    +1 pedido
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openEditModal(product)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Editar">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setPendingDelete(product)} className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-600" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-950 rounded-t-3xl sm:rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[94vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-lg">{editingProduct ? 'Editar produto' : 'Novo produto'}</h3>
              <button type="button" onClick={() => setShowModal(false)} aria-label="Fechar" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <Section step="1" title="Qual é o produto?" hint="Nome, código de modelo, part number ou service tag. Depois clique em Buscar ficha.">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="Ex: Dell Inspiron 15 3520 i5 12ª · ou o código da etiqueta"
                    className={`${input} font-bold`}
                  />
                  <button
                    type="button"
                    disabled={isAiLoading || !form.name.trim()}
                    onClick={() => runAutoFill(form.name, false)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shrink-0 disabled:opacity-50"
                  >
                    {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Buscar ficha
                  </button>
                </div>

                {isAiLoading && (
                  <p className="mt-2 text-xs text-slate-500 inline-flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pesquisando o modelo exato na web…
                  </p>
                )}

                {aiResult && !isAiLoading && (
                  <div
                    className={`mt-3 rounded-xl border px-3 py-2.5 text-xs space-y-1.5 ${
                      aiResult.source === 'gemini' && aiResult.confidence !== 'baixa'
                        ? 'border-emerald-300/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
                        : 'border-amber-300/60 bg-amber-500/10 text-amber-900 dark:text-amber-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        {aiResult.source === 'gemini' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {aiResult.source === 'gemini'
                          ? `${aiResult.grounded ? 'Ficha da web' : 'Ficha pela memória do Gemini (sem busca na web)'} · ${confidenceLabel[aiResult.confidence] || 'Confiança média'}`
                          : 'Busca na web falhou · preenchido por estimativa'}
                      </span>
                      <button
                        type="button"
                        onClick={() => runAutoFill(form.name, false)}
                        className="inline-flex items-center gap-1 font-bold underline-offset-2 hover:underline"
                      >
                        <RefreshCw className="w-3 h-3" /> Buscar de novo
                      </button>
                    </div>
                    {aiResult.matchedModel && (
                      <p>
                        Modelo identificado: <strong>{aiResult.matchedModel}</strong>
                      </p>
                    )}
                    {aiResult.variants && <p className="opacity-90">Variações: {aiResult.variants}</p>}
                    {aiResult.source === 'gemini' && aiResult.confidence === 'baixa' && (
                      <p>Não deu para confirmar o modelo exato. Tente o código completo da etiqueta (service tag, part number ou S/N).</p>
                    )}
                    {aiResult.source === 'local' && (
                      <p className="opacity-90">
                        Motivo: {aiResult.error}. Confira a chave da API (ícone de chave no topo) e a conexão. Os campos abaixo são um chute e precisam de revisão.
                      </p>
                    )}
                    {aiResult.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {aiResult.sources.map((src) => (
                          <a
                            key={src.uri}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/30 font-semibold truncate max-w-[14rem]"
                            title={src.title}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                  <div>
                    <label className={labelCls}>Categoria</label>
                    <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={input}>
                      {!CATEGORIES.includes(form.category) && <option value={form.category}>{form.category}</option>}
                      {CATEGORIES.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Estado</label>
                    <select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} className={input}>
                      {!CONDITIONS.includes(form.condition) && <option value={form.condition}>{form.condition}</option>}
                      {CONDITIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Código interno</label>
                    <input type="text" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} className={input} />
                  </div>
                </div>
              </Section>

              <Section step="2" title="Ficha técnica" hint="Vem preenchida pela busca. Ajuste o que estiver diferente da máquina na sua mão.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <SpecField icon={Cpu} label="Processador" value={form.processor} onChange={(value) => setForm({ ...form, processor: value })} placeholder="Intel Core i5-1235U" />
                  <SpecField icon={MemoryStick} label="Memória RAM" value={form.ram} onChange={(value) => setForm({ ...form, ram: value })} placeholder="16GB DDR4 3200MHz" />
                  <SpecField icon={HardDrive} label="Armazenamento" value={form.storage} onChange={(value) => setForm({ ...form, storage: value })} placeholder="512GB SSD NVMe" />
                  <SpecField icon={Monitor} label="Tela" value={form.screen} onChange={(value) => setForm({ ...form, screen: value })} placeholder='15.6" Full HD 120Hz' />
                  <div className="sm:col-span-2">
                    <SpecField icon={Monitor} label="Placa de vídeo" value={form.gpu} onChange={(value) => setForm({ ...form, gpu: value })} placeholder="Intel Iris Xe / RTX 3050 4GB" />
                  </div>
                </div>
              </Section>

              <Section step="3" title="Preço" hint="Custo pago e preço de venda. A margem e o parcelado aparecem na hora.">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className={labelCls}>Custo (R$) *</label>
                    <input type="number" step="0.01" min="0" required value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} className={`${input} font-bold`} />
                  </div>
                  <div>
                    <label className={labelCls}>Venda (R$) *</label>
                    <input type="number" step="0.01" min="0" required value={form.salePrice} onChange={(event) => setForm({ ...form, salePrice: event.target.value })} className={`${input} font-extrabold`} />
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-center">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Lucro</span>
                      <strong className={`text-sm tabular-nums ${formProfit < 0 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {formatCurrency(formProfit)} · {formatPercent(formMargin)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">10x de</span>
                      <strong className="text-sm tabular-nums">{formatCurrency(formSale / 10)}</strong>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[11px] font-bold text-slate-500 self-center">Sugerir venda:</span>
                  {[1.4, 1.5, 1.6].map((factor) => (
                    <button
                      key={factor}
                      type="button"
                      disabled={!formCost}
                      onClick={() => setForm({ ...form, salePrice: Math.round((formCost * factor) / 10) * 10 })}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                    >
                      custo +{Math.round((factor - 1) * 100)}%
                    </button>
                  ))}
                </div>
              </Section>

              <Section step="4" title="Estoque e garantia">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={labelCls}>Em estoque</label>
                    <input type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className={input} />
                  </div>
                  <div>
                    <label className={labelCls}>Garantia (meses)</label>
                    <input type="number" min="0" value={form.warrantyMonths} onChange={(event) => setForm({ ...form, warrantyMonths: event.target.value })} className={input} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Fornecedor</label>
                    <input type="text" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} placeholder="De quem comprou" className={input} />
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <label className={labelCls}>Observações para o anúncio</label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      placeholder="Pontos fortes, detalhes de uso, acessórios inclusos"
                      className={`${input} resize-none`}
                    />
                  </div>
                </div>
              </Section>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  {editingProduct ? 'Salvar alterações' : 'Salvar produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-950 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="font-extrabold text-lg">Excluir {pendingDelete.name}?</h3>
            <p className="text-sm text-slate-500">As vendas já lançadas na planilha continuam lá; só o produto sai do catálogo.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPendingDelete(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(pendingDelete.id);
                  setPendingDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-950 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base inline-flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Chave da API Gemini
              </h3>
              <button type="button" onClick={() => setShowApiKeyModal(false)} aria-label="Fechar" className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGeminiKey} className="space-y-4 mt-4">
              <p className="text-xs text-slate-500">
                A busca de ficha usa o Gemini com pesquisa Google. Se a busca cair em "estimativa", gere uma chave nova em aistudio.google.com e cole aqui.
              </p>
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(event) => setGeminiKeyInput(event.target.value)}
                className={`${input} font-mono text-xs`}
                placeholder="Cole a chave"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">
                  Fechar
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-950 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="font-extrabold text-lg">Entrada de estoque</h3>
            <p className="text-xs text-slate-500 mt-1">{restockProduct.name}</p>
            <form onSubmit={handleConfirmRestock} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Quantidade</label>
                  <input type="number" min="1" required value={restockQty} onChange={(event) => setRestockQty(event.target.value)} className={input} />
                </div>
                <div>
                  <label className={labelCls}>Custo unitário (R$)</label>
                  <input type="number" step="0.01" required value={restockCost} onChange={(event) => setRestockCost(event.target.value)} className={input} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRestockProduct(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white">
                  Confirmar +{restockQty} un
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
