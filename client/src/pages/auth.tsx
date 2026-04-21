import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Sparkles } from "lucide-react";

interface User {
  id: number;
  name: string;
  role: "master" | "admin";
}

interface AuthPageProps {
  onLogin: (user: User) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  const handleAuth = async (fullPin: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin: fullPin }),
      });

      if (response.ok) {
        const data = await response.json();
        onLogin(data.user);
        toast({
          title: "Успешно",
          description: `Добро пожаловать, ${data.user.name}!`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Ошибка входа",
          description: error.message || "Неверный PIN-код",
          variant: "destructive",
        });
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Ошибка подключения к серверу",
        variant: "destructive",
      });
      setPin(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
    if (newPin.every((digit) => digit !== "")) handleAuth(newPin.join(""));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      setPin(pasted.split(""));
      handleAuth(pasted);
    }
  };

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full"
             style={{ background: "radial-gradient(closest-side, hsla(43, 88%, 56%, 0.18), transparent)" }} />
        <div className="absolute bottom-[-30%] right-[-15%] w-[60vw] h-[60vw] rounded-full"
             style={{ background: "radial-gradient(closest-side, hsla(214, 92%, 56%, 0.18), transparent)" }} />
        <div className="absolute inset-0"
             style={{ backgroundImage: "linear-gradient(to right, hsla(218, 30%, 26%, 0.18) 1px, transparent 1px), linear-gradient(to bottom, hsla(218, 30%, 26%, 0.18) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)" }} />
      </div>

      <Card className="w-full max-w-md card-glass border-0">
        <CardContent className="p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full text-xs uppercase tracking-[0.2em] font-semibold"
                 style={{ background: "hsla(43, 88%, 56%, 0.1)", color: "hsl(var(--gold))", border: "1px solid hsla(43, 88%, 56%, 0.25)" }}>
              <Sparkles className="w-3 h-3" /> ENSO Studio
            </div>
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                 style={{ background: "var(--gradient-premium)", boxShadow: "var(--shadow-gold)" }}>
              <Lock className="w-9 h-9" style={{ color: "hsl(var(--navy))" }} />
            </div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">
              <span className="text-premium">ЭНСО</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Введите 4-значный PIN-код для входа
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-16 text-center text-2xl font-bold rounded-xl transition-all duration-200 focus:outline-none focus:scale-105"
                  style={{
                    background: "hsla(220, 30%, 10%, 0.7)",
                    border: digit ? "2px solid hsl(var(--gold))" : "2px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    boxShadow: digit ? "0 0 0 4px hsla(43, 88%, 56%, 0.15)" : "none",
                  }}
                  disabled={loading}
                  autoComplete="off"
                  data-testid={`input-pin-${index}`}
                />
              ))}
            </div>

            {loading && (
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
                     style={{ background: "var(--gradient-premium)", color: "hsl(var(--navy))" }}>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                  Проверка...
                </div>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground/70">
            ENSO Calc · Премиум калькулятор абонементов
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
