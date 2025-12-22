// ================= Tipos públicos =================
export type Regime = 'NORMAL' | 'RIA';

export interface SalaryInputs {
  basicSalary: number;
  foodAllowance: number;
  hasFamilyAllowance: boolean;
  year: number;
  healthScheme: 'ESSALUD' | 'EPS';
  regime: Regime;
}

export interface SalaryResults {
  // Para la UI
  regime: Regime;
  healthScheme: 'ESSALUD' | 'EPS';
  riaAliquots?: {
    baseSF: number;
    gratiAliquot: number;
    bonoAliquot: number;
    ctsAliquot: number;
    healthRateLabel: string; // "9%" | "6.75%"
    
  } | null;
  grossAnnual12?: number;
  iessAnnual12?: number;

  // Inputs
  basicSalary: number;
  foodAllowance: number;
  familyAllowance: number;
  netMonthlySalaryYear2?: number;
  grossAnnual13?: number;
  totalAnnualCost?: number;
  // Mensual
  grossMonthlySalary: number; // SIN vale
  afpDeduction: number;
  fifthCategoryTax: number;
  netMonthlySalary: number;   // SIN vale

  // Anual (presentación)
  annualGrossIncome: number;  // SIN vale
  christmasBonus: number;
  julyBonus: number;
  healthBonus: number;
  totalAnnualIncome: number;  // SIN vale
  annualFoodAllowance: number; // <-- NUEVO: vales x 12

  annualAfpDeduction: number;
  annualFifthCategoryTax: number;
  netAnnualSalary: number;

  // ==== NUEVO: métricas adicionales (opcionales) ====
  bonusGross?: number; // Bono Bruto
  bonusNet?: number;   // Bono Neto

  // Desglose
  breakdown: SalaryBreakdown;
}

export interface SalaryBreakdown {
  monthlyCalculation: {
    step: string;
    description: string;
    amount: number;
    formula?: string;
  }[];

  annualCalculation: {
    step: string;
    description: string;
    amount: number;
    formula?: string;
  }[];

  fifthCategoryDetails: {
    step: string;
    description: string;
    amount: number;
    rate?: string;
  }[];
}

// ================= Tipos internos (para JSON) =================
type BracketUIT = { fromUIT: number; toUIT: number | null; rate: number };

interface TaxParams {
  UIT: number;
  FAMILY_ALLOWANCE: number;

  HEALTH_BONUS?: { ESSALUD?: number; EPS?: number };
  HEALTH_BONUS_RATE?: number;

  AFP_BASE_RATE: number;
  AFP_EXTRA_RATE: number;
  AFP_EXTRA_CAP: number;

  FIFTH_CATEGORY_BRACKETS_UIT: BracketUIT[];
  DEDUCTION_UIT: number;

  // RIA opcionales
  BUILD_FROM_COMPONENTS?: boolean;
  GRATI_ANNUAL_MONTHS?: number;
  VACATION_ANNUAL_MONTHS?: number;
  CTS_ANNUAL_MONTHS?: number;
  INCLUDE_HEALTH_BONUS_EQUIV?: boolean;
}

type YearParams = Record<string, Partial<TaxParams>>;

interface AllParamsJson {
  NORMAL: YearParams;
  RIA?: YearParams;
}

// ================= Importar Data.json =================
import params from './Data.json';
const ALL_PARAMS = params as AllParamsJson;

