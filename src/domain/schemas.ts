import * as z from 'zod/mini';

const nonEmptyString = z.string().check(z.trim(), z.minLength(1));
const latitude = z.number().check(z.gte(-90), z.lte(90));
const longitude = z.number().check(z.gte(-180), z.lte(180));
const positiveNumber = z.number().check(z.gt(0));
const positiveInt = z.int().check(z.gt(0));

export const peakSchema = z.strictObject({
  id: nonEmptyString,
  dobihId: positiveInt,
  name: nonEmptyString,
  list: z.array(nonEmptyString),
  region: nonEmptyString,
  nationalPark: z.optional(nonEmptyString),
  heightM: positiveNumber,
  heightFt: z.optional(positiveNumber),
  lat: latitude,
  lon: longitude,
  gridRef: z.optional(nonEmptyString),
  source: z.optional(nonEmptyString),
});

export type Peak = z.infer<typeof peakSchema>;

export const peakProgressSchema = z.strictObject({
  peakId: nonEmptyString,
  bagged: z.boolean(),
  baggedDate: z.optional(z.iso.date()),
  notes: z.optional(z.string()),
});

export type PeakProgress = z.infer<typeof peakProgressSchema>;

export const backupSchema = z.strictObject({
  version: positiveInt,
  exportedAt: z.iso.datetime(),
  progress: z.array(peakProgressSchema),
});

export type Backup = z.infer<typeof backupSchema>;

export function parsePeak(input: unknown) {
  return peakSchema.parse(input);
}

export function parseBackup(input: unknown) {
  return backupSchema.parse(input);
}
