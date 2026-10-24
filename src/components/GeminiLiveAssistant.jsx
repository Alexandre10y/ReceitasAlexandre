import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  X,
  Volume2,
  VolumeX,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Megaphone,
  Clock,
  Users,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import {
  fetchProductSpecsWithGemini,
  generateMarketingPost,
  DEFAULT_GEMINI_CONFIG,
} from '../services/geminiService';
import { formatCurrency, addMonthsToDate } from '../utils/formatters';

export default function GeminiLiveAssistant({
  isOpen,
  onClose,
  products,
  sales,
  warranties,
  onAddProduct,
  onRegisterPurchase,
  onCreateSale,
  onToggleInstallment,
}) {
  const [activeMode, setActiveMode] = useState('live'); // 'live' | 'post' | 'broadcast'
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Configuração de Paciência do Microfone (em segundos de silêncio antes de enviar automaticamente, ou 0 = Manual)
  const [patienceSeconds, setPatienceSeconds] = useState(6);
  const [silenceCountdown, setSilenceCountdown] = useState(null);

  const [inputText, setInputText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Estado de Divulgação & Posts
  const [selectedPostProductId, setSelectedPostProductId] = useState(products[0]?.id || '');
  const [generatedPost, setGeneratedPost] = useState('');
  const [copiedPost, setCopiedPost] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Olá Alexandre! Ativei o **Modo Paciente Contínuo**.\n\nAgora você pode clicar em **"🎙️ Iniciar Escuta Paciente"**, falar com calma, fazer pausas para olhar o aparelho ou pensar, e continuar falando para complementar!\n\nEu só cadastro na tabela quando você terminar de complementar (após 6 segundos de silêncio) ou quando você clicar em **"Confirmar e Cadastrar"**.\n\n💡 **Zero gasto extra de API:** A escuta contínua roda direto no navegador e não consome créditos enquanto você faz pausas!',
    },
  ]);

  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText, inputText]);

  useEffect(() => {
    const prod = products.find((p) => p.id === selectedPostProductId) || products[0];
    if (prod) {
      setGeneratedPost(generateMarketingPost(prod));
    }
  }, [selectedPostProductId, products]);

  // Limpa timers ao desmontar ou fechar
  useEffect(() => {
    if (!isOpen) {
      stopListeningCompletely();
    }
    return () => stopListeningCompletely();
  }, [isOpen]);

  const clearSilenceTimers = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setSilenceCountdown(null);
  };

  const resetSilenceTimer = () => {
    clearSilenceTimers();
    if (patienceSeconds <= 0) return; // Modo 100% Manual (só envia quando clicar no botão)

    let remaining = patienceSeconds;
    setSilenceCountdown(remaining);

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setSilenceCountdown(remaining);
      } else {
        clearInterval(countdownIntervalRef.current);
        setSilenceCountdown(null);
      }
    }, 1000);

    silenceTimerRef.current = setTimeout(() => {
      const fullText = accumulatedTranscriptRef.current.trim();
      if (fullText) {
        stopListeningCompletely();
        handleExecuteCommand(fullText);
      }
    }, patienceSeconds * 1000);
  };

  const stopListeningCompletely = () => {
    shouldKeepListeningRef.current = false;
    clearSilenceTimers();
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignora
    }
    setIsListening(false);
    setInterimText('');
  };

  // Síntese de voz em Português
  const speakText = (text) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#•_]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignora
    }
  };

  // Inicia ou para o reconhecimento de voz CONTÍNUO e PACIENTE
  const toggleListening = () => {
    if (isListening) {
      stopListeningCompletely();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          text: 'Use o Google Chrome ou Edge para usar o microfone contínuo, ou digite abaixo!',
        },
      ]);
      return;
    }

    accumulatedTranscriptRef.current = inputText ? `${inputText} ` : '';
    shouldKeepListeningRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true; // NÃO corta nas pausas!
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let currentInterim = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += piece + ' ';
        } else {
          currentInterim += piece;
        }
      }

      if (newFinal) {
        accumulatedTranscriptRef.current =
          (accumulatedTranscriptRef.current + newFinal).replace(/\s+/g, ' ');
        setInputText(accumulatedTranscriptRef.current.trim());
      }

      setInterimText(currentInterim);

      // Reinicia o relógio de paciência toda vez que o Alexandre fala mais uma palavra!
      resetSilenceTimer();
    };

    recognition.onerror = () => {
      // Se o navegador pausar por silêncio longo, religa se ainda estiver no modo escuta
    };

    recognition.onend = () => {
      // Se o navegador tentar encerrar sozinho durante uma pausa longa do Alexandre, religa automaticamente!
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Interpretador Inteligente com Resumo Detalhado e Controle Inteligente de Estoque
  const handleExecuteCommand = async (rawCommand) => {
    const cmd = (rawCommand || inputText || '').trim();
    if (!cmd) return;

    stopListeningCompletely();
    accumulatedTranscriptRef.current = '';
    setInputText('');
    setInterimText('');

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: cmd },
    ]);
    setIsProcessing(true);

    const lower = cmd.toLowerCase();
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextMonthStr = addMonthsToDate(todayStr, 1);

    try {
      // 1. Intenção: CRIAR POST / DIVULGAÇÃO
      if (
        lower.includes('post') ||
        lower.includes('anúncio') ||
        lower.includes('anuncio') ||
        lower.includes('divulgar') ||
        lower.includes('divulgação')
      ) {
        const matchedProd =
          products.find((p) =>
            lower
              .split(' ')
              .some((w) => w.length > 3 && p.name.toLowerCase().includes(w))
          ) || products[0];

        if (matchedProd) {
          const postText = generateMarketingPost(matchedProd);
          setSelectedPostProductId(matchedProd.id);
          setGeneratedPost(postText);
          setActiveMode('broadcast');
          const reply = `Preparei a divulgação completa do **${matchedProd.name}**! Abri a aba de Divulgação & Demanda para você disparar para seus clientes no WhatsApp.`;
          setMessages((prev) => [
            ...prev,
            {
              id: `ast-${Date.now()}`,
              role: 'assistant',
              text: `${reply}\n\n${postText}`,
              actionBadge: 'Campanha de Divulgação Pronta',
            },
          ]);
          speakText(reply);
          setIsProcessing(false);
          return;
        }
      }

      // 2. Intenção: DAR BAIXA / PAGOU PARCELA
      if (
        lower.includes('baixa') ||
        lower.includes('pagou') ||
        lower.includes('quitar parcela') ||
        lower.includes('marcar pago')
      ) {
        const targetSale = sales.find((s) =>
          lower.includes(s.customerName.toLowerCase().split(' ')[0].toLowerCase())
        );

        if (targetSale) {
          const nextOpen = (targetSale.installments || []).find((i) => i.status === 'open');
          if (nextOpen) {
            onToggleInstallment(targetSale.id, nextOpen.number);
            const remainingOpen = (targetSale.installments || []).filter(
              (i) => i.status === 'open' && i.number !== nextOpen.number
            );
            const remainingSum = remainingOpen.reduce((a, b) => a + Number(b.amount || 0), 0);

            const reply = `Resumo da Baixa na Tabela:\n• Cliente: ${targetSale.customerName}\n• Parcela quitada: ${nextOpen.number}º P (${formatCurrency(
              nextOpen.amount
            )}) — pintada de vermelhinho!\n• Restam para frente: ${
              remainingOpen.length
            } parcelas (${formatCurrency(remainingSum)} em aberto).`;

            setMessages((prev) => [
              ...prev,
              {
                id: `ast-${Date.now()}`,
                role: 'assistant',
                text: reply,
                actionBadge: `Parcela ${nextOpen.number}º P Baixada`,
              },
            ]);
            speakText(
              `Baixa realizada na parcela ${nextOpen.number} de ${targetSale.customerName}. Ainda faltam ${remainingOpen.length} parcelas.`
            );
            setIsProcessing(false);
            return;
          }
        }
      }

      // 3. Intenção: VENDA PARCELADA NA HORA (Consome 1 un do estoque existente sem duplicar!)
      const isSaleCommand =
        lower.includes('vendi') ||
        lower.includes('nova venda') ||
        lower.includes('cadastrar venda') ||
        lower.includes('parcelas de') ||
        lower.includes('vezes de');

      if (isSaleCommand) {
        const instMatch = lower.match(
          /(\d+)\s*(?:parcelas?|x|vezes)\s*(?:de\s*)?(?:r\$\s*)?(\d+)/i
        );
        const count = instMatch ? Number(instMatch[1]) : 10;
        const instVal = instMatch ? Number(instMatch[2]) : 330;

        let customer = 'Novo Cliente';
        const custMatch = cmd.match(
          /(?:para\s+o\s+|para\s+a\s+|para\s+|cliente\s+)([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)?)/i
        );
        if (custMatch && custMatch[1]) {
          customer = custMatch[1]
            .replace(/\s+(em|no|na|um|uma|de|por|\d+).*$/i, '')
            .trim();
        }

        const matchedProduct =
          products.find((p) =>
            lower
              .split(' ')
              .some((w) => w.length > 3 && p.name.toLowerCase().includes(w))
          ) || products[0];

        const installments = Array.from({ length: count }, (_, idx) => ({
          id: `inst-live-${Date.now()}-${idx + 1}`,
          number: idx + 1,
          amount: instVal,
          dueDate: addMonthsToDate(nextMonthStr, idx),
          status: 'open',
          paidAt: null,
        }));

        const totalAmount = count * instVal;
        const unitCost = matchedProduct?.costPrice || Math.round(totalAmount * 0.65);
        const profit = totalAmount - unitCost;

        onCreateSale({
          customerName: customer,
          customerPhone: '',
          productId: matchedProduct?.id || 'prod-1',
          productName: matchedProduct?.name || 'Produto All System',
          quantity: 1,
          unitCost,
          totalCost: unitCost,
          totalAmount,
          downPayment: 0,
          paymentMethod: 'Modo Live Voz (All System)',
          installmentsCount: count,
          installmentValue: instVal,
          saleDate: todayStr,
          firstDueDate: nextMonthStr,
          notes: `Lançado via Modo Live: "${cmd}"`,
          installments,
        });

        const reply = `Resumo Executivo da Venda Cadastrada na Planilha:\n• Cliente: ${customer}\n• Produto vinculado: ${
          matchedProduct?.name || 'Equipamento'
        } (1 un descontada do estoque existente)\n• Parcelamento: ${count}x de ${formatCurrency(
          instVal
        )} = ${formatCurrency(totalAmount)}\n• Lucro Previsto nesta venda: ${formatCurrency(
          profit
        )}`;

        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            text: reply,
            actionBadge: 'Venda Lançada na Tabela + Estoque Atualizado',
          },
        ]);
        speakText(
          `Venda para ${customer} em ${count} parcelas de ${instVal} reais lançada na planilha e descontada do estoque!`
        );
        setIsProcessing(false);
        return;
      }

      // 4. Intenção Padrão: CADASTRAR OU SOMAR PRODUTO NO ESTOQUE (Evita duplicar se já existir!)
      const specs = await fetchProductSpecsWithGemini(cmd);

      // Verifica se já existe um produto muito parecido no estoque para somar unidades em vez de bagunçar o estoque!
      const existingProduct = products.find(
        (p) => p.name.toLowerCase() === specs.name.toLowerCase()
      );

      const qtyMatch = lower.match(/(\d+)\s*unidades?/i);
      const qtyToAdd = qtyMatch ? Number(qtyMatch[1]) : 1;

      if (existingProduct && onRegisterPurchase) {
        onRegisterPurchase(existingProduct.id, qtyToAdd, specs.costPrice);
        const reply = `Resumo Inteligente de Estoque (Sem Duplicação):\n• Identifiquei que você já tem o **${
          existingProduct.name
        }** cadastrado!\n• Adicionei **+${qtyToAdd} un** ao estoque existente (Novo saldo: ${
          Number(existingProduct.stock || 0) + qtyToAdd
        } un).\n• Ficha Técnica: ${specs.processor} | ${specs.ram} | ${
          specs.storage
        }\n• Preço sugerido: ${formatCurrency(
          existingProduct.salePrice
        )} (10x de ${formatCurrency(existingProduct.salePrice / 10)}).`;

        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            text: reply,
            actionBadge: `Estoque Somado (+${qtyToAdd} un)`,
          },
        ]);
        speakText(
          `Produto já existia no catálogo! Somei mais ${qtyToAdd} unidade no estoque do ${existingProduct.name}.`
        );
      } else {
        onAddProduct({
          ...specs,
          stock: qtyToAdd,
          totalPurchased: qtyToAdd,
          totalSold: 0,
          searchCount: 1,
          supplier: 'Cadastro por Voz Gemini Live',
        });

        // Se o Alexandre falou "tabela", "planilha", "linha" ou "teste", já coloca direto na tabela de parcelas também!
        const wantsInTableToo =
          lower.includes('tabela') ||
          lower.includes('planilha') ||
          lower.includes('linha') ||
          lower.includes('teste');

        if (wantsInTableToo && onCreateSale) {
          const instVal = Math.round(Number(specs.salePrice || 100));
          onCreateSale({
            customerName: cmd.replace(/cadastrar|teste|na tabela|na planilha/gi, '').trim() || specs.name,
            customerPhone: '',
            productId: null,
            productName: specs.name,
            quantity: 1,
            unitCost: Number(specs.costPrice || 50),
            totalCost: Number(specs.costPrice || 50),
            totalPrice: instVal,
            baseValue: instVal,
            installmentsCount: 1,
            saleDate: todayStr,
            notes: `Adicionado via Gemini Live: "${cmd}"`,
            installments: [
              {
                id: `inst-live-${Date.now()}-1`,
                number: 1,
                amount: instVal,
                dueDate: nextMonthStr,
                status: 'open',
                paidAt: null,
              },
            ],
          });
        }

        const marginVal = Number(specs.salePrice) - Number(specs.costPrice);
        const reply = `Resumo Completo do Item Cadastrado:\n• Modelo: ${
          specs.name
        }\n• Processador / Chip: ${specs.processor}\n• Memória RAM: ${
          specs.ram
        }\n• Armazenamento: ${specs.storage}\n• Custo Estimado: ${formatCurrency(
          specs.costPrice
        )} | Venda: ${formatCurrency(
          specs.salePrice
        )}\n• Margem de Lucro: ${formatCurrency(marginVal)}${
          wantsInTableToo
            ? '\n• ✅ Também incluído automaticamente como linha na Planilha (1º ao 12º P)!'
            : ''
        }`;

        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            text: reply,
            actionBadge: wantsInTableToo
              ? 'Cadastrado no Estoque + Linha na Planilha'
              : 'Novo Produto Cadastrado + Protótipo Completo',
            quickTableSpec: !wantsInTableToo ? specs : null,
          },
        ]);
        speakText(
          wantsInTableToo
            ? `Cadastrei o ${specs.name} no estoque e já incluí uma linha na planilha!`
            : `Cadastrei o ${specs.name} no seu estoque!`
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const selectedProductObj =
    products.find((p) => p.id === selectedPostProductId) || products[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/65 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 sm:rounded-3xl rounded-t-3xl max-w-2xl w-full h-[92vh] sm:h-[690px] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base leading-none">
                  Gemini Live Paciente • Voz, Estoque & Divulgação
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-400/25 text-emerald-100 border border-emerald-300/30">
                  ZERO CUSTO PAUSA
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 mt-0.5">
                Fale com calma e complemente à vontade • Sem duplicar seu estoque
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition"
              title={voiceEnabled ? 'Voz do Gemini Ativada' : 'Voz do Gemini Silenciada'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas: 1. Escuta Paciente Live | 2. Demanda & Divulgação para Clientes */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveMode('live')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 shrink-0 transition ${
              activeMode === 'live'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Modo Live (Com Tempo para Complementar)
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('broadcast')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 shrink-0 transition ${
              activeMode === 'broadcast'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            Divulgar Item p/ Clientes & Demanda
          </button>
        </div>

        {activeMode === 'live' ? (
          <>
            {/* Barra de Controle de Paciência do Microfone */}
            <div className="px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tempo de espera nas suas pausas:</span>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { sec: 4, label: '4s' },
                  { sec: 6, label: '6s (Ideal)' },
                  { sec: 10, label: '10s (Bastante Calma)' },
                  { sec: 0, label: 'Manual (Só envia ao clicar)' },
                ].map((opt) => (
                  <button
                    key={opt.sec}
                    type="button"
                    onClick={() => setPatienceSeconds(opt.sec)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      patienceSeconds === opt.sec
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Histórico de Conversa */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 text-xs sm:text-sm whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/70 dark:border-slate-700'
                    }`}
                  >
                    {msg.actionBadge && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        {msg.actionBadge}
                      </span>
                    )}
                    <p>{msg.text}</p>
                    {msg.quickTableSpec && onCreateSale && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            const spec = msg.quickTableSpec;
                            const instVal = Math.round(Number(spec.salePrice || 100));
                            const todayIso = new Date().toISOString().slice(0, 10);
                            onCreateSale({
                              customerName: spec.name,
                              customerPhone: '',
                              productId: null,
                              productName: spec.name,
                              quantity: 1,
                              unitCost: Number(spec.costPrice || 50),
                              totalCost: Number(spec.costPrice || 50),
                              totalPrice: instVal,
                              baseValue: instVal,
                              installmentsCount: 1,
                              saleDate: todayIso,
                              notes: 'Adicionado na Planilha via 1-clique no Gemini Live',
                              installments: [
                                {
                                  id: `inst-live-${Date.now()}-1`,
                                  number: 1,
                                  amount: instVal,
                                  dueDate: todayIso,
                                  status: 'open',
                                  paidAt: null,
                                },
                              ],
                            });
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === msg.id
                                  ? {
                                      ...m,
                                      quickTableSpec: null,
                                      actionBadge: 'Incluído no Estoque + Linha na Planilha!',
                                    }
                                  : m
                              )
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-sm transition"
                        >
                          + Colocar este item na Linha da Planilha (1º ao 12º P)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Indicador de Escuta Paciente em Tempo Real */}
              {isListening && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      Microfone Paciente Ativo — Pode falar e fazer pausas!
                    </span>
                    {silenceCountdown !== null && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px]">
                        Cadastrando em {silenceCountdown}s se parar...
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 italic">
                    "{inputText} {interimText}"
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
                  ✨ Gemini está resumindo e lançando na sua tabela...
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Área de Complemento de Fala / Texto antes de cadastrar */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-4 py-3 rounded-2xl font-bold text-white shadow-md transition flex items-center justify-center gap-2 shrink-0 ${
                    isListening
                      ? 'bg-rose-600 hover:bg-rose-500 ring-4 ring-rose-500/25'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500'
                  }`}
                >
                  {isListening ? (
                    <>
                      <PauseCircle className="w-5 h-5" />
                      <span className="text-xs font-extrabold">Pausar Microfone</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      <span className="text-xs font-extrabold">
                        {inputText ? 'Continuar Falando' : 'Iniciar Escuta'}
                      </span>
                    </>
                  )}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    accumulatedTranscriptRef.current = e.target.value + ' ';
                    if (isListening) resetSilenceTimer();
                  }}
                  placeholder="O que você falar vai acumulando aqui... Você pode complementar!"
                  className="flex-1 px-3.5 py-3 text-xs sm:text-sm rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {inputText && (
                  <button
                    type="button"
                    onClick={() => {
                      accumulatedTranscriptRef.current = '';
                      setInputText('');
                      clearSilenceTimers();
                    }}
                    className="p-3 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Limpar texto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  disabled={!inputText.trim() && !interimText.trim()}
                  onClick={() =>
                    handleExecuteCommand(`${inputText} ${interimText}`.trim())
                  }
                  className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-md transition shrink-0 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ABA 2: DEMANDA & DIVULGAÇÃO PARA DEMAIS CLIENTES */
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60">
              <h4 className="font-extrabold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Central de Demanda & Divulgação para Clientes da Carteira
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Escolha um produto do seu estoque abaixo para gerar o anúncio e disparar a novidade diretamente para os seus clientes da planilha ou grupos de WhatsApp!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  1. Selecionar Item para Divulgar:
                </label>
                <select
                  value={selectedPostProductId}
                  onChange={(e) => setSelectedPostProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Estoque: {p.stock} | Buscas: {p.searchCount}x)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductObj && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Demanda Registrada
                    </span>
                    <strong className="text-sm text-rose-600 dark:text-rose-400">
                      🔥 {selectedProductObj.searchCount} clientes buscaram
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Estoque Atual
                    </span>
                    <strong className="text-sm text-emerald-600 dark:text-emerald-400">
                      {selectedProductObj.stock} un disponíveis
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                2. Mensagem / Post Comercial Gerado pelo Gemini:
              </label>
              <textarea
                rows={7}
                value={generatedPost}
                onChange={(e) => setGeneratedPost(e.target.value)}
                className="w-full p-3 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPost);
                    setCopiedPost(true);
                    setTimeout(() => setCopiedPost(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                >
                  {copiedPost ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPost ? 'Copiado!' : 'Copiar Anúncio'}
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(generatedPost)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartilhar Geral no WhatsApp
                </a>
              </div>
            </div>

            {/* Lista de Clientes da Carteira para Divulgação Individual */}
            <div>
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                3. Disparar Oferta Direto para Clientes da sua Carteira ({sales.length} clientes):
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {sales.map((client) => {
                  const customOfferMsg = `Olá *${client.customerName}*, tudo bem? Aqui é o Alexandre da *All System*! Lembrei de você porque acabou de entrar no estoque: *${
                    selectedProductObj?.name || 'Notebook Revisado'
                  }* (${selectedProductObj?.processor || ''}, ${
                    selectedProductObj?.ram || ''
                  }, ${
                    selectedProductObj?.storage || ''
                  }) em condição especial parcelado em até 10x de ${formatCurrency(
                    (selectedProductObj?.salePrice || 3300) / 10
                  )}! Se tiver interesse para você ou algum conhecido, me avisa!`;

                  return (
                    <a
                      key={client.id}
                      href={`https://wa.me/?text=${encodeURIComponent(customOfferMsg)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-700 transition"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                        {client.customerName}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                        <MessageCircle className="w-3 h-3" />
                        Ofertar
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
