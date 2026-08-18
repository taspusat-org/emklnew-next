/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

export function genericComponentModule(): any {
  const Comp = React.forwardRef(function MockUi(props: any, ref: any) {
    // Render a plain element; ignore widget-specific props to avoid DOM warnings.
    return React.createElement('div', {
      ref,
      'data-mock-ui': props?.label ?? props?.name ?? 'ui'
    });
  });
  (Comp as any).displayName = 'MockUi';

  const target: any = { __esModule: true, default: Comp };
  return new Proxy(target, {
    get: (obj, prop) => (prop in obj ? obj[prop] : Comp)
  });
}

export const MOCKED_CUSTOM_UI = [
  '@/components/custom-ui/LookUp',
  '@/components/custom-ui/LookUpModal',
  '@/components/custom-ui/LookUpModalPengeluaran',
  '@/components/custom-ui/LookupModalBiayaExtra',
  '@/components/custom-ui/InputCurrency',
  '@/components/custom-ui/InputNumeric',
  '@/components/custom-ui/InputDatePicker',
  '@/components/custom-ui/InputDateTimePicker',
  '@/components/custom-ui/InputMonthPicker',
  '@/components/custom-ui/MultiSelect',
  '@/components/custom-ui/FilterInput',
  '@/components/custom-ui/calendar'
];
