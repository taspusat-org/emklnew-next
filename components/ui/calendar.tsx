'use client';

import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { DayPicker, useDayPicker, useNavigation } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './select';
import { ScrollArea } from './scroll-area';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function CaptionWithNav({ calendarMonth }: { calendarMonth: any }) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();

  // Cast to any to survive minor-version API drift in v9
  const ctx = useDayPicker() as any;

  const fromYear: number =
    ctx.fromYear ??
    ctx.props?.fromYear ??
    ctx.startMonth?.getFullYear() ??
    new Date().getFullYear() - 10;

  const toYear: number =
    ctx.toYear ??
    ctx.props?.toYear ??
    ctx.endMonth?.getFullYear() ??
    new Date().getFullYear() + 10;

  const displayMonth: Date = calendarMonth.date;
  const currentYear = displayMonth.getFullYear();
  const currentMonth = displayMonth.getMonth(); // 0-indexed

  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i
  );

  const handleMonthChange = (val: string) => {
    goToMonth(new Date(currentYear, Number(val), 1));
  };

  const handleYearChange = (val: string) => {
    goToMonth(new Date(Number(val), currentMonth, 1));
  };

  const navBtnClass = cn(
    buttonVariants({ variant: 'outline' }),
    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center'
  );

  return (
    <div className="flex items-center justify-center gap-1 pt-1">
      {/* Prev */}
      <button
        type="button"
        className={navBtnClass}
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        aria-label="Go to previous month"
      >
        <ChevronLeftIcon className="text-primary-text h-4 w-4" />
      </button>

      {/* Month select */}
      <Select value={String(currentMonth)} onValueChange={handleMonthChange}>
        <SelectTrigger className="h-7 pr-1.5 text-sm font-medium focus:ring-0">
          <SelectValue>{MONTH_NAMES[currentMonth]}</SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="border-zinc-300 bg-background"
        >
          <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[200px]">
            {MONTH_NAMES.map((m, idx) => (
              <SelectItem
                className="cursor-pointer hover:bg-zinc-200"
                key={m}
                value={String(idx)}
              >
                {m}
              </SelectItem>
            ))}
          </ScrollArea>
        </SelectContent>
      </Select>

      {/* Year select */}
      <Select value={String(currentYear)} onValueChange={handleYearChange}>
        <SelectTrigger className="h-7 pr-1.5 text-sm font-medium focus:ring-0">
          <SelectValue>{currentYear}</SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="border-zinc-300 bg-background"
        >
          <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[200px]">
            {years.map((y) => (
              <SelectItem
                className="cursor-pointer hover:bg-zinc-200"
                key={y}
                value={String(y)}
              >
                {y}
              </SelectItem>
            ))}
          </ScrollArea>
        </SelectContent>
      </Select>

      {/* Next */}
      <button
        type="button"
        className={navBtnClass}
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        aria-label="Go to next month"
      >
        <ChevronRightIcon className="text-primary-text h-4 w-4" />
      </button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row sm:space-y-0',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        dropdowns: 'flex justify-center gap-1',
        // Hide default nav — CaptionWithNav renders its own prev/next buttons
        nav: 'hidden',
        button_previous: 'hidden',
        button_next: 'hidden',
        // Grid
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex flex-row justify-between',
        weekday:
          'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2 gap-x-[1px] flex-row justify-between',
        day: 'text-center text-sm p-0 bg-background-grid-header relative border border-border [&:has([aria-selected])]:bg-blue-500 focus-within:relative focus-within:z-20',

        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-7 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-blue-400 rounded-none font-bold text-sm hover:text-primary-text'
        ),
        // Day states
        selected:
          'bg-[#4780fc] border border-blue-600 !text-black [&>button]:text-black [&>button]:hover:text-primary-text',

        today:
          '[&>button]:after:content-[""] [&>button]:relative [&>button]:after:absolute [&>button]:after:bottom-0.5 [&>button]:after:left-1/2 [&>button]:after:-translate-x-1/2 [&>button]:after:w-1 [&>button]:after:h-1 [&>button]:after:rounded-full [&>button]:after:bg-[#2694e8] text-[#2694e8]',
        outside: 'opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames
      }}
      components={{
        // Replace default caption with inline-nav version
        MonthCaption: CaptionWithNav,
        // Chevron fallback
        Chevron: ({ orientation }: { orientation?: string }) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className="text-primary-text h-4 w-4" />
          ) : (
            <ChevronRightIcon className="text-primary-text h-4 w-4" />
          )
      }}
      // Tambah modifier today secara eksplisit
      modifiers={{
        sunday: { dayOfWeek: [0] },
        saturday: { dayOfWeek: [6] }
      }}
      modifiersClassNames={{
        holiday: 'text-red-500',
        sunday: 'text-red-500',
        saturday: 'text-green-500'
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
