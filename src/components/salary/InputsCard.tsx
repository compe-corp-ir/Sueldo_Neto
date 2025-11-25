import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import rawParams from '../../utils/Data.json';

type BracketUIT = { fromUIT: number; toUIT: number | null; rate: number };
type TaxParams = {
  UIT: number;
  FAMILY_ALLOWANCE: number;
  HEALTH_BONUS?: { ESSALUD?: number; EPS?: number };
  HEALTH_BONUS_RATE?: number;
  AFP_BASE_RATE: number;
  AFP_EXTRA_RATE: number;
  AFP_EXTRA_CAP: number;
  FIFTH_CATEGORY_BRACKETS_UIT: BracketUIT[];
  DEDUCTION_UIT: number;
  BUILD_FROM_COMPONENTS?: boolean;
  INCLUDE_HEALTH_BONUS_EQUIV?: boolean;
};
type YearParams = Record<string, Partial<TaxParams>>;
type AllParamsJson = { NORMAL: YearParams; RIA?: YearParams };

import type { SalaryInputs, Regime } from '@/utils/salaryCalculator';

interface InputsCardProps {
  onCalculate: (data: SalaryInputs) => void;
  onClear: () => void;
  loading?: boolean;
  onBonusMultiplesChange?: (multiples: number) => void;
}

type HealthScheme = 'ESSALUD' | 'EPS';

const ALL_PARAMS = rawParams as AllParamsJson;

function getYearsFromJson(): string[] {
  const byRegime = ALL_PARAMS?.NORMAL || {};
  return Object.keys(byRegime).sort((a, b) => Number(a) - Number(b));
}
function getLastYearWithData(): string | null {
  const byRegime = ALL_PARAMS?.NORMAL || {};
  const years = Object.entries(byRegime)
    .filter(([, v]) => v && Object.keys(v).length > 0)
    .map(([k]) => k)
    .sort((a, b) => Number(a) - Number(b));
  return years.length ? years[years.length - 1] : null;
}
function hasDataForYear(year: string): boolean {
  const byRegime = ALL_PARAMS?.NORMAL || {};
  const y = byRegime[year];
  return !!(y && Object.keys(y).length > 0);
}
function getParamsForYearWithFallback(year: string): { params: TaxParams; effectiveYear: string } {
  const byRegime = ALL_PARAMS?.NORMAL || {};
  const exact = byRegime[year];
  if (exact && Object.keys(exact).length > 0) return { params: exact as TaxParams, effectiveYear: year };
  const last = getLastYearWithData();
  if (!last) throw new Error('No hay parámetros cargados en Data.json para el régimen NORMAL.');
  return { params: byRegime[last] as TaxParams, effectiveYear: last };
}

