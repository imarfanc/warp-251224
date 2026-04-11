(async function extractAmazonOrderData() {
  // Configuration Options
  const saveToFile = false;
  const enableClipboard = true;

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

  var orderData = {
    orderNumber: "",
    orderUrl: "",
    transactionId: "",
    orderDate: "",
    shippingAddress: { name: "", street: "", cityStateZip: "", country: "" },
    paymentMethod: "",
    orderSummary: { subtotal: "", shippingHandling: "", totalBeforeTax: "", tax: "", grandTotal: "" },
    placedBy: "",
    items: []
  };

  // Get order number from URL (most reliable)
  var urlParams = new URLSearchParams(window.location.search);
  orderData.orderNumber = urlParams.get("orderID") || "";
  orderData.orderUrl = window.location.href;

  var bodyText = document.body.innerText;

  // Get order date - find "Order placed" and extract date after it
  var orderPlacedIdx = bodyText.indexOf("Order placed");
  if (orderPlacedIdx > -1) {
    var dateSection = bodyText.substring(orderPlacedIdx + 13, orderPlacedIdx + 50);
    var dateEnd = dateSection.indexOf("  ");
    if (dateEnd > -1) {
      orderData.orderDate = dateSection.substring(0, dateEnd).trim();
    }
  }

  // Get shipping address
  var shipIdx = bodyText.indexOf("Ship to");
  var payIdx = bodyText.indexOf("Payment method");
  if (shipIdx > -1 && payIdx > -1) {
    var addrText = bodyText.substring(shipIdx + 8, payIdx).trim();
    var addrLines = addrText.split("\n").filter(function(l) { return l.trim() !== ""; });
    if (addrLines[0]) orderData.shippingAddress.name = addrLines[0].trim();
    if (addrLines[1]) orderData.shippingAddress.street = addrLines[1].trim();
    if (addrLines[2]) orderData.shippingAddress.cityStateZip = addrLines[2].trim();
    if (addrLines[3]) orderData.shippingAddress.country = addrLines[3].trim();
  }

  // Get payment method
  var viewRelIdx = bodyText.indexOf("View related");
  if (payIdx > -1 && viewRelIdx > -1) {
    var payText = bodyText.substring(payIdx + 15, viewRelIdx).trim();
    var payLines = payText.split("\n").filter(function(l) { return l.trim() !== ""; });
    orderData.paymentMethod = payLines[0] ? payLines[0].trim() : "";
  }

  // Get order summary
  var subtotalIdx = bodyText.indexOf("Item(s) Subtotal:");
  var grandTotalIdx = bodyText.indexOf("Grand Total:");
  if (subtotalIdx > -1 && grandTotalIdx > -1) {
    var summaryText = bodyText.substring(subtotalIdx, grandTotalIdx + 50);
    var summaryLines = summaryText.split("\n").filter(function(l) { return l.trim() !== ""; });
    for (var i = 0; i < summaryLines.length; i++) {
      var line = summaryLines[i].trim();
      var nextLine = summaryLines[i + 1] ? summaryLines[i + 1].trim() : "";
      if (line.indexOf("Item(s) Subtotal") > -1) orderData.orderSummary.subtotal = nextLine;
      if (line.indexOf("Shipping & Handling") > -1) orderData.orderSummary.shippingHandling = nextLine;
      if (line.indexOf("Total before tax") > -1) orderData.orderSummary.totalBeforeTax = nextLine;
      if (line.indexOf("Estimated tax") > -1) orderData.orderSummary.tax = nextLine;
      if (line.indexOf("Grand Total") > -1) orderData.orderSummary.grandTotal = nextLine;
    }
  }

  // Get placed by
  var placedByIdx = bodyText.indexOf("Placed by");
  if (placedByIdx > -1) {
    var placedByText = bodyText.substring(placedByIdx + 10, placedByIdx + 60);
    var placedByLine = placedByText.split("\n")[0];
    orderData.placedBy = placedByLine ? placedByLine.trim() : "";
  }

  // Get items
  var titleLinks = document.querySelectorAll('[href*="ppx_hzod_title"]');
  var imageLinks = document.querySelectorAll('[href*="ppx_hzod_image"]');

  titleLinks.forEach(function(titleLink, index) {
    var item = {
      title: titleLink.innerText.trim(),
      asin: "",
      price: "",
      seller: "",
      imageUrl: "",
      productUrl: ""
    };

    // ASIN from URL
    var hrefParts = titleLink.href.split("/dp/");
    if (hrefParts[1]) {
      item.asin = hrefParts[1].split("?")[0].split("/")[0];
      item.productUrl = "https://www.amazon.com/dp/" + item.asin;
    }

    // Image URL
    if (imageLinks[index]) {
      var img = imageLinks[index].querySelector("img");
      if (img && img.src) {
        item.imageUrl = img.src;
      }
    }

    // Get price and seller from parent container
    var container = titleLink.parentElement;
    for (var j = 0; j < 6; j++) {
      if (container) container = container.parentElement;
    }
    if (container) {
      var containerText = container.innerText;
      
      // Extract seller
      var soldByIdx = containerText.indexOf("Sold by:");
      if (soldByIdx > -1) {
        var sellerText = containerText.substring(soldByIdx + 9);
        var sellerEndIdx = sellerText.indexOf("\n");
        if (sellerEndIdx > -1) {
          item.seller = sellerText.substring(0, sellerEndIdx).trim();
        }
      }
      
      // Extract price (first dollar amount after title)
      var titleIdx = containerText.indexOf(item.title.substring(0, 30));
      if (titleIdx > -1) {
        var afterTitle = containerText.substring(titleIdx);
        var dollarIdx = afterTitle.indexOf("$");
        if (dollarIdx > -1) {
          var priceText = afterTitle.substring(dollarIdx);
          var priceEndIdx = priceText.indexOf("\n");
          if (priceEndIdx > -1) {
            item.price = priceText.substring(0, priceEndIdx).trim();
          }
        }
      }
    }

    orderData.items.push(item);
  });

  // Output and download
  console.log("Extracted Order Data:");
  var jsonStr = JSON.stringify(orderData, null, 2);
  console.log(jsonStr);

  if (saveToFile) {
    var blob = new Blob([jsonStr], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "amazon-order-" + (orderData.orderNumber || "data") + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (enableClipboard) {
    const copied = await copyToClipboard(jsonStr);
    if (copied.ok) {
      console.log(`✅ Result copied to clipboard! (${copied.method})`);
    } else if (copied.method === 'pending-user-gesture') {
      console.warn('📋 Clipboard copy is blocked until a user gesture.');
      console.warn('👉 Click anywhere on the page (or press any key) and it will copy automatically.');
    } else {
      console.warn('📋 Failed to copy to clipboard. Please copy manually from the console.');
    }
  }

  return orderData;
})();
