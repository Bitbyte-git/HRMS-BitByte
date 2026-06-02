import type { SalaryComponent } from '../types';
import { amountInWords } from './payroll';

export const payrollComponentKeys = {
  basicPay: 'basicPay',
  hra: 'hra',
  da: 'da',
  otherAllowance: 'otherAllowance',
  pf: 'pf',
  esi: 'esi',
  professionalTax: 'professionalTax',
  incomeTax: 'incomeTax',
} as const;

export const payrollComponentLabels = {
  [payrollComponentKeys.basicPay]: 'Basic Pay',
  [payrollComponentKeys.hra]: 'HRA',
  [payrollComponentKeys.da]: 'DA',
  [payrollComponentKeys.otherAllowance]: 'Other Allowance',
  [payrollComponentKeys.pf]: 'PF',
  [payrollComponentKeys.esi]: 'ESI',
  [payrollComponentKeys.professionalTax]: 'Professional Tax',
  [payrollComponentKeys.incomeTax]: 'Income Tax',
} as const;

export const payrollRules = {
  engine: 'indian-payroll-v1',
  basicPayRate: 0.5,
  hraRateOfBasicPay: 0.4,
  daRateOfBasicPay: 0.2,
  pfRateOfBasicAndDa: 0.12,
  esiGrossThreshold: 21000,
  esiRateOfGross: 0.0075,
  professionalTaxThreshold: 15000,
  professionalTaxAmount: 200,
  incomeTaxSlabs: [
    { upto: 400000, rate: 0 },
    { upto: 800000, rate: 0.05 },
    { upto: 1200000, rate: 0.1 },
    { upto: 1600000, rate: 0.15 },
    { upto: 2000000, rate: 0.2 },
    { upto: 2400000, rate: 0.25 },
    { upto: Number.POSITIVE_INFINITY, rate: 0.3 },
  ],
};

interface CalculationInput {
  fixedSalary: number;
  additionalEarnings?: SalaryComponent[];
  additionalDeductions?: SalaryComponent[];
}

export interface PayrollCalculationResult {
  fixedSalary: number;
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
  grossEarnings: number;
  totalDeductions: number;
  netSalary: number;
  amountInWords: string;
  calculationMetadata: {
    engine: string;
    salaryBasis: string;
    generatedAt: string;
    additionalEarnings: number;
    additionalDeductions: number;
    rules: Record<string, number>;
  };
}

const labelAliases = new Map<string, string>([
  ['basic pay', payrollComponentKeys.basicPay],
  ['basic', payrollComponentKeys.basicPay],
  ['bp', payrollComponentKeys.basicPay],
  ['hra', payrollComponentKeys.hra],
  ['house rent allowance', payrollComponentKeys.hra],
  ['da', payrollComponentKeys.da],
  ['dearness allowance', payrollComponentKeys.da],
  ['other allowance', payrollComponentKeys.otherAllowance],
  ['other allowances', payrollComponentKeys.otherAllowance],
  ['conveyance allowance', payrollComponentKeys.otherAllowance],
  ['pf', payrollComponentKeys.pf],
  ['provident fund', payrollComponentKeys.pf],
  ['esi', payrollComponentKeys.esi],
  ['esic', payrollComponentKeys.esi],
  ['professional tax', payrollComponentKeys.professionalTax],
  ['pt', payrollComponentKeys.professionalTax],
  ['income tax', payrollComponentKeys.incomeTax],
  ['it', payrollComponentKeys.incomeTax],
]);

const standardEarningKeys = new Set<string>([
  payrollComponentKeys.basicPay,
  payrollComponentKeys.hra,
  payrollComponentKeys.da,
  payrollComponentKeys.otherAllowance,
]);

const standardDeductionKeys = new Set<string>([
  payrollComponentKeys.pf,
  payrollComponentKeys.esi,
  payrollComponentKeys.professionalTax,
  payrollComponentKeys.incomeTax,
]);

export const roundMoney = (value: number) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getComponentKey = (component: SalaryComponent) => {
  if (component.key && Object.values(payrollComponentKeys).includes(component.key as any)) {
    return component.key;
  }

  return labelAliases.get(String(component.label || '').trim().toLowerCase());
};

const normalizeComponent = (component: SalaryComponent): SalaryComponent => {
  const key = getComponentKey(component);

  return {
    key,
    label: String(component.label || (key ? payrollComponentLabels[key as keyof typeof payrollComponentLabels] : '')).trim(),
    amount: roundMoney(Number(component.amount || 0)),
    formula: component.formula,
    systemGenerated: Boolean(component.systemGenerated),
  };
};

const normalizeComponents = (components: SalaryComponent[] = []) =>
  components
    .map(normalizeComponent)
    .filter((component) => component.label.length > 0 && component.amount >= 0);

