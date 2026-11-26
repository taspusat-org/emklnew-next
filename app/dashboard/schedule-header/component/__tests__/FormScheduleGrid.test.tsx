import '@testing-library/jest-dom';
import { fireEvent } from '@testing-library/react';
import Form from '../FormSchedule';
import { renderForm, userEvent } from '@/lib/test-utils/formHarness';

jest.mock('@/components/custom-ui/LookUp', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);

const dateCellInput = (placeholder: string, index = 0) =>
  document.querySelectorAll<HTMLInputElement>(
    `.rdg input[placeholder="${placeholder}"]`
  )[index];

describe('FormSchedule detail grid', () => {
  test('focuses the date input on the first click', async () => {
    renderForm(Form);
    const input = dateCellInput('DD-MM-YYYY');

    await userEvent.click(input);

    expect(input).toHaveFocus();
  });

  test('focuses the date time input on the first click', async () => {
    renderForm(Form);
    const input = dateCellInput('DD-MM-YYYY HH:MM AM/PM');

    await userEvent.click(input);

    expect(input).toHaveFocus();
  });

  test('scrolls the grid horizontally on shift + wheel', () => {
    renderForm(Form);
    const grid = document.querySelector<HTMLElement>('.rdg')!;
    let scrollLeft = 0;
    Object.defineProperty(grid, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value;
      }
    });
    const cell = grid.querySelector('.rdg-cell')!;

    fireEvent.wheel(cell, { deltaY: 120, shiftKey: true });
    expect(scrollLeft).toBe(120);

    fireEvent.wheel(cell, { deltaY: 120 });
    expect(scrollLeft).toBe(120);
  });
});
