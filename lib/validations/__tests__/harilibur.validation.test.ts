import * as mod from '@/lib/validations/harilibur.validation';
import { runModuleSchemaContract } from '@/lib/test-utils/schemaContract';

runModuleSchemaContract('harilibur', mod, {
  // `tgl` requires the dd-mm-yyyy format enforced by a refine.
  HariliburSchema: { validPatch: { tgl: '01-01-2024' } }
});
