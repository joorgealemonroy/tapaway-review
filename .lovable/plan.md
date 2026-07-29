# Harden Rep PDF Upload Flow

## Root cause

Two overlapping bugs on `src/pages/rep/RepBusinesses.tsx`:

1. **Stale file input.** After `onChange` fires, React re-renders the row. By the time our `async uploadPdf` reaches its `finally` block, the `inputEl` we captured from `e.currentTarget` can be detached from the DOM (React unmounted the label subtree during the state update from `setUploadingId`). Clearing `.value` on the detached node has no effect, so re-selecting the same file (or any file, in some browsers) no longer fires `onChange` — reps see the picker close silently and think it's "upload failed." The only way out is a hard refresh, which matches the report.
2. **Silent errors.** When the upload does throw, we surface `e.message`, but Supabase storage errors sometimes arrive as `{ error: { message } }` on the response rather than a thrown `Error`. Our current code only checks `upErr`, but for network / 5xx cases the SDK returns `data: null, error: { message: '' }`, so the toast reads "Upload failed:" with no detail.

## Changes (single file: `src/pages/rep/RepBusinesses.tsx`)

1. **Force-remount the file input after every attempt.** Track a per-hub `uploadNonce` (`Record<string, number>`) in state, use it as the `key` on each `<input type="file">`. Bump the nonce in `finally`. This guarantees a fresh input node, so the next click always fires `onChange` — no refresh needed.
2. **Stop relying on `e.currentTarget`.** Drop the `inputEl` argument. Rely solely on the remount above.
3. **Serialize per-hub uploads.** Guard `uploadPdf` with an early return if `uploadingId === hubId` so double-clicks can't race.
4. **Better error surfacing.**
   - Log the full error object (`console.error('[rep-upload]', { hubId, path, upErr, dbErr })`).
   - Build the toast message from `upErr?.message || upErr?.error || (typeof upErr === 'string' ? upErr : JSON.stringify(upErr))`, falling back to `'unknown error'`.
   - If `upErr?.statusCode === '409'` or message includes `already exists`, retry once with a fresh timestamp path (defensive — upsert should already handle this, but reps have seen it).
5. **Confirm write.** After a successful upload + DB update, re-select the row from `personal_profiles` and only then update local `hubs` state with the returned `card_print_pdf_path`. This kills the "preview still shows old file" perception.

## Out of scope

- Storage RLS (already fixed last turn — confirmed working since some uploads succeed).
- Admin download surfaces.
- W-9 / `rep-tax-docs` flow.

## Verification

- Typecheck clean.
- Manually: upload a PDF, then immediately upload a second PDF to the same hub without refreshing — should succeed. Cancel a picker, reopen, pick same file — `onChange` still fires. Force an error (offline) — toast shows a real message and console has the full error object.
