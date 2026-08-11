import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const parameterSchema = z.object({
  id: z.string().nullable().optional(),
  grp: z
    .string()
    .max(255, 'Maksimal 255 karakter')
    .min(1, { message: dynamicRequiredMessage('GRP') }),
  subgrp: z.string().max(255, 'Maksimal 255 karakter').nullable().optional(),
  kelompok: z.string().max(255, 'Maksimal 255 karakter').nullable().optional(),
  text: z
    .string()
    .max(255, 'Maksimal 255 karakter')
    .min(1, { message: dynamicRequiredMessage('TEXT') }),
  memo: z.record(z.string()).nullable().optional(),
  type: z.string().max(100, 'Maksimal 100').nullable().optional(),
  default: z.string().max(255, 'Maksimal 255 karakter').nullable().optional(),
  info: z.string().nullable().optional()
});
export type ParameterInput = z.infer<typeof parameterSchema>;
