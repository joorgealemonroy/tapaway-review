## Problem

On `/rep/apply`, inputs only accept one character at a time (focus is lost after each keystroke).

## Root cause

In `src/pages/rep/RepApply.tsx`, the `Shell` wrapper component is declared **inside** the `RepApply` function body. Every time `setForm` runs on a keystroke, `RepApply` re-renders and a brand-new `Shell` function reference is created. React sees a different component type at that position in the tree, unmounts the entire subtree (including the `<Input>`), and mounts a fresh one — which drops focus. The user has to click back into the field for every character.

## Fix

Move `Shell` out of the `RepApply` component so its identity is stable across renders.

- Extract `Shell` to a module-scope component (defined above `RepApply`, same file).
- It only needs `children` as a prop — no other closure values are used.
- No behavior, styling, or markup changes; just relocation.

## Verification

- Type a multi-character string into Name / Email / Phone / Message on `/rep/apply` and confirm focus is retained and the full string appears.
- Confirm the success state (`submitted === true`) still renders correctly inside the same `Shell`.