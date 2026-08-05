import { IMeta } from './error.type';

export interface IAsuransi {
  id: string; // Primary Key (bigint / varchar(200))
  // uuid: string; // Unique Identifier (UUID v4)

  nama: string; // Nama Asuransi (nvarchar(max))
  keterangan: string; // Keterangan (nvarchar(max))

  contactperson: string; // Contact Person (varchar(100))
  alamat: string; // Alamat Kantor (nvarchar(max))
  kota: string; // Kota (varchar(500))
  kodepos: string; // Kode Pos (varchar(100))
  telp: string; // No. Telepon / telp (varchar(300))
  email: string; // Email (varchar(500))
  fax: string; // Fax (varchar(300))
  web: string; // Website URL (varchar(300))

  ratemodal: string; // Rate Modal (money / decimal)
  ratejual: string; // Rate Jual (money / decimal)
  npwp: string; // Nomor NPWP (varchar(30))
  nominalasuransi: string; // Nominal Asuransi (money / decimal)
  rateopendoor: string; // Rate Open Door (money / decimal)
  adminbiaya: string; // Biaya Admin (money / decimal)
  admintagih: string; // Admin Tagih (money / decimal)

  batas1: string; // Batas Nominal 1 (money / decimal)
  batas2: string; // Batas Nominal 2 (money / decimal)
  batas3: string; // Batas Nominal 3 (money / decimal)

  materai1: string; // Biaya Materai 1 (money / decimal)
  materai2: string; // Biaya Materai 2 (money / decimal)
  materai3: string; // Biaya Materai 3 (money / decimal)

  // Dynamic Parameter & Relations
  statusaktif?: string; // ID Status Aktif Parameter (bigint / varchar)
  statusaktif_text?: string; // Label Text Status Aktif (Display Only)
  statusaktif_memo?: string; // Label Text Status Aktif (Display Only)

  // Audit Trails & Locks
  info?: string; // Additional Info (nvarchar(max))
  modifiedby?: string; // Modified By User ID (varchar(200))
  editing_by?: string; // Lock Editing By User ID (varchar(200))
  editing_at?: string; // Lock Editing Timestamp (datetime ISO string)
  created_at: string; // Created Timestamp (datetime ISO string)
  updated_at: string; // Updated Timestamp (datetime ISO string)
}

export interface IAllAsuransi {
  data: IAsuransi[];
  type: string;
  pagination: IMeta;
}
