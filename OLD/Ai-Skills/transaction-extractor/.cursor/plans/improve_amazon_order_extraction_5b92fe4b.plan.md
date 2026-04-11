---
name: Improve Amazon Order Extraction
overview: Update the Amazon order extraction script to reliably fetch the 18-digit transaction/reference ID and return a cleaned order link.
todos:
  - id: refine-link-extraction
    content: Refine order link extraction and cleaning in Amazon-order-details-job.js
    status: completed
  - id: improve-invoice-detection
    content: Improve invoice link detection and navigation in Amazon-order-details-job.js
    status: completed
  - id: enhance-id-extraction
    content: Enhance transactionId (Reference ID) extraction regex and fallbacks in Amazon-order-details-job.js
    status: completed
isProject: false
---

1.  **Enhance `extractAmazonOrder` in `Amazon-order-details-job.js`**:

    -   Update the `evaluate` block to capture and clean the current `orderLink` from `window.location.href`.
    -   Improve the "Invoice" link detection to handle different labels like "View or Print invoice".
    -   Refine the `transactionId` (Reference ID) extraction on the invoice page with more robust regex patterns and fallbacks.
    -   Ensure the final result object includes both `transactionId` and the cleaned `orderLink`.

2.  **Specific Changes in `Amazon-order-details-job.js`**:

    -   **Link Cleaning**: Use `URL` API or regex to strip extra query parameters from the Amazon order details URL, keeping only `orderID`.
    -   **Reliable ID Extraction**: Look for labels like "Reference ID", "Merchant Order ID", or "Transaction ID" followed by a 15-18 digit number.
    -   **Robust Navigation**: Use multiple selectors to find the invoice link on the order details page.

### Example Logic for Link Cleaning:

```javascript
const url = new URL(window.location.href);
const orderID = url.searchParams.get('orderID');
const cleanedLink = orderID ? `${url.origin}${url.pathname}?orderID=${orderID}` : url.href;
```

### Example Logic for Transaction ID:

```javascript
const patterns = [
    /Reference ID:\s*(\d{15,18})/i,
    /Merchant Order ID:\s*(\d{15,18})/i,
    /Transaction ID:\s*(\d{15,18})/i
];
```