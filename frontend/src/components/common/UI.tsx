import React from 'react';
import { X, Loader2, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

// ── Button ────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading = false,
  icon, children, disabled, className = '', ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const variants = {
    primary:
      'bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:-translate-y-px active:translate-y-0 focus-visible:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600',
    secondary:
      'bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:-translate-y-px active:translate-y-0 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700',
    danger:
      'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:-translate-y-px active:translate-y-0 focus-visible:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600',
    success:
      'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:-translate-y-px active:translate-y-0 focus-visible:ring-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-600',
    ghost:
      'text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ── Input ─────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '_');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {props.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-300 dark:text-slate-600">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`form-input ${leftIcon ? 'pl-9' : ''} ${error ? 'form-input-error' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ── Select ────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '_');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {props.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`form-input ${error ? 'form-input-error' : ''} ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="form-error">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ── Badge ─────────────────────────────────────────────────────────────────
type BadgeVariant = 'pending' | 'submitted' | 'approved' | 'rejected' | 'review' | 'info' | 'default';
interface BadgeProps { variant?: BadgeVariant; children: React.ReactNode; className?: string }

const badgeStyles: Record<BadgeVariant, string> = {
  pending:   'bg-amber-50  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  submitted: 'bg-blue-50   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  approved:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected:  'bg-red-50    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  review:    'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  info:      'bg-slate-100 text-slate-600  dark:bg-slate-800     dark:text-slate-400',
  default:   'bg-slate-100 text-slate-600  dark:bg-slate-800     dark:text-slate-400',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => (
  <span className={`badge ${badgeStyles[variant]} ${className}`}>{children}</span>
);

// ── Spinner ───────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md', className = '',
}) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-8 h-8' };
  return <Loader2 className={`animate-spin text-primary-500 ${sizes[size]} ${className}`} />;
};

// ── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean; onClose: () => void; title: string;
  children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      {/* Panel */}
      <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full ${sizes[size]} animate-fade-in`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Alert ─────────────────────────────────────────────────────────────────
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string; message: string; onClose?: () => void; className?: string;
}

const alertConfig = {
  success: { icon: CheckCircle, classes: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/40 dark:text-emerald-300', iconClass: 'text-emerald-500' },
  error:   { icon: XCircle,    classes: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/40 dark:text-red-300',           iconClass: 'text-red-500'     },
  warning: { icon: AlertCircle,classes: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-300',     iconClass: 'text-amber-500'   },
  info:    { icon: Info,       classes: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/40 dark:text-blue-300',        iconClass: 'text-blue-500'    },
};

export const Alert: React.FC<AlertProps> = ({ type, title, message, onClose, className = '' }) => {
  const { icon: Icon, classes, iconClass } = alertConfig[type];
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${classes} ${className}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-0.5">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="ml-auto pl-2 flex-shrink-0 opacity-50 hover:opacity-80 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ── EmptyState ────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && (
      <div className="mb-4 text-slate-200 dark:text-slate-700">{icon}</div>
    )}
    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</h3>
    {description && (
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ── PageLoader ────────────────────────────────────────────────────────────
export const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-slate-900">
    <div className="flex flex-col items-center gap-3">
      <Spinner size="lg" />
      <p className="text-xs text-slate-400 dark:text-slate-500 animate-pulse tracking-wide">Loading…</p>
    </div>
  </div>
);
