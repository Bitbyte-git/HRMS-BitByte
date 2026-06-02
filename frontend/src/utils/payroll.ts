const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigitsToWords = (value: number) => {
  if (value < 20) return ONES[value];
  return `${TENS[Math.floor(value / 10)]} ${ONES[value % 10]}`.trim();
};

const threeDigitsToWords = (value: number) => {
  const hundred = Math.floor(value / 100);
  const remainder = value % 100;
  return [
    hundred ? `${ONES[hundred]} Hundred` : '',
    remainder ? twoDigitsToWords(remainder) : '',
  ].filter(Boolean).join(' ');
};

const integerToIndianWords = (value: number) => {
  const amount = Math.floor(Math.abs(value));
  if (amount === 0) return 'Zero';

  const crore = Math.floor(amount / 10000000);
  const lakh = Math.floor((amount % 10000000) / 100000);
  const thousand = Math.floor((amount % 100000) / 1000);
  const hundred = amount % 1000;

  return [
    crore ? `${threeDigitsToWords(crore)} Crore` : '',
    lakh ? `${threeDigitsToWords(lakh)} Lakh` : '',
    thousand ? `${threeDigitsToWords(thousand)} Thousand` : '',
    hundred ? threeDigitsToWords(hundred) : '',
  ].filter(Boolean).join(' ');
};

export const amountInWords = (amount: number) => {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const rupees = Math.floor(Math.abs(safeAmount));
  const paise = Math.round((Math.abs(safeAmount) - rupees) * 100);
  return `${integerToIndianWords(rupees)} Rupees${paise ? ` and ${integerToIndianWords(paise)} Paise` : ''} Only`;
};

export const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
  }).format(Number(value || 0));

export const formatPayPeriod = (period?: string, mode: 'short' | 'long' = 'long') => {
  if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return period || '-';
  const [year, month] = period.split('-').map(Number);
  return `${mode === 'short' ? MONTHS[month - 1] : FULL_MONTHS[month - 1]} ${year}`;
};

export const currentPayPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const todayInputDate = () => new Date().toISOString().slice(0, 10);

export const safeNumberInput = (value: string) => {
  if (value === '') return '';
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return '0';
  return value;
};

const printableStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Inter, Arial, sans-serif; }
  .print-shell { padding: 28px; }
  .payslip-document { width: 794px; max-width: 100%; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
  .payslip-band { background: #0f766e; color: #fff; padding: 22px 28px; display: flex; justify-content: space-between; gap: 18px; align-items: center; }
  .payslip-logo { width: 54px; height: 54px; object-fit: contain; border-radius: 12px; background: #fff; padding: 6px; }
  .payslip-company { display: flex; align-items: center; gap: 14px; }
  .payslip-company h2 { margin: 0; font-size: 22px; }
  .payslip-company p, .payslip-period p { margin: 3px 0 0; font-size: 12px; opacity: .88; }
  .payslip-period { text-align: right; }
  .payslip-period strong { display: block; margin-top: 4px; font-size: 20px; }
  .payslip-section { padding: 22px 28px; border-bottom: 1px solid #e2e8f0; }
  .payslip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 32px; }
  .payslip-field span { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
  .payslip-field strong { font-size: 14px; color: #0f172a; }
  .payslip-tables { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .payslip-table + .payslip-table { border-left: 1px solid #e2e8f0; }
  .payslip-table h3 { margin: 0; padding: 12px 16px; background: #f8fafc; font-size: 13px; }
  .payslip-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 16px; border-top: 1px solid #f1f5f9; font-size: 13px; }
  .payslip-row.total { background: #f8fafc; font-weight: 700; }
  .payslip-net { margin-top: 18px; display: grid; grid-template-columns: 1.5fr .8fr; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .payslip-net div { padding: 16px; }
  .payslip-net strong { font-size: 22px; }
  .payslip-words { margin-top: 12px; padding: 12px 14px; border-radius: 10px; background: #f0fdfa; color: #115e59; font-weight: 700; font-size: 13px; }
  .payslip-footer { padding: 16px 28px; color: #64748b; font-size: 11px; display: flex; justify-content: space-between; gap: 16px; }
  @page { size: A4; margin: 12mm; }
  @media print {
    body { background: #fff; }
    .print-shell { padding: 0; }
    .payslip-document { border-radius: 0; border: 0; width: 100%; }
  }
`;

export const printElementAsPdf = (elementId: string, title: string) => {
  const node = document.getElementById(elementId);
  if (!node) return;

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>${printableStyles}</style>
      </head>
      <body>
        <div class="print-shell">${node.outerHTML}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
};
