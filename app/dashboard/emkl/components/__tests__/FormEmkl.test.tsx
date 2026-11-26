import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormEmkl from '../FormEmkl';
import { EmklSchema, EmklInput } from '@/lib/validations/emkl.validation';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import lookupReducer from '@/lib/store/lookupSlice/lookupSlice';
import { FormErrorProvider } from '@/lib/hooks/formErrorContext';

// Mock the LookUp component. FormEmkl wires lookupValue -> forms.setValue
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
              onSelectRow({
                uuid: 'uuid-1',
                id: '1',
                text: 'NILAI 1',
                nama: 'NILAI 1',
                keterangancoa: 'NILAI 1'
              });
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

const FormEmklWrapper = ({
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
  const forms = useForm<EmklInput>({
    resolver: zodResolver(EmklSchema),
    defaultValues: {
      statusrelasi: '',
      relasi_id: '',
      nama: '',
      contactperson: '',
      alamat: '',
      coagiro: '',
      coapiutang: '',
      coahutang: '',
      kota: '',
      kodepos: '',
      notelp: '',
      email: '',
      fax: '',
      alamatweb: '',
      top: '',
      npwp: '',
      namapajak: '',
      alamatpajak: '',
      statustrado: '',
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
        <FormEmkl
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

const validData: Partial<EmklInput> = {
  statusrelasi: '1',
  relasi_id: '1',
  nama: 'CONTOH NAMA',
  contactperson: 'CONTOH CONTACTPERSON',
  alamat: 'CONTOH ALAMAT',
  coagiro: '1',
  coapiutang: '1',
  coahutang: '1',
  kota: 'CONTOH KOTA',
  kodepos: 'CONTOH KODEPOS',
  notelp: 'CONTOH NOTELP',
  email: 'CONTOH EMAIL',
  fax: 'CONTOH FAX',
  alamatweb: 'CONTOH ALAMATWEB',
  top: '1000',
  npwp: 'CONTOH NPWP',
  namapajak: 'CONTOH NAMAPAJAK',
  alamatpajak: 'CONTOH ALAMATPAJAK',
  statustrado: '1',
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

describe('FormEmkl Component', () => {
  describe('Rendering', () => {
    test('should render form with all fields', () => {
      render(<FormEmklWrapper />);

      expect(screen.getByText('Add Emkl')).toBeInTheDocument();
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^CONTACTPERSON\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^ALAMAT\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KOTA\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KODEPOS\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NOTELP\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^EMAIL\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^FAX\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^ALAMATWEB\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NPWP\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NAMAPAJAK\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^ALAMATPAJAK\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByTestId('lookup-STATUSRELASI')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-RELASI')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COAGIRO')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COAPIUTANG')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COAHUTANG')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-STATUSTRADO')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-STATUSAKTIF')).toBeInTheDocument();
    });

    test('should render correct title based on mode', () => {
      const { rerender } = render(<FormEmklWrapper mode="add" />);
      expect(screen.getByText('Add Emkl')).toBeInTheDocument();

      rerender(<FormEmklWrapper mode="edit" />);
      expect(screen.getByText('Edit Emkl')).toBeInTheDocument();

      rerender(<FormEmklWrapper mode="delete" />);
      expect(screen.getByText('Delete Emkl')).toBeInTheDocument();

      rerender(<FormEmklWrapper mode="view" />);
      expect(screen.getByText('View Emkl')).toBeInTheDocument();
    });

    test('should show SAVE & ADD button only in add mode', () => {
      const { rerender } = render(<FormEmklWrapper mode="add" />);
      expect(getBtn('SAVE & ADD')).toBeInTheDocument();

      rerender(<FormEmklWrapper mode="edit" />);
      expect(queryBtn('SAVE & ADD')).not.toBeInTheDocument();
    });

    test('should show DELETE button text in delete mode', () => {
      render(<FormEmklWrapper mode="delete" />);
      expect(getBtn('DELETE')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('should accept valid form data', async () => {
      const onValid = jest.fn();
      render(<FormEmklWrapper defaultValues={validData} onValid={onValid} />);

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(onValid).toHaveBeenCalled();
      });
    });
  });

  describe('Form Input Interactions', () => {
    test('should allow typing in NAMA field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(/^NAMA\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in CONTACTPERSON field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(
        /^CONTACTPERSON\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in ALAMAT field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(
        /^ALAMAT\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KOTA field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(/^KOTA\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KODEPOS field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(
        /^KODEPOS\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NOTELP field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(
        /^NOTELP\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in EMAIL field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(/^EMAIL\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in FAX field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(/^FAX\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in ALAMATWEB field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(
        /^ALAMATWEB\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NPWP field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(/^NPWP\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NAMAPAJAK field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(
        /^NAMAPAJAK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in ALAMATPAJAK field', async () => {
      render(<FormEmklWrapper />);
      const input = screen.getByLabelText(
        /^ALAMATPAJAK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should display pre-filled data in edit mode', () => {
      render(
        <FormEmklWrapper
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
      render(<FormEmklWrapper mode="add" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^CONTACTPERSON\s*\*?$/i)
      ).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^ALAMAT\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KOTA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KODEPOS\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NOTELP\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^EMAIL\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^FAX\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^ALAMATWEB\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NPWP\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NAMAPAJAK\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^ALAMATPAJAK\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
    });

    test('should allow input in edit mode', () => {
      render(<FormEmklWrapper mode="edit" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
    });

    test('should set inputs readonly in view mode', () => {
      render(<FormEmklWrapper mode="view" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^CONTACTPERSON\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^ALAMAT\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KOTA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KODEPOS\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NOTELP\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^EMAIL\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^FAX\s*\*?$/i)).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^ALAMATWEB\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NPWP\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NAMAPAJAK\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^ALAMATPAJAK\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
    });

    test('should set inputs readonly in delete mode', () => {
      render(<FormEmklWrapper mode="delete" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
    });

    test('should disable SAVE button in view mode', () => {
      render(<FormEmklWrapper mode="view" />);
      expect(saveButton()).toBeDisabled();
    });

    test('should disable lookups in view mode', () => {
      render(<FormEmklWrapper mode="view" />);
      expect(screen.getByTestId('lookup-button-STATUSRELASI')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-RELASI')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-COAGIRO')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-COAPIUTANG')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-COAHUTANG')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-STATUSTRADO')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-STATUSAKTIF')).toBeDisabled();
    });
  });

  describe('Button Actions', () => {
    test('should call onSubmit with false when SAVE is clicked with valid data', async () => {
      const onValid = jest.fn();
      render(<FormEmklWrapper defaultValues={validData} onValid={onValid} />);

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(onValid).toHaveBeenCalledWith(false, expect.any(Object));
      });
    });

    test('should call onSubmit with true when SAVE & ADD is clicked', async () => {
      const onValid = jest.fn();
      render(
        <FormEmklWrapper
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
      render(<FormEmklWrapper handleClose={handleClose} />);

      await userEvent.click(getBtn('Cancel'));
      expect(handleClose).toHaveBeenCalled();
    });

    test('should call setPopOver(false) and handleClose when close icon is clicked', async () => {
      const handleClose = jest.fn();
      const setPopOver = jest.fn();
      render(
        <FormEmklWrapper handleClose={handleClose} setPopOver={setPopOver} />
      );

      const closeIcon = screen
        .getByText('Add Emkl')
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
      render(<FormEmklWrapper isLoadingCreate={true} />);
      expect(saveButton()).toHaveClass('pointer-events-none');
    });

    test('should mark SAVE button non-interactive when isLoadingUpdate is true', () => {
      render(<FormEmklWrapper mode="edit" isLoadingUpdate={true} />);
      expect(saveButton()).toHaveClass('pointer-events-none');
    });

    test('should mark DELETE button non-interactive when isLoadingDelete is true', () => {
      render(<FormEmklWrapper mode="delete" isLoadingDelete={true} />);
      expect(getBtn('DELETE')).toHaveClass('pointer-events-none');
    });
  });
});
