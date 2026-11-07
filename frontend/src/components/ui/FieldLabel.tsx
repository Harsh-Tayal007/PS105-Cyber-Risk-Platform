import React from 'react';
import { InfoTip } from './InfoTip';

export interface FieldLabelProps {
  htmlFor?: string;
  label: string;
  info?: string;
  optional?: boolean;
  className?: string;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({
  htmlFor,
  label,
  info,
  optional = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between mb-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium text-ink cursor-pointer"
        >
          {label}
        </label>
        {info && <InfoTip content={info} title={label} />}
      </div>
      {optional && (
        <span className="text-[11px] text-muted font-normal italic">
          Optional
        </span>
      )}
    </div>
  );
};

