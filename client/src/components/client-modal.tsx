import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { User, Loader2, Copy, CheckCircle, FileText, Calendar, CreditCard, CalendarDays } from "lucide-react";
import { formatPhoneNumber, validatePhoneNumber, formatPrice } from "@/lib/utils";
import PhoneInput from "./ui/phone-input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface UserData {
  id: number;
  name: string;
  role: "master" | "admin";
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: any;
  selectedPackage: string | null;
  selectedServices: any[];
  procedureCount: number;
  downPayment: number;
  installmentMonths: number;
  freeZones: any[];
  manualGiftSessions?: Record<string, number>;
  user?: UserData;
}

export default function ClientModal({
  isOpen,
  onClose,
  calculation,
  selectedPackage,
  selectedServices,
  procedureCount,
  downPayment,
  installmentMonths,
  freeZones,
  manualGiftSessions = {},
  user
}: ClientModalProps) {
  const isAdmin = user?.role === 'admin';
  
  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscriptionTitle, setSubscriptionTitle] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  // For admins, require explicit master selection (start with undefined)
  // For masters, use their own ID
  const [selectedMasterId, setSelectedMasterId] = useState<number | undefined>(
    isAdmin ? undefined : user?.id
  );
  const [pdfVersion, setPdfVersion] = useState<'standard' | 'amendment'>('standard');
  const { toast } = useToast();

  // Load users for admin dropdown
  const { data: users = [] } = useQuery<UserData[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    enabled: isAdmin && isOpen,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhoneNumber(phone)) {
      toast({
        title: "Ошибка",
        description: "Введите корректный номер телефона",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPackage || !calculation) {
      toast({
        title: "Ошибка",
        description: "Выберите пакет для продолжения",
        variant: "destructive"
      });
      return;
    }

    // For admins, require explicit master selection
    if (isAdmin && !selectedMasterId) {
      toast({
        title: "Ошибка",
        description: "Выберите мастера для продажи",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const subscriptionData = {
        client: {
          phone: phone.replace(/\D/g, '')
        },
        calculation: {
          services: selectedServices.map(service => ({
            id: service.yclientsId,
            serviceId: service.yclientsId,
            name: service.title,
            title: service.title,
            price: service.editedPrice || service.price || service.priceMin || service.cost || 0,
            priceMin: service.priceMin || service.price || service.editedPrice || service.cost || 0,
            editedPrice: service.editedPrice || service.price || service.priceMin || service.cost || 0,
            cost: service.cost || service.price || service.priceMin || service.editedPrice || 0,
            quantity: service.quantity || 1,
            sessionCount: service.sessionCount || 10,
            count: service.sessionCount || 10
          })),
          packageType: selectedPackage,
          baseCost: calculation.baseCost,
          finalCost: calculation.packages[selectedPackage].finalCost,
          totalSavings: calculation.packages[selectedPackage].totalSavings,
          downPayment,
          installmentMonths: selectedPackage === 'vip' ? undefined : installmentMonths,
          monthlyPayment: selectedPackage === 'vip' ? undefined : calculation.packages[selectedPackage].monthlyPayment,
          freeZones,
          appliedDiscounts: calculation.packages[selectedPackage].appliedDiscounts,
          clientName,
          ...(isAdmin && {
            saleDate,
            masterId: selectedMasterId,
            pdfVersion
          })
        }
      };
      
      // Add manual gift sessions to the calculation data
      if (manualGiftSessions[selectedPackage] !== undefined) {
        (subscriptionData.calculation as any).manualGiftSessions = manualGiftSessions;
      }

      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        const result = await response.json();
        setSubscriptionTitle(result.subscriptionType);
        setIsCompleted(true);
        
        // Автоматически формируем PDF договора-оферты по созданной продаже
        await generateOfferPdf(result.saleId);
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось создать абонемент",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateOfferPdf = async (saleId?: number) => {
    if (!saleId) return;
    try {
      const sendResponse = await fetch(`/api/sales/${saleId}/pdf`, {
        method: "POST",
        credentials: "include"
      });

      if (sendResponse.ok) {
        setOfferSent(true);
        toast({
          title: "Договор сформирован!",
          description: "Договор-оферта успешно сформирован",
        });
      } else {
        throw new Error("Не удалось сформировать договор");
      }
    } catch (error) {
      console.error("Error generating offer PDF:", error);
      // Не показываем ошибку пользователю, чтобы не портить успешное создание абонемента
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Скопировано!",
        description: "Название абонемента скопировано в буфер обмена",
      });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать в буфер обмена",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setPhone("");
    setClientName("");
    setSubscriptionTitle("");
    setIsCompleted(false);
    setOfferSent(false);
    onClose();
  };

  // Генерируем график платежей для отображения
  const generatePaymentSchedule = () => {
    if (!selectedPackage || !calculation || selectedPackage === 'vip') {
      return [];
    }

    const schedule = [];
    const packageData = calculation.packages[selectedPackage];
    
    // Первоначальный взнос
    schedule.push({
      date: new Date(),
      amount: downPayment,
      description: 'Первоначальный взнос',
      isPaid: false
    });
    
    // Ежемесячные платежи
    const remainingAmount = packageData.finalCost - downPayment;
    const monthlyPayment = remainingAmount / installmentMonths;
    
    for (let i = 1; i <= installmentMonths; i++) {
      const paymentDate = new Date();
      paymentDate.setMonth(paymentDate.getMonth() + i);
      
      schedule.push({
        date: paymentDate,
        amount: monthlyPayment,
        description: `Платеж ${i} из ${installmentMonths}`,
        isPaid: false
      });
    }
    
    return schedule;
  };

  const paymentSchedule = generatePaymentSchedule();

  const isWide = !!(selectedPackage && selectedPackage !== 'vip' && !isCompleted);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`${isWide ? 'max-w-3xl' : 'sm:max-w-md'} max-h-[90vh] overflow-y-auto custom-scrollbar`}
        style={{
          background: "linear-gradient(160deg, hsla(222, 42%, 11%, 0.98), hsla(220, 40%, 7%, 0.98))",
          border: "1px solid hsla(43, 88%, 56%, 0.25)",
          boxShadow: "0 24px 60px -16px rgba(0,0,0,0.7)",
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isCompleted
                ? "bg-gradient-to-br from-green-500 to-green-600"
                : ""
            }`}
              style={!isCompleted ? {
                background: "linear-gradient(135deg, hsl(43, 95%, 65%), hsl(36, 80%, 45%))",
                boxShadow: "0 8px 22px -8px hsla(43,88%,56%,0.55)",
              } : undefined}
            >
              {isCompleted ? (
                <CheckCircle className="text-white" size={22} />
              ) : (
                <User style={{ color: "hsl(var(--navy))" }} size={22} />
              )}
            </div>
          </div>
          {isCompleted && (
            <DialogTitle className="text-center text-xl font-bold text-foreground">
              Абонемент создан!
            </DialogTitle>
          )}
        </DialogHeader>

        {isCompleted ? (
          <div className="space-y-4">
            <div
              className="rounded-xl p-4"
              style={{
                background: "hsla(140, 70%, 45%, 0.10)",
                border: "1px solid hsla(140, 70%, 45%, 0.35)",
              }}
            >
              <Label className="block text-sm font-medium text-foreground/85 mb-2">
                Название абонемента:
              </Label>
              <div className="flex items-center gap-2">
                <Input value={subscriptionTitle} readOnly className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(subscriptionTitle)}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {offerSent && (
              <div
                className="rounded-xl p-3 flex items-center gap-2"
                style={{
                  background: "hsla(214, 92%, 56%, 0.10)",
                  border: "1px solid hsla(214, 92%, 56%, 0.35)",
                  color: "hsl(214, 95%, 80%)",
                }}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Договор-оферта сформирован</span>
              </div>
            )}

            <Button type="button" onClick={handleClose} className="w-full btn-premium">
              Закрыть
            </Button>
          </div>
        ) : (
          <div className={isWide ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
            {/* Left column — client data */}
            <div>
              <div className="pb-2 mb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <h3 className="text-base font-semibold text-foreground">
                  {isAdmin ? "Настройки продажи" : "Данные клиента"}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {isAdmin && (
                  <>
                    <div>
                      <Label className="block text-xs font-medium text-foreground/80 mb-1">
                        Дата продажи *
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full h-9 px-3 rounded-md text-sm flex items-center justify-between transition-colors bg-input/40 hover:bg-input/60 border border-input text-foreground"
                          >
                            <span>
                              {saleDate
                                ? format(parseISO(saleDate), "d MMMM yyyy", { locale: ru })
                                : "Выберите дату"}
                            </span>
                            <CalendarDays className="w-4 h-4 opacity-60" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="p-0">
                          <CalendarPicker
                            mode="single"
                            selected={saleDate ? parseISO(saleDate) : undefined}
                            onSelect={(d) => {
                              if (d) setSaleDate(format(d, "yyyy-MM-dd"));
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="masterId" className="block text-xs font-medium text-foreground/80 mb-1">
                        Мастер *
                      </Label>
                      <Select value={selectedMasterId?.toString()} onValueChange={(v) => setSelectedMasterId(Number(v))}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Выберите мастера" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((u) => u.role === 'master')
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id.toString()}>
                                {u.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="pdfVersion" className="block text-xs font-medium text-foreground/80 mb-1">
                        Версия договора *
                      </Label>
                      <Select value={pdfVersion} onValueChange={(v) => setPdfVersion(v as 'standard' | 'amendment')}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Стандартный договор</SelectItem>
                          <SelectItem value="amendment">Изменение условий договора</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pb-2 mb-1 mt-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      <h4 className="text-sm font-semibold text-foreground">Данные клиента</h4>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="clientName" className="block text-xs font-medium text-foreground/80 mb-1">
                    ФИО клиента *
                  </Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="text-sm"
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="block text-xs font-medium text-foreground/80 mb-1">
                    Номер телефона *
                  </Label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={setPhone}
                    placeholder="+7 (___) ___-__-__"
                    required
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 h-9 text-sm"
                    disabled={loading}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 btn-premium h-9 text-sm"
                    disabled={loading || (isAdmin && !selectedMasterId)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      "Создать абонемент"
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right column — payment schedule (only for standard/economy) */}
            {selectedPackage && selectedPackage !== 'vip' && paymentSchedule.length > 0 && (
              <div>
                <div className="pb-2 mb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: "hsl(var(--gold))" }} />
                    <h3 className="text-base font-semibold text-foreground">График платежей</h3>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {paymentSchedule.map((payment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 rounded-lg"
                      style={{
                        background: "hsla(220, 30%, 10%, 0.55)",
                        border: "1px solid hsl(var(--border))",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: "linear-gradient(135deg, hsla(43,88%,56%,0.25), hsla(43,80%,40%,0.15))",
                            border: "1px solid hsla(43,88%,56%,0.4)",
                          }}
                        >
                          <span className="text-[10px] font-bold" style={{ color: "hsl(var(--gold))" }}>
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-foreground">{payment.description}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {payment.date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold" style={{ color: "hsl(var(--gold))" }}>
                        {formatPrice(payment.amount)}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-2 p-2.5 rounded-lg flex items-center justify-between"
                  style={{
                    background: "linear-gradient(135deg, hsla(43,88%,56%,0.12), hsla(43,80%,40%,0.06))",
                    border: "1px solid hsla(43,88%,56%,0.4)",
                  }}
                >
                  <div className="text-xs font-semibold text-foreground/85">Итого</div>
                  <div className="text-sm font-black" style={{ color: "hsl(var(--gold))" }}>
                    {formatPrice(paymentSchedule.reduce((sum, payment) => sum + payment.amount, 0))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
