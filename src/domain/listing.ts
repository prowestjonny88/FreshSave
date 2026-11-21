import { ELIGIBILITY } from "../data.js";
import { lastCollectionDay, POLICY, storeDay, storeTime, type DateType } from "./time.ts";

interface Declaration {
  pack?: string;
  c1?: boolean;
  c2?: boolean;
  c3?: boolean;
  expiry?: string | null;
}

export function eligibility(fields: Declaration, now = Date.now()) {
  const errs: string[] = [];
  const declaration = ELIGIBILITY.find((item) => item.id === fields.pack);
  if (!declaration) errs.push("Select the food type and storage condition.");
  else if (!declaration.ok) errs.push(`Not eligible: ${declaration.why}.`);
  else {
    if (!fields.c1) errs.push("Declare that the packaging is sealed, intact and undamaged.");
    if (!fields.c2)
      errs.push("Declare that the food needs no refrigeration and was stored as its label says.");
    if (!fields.c3)
      errs.push("Declare that the printed date is legible and matches the date entered.");
  }
  const past = Boolean(fields.expiry && fields.expiry < storeDay(now));
  if (past) errs.push("Not eligible: food past its printed date can't be listed.");
  return { ok: !errs.length, errs, rejected: declaration?.ok === false || past };
}

interface CollectionFields {
  expiry?: string;
  expiryType: DateType;
  pickupUntil?: string;
  pickFrom?: string;
  pickTo?: string;
}

export function pickupErrors(fields: CollectionFields, now = Date.now()) {
  const errors: Partial<Record<"pickupUntil" | "pickTo", string>> = {};
  if (!fields.expiry) return errors;
  const last = lastCollectionDay(fields.expiry, fields.expiryType);
  if (!fields.pickupUntil) errors.pickupUntil = "Choose the last day buyers can collect.";
  else if (fields.pickupUntil < storeDay(now))
    errors.pickupUntil = "The last collection day can't be in the past.";
  else if (fields.pickupUntil > last)
    errors.pickupUntil =
      fields.expiryType === "use-by"
        ? "Use-by food must be collected at least a day before its date."
        : "Collection must end on or before the date on the pack.";
  if (!fields.pickFrom || !fields.pickTo) errors.pickTo = "Set the daily collection hours.";
  else if (fields.pickTo <= fields.pickFrom)
    errors.pickTo = "Closing time must be after opening time.";
  else if (
    fields.pickupUntil &&
    !errors.pickupUntil &&
    storeTime(fields.pickupUntil, fields.pickTo) < now + POLICY.leadMin * 60_000
  ) {
    errors.pickTo = `Collection must end at least ${POLICY.leadMin} minutes from now.`;
  }
  return errors;
}
