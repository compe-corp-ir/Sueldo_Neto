import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Coins, CheckCircle2, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/utils/salaryCalculator';


function currencySafe(v: number): number {
  return Number(v.toFixed(0));
}

interface BonusMetricsProps {
  bonusGross?: number;
  bonusNet?: number;
  loading?: boolean;
  /** Opcional: abrir por defecto (true) o cerrado (false) */
  defaultExpanded?: boolean;
}

const BonusMetrics: React.FC<BonusMetricsProps> = ({
  bonusGross = 0,
  bonusNet = 0,
  loading = false,
  defaultExpanded = false,
}) => {
  const [open, setOpen] = useState<boolean>(defaultExpanded);

  const items = [
    {
      label: 'Bono Bruto',
      value: bonusGross,
      icon: Coins,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Bono Neto',
      value: currencySafe(bonusNet),
      icon: CheckCircle2,
      color: 'text-green-700',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
  ].filter((i) => typeof i.value === 'number' && i.value > 0);

  // si no hay datos y no estamos cargando, ocultar todo el card
  if (items.length === 0 && !loading) return null;

  const MetricCard: React.FC<{
    label: string;
    value: number;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
    bgColor: string;
    delay?: number;
  }> = ({ label, value, icon: Icon, color, bgColor, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`h-[96px] p-3 rounded-lg border ${bgColor} hover:scale-[1.02] transition-all duration-200`}
    >
      <div className="grid grid-cols-[auto,1fr] items-center gap-3 h-full">
        <Icon className={`w-6 h-6 ${color}`} />
        <div className="flex flex-col items-center justify-center text-center px-1">
          <p className="text-sm font-semibold leading-snug text-muted-foreground uppercase tracking-wide">
            {label}
          </p>

          {loading ? (
            <div className="animate-pulse mt-1 w-24 h-4 bg-muted rounded" />
          ) : (
            <motion.p
              key={value}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, type: 'spring', stiffness: 220 }}
              className={`text-xl font-bold ${color} mt-1`}
            >
              {formatCurrency(value || 0)}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <Card className="shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-in">
      <CardHeader className="pb-3">
        {/* Botón de cabecera: título + flecha a la derecha */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="
            w-full flex items-center justify-between gap-3
            text-left group focus:outline-none
          "
        >
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-semibold text-card-foreground">
              Métricas de Bonos
            </CardTitle>
          </div>

          <div className="flex items-center gap-3">
            
            <motion.span
              initial={false}
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="
                inline-flex items-center justify-center rounded-md
                border bg-background w-7 h-7 shrink-0
                group-hover:bg-muted
              "
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.span>
          </div>
        </button>
      </CardHeader>

      {/* Contenido colapsable */}
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.length > 0 ? (
              items.map((m, i) => <MetricCard key={m.label} {...m} delay={i * 0.08} />)
            ) : (
              <>
                <MetricCard
                  label="Bono Bruto"
                  value={0}
                  icon={Coins}
                  color="text-amber-600"
                  bgColor="bg-amber-50 dark:bg-amber-900/20"
                />
                <MetricCard
                  label="Bono Neto"
                  value={0}
                  icon={CheckCircle2}
                  color="text-green-700"
                  bgColor="bg-green-50 dark:bg-green-900/20"
                />
              </>
            )}
          </div>
        </CardContent>
      </motion.div>
    </Card>
  );
};

export default BonusMetrics;
