import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Briefcase,
  CheckCircle,
  Info,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { Alert, Button, Input, Select } from "../../components/common/UI";
import { authApi } from "../../services/api";

const ALPHA_SPACE = /^[A-Za-z ]+$/;
const toTitleCase = (value: string) =>
  value
    .replace(/[^A-Za-z ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\B\w/g, (char) => char.toLowerCase());

const registerSchema = z.object({
  firstName: z
    .string()
    .regex(ALPHA_SPACE, "Only alphabets & spaces")
    .min(2, "Min 2 characters"),
  lastName: z
    .string()
    .regex(ALPHA_SPACE, "Only alphabets & spaces")
    .min(2, "Min 2 characters"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["employee", "intern"], {
    required_error: "Please select a role",
  }),
});
type RegisterForm = z.infer<typeof registerSchema>;

/** Extract a user-friendly message from an Axios error */
function getRegisterErrorMessage(error: any): string {
  if (!error?.response) {
    if (error?.code === "ECONNABORTED") return "Request timed out. Please check your connection and try again.";
    return "Unable to reach the server. Please check your internet connection.";
  }

  const status = error.response.status;
  const serverMsg = error.response.data?.message;

  switch (status) {
    case 400:
      return serverMsg || "Invalid registration data. Please check all fields.";
    case 409:
      return serverMsg || "An account with this email already exists. Try signing in instead.";
    case 422:
      return serverMsg || "Please check your inputs and try again.";
    case 429:
      return "Too many registration attempts. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
      return "Server is temporarily unavailable. Please try again later.";
    default:
      return serverMsg || "Registration failed. Please try again.";
  }
}

export const RegisterPage: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "employee" },
  });

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => setSuccess(true),
    onError: (e: any) => setApiError(getRegisterErrorMessage(e)),
  });

  const isNetworkError =
    apiError.toLowerCase().includes("connection") ||
    apiError.toLowerCase().includes("reach") ||
    apiError.toLowerCase().includes("timed out");

  const brandLeftPanel = (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 flex-col items-center justify-center p-12 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 35%, #3b1a6e 70%, #6b2fa0 100%)'}}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(139,92,246,0.15),_transparent_28%)] pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-72 bg-white/5 blur-3xl" />

      <div className="relative z-10 max-w-md text-left">
        <div className="inline-flex items-center gap-3 bg-white/10 text-white/90 rounded-full px-4 py-2 mb-6 border border-white/10">
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span className="text-xs uppercase tracking-[0.35em]">Join the team</span>
        </div>

        <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
          Build your employee profile with ease
        </h1>
        <p className="mt-5 text-slate-200/90 text-base leading-7">
          Register now and complete your onboarding journey with secure digital forms and instant updates.
        </p>

        <div className="mt-10 grid gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-purple-200">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-semibold">Fast setup</p>
              <p className="text-slate-200/70 text-sm">Complete registration in minutes and move ahead with confidence.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-purple-200">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-semibold">Clear guidance</p>
              <p className="text-slate-200/70 text-sm">Helpful prompts guide you through every step of registration.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-purple-200">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-semibold">Verified readiness</p>
              <p className="text-slate-200/70 text-sm">Once registered, your profile is ready for onboarding approval.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen flex relative">
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        {brandLeftPanel}

        {/* ── Right Success Panel ─────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-canvas">
          <div className="w-full max-w-sm text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              Registration Successful
            </h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Your self-registration was successful. An administrator will review and activate your account.
            </p>
            <Link to="/login" className="w-full">
              <Button className="w-full py-2.5">
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {brandLeftPanel}

      {/* ── Right Form Panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-canvas">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-slate-800 font-bold text-sm">
            HR Onboarding Portal
          </span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              Create Account
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Sign up to get started with onboarding
            </p>
          </div>

          {apiError && (
            <Alert
              type={isNetworkError ? "warning" : "error"}
              title={isNetworkError ? "Connection Issue" : "Registration Failed"}
              message={apiError}
              onClose={() => setApiError("")}
              className="mb-5"
            />
          )}

          <form
            onSubmit={handleSubmit((d) => {
              setApiError("");
              mutation.mutate(d);
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="John"
                leftIcon={<User className="w-4 h-4" />}
                error={errors.firstName?.message}
                required
                {...register("firstName", {
                  onChange: (e) => {
                    e.target.value = toTitleCase(e.target.value);
                  },
                })}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                error={errors.lastName?.message}
                required
                {...register("lastName", {
                  onChange: (e) => {
                    e.target.value = toTitleCase(e.target.value);
                  },
                })}
              />
            </div>

            <Input
              label="Work Email"
              type="email"
              placeholder="john.doe@company.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              required
              {...register("email")}
            />

            <Select
              label="Applying As"
              error={errors.role?.message}
              required
              options={[
                { value: "employee", label: "Employee" },
                { value: "intern", label: "Intern" },
              ]}
              {...register("role")}
            />

            <Button
              type="submit"
              loading={mutation.isPending}
              className="w-full justify-center py-2.5 mt-2"
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
