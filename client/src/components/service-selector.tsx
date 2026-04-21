import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RangeSlider } from "@/components/ui/range-slider";
import { X, Gift, Plus, Search, ChevronDown, Edit3, Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Service {
  id: number;
  yclientsId: number;
  title: string;
  priceMin: string;
}

interface SelectedService extends Service {
  quantity: number;
  sessionCount: number; // Добавляем количество процедур для каждой услуги
  customPrice?: string; // Добавляем возможность кастомной цены
}

interface FreeZone {
  serviceId: number;
  title: string;
  pricePerProcedure: number;
  quantity: number;
}

interface ServiceSelectorProps {
  selectedServices: SelectedService[];
  onServicesChange: (services: SelectedService[]) => void;
  onAddFreeZone: (freeZones: FreeZone[]) => void;
  freeZones: FreeZone[];
  onSessionCountChange?: (maxSessionCount: number) => void; // Callback для обновления общего количества
  calculatorSettings?: any; // Добавляем настройки калькулятора
}

export default function ServiceSelector({ 
  selectedServices, 
  onServicesChange, 
  onAddFreeZone, 
  freeZones,
  onSessionCountChange,
  calculatorSettings
}: ServiceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number, width: number} | null>(null);
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");
  const [editingSessionCount, setEditingSessionCount] = useState<number | null>(null);
  const [tempSessionCount, setTempSessionCount] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Вычисляем максимальное количество процедур и уведомляем родительский компонент
  useEffect(() => {
    const maxSessionCount = selectedServices.length > 0 
      ? Math.max(...selectedServices.map(s => s.sessionCount || 10))
      : 10;
    
    if (onSessionCountChange) {
      onSessionCountChange(maxSessionCount);
    }
  }, [selectedServices, onSessionCountChange]);
  // Filter services based on search term
  const filteredServices = services
    .filter(service => !selectedServices.find(s => s.yclientsId === service.yclientsId))
    .filter(service => 
      service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.priceMin.includes(searchTerm)
    );

  // Update dropdown position when opening
  const updateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const addService = (service: Service) => {
    const existingService = selectedServices.find(s => s.yclientsId === service.yclientsId);
    if (existingService) return;

    const basePrice = parseFloat(service.priceMin);

    const newService: SelectedService = {
      ...service,
      priceMin: basePrice.toString(),
      customPrice: basePrice.toString(),
      quantity: 1,
      sessionCount: 10 // По умолчанию 10 процедур
    };
    
    onServicesChange([...selectedServices, newService]);
    setSearchTerm("");
    
    // Keep dropdown open and refocus input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        updateDropdownPosition();
      }
    }, 50);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside the input AND outside the dropdown portal
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        // Also check if the click is not within any dropdown portal element
        const isInDropdown = (target as Element)?.closest('[data-dropdown-portal]');
        if (!isInDropdown) {
          setIsOpen(false);
          setDropdownPosition(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeService = (yclientsId: number) => {
    onServicesChange(selectedServices.filter(s => s.yclientsId !== yclientsId));
  };

  const handleDoubleClick = (service: SelectedService) => {
    // Only allow one free zone per service
    if (freeZones.find(zone => zone.serviceId === service.yclientsId)) return;
    
    // Add as free zone
    const freeZone: FreeZone = {
      serviceId: service.yclientsId,
      title: service.title,
      pricePerProcedure: parseFloat(service.customPrice || service.priceMin),
      quantity: 1
    };
    
    onAddFreeZone([...freeZones, freeZone]);
  };

  const removeFreeZone = (serviceId: number) => {
    onAddFreeZone(freeZones.filter(z => z.serviceId !== serviceId));
  };

  const startEditingPrice = (serviceId: number, currentPrice: string) => {
    setEditingPrice(serviceId);
    // Remove decimal points and convert to integer for editing
    setTempPrice(Math.round(parseFloat(currentPrice)).toString());
  };

  const savePrice = (serviceId: number) => {
    const updatedServices = selectedServices.map(service => 
      service.yclientsId === serviceId 
        ? { ...service, customPrice: tempPrice, editedPrice: tempPrice }
        : service
    );
    onServicesChange(updatedServices);
    setEditingPrice(null);
    setTempPrice("");
  };

  const cancelEditingPrice = () => {
    setEditingPrice(null);
    setTempPrice("");
  };

  const startEditingSessionCount = (serviceId: number, currentCount: number) => {
    setEditingSessionCount(serviceId);
    setTempSessionCount(currentCount.toString());
  };

  const saveSessionCount = (serviceId: number) => {
    const newCount = Math.max(3, Math.min(20, parseInt(tempSessionCount) || 10));
    const updatedServices = selectedServices.map(service => 
      service.yclientsId === serviceId 
        ? { ...service, sessionCount: newCount }
        : service
    );
    onServicesChange(updatedServices);
    setEditingSessionCount(null);
    setTempSessionCount("");
  };

  const cancelEditingSessionCount = () => {
    setEditingSessionCount(null);
    setTempSessionCount("");
  };

  const updateSessionCount = (serviceId: number, newCount: number) => {
    const updatedServices = selectedServices.map(service => 
      service.yclientsId === serviceId 
        ? { ...service, sessionCount: newCount }
        : service
    );
    onServicesChange(updatedServices);
  };
  const getCurrentPrice = (service: SelectedService) => {
    return service.customPrice || service.priceMin;
  };

  // Получаем максимальное количество процедур для отображения бонусной скидки
  const maxSessionCount = selectedServices.length > 0 
    ? Math.max(...selectedServices.map(s => s.sessionCount || 10))
    : 10;
  if (isLoading) {
    return <div className="animate-pulse h-16 lg:h-20 rounded-xl" style={{ background: "hsla(220, 30%, 14%, 0.6)" }}></div>;
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Зоны для процедур</label>
      
      {/* Service Selection */}
      <div className="relative mb-2 z-50" ref={dropdownRef}>
        <div className="relative group">
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Поиск услуг..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) {
                  setIsOpen(true);
                  updateDropdownPosition();
                }
              }}
              onFocus={() => {
                setIsOpen(true);
                updateDropdownPosition();
              }}
              className="input-premium text-xs h-9 sm:h-8 pr-8 pl-8 transition-all duration-200"
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-muted-foreground group-focus-within:text-[hsl(var(--gold))] transition-colors" />
            </div>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
        
        {isOpen && dropdownPosition && createPortal(
          <div
            data-dropdown-portal
            className="fixed z-[99999] rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-top-2 duration-200"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: "min(60vh, 320px)",
              background: "linear-gradient(160deg, hsla(222, 38%, 11%, 0.98) 0%, hsla(220, 36%, 7%, 0.96) 100%)",
              border: "1px solid hsla(43, 88%, 56%, 0.25)",
            }}
          >
            <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: "min(60vh, 320px)" }}>
              {filteredServices.length === 0 ? (
                <div className="p-6 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground">
                    {searchTerm ? "Услуги не найдены" : selectedServices.length > 0 ? "Добавить ещё услуги" : "Начните вводить название услуги"}
                  </div>
                  {searchTerm && (
                    <div className="text-xs text-muted-foreground/60 mt-1">
                      Попробуйте изменить поисковый запрос
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-1.5">
                  {filteredServices.slice(0, 20).map((service) => (
                    <div
                      key={service.yclientsId}
                      className="group/item flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors active:bg-[hsla(43,88%,56%,0.18)] hover:bg-[hsla(43,88%,56%,0.10)]"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addService(service);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        addService(service);
                      }}
                    >
                      <div className="flex items-center min-w-0 flex-1 gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "hsl(var(--gold))", opacity: 0.6 }} />
                        <div className="text-xs sm:text-[13px] font-medium text-foreground/90 truncate group-hover/item:text-[hsl(var(--gold))] transition-colors">
                          {service.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                              style={{ background: "hsla(43,88%,56%,0.12)", color: "hsl(var(--gold))", border: "1px solid hsla(43,88%,56%,0.25)" }}>
                          {parseFloat(service.priceMin).toLocaleString()} ₽
                        </span>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover/item:text-[hsl(var(--gold))] transition-colors" />
                      </div>
                    </div>
                  ))}
                  {filteredServices.length > 20 && (
                    <div className="p-2.5 text-[11px] text-muted-foreground text-center border-t mt-1"
                         style={{ borderColor: "hsl(var(--border))" }}>
                      Показано 20 из {filteredServices.length} — уточните поиск
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
      
      {/* Selected Services */}
      <div className="space-y-1.5">
        {selectedServices.map((service) => {
          const isFree = freeZones.some((zone) => zone.serviceId === service.yclientsId);
          return (
          <div
            key={service.yclientsId}
            className="flex items-center justify-between rounded-lg px-2.5 py-2 cursor-pointer transition-colors"
            style={
              isFree
                ? { background: "hsla(330, 70%, 55%, 0.10)", border: "1px solid hsla(330, 70%, 55%, 0.35)" }
                : { background: "hsla(220, 30%, 10%, 0.55)", border: "1px solid hsl(var(--border))" }
            }
            onDoubleClick={() => handleDoubleClick(service)}
            title={isFree
              ? "Эта услуга добавлена как бесплатная зона"
              : "Двойной клик для добавления бесплатной зоны"
            }
          >
            <div className="flex items-center justify-between min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-medium truncate mr-2"
                      style={{ color: isFree ? "hsl(330, 70%, 75%)" : "hsl(var(--foreground) / 0.9)" }}>
                  {service.title}
                </span>
                {isFree && (
                  <Gift className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(330, 70%, 70%)" }} />
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {editingPrice === service.yclientsId ? (
                  <>
                    <Input
                      type="number"
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          savePrice(service.yclientsId);
                        } else if (e.key === 'Escape') {
                          cancelEditingPrice();
                        }
                      }}
                      className="w-20 h-6 text-xs p-1 text-center"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      onBlur={() => savePrice(service.yclientsId)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-500">₽</span>
                  </>
                ) : (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                      isFree
                        ? 'font-semibold line-through cursor-default'
                        : service.customPrice
                          ? 'font-semibold cursor-pointer hover:bg-white/5'
                          : 'text-muted-foreground cursor-pointer hover:bg-white/5'
                    }`}
                    style={{
                      color: isFree
                        ? "hsl(330, 70%, 70%)"
                        : service.customPrice
                          ? "hsl(var(--gold))"
                          : undefined,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isFree) {
                        startEditingPrice(service.yclientsId, getCurrentPrice(service));
                      }
                    }}
                    title={freeZones.some(zone => zone.serviceId === service.yclientsId) 
                      ? "Бесплатная зона" 
                      : "Нажмите для изменения цены"
                    }
                  >
                    {Math.round(parseFloat(getCurrentPrice(service))).toLocaleString()} ₽
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeService(service.yclientsId)}
              className="text-muted-foreground hover:text-red-400 p-1 flex-shrink-0 h-7 w-7"
            >
              <X size={14} />
            </Button>
          </div>
        );})}
      </div>

      {/* Session count configuration for all services */}
      {selectedServices.length > 0 && (
        <div className="mt-2 space-y-2">
          {selectedServices.map((service) => (
            <div
              key={`session-${service.yclientsId}`}
              className="rounded-lg p-2.5"
              style={{
                background: "hsla(220, 30%, 10%, 0.55)",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground/85 truncate mr-2">{service.title}</span>
                <div className="flex items-center gap-1">
                  {editingSessionCount === service.yclientsId ? (
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={tempSessionCount}
                      onChange={(e) => setTempSessionCount(e.target.value)}
                      onBlur={() => saveSessionCount(service.yclientsId)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          saveSessionCount(service.yclientsId);
                        } else if (e.key === "Escape") {
                          cancelEditingSessionCount();
                        }
                      }}
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      className="w-9 text-xs text-center rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--gold))]"
                    />
                  ) : (
                    <span
                      className="text-xs font-bold cursor-pointer hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors"
                      style={{ color: "hsl(var(--gold))" }}
                      onClick={() => startEditingSessionCount(service.yclientsId, service.sessionCount || 10)}
                      title="Нажмите для изменения"
                    >
                      {service.sessionCount || 10}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">процедур</span>
                </div>
              </div>

              <RangeSlider
                min={1}
                max={20}
                value={service.sessionCount || 10}
                onChange={(value) => updateSessionCount(service.yclientsId, value)}
                showLabels={false}
              />
            </div>
          ))}

          {/* Общее сообщение о бонусной скидке после всех слайдеров */}
          {maxSessionCount >= (calculatorSettings?.bulkDiscountThreshold || 15) && (
            <div
              className="mt-2 px-3 py-2 rounded-lg flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, hsla(43,88%,56%,0.10), hsla(43,80%,40%,0.06))",
                border: "1px solid hsla(43,88%,56%,0.35)",
              }}
            >
              <Gift className="w-3.5 h-3.5" style={{ color: "hsl(var(--gold))" }} />
              <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--gold))" }}>
                +{((calculatorSettings?.bulkDiscountPercentage || 0.05) * 100).toFixed(1)}% за объём ({maxSessionCount}+ процедур)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Free Zones - only show if there are any */}
      {freeZones.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Gift className="w-3.5 h-3.5" style={{ color: "hsl(var(--gold))" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--gold))" }}>
              Бонусные зоны (бесплатно)
            </span>
          </div>

          <div className="space-y-1">
            {freeZones.map((zone) => (
              <div
                key={zone.serviceId}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                style={{
                  background: "hsla(43,88%,56%,0.08)",
                  border: "1px solid hsla(43,88%,56%,0.3)",
                }}
              >
                <div className="flex items-center min-w-0 flex-1 gap-1.5">
                  <Gift className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(var(--gold))" }} />
                  <span className="text-xs font-medium text-foreground/90 truncate">{zone.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFreeZone(zone.serviceId)}
                  className="text-muted-foreground hover:text-red-400 p-0.5 flex-shrink-0 h-5 w-5 flex items-center justify-center rounded transition-colors"
                  title="Убрать из бонусных зон"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}