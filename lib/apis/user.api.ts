import { GetParams } from '../types/all.type';
import { IAllUser, IUserAcl, IUserRole } from '../types/user.type';
import { buildQueryParams } from '../utils';
import { api2 } from '../utils/AxiosInstance';
import {
  UserAclInput,
  UserInput,
  UserRoleInput
} from '../validations/user.validation';

interface UpdateUserParams {
  id: string;
  fields: UserInput;
}

export const getAllUserFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllUser> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/user', { params: queryParams, signal });

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching data', error);
    throw new Error('Failed to fetch data');
  }
};

export const deleteUserFn = async (id: string) => {
  try {
    const response = await api2.delete(`/user/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

export const updateUserFn = async ({ id, fields }: UpdateUserParams) => {
  const response = await api2.put(`/user/update/${id}`, fields);

  return response.data;
};

export const storeUserFn = async (fields: UserInput) => {
  const response = await api2.post(`/user`, fields);

  return response.data;
};

export const getUserRoleFn = async (id: string): Promise<IUserRole> => {
  const response = await api2.get(`/userrole/${id}`);
  return response.data;
};

export const getUserAclFn = async (id: string): Promise<IUserAcl> => {
  const response = await api2.get(`/useracl?id=${id}`);

  return response.data;
};

export const updateUserRoleFn = async (fields: UserRoleInput) => {
  const response = await api2.put(`/userrole/${fields.userId}`, fields);

  return response.data;
};

export const updateUserAclFn = async (fields: UserAclInput) => {
  const response = await api2.put(`/useracl/${fields.userId}`, fields);

  return response.data;
};
