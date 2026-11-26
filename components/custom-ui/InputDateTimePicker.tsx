import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import InputMask from '@mona-health/react-input-mask';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FaCalendarAlt } from 'react-icons/fa';
import { format, parse, isValid, isLeapYear } from 'date-fns';

export interface InputDateTimePickerProps
  extends Omit<
    React.ComponentProps<typeof InputMask>,
    | 'value'
    | 'onChange'
    | 'mask'
    | 'alwaysShowMask'
    | 'placeholder'
    | 'beforeMaskedStateChange'
  > {
  value: string;
  onChange: (next: string) => void;
  showCalendar?: boolean;
  showTime?: boolean;
  minuteStep?: number;
  fromYear?: number;
  toYear?: number;
  dateFormat?: string;
  outputFormat?: string;
  placeholderText?: string;
  clearable?: boolean;
  className?: string;
  disabled?: boolean;
}

const DATE_MASK: Array<RegExp | string> = [
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

const DATETIME_12H_MASK: Array<RegExp | string> = [
  /[0-3]/,
  /\d/,
  '-',
  /[0-1]/,
  /\d/,
  '-',
  /\d/,
  /\d/,
  /\d/,
  /\d/, // YYYY
  ' ',
  /[0-1]/,
  /\d/,
  ':',
  /[0-5]/,
  /\d/,
  ' ',
  /[AP]/i,
  /[M]/i // hh:mm AM/PM
];

// Placeholder mask netral (biar user bebas isi AM/PM)
const MASK_PLACEHOLDER = 'DD-MM-YYYY HH:MM AM';

const timeButtonClass = (selected: boolean) =>
  `aspect-square shrink-0 sm:w-full ${
    selected ? '' : 'hover:bg-background-input-focus hover:text-input-text'
  }`;

function tryParse(value: string, dateFmt: string): Date | null {
  if (!value || !value.trim()) return null;

  // 1) ISO lokal keluaran komponen (yyyy-MM-dd'T'HH:mm)
  const iso = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
  if (isValid(iso)) return iso;

  // 2) Format 12h dengan AM/PM (sesuai mask input)
  const p1 = parse(value, `${dateFmt} hh:mm a`, new Date());
  if (isValid(p1)) return p1;

  // 3) 24h fallback pakai pola tanggal input
  const p2 = parse(value, `${dateFmt} HH:mm`, new Date());
  if (isValid(p2)) return p2;

  // 4) Tanggal saja (pola input)
  const p3 = parse(value, dateFmt, new Date());
  if (isValid(p3)) return p3;

  // 5) (opsional) ISO tanggal saja, kalau suatu saat diperlukan
  const isoDateOnly = parse(value, 'yyyy-MM-dd', new Date());
  if (isValid(isoDateOnly)) return isoDateOnly;

  return null;
}
function toDateString(d: Date | null, fmt: string): string {
  return d ? format(d, fmt) : '';
}

function validDayInMonth(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  const thirtyOne = [1, 3, 5, 7, 8, 10, 12];
  if (day < 1) return false;
  if (month === 2) {
    const max = isLeapYear(new Date(year, 0, 1)) ? 29 : 28;
    return day <= max;
  }
  if (thirtyOne.includes(month)) return day <= 31;
  return day <= 30;
}

const InputDateTimePicker = forwardRef<
  HTMLInputElement,
  InputDateTimePickerProps
>(
  (
    {
      value,
      onChange,
      showCalendar = true,
      showTime = false,
      minuteStep = 1,
      fromYear = 1960,
      toYear = 2035,
      dateFormat = 'dd-MM-yyyy',
      outputFormat,
      placeholderText,
      clearable = true,
      className = '',
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const outFmt =
      outputFormat ?? (showTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
    const [open, setOpen] = useState(false);

    const parsed = useMemo(
      () => tryParse(value, dateFormat),
      [value, dateFormat]
    );

    const [inputText, setInputText] = useState<string>(
      toDateString(parsed, showTime ? `${dateFormat} hh:mm a` : dateFormat)
    );

    useEffect(() => {
      setInputText(
        toDateString(parsed, showTime ? `${dateFormat} hh:mm a` : dateFormat)
      );
    }, [parsed, dateFormat, showTime]);

    const mask = showTime ? DATETIME_12H_MASK : DATE_MASK;
    const placeholder =
      placeholderText ??
      (showTime ? 'DD-MM-YYYY HH:MM AM/PM' : dateFormat.toUpperCase());

    const pickDate = (d?: Date) => {
      if (!d) return;
      let finalDate = d;
      if (showTime && parsed) {
        finalDate = new Date(d);
        finalDate.setHours(parsed.getHours(), parsed.getMinutes(), 0, 0);
      }
      onChange(format(finalDate, outFmt));
      // setOpen(false);
    };

    const setTimePart = (
      type: 'hour' | 'minute' | 'ampm',
      v: number | 'AM' | 'PM'
    ) => {
      const base = new Date(parsed ?? new Date());
      let h = base.getHours();
      let m = base.getMinutes();

      if (type === 'hour' && typeof v === 'number') {
        const isPM = h >= 12;
        const mapped = v % 12; // 12 -> 0
        h = isPM ? mapped + 12 : mapped;
        if (!isPM && v === 12) h = 0; // 12 AM
        if (isPM && v === 12) h = 12; // 12 PM
      }
      if (type === 'minute' && typeof v === 'number') {
        m = v;
      }
      if (type === 'ampm' && (v === 'AM' || v === 'PM')) {
        const wantPM = v === 'PM';
        h = wantPM ? (h % 12) + 12 : h % 12;
      }

      const next = new Date(base);
      next.setHours(h, m, 0, 0);

      // Update value dengan waktu yang baru (parsed akan dihitung ulang berdasarkan value)
      onChange(format(next, outFmt)); // kirim hasil format yang benar
    };

    const clear = () => {
      setInputText('');
      onChange('');
    };
    const commitFromInput = (text: string) => {
      if (!text || /[_]/.test(text)) {
        onChange('');
        return;
      }
      const d = tryParse(text, dateFormat);
      onChange(d ? format(d, outFmt) : '');
    };
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setInputText(text);
      const d = tryParse(text, dateFormat);
      if (!d) return;
      onChange(format(d, outFmt)); // sekarang memancarkan "2002-12-12T12:12"
    };

    const beforeMaskedStateChangeDT = ({ previousState, nextState }: any) => {
      let nextVal: string = nextState?.value ?? '';

      // Uppercase "am/pm" jika user mengetik lowercase
      nextVal = nextVal.replace(
        /\s(am|pm)/gi,
        (m) => ` ${m.trim().toUpperCase()}`
      );

      // ====== Validasi TANGGAL ======
      const datePart = nextVal.slice(0, 10); // DD-MM-YYYY
      const parts = datePart.split('-');
      if (
        parts.length === 3 &&
        /^\d{2}$/.test(parts[0]) &&
        /^\d{2}$/.test(parts[1])
      ) {
        const dayStr = parts[0];
        const monthStr = parts[1];
        const yearStr = parts[2];

        if (dayStr !== 'DD' && monthStr !== 'MM') {
          const dayNum = Number(dayStr);
          const yearNum = /^\d{4}$/.test(yearStr) ? Number(yearStr) : NaN;

          // Validasi bulan: hanya 01–12
          if (monthStr.length === 2) {
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
          }

          // 31-hari hanya pada bulan tertentu
          const monthsWith31 = ['01', '03', '05', '07', '08', '10', '12'];
          if (dayNum === 31 && !monthsWith31.includes(monthStr)) {
            return {
              value: previousState.value,
              selection: previousState.selection
            };
          }

          // Validasi umum tanggal jika tahun sudah 4 digit
          if (/^\d{4}$/.test(yearStr)) {
            const monthNum = Number(monthStr);
            if (!validDayInMonth(dayNum, monthNum, yearNum)) {
              return {
                value: previousState.value,
                selection: previousState.selection
              };
            }
          }
        }
      }

      nextVal = nextVal.replace(
        /\s([ap])(\b|$)/i,
        (_, ap) => ` ${ap.toUpperCase()}M`
      );
      // ====== Validasi WAKTU 12h (hh:mm AM/PM) ======
      if (nextVal.length >= 16 && nextVal[10] === ' ') {
        const compact = nextVal.replace(/_/g, '');
        const m = compact.match(
          /^(\d{2})-(\d{2})-(\d{4})\s(\d{2}):(\d{2})(?:\s([AP]M))?$/
        );
        if (m) {
          const hh = Number(m[4]);
          const mm = Number(m[5]);

          // Batasi hh 01–12 (tolak 00 dan >12)
          if (hh === 0 || hh > 12) {
            return {
              value: previousState.value,
              selection: previousState.selection
            };
          }
          // Menit 00–59
          if (mm < 0 || mm > 59) {
            return {
              value: previousState.value,
              selection: previousState.selection
            };
          }
        }
      }

      return { value: nextVal, selection: nextState.selection };
    };
    const innerRef = useRef<HTMLInputElement | null>(null);

    // gabungkan ref luar & dalam
    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    // cari range 'DD' dari mask placeholder
    const [dayStart, dayEnd] = useMemo(() => {
      const src = placeholder;
      const idx = src.indexOf('DD');
      return [idx >= 0 ? idx : 0, (idx >= 0 ? idx : 0) + 2];
    }, [placeholder]);

    const focusDay = () => {
      const el = innerRef.current;
      if (!el) return;
      // tunggu frame berikut agar tidak ditimpa caret default
      requestAnimationFrame(() => {
        try {
          el.setSelectionRange(dayStart, dayEnd);
        } catch {}
      });
    };

    return (
      <div
        className={`relative flex items-center rounded-sm border border-input-border focus-within:border-input-border-focus ${
          disabled ? 'pointer-events-none' : ''
        } ${className}`}
      >
        <InputMask
          ref={setRefs as any}
          {...rest}
          mask={mask}
          className={`h-9 w-full rounded-sm bg-background-input px-3 text-sm focus:bg-background-input-focus focus:outline-none focus:ring-0 ${
            disabled
              ? 'cursor-not-allowed bg-background-input-disabled text-input-text-disabled'
              : 'text-input-text'
          }`}
          maskPlaceholder={
            showTime ? MASK_PLACEHOLDER : dateFormat.toUpperCase()
          }
          placeholder={placeholder}
          alwaysShowMask
          value={inputText}
          onChange={handleInputChange}
          onBlur={() => commitFromInput(inputText)}
          beforeMaskedStateChange={beforeMaskedStateChangeDT}
          disabled={disabled}
          onMouseDown={(e) => {
            // cegah browser menempatkan caret di posisi klik
            e.preventDefault();
            innerRef.current?.focus();
            focusDay();
          }}
          onTouchStart={(e) => {
            // mobile: sama seperti mouse
            e.preventDefault();
            innerRef.current?.focus();
            focusDay();
          }}
          onFocus={() => {
            // keyboard focus (Tab) juga diarahkan ke DD
            focusDay();
          }}
        />

        {clearable && !disabled && (value || inputText) && (
          <button
            type="button"
            aria-label="Clear date"
            className="absolute right-9 mr-1 rounded p-1 text-xs text-input-text hover:bg-background-input-focus"
            onClick={clear}
          >
            ✕
          </button>
        )}

        {showCalendar && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-r-sm border ${
                  disabled
                    ? 'cursor-not-allowed bg-background-input-disabled text-input-text-disabled'
                    : 'cursor-pointer border-input-border bg-background-grid-header text-button-text hover:bg-background-input-focus'
                }`}
              >
                <FaCalendarAlt className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="flex w-auto flex-row border border-border bg-background-card p-2 text-input-text"
              sideOffset={-1}
              align="end"
            >
              <div className={showTime ? 'sm:flex' : undefined}>
                <Calendar
                  mode="single"
                  captionLayout="dropdown-buttons"
                  fromYear={fromYear}
                  toYear={toYear}
                  defaultMonth={parsed ?? new Date()}
                  selected={parsed ?? undefined}
                  onSelect={pickDate}
                />
              </div>

              {showTime && (
                <div className="mt-2 flex flex-col divide-y divide-border sm:ml-2 sm:mt-0 sm:h-[300px] sm:flex-row sm:divide-x sm:divide-y-0">
                  <ScrollArea className="w-64 sm:w-auto">
                    <div className="flex p-2 sm:flex-col">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                        const selected = (parsed?.getHours() % 12 || 12) === h;
                        return (
                          <Button
                            type="button"
                            key={h}
                            size="icon"
                            variant={selected ? 'default' : 'ghost'}
                            className={timeButtonClass(selected)}
                            onClick={() => setTimePart('hour', h)}
                          >
                            {h}
                          </Button>
                        );
                      })}
                    </div>
                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                  </ScrollArea>

                  <ScrollArea className="w-64 sm:w-auto">
                    <div className="flex p-2 sm:flex-col">
                      {Array.from(
                        { length: Math.ceil(60 / minuteStep) },
                        (_, i) => i * minuteStep
                      ).map((min) => {
                        const selected = parsed?.getMinutes() === min;
                        return (
                          <Button
                            type="button"
                            key={min}
                            size="icon"
                            variant={selected ? 'default' : 'ghost'}
                            className={timeButtonClass(selected)}
                            onClick={() => setTimePart('minute', min)}
                          >
                            {min.toString().padStart(2, '0')}
                          </Button>
                        );
                      })}
                    </div>
                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                  </ScrollArea>

                  <ScrollArea>
                    <div className="flex p-2 sm:flex-col">
                      {['AM', 'PM'].map((ap) => {
                        const isPM = parsed?.getHours() >= 12;
                        const selected =
                          (ap === 'AM' && !isPM) || (ap === 'PM' && isPM);
                        return (
                          <Button
                            type="button"
                            key={ap}
                            size="icon"
                            variant={selected ? 'default' : 'ghost'}
                            className={timeButtonClass(selected)}
                            onClick={() =>
                              setTimePart('ampm', ap as 'AM' | 'PM')
                            }
                          >
                            {ap}
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }
);

InputDateTimePicker.displayName = 'InputDateTimePicker';
export default InputDateTimePicker;
