import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

import InputsCard from '@/components/salary/InputsCard';
import KPICards from '@/components/salary/KPICards';
import AnnualMetrics from '@/components/salary/AnnualMetrics';
import ChartsPanel from '@/components/salary/ChartsPanel';
import BreakdownAccordion from '@/components/salary/BreakdownAccordion';
import BonusMetrics from '@/components/salary/BonusMetrics';

import {
  calculateSalary,
  computeBonusGross,
  computeBonusNetFifthOnlyFromResults,
} from '@/utils/salaryCalculator';

import { calculateSalaryECU } from '@/utils/salaryCalculatorECU';

import type { SalaryInputs, SalaryResults } from '@/utils/salaryCalculator';

import logo from '/Intercorp_Retail.svg';

/* ===================== Tipos ===================== */
type Country = 'PE' | 'EC';

/* ===================== Component ===================== */

const SalaryCalculator: React.FC = () => {
  const [results, setResults] = useState<SalaryResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Perú
  const [lastInputs, setLastInputs] = useState<SalaryInputs | null>(null);
  const [bonusMultiples, setBonusMultiples] = useState<number>(0);

  // País
  const [selectedCountry, setSelectedCountry] = useState<Country>('PE');

  /* ================= CALCULAR ================= */
  const handleCalculate = useCallback(
    async (inputs: any) => {
      setResults(null);
      setLoading(true);

      try {
        await new Promise((r) => setTimeout(r, 500));

        let calculatedResults: SalaryResults;

        if (selectedCountry === 'EC') {
          calculatedResults = calculateSalaryECU({
            basicSalary: inputs.grossMonthly ?? inputs.basicSalary,
            year: inputs.year,
          });
        } else {
          const peInputs = inputs as SalaryInputs;
          setLastInputs(peInputs);
          calculatedResults = calculateSalary(peInputs);
        }

        setResults(calculatedResults);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [selectedCountry]
  );

  /* ================= LIMPIAR ================= */
  const handleClear = useCallback(() => {
    setResults(null);
    setLastInputs(null);
    setBonusMultiples(0);
  }, []);

  /* ================= DERIVADOS ================= */
  const regime = results?.regime ?? 'NORMAL';
  const healthScheme = results?.healthScheme ?? 'ESSALUD';
  const healthRateLabel = healthScheme === 'EPS' ? '6.75%' : '9%';
  const riaAliquots = results?.riaAliquots ?? null;

  const loadingUI = loading;

  /* ================= BONOS PERÚ ================= */
  const bonusGross = useMemo(() => {
    if (!results || selectedCountry !== 'PE') return 0;
    return computeBonusGross(
      results.basicSalary,
      results.foodAllowance,
      bonusMultiples
    );
  }, [results, bonusMultiples, selectedCountry]);

  const bonusNet = useMemo(() => {
    if (!results || !lastInputs || selectedCountry !== 'PE') return 0;
    return computeBonusNetFifthOnlyFromResults(
      lastInputs,
      results,
      bonusGross
    ).bonusNet;
  }, [results, lastInputs, bonusGross, selectedCountry]);

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b-4 border-blue-600">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-700">
              💰 Sueldo Neto {selectedCountry === 'EC' ? 'Ecuador' : 'Perú'}
            </h1>
            <p className="text-blue-700/80">
              Calculadora salarial completa y comparable
            </p>
          </div>
          <img src={logo} className="h-10" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-4">
          <InputsCard
            onCalculate={handleCalculate}
            onClear={handleClear}
            loading={loadingUI}
            onBonusMultiplesChange={setBonusMultiples}
            onCountryChange={setSelectedCountry}
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-8 space-y-6">
          {!loading && results && (
            <>
              {/* KPIs */}
              <KPICards
                country={selectedCountry}
                grossSalary={results.grossMonthlySalary}
                netSalary={results.netMonthlySalary}
                netSalaryYear2={
                  selectedCountry === 'EC'
                    ? results.netMonthlySalaryYear2
                    : undefined
                }
                foodAllowance={results.foodAllowance}
                loading={loadingUI}
                afpDeduction={results.afpDeduction}
                fifthCategoryTax={results.fifthCategoryTax}
                iessDeduction={
                  selectedCountry === 'EC'
                    ? results.afpDeduction
                    : undefined
                }
                incomeTax={
                  selectedCountry === 'EC'
                    ? results.fifthCategoryTax
                    : undefined
                }
                decimoThird={
                  selectedCountry === 'EC'
                    ? results.christmasBonus / 12
                    : undefined
                }
                decimoFourth={
                  selectedCountry === 'EC'
                    ? results.julyBonus / 12
                    : undefined
                }
                reserveFund={
                  selectedCountry === 'EC'
                    ? results.netMonthlySalaryYear2 -
                      results.netMonthlySalary
                    : undefined
                }
              />

              {/* Bonos Perú */}
              {selectedCountry === 'PE' &&
                (bonusGross > 0 || bonusNet > 0) && (
                  <BonusMetrics
                    bonusGross={bonusGross}
                    bonusNet={bonusNet}
                  />
                )}

              {/* ================= MÉTRICAS ANUALES ================= */}
              <AnnualMetrics
                country={selectedCountry}

                /* Común */
                annualGrossIncome={results.annualGrossIncome}
                christmasBonus={results.christmasBonus}
                julyBonus={results.julyBonus}
                healthBonus={results.healthBonus}
                totalAnnualIncome={results.totalAnnualIncome}
                netAnnualSalary={results.netAnnualSalary}
                loading={loadingUI}
                regime={regime}
                healthRateLabel={healthRateLabel}
                riaAliquots={riaAliquots}
                annualFoodAllowance={results.annualFoodAllowance}

                /* Perú */
                bonusGross={selectedCountry === 'PE' ? bonusGross : 0}
                bonusNet={selectedCountry === 'PE' ? bonusNet : undefined}

                /* Ecuador */
                grossAnnual13={
                  selectedCountry === 'EC'
                    ? results.grossMonthlySalary * 13
                    : 0
                }
                decimoFourthAnnual={
                  selectedCountry === 'EC'
                    ? results.julyBonus
                    : 0
                }
                reserveFundAnnual={
                  selectedCountry === 'EC'
                    ? results.netAnnualSalary -
                      results.netMonthlySalary * 12
                    : 0
                }
                totalAnnualCost={
                  selectedCountry === 'EC'
                    ? results.grossMonthlySalary * 13 +
                      results.julyBonus +
                      (results.netAnnualSalary -
                        results.netMonthlySalary * 12)
                    : 0
                }
                  grossAnnual12={
                    selectedCountry === 'EC' ? results.grossAnnual12 : 0
                  }
                  iessAnnual12={
                    selectedCountry === 'EC' ? results.iessAnnual12 : 0
                  }
              />

              <ChartsPanel
                grossSalary={results.grossMonthlySalary}
                afpDeduction={results.afpDeduction}
                fifthCategoryTax={results.fifthCategoryTax}
                netSalary={results.netMonthlySalary}
              />

              <BreakdownAccordion
                breakdown={results.breakdown}
                loading={loadingUI}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SalaryCalculator;
