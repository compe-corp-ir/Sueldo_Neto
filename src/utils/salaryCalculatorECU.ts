// =======================
// ECUADOR – Salary Engine
// =======================

import type { SalaryResults, SalaryBreakdown } from './salaryCalculator';
import data from './DataECU.json';

// ================= Utilidades =================
const round2 = (v: number) => Math.round(v * 100) / 100;

const formatNumber = (num: number): string =>
  new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

// ================= Tipos =================
export interface SalaryInputsECU {
  basicSalary: number; // Salario Bruto Mensual (SB)
  year: number;
}

// ================= IR ECUADOR =================
// ❗ TRAMO ÚNICO: fijo + excedente marginal
function calculateAnnualIncomeTax(base: number) {
  let annualTax = 0;
  const details: SalaryBreakdown['fifthCategoryDetails'] = [];

  for (const b of data.incomeTax.brackets) {
    const to = b.to ?? Infinity;

    if (base >= b.from && base <= to) {
      annualTax = b.fixed + (base - b.from) * b.rate;

      details.push({
        step: `Tramo ${Math.round(b.rate * 100)}%`,
        description: `$${formatNumber(b.from)} - ${
          b.to ? `$${formatNumber(to)}` : '∞'
        }`,
        amount: round2(annualTax),
        rate: `${Math.round(b.rate * 100)}%`,
      });
      break;
    }
  }

  return {
    annualTax: round2(annualTax),
    details,
  };
}

// ================= Cálculo Principal =================
export function calculateSalaryECU(
  inputs: SalaryInputsECU
): SalaryResults {
  const SB = inputs.basicSalary;
  const SBU = data.benefits.decimoFourth.sbu;

  // Rebaja gastos personales (supuesto corporativo)
  const personalExpensesDeduction =
    data.incomeTax.defaultPersonalExpensesDeduction ?? 0;

  // ================= INGRESOS =================
  const decimoThird_m = SB / 12;
  const decimoFourth_m = SBU / 12;

  // Fondo de reserva
  const reserveFund_m = SB * data.benefits.reserveFund.rate;
  const reserveFund_annual = reserveFund_m * 12;

  // ================= DESCUENTOS =================
  const iessEmployee_m = SB * data.iess.employee;

  // ================= IMPUESTO A LA RENTA =================
  const annualTaxBase = SB * 12 - iessEmployee_m * 12;

  const {
    annualTax: annualTaxCaused,
    details: incomeTaxDetails,
  } = calculateAnnualIncomeTax(annualTaxBase);

  const annualTaxAfterDeduction = Math.max(
    0,
    annualTaxCaused - personalExpensesDeduction
  );

  const monthlyIncomeTax = annualTaxAfterDeduction / 12;

  // ================= NETOS TRABAJADOR =================

  // Neto mensual Año 1 (sin fondo)
  const netMonthly =
    SB +
    decimoThird_m +
    decimoFourth_m -
    iessEmployee_m -
    monthlyIncomeTax;

  // Neto mensual Año 2 (incluye fondo)
  const netMonthlyYear2 = netMonthly + reserveFund_m;

  // Neto anual equivalente
  const netAnnual = netMonthly * 12 + reserveFund_annual;

  // ================= COSTO EMPRESA =================

  // Sueldo bruto x13 (12 meses + décimo tercero)
  const grossAnnual13 = SB * 13;

  // Total costo anual empresa
  const totalAnnualCost =
    grossAnnual13 +
    decimoFourth_m * 12 +
    reserveFund_annual;

  // ================= DESGLOSE =================
  const breakdown: SalaryBreakdown = {
    monthlyCalculation: [
      { step: '1', description: 'Salario base', amount: SB },
      {
        step: '2',
        description: 'Décimo tercero (mensualizado)',
        amount: round2(decimoThird_m),
        formula: 'SB / 12',
      },
      {
        step: '3',
        description: 'Décimo cuarto (mensualizado)',
        amount: round2(decimoFourth_m),
        formula: 'SBU / 12',
      },
      {
        step: '4',
        description: 'IESS personal (9.45%)',
        amount: -round2(iessEmployee_m),
      },
      {
        step: '5',
        description: 'Impuesto a la Renta (mensual)',
        amount: -round2(monthlyIncomeTax),
      },
      {
        step: '6',
        description: 'Neto mensual (Año 1)',
        amount: round2(netMonthly),
      },
      {
        step: '7',
        description: 'Fondo de reserva (desde Año 2)',
        amount: round2(reserveFund_m),
      },
    ],
    annualCalculation: [
      {
        step: '1',
        description: 'Sueldo bruto × 13',
        amount: round2(grossAnnual13),
      },
      {
        step: '2',
        description: 'Décimo cuarto anual',
        amount: round2(decimoFourth_m * 12),
      },
      {
        step: '3',
        description: 'Fondo de reserva anual',
        amount: round2(reserveFund_annual),
      },
      {
        step: '4',
        description: 'Costo anual total empresa',
        amount: round2(totalAnnualCost),
      },
      {
        step: '5',
        description: 'Neto anual equivalente',
        amount: round2(netAnnual),
      },
    ],
    fifthCategoryDetails: incomeTaxDetails,
  };

  // ================= RETURN =================
  return {
    regime: 'NORMAL',
    healthScheme: 'ESSALUD',
    riaAliquots: null,

    // Inputs
    basicSalary: SB,
    foodAllowance: 0,
    familyAllowance: 0,

    // Mensual
    grossMonthlySalary: round2(SB),
    afpDeduction: round2(iessEmployee_m),
    fifthCategoryTax: round2(monthlyIncomeTax),
    netMonthlySalary: round2(netMonthly),
    netMonthlySalaryYear2: round2(netMonthlyYear2),

    // ===== COSTO EMPRESA =====
    grossAnnual13: round2(grossAnnual13),
    totalAnnualCost: round2(totalAnnualCost),

    // Anual trabajador
    annualGrossIncome: round2(SB * 12),
    christmasBonus: round2(decimoThird_m * 12),
    julyBonus: round2(decimoFourth_m * 12),
    healthBonus: 0,
    grossAnnual12: round2(SB * 12),
    iessAnnual12: round2(iessEmployee_m * 12),
    totalAnnualIncome: round2(
      SB * 12 +
      decimoThird_m * 12 +
      decimoFourth_m * 12 +
      reserveFund_annual
    ),
    annualFoodAllowance: 0,

    annualAfpDeduction: round2(iessEmployee_m * 12),
    annualFifthCategoryTax: round2(annualTaxAfterDeduction),
    netAnnualSalary: round2(netAnnual),

    breakdown,
  };
}
