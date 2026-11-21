'use client';

import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { MdOutlineKeyboardDoubleArrowRight } from 'react-icons/md';
import { useGetHarilibur } from '@/lib/server/useHarilibur';
import { Checkbox } from '../ui/checkbox';
import { IHariLibur } from '@/lib/types/harilibur.type';
import { getParameterFn } from '@/lib/apis/parameter.api';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarCheck({
  className,
  classNames,
  showOutsideDays = true,
  onDateSelect, // Add onDateSelect prop to send selected dates to the parent
  selectedDates: selectedDatesProp, // Terima selectedDates dari props
  disabled = false, // Add disabled prop to disable the calendar
  defaultMonth, // Add defaultMonth prop
  ...props
}: CalendarProps & {
  onDateSelect: (dates: Set<string>) => void;
  selectedDates: string[];
  disabled?: boolean; // Optional disabled prop
  defaultMonth: Date;
}) {
  const { data } = useGetHarilibur();
  const [batasCuti, setBatasCuti] = React.useState('');
  const [selectedDates, setSelectedDates] = React.useState<Set<string>>(
    new Set(selectedDatesProp) // Set initial state based on props
  );

  const getParameterTgl = async () => {
    const result = await getParameterFn({ filters: { grp: 'BATASCUTI' } });

    setBatasCuti(result.data[0].text ?? '');
  };
  let arrayDates = [...selectedDates];
  arrayDates.sort();
  const lastDateValue =
    arrayDates.length > 0 ? arrayDates[arrayDates.length - 1] : null;
  const firstDateValue = arrayDates.length > 0 ? arrayDates[0] : null;
  const [month, setMonth] = React.useState<Date>(defaultMonth); // Initialize month with defaultMonth

  // Helper function to parse the date correctly from the format `dd-mm-yyyy`
  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in JavaScript's Date object
  };

  const holidays =
    data?.data.map((item: IHariLibur) => ({
      date: parseDate(item.tgl), // Use the parseDate function to handle the format correctly
      keterangan: item.keterangan
    })) || [];

  const holidayDates = holidays.map((holiday) => holiday.date);
  const formatDateToLocal = (date: Date) => {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    } as const;
    const [day, month, year] = date
      .toLocaleDateString('id-ID', options)
      .split('/');
    return `${year}-${month}-${day}`;
  };

  const handleCheckboxChange = (date: string) => {
    if (disabled) return; // Disable checkbox change if disabled is true
    setSelectedDates((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(date)) {
        newSelected.delete(date);
      } else {
        newSelected.add(date);
      }
      // Send the selected dates to the parent component
      onDateSelect(newSelected);
      return newSelected;
    });
  };

  const isValidMonth = (month: any): month is Date =>
    month instanceof Date && !isNaN(month.getTime());

  const handleSelectAll = () => {
    if (disabled) return; // Disable select all action if disabled is true
    const currentMonth = isValidMonth(month) ? month : new Date();
    if (currentMonth) {
      const startDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const endDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );
      const allDates: string[] = [];

      for (
        let date = startDate;
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        const dateStr = formatDateToLocal(date);
        const isHoliday = holidayDates.some(
          (holidayDate) =>
            holidayDate.toLocaleDateString() === date.toLocaleDateString()
        );
        const isSunday = date.getDay() === 0;
        if (!isHoliday && !isSunday) {
          allDates.push(dateStr);
        }
      }

      setSelectedDates((prevSelected) => {
        const newSelected = new Set(prevSelected);
        allDates.forEach((dateStr) => {
          newSelected.add(dateStr);
        });
        // Send the selected dates to the parent component
        onDateSelect(newSelected);
        return newSelected;
      });
    }
  };

  const handleDeselectAll = () => {
    if (disabled) return; // Disable deselect all action if disabled is true
    setSelectedDates(new Set());
    // Send the selected dates to the parent component (empty set)
    onDateSelect(new Set());
  };

  const handleMonthChange = (newMonth: Date) => {
    if (disabled) return; // Disable month change if disabled is true
    setMonth(newMonth);
  };

  const selectAllWeek = (weekStartDate: Date) => {
    if (disabled) return; // Disable week select if disabled is true
    const currentWeekDates: string[] = [];
    const currentWeekSelected = new Set(selectedDates);

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStartDate);
      currentDate.setDate(weekStartDate.getDate() + i);
      const dateStr = formatDateToLocal(currentDate);
      const isHoliday = holidayDates.some(
        (holidayDate) =>
          holidayDate.toLocaleDateString() === currentDate.toLocaleDateString()
      );
      const isSunday = currentDate.getDay() === 0;
      if (!isHoliday && !isSunday) {
        currentWeekDates.push(dateStr);
      }
    }

    const allWeekSelected = currentWeekDates.every((dateStr) =>
      currentWeekSelected.has(dateStr)
    );

    if (allWeekSelected) {
      setSelectedDates((prevSelected) => {
        const newSelected = new Set(prevSelected);
        currentWeekDates.forEach((dateStr) => {
          newSelected.delete(dateStr);
        });
        // Send the selected dates to the parent component
        onDateSelect(newSelected);
        return newSelected;
      });
    } else {
      setSelectedDates((prevSelected) => {
        const newSelected = new Set(prevSelected);
        currentWeekDates.forEach((dateStr) => {
          newSelected.add(dateStr);
        });
        // Send the selected dates to the parent component
        onDateSelect(newSelected);
        return newSelected;
      });
    }
  };
  const countExcludedDays = (startDate: Date, endDate: Date) => {
    let count = 0;
    let sundayDates: string[] = []; // Store the dates that are Sundays

    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const isHoliday = holidayDates.some(
        (holiday) => holiday.toLocaleDateString() === date.toLocaleDateString()
      );
      const isSunday = date.getDay() === 0;

      if (isSunday) {
        sundayDates.push(formatDateToLocal(date)); // Add Sunday date to the array
      }

      if (isHoliday || isSunday) {
        count++;
      }
    }

    return count;
  };

  const getDisabledDates = () => {
    if (!lastDateValue || !firstDateValue)
      return { startLimitDate: null, endLimitDate: null };

    const lastDate = new Date(lastDateValue);
    const firstDate = new Date(firstDateValue);

    // Calculate 7 days before the first selected date and 7 days after the last selected date
    const startLimitDate = new Date(firstDate);
    startLimitDate.setDate(firstDate.getDate() - (Number(batasCuti) + 1)); // Number(batasCuti) days before the first date

    const endLimitDate = new Date(lastDate);
    endLimitDate.setDate(lastDate.getDate() + Number(batasCuti)); // 7 days after the last date

    // Count how many Sundays or holidays are in the range
    const excludedDaysAfterLastDate = countExcludedDays(lastDate, endLimitDate);
    const excludedDaysBeforeFirstDate = countExcludedDays(
      startLimitDate,
      firstDate
    );

    // Adjust the disabled range to ensure it's still exactly 7 days
    // We don't reduce the range but extend the disabled range by the number of excluded days (holidays and Sundays).
    endLimitDate.setDate(endLimitDate.getDate() + excludedDaysAfterLastDate);
    startLimitDate.setDate(
      startLimitDate.getDate() - excludedDaysBeforeFirstDate
    );

    return { startLimitDate, endLimitDate };
  };

  const { startLimitDate, endLimitDate } = getDisabledDates();

  const isDateDisabled = (date: Date) => {
    // Disable all dates outside the valid range (7 days before first and 7 days after last)
    return (
      (startLimitDate && date < startLimitDate) ||
      (endLimitDate && date > endLimitDate)
    );
  };
  React.useEffect(() => {
    getParameterTgl();
  }, []);

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between lg:pr-8">
        <div className="flex w-full items-center justify-between">
          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() =>
                handleMonthChange(
                  new Date(month.setMonth(month.getMonth() - 1))
                )
              }
              className={cn(buttonVariants({ variant: 'outline' }), 'h-8 px-2')}
              disabled={disabled}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleSelectAll}
              type="button"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-8 px-2 text-xs'
              )}
              disabled={disabled}
            >
              Select All
            </button>
            <span className="w-fit text-center text-sm font-medium">
              {month.toLocaleDateString('id-ID', {
                month: 'long',
                year: 'numeric'
              })}
            </span>
            <button
              onClick={handleDeselectAll}
              type="button"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-8 px-2 text-xs'
              )}
              disabled={disabled}
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() =>
                handleMonthChange(
                  new Date(month.setMonth(month.getMonth() + 1))
                )
              }
              className={cn(buttonVariants({ variant: 'outline' }), 'h-8 px-2')}
              disabled={disabled}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="w-full">
        <DayPicker
          month={month}
          onMonthChange={handleMonthChange}
          showOutsideDays={showOutsideDays}
          className={cn('pt-2', className, 'flex w-full')}
          classNames={{
            months:
              'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
            month: 'space-y-4',
            caption: 'flex justify-center pt-1 relative items-center',
            caption_label: 'text-sm font-medium',
            nav: 'space-x-1 flex items-center',
            nav_button: cn(
              buttonVariants({ variant: 'outline' }),
              'h-8 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
            ),
            nav_button_previous: 'absolute left-1',
            nav_button_next: 'absolute right-1',
            table: 'w-full border-collapse space-y-1',
            head_row: 'grid grid-cols-7 gap-5 text-center', // 7 gap-5 columns, including the extra column
            head_cell:
              'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]',
            row: 'grid grid-cols-7 gap-5', // 9 columns, including the extra column
            cell: cn(
              'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
              props.mode === 'range'
                ? '[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
                : '[&:has([aria-selected])]:rounded-md'
            ),
            day: cn(
              buttonVariants({ variant: 'ghost' }),
              'h-8 w-8 p-0 font-normal aria-selected:opacity-100'
            ),
            day_range_start: 'day-range-start',
            day_range_end: 'day-range-end',
            day_selected:
              'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
            day_today: 'bg-accent text-accent-foreground',
            day_outside: 'day-outside opacity-50 text-muted-foreground', // Apply opacity to outside days
            day_disabled: 'text-muted-foreground opacity-50',
            day_range_middle:
              'aria-selected:bg-accent aria-selected:text-accent-foreground',
            day_hidden: 'invisible',
            ...classNames
          }}
          title="calendar"
          components={{
            Caption: () => null,
            IconLeft: () => <ChevronLeftIcon className="h-4 w-4" />,
            IconRight: () => <ChevronRightIcon className="h-4 w-4" />,
            Day: ({ date }) => {
              const dateStr = formatDateToLocal(date);
              const isChecked = selectedDates.has(dateStr);
              const isHoliday = holidayDates.some(
                (holiday) =>
                  holiday.toLocaleDateString() === date.toLocaleDateString()
              );
              const isSunday = date.getDay() === 0;
              const isSaturday = date.getDay() === 6;
              const isDisabled =
                isHoliday || isSunday || disabled || isDateDisabled(date);
              let dayClass = '';

              // Check if the date is outside the current month
              const isOutsideMonth = date.getMonth() !== month.getMonth();

              if (isHoliday && !isOutsideMonth) {
                dayClass = 'text-red-500 font-medium';
              } else if (isSunday && !isOutsideMonth) {
                dayClass = 'text-red-500';
              } else if (isSaturday && !isOutsideMonth) {
                dayClass = 'text-green-500 font-medium';
              } else {
                dayClass = 'font-medium';
              }
              if (isDisabled && !isHoliday && !isSunday && !isSaturday) {
                dayClass = 'text-zinc-400 opacity-70'; // Custom class for disabled days
              }
              if (isOutsideMonth) {
                dayClass += ' opacity-30 font-light'; // Add opacity to outside days
              }

              return (
                <div className="flex w-full flex-row items-center ">
                  {date.getDay() === 0 && ( // Add button only for Sunday
                    <button
                      onClick={() => selectAllWeek(date)}
                      type="button"
                      className={cn(
                        buttonVariants({ variant: 'outline' }),
                        'h-5 px-1 text-xs'
                      )}
                      disabled={disabled}
                    >
                      <MdOutlineKeyboardDoubleArrowRight />
                    </button>
                  )}
                  {date.getDay() !== 0 ? (
                    <Checkbox
                      checked={isChecked}
                      disabled={!!isDisabled}
                      onCheckedChange={() => handleCheckboxChange(dateStr)}
                      className={`m-0 border border-zinc-500 ${
                        !isDisabled ? 'cursor-pointer' : ''
                      } p-0`}
                    />
                  ) : null}

                  <button
                    disabled={!!isDisabled}
                    type="button"
                    className={cn('z-10 m-0 h-8 w-6 p-0', dayClass)}
                  >
                    {date.getDate()}
                  </button>
                </div>
              );
            }
          }}
          {...props}
        />
      </div>
    </div>
  );
}

CalendarCheck.displayName = 'CalendarCheck';

export { CalendarCheck };
