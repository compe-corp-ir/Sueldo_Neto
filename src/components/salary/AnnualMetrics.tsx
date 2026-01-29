import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Coins, Percent } from 'lucide-react';
import { formatCurrency } from '@/utils/salaryCalculator';
import type { Regime } from '@/utils/salaryCalculator';

/* ===================== Tipos ===================== */

interface RiaAliquots {
  baseSF: number;
  gratiAliquot: number;
  bonoAliquot: number;
  ctsAliquot: number;
  healthRateLabel?: string;
}

interface AnnualMetricsProps {
  annualGrossIncome: number;
  christmasBonus: number;
  julyBonus: number;
  healthBonus: number;
  totalAnnualIncome: number;
  netAnnualSalary: number;
  loading?: boolean;
  grossAnnual12?: number;
  iessAnnual12?: number;

  regime?: Regime;
  healthRateLabel?: string;
  riaAliquots?: RiaAliquots | null;

  annualFoodAllowance?: number;

  bonusGross?: number;
  bonusNet?: number;

  /** País */
  country?: 'PE' | 'EC';

  /** Solo Ecuador */
  grossAnnual13?: number;
  decimoFourthAnnual?: number;
  reserveFundAnnual?: number;
  totalAnnualCost?: number;
}

/* ===================== Component ===================== */

