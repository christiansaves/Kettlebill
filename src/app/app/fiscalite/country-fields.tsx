"use client";
// Pays (liste + « Autre » en texte libre) et région (liste des provinces pour le Canada, texte libre sinon).
import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { OTHER_COUNTRY, type Option } from "./countries";

export function CountryRegionFields({
  countries,
  provinces,
  defaultCountry,
  defaultRegion,
  labels,
}: {
  countries: Option[];
  provinces: Option[];
  defaultCountry: string;
  defaultRegion: string;
  labels: { country: string; other: string; otherPlaceholder: string; region: string; regionPlaceholder: string; regionHint: string };
}) {
  const known = countries.some((c) => c.code === defaultCountry);
  const [country, setCountry] = useState(known ? defaultCountry : defaultCountry ? OTHER_COUNTRY : "CA");
  const [region, setRegion] = useState(defaultRegion);
  const isCanada = country === "CA";
  const provinceValue = provinces.some((p) => p.code === region) ? region : "QC";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-2">
        <Field label={labels.country}>
          <Select name="country" value={country} onChange={(e) => setCountry(e.target.value)}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
            <option value={OTHER_COUNTRY}>{labels.other}</option>
          </Select>
        </Field>
        {country === OTHER_COUNTRY ? (
          <Input
            name="country_other"
            aria-label={labels.other}
            placeholder={labels.otherPlaceholder}
            defaultValue={known ? "" : defaultCountry}
            maxLength={60}
            required
          />
        ) : null}
      </div>
      <Field label={labels.region} hint={isCanada ? undefined : labels.regionHint}>
        {isCanada ? (
          <Select name="region" value={provinceValue} onChange={(e) => setRegion(e.target.value)}>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            name="region"
            value={provinces.some((p) => p.code === region) ? "" : region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={labels.regionPlaceholder}
            maxLength={60}
          />
        )}
      </Field>
    </div>
  );
}
