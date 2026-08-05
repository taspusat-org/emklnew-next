import '@testing-library/jest-dom';
import Form from '../FormRoleAcl';
import { roleAclSchema } from '@/lib/validations/role.validation';
import {
  renderForm,
  saveButton,
  userEvent,
  waitFor
} from '@/lib/test-utils/formHarness';

jest.mock('@/lib/server/useAcos', () => ({
  useGetAllAcos: jest.fn()
}));
jest.mock('@/lib/server/useRole', () => ({
  useGetRoleAcl: jest.fn()
}));

const { useGetAllAcos } = require('@/lib/server/useAcos');
const { useGetRoleAcl } = require('@/lib/server/useRole');

// ID ACO adalah varchar uuid v7, bukan angka.
const ACO_ROLE_GET = '01-9F2AE1C0-1111-7000-8000-000000000001';
const ACO_ROLE_PUT = '01-9F2AE1C0-1111-7000-8000-000000000002';
const ACO_MENU_GET = '01-9F2AE1C0-1111-7000-8000-000000000003';

const acosRows = [
  { id: ACO_ROLE_GET, class: 'ROLE', method: 'GET', nama: 'ROLE->GET' },
  { id: ACO_ROLE_PUT, class: 'ROLE', method: 'PUT', nama: 'ROLE->PUT' },
  { id: ACO_MENU_GET, class: 'MENU', method: 'GET', nama: 'MENU->GET' }
];

beforeEach(() => {
  useGetAllAcos.mockReturnValue({
    data: {
      data: acosRows,
      pagination: { totalItems: 3, totalPages: 1, currentPage: 1 }
    },
    isLoading: false
  });
  // Role sudah punya 2 ACO tersimpan.
  useGetRoleAcl.mockReturnValue({
    data: { data: [{ id: ACO_ROLE_GET }, { id: ACO_ROLE_PUT }] },
    isLoading: false
  });
});

describe('FormRoleAcl selection payload', () => {
  // Backend menghapus SELURUH ACL role bila `data` terkirim kosong
  // (roleacl.service: acoIds.length === 0 -> del()). Jadi centang yang sudah
  // tersimpan wajib ikut terkirim apa adanya (string uuid, bukan Number()).
  test('mengirim ACO yang sudah tersimpan walau user tidak mengubah apa pun', async () => {
    const { onValid } = renderForm(Form, {
      schema: roleAclSchema,
      defaultValues: { roleId: 'R1', data: [] }
    });

    await userEvent.click(saveButton());

    await waitFor(() => expect(onValid).toHaveBeenCalled());
    expect(onValid.mock.calls[0][1]).toEqual({
      roleId: 'R1',
      data: [ACO_ROLE_GET, ACO_ROLE_PUT]
    });
  });
});
