import wretch from 'wretch';
import { z } from 'zod';
import { API_BASE, apiKeyAuth } from './octopusClient';

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
  electricityMpan: string | null;
  electricityMeterSerial: string | null;
}

// Extract product code from a tariff code like "G-1R-SILVER-24-07-01-A"
function extractProductCode(tariffCode: string): string | null {
  // Gas: G-1R-{PRODUCT}-{REGION}   Electricity: E-1R-{PRODUCT}-{REGION}
  const match = tariffCode.match(/^[GE]-1R-(.+)-[A-Z]$/);
  return match?.[1] ?? null;
}

// Find the currently active agreement (valid_to is null or in the future)
function activeTariff(
  agreements: { tariff_code: string; valid_to: string | null }[]
): string | null {
  const now = new Date();
  const active = agreements.find(
    (a) => a.valid_to === null || new Date(a.valid_to) > now
  );
  return active?.tariff_code ?? agreements[0]?.tariff_code ?? null;
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
  const property = account.properties[0];

  const gasTariff = property?.gas_meter_points[0]
    ? activeTariff(property.gas_meter_points[0].agreements)
    : null;

  // Prefer the import meter point (is_export false/undefined)
  const importPoint =
    property?.electricity_meter_points.find((p) => !p.is_export) ??
    property?.electricity_meter_points[0];

  const elecTariff = importPoint ? activeTariff(importPoint.agreements) : null;

  return {
    gasTariffCode: gasTariff,
    gasProductCode: gasTariff ? extractProductCode(gasTariff) : null,
    electricityTariffCode: elecTariff,
    electricityMpan: importPoint?.mpan ?? null,
    electricityMeterSerial: importPoint?.meters?.[0]?.serial_number ?? null,
  };
}
