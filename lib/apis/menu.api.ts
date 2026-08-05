import { GetParams } from '../types/all.type';
import { IAllMenus } from '../types/menu.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { MenuInput } from '../validations/menu.validation';
interface UpdateMenuParams {
  id: string;
  fields: MenuInput;
}
interface searchMenuParams {
  id?: string;
  search?: string;
}

export const getMenuSidebarFn = async (): Promise<IAllMenus> => {
  const response = await api2.get('/menu/sidebar');
  return response.data;
};
export const getMenuSidebarWithSearchFn = async (fields: searchMenuParams) => {
  const response = await api2.post(`/menu/search`, fields);
  return response.data;
};

export const getMenuResequence = async () => {
  const response = await api2.get('/menu/menu-resequence');
  return response.data;
};
export const getPermissionFn = async (id: string | undefined) => {
  if (!id) return null;
  try {
    const response = await api2.get(`/menu/permission/${id}`);
    return response.data;
  } catch (error) {
    if (error) {
      console.log(error);
    }
    throw error;
  }
};
export const getMenuFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllMenus> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/menu', { params: queryParams, signal });

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching menus:', error);
    throw new Error('Failed to fetch menus');
  }
};
export const exportMenuFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/menu/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
export const storeMenuFn = async (fields: MenuInput) => {
  const response = await api2.post(`/menu`, fields);

  return response.data;
};
// Correctly typed 'ids' and sending proper data format to the NestJS API
export const reportMenuBySelectFn = async (ids: { id: string }[]) => {
  try {
    // Sending the data in the correct format to the NestJS API
    const response = await api2.post(`/menu/report-byselect`, ids);

    return response.data; // Assuming the API returns the data properly
  } catch (error) {
    console.error('Error in sending data:', error);
    throw new Error('Failed to send data to the API');
  }
};

export const exportMenuBySelectFn = async (ids: { id: string }[]) => {
  try {
    const response = await api2.post('/menu/export-byselect', ids, {
      responseType: 'blob'
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};

export const deleteMenuFn = async (id: string) => {
  try {
    const response = await api2.delete(`/menu/${id}`);
    return response.data; // Optionally return response data if needed
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error; // Re-throw the error if you want to handle it in the calling function
  }
};
export const updateMenuFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/menu/update/${id}`, fields);
  return response.data;
};

export const updateMenuResequenceFn = async (data: any) => {
  await api2.put(`/menu/update-resequence`, data);
};
