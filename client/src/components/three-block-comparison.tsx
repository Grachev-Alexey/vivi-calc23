import { Crown, Star, Leaf, Gift, Check, Minus, Sparkles, TrendingDown, Wallet, BadgeCheck } from "lucide-react";
import * as Icons from "lucide-react";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";

interface Package {
  id: number;
  type: string;
  name: string;
  discount: string;
  minCost: string;
  minDownPaymentPercent: string;
  requiresFullPayment: boolean;
  giftSessions: number;
  bonusAccountPercent: string;
}

interface PackagePerkValue {
  packageType: string;
  perkId: number;
  valueType: string;
  booleanValue?: boolean;
  textValue?: string;
  numberValue?: number;
  displayValue: string;
  tooltip?: string;
  perk: {
    id: number;
    name: string;
    icon: string;
    iconColor?: string;
    displayOrder?: number;
  };
}

interface SelectedService {
  serviceId: number;
  title: string;
  pricePerProcedure: number;
  priceMin?: string;
  quantity: number;
  customPrice?: string;
}

interface ThreeBlockComparisonProps {
  calculation: any;
  selectedPackage: string | null;
  onPackageSelect: (packageType: string) => void;
  packages: Package[];
  downPayment: number;
  installmentMonths: number;
  procedureCount: number;
  packagePerkValues?: PackagePerkValue[];
  calculatorSettings?: any;
  freeZones?: Array<any>;
  selectedServices?: SelectedService[];
  bulkDiscountThreshold?: number;
  bulkDiscountPercentage?: number;
  correctionPercent?: number;
  manualGiftSessions?: Record<string, number>;
  onManualGiftSessionsChange?: (sessions: Record<string, number>) => void;
}

const PACKAGE_META: Record<string, {
  Icon: any;
  tagline: string;
  subtitle: string;
  badge?: string;
  highlight: boolean;
  gradient: string;
  border: string;
  glow: string;
  iconBg: string;
  accent: string;
}> = {
  vip: {
    Icon: Crown,
    tagline: "Полный комфорт без ограничений",
    subtitle: "Максимум привилегий",
    badge: "Лучший выбор",
    highlight: true,
    gradient: "linear-gradient(160deg, hsla(43, 88%, 56%, 0.16) 0%, hsla(43, 80%, 40%, 0.08) 60%, hsla(222, 38%, 11%, 0.95) 100%)",
    border: "1.5px solid hsla(43, 88%, 56%, 0.55)",
    glow: "0 10px 28px -16px hsla(43, 88%, 56%, 0.35), inset 0 1px 0 hsla(0,0%,100%,0.08)",
    iconBg: "linear-gradient(135deg, hsl(43, 95%, 65%), hsl(36, 80%, 45%))",
    accent: "hsl(43, 90%, 65%)",
  },
  standard: {
    Icon: Star,
    tagline: "Оптимальный баланс цены и привилегий",
    subtitle: "Самый популярный",
    highlight: false,
    gradient: "linear-gradient(160deg, hsla(214, 92%, 56%, 0.10) 0%, hsla(220, 80%, 30%, 0.05) 60%, hsla(222, 38%, 10%, 0.92) 100%)",
    border: "1.5px solid hsla(214, 92%, 56%, 0.35)",
    glow: "0 8px 22px -14px hsla(214, 92%, 56%, 0.25), inset 0 1px 0 hsla(0,0%,100%,0.05)",
    iconBg: "linear-gradient(135deg, hsl(214, 95%, 65%), hsl(220, 80%, 40%))",
    accent: "hsl(214, 95%, 70%)",
  },
  economy: {
    Icon: Leaf,
    tagline: "Лёгкий старт в мир ухода",
    subtitle: "Доступный вход",
    highlight: false,
    gradient: "linear-gradient(160deg, hsla(220, 30%, 18%, 0.5) 0%, hsla(222, 38%, 10%, 0.92) 100%)",
    border: "1px solid hsl(var(--border))",
    glow: "0 6px 18px -12px rgba(0,0,0,0.5), inset 0 1px 0 hsla(0,0%,100%,0.04)",
    iconBg: "linear-gradient(135deg, hsl(218, 30%, 35%), hsl(220, 30%, 22%))",
    accent: "hsl(210, 30%, 80%)",
  },
};

