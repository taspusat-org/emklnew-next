/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import Grid from '../GridScheduleHeader';
import { makeTestStore } from '@/lib/test-utils/formHarness';
import { FormErrorProvider } from '@/lib/hooks/formErrorContext';

const mockRow = (id: string) => ({
  id,
  nobukti: `SCH-${id}`,
  tglbukti: '26-11-2026',
  keterangan: `KETERANGAN ${id}`
});

const mockList = {
  data: [mockRow('A'), mockRow('B')],
  pagination: { totalItems: 2 }
};

const mockDelete = jest.fn(async (_id: string, options: any) => {
  options.onSuccess();
});

jest.mock('@/lib/server/useSchedule', () => ({
  useGetScheduleHeader: () => ({ data: mockList, isLoading: false }),
  useCreateSchedule: () => ({ mutateAsync: jest.fn() }),
  useUpdateSchedule: () => ({ mutateAsync: jest.fn() }),
  useDeleteSchedule: () => ({ mutateAsync: mockDelete })
}));
jest.mock('@/hooks/ReportPdfProvider', () => ({
  useReportPdfContext: () => ({})
}));
jest.mock('../FormSchedule', () => ({
  __esModule: true,
  default: ({ popOver, onSubmit }: any) =>
    popOver ? (
      <button type="button" onClick={() => onSubmit({})}>
        confirm
      </button>
    ) : null
}));
jest.mock('@/components/custom-ui/ActionButton', () => ({
  __esModule: true,
  default: ({ onDelete }: any) => (
    <button type="button" onClick={onDelete}>
      delete
    </button>
  )
}));

describe('GridScheduleHeader delete', () => {
  test('moves the selection up after deleting the bottom row', async () => {
    const store = makeTestStore({ auth: { user: { id: '1' } } });

    render(
      <Provider store={store}>
        <QueryClientProvider client={new QueryClient()}>
          <FormErrorProvider>
            <Grid />
          </FormErrorProvider>
        </QueryClientProvider>
      </Provider>
    );

    await userEvent.click(await screen.findByText('SCH-B'));
    await waitFor(() =>
      expect(store.getState().header.headerData?.id).toBe('B')
    );

    await userEvent.click(screen.getByRole('button', { name: 'delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'confirm' }));

    await waitFor(() =>
      expect(store.getState().header.headerData?.id).toBe('A')
    );
    expect(mockDelete).toHaveBeenCalledWith('B', expect.anything());
    expect(screen.queryByText('SCH-B')).not.toBeInTheDocument();
  });
});
