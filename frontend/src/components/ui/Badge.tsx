import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
}) => {
  const variantMap = {
    default: 'bg-surface-2 text-muted border-line',
    primary: 'bg-brand-soft text-brand border-brand/20',
    success: 'bg-ok-soft text-ok border-ok/20',
    warning: 'bg-warn-soft text-warn border-warn/20',
    danger: 'bg-danger-soft text-danger border-danger/20',
    info: 'bg-brand-soft text-brand border-brand/20',
    outline: 'bg-transparent text-muted border-line',
  };

  const sizeMap = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variantMap[variant]} ${sizeMap[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
