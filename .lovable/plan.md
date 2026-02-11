

# Show masked billing email above Manage Subscription button

## What changes

**File: `src/components/personal/PersonalBillingTab.tsx`**

Move the billing email display from below the button to directly above it, and simplify the message. Also always show the billing email for paying users (not just when it differs from account email), since users need to know which email to use in the portal.

### Current layout (lines 106-128):
```
[Manage Subscription button]
[Billing email note (only if different)]
```

### New layout:
```
Billing email on file: su****r@******.com
[Manage Subscription button]
```

The billing email line will be a simple `p` tag with muted text -- no card, no info icon, no long explanation. Just:

**"Billing email on file: su****r@******.com"**

Show this for all paying (non-VIP) users who have a `stripe_billing_email`. Remove the `showBillingEmail` condition that required the emails to differ -- the user should always see which email is tied to billing.

### Specific edits:

1. **Remove** the `showBillingEmail` const (line 50-51)
2. **Restructure** lines 106-128: place the masked email text *above* the button, wrapped in a simple `<p>` with `text-sm text-muted-foreground`
3. **Remove** the `Info` icon import and the `bg-muted` box -- keep it minimal

Result for a Pro user on mobile:

```
Billing email on file: su****r@******.com

[Manage Subscription]
```

| File | Change |
|------|--------|
| `src/components/personal/PersonalBillingTab.tsx` | Move billing email above button, simplify text, always show for paying users |