// Convierte string a número (acepta coma o punto)
const toNumber = (v: string) => {
  if (!v) return 0;
  const normalized = String(v).replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrencyInline = (num: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

const InputsCard: React.FC<InputsCardProps> = ({
  onCalculate,
  onClear,
  loading = false,
  onBonusMultiplesChange,
}) => {
  const yearsFromJson = useMemo(() => getYearsFromJson(), []);
  const defaultYear = useMemo(() => {
    return getLastYearWithData() ?? (yearsFromJson.length ? yearsFromJson[yearsFromJson.length - 1] : '2025');
  }, [yearsFromJson]);

  const [regime, setRegime] = useState<Regime>('NORMAL');
  const [basicSalary, setBasicSalary] = useState<string>('');
  const [foodAllowance, setFoodAllowance] = useState<string>('');
  const [hasFamilyAllowance, setHasFamilyAllowance] = useState<boolean>(false);
  const [year, setYear] = useState<string>(defaultYear);
  const [healthScheme, setHealthScheme] = useState<HealthScheme>('ESSALUD');

  const [bonusMultiples, setBonusMultiples] = useState<string>('0');

  const [{ params: yearParams, effectiveYear }, setYearParams] =
    useState<{ params: TaxParams; effectiveYear: string }>(() =>
      getParamsForYearWithFallback(defaultYear)
    );

  useEffect(() => {
    try {
      setYearParams(getParamsForYearWithFallback(year));
    } catch (e) {
      console.error(e);
    }
  }, [year]);

  useEffect(() => {
    if (onBonusMultiplesChange) {
      const initial = Number(bonusMultiples.replace(',', '.')) || 0;
      onBonusMultiplesChange(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  const familyAllowanceLabel = useMemo(() => {
    const amount = yearParams?.FAMILY_ALLOWANCE ?? 0;
    return `Asignación Familiar (S/ ${amount.toFixed(2)})`;
  }, [yearParams]);

  const healthRatePercent = useMemo(() => {
    const rate =
      yearParams?.HEALTH_BONUS?.[healthScheme] ??
      yearParams?.HEALTH_BONUS_RATE ??
      0.09;
    return `${Math.round(rate * 10000) / 100}%`;
  }, [yearParams, healthScheme]);

  // Normaliza coma a punto y deja solo dígitos y punto
  const handleNumberInput = (value: string, setter: (val: string) => void) => {
    const normalized = value.replace(',', '.');
    const numericValue = normalized.replace(/[^0-9.]/g, '');
    setter(numericValue);
  };

  const handleBonusMultiplesChange = (value: string) => {
    const normalized = value.replace(',', '.');
    const numericValue = normalized.replace(/[^0-9.]/g, '');
    setBonusMultiples(numericValue);
  };

  const basicSalaryMoney = useMemo(() => formatCurrencyInline(toNumber(basicSalary)), [basicSalary]);
  const foodAllowanceMoney = useMemo(() => formatCurrencyInline(toNumber(foodAllowance)), [foodAllowance]);
  const bonusAmountMoney = useMemo(
    () => formatCurrencyInline((toNumber(basicSalary) + toNumber(foodAllowance)) * toNumber(bonusMultiples || '0')),
    [basicSalary, foodAllowance, bonusMultiples]
  );

  const showFallbackNote = year !== effectiveYear && hasDataForYear(effectiveYear);

  const handleCalculate = () => {
    const inputs: SalaryInputs = {
      basicSalary: toNumber(basicSalary),
      foodAllowance: toNumber(foodAllowance),
      hasFamilyAllowance,
      year: parseInt(year, 10),
      healthScheme,
      regime,
    };
    onCalculate(inputs);

    const parsedBonus = Number(bonusMultiples.replace(',', '.')) || 0;
    onBonusMultiplesChange?.(parsedBonus);
  };

  const handleClear = () => {
    setRegime('NORMAL');
    setBasicSalary('');
    setFoodAllowance('0');
    setHasFamilyAllowance(false);
    setYear(defaultYear);
    setHealthScheme('ESSALUD');
    setBonusMultiples('2');
    onBonusMultiplesChange?.(2);
    onClear();
  };

  return (
    <Card className="w-full shadow-card animate-fade-in">
      <CardHeader className="pb-2 tv:pb-3">
        <CardTitle className="text-lg tv:text-xl font-semibold text-card-foreground flex items-center gap-2">
          <Calculator className="w-5 h-5 tv:w-6 tv:h-6 text-primary" />
          Datos Salariales
        </CardTitle>

        {showFallbackNote && (
          <p className="text-[11px] tv:text-xs leading-tight text-muted-foreground">
            Usando parámetros de <span className="font-medium">{effectiveYear}</span> (sin datos para {year}).
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4 xl:space-y-5 tv:space-y-6">
        {/* Régimen + Año */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:gap-5 tv:gap-6">
          {/* Régimen */}
          <div className="space-y-2">
            <label htmlFor="regime" className="text-sm tv:text-[15px] font-medium text-card-foreground">
              Régimen
            </label>
            <Select value={regime} onValueChange={(v) => setRegime(v as Regime)}>
              <SelectTrigger className="text-sm tv:text-[15px] h-9 tv:h-10">
                <SelectValue placeholder="Seleccionar régimen" />
              </SelectTrigger>
              <SelectContent className="text-sm tv:text-[15px]">
                <SelectItem value="NORMAL">Regularrrr</SelectItem>
                <SelectItem value="RIA">RIA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Año */}
          <div className="space-y-2">
            <label htmlFor="year" className="text-sm tv:text-[15px] font-medium text-card-foreground">
              Año de Cálculo
            </label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="text-sm tv:text-[15px] h-9 tv:h-10">
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent className="text-sm tv:text-[15px]">
                {yearsFromJson.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                    {!hasDataForYear(y) ? ' (sin datos)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Régimen de salud */}
        <div className="space-y-2">
          <label
            htmlFor="health-scheme"
            className="text-sm tv:text-[15px] font-medium text-card-foreground whitespace-nowrap"
          >
            Régimen de Salud <span className="text-muted-foreground">({healthRatePercent})</span>
          </label>
          <Select value={healthScheme} onValueChange={(v) => setHealthScheme(v as HealthScheme)}>
            <SelectTrigger className="text-sm tv:text-[15px] h-9 tv:h-10">
              <SelectValue placeholder="Seleccionar régimen de salud" />
            </SelectTrigger>
            <SelectContent className="text-sm tv:text-[15px]">
              <SelectItem value="ESSALUD">EsSalud (9%)</SelectItem>
              <SelectItem value="EPS">EPS (6.75%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sueldo + Vales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:gap-5 tv:gap-6">
          {/* Sueldo básico */}
          <div className="space-y-2">
            <label htmlFor="basic-salary" className="text-sm tv:text-[15px] font-medium text-card-foreground">
              Sueldo Básico
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs tv:text-sm text-muted-foreground">
                    S/
                  </span>
                  <Input
                    id="basic-salary"
                    type="text"
                    placeholder="Ej: 3000"
                    value={basicSalary}
                    onChange={(e) => handleNumberInput(e.target.value, setBasicSalary)}
                    className="pl-8 font-mono bg-input text-sm tv:text-[15px] h-9 tv:h-10"
                    autoComplete="off"
                  />
                </div>
              </TooltipTrigger>
              {basicSalary !== '' && (
                <TooltipContent side="top" className="text-xs tv:text-sm">
                  {basicSalaryMoney}
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          {/* Vales */}
          <div className="space-y-2">
            <label htmlFor="food-allowance" className="text-sm tv:text-[15px] font-medium text-card-foreground">
              Vales de Alimentación
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs tv:text-sm text-muted-foreground">
                    S/
                  </span>
                  <Input
                    id="food-allowance"
                    type="text"
                    placeholder="Ej: 300"
                    value={foodAllowance}
                    onChange={(e) => handleNumberInput(e.target.value, setFoodAllowance)}
                    className="pl-8 font-mono bg-input text-sm tv:text-[15px] h-9 tv:h-10"
                    autoComplete="off"
                  />
                </div>
              </TooltipTrigger>
              {foodAllowance !== '' && (
                <TooltipContent side="top" className="text-xs tv:text-sm">
                  {foodAllowanceMoney}
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        {/* Bonos (en sueldos) */}
        <div className="space-y-2">
          <label htmlFor="bonus-multiples" className="text-sm tv:text-[15px] font-medium text-card-foreground">
            Bonos (en sueldos)
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                id="bonus-multiples"
                type="text"
                placeholder="Ej: 2"
                value={bonusMultiples}
                onChange={(e) => handleBonusMultiplesChange(e.target.value)}
                className="font-mono bg-input text-sm tv:text-[15px] h-9 tv:h-10"
                autoComplete="off"
              />
            </TooltipTrigger>
            {bonusMultiples !== '' && (
              <TooltipContent side="top" className="text-xs tv:text-sm">
                Equivale a {bonusAmountMoney}
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Asignación familiar */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="family-allowance"
            checked={hasFamilyAllowance}
            onCheckedChange={(checked) => setHasFamilyAllowance(!!checked)}
            className="h-4 w-4 tv:h-5 tv:w-5"
          />
          <label
            htmlFor="family-allowance"
            className="text-sm tv:text-[15px] font-medium text-card-foreground cursor-pointer"
          >
            {familyAllowanceLabel}
          </label>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Button
            variant="calculator"
            onClick={handleCalculate}
            disabled={!(toNumber(basicSalary) > 0) || loading}
            className="flex-1 text-white h-10 tv:h-11 text-sm tv:text-base"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 tv:w-5 tv:h-5 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4 tv:w-5 tv:h-5" />
            )}
            <span className="ml-2">Calcular Sueldo Neto</span>
          </Button>

          <Button
            variant="clear"
            onClick={handleClear}
            className="flex-1 sm:flex-none text-white h-10 tv:h-11 text-sm tv:text-base"
          >
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InputsCard;
