import React, { useState } from 'react';
import {
  Package,
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
  Layers,
  Loader2,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { inventorySnapshot } from '../utils/finance';
import {
  fetchProductSpecsWithGemini,
  PRODUCT_PROTOTYPES,
  getGeminiApiKey,
  saveGeminiApiKey,
  DEFAULT_GEMINI_CONFIG,
} from '../services/geminiService';

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
  const [restockQty, setRestockQty] = useState(5);
  const [restockCost, setRestockCost] = useState('');

  // Estados da Integração Gemini IA
  const [quickAiModelInput, setQuickAiModelInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatusBanner, setAiStatusBanner] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getGeminiApiKey());

  const [form, setForm] = useState({
    sku: '',
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
    searchCount: 1,
    supplier: '',
    warrantyMonths: 6,
    notes: '',
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setAiStatusBanner('');
    setForm({
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
      searchCount: 1,
      supplier: '',
      warrantyMonths: 6,
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setAiStatusBanner('');
    setForm({
      sku: product.sku || '',
      name: product.name || '',
      category: product.category || 'Notebooks',
      processor: product.processor || '',
      ram: product.ram || '',
      storage: product.storage || '',
      screen: product.screen || '',
      gpu: product.gpu || '',
      condition: product.condition || 'Seminovo / Revisado',
      costPrice: product.costPrice ?? '',
      salePrice: product.salePrice ?? '',
      stock: product.stock ?? 0,
      totalPurchased: product.totalPurchased ?? 0,
      totalSold: product.totalSold ?? 0,
      searchCount: product.searchCount ?? 0,
      supplier: product.supplier || '',
      warrantyMonths: product.warrantyMonths ?? 6,
      notes: product.notes || '',
    });
    setShowModal(true);
  };

  // Autopreenchimento com Gemini IA (funciona na barra rápida da página ou dentro do modal!)
  const handleAutoFillWithGemini = async (queryToUse, openModalIfClosed = false) => {
    const query = (queryToUse || form.name || '').trim();
    if (!query) return;

    setIsAiLoading(true);
    setAiStatusBanner('Consultando especificações técnicas e preços com Gemini IA...');

    try {
      const specs = await fetchProductSpecsWithGemini(query);
      setForm((prev) => ({
        ...prev,
        sku: prev.sku || specs.sku,
        name: specs.name,
        category: specs.category,
        processor: specs.processor,
        ram: specs.ram,
        storage: specs.storage,
        screen: specs.screen,
        gpu: specs.gpu,
        condition: specs.condition || 'Seminovo / Revisado',
        costPrice: specs.costPrice,
        salePrice: specs.salePrice,
        warrantyMonths: specs.warrantyMonths || 6,
        notes: specs.notes,
      }));
      setAiStatusBanner(
        `✨ Ficha preenchida automaticamente via ${specs.source}: Processador, RAM, Gigas e sugestão de preço prontos!`
      );
      if (openModalIfClosed) {
        setEditingProduct(null);
        setShowModal(true);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      ...form,
      costPrice: Number(form.costPrice) || 0,
      salePrice: Number(form.salePrice) || 0,
      stock: Number(form.stock) || 0,
      totalPurchased: Number(form.totalPurchased) || 0,
      totalSold: Number(form.totalSold) || 0,
      searchCount: Number(form.searchCount) || 0,
      warrantyMonths: Number(form.warrantyMonths) || 6,
    };

    if (editingProduct) {
      onUpdateProduct({ ...editingProduct, ...payload });
    } else {
      onAddProduct(payload);
    }
    setShowModal(false);
    setQuickAiModelInput('');
  };

  const handleConfirmRestock = (e) => {
    e.preventDefault();
    if (!restockProduct || Number(restockQty) <= 0) return;
    onRegisterPurchase(
      restockProduct.id,
      Number(restockQty),
      restockCost !== '' ? Number(restockCost) : restockProduct.costPrice
    );
    setRestockProduct(null);
  };

  const handleSaveGeminiKey = (e) => {
    e.preventDefault();
    saveGeminiApiKey(geminiKeyInput);
    setShowApiKeyModal(false);
  };

  // Filtragem e Ordenação
  const filtered = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.processor || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'most_sold') return b.totalSold - a.totalSold;
      if (sortBy === 'most_searched') return b.searchCount - a.searchCount;
      if (sortBy === 'most_purchased') return b.totalPurchased - a.totalPurchased;
      if (sortBy === 'highest_margin') {
        return b.salePrice - b.costPrice - (a.salePrice - a.costPrice);
      }
      if (sortBy === 'low_stock') return a.stock - b.stock;
      return 0;
    });

  const stock = inventorySnapshot(products);
  const demanded = [...products]
    .filter((product) => Number(product.searchCount) > 0)
    .sort((a, b) => Number(b.searchCount) - Number(a.searchCount));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Produtos, Notebooks & Autopreenchimento Gemini IA
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Conectado: <strong>{DEFAULT_GEMINI_CONFIG.keyName}</strong> ({DEFAULT_GEMINI_CONFIG.projectName})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowApiKeyModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-bold text-xs transition"
            title="API CONEXÃO DE NOTEBOOK Ativa"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{DEFAULT_GEMINI_CONFIG.keyName} Ativa</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Produto
          </button>
        </div>
      </div>

      {/* BARRA DE CADASTRO MÁGICO COM GEMINI IA */}
      <div className="bg-gradient-to-r from-indigo-600/10 via-violet-600/10 to-fuchsia-600/10 dark:from-indigo-950/60 dark:via-violet-950/50 dark:to-slate-900 p-4 sm:p-5 rounded-3xl border border-indigo-500/30 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Protótipo Automático com Gemini IA (Zero Digitação Braçal)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Escreva o modelo (ex: <em>"Dell Inspiron 15 i5"</em>, <em>"Acer Nitro 5"</em>, <em>"Lenovo IdeaPad"</em>, <em>"iPhone 13 Pro Max"</em>) e ele puxa Processador, RAM, SSD/Gigas, Tela e Preços automaticamente:
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAutoFillWithGemini(quickAiModelInput, true);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            type="text"
            value={quickAiModelInput}
            onChange={(e) => setQuickAiModelInput(e.target.value)}
            placeholder="Digite o modelo aqui... Ex: Notebook Dell Inspiron i5 16GB 512GB ou Acer Nitro 5"
            className="flex-1 px-4 py-3 text-sm rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isAiLoading || !quickAiModelInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition"
          >
            {isAiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando Ficha Técnica...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Preencher Protótipo com IA
              </>
            )}
          </button>
        </form>

        {/* Atalhos de 1 Clique para Modelos Muito Usados */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
            Protótipos em 1 clique:
          </span>
          {[
            'Dell Inspiron 15 i5',
            'Dell Latitude i7',
            'Acer Nitro 5 RTX 3050',
            'Lenovo IdeaPad Ryzen 5',
            'ThinkPad T14 i5',
            'Samsung Galaxy Book i5',
            'MacBook Air M1',
            'iPhone 13 Pro Max',
            'iPhone 11 128GB',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setQuickAiModelInput(preset);
                handleAutoFillWithGemini(preset, true);
              }}
              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/80 dark:bg-slate-800/90 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por modelo, processador, memória RAM ou código..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'default', label: 'Todos' },
            { id: 'most_sold', label: 'Mais vendidos' },
            { id: 'most_searched', label: 'Mais buscados' },
            { id: 'most_purchased', label: 'Mais comprados' },
            { id: 'highest_margin', label: 'Maior margem' },
            { id: 'low_stock', label: 'Estoque baixo' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSortBy(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                sortBy === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <span className="text-[11px] font-bold uppercase text-slate-500">Custo parado</span>
          <strong className="block text-xl tabular-nums mt-1">{formatCurrency(stock.cost)}</strong>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <span className="text-[11px] font-bold uppercase text-slate-500">Valor de venda</span>
          <strong className="block text-xl tabular-nums mt-1">{formatCurrency(stock.sale)}</strong>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300">Estoque 0 ou 1</span>
          <strong className="block text-xl tabular-nums mt-1">{stock.low.length}</strong>
        </div>
      </div>

      {stock.low.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {stock.low.map((product) => (
            <span key={product.id} className="mr-3 font-semibold">
              {product.name}: {Number(product.stock) === 0 ? 'sem estoque' : '1 unidade'}
            </span>
          ))}
        </div>
      )}

      {demanded.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <h3 className="text-sm font-extrabold mb-2">O que o cliente mais pede</h3>
          <div className="flex flex-wrap gap-2">
            {demanded.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onIncrementSearchCount(product.id)}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800"
              >
                {product.name} · {product.searchCount}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Cards de Produtos com Especificações Técnicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
            Nenhum produto cadastrado.
          </div>
        )}
        {filtered.map((product) => {
          const linkedSales = sales.filter((sale) => sale.productId === product.id).length;
          const unitProfit = Number(product.salePrice) - Number(product.costPrice);
          const marginPct =
            product.salePrice > 0 ? (unitProfit / Number(product.salePrice)) * 100 : 0;
          const installment10x = Number(product.salePrice) / 10;

          return (
            <div
              key={product.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between hover:border-indigo-500/40 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {product.category} • {product.sku}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                      {product.name}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 text-xs font-extrabold rounded-xl shrink-0 ${
                      product.stock === 0
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : product.stock <= 1
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {product.stock === 0 ? 'Sem Estoque' : `${product.stock} em estoque`}
                  </span>
                </div>

                {/* Ficha Técnica (Processador, RAM, Gigas/SSD, Tela) */}
                {(product.processor || product.ram || product.storage || product.screen) && (
                  <div className="mt-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5 text-xs">
                    {product.processor && product.processor !== 'N/A' && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Cpu className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">
                          <strong>Proc:</strong> {product.processor}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      {product.ram && product.ram !== 'N/A' && (
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
                          <Layers className="w-3.5 h-3.5 text-violet-500" />
                          <strong>RAM:</strong> {product.ram}
                        </span>
                      )}
                      {product.storage && product.storage !== 'N/A' && (
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
                          <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                          <strong>Gigas:</strong> {product.storage}
                        </span>
                      )}
                    </div>
                    {product.screen && product.screen !== 'N/A' && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Monitor className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="truncate">
                          <strong>Tela:</strong> {product.screen}
                          {product.gpu && product.gpu !== 'N/A' ? ` • ${product.gpu}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Preço, Custo e Margem */}
                <div className="grid grid-cols-3 gap-2 my-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Custo Compra</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(product.costPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Preço Venda</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(product.salePrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Lucro / Margem</span>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(unitProfit)} ({formatPercent(marginPct)})
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
                  <span>Sugestão Parcelado (10x):</span>
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    10x de {formatCurrency(installment10x)}
                  </strong>
                </div>

                {/* Indicadores: Comprados, Vendidos e Buscas */}
                <div className="grid grid-cols-3 gap-2 text-center border-t border-b border-slate-100 dark:border-slate-800 py-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Já Comprei</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {product.totalPurchased} un
                    </strong>
                  </div>
                  <div className="border-x border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Já Vendi</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {product.totalSold} un
                    </strong>
                    {linkedSales > 0 && (
                      <span className="block text-[10px] text-slate-400">{linkedSales} na planilha</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Buscas Clientes</span>
                    <strong className="text-rose-600 dark:text-rose-400">
                      {product.searchCount}x
                    </strong>
                  </div>
                </div>
              </div>

              {/* Ações do Produto */}
              <div className="mt-4 pt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRestockProduct(product);
                      setRestockQty(2);
                      setRestockCost(product.costPrice);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    + Compra
                  </button>

                  <button
                    type="button"
                    onClick={() => onIncrementSearchCount(product.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 transition"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    +1 Busca
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(product)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Editar produto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteProduct(product.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white transition"
                    title="Excluir produto do catálogo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO COM AUTOPREENCHIMENTO GEMINI IA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Ficha Técnica Automatizada com IA
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto (Preenchimento Inteligente)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              {/* Campo Nome / Modelo com Botão Mágico Gemini IA Embutido */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
                <label className="block text-xs font-extrabold text-indigo-900 dark:text-indigo-300">
                  1. Digite o modelo do Notebook / Produto e clique em "Preencher com IA" *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Dell Inspiron 15 i5 16GB 512GB..."
                    className="flex-1 px-3.5 py-2.5 text-sm font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    disabled={isAiLoading || !form.name.trim()}
                    onClick={() => handleAutoFillWithGemini(form.name, false)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 shadow-sm transition"
                  >
                    {isAiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Autopreencher com Gemini
                  </button>
                </div>

                {aiStatusBanner && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{aiStatusBanner}</span>
                  </div>
                )}
              </div>

              {/* Especificações de Hardware (Preenchidas sozinhas pela IA!) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Processador / Chip
                  </label>
                  <input
                    type="text"
                    value={form.processor}
                    onChange={(e) => setForm({ ...form, processor: e.target.value })}
                    placeholder="Ex: Intel Core i5-1235U"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Memória RAM
                  </label>
                  <input
                    type="text"
                    value={form.ram}
                    onChange={(e) => setForm({ ...form, ram: e.target.value })}
                    placeholder="Ex: 16GB DDR4 3200MHz"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Armazenamento (Gigas / SSD)
                  </label>
                  <input
                    type="text"
                    value={form.storage}
                    onChange={(e) => setForm({ ...form, storage: e.target.value })}
                    placeholder="Ex: 512GB SSD NVMe M.2"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Tela / Display
                  </label>
                  <input
                    type="text"
                    value={form.screen}
                    onChange={(e) => setForm({ ...form, screen: e.target.value })}
                    placeholder="Ex: 15.6 Full HD IPS"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Placa de Vídeo / GPU
                  </label>
                  <input
                    type="text"
                    value={form.gpu}
                    onChange={(e) => setForm({ ...form, gpu: e.target.value })}
                    placeholder="Ex: Intel Iris Xe / RTX 3050"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Preços e Estoque */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Preço Custo (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Preço Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.salePrice}
                    onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Garantia (Meses)
                  </label>
                  <input
                    type="number"
                    value={form.warrantyMonths}
                    onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Observações Comerciais
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                >
                  Salvar Produto no Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuração API CONEXÃO DE NOTEBOOK */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                {DEFAULT_GEMINI_CONFIG.keyName}
              </h3>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGeminiKey} className="space-y-4 mt-4">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1 text-emerald-800 dark:text-emerald-200">
                <div>
                  <strong>Nome:</strong> {DEFAULT_GEMINI_CONFIG.keyName}
                </div>
                <div>
                  <strong>Nome do projeto:</strong> {DEFAULT_GEMINI_CONFIG.projectName}
                </div>
                <div>
                  <strong>Número do projeto:</strong> {DEFAULT_GEMINI_CONFIG.projectNumber}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Chave de API Configurada
                </label>
                <input
                  type="text"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white"
                >
                  Salvar Configuração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rápido de Registrar Compra */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
              Registrar Nova Compra de Estoque
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Produto: <strong>{restockProduct.name}</strong>
            </p>

            <form onSubmit={handleConfirmRestock} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Quantidade Comprada (Unidades)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Custo Unitário desta Compra (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Confirmar Entrada (+{restockQty} un)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
