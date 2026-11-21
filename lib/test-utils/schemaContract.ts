/* eslint-disable @typescript-eslint/no-explicit-any */

type Zod = any;

export interface SchemaContractOptions {
  valid?: Record<string, any>;
  validPatch?: Record<string, any>;
  skipValid?: boolean;
  extraRequired?: string[];
}

export type ModuleContractOptions = Record<string, SchemaContractOptions>;

const typeName = (s: Zod): string | undefined => s?._def?.typeName;

function acceptsUndefined(schema: Zod): boolean {
  const t = typeName(schema);
  if (t === 'ZodOptional' || t === 'ZodDefault') return true;
  if (t === 'ZodAny' || t === 'ZodUnknown') return true;
  if (t === 'ZodNullable') return acceptsUndefined(schema._def.innerType);
  return false;
}

function unwrap(schema: Zod): Zod {
  const t = typeName(schema);
  if (t === 'ZodOptional' || t === 'ZodNullable' || t === 'ZodDefault') {
    return unwrap(schema._def.innerType);
  }
  if (t === 'ZodEffects') return unwrap(schema._def.schema);
  return schema;
}

function buildString(base: Zod): string {
  const checks: any[] = base._def.checks || [];
  if (checks.some((c) => c.kind === 'email')) return 'test@example.com';
  if (checks.some((c) => c.kind === 'url')) return 'https://example.com';
  if (checks.some((c) => c.kind === 'uuid')) {
    return '00000000-0000-0000-0000-000000000000';
  }
  // Best-effort for regex-constrained strings; override per-module if needed.
  if (checks.some((c) => c.kind === 'regex')) return '1';

  const min = checks
    .filter((c) => c.kind === 'min')
    .reduce((m, c) => Math.max(m, c.value), 0);
  const maxCheck = checks.find((c) => c.kind === 'max');
  let len = Math.max(min, 1);
  if (len < 4) len = 4;
  if (maxCheck && len > maxCheck.value) len = maxCheck.value;
  return 'S'.repeat(Math.max(len, 1));
}

function buildNumber(base: Zod): number {
  const checks: any[] = base._def.checks || [];
  let value = 1;
  for (const c of checks) {
    if (c.kind === 'min')
      value = Math.max(value, c.inclusive ? c.value : c.value + 1);
  }
  const maxCheck = checks.find((c) => c.kind === 'max');
  if (maxCheck && value > maxCheck.value) value = maxCheck.value;
  return value;
}

function buildValue(schema: Zod): any {
  const base = unwrap(schema);
  const t = typeName(base);
  switch (t) {
    case 'ZodString':
      return buildString(base);
    case 'ZodNumber':
      return buildNumber(base);
    case 'ZodBigInt':
      return BigInt(1);
    case 'ZodBoolean':
      return true;
    case 'ZodDate':
      return new Date('2024-01-01T00:00:00.000Z');
    case 'ZodLiteral':
      return base._def.value;
    case 'ZodEnum':
      return base._def.values?.[0];
    case 'ZodNativeEnum':
      return Object.values(base._def.values || {})[0];
    case 'ZodArray': {
      const minLen =
        base._def.minLength?.value ?? base._def.exactLength?.value ?? 0;
      if (minLen > 0) {
        return Array.from({ length: minLen }, () => buildValue(base._def.type));
      }
      return [];
    }
    case 'ZodObject':
      return buildObject(base);
    case 'ZodUnion':
      return buildValue(base._def.options[0]);
    case 'ZodRecord':
      return {};
    case 'ZodTuple':
      return (base._def.items || []).map((it: Zod) => buildValue(it));
    default:
      return undefined;
  }
}

function buildObject(objectSchema: Zod): Record<string, any> {
  const shape = objectSchema._def.shape();
  const out: Record<string, any> = {};
  for (const key of Object.keys(shape)) {
    const field = shape[key];
    if (acceptsUndefined(field)) continue; // optional -> omit from minimal object
    out[key] = buildValue(field);
  }
  return out;
}

export function buildValidObject(
  schema: Zod,
  patch: Record<string, any> = {}
): Record<string, any> {
  const base = unwrap(schema);
  if (typeName(base) !== 'ZodObject') return { ...patch };
  return { ...buildObject(base), ...patch };
}

function requiredKeysOf(objectSchema: Zod): string[] {
  const shape = objectSchema._def.shape();
  return Object.keys(shape).filter((k) => !acceptsUndefined(shape[k]));
}

function runContract(
  label: string,
  schema: Zod,
  options: SchemaContractOptions
): void {
  describe(label, () => {
    test('is a usable zod schema', () => {
      expect(typeof schema.safeParse).toBe('function');
    });

    test('rejects undefined input', () => {
      expect(schema.safeParse(undefined).success).toBe(false);
    });

    const base = unwrap(schema);
    const isObject = typeName(base) === 'ZodObject';

    if (!isObject) {
      // Non-object schema: just assert a generated value parses.
      if (!options.skipValid) {
        test('accepts a generated valid value', () => {
          const value = options.valid ?? buildValue(schema);
          expect(schema.safeParse(value).success).toBe(true);
        });
      }
      return;
    }

    const valid = options.valid ?? {
      ...buildObject(base),
      ...(options.validPatch ?? {})
    };
    const requiredKeys = Array.from(
      new Set([...requiredKeysOf(base), ...(options.extraRequired ?? [])])
    );

    if (options.skipValid) return;

    test('accepts a valid object', () => {
      const result = schema.safeParse(valid);
      if (!result.success) {
        throw new Error(
          'Expected valid object to pass but got issues:\n' +
            JSON.stringify(result.error.issues, null, 2) +
            '\nObject was:\n' +
            JSON.stringify(valid, null, 2)
        );
      }
      expect(result.success).toBe(true);
    });

    if (requiredKeys.length > 0) {
      test('rejects an empty object', () => {
        expect(schema.safeParse({}).success).toBe(false);
      });

      test.each(requiredKeys)('requires field "%s"', (key) => {
        const clone: Record<string, any> = { ...valid };
        delete clone[key];
        expect(schema.safeParse(clone).success).toBe(false);
      });
    }
  });
}

export function runSchemaContract(
  label: string,
  schema: Zod,
  options: SchemaContractOptions = {}
): void {
  runContract(label, schema, options);
}

function schemaExports(mod: Record<string, any>): Array<[string, Zod]> {
  return Object.entries(mod).filter(
    ([, v]) => v && typeof v.safeParse === 'function' && v._def
  );
}

export function runModuleSchemaContract(
  moduleName: string,
  mod: Record<string, any>,
  options: ModuleContractOptions = {}
): void {
  const entries = schemaExports(mod);

  if (entries.length === 0) {
    describe(`${moduleName} validation`, () => {
      test('exports at least one zod schema', () => {
        throw new Error(`No zod schema export found in module "${moduleName}"`);
      });
    });
    return;
  }

  describe(`${moduleName} validation`, () => {
    for (const [exportName, schema] of entries) {
      runContract(exportName, schema, options[exportName] ?? {});
    }
  });
}