const AnnualMetrics: React.FC<AnnualMetricsProps> = ({
  annualGrossIncome,
  christmasBonus,
  julyBonus,
  healthBonus,
  totalAnnualIncome,
  netAnnualSalary,
  loading = false,

  regime = 'NORMAL',
  healthRateLabel = '9%',
  riaAliquots = null,
  grossAnnual12 = 0,
  iessAnnual12 = 0,
  annualFoodAllowance = 0,
  bonusGross = 0,
  bonusNet,

  country = 'PE',

  grossAnnual13 = 0,
  decimoFourthAnnual = 0,
  reserveFundAnnual = 0,
  totalAnnualCost = 0,
}) => {
  const isRIA = regime === 'RIA';
  const isEC = country === 'EC';

  const hasVales = annualFoodAllowance > 0;
  const hasBonusGross = bonusGross > 0;
  const hasBonusNet = typeof bonusNet === 'number' && bonusNet > 0;

  const totalWithBonus =
    totalAnnualIncome + (hasBonusGross ? bonusGross : 0);

  /* ===================== LABEL TOTAL (PERÚ) ===================== */
  const totalLabelNode = hasBonusGross ? (
    <>
      Total Ingresos Anuales ( Bonos +
      <br className="block sm:hidden" />
      <span className="text-[10px]">
        2 Gratificaciones + Bono Essalud + 12 Sueldos)
      </span>
    </>
  ) : (
    <>
      Total Ingresos Anuales
      <br className="block sm:hidden" />
      <span className="text-[10px]">
        (2 Gratificaciones + Bono Essalud + 12 Sueldos)
      </span>
    </>
  );

  /* ===================== MÉTRICAS PERÚ ===================== */
  const peruMetrics = [
    {
      key: 'gross12',
      label: 'Ingresos Anuales (12 sueldos)',
      value: annualGrossIncome,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    ...(hasVales
      ? [
          {
            key: 'vales',
            label: 'Vales de Alimentos (12 meses)',
            value: annualFoodAllowance,
            icon: Coins,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          },
        ]
      : []),
    {
      key: 'grati',
      label: 'Gratificación Julio-Diciembre',
      value: christmasBonus + julyBonus,
      icon: Percent,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      key: 'essalud',
      label: `Bono Essalud (${healthRateLabel})`,
      value: healthBonus,
      icon: Percent,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    },
    {
      key: 'total',
      labelNode: totalLabelNode,
      value: totalWithBonus,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    ...(hasBonusNet
      ? [
          {
            key: 'bonusNet',
            label: 'Bono Neto',
            value: bonusNet as number,
            icon: Coins,
            color: 'text-green-700',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
          },
        ]
      : []),
  ];

  /* ===================== MÉTRICAS ECUADOR ===================== */
  const ecuadorMetrics = [
    {
    key: 'gross12',
    label: 'Sueldo Bruto Anual (12)',
    value: grossAnnual12,
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'iess12',
    label: 'IESS Anual (12 meses)',
    value: iessAnnual12,
    icon: Percent,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
    {
      key: 'gross13',
      label: 'Sueldo Bruto Anual (13 sueldos)',
      value: grossAnnual13,
      icon: TrendingUp,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'decimo4',
      label: 'Décimo Cuarto',
      value: decimoFourthAnnual,
      icon: Percent,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
    },
    {
      key: 'reserve',
      label: 'Fondo de Reserva',
      value: reserveFundAnnual,
      icon: Coins,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
    },
    {
      key: 'cost',
      label: 'Costo Anual Empresa',
      value: totalAnnualCost,
      icon: TrendingUp,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      fullRow: false ,
    },
  ];

  const metrics = isEC ? ecuadorMetrics : peruMetrics;

  /* ===================== Card ===================== */
  const MetricCard = ({
    label,
    labelNode,
    value,
    icon: Icon,
    color,
    bgColor,
    fullRow,
  }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`h-[96px] p-3 rounded-lg border ${bgColor} ${
        fullRow ? 'sm:col-span-3' : ''
      }`}
    >
      <div className="grid grid-cols-[auto,1fr] items-center gap-3 h-full">
        <Icon className={`w-6 h-6 ${color}`} />
        <div className="text-center w-full">
          <p className="text-xs uppercase text-muted-foreground">
            {labelNode ?? label}
          </p>
          <p className={`text-xl font-bold ${color}`}>
            {loading ? '—' : formatCurrency(value || 0)}
          </p>
        </div>
      </div>
    </motion.div>
  );

  /* ===================== Render ===================== */
  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-6 h-6 text-primary" />
          Métricas Anuales
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isRIA && (
          <div
            className={`grid gap-4 ${
              isEC
                ? 'grid-cols-1 sm:grid-cols-3'
                : hasVales
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2'
            }`}
          >
            {metrics.map((m: any) => (
              <MetricCard key={m.key} {...m} />
            ))}
          </div>
        )}

        {/* ================= RIA (INTACTO) ================= */}
        {isRIA && riaAliquots && (
          /*
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-4 rounded-lg border bg-muted/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">
                Alícuotas RIA (mensualizadas)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded bg-white/60 border">
                <p className="text-xs text-muted-foreground">
                  Alícuota Gratificación
                </p>
                <p className="font-bold">
                  {formatCurrency(riaAliquots.gratiAliquot)}
                </p>
              </div>

              <div className="p-3 rounded bg-white/60 border">
                <p className="text-xs text-muted-foreground">
                  Alícuota Bono Extraord.
                </p>
                <p className="font-bold">
                  {formatCurrency(riaAliquots.bonoAliquot)}
                </p>
              </div>

              <div className="p-3 rounded bg-white/60 border">
                <p className="text-xs text-muted-foreground">
                  Alícuota CTS mensual
                </p>
                <p className="font-bold">
                  {formatCurrency(riaAliquots.ctsAliquot)}
                </p>
              </div>
            </div>
          </motion.div>
          */
         <div
            className={`grid gap-4 ${
              isEC
                ? 'grid-cols-1 sm:grid-cols-3'
                : hasVales
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2'
            }`}
          >
            {metrics.map((m: any) => (
              <MetricCard key={m.key} {...m} />
            ))}
          </div>
        )}

        {/* Neto anual (ambos países) */}
        <div className="mt-4 p-6 rounded-lg bg-gradient-to-r from-primary/10 to-success/10 border">
          <div className="text-center">
            <p className="text-sm uppercase text-muted-foreground mb-2">
              💰 Sueldo Neto Anual Total
            </p>
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              {formatCurrency(netAnnualSalary)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnnualMetrics;
