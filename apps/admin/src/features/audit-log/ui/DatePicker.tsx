'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import { Calendar } from '@/shared/ui/shadcn/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/shadcn/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/shadcn/select';
import { cn } from '@/shared/lib/utils';

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}

const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

export function DatePicker({ value, onChange, placeholder = '날짜 선택' }: DatePickerProps) {
  const [month, setMonth] = useState<Date>(value ?? new Date());

  const handleMonthChange = (monthStr: string | null) => {
    if (!monthStr) return;
    const newMonth = new Date(month);
    newMonth.setMonth(Number(monthStr));
    setMonth(newMonth);
  };

  const handleYearChange = (yearStr: string | null) => {
    if (!yearStr) return;
    const newMonth = new Date(month);
    newMonth.setFullYear(Number(yearStr));
    setMonth(newMonth);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'w-[160px] justify-start text-left font-normal',
              !value && 'text-muted-foreground',
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 size-4" />
        {value ? format(value, 'yyyy-MM-dd') : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center gap-1 border-b px-3 py-2">
          <Select
            value={String(month.getFullYear())}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-8 w-[80px]">
              <span>{month.getFullYear()}년</span>
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(month.getMonth())}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <span>{MONTHS[month.getMonth()]}</span>
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          month={month}
          onMonthChange={setMonth}
        />
      </PopoverContent>
    </Popover>
  );
}