// ================= Utilidades =================
function round2AwayFromZero(v: number): number {
  const s = v < 0 ? -1 : 1;
  return (s * Math.round(Math.abs(v) * 100)) / 100;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getHealthRate(p: TaxParams, scheme: 'ESSALUD' | 'EPS'): number {
  const s = (scheme ?? 'ESSALUD').toString().trim().toUpperCase() as 'ESSALUD' | 'EPS';
  return (
    (p.HEALTH_BONUS && (p.HEALTH_BONUS as Record<string, number | undefined>)[s]) ??
    p.HEALTH_BONUS_RATE ?? 0.09
  );
}

function calcFifthCategory(
  taxableAfter7UIT: number,
  bracketsUIT: BracketUIT[],
  UIT: number
) {
  let annualTax = 0;
  let rem = taxableAfter7UIT;
  const details: SalaryBreakdown['fifthCategoryDetails'] = [];

  const brackets = bracketsUIT.map((b) => ({
    from: b.fromUIT * UIT,
    to: b.toUIT === null ? Infinity : b.toUIT * UIT,
    rate: b.rate,
  }));

  for (const br of brackets) {
    if (rem <= 0) break;
    const width = br.to === Infinity ? rem : Math.max(0, Math.min(rem, br.to - br.from));
    if (width <= 0) continue;
    const taxHere = width * br.rate;
    annualTax += taxHere;
    rem -= width;

    details.push({
      step: `Tramo ${Math.round(br.rate * 100)}%`,
      description: `S/ ${formatNumber(br.from)} - S/ ${br.to === Infinity ? '∞' : formatNumber(br.to)}`,
      amount: round2AwayFromZero(taxHere),
      rate: `${Math.round(br.rate * 100)}%`,
    });
  }

  return { annualTax, details };
}

// ================= Lectura de parámetros por RÉGIMEN + AÑO =================
function getParamsForYear(year: number, regime: Regime): TaxParams {
  const byRegime = (ALL_PARAMS[regime] || {}) as YearParams;
  const exact = byRegime[String(year)];
  if (exact && Object.keys(exact).length > 0) return exact as TaxParams;

  const yearsWithData = Object.entries(byRegime)
    .filter(([, v]) => v && Object.keys(v).length > 0)
    .map(([k]) => Number(k))
    .sort((a, b) => a - b);

  if (yearsWithData.length === 0) {
    throw new Error(`No hay parámetros cargados en Data.json para el régimen ${regime}.`);
  }
  const lastYear = yearsWithData[yearsWithData.length - 1];
  console.warn(`[salary] Usando parámetros de ${lastYear} (no hay datos para ${year}) en ${regime}.`);
  return byRegime[String(lastYear)] as TaxParams;
}

// ================= Cálculo principal =================
export function calculateSalary(inputs: SalaryInputs): SalaryResults {
  const { basicSalary, foodAllowance, hasFamilyAllowance, year, healthScheme, regime } = inputs;

  const p = getParamsForYear(year, regime);

  // Base pensionable
  const familyAllowance = hasFamilyAllowance ? p.FAMILY_ALLOWANCE : 0;
  const baseSF = basicSalary + familyAllowance;

  const calcAfp = (pensionableBase: number) => {
    const extraBase = Math.min(pensionableBase, p.AFP_EXTRA_CAP);
    const afpRaw = pensionableBase * p.AFP_BASE_RATE + extraBase * p.AFP_EXTRA_RATE;
    return round2AwayFromZero(afpRaw);
  };

  // =========================
  // ========= RIA ===========
  // =========================
  if (regime === 'RIA') {
    const healthRate = getHealthRate(p, healthScheme);
    const aliquotGrati = baseSF / 6;
    const aliquotBono  = p.INCLUDE_HEALTH_BONUS_EQUIV ? (baseSF * healthRate) / 6 : 0;
    const aliquotCTS   = (baseSF + baseSF / 6) / 12;

    const riaMonthlyPensionable = p.BUILD_FROM_COMPONENTS
      ? baseSF + aliquotGrati + aliquotBono + aliquotCTS
      : (() => {
          let annualMonths = 12;
          annualMonths += p.GRATI_ANNUAL_MONTHS ?? 0;
          annualMonths += p.CTS_ANNUAL_MONTHS ?? 0;
          return (baseSF * annualMonths) / 12;
        })();

    // Bruto SIN vale
    const grossMonthlySalary = riaMonthlyPensionable;

    // Vale anual independiente
    const annualFoodAllowance = foodAllowance * 12;

    const afpDeduction = calcAfp(baseSF);

    const totalBonusesEq = baseSF * 2;
    const healthBonusEq  = (p.INCLUDE_HEALTH_BONUS_EQUIV !== false) ? totalBonusesEq * healthRate : 0;

    // 5ta: MANTENEMOS vale en la base (tal como pediste)
    const annualBaseFor5th =
      (baseSF + foodAllowance) * 12 + totalBonusesEq + healthBonusEq;

    const deductionAmount = p.DEDUCTION_UIT * p.UIT;
    const taxableAfter7UIT = Math.max(0, annualBaseFor5th - deductionAmount);
    const { annualTax: annualFifthCategoryTax, details: fifthCategoryDetails } =
      calcFifthCategory(taxableAfter7UIT, p.FIFTH_CATEGORY_BRACKETS_UIT, p.UIT);

    const fifthCategoryTax = round2AwayFromZero(annualFifthCategoryTax / 12);

    // Neto SIN vale
    const netMonthlySalary = round2AwayFromZero(grossMonthlySalary - afpDeduction - fifthCategoryTax);

    // Anuales SIN vale en el bruto
    const annualGrossIncome  = grossMonthlySalary * 12;
    const annualAfpDeduction = afpDeduction * 12;
    const totalAnnualIncome  = annualGrossIncome; // en RIA se presenta solo la cuota
    const netAnnualSalary    = round2AwayFromZero(totalAnnualIncome - annualAfpDeduction - annualFifthCategoryTax);

    const basePct  = (p.AFP_BASE_RATE * 100).toFixed(2);
    const extraPct = (p.AFP_EXTRA_RATE * 100).toFixed(2);

    const breakdown: SalaryBreakdown = {
      monthlyCalculation: [
        { step: '1', description: 'Base pensionable (baseSF)', amount: baseSF },
        { step: '2', description: 'Alícuota Gratificación (baseSF/6)', amount: round2AwayFromZero(aliquotGrati), formula: 'baseSF / 6' },
        { step: '3', description: `Alícuota Bono Extraord. (${Math.round(healthRate * 100)}%)`, amount: round2AwayFromZero(aliquotBono), formula: '(baseSF × tasa) / 6' },
        { step: '4', description: 'Alícuota CTS ((baseSF + baseSF/6)/12)', amount: round2AwayFromZero(aliquotCTS), formula: '(baseSF + baseSF/6) / 12' },
        { step: '5', description: 'Cuota RIA pensionable (bruto sin vale)', amount: round2AwayFromZero(grossMonthlySalary) },
        { step: '6', description: 'Vale de alimentos (no remunerativo, fuera de neto)', amount: foodAllowance },
        { step: '7', description: 'Descuento AFP', amount: -afpDeduction, formula: `${basePct}% + SISCO ${extraPct}% (tope S/ ${formatNumber(p.AFP_EXTRA_CAP)}) sobre baseSF` },
        { step: '8', description: 'Impuesto 5ta (mensual)', amount: -fifthCategoryTax, formula: 'Impuesto anual ÷ 12' },
        { step: '9', description: 'Sueldo neto mensual (sin vale)', amount: netMonthlySalary },
      ],
      annualCalculation: [
        { step: '1', description: '(Bruto mensual sin vale × 12)', amount: annualGrossIncome },
        { step: '2', description: 'Vale de alimentos (anual)', amount: annualFoodAllowance },
        { step: '3', description: 'Base anual para 5ta', amount: annualBaseFor5th },
        { step: '4', description: 'Deducción 7 UIT', amount: -deductionAmount },
        { step: '5', description: 'Base imponible (neta de 7 UIT)', amount: taxableAfter7UIT },
        { step: '6', description: 'Impuesto 5ta anual', amount: round2AwayFromZero(annualFifthCategoryTax) },
      ],
      fifthCategoryDetails,
    };

    const riaAliquots = {
      baseSF,
      gratiAliquot: round2AwayFromZero(aliquotGrati),
      bonoAliquot:  round2AwayFromZero(aliquotBono),
      ctsAliquot:   round2AwayFromZero(aliquotCTS),
      healthRateLabel: healthScheme === 'EPS' ? '6.75%' : '9%',
    };

    return {
      regime,
      healthScheme,
      riaAliquots,

      basicSalary,
      foodAllowance,
      familyAllowance,

      grossMonthlySalary: round2AwayFromZero(grossMonthlySalary), // sin vale
      afpDeduction,
      fifthCategoryTax,
      netMonthlySalary, // sin vale

      annualGrossIncome: round2AwayFromZero(annualGrossIncome),   // sin vale
      christmasBonus: 0,
      julyBonus: 0,
      healthBonus: 0,
      totalAnnualIncome: round2AwayFromZero(totalAnnualIncome),   // sin vale
      annualFoodAllowance: round2AwayFromZero(annualFoodAllowance), // NUEVO

      annualAfpDeduction: round2AwayFromZero(annualAfpDeduction),
      annualFifthCategoryTax: round2AwayFromZero(annualFifthCategoryTax),
      netAnnualSalary,

      breakdown,
      // bonusGross / bonusNet quedan opcionales y se pueden setear desde fuera si quieres
    };
  }

  // =========================
  // ====== NORMAL ===========
  // =========================

  // Bruto mensual SIN vale
  const grossMonthlySalary = baseSF;

  // Vale anual independiente
  const annualFoodAllowance = foodAllowance * 12;

  // AFP sobre baseSF
  const afpDeduction = calcAfp(baseSF);

  // Gratificaciones
  const julyBonus = baseSF;
  const christmasBonus = baseSF;
  const totalBonuses = julyBonus + christmasBonus;

  // Bono salud
  const scheme = (healthScheme ?? 'ESSALUD').toString().trim().toUpperCase() as 'ESSALUD' | 'EPS';
  const healthRate = getHealthRate(p, scheme);
  const healthBonus = totalBonuses * healthRate;

  // 5ta: MANTENEMOS vale en la base
  const annualBaseFor5th = (baseSF + foodAllowance) * 12 + totalBonuses + healthBonus;

  const deductionAmount = p.DEDUCTION_UIT * p.UIT;
  const taxableAfter7UIT = Math.max(0, annualBaseFor5th - deductionAmount);
  const { annualTax: annualFifthCategoryTax, details: fifthCategoryDetails } =
    calcFifthCategory(taxableAfter7UIT, p.FIFTH_CATEGORY_BRACKETS_UIT, p.UIT);
  const fifthCategoryTax = round2AwayFromZero(annualFifthCategoryTax / 12);

  // Neto mensual SIN vale
  const netMonthlySalary = round2AwayFromZero(grossMonthlySalary - afpDeduction - fifthCategoryTax);

  // Anuales SIN vale en el bruto
  const annualGrossIncome  = grossMonthlySalary * 12;
  const annualAfpDeduction = afpDeduction * 12;
  const totalAnnualIncome  = annualGrossIncome + totalBonuses + healthBonus;
  const netAnnualSalary    = round2AwayFromZero(totalAnnualIncome - annualAfpDeduction - annualFifthCategoryTax);

  const basePct  = (p.AFP_BASE_RATE * 100).toFixed(2);
  const extraPct = (p.AFP_EXTRA_RATE * 100).toFixed(2);

  const breakdown: SalaryBreakdown = {
    monthlyCalculation: [
      { step: '1', description: 'Sueldo básico', amount: basicSalary },
      ...(hasFamilyAllowance ? [{ step: '2', description: 'Asignación familiar', amount: familyAllowance }] : []),
      { step: '3', description: 'Sueldo bruto mensual (sin vale)', amount: grossMonthlySalary, formula: 'Básico + Familiar' },
      { step: '4', description: 'Vale de alimentos (no remunerativo, fuera de neto)', amount: foodAllowance },
      { step: '5', description: 'Descuento AFP', amount: -afpDeduction, formula: `${basePct}% + SISCO ${extraPct}% (tope S/ ${formatNumber(p.AFP_EXTRA_CAP)}) sobre baseSF` },
      { step: '6', description: 'Impuesto 5ta categoría (mensual)', amount: -fifthCategoryTax, formula: 'Impuesto anual ÷ 12' },
      { step: '7', description: 'Sueldo neto mensual (sin vale)', amount: netMonthlySalary },
    ],
    annualCalculation: [
      { step: '1', description: '(Bruto mensual sin vale × 12)', amount: annualGrossIncome },
      { step: '2', description: 'Gratificación julio', amount: julyBonus },
      { step: '3', description: 'Gratificación diciembre', amount: christmasBonus },
      {
        step: '4',
        description: `Bono salud (${scheme})`,
        amount: healthBonus,
        formula: `(${formatNumber(totalBonuses)}) × ${Math.round(healthRate * 10000) / 100}%`,
      },
      { step: '5', description: 'Vale de alimentos (anual)', amount: annualFoodAllowance },
      { step: '6', description: 'Total base anual para 5ta', amount: annualBaseFor5th },
      { step: '7', description: 'Deducción 7 UIT', amount: -deductionAmount, formula: `7 × S/ ${formatNumber(p.UIT)}` },
      { step: '8', description: 'Base imponible (neta de 7 UIT)', amount: taxableAfter7UIT },
      { step: '9', description: 'Impuesto 5ta categoría anual', amount: round2AwayFromZero(annualFifthCategoryTax), formula: 'Tramos progresivos en UIT' },
    ],
    fifthCategoryDetails,
  };

  return {
    regime,
    healthScheme,
    riaAliquots: null,

    basicSalary,
    foodAllowance,
    familyAllowance,

    grossMonthlySalary: round2AwayFromZero(grossMonthlySalary), // sin vale
    afpDeduction,
    fifthCategoryTax,
    netMonthlySalary, // sin vale

    annualGrossIncome: round2AwayFromZero(annualGrossIncome),   // sin vale
    christmasBonus: round2AwayFromZero(christmasBonus),
    julyBonus: round2AwayFromZero(julyBonus),
    healthBonus: round2AwayFromZero(healthBonus),
    totalAnnualIncome: round2AwayFromZero(totalAnnualIncome),

    annualFoodAllowance: round2AwayFromZero(annualFoodAllowance), // NUEVO

    annualAfpDeduction: round2AwayFromZero(annualAfpDeduction),
    annualFifthCategoryTax: round2AwayFromZero(annualFifthCategoryTax),
    netAnnualSalary,

    breakdown,
    // bonusGross / bonusNet quedan opcionales y se pueden setear desde fuera si quieres
  };
}

/* =================== (OPCIONAL) Helpers de bono =================== */
/** Bono Bruto = (sueldo básico + vales) × múltiplos */
export function computeBonusGross(
  basicSalary: number,
  foodAllowance: number,
  multiples: number
): number {
  const base = (Number(basicSalary) || 0) + (Number(foodAllowance) || 0);
  const mult = Number(multiples) || 0;
  return round2AwayFromZero(base * mult);
}
export function computeBonusNetFifthOnlyFromResults(
  inputs: SalaryInputs,      // para year, regime y healthScheme actuales
  results: SalaryResults,    // lo que devolvió calculateSalary
  bonusGross: number         // bono bruto que quieres netear
): {
  bonusNet: number;
  monthlyTaxWithBonus: number;
  annualTaxWithBonus: number;
} {
  const { year, regime, healthScheme } = inputs;
  const p = getParamsForYear(year, regime);

  // 1) Base anual de 5ta SIN bono (reconstruida internamente)
  const baseSF = results.basicSalary + results.familyAllowance;

  let baseAnnualFor5thWithoutBonus = 0;

  if (regime === 'NORMAL') {
    // Igual a tu motor principal
    baseAnnualFor5thWithoutBonus =
      (baseSF + results.foodAllowance) * 12 +
      results.julyBonus +
      results.christmasBonus +
      results.healthBonus;
  } else {
    // RIA: usa equivalentes (2 gratificaciones + Bono Salud equivalente si aplica)
    const healthRate = getHealthRate(p, healthScheme);
    const totalBonusesEq = baseSF * 2;
    const healthBonusEq =
      (p.INCLUDE_HEALTH_BONUS_EQUIV !== false) ? totalBonusesEq * healthRate : 0;

    baseAnnualFor5thWithoutBonus =
      (baseSF + results.foodAllowance) * 12 +
      totalBonusesEq +
      healthBonusEq;
  }

  // 2) Nueva base con bono agregado
  const baseWithBonus = (Number(baseAnnualFor5thWithoutBonus) || 0) + (Number(bonusGross) || 0);

  // 3) 7 UIT y cálculo de 5ta ANUAL con bono
  const deductionAmount = p.DEDUCTION_UIT * p.UIT;
  const taxableWithBonus = Math.max(0, baseWithBonus - deductionAmount);

  const { annualTax: annualTaxWithBonus } = calcFifthCategory(
    taxableWithBonus,
    p.FIFTH_CATEGORY_BRACKETS_UIT,
    p.UIT
  );

  // 4) Prorrateo mensual y Bono Neto (solo 5ta, sin AFP)
  const monthlyTaxWithBonus = round2AwayFromZero(annualTaxWithBonus / 12);
  const bonusNet = round2AwayFromZero(Math.max(0, (Number(bonusGross) || 0) - monthlyTaxWithBonus));

  return { bonusNet, monthlyTaxWithBonus, annualTaxWithBonus };
}
