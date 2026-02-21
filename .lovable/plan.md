

# Fix Pro Badges Being Cut Off

## The Problem

The "Pro" badges on profile cards in the Hub Showcase use `absolute -top-2 -right-2` positioning, placing them slightly outside the card boundaries. The horizontally scrolling container (`overflow-x-auto`) clips these badges because there's no top padding to accommodate them.

## The Fix

**File:** `src/components/card/HubShowcase.tsx` (line 189)

Add top padding (`pt-2`) to the scrollable container so the badges have room to render above the cards without being clipped.

Change:
```
<div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
```
To:
```
<div className="flex gap-3 overflow-x-auto pt-2 pb-2 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
```

One line change, one file.

