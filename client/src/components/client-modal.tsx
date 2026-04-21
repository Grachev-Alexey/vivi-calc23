import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { User, Loader2, Copy, CheckCircle, FileText, Calendar, CreditCard } from "lucide-react";
import { formatPhoneNumber, validatePhoneNumber, formatPrice } from "@/lib/utils";
import PhoneInput from "./ui/phone-input";

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
  usedCertificate: boolean;
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
  usedCertificate,
  freeZones,
  manualGiftSessions = {},
  user
}: ClientModalProps) {
  const isAdmin = user?.role === 'admin';
  
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
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
          phone: phone.replace(/\D/g, ''),
          email: email || undefined
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
          usedCertificate,
          freeZones,
          appliedDiscounts: calculation.packages[selectedPackage].appliedDiscounts,
          ...(isAdmin && {
            saleDate,
            masterId: selectedMasterId
            // Примечание: pdfVersion не передается здесь, так как он используется только при создании offer
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
        
        // Автоматически создаем и отправляем договор-оферту, передавая ID продажи
        await createAndSendOffer(result.saleId);
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

  const createAndSendOffer = async (saleId?: number) => {
    if (!selectedPackage || !calculation) {
      return;
    }

    try {
      // Создаем оферту
      const packageData = calculation.packages[selectedPackage];
      
      // Используем дату продажи для расчета графика платежей
      const startDate = isAdmin ? new Date(saleDate) : new Date();
      
      // Генерируем график платежей
      const paymentSchedule = [];
      if (selectedPackage === 'vip') {
        // VIP - полная оплата
        paymentSchedule.push({
          date: startDate.toISOString().split('T')[0],
          amount: packageData.finalCost,
          description: 'Полная оплата'
        });
      } else {
        // Стандарт/Эконом - рассрочка
        paymentSchedule.push({
          date: startDate.toISOString().split('T')[0],
          amount: downPayment,
          description: 'Первоначальный взнос'
        });
        
        const remainingAmount = packageData.finalCost - downPayment;
        const monthlyPayment = remainingAmount / installmentMonths;
        
        for (let i = 1; i <= installmentMonths; i++) {
          const paymentDate = new Date(startDate);
          paymentDate.setMonth(paymentDate.getMonth() + i);
          
          paymentSchedule.push({
            date: paymentDate.toISOString().split('T')[0],
            amount: monthlyPayment,
            description: `Платеж ${i} из ${installmentMonths}`
          });
        }
      }

      const offerData = {
        saleId, // Связываем оферту с продажей
        clientName,
        clientPhone: phone.replace(/\D/g, ''),
        clientEmail: email,
        selectedPackage,
        selectedServices: selectedServices.map(service => ({
          id: service.yclientsId,
          title: service.title,
          price: service.editedPrice || service.customPrice || service.priceMin,
          priceMin: service.priceMin,
          editedPrice: service.editedPrice || service.customPrice,
          quantity: service.quantity || 1,
          sessionCount: service.sessionCount || 10,
          count: service.sessionCount || 10
        })),
        baseCost: calculation.baseCost,
        finalCost: packageData.finalCost,
        totalSavings: packageData.totalSavings,
        downPayment,
        installmentMonths: selectedPackage === 'vip' ? undefined : installmentMonths,
        monthlyPayment: selectedPackage === 'vip' ? undefined : packageData.monthlyPayment,
        paymentSchedule,
        appliedDiscounts: packageData.appliedDiscounts || [],
        freeZones: freeZones || [],
        usedCertificate,
        manualGiftSessions: manualGiftSessions || {},
        // Добавляем информацию о процедурах для PDF
        procedureCount: procedureCount,
        // Добавляем дату продажи и версию PDF (только для админов)
        ...(isAdmin && {
          saleDate,
          pdfVersion
        })
      };

      const createResponse = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(offerData)
      });

      if (createResponse.ok) {
        const offer = await createResponse.json();
        
        // Отправляем оферту
        const sendResponse = await fetch(`/api/offers/${offer.id}/send`, {
          method: "POST",
          credentials: "include"
        });

        if (sendResponse.ok) {
          setOfferSent(true);
          toast({
            title: "Договор отправлен!",
            description: `Договор-оферта успешно отправлен на ${email}`,
          });
        } else {
          throw new Error("Не удалось отправить договор");
        }
      } else {
        throw new Error("Не удалось создать договор");
      }
    } catch (error) {
      console.error("Error creating/sending offer:", error);
      // Не показываем ошибку пользователю, чтобы не портить успешное создание абонемента
      // Просто логируем ошибку
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
    setEmail("");
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`${selectedPackage && selectedPackage !== 'vip' && !isCompleted ? 'max-w-3xl' : 'sm:max-w-md'}`}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isCompleted 
                ? "bg-gradient-to-r from-green-500 to-green-600" 
                : "bg-gradient-to-r from-pink-500 to-pink-600"
            }`}>
              {isCompleted ? (
                <CheckCircle className="text-white" size={20} />
              ) : (
                <User className="text-white" size={20} />
              )}
            </div>
          </div>
          {isCompleted && (
            <DialogTitle className="text-center text-xl font-bold text-gray-900">
              Абонемент создан!
            </DialogTitle>
          )}
        </DialogHeader>
        
        {isCompleted ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Название абонемента:
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={subscriptionTitle}
                  readOnly
                  className="flex-1 bg-white"
                />
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Договор-оферта отправлен на {email}</span>
                </div>
              </div>
            )}
            
            <Button
              type="button"
              onClick={handleClose}
              className="w-full btn-primary"
            >
              Закрыть
            </Button>
          </div>
        ) : (
          <div className={`${selectedPackage && selectedPackage !== 'vip' ? 'grid grid-cols-2 gap-4' : ''}`}>
            {/* Левая колонка - Данные клиента */}
            <div className={selectedPackage && selectedPackage !== 'vip' ? '' : 'col-span-2'}>
              <div className="border-b border-gray-200 pb-2 mb-3">
                <h3 className="text-base font-semibold text-gray-900">Данные клиента</h3>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                {isAdmin && (
                  <>
                    <div className="border-b border-gray-200 pb-2 mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">Настройки продажи</h4>
                    </div>
                    
                    <div>
                      <Label htmlFor="saleDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Дата продажи *
                      </Label>
                      <Input
                        id="saleDate"
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="input-premium text-sm"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="masterId" className="block text-sm font-medium text-gray-700 mb-1">
                        Мастер *
                      </Label>
                      <Select value={selectedMasterId?.toString()} onValueChange={(v) => setSelectedMasterId(Number(v))}>
                        <SelectTrigger className="input-premium text-sm">
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
                      <Label htmlFor="pdfVersion" className="block text-sm font-medium text-gray-700 mb-1">
                        Версия договора *
                      </Label>
                      <Select value={pdfVersion} onValueChange={(v) => setPdfVersion(v as 'standard' | 'amendment')}>
                        <SelectTrigger className="input-premium text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Стандартный договор</SelectItem>
                          <SelectItem value="amendment">Изменение условий договора</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-b border-gray-200 pb-2 mb-3 mt-4">
                      <h4 className="text-sm font-semibold text-gray-900">Данные клиента</h4>
                    </div>
                  </>
                )}
                
                <div>
                  <Label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
                    ФИО клиента *
                  </Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="input-premium text-sm"
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
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
                
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email клиента *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-premium text-sm"
                    placeholder="client@example.com"
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-3">
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
                    className="flex-1 btn-primary h-9 text-sm"
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

            {/* Правая колонка - График платежей (только для стандарт/эконом) */}
            {selectedPackage && selectedPackage !== 'vip' && paymentSchedule.length > 0 && (
              <div>
                <div className="border-b border-gray-200 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-600" />
                    <h3 className="text-base font-semibold text-gray-900">График платежей</h3>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {paymentSchedule.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-pink-50 rounded border border-pink-200">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-pink-600">{index + 1}</span>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-900">
                            {payment.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.date.toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-pink-600">
                        {formatPrice(payment.amount)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Итого */}
                <div className="mt-2 pt-2 border-t border-pink-200 bg-pink-50 rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-900">Итого:</div>
                    <div className="text-sm font-bold text-pink-600">
                      {formatPrice(paymentSchedule.reduce((sum, payment) => sum + payment.amount, 0))}
                    </div>
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
