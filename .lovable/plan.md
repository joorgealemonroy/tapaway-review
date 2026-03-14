

# Send Test Post-Purchase Emails

The existing `send-test-emails` edge function only sends OTP and Welcome emails. I need to update it to also send the two new marketplace emails (Buyer purchase confirmation and Creator sale notification), then invoke it.

## Changes

### 1. Update `supabase/functions/send-test-emails/index.ts`

Add two new email templates matching the ones in the stripe webhook:

- **Buyer Email**: "Your purchase is ready!" with product name, price ($0.99), and a dummy download link
- **Creator Email**: "You made a sale! 🎉" with product title, masked buyer email, and price

Send all 4 emails (OTP, Welcome, Buyer, Creator) to the provided email address.

### 2. Deploy and Invoke

After updating the function, deploy it and call it with your email to send all 4 test emails so you can see how they look in your inbox.

