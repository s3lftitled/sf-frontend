import { z } from "zod";
import { MAX_PHOTO_BYTES, PHOTO_DATA_URL, photoBytes } from "./photo";
import { ADDRESS_TYPES } from "./types";
import type {
  AddressFieldErrors,
  AddressFormRow,
  AddressInput,
  ContactInput,
  ContactTextField,
} from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

export const addressInputSchema = z.object({
  type: z.enum(ADDRESS_TYPES),
  street: optionalText(300, "Street address"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
}) satisfies z.ZodType<AddressInput, unknown>;

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  photo: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null)
    .refine(
      (value) => value === null || PHOTO_DATA_URL.test(value),
      "Photo must be a JPEG, PNG, WebP, or GIF image",
    )
    .refine(
      (value) => value === null || photoBytes(value) <= MAX_PHOTO_BYTES,
      `Photo must be ${MAX_PHOTO_BYTES / 1024} KB or smaller`,
    ),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  addresses: z.array(addressInputSchema).default([]),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/** Address issues arrive as `["addresses", index, field]`; group them by row so
 *  each control can show its own message. */
export function zodAddressErrors(error: z.ZodError): AddressFieldErrors {
  const errors: AddressFieldErrors = {};

  for (const issue of error.issues) {
    const [root, index, field] = issue.path;
    if (root !== "addresses" || typeof index !== "number") continue;

    const row = (errors[index] ??= {});
    if (typeof field === "string" && !(field in row)) {
      row[field as keyof AddressInput] = issue.message;
    }
  }

  return errors;
}

/** Collapse a ZodError into one message per field, keyed by input name. */
export function zodFieldErrors(
  error: z.ZodError,
): Partial<Record<ContactTextField, string>> {
  const fieldErrors: Partial<Record<ContactTextField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === "addresses") continue;
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as ContactTextField] = issue.message;
    }
  }
  return fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: ContactTextField;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/** Pull the contact fields out of a submitted form, as raw strings. */
export function formDataToValues(
  formData: FormData,
): Record<ContactTextField, string> {
  return {
    ...Object.fromEntries(
      CONTACT_FIELDS.map((field) => [
        field.name,
        String(formData.get(field.name) ?? ""),
      ]),
    ),
    // The photo is a hidden data-URL input rather than one of the text controls
    // `CONTACT_FIELD_GROUPS` renders, so it is read separately.
    photo: String(formData.get("photo") ?? ""),
  } as Record<ContactTextField, string>;
}

/**
 * Pull the repeated address rows out of a submitted form.
 *
 * Each row's inputs are named `addresses[i].field`, so the index groups them
 * without the form needing to know how many rows there are.
 */
export function formDataToAddresses(formData: FormData): AddressFormRow[] {
  const rows = new Map<string, Record<string, string>>();

  for (const [key, value] of formData.entries()) {
    const match = /^addresses\[(\d+)\]\.(\w+)$/.exec(key);
    if (!match) continue;
    const [, index, field] = match;
    const row = rows.get(index) ?? {};
    row[field] = String(value);
    rows.set(index, row);
  }

  const text = (value: string | undefined) => value?.trim() || null;

  return [...rows.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, row]) => ({
      // Left as submitted: `addressInputSchema` is what decides whether it is a
      // real type, so a tampered value is rejected rather than quietly changed.
      type: row.type ?? "",
      street: text(row.street),
      city: text(row.city),
      state: text(row.state),
      postal_code: text(row.postal_code),
      country: text(row.country),
    }));
}
