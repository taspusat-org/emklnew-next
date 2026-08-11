import React, { useCallback, useRef, useState } from 'react';
import InputMask from '@mona-health/react-input-mask';
import { Calendar } from '@/components/ui/calendar';
import { FaCalendarAlt } from 'react-icons/fa';
import { parse, format } from 'date-fns';
import { isLeapYear, formatDateCalendar } from '@/lib/utils';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '../ui/button';

export interface DateInputProps
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
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showCalendar?: boolean;
  onSelect?: (date: Date) => void;
  fromYear?: number;
  toYear?: number;
  className?: string;
  disabled?: boolean;
  readOnly?: any;
}

function formatDisplayValue(value: string): string | null {
  if (!value || value === 'DD-MM-YYYY') return null;
  if (value.includes('D') || value.includes('M') || value.includes('Y'))
    return null;
  try {
    const parsed = parse(value, 'dd-MM-yyyy', new Date());
    if (isNaN(parsed.getTime())) return null;
    return format(parsed, 'EEE, d MMM yyyy');
  } catch {
    return null;
  }
}

const InputDatePicker: React.FC<DateInputProps> = ({
  value = '',
  onChange,
  showCalendar = false,
  onSelect,
  fromYear = 1960,
  toYear = 2030,
  className = '',
  disabled = false,
  readOnly = false,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const maskRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const focusMaskedInput = useCallback(() => {
    setIsFocused(true);
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const inputEl =
        maskRef.current ??
        (containerRef.current?.querySelector(
          'input'
        ) as HTMLInputElement | null);
      inputEl?.focus({ preventScroll: true });
    });
  }, []);

  const displayValue = formatDisplayValue(value);
  const showDisplayOverlay =
    !isFocused && !disabled && !readOnly && displayValue !== null;

  const dateMask = [
    /[0-3]/,
    /\d/,
    '-',
    /[0-1]/,
    /\d/,
    '-',
    /\d/,
    /\d/,
    /\d/,
    /\d/
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Anchor membungkus seluruh input — posisi popover mengacu ke elemen ini */}
      <PopoverAnchor asChild>
        <div
          ref={containerRef}
          className={`relative flex flex-row items-center rounded-sm border border-input-border focus-within:border-input-border-focus ${className}`}
        >
          {showDisplayOverlay && (
            <div
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                focusMaskedInput();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                focusMaskedInput();
              }}
              className="z-5 absolute inset-0 flex cursor-text select-none items-center rounded-sm bg-background-input px-3 text-sm text-input-text"
            >
              {displayValue}
            </div>
          )}

          <InputMask
            mask={dateMask}
            {...rest}
            inputRef={maskRef}
            className={`h-9 w-full rounded-sm px-3 text-sm focus:bg-background-input-focus focus:outline-none focus:ring-0
              ${
                disabled
                  ? 'cursor-not-allowed bg-background-input-disabled text-input-text-disabled'
                  : 'text-input-text'
              }
            `}
            maskPlaceholder="DD-MM-YYYY"
            placeholder="DD-MM-YYYY"
            alwaysShowMask
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            beforeMaskedStateChange={({
              previousState,
              currentState,
              nextState
            }: any) => {
              const nextVal = nextState.value || '';
              const parts = nextVal.split('-');

              if (parts.length >= 1 && /^\d{2}/.test(parts[0])) {
                const [d1, d2] = parts[0].split('');
                if (d1 === '3' && d2 !== 'D' && Number(d2) > 1) {
                  return {
                    value: previousState.value,
                    selection: previousState.selection
                  };
                }
              }

              if (
                parts.length === 3 &&
                parts[0] !== 'DD' &&
                parts[1] !== 'MM' &&
                /^\d{2}$/.test(parts[0]) &&
                /^\d{2}$/.test(parts[1])
              ) {
                const dayNum = Number(parts[0]);
                const monthStr = parts[1];
                const yearNum = Number(parts[2]);

                if (dayNum === 31) {
                  const monthsWith31 = [
                    '01',
                    '03',
                    '05',
                    '07',
                    '08',
                    '10',
                    '12'
                  ];
                  if (!monthsWith31.includes(monthStr)) {
                    return {
                      value: previousState.value,
                      selection: previousState.selection
                    };
                  }
                }
                if (dayNum === 30 && monthStr === '02') {
                  return {
                    value: previousState.value,
                    selection: previousState.selection
                  };
                }
                if (parts[1].length === 2) {
                  const [fc, sc] = monthStr.split('') as [string, string];
                  if (fc === '1' && Number(sc) > 2) {
                    return {
                      value: previousState.value,
                      selection: previousState.selection
                    };
                  }
                  if (!['0', '1'].includes(fc)) {
                    return {
                      value: previousState.value,
                      selection: previousState.selection
                    };
                  }
                  if (fc === '0' && sc === '0') {
                    return {
                      value: previousState.value,
                      selection: previousState.selection
                    };
                  }
                }
                if (
                  parts[0] === '29' &&
                  parts[1] === '02' &&
                  /^\d{4}$/.test(parts[2])
                ) {
                  if (!isLeapYear(yearNum)) {
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
            <PopoverTrigger asChild>
              <Button
                type="button"
                disabled={disabled}
                className={`z-5 relative flex h-9 w-9 items-center justify-center rounded-l-none border
                  ${
                    disabled
                      ? 'cursor-not-allowed bg-background-input-disabled text-input-text-disabled'
                      : 'cursor-pointer border-input-border bg-background-grid-header text-button-text hover:bg-background-input-focus hover:text-button-text'
                  }`}
              >
                <FaCalendarAlt className="h-4 w-4 text-button-text" />
              </Button>
            </PopoverTrigger>
          )}
        </div>
      </PopoverAnchor>

      {showCalendar && (
        <PopoverContent
          className="w-auto max-w-xs border border-border bg-background-card"
          side="bottom"
          align="start"
          avoidCollisions
          collisionPadding={8}
          sideOffset={0}
        >
          <Calendar
            mode="single"
            captionLayout="dropdown-buttons"
            fromYear={fromYear}
            toYear={toYear}
            defaultMonth={
              value && value !== 'DD-MM-YYYY'
                ? parse(value, 'dd-MM-yyyy', new Date())
                : new Date()
            }
            selected={
              value ? parse(value, 'dd-MM-yyyy', new Date()) : undefined
            }
            onSelect={(date) => {
              if (date) {
                const formatted = formatDateCalendar(date);
                onChange?.({ target: { value: formatted } } as any);
                onSelect?.(formatted as unknown as Date);
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      )}
    </Popover>
  );
};

export default InputDatePicker;
