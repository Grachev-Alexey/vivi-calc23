import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const [shake, setShake] = useState(false);
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
          title: "Добро пожаловать",
          description: data.user.name,
        });
      } else {
        const error = await response.json();
        setShake(true);
        setTimeout(() => setShake(false), 450);
        toast({
          title: "Неверный код",
          description: error.message || "Попробуйте ещё раз",
          variant: "destructive",
        });
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Нет связи с сервером",
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-[-25%] left-[-15%] w-[65vw] h-[65vw] rounded-full blur-[20px]"
          style={{ background: "radial-gradient(closest-side, hsla(43, 88%, 56%, 0.18), transparent)" }}
        />
        <div
          className="absolute bottom-[-30%] right-[-15%] w-[70vw] h-[70vw] rounded-full blur-[20px]"
          style={{ background: "radial-gradient(closest-side, hsla(214, 92%, 56%, 0.20), transparent)" }}
        />
      </div>

      <div
        className={`relative ${shake ? "animate-[shake_0.45s_ease]" : ""}`}
        style={{ width: "100%", maxWidth: 420 }}
      >
        {/* Outer glow ring */}
        <div
          className="absolute -inset-px rounded-[28px] opacity-60"
          style={{
            background: "linear-gradient(135deg, hsla(43, 88%, 56%, 0.55), transparent 40%, hsla(214, 92%, 56%, 0.45))",
            filter: "blur(8px)",
          }}
        />

        <div
          className="relative rounded-[26px] overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsla(222, 42%, 11%, 0.92) 0%, hsla(220, 40%, 7%, 0.92) 100%)",
            border: "1px solid hsla(43, 88%, 56%, 0.18)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7), inset 0 1px 0 hsla(0,0%,100%,0.05)",
          }}
        >
          <div className="px-10 pt-12 pb-10">
            {/* Logo / Wordmark */}
            <div className="flex flex-col items-center mb-10">
              <div
                className="text-[64px] leading-none font-black tracking-[-0.04em] mb-3"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  background: "linear-gradient(135deg, hsl(43, 95%, 75%) 0%, hsl(36, 80%, 50%) 60%, hsl(28, 70%, 38%) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 0 80px hsla(43, 88%, 56%, 0.3)",
                }}
              >
                ЭНСО
              </div>
              <div
                className="h-px w-16 mb-3"
                style={{ background: "linear-gradient(90deg, transparent, hsla(43, 88%, 56%, 0.6), transparent)" }}
              />
              <div className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground font-medium">
                Студия
              </div>
            </div>

            {/* PIN inputs */}
            <div className="flex justify-center gap-3 mb-2" onPaste={handlePaste}>
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
                  className="w-14 h-16 text-center text-2xl font-bold rounded-2xl transition-all duration-200 focus:outline-none"
                  style={{
                    background: digit
                      ? "linear-gradient(160deg, hsla(43, 88%, 56%, 0.12), hsla(43, 88%, 56%, 0.04))"
                      : "hsla(220, 30%, 8%, 0.6)",
                    border: digit
                      ? "1.5px solid hsla(43, 88%, 56%, 0.6)"
                      : "1.5px solid hsla(218, 30%, 22%, 1)",
                    color: "hsl(var(--foreground))",
                    boxShadow: digit
                      ? "0 0 0 4px hsla(43, 88%, 56%, 0.1), 0 4px 12px hsla(43, 88%, 56%, 0.15)"
                      : "inset 0 2px 4px rgba(0,0,0,0.3)",
                  }}
                  disabled={loading}
                  autoComplete="off"
                  data-testid={`input-pin-${index}`}
                />
              ))}
            </div>

            <div className="text-center text-xs text-muted-foreground mt-6 h-5">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "hsl(var(--gold))", borderTopColor: "transparent" }} />
                  Проверка кода
                </span>
              ) : (
                "Введите PIN-код"
              )}
            </div>
          </div>

          {/* Bottom accent */}
          <div className="h-1" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold)), transparent)" }} />
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
