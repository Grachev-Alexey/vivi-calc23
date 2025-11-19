import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RangeSlider } from "@/components/ui/range-slider";
import {
  X,
  Moon,
  Sun,
  Crown,
  Star,
  Leaf,
  Gift,
  Sparkles,
  Check,
  BarChart3,
} from "lucide-react";
import * as Icons from "lucide-react";
import { useCalculator } from "@/hooks/use-calculator";
import { formatPrice } from "@/lib/utils";
import ServiceSelector from "@/components/service-selector";
import ClientModal from "@/components/client-modal";
import MasterSalesModal from "@/components/master-sales-modal";
import {
  usePackagePerks,
  type PackagePerkValue,
} from "@/hooks/use-package-perks";
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

interface PackageData {
  isAvailable: boolean;
  unavailableReason: string;
  finalCost: number;
  totalSavings: number;
  monthlyPayment: number;
  appliedDiscounts: Array<{ type: string; amount: number }>;
}

interface Package {
  id: number;
  type: string;
  name: string;
  discount: string;
  minCost: string;
  minDownPaymentPercent: string;
  requiresFullPayment: boolean;
  bonusAccountPercent: string;
}

export default function PromoCalculatorPage({
  user,
  onLogout,
}: PromoCalculatorPageProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [tempPaymentValue, setTempPaymentValue] = useState("");
  const [isEditingCorrection, setIsEditingCorrection] = useState(false);
  const [tempCorrectionValue, setTempCorrectionValue] = useState("");
  const [showSalesModal, setShowSalesModal] = useState(false);

  const packagePerksQuery = usePackagePerks();
  const packagePerkValues = packagePerksQuery.data || [];

  const {
    selectedServices,
    procedureCount,
    downPayment,
    installmentMonths,
    usedCertificate,
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
    setUsedCertificate,
    setFreeZones,
    setCorrectionPercent,
    setManualGiftSessions,
    setSelectedPackage,
    isLoading,
    getMinDownPayment,
    getMaxDownPayment,
  } = useCalculator();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleProceedToOrder = () => {
    if (!selectedPackage) return;
    setShowClientModal(true);
  };

  // Helper function to safely access calculation packages
  const getPackageData = (packageType: string): PackageData | null => {
    if (!calculation || !calculation.packages) return null;
    return (
      (calculation.packages as Record<string, PackageData>)[packageType] || null
    );
  };

  return (
    <div
      className={`min-h-screen overflow-hidden promo-background glass-pattern ${darkMode ? "dark" : ""}`}
    >
      {/* Background decorative elements */}
      <div className="floating-pattern top-10 left-10"></div>
      <div className="floating-pattern bottom-10 right-10"></div>

      {/* Top right buttons */}
      <div className="absolute top-2 right-2 z-50 flex items-center gap-2">
        {/* Незаметная кнопка для просмотра продаж */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSalesModal(true)}
          className="opacity-30 hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1"
          title="Мои продажи"
        >
          <BarChart3 size={14} />
        </Button>
        
        {/* Кнопка выхода */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="opacity-30 hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1"
          title="Выход"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Main content - адаптивная сетка */}
      <div className="h-screen flex flex-col lg:flex-row gap-1 lg:gap-2 p-1 lg:p-2 overflow-hidden">
        {/* Left panel - Controls - компактная версия */}
        <div className="w-full lg:w-64 xl:w-72 flex flex-col h-auto lg:h-full order-2 lg:order-1">
          {/* Scrollable content area with custom scrollbar */}
          <div className="flex-1 overflow-y-auto space-y-1 lg:space-y-1.5 pr-1 custom-left-scrollbar max-h-[40vh] lg:max-h-none">
            {/* Service selection card with special offer badge - компактная версия */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200">
              {/* Special offer badge inside the card */}
              <div className="text-center mb-2">
                <Badge className="bg-gradient-to-r from-pink-400 to-orange-400 text-white px-2 py-0.5 text-xs font-medium border-0 shadow-none">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Спецпредложение гостевого дня
                </Badge>
              </div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-2">
                Выбор услуг
              </h3>
              <ServiceSelector
                selectedServices={selectedServices}
                onServicesChange={setSelectedServices}
                onAddFreeZone={setFreeZones}
                freeZones={freeZones}
                onSessionCountChange={handleSessionCountChange}
                calculatorSettings={calculatorSettings}
              />

              {/* Cost per procedure and subscription cost - компактная версия */}
              {calculation && calculation.baseCost > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Стоимость за процедуру:
                    </span>
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                      {formatPrice(
                                        selectedServices.reduce((sum, service) => {
                                          const price = service.customPrice ? parseFloat(service.customPrice) : parseFloat(service.priceMin);
                                          return sum + (price * service.quantity);
                                        }, 0)
                                      )}
                                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Стоимость абонемента:
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {formatPrice(calculation.baseCost)}
                    </span>
                  </div>
                </div>
              )}
            </div>


            {/* Payment settings - компактная версия */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200">
              <h4 className="font-bold text-gray-900 dark:text-white text-xs mb-1.5">
                {selectedPackage === "vip"
                  ? "Полная предоплата"
                  : "Первый взнос"}
              </h4>

              <div className="text-center mb-1">
                {selectedPackage === "vip" ? (
                  // VIP - показываем полную стоимость стандартным цветом
                  <div className="text-xs font-bold text-premium">
                    {calculation?.packages?.vip
                      ? formatPrice(calculation.packages.vip.finalCost)
                      : formatPrice(calculation?.baseCost || 0)}
                  </div>
                ) : // Обычные пакеты - редактируемое поле
                isEditingPayment ? (
                  <input
                    type="number"
                    value={tempPaymentValue}
                    onChange={(e) => setTempPaymentValue(e.target.value)}
                    onBlur={() => {
                      const numericValue = parseInt(tempPaymentValue) || 0;

                      // Для пакета "эконом" позволяем ввод любой положительной суммы
                      // если она меньше минимального платежа
                      if (selectedPackage === "economy") {
                        const minPayment = getMinDownPayment();
                        if (numericValue < minPayment && numericValue > 0) {
                          // Разрешаем любую положительную сумму для эконом пакета
                          setDownPayment(numericValue);
                        } else {
                          // Обычная логика с ограничениями для эконом пакета
                          const maxPayment = getMaxDownPayment();
                          const constrainedValue = Math.max(
                            minPayment,
                            Math.min(maxPayment, numericValue),
                          );
                          setDownPayment(constrainedValue);
                        }
                      } else {
                        // Для всех остальных пакетов - обычная логика с ограничениями
                        const minPayment = getMinDownPayment();
                        const maxPayment = getMaxDownPayment();
                        const constrainedValue = Math.max(
                          minPayment,
                          Math.min(maxPayment, numericValue),
                        );
                        setDownPayment(constrainedValue);
                      }
                      setIsEditingPayment(false);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        const numericValue = parseInt(tempPaymentValue) || 0;

                        // Для пакета "эконом" позволяем ввод любой положительной суммы
                        // если она меньше минимального платежа
                        if (selectedPackage === "economy") {
                          const minPayment = getMinDownPayment();
                          if (numericValue < minPayment && numericValue > 0) {
                            // Разрешаем любую положительную сумму для эконом пакета
                            setDownPayment(numericValue);
                          } else {
                            // Обычная логика с ограничениями для эконом пакета
                            const maxPayment = getMaxDownPayment();
                            const constrainedValue = Math.max(
                              minPayment,
                              Math.min(maxPayment, numericValue),
                            );
                            setDownPayment(constrainedValue);
                          }
                        } else {
                          // Для всех остальных пакетов - обычная логика с ограничениями
                          const minPayment = getMinDownPayment();
                          const maxPayment = getMaxDownPayment();
                          const constrainedValue = Math.max(
                            minPayment,
                            Math.min(maxPayment, numericValue),
                          );
                          setDownPayment(constrainedValue);
                        }
                        setIsEditingPayment(false);
                      }
                    }}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    className="text-xs font-bold text-premium bg-transparent border-none text-center w-full focus:outline-none focus:ring-2 focus:ring-pink-500 rounded px-2 py-1"
                    style={{
                      WebkitAppearance: "none",
                      MozAppearance: "textfield",
                    }}
                  />
                ) : (
                  <div
                    onClick={() => {
                      setTempPaymentValue(downPayment.toString());
                      setIsEditingPayment(true);
                    }}
                    className="text-xs font-bold text-premium cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded px-2 py-1 transition-colors"
                  >
                    {formatPrice(downPayment)}
                  </div>
                )}
              </div>

              {selectedPackage === "vip" ? (
                // VIP - нейтральный декоративный слайдер заблокирован на 100%
                <div className="mb-2">
                  <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gray-400 dark:bg-gray-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
              ) : (
                // Обычные пакеты - обычный слайдер
                <RangeSlider
                  min={getMinDownPayment()}
                  max={getMaxDownPayment()}
                  step={1}
                  value={downPayment}
                  onChange={setDownPayment}
                  className="dark:bg-gray-700 mb-2"
                  formatLabel={formatPrice}
                  disabled={!selectedPackage}
                />
              )}
            </div>

            {/* Installment configuration - компактная версия */}
            {downPayment <
              (selectedPackage && calculation
                ? getPackageData(selectedPackage)?.finalCost || 25000
                : 25000) && (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1.5 text-xs">
                  Рассрочка
                </h4>

                <div className="text-center mb-1">
                  <div className="text-xs font-bold text-premium">
                    {installmentMonths}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {installmentMonths === 1
                      ? "месяц"
                      : installmentMonths <= 4
                        ? "месяца"
                        : "месяцев"}
                  </div>
                </div>

                <RangeSlider
                  min={Math.min(
                    ...(calculatorSettings?.installmentMonthsOptions || [2]),
                  )}
                  max={Math.max(
                    ...(calculatorSettings?.installmentMonthsOptions || [6]),
                  )}
                  value={installmentMonths}
                  onChange={setInstallmentMonths}
                  className="dark:bg-gray-700"
                />

                {selectedPackage && calculation && (
                  <div className="mt-1 text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Ежемесячный платеж
                    </div>
                    <div className="text-xs font-bold text-premium">
                      {formatPrice(
                        ((getPackageData(selectedPackage)?.finalCost || 0) -
                          downPayment) /
                          installmentMonths,
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Certificate option - компактная версия */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                    Сертификат
                  </h4>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Скидка{" "}
                    {calculatorSettings?.certificateDiscountAmount?.toLocaleString() ||
                      "3 000"}
                    ₽
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usedCertificate}
                    onChange={(e) => setUsedCertificate(e.target.checked)}
                    disabled={
                      !calculation ||
                      calculation.baseCost <
                        (calculatorSettings?.certificateMinCourseAmount ||
                          25000)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-0 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-premium peer-disabled:opacity-50 focus:outline-none focus:ring-0"></div>
                </label>
              </div>
              {!calculation ||
              calculation.baseCost <
                (calculatorSettings?.certificateMinCourseAmount || 25000) ? (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  Доступно при курсе от{" "}
                  {calculatorSettings?.certificateMinCourseAmount?.toLocaleString() ||
                    "25 000"}
                  ₽
                </p>
              ) : null}
            </div>

            {/* Correction block - компактная версия */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200">
              {isEditingCorrection ? (
                // Режим редактирования - только поле ввода по центру
                <div className="flex items-center justify-center">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={tempCorrectionValue}
                    onChange={(e) => setTempCorrectionValue(e.target.value)}
                    onBlur={() => {
                      const value = Math.min(
                        10,
                        Math.max(0, parseFloat(tempCorrectionValue) || 0),
                      );
                      setCorrectionPercent(value);
                      setIsEditingCorrection(false);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        const value = Math.min(
                          10,
                          Math.max(0, parseFloat(tempCorrectionValue) || 0),
                        );
                        setCorrectionPercent(value);
                        setIsEditingCorrection(false);
                      }
                    }}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    className="w-12 text-xs text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    %
                  </span>
                </div>
              ) : (
                // Обычный режим - заголовок и переключатель
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                      Коррекция
                    </h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={correctionPercent > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTempCorrectionValue(
                            correctionPercent > 0
                              ? correctionPercent.toString()
                              : "5",
                          );
                          setIsEditingCorrection(true);
                        } else {
                          setCorrectionPercent(0);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-0 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-premium focus:outline-none focus:ring-0"></div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Order button - fixed at bottom */}
          {selectedPackage && (
            <div className="flex-shrink-0 mt-2 lg:mt-3">
              <Button
                onClick={handleProceedToOrder}
                className="btn-premium w-full text-xs lg:text-sm py-2"
                disabled={!selectedServices.length}
              >
                <Star className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                Оформить абонемент
              </Button>
            </div>
          )}
        </div>

        {/* Right panel - Package comparison с адаптивной высотой */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden order-1 lg:order-2">
          {/* Three Block Comparison - теперь занимает оставшееся место */}
          {calculation && (
            <div className="flex gap-2 h-full">
              <div className="flex-1 overflow-auto">
                <ThreeBlockComparison
                  calculation={calculation}
                  packages={packages}
                  selectedPackage={selectedPackage}
                  onPackageSelect={setSelectedPackage}
                  downPayment={downPayment}
                  installmentMonths={installmentMonths}
                  procedureCount={procedureCount}
                  packagePerkValues={packagePerkValues}
                  usedCertificate={usedCertificate}
                  calculatorSettings={calculatorSettings}
                  freeZones={freeZones}
                  selectedServices={selectedServices.map(service => ({
                    ...service,
                    serviceId: service.yclientsId,
                    pricePerProcedure: parseFloat(service.priceMin)
                  }))}
                  bulkDiscountThreshold={
                    calculatorSettings?.bulkDiscountThreshold || 15
                  }
                  bulkDiscountPercentage={
                    calculatorSettings?.bulkDiscountPercentage || 0.025
                  }
                  correctionPercent={correctionPercent}
                  manualGiftSessions={manualGiftSessions}
                  onManualGiftSessionsChange={setManualGiftSessions}
                />
              </div>

              {/* Блок "Бесплатные зоны" - компактная версия */}
              <div className="w-40 flex-shrink-0">
                <div
                  className="bg-white dark:bg-gray-900 p-2 border border-pink-300/50 h-fit"
                  style={{ borderRadius: "6px" }}
                >
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-2 text-center">
                    Бесплатные зоны
                  </h3>

                  <div className="space-y-1.5">
                    <div className="p-1.5 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                        За подруг
                      </div>
                      <div className="text-xs font-bold text-pink-600 dark:text-pink-400">
                        1 зона
                      </div>
                    </div>

                    <div className="p-1.5 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                        За отзыв в Яндекс Картах
                      </div>
                      <div className="text-xs font-bold text-pink-600 dark:text-pink-400">
                        1 зона
                      </div>
                    </div>

                    <div className="p-1.5 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                        За отзыв в 2ГИС
                      </div>
                      <div className="text-xs font-bold text-pink-600 dark:text-pink-400">
                        1 зона
                      </div>
                    </div>

                    <div className="p-1.5 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                        За рекомендации в соцсетях
                      </div>
                      <div className="text-xs font-bold text-pink-600 dark:text-pink-400">
                        1 зона
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Modal */}
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
          usedCertificate={usedCertificate}
          freeZones={freeZones}
         manualGiftSessions={manualGiftSessions}
        />
      )}

      {/* Master Sales Modal */}
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