export default function ThreeBlockComparison({
  calculation,
  selectedPackage,
  onPackageSelect,
  packages,
  downPayment,
  installmentMonths,
  procedureCount,
  packagePerkValues = [],
  calculatorSettings,
  freeZones = [],
  selectedServices = [],
  bulkDiscountThreshold = 15,
  bulkDiscountPercentage = 0.05,
  correctionPercent = 0,
  manualGiftSessions = {},
  onManualGiftSessionsChange,
}: ThreeBlockComparisonProps) {
  const [editingGift, setEditingGift] = useState<string | null>(null);
  const [tempGift, setTempGift] = useState("");

  const packageTypes = ["vip", "standard", "economy"];
  const hasValidCalculation = calculation && calculation.baseCost > 0;

  const getPackageData = (t: string) => {
    if (!hasValidCalculation) return null;
    return (calculation.packages as any)[t] || null;
  };

  const getPkg = (t: string) => packages.find((p) => p.type === t);

  const getDiscountPercent = (t: string) => {
    const pkg = getPkg(t);
    if (!pkg) return 0;
    let p = parseFloat(pkg.discount) * 100;
    if (procedureCount >= bulkDiscountThreshold) p += bulkDiscountPercentage * 100;
    p += correctionPercent;
    return Math.round(p);
  };

  const uniquePerks = Array.from(
    new Map(packagePerkValues.map((pv) => [pv.perk.id, pv.perk])).values()
  ).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const computeDownForPkg = (t: string): number => {
    const pkgData = getPackageData(t);
    const pkg = getPkg(t);
    if (!pkgData || !pkg) return 0;
    if (t === "vip") return pkgData.finalCost;
    if (selectedPackage === t) return downPayment;
    const minPct = parseFloat(pkg.minDownPaymentPercent.toString());
    const calc = Math.round(pkgData.finalCost * minPct);
    const absMin = calculatorSettings?.minimumDownPayment || 5000;
    return Math.max(calc, absMin);
  };

  const computeMonthly = (t: string): number => {
    const pkgData = getPackageData(t);
    if (!pkgData || t === "vip") return 0;
    if (selectedPackage === t) {
      return Math.round(Math.max(0, (pkgData.finalCost - downPayment)) / Math.max(1, installmentMonths));
    }
    const months = Math.min(...(calculatorSettings?.installmentMonthsOptions || [1]));
    const dp = computeDownForPkg(t);
    return Math.round(Math.max(0, pkgData.finalCost - dp) / Math.max(1, months));
  };

  if (!hasValidCalculation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md px-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
               style={{ background: "linear-gradient(135deg, hsla(43,88%,56%,0.15), hsla(214,92%,56%,0.1))", border: "1px solid hsla(43,88%,56%,0.3)" }}>
            <Sparkles className="w-9 h-9" style={{ color: "hsl(var(--gold))" }} />
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-tight">
            Подберите идеальный <span className="text-premium">абонемент</span>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Выберите услуги в левой панели — и калькулятор покажет три варианта пакетов с расчётом скидки, рассрочки и подарочных сеансов
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full content-start">
      {packageTypes.map((type) => {
        const meta = PACKAGE_META[type];
        const Icon = meta.Icon;
        const pkg = getPkg(type);
        const pkgData = getPackageData(type);
        const isSelected = selectedPackage === type;
        const isAvailable = pkgData?.isAvailable !== false;
        const finalCost = pkgData?.finalCost || 0;
        const discountPct = getDiscountPercent(type);
        const savings = calculation.baseCost - finalCost;
        const dp = computeDownForPkg(type);
        const monthly = computeMonthly(type);
        const giftSessions =
          manualGiftSessions[type] !== undefined
            ? manualGiftSessions[type]
            : pkg?.giftSessions || 0;
        const bonusPct = parseFloat(pkg?.bonusAccountPercent || "0");
        const bonusAmount = Math.round(finalCost * (bonusPct / 100));

        const cardPerks = uniquePerks
          .filter((perk) => {
            if (perk.name === "Гарантия возврата денег" && procedureCount < 10) return false;
            const pv = packagePerkValues.find(
              (v) => v.packageType === type && v.perkId === perk.id
            );
            if (!pv) return false;
            if (pv.valueType === "boolean" && pv.booleanValue === false) return false;
            const dv = (pv.displayValue || "").trim();
            if (dv === "-" || dv === "—" || dv === "✕" || dv === "x" || dv === "Не включено") return false;
            return true;
          })
          .slice(0, 8);

        return (
          <div
            key={type}
            className={`relative flex flex-col rounded-2xl overflow-hidden transition-[border-color,box-shadow] duration-300 ${
              !isAvailable ? "opacity-50" : "cursor-pointer hover:border-[hsla(43,88%,56%,0.6)]"
            }`}
            style={{
              background: meta.gradient,
              border: isSelected
                ? `2px solid hsl(var(--gold))`
                : meta.border,
              boxShadow: isSelected
                ? "0 12px 32px -16px hsla(43,88%,56%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.08)"
                : meta.glow,
            }}
            onClick={() => isAvailable && onPackageSelect(type)}
            data-testid={`card-package-${type}`}
          >
            {/* Top badge */}
            {meta.badge && (
              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                   style={{
                     background: "linear-gradient(135deg, hsl(43, 95%, 65%), hsl(36, 80%, 45%))",
                     color: "hsl(var(--navy))",
                     boxShadow: "0 4px 12px hsla(43,88%,56%,0.4)",
                   }}>
                {meta.badge}
              </div>
            )}

            {/* Header */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: meta.iconBg, boxShadow: `0 8px 20px -8px ${meta.accent}` }}>
                  <Icon className="w-5 h-5" style={{ color: type === "economy" ? "hsl(var(--foreground))" : "hsl(var(--navy))" }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-black tracking-tight uppercase leading-none" style={{ color: meta.accent }}>
                    {pkg?.name || type}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
                    {meta.subtitle}
                  </div>
                </div>
              </div>
              <p className="text-xs text-foreground/70 leading-snug">{meta.tagline}</p>
            </div>

            {!isAvailable && (
              <div className="mx-5 mb-3 px-3 py-2 rounded-lg text-xs text-center"
                   style={{ background: "hsla(0,72%,52%,0.12)", color: "hsl(0, 80%, 75%)", border: "1px solid hsla(0,72%,52%,0.3)" }}>
                {pkgData?.unavailableReason || "Недоступен"}
              </div>
            )}

            {/* Price block */}
            <div className="px-5 pb-4">
              <div className="rounded-xl p-4 relative overflow-hidden"
                   style={{
                     background: "linear-gradient(160deg, hsla(220,40%,6%,0.6), hsla(222,38%,11%,0.4))",
                     border: "1px solid hsla(218, 30%, 22%, 0.7)",
                   }}>
                {savings > 0 && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs line-through text-muted-foreground/70">
                      {formatPrice(calculation.baseCost)}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                          style={{ background: "hsla(43,88%,56%,0.15)", color: "hsl(var(--gold))", border: "1px solid hsla(43,88%,56%,0.3)" }}>
                      −{discountPct}%
                    </span>
                  </div>
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black tracking-tight" style={{ color: meta.accent }}>
                    {formatPrice(finalCost)}
                  </span>
                </div>
                {savings > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs">
                    <TrendingDown className="w-3.5 h-3.5" style={{ color: "hsl(140, 70%, 55%)" }} />
                    <span className="font-semibold" style={{ color: "hsl(140, 70%, 70%)" }}>
                      Экономия {formatPrice(savings)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment plan */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-lg px-3 py-2"
                     style={{ background: "hsla(220,30%,10%,0.5)", border: "1px solid hsl(var(--border))" }}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Первый взнос
                  </div>
                  <div className="text-sm font-bold text-foreground">{formatPrice(dp)}</div>
                </div>
                <div className="rounded-lg px-3 py-2"
                     style={{ background: "hsla(220,30%,10%,0.5)", border: "1px solid hsl(var(--border))" }}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    {type === "vip" ? "Оплата" : "В месяц"}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {type === "vip" ? "Разово" : formatPrice(monthly)}
                  </div>
                </div>
              </div>
            </div>

            {/* Highlights row */}
            <div className="px-5 pb-3 flex flex-wrap gap-1.5">
              {procedureCount >= 10 && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors hover:bg-white/5"
                  style={{ background: "hsla(43,88%,56%,0.1)", border: "1px solid hsla(43,88%,56%,0.35)", color: "hsl(var(--gold))" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempGift(String(giftSessions));
                    setEditingGift(type);
                  }}
                  title="Нажмите, чтобы изменить"
                >
                  <Gift className="w-3 h-3" />
                  {editingGift === type ? (
                    <input
                      type="number"
                      min="0"
                      max="10"
                      autoFocus
                      value={tempGift}
                      onChange={(e) => setTempGift(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => {
                        const v = Math.max(0, Math.min(10, parseInt(tempGift) || 0));
                        onManualGiftSessionsChange?.({ ...manualGiftSessions, [type]: v });
                        setEditingGift(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = Math.max(0, Math.min(10, parseInt(tempGift) || 0));
                          onManualGiftSessionsChange?.({ ...manualGiftSessions, [type]: v });
                          setEditingGift(null);
                        }
                      }}
                      className="w-8 bg-transparent text-center outline-none text-[11px] font-bold"
                    />
                  ) : (
                    <span>+{giftSessions} {giftSessions === 1 ? "сеанс" : giftSessions < 5 ? "сеанса" : "сеансов"} в подарок</span>
                  )}
                </div>
              )}
              {bonusPct > 0 && bonusAmount > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                     style={{ background: "hsla(214,92%,56%,0.1)", border: "1px solid hsla(214,92%,56%,0.35)", color: "hsl(214, 95%, 75%)" }}>
                  <Wallet className="w-3 h-3" />
                  +{formatPrice(bonusAmount)} бонус
                </div>
              )}
            </div>

            {/* Perks list */}
            <div className="px-5 pb-4 flex-1 space-y-1.5">
              {cardPerks.map((perk) => {
                const PerkIcon = (Icons as any)[perk.icon] || BadgeCheck;
                const pv = packagePerkValues.find(
                  (v) => v.packageType === type && v.perkId === perk.id
                );
                const isText =
                  pv && pv.valueType !== "boolean" && pv.displayValue && pv.displayValue !== "Включено" && pv.displayValue !== "✓";
                return (
                  <div key={perk.id} className="flex items-start gap-2 text-xs">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                         style={{ background: "hsla(140,70%,45%,0.15)", border: "1px solid hsla(140,70%,45%,0.3)" }}>
                      <Check className="w-2.5 h-2.5" style={{ color: "hsl(140, 70%, 65%)" }} />
                    </div>
                    <span className="text-foreground/85 leading-snug">
                      {perk.name}
                      {isText && (
                        <span className="ml-1 font-semibold" style={{ color: meta.accent }}>
                          · {pv!.displayValue}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
              {cardPerks.length === 0 && (
                <div className="space-y-1.5">
                  {[
                    "Скидка на абонемент",
                    "Удобная рассрочка без процентов",
                    procedureCount >= 10 ? "Подарочные сеансы" : null,
                    "Бонусные зоны за активность",
                  ]
                    .filter(Boolean)
                    .map((label, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                             style={{ background: "hsla(140,70%,45%,0.15)", border: "1px solid hsla(140,70%,45%,0.3)" }}>
                          <Check className="w-2.5 h-2.5" style={{ color: "hsl(140, 70%, 65%)" }} />
                        </div>
                        <span className="text-foreground/85 leading-snug">{label}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <button
                disabled={!isAvailable}
                onClick={(e) => {
                  e.stopPropagation();
                  isAvailable && onPackageSelect(type);
                }}
                className="w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={
                  isSelected
                    ? {
                        background: "linear-gradient(135deg, hsl(43, 95%, 62%), hsl(36, 80%, 45%))",
                        color: "hsl(var(--navy))",
                        boxShadow: "0 12px 32px -10px hsla(43,88%,56%,0.5), inset 0 1px 0 hsla(0,0%,100%,0.2)",
                      }
                    : {
                        background: "hsla(220,30%,10%,0.6)",
                        color: "hsl(var(--foreground))",
                        border: "1px solid hsl(var(--border))",
                      }
                }
                data-testid={`button-select-${type}`}
              >
                {isSelected ? (
                  <span className="inline-flex items-center gap-2">
                    <Check className="w-4 h-4" /> Выбран
                  </span>
                ) : (
                  "Выбрать пакет"
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
