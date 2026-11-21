import React, { useState, useEffect, useRef } from 'react';
import InputMask from '@mona-health/react-input-mask';
import { FaCalendarAlt } from 'react-icons/fa';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import MonthCal from '../ui/month-calendar';

export interface MonthInputProps
  extends Omit<
    React.ComponentProps<typeof InputMask>,
    | 'beforeMaskedStateChange'
    | 'mask'
    | 'alwaysShowMask'
    | 'maskPlaceholder'
    | 'placeholder'
    | 'value'
    | 'onChange'
  > {
  value?: string;
  onChange?: (value: string) => void;
  showCalendar?: boolean;
  onSelectDate?: (date: Date) => void;
  fromYear?: number;
  toYear?: number;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  callbacks?: {
    yearLabel?: (year: number) => string;
    monthLabel?: (month: { number: number; name: string }) => string;
  };
  variant?: {
    calendar?: {
      main?: any;
      selected?: any;
    };
    chevrons?: any;
  };
}

const InputMonthPicker: React.FC<MonthInputProps> = ({
  value = '',
  onChange,
  showCalendar = true,
  onSelectDate,
  fromYear = 1960,
  toYear = 2030,
  className = '',
  disabled = false,
  minDate,
  maxDate,
  disabledDates,
  callbacks,
  variant,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  // Internal state untuk display di input
  const [internalValue, setInternalValue] = useState<string>('');
  // State untuk selected month di calendar
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(
    undefined
  );
  // Flag untuk track apakah perubahan dari internal
  const isInternalChange = useRef(false);

  // Sync external value ke internal value dan selected month
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (value) {
      setInternalValue(value);
      // Parse value untuk set selected month di calendar
      const parts = value.split('-');
      if (parts.length === 2) {
        const month = parseInt(parts[0]) - 1; // Month is 0-indexed in Date
        const year = parseInt(parts[1]);
        if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
          setSelectedMonth(new Date(year, month, 1));
        }
      }
    } else {
      setInternalValue('');
      setSelectedMonth(undefined);
    }
  }, [value]);

  // Mask untuk format MM-YYYY
  const monthYearMask = [
    /[0-1]/, // M1
    /\d/, // M2
    '-',
    /\d/, // Y1
    /\d/, // Y2
    /\d/, // Y3
    /\d/ // Y4
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Set flag bahwa ini perubahan internal
    isInternalChange.current = true;

    // Update internal value untuk display
    setInternalValue(inputValue);

    // Check apakah format sudah lengkap (MM-YYYY dengan angka semua)
    const isComplete = /^\d{2}-\d{4}$/.test(inputValue);

    // Parse untuk update selected month di calendar jika valid
    if (isComplete) {
      const parts = inputValue.split('-');
      const month = parseInt(parts[0]) - 1;
      const year = parseInt(parts[1]);
      if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
        setSelectedMonth(new Date(year, month, 1));
      }
    }

    // Kirim ke parent: value lengkap atau empty string
    const externalValue = isComplete ? inputValue : '';
    onChange?.(externalValue);
  };

  // Handler untuk month calendar selection
  const handleMonthSelect = (date: Date) => {
    if (date) {
      // Format sebagai MM-YYYY
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const formatted = `${month}-${year}`;

      // Update internal value
      setInternalValue(formatted);

      // Update selected month
      setSelectedMonth(date);

      // Send formatted string to parent's onChange
      onChange?.(formatted);

      // Optional: send Date object to onSelectDate if provided
      onSelectDate?.(date);

      // Close popover
      setOpen(false);
    }
  };

  return (
    <div
      className={`relative flex flex-row items-center rounded-sm border border-input-border focus-within:border-input-border-focus ${className}`}
    >
      <InputMask
        mask={monthYearMask}
        {...rest}
        className={`focus:background-input-focus text-primary-text h-9 w-full rounded-sm bg-background-input px-3 text-sm focus:bg-background-input-focus focus:outline-none focus:ring-0
          ${disabled ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}
        `}
        onChange={handleChange}
        maskPlaceholder="MM-YYYY"
        disabled={disabled}
        placeholder="MM-YYYY"
        alwaysShowMask
        value={internalValue}
        beforeMaskedStateChange={({
          previousState,
          currentState,
          nextState
        }: any) => {
          const nextVal = nextState.value || '';
          const parts = nextVal.split('-');

          // Validasi format MM-YYYY
          if (
            parts.length >= 1 &&
            parts[0] !== 'MM' &&
            /^\d{1,2}$/.test(parts[0])
          ) {
            const monthStr = parts[0];

            // Validasi bulan (01-12)
            if (monthStr.length === 2) {
              const [fc, sc] = monthStr.split('') as [string, string];

              // Bulan tidak boleh lebih dari 12
              if (fc === '1' && Number(sc) > 2) {
                return {
                  value: previousState.value,
                  selection: previousState.selection
                };
              }

              // First char hanya boleh 0 atau 1
              if (!['0', '1'].includes(fc)) {
                return {
                  value: previousState.value,
                  selection: previousState.selection
                };
              }

              // Tidak boleh 00
              if (fc === '0' && sc === '0') {
                return {
                  value: previousState.value,
                  selection: previousState.selection
                };
              }
            }
          }

          return { value: nextState.value, selection: nextState.selection };
        }}
      />

      {showCalendar && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={`flex h-9 w-9 items-center justify-center border 
                ${
                  disabled
                    ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                    : 'text-primary-text hover:text-primary-text cursor-pointer border-input-border bg-background-grid-header hover:bg-background-input-focus'
                }`}
            >
              <FaCalendarAlt className="text-primary-text h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[200px] max-w-xs border border-border bg-background-header"
            sideOffset={0}
            alignOffset={30}
            side="bottom"
            align="end"
            avoidCollisions={true}
            sticky="partial"
          >
            <MonthCal
              onMonthSelect={handleMonthSelect}
              callbacks={callbacks}
              selectedMonth={selectedMonth}
              variant={variant}
              minDate={minDate}
              maxDate={maxDate}
              disabledDates={disabledDates}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default InputMonthPicker;
