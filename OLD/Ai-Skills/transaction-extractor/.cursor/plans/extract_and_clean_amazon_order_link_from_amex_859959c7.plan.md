---
name: Extract and Clean Amazon Order Link from Amex
overview: Extract the American Express transaction ID and the associated Amazon order link from the current page, clean the link, and copy the result to the clipboard.
todos:
  - id: extract-amex-id-mcp
    content: Extract transactionId from current Amex URL using Playwriter
    status: pending
  - id: extract-amazon-link-mcp
    content: Locate and extract the Amazon digital receipt link from the page using Playwriter
    status: pending
  - id: clean-and-format-mcp
    content: Clean the Amazon link and format the final string (Amex ID + Link)
    status: pending
  - id: copy-to-clipboard-mcp
    content: Copy the formatted string to the browser clipboard using Playwriter
    status: pending
isProject: false
---

1.  **Identify Transaction ID**: Extract the `transactionId` from the current browser URL (`https://global.americanexpress.com/activity?cycleIndex=3&transactionId=320252720300370514`).
2.  **Locate Digital Receipt**: Find the "Show Digital Receipt" link associated with this transaction ID in the DOM.
3.  **Extract and Clean Link**:

    -   Get the `href` attribute from the link.
    -   Clean the URL to keep only the `orderID` parameter (e.g., `https://www.amazon.com/gp/your-account/order-details?orderID=112-6778985-8137005`).

4.  **Format Output**: Create a string containing both the Amex Transaction ID and the cleaned Amazon Order Link.
5.  **Copy to Clipboard**: Execute a script in the browser to copy this formatted string to the clipboard.
6.  **Verify Result**: Display the final extracted data in the Cursor chat for confirmation.

### Refined Selection Logic (to avoid `eval` issues):

Use Playwright locators to find the element and `getAttribute('href')` instead of complex `page.evaluate` blocks where possible.

```javascript
const url = new URL(page.url());
const amexId = url.searchParams.get('transactionId');
const amazonLink = await page.locator('[data-testid*="DigitalReceipt"] a').getAttribute('href');
// cleaning logic...
```