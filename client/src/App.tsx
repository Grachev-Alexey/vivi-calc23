import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import AuthPage from "@/pages/auth";
import PromoCalculatorPage from "@/pages/promo-calculator";
import AdminPage from "@/pages/admin";

interface User {
  id: number;
  name: string;
  role: 'master' | 'admin';
  pin: string;
  isActive: boolean;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/check", {
        credentials: "include"
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {!user ? (
          <AuthPage onLogin={handleLogin} />
        ) : (
          <Switch>
            <Route path="/admin" component={() => <AdminPage user={user} onLogout={handleLogout} />} />
            <Route component={() => <PromoCalculatorPage user={user} onLogout={handleLogout} />} />
          </Switch>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;