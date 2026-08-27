import {
  CONTACT_FIELDS,
  contactInputSchema,
  formDataToAddresses,
  formDataToValues,
  zodAddressErrors,
  zodFieldErrors,
} from "@/lib/contacts/schema";

/** 1x1 transparent GIF — the smallest value the data-URL rules accept. */
const PHOTO =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function values(overrides: Record<string, string> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    notes: "",
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: "a".repeat(101), company: "c".repeat(201) }),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
      company: "Company must be 200 characters or fewer",
    });
  });
});

describe("photo", () => {
  it("accepts an image data URL", () => {
    const result = contactInputSchema.safeParse(values({ photo: PHOTO }));
    expect(result.success && result.data.photo).toBe(PHOTO);
  });

  it("treats a blank photo as no photo", () => {
    const result = contactInputSchema.safeParse(values({ photo: "" }));
    expect(result.success && result.data.photo).toBeNull();
  });

  it("rejects a non-image data URL", () => {
    const result = contactInputSchema.safeParse(
      values({ photo: "data:application/pdf;base64,Zm9v" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a photo over the size limit", () => {
    const result = contactInputSchema.safeParse(
      values({ photo: `data:image/png;base64,${"A".repeat(2 * 1024 * 1024)}` }),
    );
    expect(result.success).toBe(false);
  });
});

describe("addresses", () => {
  it("defaults to an empty list", () => {
    const result = contactInputSchema.safeParse(values());
    expect(result.success && result.data.addresses).toEqual([]);
  });

  it("accepts many addresses with different types", () => {
    const result = contactInputSchema.safeParse({
      ...values(),
      addresses: [
        { type: "Home", city: "London" },
        { type: "Work", city: "San Francisco" },
        { type: "Other", city: "Paris" },
      ],
    });

    expect(result.success && result.data.addresses.map((a) => a.type)).toEqual([
      "Home",
      "Work",
      "Other",
    ]);
  });

  it("reports which row and field failed", () => {
    const result = contactInputSchema.safeParse({
      ...values(),
      addresses: [
        { type: "Home", city: "London" },
        { type: "Holiday", postal_code: "9".repeat(21) },
      ],
    });

    const errors = zodAddressErrors(result.error!);
    expect(errors[0]).toBeUndefined();
    expect(errors[1].type).toBeDefined();
    expect(errors[1].postal_code).toBe("Postal code must be 20 characters or fewer");
  });

  it("keeps address issues out of the top-level field errors", () => {
    const result = contactInputSchema.safeParse({
      ...values(),
      addresses: [{ type: "Holiday" }],
    });
    expect(zodFieldErrors(result.error!)).toEqual({});
  });

  it("rejects an unknown address type", () => {
    const result = contactInputSchema.safeParse({
      ...values(),
      addresses: [{ type: "Holiday", city: "Nice" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("formDataToValues", () => {
  it("pulls every known field out, defaulting to an empty string", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(Object.keys(extracted).sort()).toEqual(
      [...CONTACT_FIELDS.map((field) => field.name), "photo"].sort(),
    );
  });

  it("groups the indexed address inputs into rows", () => {
    const formData = new FormData();
    formData.set("addresses[0].type", "Work");
    formData.set("addresses[0].city", "San Francisco");
    formData.set("addresses[1].type", "Home");
    formData.set("addresses[1].city", "London");

    expect(formDataToAddresses(formData)).toEqual([
      { type: "Work", street: null, city: "San Francisco", state: null, postal_code: null, country: null },
      { type: "Home", street: null, city: "London", state: null, postal_code: null, country: null },
    ]);
  });

  it("passes a tampered type through so validation can reject it", () => {
    const formData = new FormData();
    formData.set("addresses[0].type", "Holiday");

    const rows = formDataToAddresses(formData);
    expect(rows[0].type).toBe("Holiday");
    expect(
      contactInputSchema.safeParse({ ...values(), addresses: rows }).success,
    ).toBe(false);
  });

  it("reads the photo from its hidden input", () => {
    const formData = new FormData();
    formData.set("photo", PHOTO);

    expect(formDataToValues(formData).photo).toBe(PHOTO);
  });
});