const sumComponents = (components: SalaryComponent[] = []) =>
  roundMoney(components.reduce((total, component) => total + Number(component.amount || 0), 0));

const systemComponent = (key: keyof typeof payrollComponentLabels, amount: number, formula: string): SalaryComponent => ({
  key,
  label: payrollComponentLabels[key],
  amount: roundMoney(amount),
  formula,
  systemGenerated: true,
});

const calculateIncomeTax = (annualSalary: number) => {
  const slab = payrollRules.incomeTaxSlabs.find((item) => annualSalary <= item.upto) || payrollRules.incomeTaxSlabs[payrollRules.incomeTaxSlabs.length - 1];
  const annualTax = roundMoney(annualSalary * slab.rate);

  return {
    annualSalary: roundMoney(annualSalary),
    annualTax,
    monthlyTax: roundMoney(annualTax / 12),
    rate: slab.rate,
  };
};

export const calculatePayrollPreview = ({
  fixedSalary,
  additionalEarnings = [],
  additionalDeductions = [],
}: CalculationInput): PayrollCalculationResult => {
  const monthlyFixedSalary = Math.max(roundMoney(fixedSalary), 0);
  const basicPay = roundMoney(monthlyFixedSalary * payrollRules.basicPayRate);
  const hra = roundMoney(basicPay * payrollRules.hraRateOfBasicPay);
  const da = roundMoney(basicPay * payrollRules.daRateOfBasicPay);
  const otherAllowance = Math.max(roundMoney(monthlyFixedSalary - (basicPay + hra + da)), 0);

  const earnings = [
    systemComponent(payrollComponentKeys.basicPay, basicPay, '50% of Fixed Salary'),
    systemComponent(payrollComponentKeys.hra, hra, '40% of Basic Pay'),
    systemComponent(payrollComponentKeys.da, da, '20% of Basic Pay'),
    systemComponent(payrollComponentKeys.otherAllowance, otherAllowance, 'Fixed Salary - (Basic Pay + HRA + DA)'),
    ...normalizeComponents(additionalEarnings).filter((component) => !standardEarningKeys.has(getComponentKey(component) || '')),
  ];

  const grossEarnings = sumComponents(earnings);
  const incomeTax = calculateIncomeTax(grossEarnings * 12);
  const deductions = [
    systemComponent(payrollComponentKeys.pf, (basicPay + da) * payrollRules.pfRateOfBasicAndDa, '12% of (Basic Pay + DA)'),
    systemComponent(
      payrollComponentKeys.esi,
      grossEarnings <= payrollRules.esiGrossThreshold ? grossEarnings * payrollRules.esiRateOfGross : 0,
      '0.75% of Gross Earnings when Gross <= 21000',
    ),
    systemComponent(
      payrollComponentKeys.professionalTax,
      grossEarnings > payrollRules.professionalTaxThreshold ? payrollRules.professionalTaxAmount : 0,
      '200 when Gross Salary > 15000',
    ),
    systemComponent(payrollComponentKeys.incomeTax, incomeTax.monthlyTax, 'Annual slab tax / 12'),
    ...normalizeComponents(additionalDeductions).filter((component) => !standardDeductionKeys.has(getComponentKey(component) || '')),
  ];
  const totalDeductions = sumComponents(deductions);
  const netSalary = Math.max(roundMoney(grossEarnings - totalDeductions), 0);

  return {
    fixedSalary: monthlyFixedSalary,
    earnings,
    deductions,
    grossEarnings,
    totalDeductions,
    netSalary,
    amountInWords: amountInWords(netSalary),
    calculationMetadata: {
      engine: payrollRules.engine,
      salaryBasis: 'monthly',
      generatedAt: new Date().toISOString(),
      additionalEarnings: sumComponents(additionalEarnings),
      additionalDeductions: sumComponents(additionalDeductions),
      rules: {
        basicPayPercentOfFixedSalary: roundMoney(payrollRules.basicPayRate * 100),
        hraPercentOfBasicPay: roundMoney(payrollRules.hraRateOfBasicPay * 100),
        daPercentOfBasicPay: roundMoney(payrollRules.daRateOfBasicPay * 100),
        pfPercentOfBasicAndDa: roundMoney(payrollRules.pfRateOfBasicAndDa * 100),
        esiGrossThreshold: payrollRules.esiGrossThreshold,
        esiPercentOfGross: roundMoney(payrollRules.esiRateOfGross * 100),
        professionalTaxThreshold: payrollRules.professionalTaxThreshold,
        professionalTaxAmount: payrollRules.professionalTaxAmount,
        incomeTaxAnnualSalary: incomeTax.annualSalary,
        incomeTaxAnnualTax: incomeTax.annualTax,
        incomeTaxRatePercent: roundMoney(incomeTax.rate * 100),
        grossSalaryUsedForDeductions: grossEarnings,
      },
    },
  };
};
