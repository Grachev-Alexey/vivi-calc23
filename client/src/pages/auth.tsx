import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

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
        headers: {
          "Content-Type": "application/json",
        },
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
        // Очистить PIN при ошибке
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
    if (!/^\d*$/.test(value)) return; // Только цифры

    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Только последний символ
    setPin(newPin);

    // Автоматический переход к следующему полю
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Автоматическая отправка при заполнении всех полей
    if (newPin.every((digit) => digit !== "")) {
      handleAuth(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    if (pastedData.length === 4) {
      const newPin = pastedData.split("");
      setPin(newPin);
      handleAuth(pastedData);
    }
  };

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--gradient-background)" }}
    >
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "var(--gradient-premium)" }}
            >
              <Lock className="text-white text-2xl" size={24} />
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--graphite)" }}
            >
              Вход в систему
            </h2>
            <p className="text-gray-600 mb-4">
              Введите 4-значный PIN-код для доступа
            </p>


          </div>

          <div className="space-y-6">
            <div>
              <div
                className="text-sm font-medium mb-4 text-center"
                style={{ color: "var(--graphite)" }}
              >
                Введите PIN-код
              </div>
              <div
                className="flex justify-center space-x-3"
                onPaste={handlePaste}
              >
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
                    className="w-16 h-16 text-center text-2xl font-bold border-2 rounded-xl transition-all duration-200 focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-400/20 focus:scale-105"
                    style={{
                      borderColor: digit
                        ? "hsl(338, 55%, 68%)"
                        : "hsl(220, 13%, 91%)",
                      backgroundColor: digit
                        ? "hsl(338, 55%, 68%, 0.1)"
                        : "white",
                    }}
                    disabled={loading}
                    autoComplete="off"
                  />
                ))}
              </div>
            </div>

            {loading && (
              <div className="text-center">
                <div
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
                  style={{
                    background: "var(--gradient-premium)",
                    color: "white",
                  }}
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Проверка...
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
