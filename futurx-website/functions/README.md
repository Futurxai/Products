# futurx-website / functions

Firebase Cloud Functions backing the Razorpay payment flow on the futurx-website Firebase project.

Three HTTP endpoints, all in `asia-south1`:

| Function | Hosting URL | Purpose |
| --- | --- | --- |
| `createSubscription` | `POST /api/subscription/create` | Creates a Razorpay subscription using the configured plan, stores the record in Firestore, returns `{ subscriptionId, keyId }` to the client |
| `verifySubscription` | `POST /api/subscription/verify` | HMAC verification of `payment_id|subscription_id` with the key secret |
| `razorpayWebhook` | `POST /api/razorpay/webhook` | Razorpay webhook handler — verifies signature, logs event, updates subscription status |

Hosting → Function rewrites are configured in `../firebase.json`.

## First-time setup

1. From the `futurx-website` directory:
   ```
   cd functions
   npm install
   ```

2. Create a `.env` file in this folder (gitignored) with your Razorpay test keys plus the plan ID:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx
   RAZORPAY_PLAN_ID=plan_xxxxxxxxxxxxx
   ```
   For Live mode later, swap the key id/secret with `rzp_live_*` credentials and update the webhook secret. Do not commit `.env`.

3. Create the ₹9/month plan once in the Razorpay dashboard (or via API):
   - Period: monthly, Interval: 1
   - Amount: 900 (paise = ₹9.00), Currency: INR
   - Item name: "Love Digitally Premium"
   - Copy the returned `plan_id` into `RAZORPAY_PLAN_ID` in `.env`.

4. Configure the webhook in Razorpay dashboard → Webhooks:
   - URL: `https://<your-firebase-hosting-domain>/api/razorpay/webhook`
   - Secret: random string — paste the same value into `RAZORPAY_WEBHOOK_SECRET`
   - Events to subscribe to: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.halted`, `subscription.pending`, `payment.failed`

5. Deploy:
   ```
   npm run deploy
   ```

## Local testing

```
npm run serve
```
The functions emulator runs at `http://localhost:5001` and reads the same `.env`.

## Logs

```
npm run logs
```

## Notes

The Razorpay HMAC + REST helpers in `index.js` mirror `futurx-agent/packages/shared-payments/payments.ts`. They are not imported as a workspace dependency because this site lives in a different repo. If you change one, change the other.
