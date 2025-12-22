import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  CreditCard,
  FileText,
  CheckCircle2,
  Utensils,
  Gift,
} from 'lucide-react';

/* ===================== Tipos ===================== */

interface KPICardsProps {
  country?: 'PE' | 'EC';

  grossSalary: number;

  // Netos
  netSalary: number;           // Año 1
  netSalaryYear2?: number;     // Año 2 (EC)

  // 🇵🇪 Perú
  afpDeduction?: number;
  fifthCategoryTax?: number;
  foodAllowance?: number;

  // 🇪🇨 Ecuador
  iessDeduction?: number;
  incomeTax?: number;
  decimoThird?: number;
  decimoFourth?: number;
  reserveFund?: number;

  loading?: boolean;
}

/* ===================== Component ===================== */

const KPICards: React.FC<KPICardsProps> = ({
  country = 'PE',
  grossSalary,

  netSalary,
  netSalaryYear2,

  afpDeduction = 0,
  fifthCategoryTax = 0,
  foodAllowance = 0,

  iessDeduction = 0,
  incomeTax = 0,
  decimoThird = 0,
  decimoFourth = 0,
  reserveFund = 0,

  loading = false,
}) => {
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat(country === 'EC' ? 'es-EC' : 'es-PE', {
      style: 'currency',
      currency: country === 'EC' ? 'USD' : 'PEN',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ================= ECUADOR ================= */}
      {country === 'EC' && (
        <>
          {/* ===== Fila 1 ===== */}
          <div className="grid grid-cols-4 gap-3">
            <KPICard title="Salario Base" value={grossSalary} icon={TrendingUp} variant="gross" loading={loading} format={formatCurrency} />
            <KPICard title="Décimo Tercero" value={decimoThird} icon={Gift} variant="food" loading={loading} format={formatCurrency} />
            <KPICard title="Décimo Cuarto" value={decimoFourth} icon={Gift} variant="food" loading={loading} format={formatCurrency} />
            <KPICard title="Fondo de Reserva" value={reserveFund} icon={Gift} variant="food" loading={loading} format={formatCurrency} />
          </div>

          {/* ===== Fila 2 ===== */}
          <div className="grid grid-cols-4 gap-3">
            <KPICard title="IESS Personal (9.45%)" value={iessDeduction} icon={CreditCard} variant="deduction" loading={loading} format={formatCurrency} />
            <KPICard title="Impuesto a la Renta" value={incomeTax} icon={FileText} variant="tax" loading={loading} format={formatCurrency} />
            <KPICard title="Neto Mensual (Año 1)" value={netSalary} icon={CheckCircle2} variant="net" loading={loading} format={formatCurrency} />
            <KPICard title="Neto Mensual (Año 2)" value={netSalaryYear2 ?? netSalary} icon={CheckCircle2} variant="net" loading={loading} format={formatCurrency} />
          </div>
        </>
      )}

      {/* ================= PERÚ ================= */}
      {country === 'PE' && (
        <div className="grid grid-cols-5 gap-3">
          <KPICard title="Bruto Mensual" value={grossSalary} icon={TrendingUp} variant="gross" loading={loading} format={formatCurrency} />
          <KPICard title="AFP (Jubilación)" value={afpDeduction} icon={CreditCard} variant="deduction" loading={loading} format={formatCurrency} />
          <KPICard title="5ta Categoría" value={fifthCategoryTax} icon={FileText} variant="tax" loading={loading} format={formatCurrency} />
          {foodAllowance > 0 && (
            <KPICard title="Bono de Alimentos" value={foodAllowance} icon={Utensils} variant="food" loading={loading} format={formatCurrency} />
          )}
          <KPICard title="Neto Mensual" value={netSalary} icon={CheckCircle2} variant="net" loading={loading} format={formatCurrency} />
        </div>
      )}
    </div>
  );
};

/* ===================== KPI Card ===================== */

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  variant: 'gross' | 'deduction' | 'tax' | 'net' | 'food';
  loading: boolean;
  format: (v: number) => string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  variant,
  loading,
  format,
}) => {
  const styles: Record<string, string> = {
    gross: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
    deduction: 'from-orange-50 to-orange-100 border-orange-200 text-orange-700',
    tax: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700',
    net: 'from-green-50 to-emerald-100 border-green-200 text-green-700',
    food: 'from-yellow-50 to-amber-100 border-yellow-200 text-yellow-700',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`bg-gradient-to-r ${styles[variant]}`}>
        <CardContent className="p-4 text-center">
          <Icon className="mx-auto mb-2 h-4 w-4" />
          <p className="text-xs uppercase opacity-70">{title}</p>
          <p className="text-lg font-bold">
            {loading ? '—' : format(value)}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default KPICards;
