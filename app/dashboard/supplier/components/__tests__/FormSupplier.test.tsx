import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormSupplier from '../FormSupplier';
import {
  SupplierSchema,
  SupplierInput
} from '@/lib/validations/supplier.validation';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import lookupReducer from '@/lib/store/lookupSlice/lookupSlice';
import { FormErrorProvider } from '@/lib/hooks/formErrorContext';

// Mock the LookUp component. FormSupplier wires lookupValue -> forms.setValue
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

const FormSupplierWrapper = ({
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
  const forms = useForm<SupplierInput>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: {
      nama: '',
      keterangan: '',
      contactperson: '',
      ktp: '',
      alamat: '',
      coa: '',
      coagiro: '',
      coapiu: '',
      coahut: '',
      kota: '',
      kodepos: '',
      telp: '',
      email: '',
      fax: '',
      web: '',
      creditterm: '',
      credittermplus: '',
      npwp: '',
      alamatfakturpajak: '',
      namapajak: '',
      nominalpph21: '',
      nominalpph23: '',
      noskb: '',
      tglskb: '',
      nosk: '',
      tglsk: '',
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
        <FormSupplier
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

const validData: Partial<SupplierInput> = {
  nama: 'CONTOH NAMA',
  keterangan: 'CONTOH KETERANGAN',
  contactperson: 'CONTOH CONTACTPERSON',
  ktp: 'CONTOH KTP',
  alamat: 'CONTOH ALAMAT',
  coa: '1',
  coagiro: '1',
  coapiu: '1',
  coahut: '1',
  kota: 'CONTOH KOTA',
  kodepos: 'CONTOH KOD',
  telp: 'CONTOH TELP',
  email: 'CONTOH EMAIL',
  fax: 'CONTOH FAX',
  web: 'CONTOH WEB',
  creditterm: '1',
  credittermplus: '1',
  npwp: 'CONTOH NPWP',
  alamatfakturpajak: 'CONTOH ALAMATFAKTURPAJAK',
  namapajak: 'CONTOH NAMAPAJAK',
  nominalpph21: '1000',
  nominalpph23: '1000',
  noskb: 'CONTOH NOSKB',
  tglskb: '01-01-2026',
  nosk: 'CONTOH NOSK',
  tglsk: '01-01-2026',
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

describe('FormSupplier Component', () => {
  describe('Rendering', () => {
    test('should render form with all fields', () => {
      render(<FormSupplierWrapper />);

      expect(screen.getByText('Add Supplier')).toBeInTheDocument();
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KETERANGAN\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^CONTACTPERSON\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^KTP\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^ALAMAT\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KOTA\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KODEPOS\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^TELP\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^EMAIL\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^FAX\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^WEB\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NPWP\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^ALAMATFAKTURPAJAK\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^NAMAPAJAK\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NOSKB\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NOSK\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COA')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COAGIRO')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COAPIU')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COAHUT')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-STATUSAKTIF')).toBeInTheDocument();
    });

    test('should render correct title based on mode', () => {
      const { rerender } = render(<FormSupplierWrapper mode="add" />);
      expect(screen.getByText('Add Supplier')).toBeInTheDocument();

      rerender(<FormSupplierWrapper mode="edit" />);
      expect(screen.getByText('Edit Supplier')).toBeInTheDocument();

      rerender(<FormSupplierWrapper mode="delete" />);
      expect(screen.getByText('Delete Supplier')).toBeInTheDocument();

      rerender(<FormSupplierWrapper mode="view" />);
      expect(screen.getByText('View Supplier')).toBeInTheDocument();
    });

    test('should show SAVE & ADD button only in add mode', () => {
      const { rerender } = render(<FormSupplierWrapper mode="add" />);
      expect(getBtn('SAVE & ADD')).toBeInTheDocument();

      rerender(<FormSupplierWrapper mode="edit" />);
      expect(queryBtn('SAVE & ADD')).not.toBeInTheDocument();
    });

    test('should show DELETE button text in delete mode', () => {
      render(<FormSupplierWrapper mode="delete" />);
      expect(getBtn('DELETE')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('should accept valid form data', async () => {
      const onValid = jest.fn();
      render(
        <FormSupplierWrapper defaultValues={validData} onValid={onValid} />
      );

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(onValid).toHaveBeenCalled();
      });
    });
  });

  describe('Form Input Interactions', () => {
    test('should allow typing in NAMA field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^NAMA\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KETERANGAN field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(
        /^KETERANGAN\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in CONTACTPERSON field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(
        /^CONTACTPERSON\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KTP field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^KTP\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in ALAMAT field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(
        /^ALAMAT\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KOTA field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^KOTA\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KODEPOS field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(
        /^KODEPOS\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in TELP field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^TELP\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in EMAIL field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^EMAIL\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in FAX field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^FAX\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in WEB field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^WEB\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NPWP field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^NPWP\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in ALAMATFAKTURPAJAK field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(
        /^ALAMATFAKTURPAJAK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NAMAPAJAK field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(
        /^NAMAPAJAK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NOSKB field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^NOSKB\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NOSK field', async () => {
      render(<FormSupplierWrapper />);
      const input = screen.getByLabelText(/^NOSK\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should display pre-filled data in edit mode', () => {
      render(
        <FormSupplierWrapper
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
      render(<FormSupplierWrapper mode="add" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KETERANGAN\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^CONTACTPERSON\s*\*?$/i)
      ).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^KTP\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^ALAMAT\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KOTA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KODEPOS\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^TELP\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^EMAIL\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^FAX\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^WEB\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NPWP\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^ALAMATFAKTURPAJAK\s*\*?$/i)
      ).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^NAMAPAJAK\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NOSKB\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NOSK\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
    });

    test('should allow input in edit mode', () => {
      render(<FormSupplierWrapper mode="edit" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
    });

    test('should set inputs readonly in view mode', () => {
      render(<FormSupplierWrapper mode="view" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KETERANGAN\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^CONTACTPERSON\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KTP\s*\*?$/i)).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^ALAMAT\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KOTA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KODEPOS\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^TELP\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^EMAIL\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^FAX\s*\*?$/i)).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^WEB\s*\*?$/i)).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^NPWP\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^ALAMATFAKTURPAJAK\s*\*?$/i)
      ).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^NAMAPAJAK\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NOSKB\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NOSK\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
    });

    test('should set inputs readonly in delete mode', () => {
      render(<FormSupplierWrapper mode="delete" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
    });

    test('should disable SAVE button in view mode', () => {
      render(<FormSupplierWrapper mode="view" />);
      expect(saveButton()).toBeDisabled();
    });

    test('should disable lookups in view mode', () => {
      render(<FormSupplierWrapper mode="view" />);
      expect(screen.getByTestId('lookup-button-COA')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-COAGIRO')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-COAPIU')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-COAHUT')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-STATUSAKTIF')).toBeDisabled();
    });
  });

  describe('Button Actions', () => {
    test('should call onSubmit with false when SAVE is clicked with valid data', async () => {
      const onValid = jest.fn();
      render(
        <FormSupplierWrapper defaultValues={validData} onValid={onValid} />
      );

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(onValid).toHaveBeenCalledWith(false, expect.any(Object));
      });
    });

    test('should call onSubmit with true when SAVE & ADD is clicked', async () => {
      const onValid = jest.fn();
      render(
        <FormSupplierWrapper
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
      render(<FormSupplierWrapper handleClose={handleClose} />);

      await userEvent.click(getBtn('Cancel'));
      expect(handleClose).toHaveBeenCalled();
    });

    test('should call setPopOver(false) and handleClose when close icon is clicked', async () => {
      const handleClose = jest.fn();
      const setPopOver = jest.fn();
      render(
        <FormSupplierWrapper
          handleClose={handleClose}
          setPopOver={setPopOver}
        />
      );

      const closeIcon = screen
        .getByText('Add Supplier')
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
      render(<FormSupplierWrapper isLoadingCreate={true} />);
      expect(saveButton()).toHaveClass('pointer-events-none');
    });

    test('should mark SAVE button non-interactive when isLoadingUpdate is true', () => {
      render(<FormSupplierWrapper mode="edit" isLoadingUpdate={true} />);
      expect(saveButton()).toHaveClass('pointer-events-none');
    });

    test('should mark DELETE button non-interactive when isLoadingDelete is true', () => {
      render(<FormSupplierWrapper mode="delete" isLoadingDelete={true} />);
      expect(getBtn('DELETE')).toHaveClass('pointer-events-none');
    });
  });
});
