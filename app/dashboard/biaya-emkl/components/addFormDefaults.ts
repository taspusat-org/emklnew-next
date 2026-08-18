export interface LookupDefault {
  id: string;
  text: string;
}

export const EMPTY_LOOKUP_DEFAULT: LookupDefault = { id: '', text: '' };

export const pickLookupDefault = (
  rows: any[],
  fallbackText: string
): LookupDefault => {
  const row =
    rows.find((p) => p?.default === 'YA') ??
    rows.find((p) => String(p?.text).toUpperCase() === fallbackText);

  return row
    ? { id: String(row.id), text: row.text ?? fallbackText }
    : EMPTY_LOOKUP_DEFAULT;
};

export const buildAddFormValues = (
  aktif: LookupDefault,
  nilai: LookupDefault
) => ({
  nama: '',
  keterangan: '',

  biaya_id: '',
  biaya_text: '',

  coahut: '',
  coahut_text: '',

  jenisorder_id: '',
  jenisorderan_text: '',

  statusaktif: aktif.id,
  text: aktif.text,

  statusbiayabl: nilai.id,
  statusbiayabl_text: nilai.text,

  statusseal: nilai.id,
  statusseal_text: nilai.text,

  statustagih: nilai.id,
  statustagih_text: nilai.text
});
