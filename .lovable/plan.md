# Urgent Fix: Blank Screen on tapaway.co

## The Problem

The live site shows a blank loading spinner. The browser console reveals the root cause:

```
ReferenceError: Cannot access 'P' before initialization
  at charts-vendor-k3dInSJJ.js:9:16763
```

This is a **Temporal Dead Zone (TDZ) error** thrown synchronously while the `charts-vendor` chunk evaluates. Because it happens during module init, the entire React app fails to mount, leaving the user staring at the inline loader in `index.html` forever.

## Root Cause

In the recent FCP optimization, `vite.config.ts` was updated with `manualChunks` that split `recharts` + all `d3-*` packages into a separate `charts-vendor` chunk:

```ts
if (id.includes("recharts") || id.includes("d3-")) {
  return "charts-vendor";
}
```

Recharts and the d3 ecosystem have **circular dependencies between d3 sub-packages** (e.g. `d3-scale` ↔ `d3-interpolate` ↔ `d3-color`). When Rollup bundles them together with their consumers, the circular refs resolve fine. When forced into an isolated vendor chunk, the hoisted `let`/`const` bindings get accessed before their initializer runs → TDZ ReferenceError.

This is a well-known Rollup/Vite gotcha with d3 + recharts.

## The Fix

Remove the `charts-vendor` rule from `vite.config.ts`. Let recharts/d3 bundle naturally alongside the components that import them. Those components (`AnalyticsOverview`, `AdvancedAnalyticsTab`, `AvMealPrepDashboard`, `chart.tsx`) are only used inside lazy-loaded dashboard routes, so they were never on the landing page critical path anyway — splitting them as their own vendor chunk gave us zero FCP benefit while breaking production.

The other vendor splits (react, supabase, radix, motion) are safe and stay.

## Change

**`vite.config.ts`** — delete this block from `manualChunks`:

```ts
if (id.includes("recharts") || id.includes("d3-")) {
  return "charts-vendor";
}
```

That's it. One deletion. After redeploy, the landing page renders normally.

## Why this is safe

- Landing page (`Index.tsx`) does not import recharts → no FCP regression.
- Charts code already lives inside lazy routes → it was already deferred regardless of the manual chunk.
- All other optimizations (react-vendor, supabase-vendor, radix-vendor, motion-vendor splits, lazy auth routes, font loading tweaks) remain intact.
