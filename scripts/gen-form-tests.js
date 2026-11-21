/* Generator: creates a smoke + validation test for each dashboard Form*.tsx.
 * Schema is detected from a sibling file's zodResolver(<ident>) + its import. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DASH = path.join(ROOT, 'app', 'dashboard');

const MOCKED_CUSTOM_UI = [
  '@/components/custom-ui/LookUp',
  '@/components/custom-ui/LookUpModal',
  '@/components/custom-ui/LookUpModalPengeluaran',
  '@/components/custom-ui/LookupModalBiayaExtra',
  '@/components/custom-ui/InputCurrency',
  '@/components/custom-ui/InputNumeric',
  '@/components/custom-ui/InputDatePicker',
  '@/components/custom-ui/InputDateTimePicker',
  '@/components/custom-ui/InputMonthPicker',
  '@/components/custom-ui/MultiSelect',
  '@/components/custom-ui/FilterInput',
  '@/components/custom-ui/calendar-check'
];

// Per-form handling for components that don't fit the standalone CRUD pattern.
const SKIP = {
  FormJobParty: 'sub-form rendered inside a parent FormProvider',
  FormTabs: 'tabbed wrapper composing child forms, not a standalone form',
  FormBiayaLainLainDetailMuatan: 'detail sub-form, needs parent form context',
  FormPenerimaanSeal:
    'sub-form using useFormContext (needs parent FormProvider)',
  FormPinjamanEmkl: 'sub-form using useFormContext (needs parent FormProvider)',
  FormPengembalianPinjamanEmkl:
    'sub-form using useFormContext (needs parent FormProvider)',
  FormRoleAclTable: 'permission table widget, no standalone SAVE/Cancel',
  FormResequence: 'reorder dialog with custom buttons (no schema/SAVE)'
};
// Forms that intentionally don't disable SAVE in view mode (footer mode is
// hardcoded/derived, or saveDisabled is overridden).
const NO_VIEW_DISABLE = new Set([
  'FormUserRole',
  'FormUserAcl',
  'FormRoleAcl',
  'FormShipper',
  'FormMarketingDetail',
  'FormHarilibur'
]);
// Forms with no required fields, or whose empty-submit path can't be exercised.
const NO_EMPTY_SUBMIT = new Set(['FormParameter', 'FormBiayaHeader']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(p, out);
    } else if (/^Form.*\.tsx$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

function detectSchema(dir) {
  // Search sibling .tsx files for zodResolver(<ident>) and its validations import.
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = content.match(/zodResolver\(\s*([A-Za-z0-9_]+)\s*\)/);
    if (!m) continue;
    const ident = m[1];
    // find import of that ident from a validations module
    const importRe = new RegExp(
      `import\\s*\\{[^}]*\\b${ident}\\b[^}]*\\}\\s*from\\s*['\"](@/lib/validations/[^'\"]+)['\"]`
    );
    const im = content.match(importRe);
    if (im) return { ident, importPath: im[1] };
  }
  return null;
}

const mockLines = MOCKED_CUSTOM_UI.map(
  (m) =>
    `jest.mock('${m}', () =>\n  require('@/lib/test-utils/uiMocks').genericComponentModule()\n);`
).join('\n');

function buildTest(formName, schema) {
  if (SKIP[formName]) {
    return `import '@testing-library/jest-dom';

// ${formName} is a ${SKIP[formName]}.
// The standalone CRUD form pattern (see alat-bayar/FormAlatbayar.test.tsx)
// doesn't apply, so it's skipped rather than asserted incorrectly.
describe.skip('${formName} (skipped: not a standalone form)', () => {
  test('covered indirectly by its parent form', () => {
    expect(true).toBe(true);
  });
});
`;
  }

  const schemaImport = schema
    ? `import { ${schema.ident} } from '${schema.importPath}';\n`
    : '';
  const schemaConst = schema
    ? `const schema = ${schema.ident};\nconst validData = buildValidObject(schema);\n`
    : `const schema = undefined;\nconst validData = {};\n`;

  // Note: "submits when valid" is intentionally NOT generated. Valid submission
  // depends on per-form internals (detail grids that seed empty rows, effects
  // that reset RHF state, props we don't pass) and is covered at the schema
  // level by the model tests. Here we assert the form *gates* invalid input.
  const emptySubmitTest =
    schema && !NO_EMPTY_SUBMIT.has(formName)
      ? `
  test('does not submit an invalid (empty) form', async () => {
    const { onValid } = renderForm(Form, { schema });
    await userEvent.click(saveButton());
    await new Promise((r) => setTimeout(r, 0));
    expect(onValid).not.toHaveBeenCalled();
  });
`
      : '';

  const viewDisableTest = !NO_VIEW_DISABLE.has(formName)
    ? `
  test('disables SAVE in view mode', () => {
    renderForm(Form, { schema, mode: 'view', defaultValues: validData });
    expect(saveButton()).toBeDisabled();
  });
`
    : '';

  return `import '@testing-library/jest-dom';
import Form from '../${formName}';
${schemaImport}import {
  renderForm,
  getBtn,
  saveButton,
  userEvent,
  buildValidObject
} from '@/lib/test-utils/formHarness';

${mockLines}

${schemaConst}
describe('${formName}', () => {
  test('renders SAVE and Cancel buttons', () => {
    renderForm(Form, { schema, defaultValues: validData });
    expect(saveButton()).toBeInTheDocument();
    expect(getBtn('Cancel')).toBeInTheDocument();
  });
${emptySubmitTest}${viewDisableTest}
  test('cancel triggers handleClose', async () => {
    const { handleClose } = renderForm(Form, { schema, defaultValues: validData });
    await userEvent.click(getBtn('Cancel'));
    expect(handleClose).toHaveBeenCalled();
  });
});
`;
}

const forms = walk(DASH);
let created = 0;
let skipped = 0;
let noSchema = 0;
const report = [];
for (const formPath of forms) {
  const dir = path.dirname(formPath);
  const formName = path.basename(formPath, '.tsx');
  const testDir = path.join(dir, '__tests__');
  const testFile = path.join(testDir, `${formName}.test.tsx`);
  if (fs.existsSync(testFile)) {
    // Protect hand-written tests; only overwrite our own generated ones.
    const existing = fs.readFileSync(testFile, 'utf8');
    if (!existing.includes('@/lib/test-utils/formHarness')) {
      skipped++;
      continue;
    }
  }
  const schema = detectSchema(dir);
  if (!schema) noSchema++;
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(testFile, buildTest(formName, schema), 'utf8');
  created++;
  report.push(
    `${formName} -> ${schema ? schema.ident : 'NO_SCHEMA(smoke only)'}`
  );
}
console.log(`created=${created} skipped=${skipped} noSchema=${noSchema}`);
console.log(report.join('\n'));
