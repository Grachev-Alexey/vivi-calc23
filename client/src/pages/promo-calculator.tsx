import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RangeSlider } from "@/components/ui/range-slider";
import {
  LogOut,
  Sparkles,
  BarChart3,
  ShoppingBag,
  Wallet,
  CalendarClock,
  Gift,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { useCalculator } from "@/hooks/use-calculator";
import { formatPrice } from "@/lib/utils";
import ServiceSelector from "@/components/service-selector";
import ClientModal from "@/components/client-modal";
import MasterSalesModal from "@/components/master-sales-modal";
import { usePackagePerks } from "@/hooks/use-package-perks";
import ThreeBlockComparison from "@/components/three-block-comparison";

interface User {
  id: number;
  name: string;
  role: "master" | "admin";
}

interface PromoCalculatorPageProps {
  user: User;
  onLogout: () => void;
}

const FREE_ZONE_REASONS = [
  { title: "За подругу", value: "1 зона" },
  { title: "Отзыв в Яндекс.Картах", value: "1 зона" },
  { title: "Отзыв в 2ГИС", value: "1 зона" },
  { title: "Рекомендация в соцсетях", value: "1 зона" },
];

export default function PromoCalculatorPage({ user, onLogout }: PromoCalculatorPageProps) {
  const [showClientModal, setShowClientModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  const packagePerksQuery = usePackagePerks();
  const packagePerkValues = packagePerksQuery.data || [];

  const {
    selectedServices,
    procedureCount,
    downPayment,
    installmentMonths,
    freeZones,
    calculation,
    selectedPackage,
    packages,
    calculatorSettings,
    correctionPercent,
    manualGiftSessions,
    handleSessionCountChange,
    setSelectedServices,
    setProcedureCount,
    setDownPayment,
    setInstallmentMonths,
    setFreeZones,
    setCorrectionPercent,
    setManualGiftSessions,
    setSelectedPackage,
    getMinDownPayment,
    getMaxDownPayment,
  } = useCalculator();

  const selectedPackageData =
    selectedPackage && calculation?.packages
      ? (calculation.packages as any)[selectedPackage]
      : null;

  // Auto-select first available package as soon as a calculation appears
  useEffect(() => {
    if (selectedPackage || !calculation?.packages) return;
    const order = ["vip", "standard", "economy"];
    const pick = order.find((t) => (calculation.packages as any)[t]?.isAvailable !== false);
    if (pick) setSelectedPackage(pick);
  }, [calculation, selectedPackage, setSelectedPackage]);

  const getMonthLabel = (n: number) =>
    n === 1 ? "месяц" : n <= 4 ? "месяца" : "месяцев";

  return (
    <div className="h-screen flex flex-col promo-background overflow-hidden">
      {/* TOP NAV */}
      <header className="flex-shrink-0 border-b backdrop-blur-xl"
              style={{
                borderColor: "hsla(43, 88%, 56%, 0.15)",
                background: "linear-gradient(180deg, hsla(222, 45%, 7%, 0.92), hsla(222, 45%, 5%, 0.85))",
              }}>
        <div className="px-5 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="text-2xl font-black tracking-[-0.04em] leading-none"
              style={{
                fontFamily: "'Manrope', sans-serif",
                background: "linear-gradient(135deg, hsl(43, 95%, 75%) 0%, hsl(36, 80%, 50%) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ЭНСО
            </div>
            <div className="h-7 w-px hidden sm:block"
                 style={{ background: "linear-gradient(180deg, transparent, hsla(43,88%,56%,0.4), transparent)" }} />
            <div className="hidden sm:flex flex-col leading-tight">
              <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-medium">Студия лазерной эпиляции</div>
              <div className="text-sm font-semibold text-foreground/90">Калькулятор абонементов</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
                 style={{ background: "hsla(220, 30%, 14%, 0.6)", border: "1px solid hsl(var(--border))" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--gold))", boxShadow: "0 0 8px hsl(var(--gold))" }} />
              <span className="text-xs font-medium">{user.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSalesModal(true)}
              title="Мои продажи"
              className="rounded-xl gap-2 text-muted-foreground hover:text-[hsl(var(--gold))]"
              data-testid="button-sales"
            >
              <BarChart3 size={15} />
              <span className="hidden lg:inline text-xs">Продажи</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              title="Выход"
              className="rounded-xl gap-2 text-muted-foreground hover:text-[hsl(var(--gold))]"
              data-testid="button-logout"
            >
              <LogOut size={15} />
            </Button>
          </div>
        </div>
      </header>

      {/* HERO BANNER (when package selected) */}
      {selectedPackage && selectedPackageData && (
        <div className="flex-shrink-0 px-5 lg:px-8 py-3 border-b"
             style={{ borderColor: "hsla(43,88%,56%,0.12)" }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: "linear-gradient(135deg, hsl(43,95%,62%), hsl(36,80%,45%))", boxShadow: "var(--shadow-gold)" }}>
                <Check className="w-5 h-5" style={{ color: "hsl(var(--navy))" }} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Выбран пакет
                </div>
                <div className="text-sm font-bold">
                  {packages.find((p) => p.type === selectedPackage)?.name}
                  <span className="ml-2 text-premium font-black">
                    {formatPrice(selectedPackageData.finalCost)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowClientModal(true)}
              disabled={!selectedServices.length}
              className="btn-premium rounded-xl gap-2 px-6"
              data-testid="button-checkout"
            >
              <ShoppingBag className="w-4 h-4" />
              Оформить абонемент
            </Button>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 p-4 lg:p-5">
        {/* LEFT — CONFIGURATOR */}
        <aside className="w-full lg:w-[340px] xl:w-[360px] flex-shrink-0 overflow-y-auto custom-scrollbar pr-1 space-y-3">
          {/* Section: Services */}
          <SectionCard
            icon={<SlidersHorizontal className="w-4 h-4" />}
            title="Услуги и сеансы"
            subtitle="Соберите курс из нужных зон"
          >
            <ServiceSelector
              selectedServices={selectedServices}
              onServicesChange={setSelectedServices}
              onAddFreeZone={setFreeZones}
              freeZones={freeZones}
              onSessionCountChange={handleSessionCountChange}
              calculatorSettings={calculatorSettings}
            />

            {calculation && calculation.baseCost > 0 && (
              <div className="mt-3 pt-3 border-t space-y-1.5"
                   style={{ borderColor: "hsl(var(--border))" }}>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">За одну процедуру</span>
                  <span className="font-semibold text-foreground/80">
                    {formatPrice(
                      selectedServices.reduce((sum, s) => {
                        const price = s.customPrice ? parseFloat(s.customPrice) : parseFloat(s.priceMin);
                        return sum + price * s.quantity;
                      }, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Базовая стоимость курса</span>
                  <span className="text-sm font-black text-premium">
                    {formatPrice(calculation.baseCost)}
                  </span>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Section: Down payment */}
          <SectionCard
            icon={<Wallet className="w-4 h-4" />}
            title={selectedPackage === "vip" ? "Полная предоплата" : "Первый взнос"}
            subtitle={selectedPackage === "vip" ? "VIP оплачивается единоразово" : "Сколько внести сейчас"}
          >
            <div className="text-center mb-3">
              <div className="text-2xl font-black text-premium leading-none mb-1">
                {selectedPackage === "vip"
                  ? formatPrice(calculation?.packages?.vip?.finalCost || calculation?.baseCost || 0)
                  : formatPrice(downPayment)}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {selectedPackage === "vip" ? "к оплате" : "первый платёж"}
              </div>
            </div>

            {selectedPackage === "vip" ? (
              <div className="h-2 rounded-full overflow-hidden"
                   style={{ background: "hsla(43, 88%, 56%, 0.15)" }}>
                <div className="h-full w-full"
                     style={{ background: "linear-gradient(90deg, hsl(43,88%,56%), hsl(36,80%,42%))" }} />
              </div>
            ) : (
              <RangeSlider
                min={getMinDownPayment()}
                max={getMaxDownPayment()}
                step={1}
                value={downPayment}
                onChange={setDownPayment}
                formatLabel={formatPrice}
              />
            )}
          </SectionCard>

          {/* Section: Installment */}
          {selectedPackage !== "vip" && (
            <SectionCard
              icon={<CalendarClock className="w-4 h-4" />}
              title="Рассрочка"
              subtitle="Без процентов, удобными платежами"
            >
              <div className="text-center mb-3">
                <div className="flex items-baseline justify-center gap-2 leading-none">
                  <span className="text-2xl font-black text-premium">{installmentMonths}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {getMonthLabel(installmentMonths)}
                  </span>
                </div>
              </div>
              <RangeSlider
                min={Math.min(...(calculatorSettings?.installmentMonthsOptions || [1]))}
                max={Math.max(...(calculatorSettings?.installmentMonthsOptions || [6]))}
                value={installmentMonths}
                onChange={setInstallmentMonths}
              />
              {selectedPackage && calculation && (
                <div className="mt-3 rounded-lg p-3 text-center"
                     style={{ background: "hsla(43,88%,56%,0.08)", border: "1px solid hsla(43,88%,56%,0.25)" }}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Платёж в месяц
                  </div>
                  <div className="text-lg font-black text-premium">
                    {formatPrice(
                      Math.max(0, ((calculation.packages as any)[selectedPackage]?.finalCost || 0) - downPayment) /
                        Math.max(1, installmentMonths)
                    )}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Section: Correction — discreet master-only tool */}
          <div
            className="rounded-xl px-3 py-2 flex items-center justify-between gap-2"
            style={{
              background: "hsla(220, 35%, 8%, 0.4)",
              border: "1px dashed hsla(218, 30%, 22%, 0.7)",
            }}
            title="Только для мастера"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--gold))", opacity: 0.7 }} />
              <span className="text-[11px] text-muted-foreground truncate">
                Доп. инструмент мастера
              </span>
            </div>
            {showCorrection ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={correctionPercent}
                  onChange={(e) => {
                    const v = Math.min(30, Math.max(0, parseFloat(e.target.value) || 0));
                    setCorrectionPercent(v);
                  }}
                  className="w-12 text-xs text-center rounded-md py-1 focus:outline-none"
                  data-testid="input-correction"
                />
                <span className="text-[11px] text-muted-foreground">%</span>
                <button
                  onClick={() => {
                    setCorrectionPercent(0);
                    setShowCorrection(false);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCorrection(true)}
                className="text-[11px] font-semibold hover:underline"
                style={{ color: "hsl(var(--gold))" }}
                data-testid="button-show-correction"
              >
                {correctionPercent > 0 ? `+${correctionPercent}%` : "настроить"}
              </button>
            )}
          </div>

          {/* Free zones quick toggle */}
          <SectionCard
            icon={<Gift className="w-4 h-4" />}
            title="Бонусные зоны"
            subtitle="Дополнительные подарки клиентке"
            compact
          >
            <div className="grid grid-cols-2 gap-1.5">
              {FREE_ZONE_REASONS.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg px-2.5 py-2 transition-colors"
                  style={{
                    background: "hsla(220, 30%, 10%, 0.5)",
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  <div className="text-[10px] text-muted-foreground leading-tight">{r.title}</div>
                  <div className="text-xs font-bold mt-0.5" style={{ color: "hsl(var(--gold))" }}>
                    {r.value}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>

        {/* RIGHT — PRICING CARDS */}
        <section className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
          {!calculation || calculation.baseCost === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md px-8">
                <div
                  className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, hsla(43,88%,56%,0.18), hsla(214,92%,56%,0.12))",
                    border: "1px solid hsla(43,88%,56%,0.3)",
                    boxShadow: "0 24px 60px -20px hsla(43,88%,56%,0.3)",
                  }}
                >
                  <Sparkles className="w-12 h-12" style={{ color: "hsl(var(--gold))" }} />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-3 leading-tight">
                  Подберите идеальный <br />
                  <span className="text-premium">абонемент для клиента</span>
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Соберите курс из нужных зон в левой панели — мы покажем три варианта пакетов с прозрачным расчётом скидки, рассрочки и подарочных сеансов
                </p>
              </div>
            </div>
          ) : (
            <ThreeBlockComparison
              calculation={calculation}
              packages={packages}
              selectedPackage={selectedPackage}
              onPackageSelect={setSelectedPackage}
              downPayment={downPayment}
              installmentMonths={installmentMonths}
              procedureCount={procedureCount}
              packagePerkValues={packagePerkValues}
              calculatorSettings={calculatorSettings}
              freeZones={freeZones}
              selectedServices={selectedServices.map((s) => ({
                ...s,
                serviceId: s.yclientsId,
                pricePerProcedure: parseFloat(s.priceMin),
              }))}
              bulkDiscountThreshold={calculatorSettings?.bulkDiscountThreshold || 15}
              bulkDiscountPercentage={calculatorSettings?.bulkDiscountPercentage || 0.05}
              correctionPercent={correctionPercent}
              manualGiftSessions={manualGiftSessions}
              onManualGiftSessionsChange={setManualGiftSessions}
            />
          )}
        </section>
      </main>

      {showClientModal && (
        <ClientModal
          isOpen={showClientModal}
          onClose={() => setShowClientModal(false)}
          calculation={calculation}
          selectedPackage={selectedPackage}
          selectedServices={selectedServices}
          procedureCount={procedureCount}
          downPayment={downPayment}
          installmentMonths={installmentMonths}
          freeZones={freeZones}
          manualGiftSessions={manualGiftSessions}
          user={user}
        />
      )}

      {showSalesModal && (
        <MasterSalesModal
          isOpen={showSalesModal}
          onClose={() => setShowSalesModal(false)}
          masterName={user.name}
        />
      )}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className="rounded-2xl backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(160deg, hsla(222, 38%, 11%, 0.92) 0%, hsla(220, 36%, 7%, 0.85) 100%)",
        border: "1px solid hsl(var(--border))",
        boxShadow:
          "0 12px 32px -16px rgba(0,0,0,0.5), inset 0 1px 0 hsla(0,0%,100%,0.04)",
      }}
    >
      <div className={`px-4 ${compact ? "py-3" : "pt-3.5 pb-3"} flex items-start gap-3`}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            background:
              "linear-gradient(135deg, hsla(43,88%,56%,0.2), hsla(43,88%,56%,0.05))",
            border: "1px solid hsla(43,88%,56%,0.3)",
            color: "hsl(var(--gold))",
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold tracking-tight text-foreground leading-tight">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</div>
          )}
        </div>
      </div>
      <div className={`px-4 ${compact ? "pb-3" : "pb-4"}`}>{children}</div>
    </div>
  );
}
