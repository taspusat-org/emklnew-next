import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormShipper from '../FormShipper';
import {
  ShipperSchema,
  ShipperInput
} from '@/lib/validations/shipper.validation';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import lookupReducer from '@/lib/store/lookupSlice/lookupSlice';
import { FormErrorProvider } from '@/lib/hooks/formErrorContext';

// Mock the LookUp component. FormShipper wires lookupValue -> forms.setValue
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

const FormShipperWrapper = ({
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
  const forms = useForm<ShipperInput>({
    resolver: zodResolver(ShipperSchema),
    defaultValues: {
      statusrelasi: '',
      relasi_id: '',
      nama: '',
      keterangan: '',
      contactperson: '',
      alamat: '',
      coa: '',
      coapiutang: '',
      coahutang: '',
      kota: '',
      kodepos: '',
      telp: '',
      email: '',
      fax: '',
      web: '',
      creditlimit: '',
      creditterm: '',
      credittermplus: '',
      npwp: '',
      coagiro: '',
      ppn: '',
      titipke: '',
      ppnbatalmuat: '',
      grup: '',
      formatdeliveryreport: '',
      comodity: '',
      namashippercetak: '',
      formatcetak: '',
      marketing_id: '',
      blok: '',
      nomor: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kabupaten: '',
      kecamatan: '',
      propinsi: '',
      isdpp10psn: '',
      usertracing: '',
      passwordtracing: '',
      kodeprospek: '',
      namashipperprospek: '',
      emaildelay: '',
      keterangan1barisinvoice: '',
      nik: '',
      namaparaf: '',
      saldopiutang: '',
      keteranganshipperjobminus: '',
      tglemailshipperjobminus: '',
      tgllahir: '',
      idshipperasal: '',
      initial: '',
      tipe: '',
      idtipe: '',
      idinitial: '',
      nshipperprospek: '',
      parentshipper_id: '',
      npwpnik: '',
      nitku: '',
      kodepajak: '',
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
        <FormShipper
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

const validData: Partial<ShipperInput> = {
  statusrelasi: '1',
  relasi_id: '1',
  nama: 'CONTOH NAMA',
  keterangan: 'CONTOH KETERANGAN',
  contactperson: 'CONTOH CONTACTPERSON',
  alamat: 'CONTOH ALAMAT',
  coa: '1',
  coapiutang: '1',
  coahutang: '1',
  kota: 'CONTOH KOTA',
  kodepos: 'CONTOH KOD',
  telp: 'CONTOH TELP',
  email: 'CONTOH EMAIL',
  fax: 'CONTOH FAX',
  web: 'CONTOH WEB',
  creditlimit: '1000',
  creditterm: '1',
  credittermplus: '1',
  npwp: 'CONTOH NPWP',
  coagiro: '1',
  ppn: '1000',
  titipke: 'CONTOH TITIPKE',
  ppnbatalmuat: '1000',
  grup: 'CONTOH GRUP',
  formatdeliveryreport: '1',
  comodity: 'CONTOH COMODITY',
  namashippercetak: 'CONTOH NAMASHIPPERCETAK',
  formatcetak: '1',
  marketing_id: '1',
  blok: 'CONTOH BLOK',
  nomor: 'CONTOH NOMOR',
  rt: 'CONTOH RT',
  rw: 'CONTOH RW',
  kelurahan: 'CONTOH KELURAHAN',
  kabupaten: 'CONTOH KABUPATEN',
  kecamatan: 'CONTOH KECAMATAN',
  propinsi: 'CONTOH PROPINSI',
  isdpp10psn: '1000',
  usertracing: 'CONTOH USERTRACING',
  passwordtracing: 'CONTOH PASSWORDTRACING',
  kodeprospek: 'CONTOH KODEPROSPEK',
  namashipperprospek: 'CONTOH NAMASHIPPERPROSPEK',
  emaildelay: 'CONTOH EMAILDELAY',
  keterangan1barisinvoice: 'CONTOH KETERANGAN1BARISINVOICE',
  nik: 'CONTOH NIK',
  namaparaf: 'CONTOH NAMAPARAF',
  saldopiutang: '1000',
  keteranganshipperjobminus: 'CONTOH KETERANGANSHIPPERJOBMINUS',
  tglemailshipperjobminus: '01-01-2026',
  tgllahir: '01-01-2026',
  idshipperasal: '1',
  initial: 'CONTOH INITIAL',
  tipe: 'CONTOH TIPE',
  idtipe: '1',
  idinitial: '1',
  nshipperprospek: 'CONTOH NSHIPPERPROSPEK',
  parentshipper_id: '1',
  npwpnik: 'CONTOH NPWPNIK',
  nitku: 'CONTOH NITKU',
  kodepajak: 'CONTOH KOD',
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

describe('FormShipper Component', () => {
  describe('Rendering', () => {
    test('should render form with all fields', () => {
      render(<FormShipperWrapper />);

      expect(screen.getByText('Add Shipper ')).toBeInTheDocument();
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KETERANGAN\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^CONTACTPERSON\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^ALAMAT\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COA')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COAPIUTANG')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COAHUTANG')).toBeInTheDocument();
      expect(screen.getByLabelText(/^KOTA\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KODEPOS\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^TELP\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^EMAIL\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^FAX\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^WEB\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NPWP\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByTestId('lookup-COAGIRO')).toBeInTheDocument();
      expect(screen.getByLabelText(/^TITIPKE\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^GRUP\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^COMODITY\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^NAMASHIPPERCETAK\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^BLOK\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NOMOR\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^RT\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^RW\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KELURAHAN\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KABUPATEN\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KECAMATAN\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^PROPINSI\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^USERTRACING\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^PASSWORDTRACING\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^KODEPROSPEK\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^NAMASHIPPERPROSPEK\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^EMAILDELAY\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^KETERANGAN1BARISINVOICE\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^NIK\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NAMAPARAF\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^KETERANGANSHIPPERJOBMINUS\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^INITIAL\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^TIPE\s*\*?$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^NSHIPPERPROSPEK\s*\*?$/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^NPWPNIK\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^NITKU\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^KODEPAJAK\s*\*?$/i)).toBeInTheDocument();
      expect(screen.getByTestId('lookup-MARKETING')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-IDSHIPPERASAL')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-PARENTSHIPPER')).toBeInTheDocument();
      expect(screen.getByTestId('lookup-STATUSAKTIF')).toBeInTheDocument();
    });

    test('should render correct title based on mode', () => {
      const { rerender } = render(<FormShipperWrapper mode="add" />);
      expect(screen.getByText('Add Shipper ')).toBeInTheDocument();

      rerender(<FormShipperWrapper mode="edit" />);
      expect(screen.getByText('Edit Shipper ')).toBeInTheDocument();

      rerender(<FormShipperWrapper mode="delete" />);
      expect(screen.getByText('Delete Shipper ')).toBeInTheDocument();

      rerender(<FormShipperWrapper mode="view" />);
      expect(screen.getByText('View Shipper ')).toBeInTheDocument();
    });

    test('should show SAVE & ADD button only in add mode', () => {
      const { rerender } = render(<FormShipperWrapper mode="add" />);
      expect(getBtn('SAVE & ADD')).toBeInTheDocument();

      rerender(<FormShipperWrapper mode="edit" />);
      expect(queryBtn('SAVE & ADD')).not.toBeInTheDocument();
    });

    test('should show DELETE button text in delete mode', () => {
      render(<FormShipperWrapper mode="delete" />);
      expect(getBtn('DELETE')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('should accept valid form data', async () => {
      const onValid = jest.fn();
      render(
        <FormShipperWrapper defaultValues={validData} onValid={onValid} />
      );

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(onValid).toHaveBeenCalled();
      });
    });
  });

  describe('Form Input Interactions', () => {
    test('should allow typing in NAMA field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^NAMA\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KETERANGAN field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^KETERANGAN\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in CONTACTPERSON field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^CONTACTPERSON\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in ALAMAT field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^ALAMAT\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KOTA field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^KOTA\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KODEPOS field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^KODEPOS\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in TELP field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^TELP\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in EMAIL field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^EMAIL\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in FAX field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^FAX\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in WEB field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^WEB\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NPWP field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^NPWP\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in TITIPKE field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^TITIPKE\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in GRUP field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^GRUP\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in COMODITY field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^COMODITY\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NAMASHIPPERCETAK field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^NAMASHIPPERCETAK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in BLOK field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^BLOK\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NOMOR field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^NOMOR\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in RT field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^RT\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in RW field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^RW\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KELURAHAN field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^KELURAHAN\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KABUPATEN field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^KABUPATEN\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KECAMATAN field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^KECAMATAN\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in PROPINSI field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^PROPINSI\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in USERTRACING field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^USERTRACING\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in PASSWORDTRACING field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^PASSWORDTRACING\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KODEPROSPEK field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^KODEPROSPEK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NAMASHIPPERPROSPEK field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^NAMASHIPPERPROSPEK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in EMAILDELAY field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^EMAILDELAY\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KETERANGAN1BARISINVOICE field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^KETERANGAN1BARISINVOICE\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NIK field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^NIK\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NAMAPARAF field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^NAMAPARAF\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KETERANGANSHIPPERJOBMINUS field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^KETERANGANSHIPPERJOBMINUS\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in INITIAL field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^INITIAL\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in TIPE field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^TIPE\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NSHIPPERPROSPEK field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^NSHIPPERPROSPEK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NPWPNIK field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^NPWPNIK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in NITKU field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(/^NITKU\s*\*?$/i) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should allow typing in KODEPAJAK field', async () => {
      render(<FormShipperWrapper />);
      const input = screen.getByLabelText(
        /^KODEPAJAK\s*\*?$/i
      ) as HTMLInputElement;
      await userEvent.type(input, 'Contoh Isi');
      expect(input.value).toBe('Contoh Isi');
    });

    test('should display pre-filled data in edit mode', () => {
      render(
        <FormShipperWrapper
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
      render(<FormShipperWrapper mode="add" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KETERANGAN\s*\*?$/i)).not.toHaveAttribute(
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
      expect(screen.getByLabelText(/^TITIPKE\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^GRUP\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^COMODITY\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^NAMASHIPPERCETAK\s*\*?$/i)
      ).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^BLOK\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NOMOR\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^RT\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^RW\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KELURAHAN\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KABUPATEN\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KECAMATAN\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^PROPINSI\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^USERTRACING\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^PASSWORDTRACING\s*\*?$/i)
      ).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^KODEPROSPEK\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^NAMASHIPPERPROSPEK\s*\*?$/i)
      ).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^EMAILDELAY\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^KETERANGAN1BARISINVOICE\s*\*?$/i)
      ).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^NIK\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NAMAPARAF\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^KETERANGANSHIPPERJOBMINUS\s*\*?$/i)
      ).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^INITIAL\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^TIPE\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^NSHIPPERPROSPEK\s*\*?$/i)
      ).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^NPWPNIK\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NITKU\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KODEPAJAK\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
    });

    test('should allow input in edit mode', () => {
      render(<FormShipperWrapper mode="edit" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).not.toHaveAttribute(
        'readonly'
      );
    });

    test('should set inputs readonly in view mode', () => {
      render(<FormShipperWrapper mode="view" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KETERANGAN\s*\*?$/i)).toHaveAttribute(
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
      expect(screen.getByLabelText(/^TITIPKE\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^GRUP\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^COMODITY\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^NAMASHIPPERCETAK\s*\*?$/i)
      ).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^BLOK\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NOMOR\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^RT\s*\*?$/i)).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^RW\s*\*?$/i)).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^KELURAHAN\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KABUPATEN\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KECAMATAN\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^PROPINSI\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^USERTRACING\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^PASSWORDTRACING\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KODEPROSPEK\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^NAMASHIPPERPROSPEK\s*\*?$/i)
      ).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^EMAILDELAY\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^KETERANGAN1BARISINVOICE\s*\*?$/i)
      ).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^NIK\s*\*?$/i)).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^NAMAPARAF\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(
        screen.getByLabelText(/^KETERANGANSHIPPERJOBMINUS\s*\*?$/i)
      ).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/^INITIAL\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^TIPE\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NSHIPPERPROSPEK\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NPWPNIK\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^NITKU\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
      expect(screen.getByLabelText(/^KODEPAJAK\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
    });

    test('should set inputs readonly in delete mode', () => {
      render(<FormShipperWrapper mode="delete" />);
      expect(screen.getByLabelText(/^NAMA\s*\*?$/i)).toHaveAttribute(
        'readonly'
      );
    });

    test('should disable SAVE button in view mode', () => {
      render(<FormShipperWrapper mode="view" />);
      expect(saveButton()).toBeDisabled();
    });

    test('should disable lookups in view mode', () => {
      render(<FormShipperWrapper mode="view" />);
      expect(screen.getByTestId('lookup-button-COA')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-COAPIUTANG')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-COAHUTANG')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-COAGIRO')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-MARKETING')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-IDSHIPPERASAL')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-PARENTSHIPPER')).toBeDisabled();
      expect(screen.getByTestId('lookup-button-STATUSAKTIF')).toBeDisabled();
    });
  });

  describe('Button Actions', () => {
    test('should call onSubmit with false when SAVE is clicked with valid data', async () => {
      const onValid = jest.fn();
      render(
        <FormShipperWrapper defaultValues={validData} onValid={onValid} />
      );

      await userEvent.click(saveButton());

      await waitFor(() => {
        expect(onValid).toHaveBeenCalledWith(false, expect.any(Object));
      });
    });

    test('should call onSubmit with true when SAVE & ADD is clicked', async () => {
      const onValid = jest.fn();
      render(
        <FormShipperWrapper
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
      render(<FormShipperWrapper handleClose={handleClose} />);

      await userEvent.click(getBtn('Cancel'));
      expect(handleClose).toHaveBeenCalled();
    });

    test('should call setPopOver(false) and handleClose when close icon is clicked', async () => {
      const handleClose = jest.fn();
      const setPopOver = jest.fn();
      render(
        <FormShipperWrapper handleClose={handleClose} setPopOver={setPopOver} />
      );

      const closeIcon = screen
        .getByText('Add Shipper ')
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
      render(<FormShipperWrapper isLoadingCreate={true} />);
      expect(saveButton()).toHaveClass('pointer-events-none');
    });

    test('should mark SAVE button non-interactive when isLoadingUpdate is true', () => {
      render(<FormShipperWrapper mode="edit" isLoadingUpdate={true} />);
      expect(saveButton()).toHaveClass('pointer-events-none');
    });

    test('should mark DELETE button non-interactive when isLoadingDelete is true', () => {
      render(<FormShipperWrapper mode="delete" isLoadingDelete={true} />);
      expect(getBtn('DELETE')).toHaveClass('pointer-events-none');
    });
  });
});
