---
name: Fix Amex Transaction Extractor
overview: The current script fails because Amex changed its DOM structure (checkbox values are empty and 'role=table' is missing). I will add a new extraction method using 'data-testid' selectors which are currently present on the page.
todos:
  - id: impl-method3-fix01
    content: Implement tryMethod3 with data-testid selectors
    status: completed
  - id: update-order-fix02
    content: Reorder extraction methods to prioritize Method 3
    status: completed
  - id: test-script-fix03
    content: Test the updated script using Playwright on the active page
    status: completed
isProject: false
---

# Plan - Fix Amex Transaction Extractor

The script [Amex-transaction-extractor-Enhanced.js](Amex-transaction-extractor-Enhanced.js) is failing because it relies on outdated DOM selectors. I will introduce a more robust extraction method (Method 3) based on the current `data-testid` attributes found on the Amex Activity page.

## Proposed Changes

### 1. Add Method 3 to `Amex-transaction-extractor-Enhanced.js`

I will implement `tryMethod3` which will:

- Select all rows with `[data-testid="transaction-table-row"]`.
- Extract the `transactionId` from the `id` attribute.
- Parse the row's text content or sub-elements for `date`, `amount`, `description`, `status`, and `tag`.
```javascript
const tryMethod3 = () => {
  console.log('Trying Method 3: Test-id based extraction...');
  const rows = Array.from(document.querySelectorAll('[data-testid="transaction-table-row"]'));
  console.log(`Found ${rows.length} transaction rows via test-id`);
  
  return rows.map(row => {
    try {
      const transactionId = row.id;
      const text = row.innerText;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Based on observed structure:
      // Line 0: ID (sometimes)
      // Line 1: Date
      // Line 2: Status (e.g., 5X Points)
      // Line 3: Description
      // Line 4: Tag (e.g., arfan)
      // Line 5: Amount
      
      const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/);
      const amountMatch = text.match(/(-?\$[\d,]+\.\d{2})/);
      
      // Fallback description extraction if lines aren't reliable
      const amount = amountMatch ? parseFloat(amountMatch[0].replace(/[$,]/g, '')) : null;
      
      return {
        transactionId,
        date: dateMatch ? dateMatch[0] : null,
        amount,
        description: lines.find(l => l.length > 10 && !l.includes('$') && !/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(l)) || lines[3],
        status: lines.find(l => l.includes('Points') || l.includes('Credit')) || null,
        tag: text.match(/\b(arfan|tosifa|employee)\b/i)?.[0] || null
      };
    } catch (e) {
      return null;
    }
  }).filter(t => t && t.transactionId && t.amount !== null);
};
```


### 2. Update `extractTransactions` logic

Modify the main loop to try Method 3 first:

- `let results = tryMethod3();`
- `if (results.length === 0) results = tryMethod1();`
- `if (results.length === 0) results = tryMethod2();`

## Verification Plan

### Automated Testing

- I will use the `mcp_playwriter_execute` tool to run the updated script logic directly on the user's open Amex tab and verify it returns the expected number of transactions (37 rows were detected earlier).

### Manual Verification

- After the user confirms the fix, they can run the updated script in their console and check the logs.