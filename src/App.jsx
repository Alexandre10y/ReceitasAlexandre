import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Grid,
  Package,
  ShieldAlert,
  CheckSquare,
  Sun,
  Moon,
  Plus,
  Database,
  Mic,
  Sparkles,
  LogOut,
  Lock,
} from 'lucide-react';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_WARRANTIES,
  INITIAL_TASKS,
  buildCustomInstallments,
  filterOutDemoProducts,
} from './data/initialData';
import {
  initFirebaseApp,
  subscribeToWorkspaceData,
  saveWorkspaceDataToCloud,
} from './services/firebaseConfig';
import DashboardView from './components/DashboardView';
import SalesAndInstallmentsView from './components/SalesAndInstallmentsView';
import ProductsView from './components/ProductsView';
import WarrantyAndLossesView from './components/WarrantyAndLossesView';
import TasksView from './components/TasksView';
import NewSaleModal from './components/NewSaleModal';
import FirebaseModal from './components/FirebaseModal';
import GeminiLiveAssistant from './components/GeminiLiveAssistant';
import AdminLoginScreen from './components/AdminLoginScreen';

const STORAGE_KEYS = {
  THEME: 'allsystem_theme_v2',
  COLOR_SCHEME: 'allsystem_color_scheme_v2',
  PRODUCTS: 'allsystem_products_v2',
  SALES: 'allsystem_sales_v2',
  WARRANTIES: 'allsystem_warranties_v2',
  TASKS: 'allsystem_tasks_v2',
  ADMIN_AUTH: 'allsystem_admin_auth_v1',
};

