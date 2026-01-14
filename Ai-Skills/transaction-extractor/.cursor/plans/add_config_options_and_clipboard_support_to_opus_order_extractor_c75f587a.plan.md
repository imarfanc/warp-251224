---
name: Add Config Options and Clipboard Support to Opus Order Extractor
overview: Add options to enable/disable saving as a file and copying to clipboard in `order-js/opus-order-extractor.js`, using a clipboard utility from `transaction-js/Amazon-order-details-job.js`.
todos:
  - id: setup-async-and-config
    content: Convert `order-js/opus-order-extractor.js` IIFE to async and add config flags.
    status: completed
  - id: add-clipboard-util
    content: Add `copyToClipboard` utility function to `order-js/opus-order-extractor.js`.
    status: completed
  - id: update-output-logic
    content: Update output logic to use config flags for file saving and clipboard copy.
    status: completed
isProject: false
---

1.  **Modify `order-js/opus-order-extractor.js` to support configuration and clipboard:**

    -   Change the IIFE to an `async` function.
    -   Add `saveToFile` and `enableClipboard` boolean flags at the top of the function.
    -   Incorporate the `copyToClipboard` function from `transaction-js/Amazon-order-details-job.js` into the script.
    -   Update the output section to conditionally trigger the file download and/or clipboard copy based on the configuration flags.

2.  **Logic for Clipboard Copy:**

    -   Use the three strategies from the example: modern API, legacy `execCommand`, and user-gesture fallback.

3.  **Logic for File Saving:**

    -   Wrap the existing file download code in an `if (saveToFile)` block.

4.  **Verification:**

    -   Ensure the script still correctly extracts order data from the provided Amazon order details page.
    -   Verify that toggling the flags results in the expected behavior (file saved/not saved, clipboard updated/not updated).