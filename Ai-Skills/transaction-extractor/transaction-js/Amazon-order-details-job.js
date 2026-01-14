/**
 * Amazon Order Details Job
 * 
 * This script is designed to be run via Playwright or directly in the browser console.
 * It can extract order details from Amazon or transaction info from Amex.
 */

/**
 * Extracts order details from an Amazon Order Details page.
 * Works both in Playwright (via page object) and in-browser console.
 */
async function extractAmazonOrder(pageOrDoc, orderUrl) {
    const isBrowser = !pageOrDoc || typeof pageOrDoc.goto !== 'function';
    const page = isBrowser ? null : pageOrDoc;
    const doc = isBrowser ? document : null;

    if (page) {
        console.log(`Navigating to Amazon Order: ${orderUrl}`);
        await page.goto(orderUrl, { waitUntil: 'networkidle' });

        if (page.url().includes('signin')) {
            console.error('❌ Login required. Please log in manually in the browser.');
            return null;
        }
    }

    const evaluation = async () => {
        const url = new URL(window.location.href);
        const orderID = url.searchParams.get('orderID');
        const cleanedLink = orderID ? `${url.origin}${url.pathname}?orderID=${orderID}` : url.href;

        const result = {
            orderNumber: "",
            orderDate: "",
            items: [],
            receiptId: "",
            orderLink: cleanedLink
        };

        const bodyText = document.body.innerText;
        
        // 1. Extract Order Number
        const orderNumMatch = bodyText.match(/Order #\s*([\d-]+)/);
        if (orderNumMatch) result.orderNumber = orderNumMatch[1];

        // 2. Extract Order Date
        const dateMatch = bodyText.match(/Order placed ([\w\s,]+)/);
        if (dateMatch) result.orderDate = dateMatch[1].trim();

        // 3. Extract Items
        const blocks = document.querySelectorAll('.a-fixed-left-grid-inner');
        blocks.forEach(block => {
            const nameLink = block.querySelector('.a-col-right a.a-link-normal');
            if (!nameLink) return;
            const name = nameLink.innerText.trim();
            if (name.includes('review') || name.includes('Archive') || name.includes('Return')) return;

            const priceElem = block.querySelector('.a-col-right .a-price span[aria-hidden="true"]') || 
                            block.querySelector('.a-col-right .a-color-price');
            const amount = priceElem ? priceElem.innerText.trim() : "";
            
            const qtyElem = block.querySelector('.od-item-view-qty span');
            let qty = 1;
            if (qtyElem) qty = parseInt(qtyElem.innerText.trim());
            else {
                const qtyMatch = block.innerText.match(/^(\d+)/) || block.innerText.match(/(\d+)\s+of/);
                if (qtyMatch) qty = parseInt(qtyMatch[1]);
            }

            result.items.push({ name, amount, qty });
        });

        return result;
    };

    let orderDetails;
    if (page) {
        orderDetails = await page.evaluate(evaluation);
    } else {
        orderDetails = await evaluation();
    }

    // 4. Try to find "Receipt ID" or "Reference ID" from Invoice
    if (page) {
        try {
            const invoiceLink = page.locator('a:has-text("Invoice"), a:has-text("View or Print invoice")').first();
            if (await invoiceLink.count() > 0) {
                const invoiceUrl = await invoiceLink.getAttribute('href');
                if (invoiceUrl) {
                    const fullInvoiceUrl = invoiceUrl.startsWith('http') ? invoiceUrl : `https://www.amazon.com${invoiceUrl}`;
                    console.log(`Found Invoice Link: ${fullInvoiceUrl}`);
                    
                    const invoicePage = await page.context().newPage();
                    await invoicePage.goto(fullInvoiceUrl, { waitUntil: 'networkidle' });
                    
                    const refId = await invoicePage.evaluate(() => {
                        const text = document.body.innerText;
                        const patterns = [
                            /Reference ID:\s*(\d{15,18})/i,
                            /Merchant Order ID:\s*(\d{15,18})/i,
                            /Transaction ID:\s*(\d{15,18})/i,
                            /Reference ID:\s*(\d+)/i
                        ];
                        for (const pattern of patterns) {
                            const match = text.match(pattern);
                            if (match) return match[1];
                        }
                        return "";
                    });
                    
                    orderDetails.receiptId = refId;
                    await invoicePage.close();
                }
            }
        } catch (e) {
            console.warn('Could not extract Receipt ID from invoice:', e.message);
        }
    }

    return orderDetails;
}

/**
 * Extracts transaction data and Amazon order link from the Amex Activity page.
 */
async function extractAmexData() {
    console.log('🔍 Extracting Amex transaction details...');
    const url = new URL(window.location.href);
    const transactionId = url.searchParams.get('transactionId');
    
    // Find Amazon order link (Show Digital Receipt)
    const digitalReceiptAnchor = document.querySelector('#digitalReceiptAnchor') || 
                               Array.from(document.querySelectorAll('a')).find(a => a.href.includes('amazon.com') && a.innerText.includes('Receipt'));
    
    const orderLink = digitalReceiptAnchor ? digitalReceiptAnchor.href : null;
    
    const result = {
        transactionId,
        orderLink,
        pageUrl: window.location.href
    };
    
    console.log('✅ Amex Data Extracted:', result);
    return result;
}

async function copyToClipboard(text) {
    // Strategy 1: modern async clipboard API
    try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(text);
            return { ok: true, method: 'navigator.clipboard.writeText' };
        }
    } catch (e) {
        // continue to fallback strategies
    }

    // Strategy 2: legacy execCommand('copy') fallback
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);

        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);

        const ok = document.execCommand('copy');
        document.body.removeChild(ta);

        if (ok) return { ok: true, method: "document.execCommand('copy')" };
    } catch (e) {
        // continue to gesture retry
    }

    // Strategy 3: permissions/user-gesture required. Save pending text and retry on user action.
    try {
        window.__txExtractorClipboardPending = text;
        const handler = async () => {
            try {
                const pending = window.__txExtractorClipboardPending;
                if (!pending) return;
                const res = await copyToClipboard(pending);
                if (res.ok) {
                    console.log(`✅ Result copied to clipboard! (${res.method})`);
                    window.__txExtractorClipboardPending = null;
                }
            } finally {
                window.removeEventListener('click', handler, true);
                window.removeEventListener('keydown', handler, true);
            }
        };
        window.addEventListener('click', handler, { once: true, capture: true });
        window.addEventListener('keydown', handler, { once: true, capture: true });
        return { ok: false, method: 'pending-user-gesture' };
    } catch (e) {
        return { ok: false, method: 'failed' };
    }
}

/**
 * Main entry point for browser console.
 */
async function runInBrowser() {
    let result;
    const url = window.location.href;
    
    if (url.includes('americanexpress.com/activity')) {
        result = await extractAmexData();
    } else if (url.includes('amazon.com') && url.includes('order-details')) {
        result = await extractAmazonOrder();
    } else {
        console.error('❌ Unsupported page. Please run on an Amex Activity or Amazon Order Details page.');
        return;
    }
    
    if (result) {
        const output = JSON.stringify(result, null, 2);
        console.log('📋 Result:', output);
        const copied = await copyToClipboard(output);
        if (copied.ok) {
            console.log(`✅ Result copied to clipboard! (${copied.method})`);
        } else if (copied.method === 'pending-user-gesture') {
            console.warn('📋 Clipboard copy is blocked until a user gesture.');
            console.warn('👉 Click anywhere on the page (or press any key) and it will copy automatically.');
        } else {
            console.warn('📋 Failed to copy to clipboard. Please copy manually from the console.');
        }
    }
}

// Browser console auto-run
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    runInBrowser().catch(console.error);
}

// Node.js / Playwright exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { extractAmazonOrder, extractAmexData };
}
