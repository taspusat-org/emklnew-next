import '@testing-library/jest-dom';
import Form from '../FormPanjarHeader';
import { panjarHeaderSchema } from '@/lib/validations/panjarheader.validation';
import {
  renderForm,
  getBtn,
  saveButton,
  screen,
  userEvent,
  buildValidObject
} from '@/lib/test-utils/formHarness';

jest.mock('@/components/custom-ui/LookUp', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/LookUpModal', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/LookUpModalPengeluaran', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/LookupModalBiayaExtra', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/InputCurrency', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/InputNumeric', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/InputDatePicker', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/InputDateTimePicker', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/InputMonthPicker', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/MultiSelect', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/FilterInput', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);
jest.mock('@/components/custom-ui/calendar-check', () =>
  require('@/lib/test-utils/uiMocks').genericComponentModule()
);

const schema = panjarHeaderSchema;
const validData = buildValidObject(schema);

describe('FormPanjarHeader', () => {
  test('renders SAVE and Cancel buttons', () => {
    renderForm(Form, { schema, defaultValues: validData });
    expect(saveButton()).toBeInTheDocument();
    expect(getBtn('Cancel')).toBeInTheDocument();
  });

  test('does not submit an invalid (empty) form', async () => {
    const { onValid } = renderForm(Form, { schema });
    await userEvent.click(saveButton());
    await new Promise((r) => setTimeout(r, 0));
    expect(onValid).not.toHaveBeenCalled();
  });

  test('disables SAVE in view mode', () => {
    renderForm(Form, { schema, mode: 'view', defaultValues: validData });
    expect(saveButton()).toBeDisabled();
  });

  test('cancel triggers handleClose', async () => {
    const { handleClose } = renderForm(Form, {
      schema,
      defaultValues: validData
    });
    await userEvent.click(getBtn('Cancel'));
    expect(handleClose).toHaveBeenCalled();
  });

  // Mode add tidak punya panjar terpilih, jadi query detail disabled dan
  // datanya undefined. Grid detail tetap harus terisi satu baris input plus
  // baris tombol tambah — bukan "NO ROWS DATA FOUND".
  test('initializes the detail grid with an input row and the add-row button in add mode', () => {
    renderForm(Form, { schema, mode: 'add' });
    expect(screen.queryByText(/no rows data found/i)).not.toBeInTheDocument();
    // Baris "add row" merender "TOTAL :" di kolom nomor dan tombol tambah di kolom aksi.
    expect(screen.getByText('TOTAL :')).toBeInTheDocument();
  });
});
