---
name: Fix and Enhance Amazon/Amex Extractor
overview: Fix the 'module is not defined' error and add functionality to extract Amazon order links from American Express transaction pages.
todos:
  - id: refactor-script
    content: Refactor Amazon-order-details-job.js for browser compatibility and add Amex extraction logic
    status: completed
  - id: test-amex-extraction
    content: Test the extraction on the current Amex page via Playwriter MCP
    status: completed
isProject: false
---

1.  **Modify `transaction-js/Amazon-order-details-job.js`**:

    -   Wrap `module.exports` in a check to prevent errors when running in the browser console.
    -   Add a `runInBrowser` function that auto-detects if it's on an Amex activity page or an Amazon order page.
    -   Implement Amex-specific extraction logic to get the `transactionId` and `orderLink` (from `#digitalReceiptAnchor`).
    -   Ensure the results are copied to the clipboard using `navigator.clipboard`.
    -   Refactor the Amazon extraction logic to be callable within the browser environment (using `document` instead of just `page.evaluate`).

2.  **Verify with Playwright MCP**:

    -   Test the script on the open Amex tab to ensure it correctly identifies the transaction ID and Amazon link.