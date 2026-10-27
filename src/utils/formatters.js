export const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export const formatPercent = (value) => {
  const num = Number(value) || 0;
  return `${num.toFixed(1).replace('.', ',')}%`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR');
};

export const getMonthYearLabel = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
};

export const getYearMonthKey = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.slice(0, 7); // YYYY-MM
};

export const localTodayISO = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const isOverdue = (dueDateStr, status) => {
  // Pagas, vazias e alertas manuais ("NÃO PAGOU") não entram no atraso por data
  if (status === 'paid' || status === 'empty' || status === 'warning') return false;
  if (!dueDateStr) return false;
  return dueDateStr < localTodayISO();
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const addMonthsToDate = (dateStr, monthsToAdd) => {
  const parts = dateStr.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1 + monthsToAdd, parts[2] || 10);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const buildWhatsAppUrl = (phone, customerName, productTitle, installmentNumber, totalInstallments, amount, dueDate) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const formattedAmount = formatCurrency(amount);
  const formattedDate = formatDate(dueDate);
  const message = `Olá ${customerName}, tudo bem? Aqui é o Alexandre da *All System*! Passando para lembrar da parcela ${installmentNumber}/${totalInstallments} referente a *${productTitle}*, no valor de *${formattedAmount}* (vencimento ${formattedDate}). Qualquer dúvida estou à disposição!`;
  if (!cleanPhone) return '';
  const targetPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
};

export const buildSaleWhatsAppUrl = (sale, installment) => {
  const count =
    Number(sale?.installmentsCount) ||
    (Array.isArray(sale?.installments) ? sale.installments.length : 0) ||
    1;
  const amount = Number(installment?.amount || 0);
  const productTitle = sale?.productName || 'seu acordo';
  if (installment) {
    return buildWhatsAppUrl(
      sale?.customerPhone,
      sale?.customerName || 'cliente',
      productTitle,
      installment.number || 1,
      count,
      amount,
      installment.dueDate
    );
  }
  const cleanPhone = String(sale?.customerPhone || '').replace(/\D/g, '');
  if (!cleanPhone) return '';
  const targetPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const message = `Olá ${sale?.customerName || ''}, tudo bem? Aqui é o Alexandre da *All System*. Podemos falar sobre o seu acordo de *${productTitle}*?`;
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
};

export const printSaleStatement = (sale) => {
  if (!sale || typeof window === 'undefined') return false;
  const rows = (sale.installments || [])
    .map((inst) => {
      const status =
        inst.status === 'paid'
          ? 'Pago'
          : inst.status === 'warning'
            ? 'Alerta'
            : isOverdue(inst.dueDate, inst.status)
              ? 'Atrasado'
              : inst.status === 'open'
                ? 'Em aberto'
                : 'Vazio';
      return `<tr>
        <td>${inst.number}º P</td>
        <td>${escapeHtml(formatDate(inst.dueDate))}</td>
        <td>${escapeHtml(formatCurrency(inst.amount))}</td>
        <td>${status}</td>
        <td>${inst.paidAt ? escapeHtml(formatDate(inst.paidAt)) : '—'}</td>
        <td>${escapeHtml(inst.note || '')}</td>
      </tr>`;
    })
    .join('');
  const openSum = (sale.installments || [])
    .filter((inst) => inst.status === 'open')
    .reduce((acc, inst) => acc + (Number(inst.amount) || 0), 0);
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Extrato — ${escapeHtml(sale.customerName)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    p { margin: 0 0 6px; color: #334155; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; }
    th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 8px 6px; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
    .total { margin-top: 16px; font-size: 16px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>All System — Extrato</h1>
  <p>Alexandre Beroni</p>
  <p><strong>${escapeHtml(sale.customerName)}</strong></p>
  <p>Produto: ${escapeHtml(sale.productName || 'Avulso')}</p>
  <p>Telefone: ${escapeHtml(sale.customerPhone || 'não informado')}</p>
  <p>Entrada: ${escapeHtml(formatCurrency(sale.downPayment || 0))} · Valor da parcela: ${escapeHtml(formatCurrency(sale.installmentValue || sale.baseValue || 0))}</p>
  ${sale.notes ? `<p>Observações: ${escapeHtml(sale.notes)}</p>` : ''}
  <table>
    <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Pago em</th><th>Obs.</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Saldo em aberto: <strong>${escapeHtml(formatCurrency(openSum))}</strong></p>
  <p>Emitido em ${escapeHtml(formatDate(localTodayISO()))}</p>
</body>
</html>`;
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=840,height=900');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
  return true;
};