export default function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return (
      localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true' ||
      sessionStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true'
    );
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved ? saved === 'dark' : true;
  });

  const [colorScheme, setColorScheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.COLOR_SCHEME) || 'alexandre';
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isGeminiLiveOpen, setIsGeminiLiveOpen] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState(() => initFirebaseApp());
  const [syncState, setSyncState] = useState('connecting');
  const [syncError, setSyncError] = useState('');

  const isApplyingRemoteUpdate = useRef(false);

  // Filtra automaticamente os produtos fictícios de demonstração (prod-1..prod-6),
  // mantendo APENAS os produtos que o Alexandre cadastrou manualmente!
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const parsed = saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
      return filterOutDemoProducts(parsed);
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [sales, setSales] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      return saved ? JSON.parse(saved) : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [warranties, setWarranties] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WARRANTIES);
      return saved ? JSON.parse(saved) : INITIAL_WARRANTIES;
    } catch {
      return INITIAL_WARRANTIES;
    }
  });

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const hasInitialCloudLoadedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToWorkspaceData(
      (cloudData) => {
        // Só aplica automaticamente na carga inicial para nunca sobrescrever adições ou exclusões locais feitas pelo Alexandre
        if (hasInitialCloudLoadedRef.current) return;
        hasInitialCloudLoadedRef.current = true;
        isApplyingRemoteUpdate.current = true;
        if (Array.isArray(cloudData.products)) {
          // Remove também da nuvem qualquer produto fictício de teste (prod-1 a prod-6), mantendo só os reais do Alexandre!
          const cleanedCloudProducts = filterOutDemoProducts(cloudData.products);
          setProducts(cleanedCloudProducts);
        }
        if (Array.isArray(cloudData.sales) && cloudData.sales.length > 0) {
          setSales(cloudData.sales);
        }
        if (Array.isArray(cloudData.warranties)) {
          setWarranties(cloudData.warranties);
        }
        if (Array.isArray(cloudData.tasks)) {
          setTasks(cloudData.tasks);
        }
        setTimeout(() => {
          isApplyingRemoteUpdate.current = false;
        }, 150);
      },
      (status, errMsg) => {
        if (status === 'empty_cloud') {
          hasInitialCloudLoadedRef.current = true;
          saveWorkspaceDataToCloud(
            { products, sales, warranties, tasks, colorScheme },
            (st, err) => {
              setSyncState(st);
              if (err) setSyncError(err);
            }
          );
        } else {
          setSyncState(status);
          if (errMsg) setSyncError(errMsg);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    localStorage.setItem(STORAGE_KEYS.WARRANTIES, JSON.stringify(warranties));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.COLOR_SCHEME, colorScheme);

    if (isApplyingRemoteUpdate.current) return;

    const timer = setTimeout(() => {
      saveWorkspaceDataToCloud(
        { products, sales, warranties, tasks, colorScheme },
        (st, err) => {
          setSyncState(st);
          if (err) setSyncError(err);
        }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [products, sales, warranties, tasks, colorScheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleForcePushToCloud = () => {
    saveWorkspaceDataToCloud(
      { products, sales, warranties, tasks, colorScheme },
      (st, err) => {
        setSyncState(st);
        if (err) setSyncError(err);
      }
    );
  };

  const handleToggleInstallment = (saleId, installmentNumber) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setSales((prev) =>
      prev.map((sale) => {
        if (sale.id !== saleId) return sale;
        return {
          ...sale,
          installments: sale.installments.map((inst) => {
            if (inst.number !== installmentNumber) return inst;
            if (inst.status === 'empty') {
              return {
                ...inst,
                amount: Number(sale.installmentValue) || 300,
                status: 'open',
              };
            }
            const nextStatus = inst.status === 'paid' ? 'open' : 'paid';
            return {
              ...inst,
              status: nextStatus,
              paidAt: nextStatus === 'paid' ? todayStr : null,
            };
          }),
        };
      })
    );
  };

  const handleUpdateInstallmentCell = (saleId, installmentNumber, updates) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setSales((prev) =>
      prev.map((sale) => {
        if (sale.id !== saleId) return sale;
        const exists = (sale.installments || []).some((i) => i.number === installmentNumber);
        let updatedInstallments;
        if (exists) {
          updatedInstallments = sale.installments.map((inst) => {
            if (inst.number !== installmentNumber) return inst;
            const nextStatus = updates.status || inst.status;
            const resolvedPaidAt =
              nextStatus === 'paid'
                ? updates.paidAt || inst.paidAt || todayStr
                : null;
            return {
              ...inst,
              ...updates,
              status: nextStatus,
              paidAt: resolvedPaidAt,
            };
          });
        } else {
          const nextStatus = updates.status || 'open';
          updatedInstallments = [
            ...(sale.installments || []),
            {
              id: `inst-${Date.now()}-${installmentNumber}`,
              number: installmentNumber,
              dueDate: updates.dueDate || todayStr,
              ...updates,
              status: nextStatus,
              paidAt: nextStatus === 'paid' ? updates.paidAt || todayStr : null,
            },
          ].sort((a, b) => a.number - b.number);
        }
        return {
          ...sale,
          installments: updatedInstallments,
        };
      })
    );
  };

  const handleUpdateSaleBaseValue = (saleId, newBaseValue, count) => {
    setSales((prev) =>
      prev.map((sale) => {
        if (sale.id !== saleId) return sale;
        const newInstallments = buildCustomInstallments(
          Array.from({ length: count }, (_, idx) => {
            const existing = (sale.installments || [])[idx];
            return {
              amount: newBaseValue,
              status:
                existing && existing.status !== 'empty' ? existing.status : 'open',
              note: existing?.note || '',
            };
          }),
          sale.firstDueDate || '2026-10-15'
        );
        return {
          ...sale,
          installmentValue: newBaseValue,
          baseValue: newBaseValue,
          installmentsCount: count,
          totalAmount: newBaseValue * count,
          totalPrice: newBaseValue * count,
          installments: newInstallments,
        };
      })
    );
  };

  const handleImportCsvRows = (rawCsv) => {
    const lines = rawCsv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const importedSales = [];
    lines.forEach((line) => {
      const cols = line.split(',');
      const name = (cols[0] || '').trim();
      if (!name || name.toUpperCase() === 'PESSOAS' || name.toUpperCase() === 'TOTAL') return;
      const baseVal = Number(cols[1]) || 0;
      const cells = cols.slice(2, 14);
      const instItems = Array.from({ length: 10 }, (_, idx) => {
        const rawCell = (cells[idx] || '').trim();
        const numCell = Number(rawCell);
        if (rawCell && isNaN(numCell)) {
          return { amount: 0, status: 'warning', note: rawCell };
        }
        return {
          amount: !isNaN(numCell) && numCell > 0 ? numCell : baseVal,
          status: baseVal > 0 ? 'open' : 'empty',
        };
      });

      importedSales.push({
        id: `sale-csv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customerName: name,
        customerPhone: '',
        productId: null,
        productName: `Planilha - ${name}`,
        quantity: 1,
        unitCost: Math.round(baseVal * 6),
        totalCost: Math.round(baseVal * 6),
        totalAmount: baseVal * 10,
        totalPrice: baseVal * 10,
        downPayment: 0,
        paymentMethod: 'Planilha All System',
        installmentsCount: 10,
        installmentValue: baseVal,
        baseValue: baseVal,
        saleDate: new Date().toISOString().slice(0, 10),
        firstDueDate: new Date().toISOString().slice(0, 10),
        notes: 'Importado via CSV',
        installments: buildCustomInstallments(instItems),
      });
    });

    if (importedSales.length > 0) {
      setSales((prev) => [...prev, ...importedSales]);
    }
  };

  const handleMarkAllPaid = (saleId) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setSales((prev) =>
      prev.map((sale) => {
        if (sale.id !== saleId) return sale;
        return {
          ...sale,
          installments: sale.installments.map((inst) =>
            inst.status === 'open'
              ? { ...inst, status: 'paid', paidAt: inst.paidAt || todayStr }
              : inst
          ),
        };
      })
    );
  };

  const handleCreateSale = (newSaleData) => {
    const rawInst = Array.isArray(newSaleData.installments) ? newSaleData.installments : [];
    const todayIso = new Date().toISOString().slice(0, 10);
    const normalizedInstallments = rawInst.map((found, idx) => {
      const number = Number(found.number) || idx + 1;
      const status = found.status || 'open';
      return {
        ...found,
        id: found.id || `inst-${Date.now()}-${number}`,
        number,
        amount: Number(found.amount) || 0,
        dueDate: found.dueDate || todayIso,
        status,
        paidAt: status === 'paid' ? found.paidAt || todayIso : null,
      };
    });

    const baseValue =
      Number(newSaleData.installmentValue ?? newSaleData.baseValue ?? rawInst[0]?.amount) || 0;
    const totalPrice =
      Number(newSaleData.totalAmount ?? newSaleData.totalPrice) ||
      normalizedInstallments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

    const newSale = {
      id: `sale-${Date.now()}`,
      ...newSaleData,
      installmentValue: baseValue,
      baseValue,
      totalAmount: totalPrice,
      totalPrice,
      installmentsCount: normalizedInstallments.length || Number(newSaleData.installmentsCount) || 1,
      installments: normalizedInstallments,
    };
    setSales((prev) => [newSale, ...prev]);

    if (newSaleData.productId) {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== newSaleData.productId) return p;
          const qty = Number(newSaleData.quantity) || 1;
          return {
            ...p,
            stock: Math.max(0, Number(p.stock) - qty),
            totalSold: Number(p.totalSold || 0) + qty,
          };
        })
      );
    }
  };

  const handleDeleteSale = (saleId) => {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
  };

  const handleQuickAddRow = (
    customerName,
    installmentValue,
    installmentsCount = 10,
    firstDueDate
  ) => {
    const val = Number(String(installmentValue).replace(',', '.')) || 0;
    const count = Math.min(12, Math.max(1, Number(installmentsCount) || 1));
    const totalPrice = val * count;
    const todayIso = new Date().toISOString().slice(0, 10);
    const dueStart = firstDueDate || todayIso;

    // Cria array de parcelas para buildCustomInstallments (1º P até countº P)
    const items = Array.from({ length: count }, () => ({
      amount: val,
      status: 'open',
      note: '',
    }));

    const newSale = {
      id: `sale-${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: '',
      productId: null,
      productName: customerName.trim(),
      category: 'Planilha / Avulso',
      quantity: 1,
      saleDate: todayIso,
      firstDueDate: dueStart,
      unitCost: Math.round(totalPrice * 0.65),
      totalCost: Math.round(totalPrice * 0.65),
      totalAmount: totalPrice,
      totalPrice,
      downPayment: 0,
      installmentValue: val,
      baseValue: val,
      paymentMethod: 'Planilha All System',
      installmentsCount: count,
      notes: 'Adicionado direto na linha da planilha',
      installments: buildCustomInstallments(items, dueStart),
    };
    setSales((prev) => [newSale, ...prev]);
  };

  const handleAddProduct = (prodData) => {
    setProducts((prev) => [{ id: `prod-${Date.now()}`, ...prodData }, ...prev]);
  };

  const handleUpdateProduct = (updatedProd) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
  };

  const handleDeleteProduct = (prodId) => {
    setProducts((prev) => prev.filter((p) => p.id !== prodId));
  };

  const handleIncrementSearchCount = (prodId) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === prodId ? { ...p, searchCount: Number(p.searchCount || 0) + 1 } : p
      )
    );
  };

  const handleRegisterPurchase = (prodId, qty, newUnitCost) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === prodId
          ? {
              ...p,
              stock: Number(p.stock || 0) + Number(qty),
              totalPurchased: Number(p.totalPurchased || 0) + Number(qty),
              costPrice: Number(newUnitCost) || p.costPrice,
            }
          : p
      )
    );
  };

  const handleAddWarranty = (warData) => {
    setWarranties((prev) => [{ id: `war-${Date.now()}`, ...warData }, ...prev]);
  };

  const handleToggleWarrantyStatus = (warId) => {
    setWarranties((prev) =>
      prev.map((w) =>
        w.id === warId
          ? { ...w, status: w.status === 'Resolvido' ? 'Em andamento' : 'Resolvido' }
          : w
      )
    );
  };

  const handleDeleteWarranty = (warId) => {
    setWarranties((prev) => prev.filter((w) => w.id !== warId));
  };

  const handleAddTask = (taskData) => {
    setTasks((prev) => [{ id: `task-${Date.now()}`, ...taskData }, ...prev]);
  };

  const handleToggleTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleResetDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setWarranties(INITIAL_WARRANTIES);
    setTasks(INITIAL_TASKS);
  };

  const handleExportBackup = () => {
    const data = {
      company: 'All System - Alexandre Beroni',
      exportedAt: new Date().toISOString(),
      products,
      sales,
      warranties,
      tasks,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-system-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAdminLogin = (remember) => {
    if (remember) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
    } else {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
    }
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    setIsAdminAuthenticated(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'installments', label: 'Planilha (1º ao 12º P)', icon: Grid },
    { id: 'products', label: 'Produtos + Gemini IA', icon: Package },
    { id: 'warranties', label: 'Garantias & Perdas', icon: ShieldAlert },
    { id: 'tasks', label: 'Tarefas Alexandre', icon: CheckSquare },
  ];

  // Proteção de Administrador para publicação segura na Vercel (Senha: ale123@)
  if (!isAdminAuthenticated) {
    return (
      <AdminLoginScreen
        onLoginSuccess={handleAdminLogin}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-md">
            AS
          </div>
          <div>
            <h2 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-none">
              All System
            </h2>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Alexandre Beroni • Admin
            </span>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <button
            type="button"
            onClick={() => setIsGeminiLiveOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-extrabold text-xs shadow-md transition active:scale-95"
          >
            <Mic className="w-4 h-4 animate-pulse" />
            Modo Live Voz (Gemini IA)
          </button>

          <button
            type="button"
            onClick={() => setIsNewSaleOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Lançar Nova Venda
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
                  active
                    ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setIsFirebaseModalOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition"
          >
            <span className="inline-flex items-center gap-2 truncate">
              <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">Firebase: {firebaseStatus.projectId}</span>
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                syncState === 'synced' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <span className="inline-flex items-center gap-2">
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  Modo Claro (Light)
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  Modo Escuro (Dark)
                </>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition"
            title="Sair e pedir senha novamente"
          >
            <LogOut className="w-3.5 h-3.5" />
            Bloquear / Sair (Admin)
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-20 lg:pb-8">
        <header className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-sm">
              AS
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                All System • Gestão Alexandre Beroni
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Acesso Administrador Protegido • Firebase ({firebaseStatus.projectId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Modo Live Gemini no topo */}
            <button
              type="button"
              onClick={() => setIsGeminiLiveOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white text-xs font-extrabold shadow-sm transition active:scale-95"
              title="Abrir Modo Live por Voz do Gemini"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Modo Live</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFirebaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 transition"
              title="Status do Firebase"
            >
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">Firebase OK</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Alternar tema Dark / Light"
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white text-xs font-bold transition"
              title="Bloquear tela / Sair do Administrador"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bloquear</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              products={products}
              sales={sales}
              warranties={warranties}
              onToggleInstallment={handleToggleInstallment}
              onUpdateInstallmentCell={handleUpdateInstallmentCell}
              onUpdateSaleBaseValue={handleUpdateSaleBaseValue}
              onMarkAllPaid={handleMarkAllPaid}
              onDeleteSale={handleDeleteSale}
              onQuickAddRow={handleQuickAddRow}
              onIncrementSearchCount={handleIncrementSearchCount}
              colorScheme={colorScheme}
              onToggleColorScheme={() =>
                setColorScheme((prev) => (prev === 'alexandre' ? 'padrao' : 'alexandre'))
              }
              onNavigate={setActiveTab}
              onOpenNewSale={() => setIsNewSaleOpen(true)}
            />
          )}

          {activeTab === 'installments' && (
            <SalesAndInstallmentsView
              sales={sales}
              onToggleInstallment={handleToggleInstallment}
              onUpdateInstallmentCell={handleUpdateInstallmentCell}
              onUpdateSaleBaseValue={handleUpdateSaleBaseValue}
              onImportCsvRows={handleImportCsvRows}
              onMarkAllPaid={handleMarkAllPaid}
              onDeleteSale={handleDeleteSale}
              onQuickAddRow={handleQuickAddRow}
              colorScheme={colorScheme}
              onToggleColorScheme={() =>
                setColorScheme((prev) => (prev === 'alexandre' ? 'padrao' : 'alexandre'))
              }
              onOpenNewSale={() => setIsNewSaleOpen(true)}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onIncrementSearchCount={handleIncrementSearchCount}
              onRegisterPurchase={handleRegisterPurchase}
            />
          )}

          {activeTab === 'warranties' && (
            <WarrantyAndLossesView
              warranties={warranties}
              products={products}
              onAddWarranty={handleAddWarranty}
              onToggleWarrantyStatus={handleToggleWarrantyStatus}
              onDeleteWarranty={handleDeleteWarranty}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </main>
      </div>

      {/* Botão Flutuante (FAB) do Modo Live Gemini por Voz */}
      <button
        type="button"
        onClick={() => setIsGeminiLiveOpen(true)}
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 inline-flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-extrabold text-xs sm:text-sm shadow-2xl shadow-indigo-500/40 ring-2 ring-white/25 transition active:scale-95"
      >
        <Mic className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
        <span>Falar com Gemini Live</span>
      </button>

      {/* Barra de Navegação Inferior para Celular */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 py-1.5 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-[4.2rem]">
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Modais */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        products={products}
        onCreateSale={handleCreateSale}
      />

      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        firebaseStatus={firebaseStatus}
        syncState={syncState}
        syncError={syncError}
        onFirebaseUpdated={() => setFirebaseStatus(initFirebaseApp())}
        onForcePushToCloud={handleForcePushToCloud}
        onResetDemoData={handleResetDemoData}
        onExportBackup={handleExportBackup}
      />

      <GeminiLiveAssistant
        isOpen={isGeminiLiveOpen}
        onClose={() => setIsGeminiLiveOpen(false)}
        products={products}
        sales={sales}
        warranties={warranties}
        onAddProduct={handleAddProduct}
        onRegisterPurchase={handleRegisterPurchase}
        onCreateSale={handleCreateSale}
        onToggleInstallment={handleToggleInstallment}
      />
    </div>
  );
}
