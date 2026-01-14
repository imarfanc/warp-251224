---
name: Extract Order Links in Amex Extractor
overview: I will update the extraction script to asynchronously expand each transaction row on the American Express page to capture the 'Show Digital Receipt' link (Amazon order link).
todos:
  - id: async-wrapper-01
    content: Convert extraction script to async IIFE
    status: completed
  - id: impl-link-fetch-02
    content: Implement fetchOrderLinks logic with row expansion
    status: completed
  - id: integrate-link-flow-03
    content: Update main flow to include order link extraction for Amazon transactions
    status: completed
isProject: false
---

# Plan - Extract Order Links in Amex Extractor

I will update [Amex-transaction-extractor-Enhanced.js](Amex-transaction-extractor-Enhanced.js) to include an asynchronous step that expands transaction rows to fetch the Amazon order details link.

## Proposed Changes

### 1. Convert IIFE to Async

I will change the main script wrapper to an `async` function so we can use `await` for page interactions (clicks and waits).

### 2. Add `fetchOrderLinks` function

I will implement a function that:

- Filters extracted transactions for potential Amazon orders (based on description).
- For each target transaction:
    - Finds the corresponding DOM row using its `transactionId`.
    - Clicks the row to expand it.
    - Waits for the `#digitalReceiptAnchor` element to appear.
    - Extracts the `href` attribute.
    - Clicks the row again to collapse it (to keep the DOM clean).
- Adds the `orderLink` property to the transaction object.

### 3. Update the Main Flow

- The script will first perform the "fast" extraction of all transactions using the existing methods.
- It will then log a message indicating it is starting the "deep" extraction of order links.
- It will process rows one by one with a small delay to avoid overwhelming the page.

## Verification Plan

### Automated Testing

- I will run the updated `async` logic via `mcp_playwriter_execute` on the active Amex tab to verify it correctly captures links for a few sample rows.

### Manual Verification

- The user can run the script and observe the console logs showing the progress of link extraction.