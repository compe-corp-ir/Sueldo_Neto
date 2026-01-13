import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { SalaryInputs, Regime } from '@/utils/salaryCalculator';

/* ===================== Tipos ===================== */

type Country = 'PE' | 'EC';
type HealthScheme = 'ESSALUD' | 'EPS';

interface InputsCardProps {
  onCalculate: (data: any) => void;
  onClear: () => void;
  loading?: boolean;
  onBonusMultiplesChange?: (multiples: number) => void;

  // ✅ NUEVO (solo lógica, no UI)
  onCountryChange?: (country: Country) => void;
}

/* ===================== Utils ===================== */

const toNumber = (v: string) => {
  if (!v) return 0;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (value: number, country: Country) =>
  new Intl.NumberFormat(country === 'EC' ? 'es-EC' : 'es-PE', {
    style: 'currency',
    currency: country === 'EC' ? 'USD' : 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

/* ===================== Component ===================== */

const InputsCard: React.FC<InputsCardProps> = ({
  onCalculate,
  onClear,
  loading = false,
  onBonusMultiplesChange,
  onCountryChange,
}) => {
  /* ---------- País ---------- */
  const [country, setCountry] = useState<Country>('PE');

  // 🔗 sincroniza con el padre (NO afecta UI)
  useEffect(() => {
    onCountryChange?.(country);
  }, [country, onCountryChange]);

  /* ---------- Comunes ---------- */
  const [basicSalary, setBasicSalary] = useState('');
  const [foodAllowance, setFoodAllowance] = useState('');
  const [year, setYear] = useState('2026');

  /* ---------- Perú ---------- */
  const [regime, setRegime] = useState<Regime>('NORMAL');
  const [healthScheme, setHealthScheme] = useState<HealthScheme>('ESSALUD');
  const [hasFamilyAllowance, setHasFamilyAllowance] = useState(false);
  const [bonusMultiples, setBonusMultiples] = useState('0');

  /* ---------- Formatos ---------- */
  const basicSalaryMoney = useMemo(
    () => formatCurrency(toNumber(basicSalary), country),
    [basicSalary, country]
  );

  const foodAllowanceMoney = useMemo(
    () => formatCurrency(toNumber(foodAllowance), country),
    [foodAllowance, country]
  );

  const bonusAmountMoney = useMemo(() => {
    const base = toNumber(basicSalary) + toNumber(foodAllowance);
    return formatCurrency(base * toNumber(bonusMultiples), country);
  }, [basicSalary, foodAllowance, bonusMultiples, country]);

  /* ===================== Actions ===================== */

  const handleCalculate = () => {
    if (country === 'PE') {
      const inputs: SalaryInputs = {
        basicSalary: toNumber(basicSalary),
        foodAllowance: toNumber(foodAllowance),
        hasFamilyAllowance,
        year: parseInt(year, 10),
        healthScheme,
        regime,
      };
      onCalculate(inputs);
      onBonusMultiplesChange?.(toNumber(bonusMultiples));
    } else {
      // Ecuador (bruto)
      onCalculate({
        grossMonthly: toNumber(basicSalary),
        year: parseInt(year, 10),
        includeReserveFund: true,
      });
    }
  };

  const handleClear = () => {
    setCountry('PE');
    setBasicSalary('');
    setFoodAllowance('');
    setYear('2026');
    setRegime('NORMAL');
    setHealthScheme('ESSALUD');
    setHasFamilyAllowance(false);
    setBonusMultiples('0');
    onClear();
  };

  /* ===================== Render ===================== */

  return (
    <Card className="w-full shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Datos Salariales
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* País + Año */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">País</label>
            <Select value={country} onValueChange={(v) => setCountry(v as Country)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PE">🇵🇪 Perú</SelectItem>
                <SelectItem value="EC">🇪🇨 Ecuador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Año</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Régimen + Régimen de Salud (MISMA FILA – PERÚ) */}
        {country === 'PE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Régimen</label>
              <Select value={regime} onValueChange={(v) => setRegime(v as Regime)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Regular</SelectItem>
                  <SelectItem value="RIA">RIA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Régimen de Salud</label>
              <Select
                value={healthScheme}
                onValueChange={(v) => setHealthScheme(v as HealthScheme)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESSALUD">EsSalud (9%)</SelectItem>
                  <SelectItem value="EPS">EPS (6.75%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Sueldo + Vales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {country === 'EC' ? 'Sueldo Bruto Mensual' : 'Sueldo Básico'}
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {country === 'EC' ? '$' : 'S/'}
                  </span>
                  <Input
                    value={basicSalary}
                    onChange={(e) =>
                      setBasicSalary(
                        e.target.value.replace(',', '.').replace(/[^0-9.]/g, '')
                      )
                    }
                    className="pl-8 font-mono"
                  />
                </div>
              </TooltipTrigger>
              {basicSalary && (
                <TooltipContent>{basicSalaryMoney}</TooltipContent>
              )}
            </Tooltip>
          </div>

          {country === 'PE' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Vales de Alimentación</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    value={foodAllowance}
                    onChange={(e) =>
                      setFoodAllowance(
                        e.target.value.replace(',', '.').replace(/[^0-9.]/g, '')
                      )
                    }
                  />
                </TooltipTrigger>
                {foodAllowance && (
                  <TooltipContent>{foodAllowanceMoney}</TooltipContent>
                )}
              </Tooltip>
            </div>
          )}
        </div>

        {/* Bonos + Asignación (Perú) */}
        {country === 'PE' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bonos (en sueldos)</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    value={bonusMultiples}
                    onChange={(e) =>
                      setBonusMultiples(
                        e.target.value.replace(',', '.').replace(/[^0-9.]/g, '')
                      )
                    }
                  />
                </TooltipTrigger>
                <TooltipContent>
                  Equivale a {bonusAmountMoney}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={hasFamilyAllowance}
                onCheckedChange={(v) => setHasFamilyAllowance(!!v)}
              />
              <label className="text-sm font-medium">Asignación Familiar</label>
            </div>
          </>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleCalculate}
            disabled={!toNumber(basicSalary) || loading}
            className="flex-1"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            <span className="ml-2">Calcular</span>
          </Button>

          <Button variant="clear" onClick={handleClear}>
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InputsCard;
