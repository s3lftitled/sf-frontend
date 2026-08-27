"use client";

import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  ADDRESS_TYPES,
  type AddressFieldErrors,
  type AddressFormRow,
} from "@/lib/contacts/types";

const CONTROL =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:bg-input";

const PARTS = [
  { name: "street", label: "Street address", max: 300, placeholder: "1 Market St, Suite 400", wide: true },
  { name: "city", label: "City", max: 120, placeholder: "San Francisco" },
  { name: "state", label: "State / region", max: 120, placeholder: "CA" },
  { name: "postal_code", label: "Postal code", max: 20, placeholder: "94105" },
  { name: "country", label: "Country", max: 120, placeholder: "USA" },
] as const;

function emptyAddress(): AddressFormRow {
  return {
    type: "Home",
    street: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
  };
}

/**
 * The repeatable address rows.
 *
 * Each input is named `addresses[i].field`, which is what lets a plain form POST
 * carry a variable number of addresses without any client-side serialisation.
 * Rows are keyed by a counter rather than their index, so removing one does not
 * shuffle the values of the rows below it.
 */
export default function AddressFields({
  defaultValue,
  errors,
}: {
  defaultValue: AddressFormRow[];
  errors?: AddressFieldErrors;
}) {
  const [rows, setRows] = useState(() =>
    defaultValue.map((address, index) => ({ key: index, address })),
  );
  const [nextKey, setNextKey] = useState(defaultValue.length);

  function addRow() {
    setRows((current) => [...current, { key: nextKey, address: emptyAddress() }]);
    setNextKey((key) => key + 1);
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Addresses</legend>

      <div className="border-b border-hairline pb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Addresses
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Optional. Add as many as you need, each tagged Home, Work, or Other.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-[13px] text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          No addresses yet.
        </p>
      ) : null}

      {rows.map(({ key, address }, index) => {
        const rowErrors = errors?.[index] ?? {};

        return (
        <div
          key={key}
          className="space-y-4 rounded-lg border border-border bg-card/50 p-4"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <label
                htmlFor={`address-${key}-type`}
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Type
              </label>
              <select
                id={`address-${key}-type`}
                name={`addresses[${index}].type`}
                defaultValue={address.type}
                aria-invalid={rowErrors.type ? true : undefined}
                className={`${CONTROL} w-auto pr-8 ${
                  rowErrors.type ? "border-destructive" : ""
                }`}
              >
                {ADDRESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {rowErrors.type ? (
                <p role="alert" className="mt-1.5 text-[13px] text-destructive">
                  {rowErrors.type}
                </p>
              ) : null}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeRow(key)}
              aria-label={`Remove address ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PARTS.map((part) => (
              <div key={part.name} className={"wide" in part && part.wide ? "sm:col-span-2" : undefined}>
                <label
                  htmlFor={`address-${key}-${part.name}`}
                  className="mb-1.5 block text-[13px] font-medium text-foreground"
                >
                  {part.label}
                </label>
                <input
                  id={`address-${key}-${part.name}`}
                  name={`addresses[${index}].${part.name}`}
                  defaultValue={address[part.name] ?? ""}
                  maxLength={part.max}
                  placeholder={part.placeholder}
                  aria-invalid={rowErrors[part.name] ? true : undefined}
                  className={`${CONTROL} ${
                    rowErrors[part.name] ? "border-destructive" : ""
                  }`}
                />
                {rowErrors[part.name] ? (
                  <p role="alert" className="mt-1.5 text-[13px] text-destructive">
                    {rowErrors[part.name]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          </div>
        );
      })}

      <Button variant="secondary" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </Button>
    </fieldset>
  );
}
