import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { Alert, Button, Input } from "../../components/common/UI";
import { useAuthStore } from "../../context/authStore";
import { authApi } from "../../services/api";
import type { Role } from "../../types";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const dashboardMap: Record<Role, string> = {
  employee: "/employee/dashboard",
  intern: "/employee/dashboard",
  admin: "/admin/dashboard",
  super_admin: "/super-admin/dashboard",
};

/** Extract a user-friendly message from an Axios error */
function getLoginErrorMessage(error: any): string {
  if (!error?.response) {
    if (error?.code === "ECONNABORTED") return "Request timed out. Please check your connection and try again.";
    return "Unable to reach the server. Please check your internet connection.";
  }

  const status = error.response.status;
  const serverMsg = error.response.data?.message;

  switch (status) {
    case 400:
      return serverMsg || "Invalid request. Please check your inputs.";
    case 401:
      return serverMsg || "Invalid email or password.";
    case 403:
      return serverMsg || "Your account has been disabled. Contact your administrator.";
    case 404:
      return "Account not found. Please check your email or register.";
    case 429:
      return "Too many login attempts. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
      return "Server is temporarily unavailable. Please try again later.";
    default:
      return serverMsg || "Login failed. Please try again.";
  }
}

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ data }) => {
      const { token, user } = data.data!;
      queryClient.clear();
      setAuth(user, token);
      toast.success(`Welcome back, ${user.firstName}!`);
      if (user.isFirstLogin) navigate("/reset-password");
      else navigate(dashboardMap[user.role]);
    },
    onError: (error: any) => {
      setApiError(getLoginErrorMessage(error));
    },
  });

  const isNetworkError = apiError.toLowerCase().includes("connection") || apiError.toLowerCase().includes("reach");

  return (
    <div className="min-h-screen flex relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* ── Left: Brand panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #051329 0%, #0a2240 40%, #004b5c 75%, #0c6a80 100%)'}}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_28%)] pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-72 bg-white/5 blur-3xl" />

        <div className="relative z-10 max-w-md text-left">
          <div className="inline-flex items-center gap-3 bg-white/10 text-white/90 rounded-full px-4 py-2 mb-6 border border-white/10">
            <span className="text-xs uppercase tracking-[0.35em]">HR made modern</span>
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Welcome back to BitByte HR
          </h1>
          <p className="mt-5 text-slate-200/90 text-base leading-7">
            Faster onboarding, secure access, and smarter employee lifecycle management—all in one polished portal.
          </p>

          <div className="mt-10 grid gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-semibold">Instant access</p>
                <p className="text-slate-200/70 text-sm">Login securely and pick up where you left off.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-semibold">Secure data</p>
                <p className="text-slate-200/70 text-sm">Your employee records stay protected with every sign in.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-semibold">24/7 workflow</p>
                <p className="text-slate-200/70 text-sm">Access onboarding tools anytime from any device.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-canvas">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-slate-800 font-bold text-sm">
            HR Onboarding Portal
          </span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              Sign in
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Enter your credentials to access the portal
            </p>
          </div>

          {apiError && (
            <Alert
              type={isNetworkError ? "warning" : "error"}
              title={isNetworkError ? "Connection Issue" : "Sign-in Failed"}
              message={apiError}
              onClose={() => setApiError("")}
              className="mb-5"
            />
          )}

          <form
            onSubmit={handleSubmit((d) => {
              setApiError("");
              loginMutation.mutate(d);
            })}
            className="space-y-4"
          >
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mt-1.5 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                {showPassword ? "Hide" : "Show"} password
              </button>
            </div>

            <Button
              type="submit"
              loading={loginMutation.isPending}
              className="w-full justify-center py-2.5 mt-2"
            >
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New employee?{" "}
            <Link
              to="/register"
              className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              Register here
            </Link>
          </p>

          <p className="text-center text-xs text-slate-400 mt-8">
            Admins and Super Admins use the same login.
          </p>
        </div>
      </div>
    </div>
  );
};
