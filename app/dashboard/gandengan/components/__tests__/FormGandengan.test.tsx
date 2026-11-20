import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormGandengan from '../FormGandengan';
import {
  GandenganSchema,
  GandenganInput
} from '@/lib/validations/gandengan.validation';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import lookupReducer from '@/lib/store/lookupSlice/lookupSlice';
import { FormErrorProvider } from '@/lib/hooks/formErrorContext';

// Mock the LookUp component. FormGandengan wires lookupValue -> forms.setValue
// (varchar id) and onSelectRow -> forms.setValue(<field>_text).
jest.mock('@/components/custom-ui/LookUp', () => {
  return function MockLookUp({
    lookupValue,
    onSelectRow,
    disabled,
    label
  }: any) {
    return (
      <div data-testid={`lookup-${label}`}>
        <button
          type="button"
          data-testid={`lookup-button-${label}`}
          onClick={() => {
            lookupValue && lookupValue('1');
            onSelectRow &&
              onSelectRow({ uuid: 'uuid-1', id: '1', text: 'NILAI 1' });
          }}
          disabled={disabled}
        >
          Select {label}
        </button>
      </div>
    );
  };
});

const createMockStore = () =>
  configureStore({
    reducer: { lookup: lookupReducer },
    preloadedState: {
      lookup: {
        openName: '',
        data: {},
        type: {},
        default: {},
        submitClicked: false,
        isLookupOpen: false,
        clearLookup: false
      }
    } as any
  });

const FormGandenganWrapper = ({
  mode = 'add',
  defaultValues = {},
  onValid = jest.fn(),
  handleClose = jest.fn(),
  isLoadingCreate = false,
  isLoadingUpdate = false,
  isLoadingDelete = false,
  popOver = true,
  setPopOver = jest.fn()
}: any) => {
  const forms = useForm<GandenganInput>({
    resolver: zodResolver(GandenganSchema),
    defaultValues: {
      nama: '',
      keterangan: '',
      statusaktif: '',
      ...defaultValues
    },
    mode: 'onChange'
  });

  // Mirror the real parent: onSubmit(isSaveAndAdd) runs react-hook-form
  // validation and only calls onValid when the data passes the schema.
  const onSubmit = (isSaveAndAdd: boolean) =>
    forms.handleSubmit((data) => onValid(isSaveAndAdd, data))();

  return (
    <Provider store={createMockStore()}>
      <FormErrorProvider>
        <FormGandengan
          forms={forms}
          onSubmit={onSubmit}
          mode={mode}
          handleClose={handleClose}
          isLoadingCreate={isLoadingCreate}
          isLoadingUpdate={isLoadingUpdate}
          isLoadingDelete={isLoadingDelete}
          popOver={popOver}
          setPopOver={setPopOver}
        />
      </FormErrorProvider>
    </Provider>
  );
};

const validData: Partial<GandenganInput> = {
  nama: 'CONTOH NAMA',
  keterangan: 'CONTOH KETERANGAN',
  statusaktif: '1'
};

// FormFooterButtons underlines the shortcut letter (e.g. <span>S</span>AVE),
// which makes the computed accessible name "S AVE" / "C ancel". Match on the
// whitespace-stripped accessible name so these buttons can be found reliably.
const stripSpaces = (s: string) => s.replace(/\s+/g, '');
const byBtn = (label: string) => (name: string) =>
  stripSpaces(name) === stripSpaces(label);

const getBtn = (label: string) =>
  screen.getByRole('button', { name: byBtn(label) });
const queryBtn = (label: string) =>
  screen.queryByRole('button', { name: byBtn(label) });

const saveButton = () => getBtn('SAVE');

