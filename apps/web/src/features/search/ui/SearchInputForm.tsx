'use client';

import { TextInput } from 'krds-react';
import { Search } from 'lucide-react';

interface SearchInputFormProps {
  action: string;
  defaultValue?: string;
  inputId: string;
  label: string;
  placeholder?: string;
  className?: string;
  inputName?: string;
  hiddenFields?: Record<string, string | number | null | undefined>;
  variant?: 'large' | 'xlarge';
}

const variantClasses = {
  large:
    '[&_input]:h-[56px] [&_input]:rounded-[8px] [&_input]:px-[16px] [&_input]:pr-[48px] [&_input]:text-[19px]',
  xlarge:
    '[&_input]:h-[64px] [&_input]:rounded-[8px] [&_input]:px-[16px] [&_input]:pr-[56px] [&_input]:text-[22px] large:[&_input]:h-[80px] large:[&_input]:rounded-[10px] large:[&_input]:pr-[64px] large:[&_input]:text-[24px]',
} as const;

const iconClasses = {
  large: 'right-[16px] size-[24px] [&_svg]:size-[20px]',
  xlarge:
    'right-[16px] size-[32px] large:right-[24px] large:size-[40px] [&_svg]:size-[32px] large:[&_svg]:size-[40px]',
} as const;

export function SearchInputForm({
  action,
  defaultValue = '',
  inputId,
  label,
  placeholder = '검색어를 입력해주세요.',
  className = '',
  inputName = 'q',
  hiddenFields,
  variant = 'large',
}: SearchInputFormProps) {
  return (
    <form role="search" action={action} method="get" className={className}>
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) =>
          value === null || value === undefined || value === '' ? null : (
            <input key={name} type="hidden" name={name} value={String(value)} />
          ),
        )}
      <div
        className={`relative w-full [&_.form-conts]:relative [&_.form-tit]:sr-only [&_input]:w-full [&_input]:border-[#58616a] [&_input]:bg-white [&_input]:leading-[1.5] [&_input]:font-bold [&_input]:text-[#1e2124] [&_input::placeholder]:text-[#8a949e] ${variantClasses[variant]}`}
      >
        <TextInput
          id={inputId}
          name={inputName}
          type="search"
          label={label}
          placeholder={placeholder}
          defaultValue={defaultValue}
          size="large"
        />
        <button
          type="submit"
          className={`absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-[#1e2124] hover:text-[#1e694e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#256ef4] ${iconClasses[variant]}`}
          aria-label="검색"
        >
          <Search aria-hidden="true" strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
