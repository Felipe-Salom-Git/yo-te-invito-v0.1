# Slice 10 — Referrals V1 — Smoke Tests

## Prerequisites

- API and Web app running
- Event with approved status
- Dev user with ADMIN or PRODUCER role

## Test 1: Opening /r/:code sets attribution cookie

1. Create a referral link via POST /events/:eventId/referral-links (e.g. code `test123`).
2. In a fresh browser/incognito, visit `http://localhost:3000/r/test123`.
3. Check that:
   - You are redirected to the event page.
   - Cookie `yti_ref` is set to `test123` (DevTools → Application → Cookies).

---

## Test 2: Checkout creates attribution

1. Ensure cookie `yti_ref` is set (from Test 1).
2. Create an order via POST /public/orders with body including `referralCode: "test123"` and matching eventId.
3. Query ReferralAttribution table: there should be one row for that orderId.
4. Order.referralLinkId should match the referral link.

---

## Test 3: Attribution persists through payment

1. Continue from Test 2 (order created with referral).
2. Create and approve payment for that order (confirm demo payment).
3. Order status becomes PAID.
4. ReferralAttribution row still exists and is unchanged.
5. Order.referralLinkId is unchanged.

---

## Test 4: Attribution cannot change after order paid

1. Verify there is no API or code path that updates Order.referralLinkId or ReferralAttribution when order status is PAID.
2. Manual check: attempt to update an order’s referralLinkId via DB — business logic must never do this for paid orders.

---

## Test 5: Producer dashboard shows attributed orders count

1. Open producer referrals page: `/producer/events/{eventId}/referrals`.
2. Create a referral link, generate an attributed order (with referral cookie/code), complete payment.
3. Refresh the referrals list: the link should show attributed orders count > 0.