describe('FormGandengan Component', () => {
  describe('Rendering', () => {
    test('should render form with all fields', () => {
      render(<FormGandenganWrapper />);

      expect(screen.getByText('Add gandengan')).toBeInTheDocument();
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KETERANGAN\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByTestId('lookup-STATUS AKTIF')).toBeInTheDocument();
    });

    test('should render correct title based on mode', () => {
      const { rerender } = render(<FormGandenganWrapper mode="add" />);
      expect(screen.getByText('Add gandengan')).toBeInTheDocument();

      rerender(<FormGandenganWrapper mode="edit" />);
      expect(screen.getByText('Edit gandengan')).toBeInTheDocument();

      rerender(<FormGandenganWrapper mode="delete" />);
      expect(screen.getByText('Delete gandengan')).toBeInTheDocument();

      rerender(<FormGandenganWrapper mode="view" />);
      expect(screen.getByText('View gandengan')).toBeInTheDocument();
    });

    test('should show SAVE & ADD button only in add mode', () => {
      const { rerender } = render(<FormGandenganWrapper mode="add" />);
      expect(getBtn('SAVE & ADD')).toBeInTheDocument();

      rerender(<FormGandenganWrapper mode="edit" />);
      expect(queryBtn('SAVE & ADD')).not.toBeInTheDocument();
    });

    test('should show DELETE button text in delete mode', () => {
      render(<FormGandenganWrapper mode="delete" />);
      expect(getBtn('DELETE')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('should show required errors for NAMA on empty submit', async () => {
      const onValid = jest.fn();
      render(<FormGandenganWrapper onValid={onValid} />);

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(screen.getByText(/NAMA WAJIB DIISI/i)).toBeInTheDocument();
      });
      expect(onValid).not.toHaveBeenCalled();
    });

    test('should accept valid form data', async () => {
      const onValid = jest.fn();
      render(
        <FormGandenganWrapper defaultValues={validData} onValid={onValid} />
      );

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(onValid).toHaveBeenCalled();
      });
    });
  });

  describe('Form Input Interactions', () => {
    test('should allow typing in NAMA field', async () => {
      render(<FormGandenganWrapper />);
      const input = screen.getByLabelText(/^NAMA\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KETERANGAN field', async () => {
      render(<FormGandenganWrapper />);
      const input = screen.getByLabelText(
        /^KETERANGAN\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should display pre-filled data in edit mode', () => {
      render(
        <FormGandenganWrapper
          mode="edit"
          defaultValues={{ ...validData, nama: 'DATA LAMA' }}
        />
      );

      expect(
        (screen.getByLabelText(/^NAMA\s*\*?$/i) as HTMLInputElement).value
      ).toBe('DATA LAMA');
    });
  });

  describe('Form Modes (Add, Edit, View, Delete)', () => {
    test('should allow input in add mode', () => {
      render(<FormGandenganWrapper mode="add" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KETERANGAN\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
    });

    test('should allow input in edit mode', () => {
      render(<FormGandenganWrapper mode="edit" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
    });

    test('should set inputs readonly in view mode', () => {
      render(<FormGandenganWrapper mode="view" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KETERANGAN\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
    });

    test('should set inputs readonly in delete mode', () => {
      render(<FormGandenganWrapper mode="delete" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
    });

    test('should disable SAVE button in view mode', () => {
      render(<FormGandenganWrapper mode="view" />);
      expect(saveButton()).toBeDisabled();
    });

    test('should disable lookups in view mode', () => {
      render(<FormGandenganWrapper mode="view" />);
      expect(screen.getByTestId('lookup-button-STATUS AKTIF')).toBeDisabled();
    });
  });

  describe('Button Actions', () => {
    test('should call onSubmit with false when SAVE is clicked with valid data', async () => {
      const onValid = jest.fn();
      render(
        <FormGandenganWrapper defaultValues={validData} onValid={onValid} />
      );

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(onValid).toHaveBeenCalledWith(false, expect.any(Object));
      });
    });

    test('should call onSubmit with true when SAVE & ADD is clicked', async () => {
      const onValid = jest.fn();
      render(
        <FormGandenganWrapper
          mode="add"
          defaultValues={validData}
          onValid={onValid}
        />
      );

      await userEvent.click(getBtn('SAVE & ADD'));

      await waitFor(() => {
        expect(onValid).toHaveBeenCalledWith(true, expect.any(Object));
      });
    });

    test('should call handleClose when Cancel button is clicked', async () => {
      const handleClose = jest.fn();
      render(<FormGandenganWrapper handleClose={handleClose} />);

      await userEvent.click(getBtn('Cancel'));
      expect(handleClose).toHaveBeenCalled();
    });

    test('should call setPopOver(false) and handleClose when close icon is clicked', async () => {
      const handleClose = jest.fn();
      const setPopOver = jest.fn();
      render(
        <FormGandenganWrapper
          handleClose={handleClose}
          setPopOver={setPopOver}
        />
      );

      const closeIcon = screen
        .getByText('Add gandengan')
        .parentElement?.querySelector('div[class*="cursor-pointer"]');
      expect(closeIcon).toBeTruthy();
      await userEvent.click(closeIcon as Element);

      expect(setPopOver).toHaveBeenCalledWith(false);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    // While a mutation is in flight FormFooterButtons marks the button
    // non-interactive via the `pointer-events-none` class.
    test('should mark SAVE button non-interactive when isLoadingCreate is true', () => {
      render(<FormGandenganWrapper isLoadingCreate={true} />);
      expect(saveButton()).toHaveClass('pointer-events-none');
    });

    test('should mark SAVE button non-interactive when isLoadingUpdate is true', () => {
      render(<FormGandenganWrapper mode="edit" isLoadingUpdate={true} />);
      expect(saveButton()).toHaveClass('pointer-events-none');
    });

    test('should mark DELETE button non-interactive when isLoadingDelete is true', () => {
      render(<FormGandenganWrapper mode="delete" isLoadingDelete={true} />);
      expect(getBtn('DELETE')).toHaveClass('pointer-events-none');
    });
  });

  describe('Integration', () => {
    test('should complete full form submission flow using lookups', async () => {
      const onValid = jest.fn();
      render(<FormGandenganWrapper onValid={onValid} />);

      await userEvent.type(screen.getByLabelText(/^NAMA\s*\*?$/i), 'CONTOH');
      await userEvent.type(
        screen.getByLabelText(/^KETERANGAN\s*\*?$/i),
        'CONTOH'
      );

      await userEvent.click(screen.getByTestId('lookup-button-STATUS AKTIF'));

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(onValid).toHaveBeenCalledWith(false, expect.any(Object));
      });
    });

    test('should clear NAMA error after valid input is entered', async () => {
      const onValid = jest.fn();
      render(<FormGandenganWrapper onValid={onValid} />);

      await userEvent.click(saveButton());
      await waitFor(() => {
        expect(screen.getByText(/NAMA WAJIB DIISI/i)).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/^NAMA\s*\*?$/i), 'CONTOH');
      await waitFor(() => {
        expect(screen.queryByText(/NAMA WAJIB DIISI/i)).not.toBeInTheDocument();
      });
    });
  });
});
