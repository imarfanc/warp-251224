---
name: grocery-purchase
description: Automate grocery purchase entry using Playwright MCP. Use when user wants to add grocery purchases, click the + button on the grocery purchase page, or interact with the CSStorePro grocery purchase system at secure.cstorepro.com.
---

# Grocery Purchase

Automate grocery purchase entry on the CSStorePro system using Playwright MCP browser automation.

## Prerequisites

Ensure the Playwright MCP server is available. The MCP tools should include:
- `mcp__playwright__browser_navigate` - Navigate to URLs
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_snapshot` - Get page accessibility snapshot

## Workflow

### 1. Navigate to Grocery Purchase Page

Navigate to the grocery purchase URL:

```
URL: https://secure.cstorepro.com/EmagineNETCOSM/Content/Grocery/GroceryPurchase.aspx
```

Use `mcp__playwright__browser_navigate` with:
- url: `https://secure.cstorepro.com/EmagineNETCOSM/Content/Grocery/GroceryPurchase.aspx`

### 2. Take Page Snapshot

After navigation, use `mcp__playwright__browser_snapshot` to get the accessibility tree of the page. This reveals all interactive elements and their ref IDs.

### 3. Click the Add Purchase Button

The + button to add a new purchase has these identifiers:
- **Element ID:** `AddPurchaseModalID`
- **Modal Title:** "Add Invoices"
- **Location:** Inside the grid header panel (`frmGroceryPurchasesOpForm_enetTable_gridHeader`)

In the snapshot, look for a link element with:
- ID containing "AddPurchaseModal" or "AddPurchase"
- data-ofmodal-title="Add Invoices"

Use `mcp__playwright__browser_click` with the element's ref from the snapshot.

## Example Interaction

```
1. Navigate: mcp__playwright__browser_navigate(url="https://secure.cstorepro.com/EmagineNETCOSM/Content/Grocery/GroceryPurchase.aspx")
2. Snapshot: mcp__playwright__browser_snapshot() - find the AddPurchaseModalID element ref
3. Click: mcp__playwright__browser_click(element="AddPurchaseModalID link", ref="<ref_from_snapshot>")
```

## Notes

- The page may require authentication. If login is needed, the snapshot will show login form elements.
- After clicking the + button, a modal dialog titled "Add Invoices" will appear.
- Take another snapshot after clicking to interact with the invoice form fields.
- Element ref IDs change between page loads, always get a fresh snapshot before clicking.
