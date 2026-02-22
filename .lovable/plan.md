

# Fix Misleading "Why Go Physical?" Benefits

## Problem
The "Share without Wi-Fi" benefit is inaccurate -- while NFC tapping works without Wi-Fi, the links that open still require an internet connection. This could mislead users.

## Changes

### File: `src/components/personal/PersonalShopTab.tsx`

Replace the three benefits in the `BENEFITS` array:

| Current | New |
|---------|-----|
| **Share without Wi-Fi** "Works with just a tap -- no internet needed" | **No app needed** "Just tap -- works instantly on any phone" |
| **Make a lasting impression** "Stand out with a physical card people remember" | **Make a lasting impression** "Stand out with a physical card people remember" (keep as-is) |
| **Works with any smartphone** "Compatible with iPhone and Android -- no app needed" | **Always on you** "Fits in your wallet -- never miss a connection" |

The first benefit shifts focus from the false Wi-Fi claim to the no-app-required convenience. The third benefit changes to avoid repeating the "no app" point (now covered by the first) and highlights the portability angle instead. The icon for the first benefit changes from `WifiOff` to `Smartphone`, and the third changes from `Smartphone` to `CreditCard` (wallet-sized card).

