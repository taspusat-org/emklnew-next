import { IMeta } from './error.type';

export interface IErrorResponse {
  message: string;
  statusCode: number;
  errors: Record<string, string[]>;
}
export interface IAuthResponseLogin {
  message: string;
  token: string;
  username: string;
}
export interface IAuthResponseRegister {
  message: string;
  userId: number;
}
export interface IAllUser {
  data: IUser[];
  /** 'local' = data muat di client, 'json' = harus dicari server-side. */
  type: string;
  pagination: IMeta;
}
export interface IUser {
  id: string;
  username: string;
  name: string;
  password: string;
  /** Teks status aktif dari tabel parameter (hasil join p.text). */
  text: string;
  /** JSON tampilan badge status aktif (warna/singkatan) dari p.memo. */
  memo: string;
  email: string;
  namakaryawan: string;
  // karyawan.id kini uuid v7 (varchar), bukan auto-increment.
  karyawan_id: string;
  statusaktif: string;
  roles: IRoleUser[];
  acos: IUserAcl[];
  modifiedby: string;
  created_at: string; // Tanggal dalam format ISO string
  updated_at: string; // Tanggal dalam format ISO string
}
export interface IRoleUser {
  roleId: string;
  rolename: string;
  modifiedby: string;
  created_at: string;
  updated_at: string;
}
export interface IUserAcl {
  acoId: number;
  class: string;
  method: string;
  nama: string;
}
export interface IRole {
  id: string;
  rolename: string;
  created_at: string;
  updated_at: string;
}
export interface IAcl {
  id: string;
  class: string;
  method: string;
  nama: string;
  modifiedby: string;
  created_at: string;
  updated_at: string;
}
export interface IUserRole {
  data: IRole[];
}
export interface IUserAcl {
  data: IAcl[];
}
