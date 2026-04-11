// Manual extraction script for Amazon Order Details
// Navigate to: https://www.amazon.com/gp/your-account/order-details?orderID=111-8254493-5225818
// Then paste and run this script in the browser console

(async function extractAmazonOrderData() {
  var orderData = {
    orderNumber: "111-8254493-5225818",
    orderUrl: window.location.href,
    transactionId: "320252760413695951", // Provided in query
    orderDate: "",
    shippingAddress: { name: "", street: "", cityStateZip: "", country: "" },
    paymentMethod: "",
    orderSummary: { subtotal: "", shippingHandling: "", totalBeforeTax: "", tax: "", grandTotal: "" },
    placedBy: "",
    items: []
  };

  var bodyText = document.body.innerText;

  var orderPlacedIdx = bodyText.indexOf("Order placed");
  if (orderPlacedIdx > -1) {
    var dateSection = bodyText.substring(orderPlacedIdx + 13, orderPlacedIdx + 50);
    var dateEnd = dateSection.indexOf("  ");
    if (dateEnd > -1) {
      orderData.orderDate = dateSection.substring(0, dateEnd).trim();
    }
  }

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

  var viewRelIdx = bodyText.indexOf("View related");
  if (payIdx > -1 && viewRelIdx > -1) {
    var payText = bodyText.substring(payIdx + 15, viewRelIdx).trim();
    var payLines = payText.split("\n").filter(function(l) { return l.trim() !== ""; });
    orderData.paymentMethod = payLines[0] ? payLines[0].trim() : "";
  }

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

  var placedByIdx = bodyText.indexOf("Placed by");
  if (placedByIdx > -1) {
    var placedByText = bodyText.substring(placedByIdx + 10, placedByIdx + 60);
    var placedByLine = placedByText.split("\n")[0];
    orderData.placedBy = placedByLine ? placedByLine.trim() : "";
  }

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

    var hrefParts = titleLink.href.split("/dp/");
    if (hrefParts[1]) {
      item.asin = hrefParts[1].split("?")[0].split("/")[0];
      item.productUrl = "https://www.amazon.com/dp/" + item.asin;
    }

    if (imageLinks[index]) {
      var img = imageLinks[index].querySelector("img");
      if (img && img.src) {
        item.imageUrl = img.src;
      }
    }

    var container = titleLink.parentElement;
    for (var j = 0; j < 6; j++) {
      if (container) container = container.parentElement;
    }
    if (container) {
      var containerText = container.innerText;
      var soldByIdx = containerText.indexOf("Sold by:");
      if (soldByIdx > -1) {
        var sellerText = containerText.substring(soldByIdx + 9);
        var sellerEndIdx = sellerText.indexOf("\n");
        if (sellerEndIdx > -1) {
          item.seller = sellerText.substring(0, sellerEndIdx).trim();
        }
      }
      
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

  var jsonResult = JSON.stringify(orderData, null, 2);
  console.log(jsonResult);
  
  // Try to copy to clipboard
  try {
    await navigator.clipboard.writeText(jsonResult);
    console.log("✅ Result copied to clipboard!");
  } catch (e) {
    console.log("📋 Please copy the JSON from the console output above");
  }
  
  return orderData;
})();
