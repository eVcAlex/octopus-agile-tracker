import wretch from 'wretch';
import { z } from 'zod';
import { API_BASE, apiKeyAuth } from './octopusClient';
import { parseTariffCode } from './tariffs';

// ─── Schema ───

const agreementSchema = z.object({
  tariff_code: z.string(),
  valid_from: z.string(),
  valid_to: z.string().nullable(),
});

const meterSchema = z.object({
  serial_number: z.string(),
});

const gasMeterPointSchema = z.object({
  mprn: z.string(),
  agreements: z.array(agreementSchema),
});

const elecMeterPointSchema = z.object({
  mpan: z.string(),
  is_export: z.boolean().optional(),
  meters: z.array(meterSchema).optional(),
  agreements: z.array(agreementSchema),
});

const propertySchema = z.object({
  gas_meter_points: z.array(gasMeterPointSchema),
  electricity_meter_points: z.array(elecMeterPointSchema),
});

const accountSchema = z.object({
  number: z.string(),
  properties: z.array(propertySchema),
});

export interface AccountDetails {
  gasProductCode: string | null; // e.g. "SILVER-24-07-01"
  gasTariffCode: string | null; // e.g. "G-1R-SILVER-24-07-01-A"
  electricityTariffCode: string | null;
  /** e.g. "AGILE-24-10-01" — null when the tariff code can't be parsed. */
  electricityProductCode: string | null;
  /** Region letter from the electricity tariff code. */
  electricityRegion: string | null;
  /** 2 for day/night (Economy 7 style) tariffs, which aren't supported yet. */
  electricityRegisters: 1 | 2 | null;
  electricityMpan: string | null;
  electricityMeterSerial: string | null;
}

type Agreement = z.infer<typeof agreementSchema>;
type Property = z.infer<typeof propertySchema>;

const isActive = (a: Agreement, now = new Date()) =>
  a.valid_to === null || new Date(a.valid_to) > now;

// Find the currently active agreement (valid_to is null or in the future)
function activeTariff(agreements: Agreement[]): string | null {
  const active = agreements.find((a) => isActive(a));
  return active?.tariff_code ?? agreements[0]?.tariff_code ?? null;
}

// Accounts can hold several properties (e.g. after moving house); the one with
// a live electricity agreement is the one to track, not just the first listed.
function currentProperty(properties: Property[]): Property | undefined {
  return (
    properties.find((p) =>
      p.electricity_meter_points.some((m) =>
        m.agreements.some((a) => isActive(a))
      )
    ) ?? properties[0]
  );
}

export async function fetchAccountDetails(
  apiKey: string,
  accountNo: string
): Promise<AccountDetails> {
  const raw = await wretch(`${API_BASE}/accounts/${accountNo}/`)
    .auth(apiKeyAuth(apiKey))
    .get()
    .json();

  const account = accountSchema.parse(raw);
  const property = currentProperty(account.properties);

  const gasTariff = property?.gas_meter_points[0]
    ? activeTariff(property.gas_meter_points[0].agreements)
    : null;

  // Prefer the import meter point (is_export false/undefined)
  const importPoint =
    property?.electricity_meter_points.find((p) => !p.is_export) ??
    property?.electricity_meter_points[0];

  const elecTariff = importPoint ? activeTariff(importPoint.agreements) : null;

  const elec = elecTariff ? parseTariffCode(elecTariff) : null;

  return {
    gasTariffCode: gasTariff,
    gasProductCode: gasTariff ? (parseTariffCode(gasTariff)?.product ?? null) : null,
    electricityTariffCode: elecTariff,
    electricityProductCode: elec?.product ?? null,
    electricityRegion: elec?.region ?? null,
    electricityRegisters: elec?.registers ?? null,
    electricityMpan: importPoint?.mpan ?? null,
    electricityMeterSerial: importPoint?.meters?.[0]?.serial_number ?? null,
  };
}
