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

export const isOverdue = (dueDateStr, status) => {
  if (status === 'paid') return false;
  if (!dueDateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDateStr < today;
};

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
  const targetPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
};
