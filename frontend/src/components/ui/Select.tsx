import React from 'react';
import { FieldLabel } from './FieldLabel';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  info?: string;
  optional?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      info,
      optional,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <FieldLabel
            htmlFor={selectId}
            label={label}
            info={info}
            optional={optional}
          />
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-surface border text-ink text-xs sm:text-sm rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-150 px-3 py-2 cursor-pointer ${
            error
              ? 'border-danger focus:ring-danger'
              : 'border-line hover:border-muted/50'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-ink">
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-1 text-xs text-danger font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
