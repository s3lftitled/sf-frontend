"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Trash2, UserRound } from "lucide-react";
import Button, { buttonClasses } from "@/components/ui/Button";
import {
  PHOTO_MAX_EDGE,
  PHOTO_MEDIA_TYPES,
  encodePhoto,
} from "@/lib/contacts/photo";

/**
 * Picks an image, downscales it in the browser, and carries the result in a
 * hidden input so the photo is submitted by the same POST as every other field.
 *
 * The label doubles as the button, which is what lets the file input stay
 * visually hidden while remaining focusable and labelled.
 */
export default function PhotoField({
  defaultValue,
  error,
}: {
  defaultValue: string;
  error?: string;
}) {
  const [photo, setPhoto] = useState(defaultValue);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setFailure(null);
    setBusy(true);
    try {
      setPhoto(await encodePhoto(file));
    } catch {
      setFailure("That file could not be read as an image.");
    } finally {
      setBusy(false);
    }
  }

  const message = error ?? failure;

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Photo</legend>

      <div className="border-b border-hairline pb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Photo
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Optional. Without one, the contact shows their initials.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <input type="hidden" name="photo" value={photo} />

        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="Selected profile photo"
            className="h-16 w-16 shrink-0 rounded-full border border-hairline object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
            <UserRound className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label
              htmlFor="field-photo"
              className={`${buttonClasses("secondary", "sm")} cursor-pointer`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus
                  className="h-4 w-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              {photo ? "Change photo" : "Add photo"}
            </label>

            {photo ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhoto("");
                  setFailure(null);
                }}
              >
                <Trash2
                  className="h-4 w-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                Remove
              </Button>
            ) : null}
          </div>

          <p className="text-[13px] text-muted-foreground">
            Scaled down to {PHOTO_MAX_EDGE}px before saving. Square works best.
          </p>
        </div>

        <input
          id="field-photo"
          type="file"
          accept={PHOTO_MEDIA_TYPES.join(",")}
          className="sr-only"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? "field-photo-error" : undefined}
          onChange={(event) => {
            void onPick(event.target.files?.[0]);
            // Reset so re-picking the same file fires another change event.
            event.target.value = "";
          }}
        />
      </div>

      {message ? (
        <p
          id="field-photo-error"
          role="alert"
          className="text-[13px] text-destructive"
        >
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
