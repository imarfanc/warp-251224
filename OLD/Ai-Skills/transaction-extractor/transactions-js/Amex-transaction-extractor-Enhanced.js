// American Express Transaction Extractor - Enhanced Version
// Paste this script into your browser console on the AmEx Activity page
// This version includes multiple extraction methods and better error handling

(async function() {
  // Configuration
  const CONFIG = {
    fetchOrderLinks: false, // Set to true to automatically expand rows and fetch Amazon order links
    autoCopyToClipboard: true // Set to true to automatically copy results to clipboard when finished
  };

  console.log('🔍 Starting American Express Transaction Extraction...');
  
  const extractTransactions = () => {
    const transactions = [];
    
    // Method 1: Try to find transaction rows by structure
    const tryMethod1 = () => {
      console.log('Trying Method 1: Direct row extraction...');
      
      // Find all checkboxes that aren't "Select All"
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .filter(cb => cb.value && cb.value.length > 10 && !cb.value.includes('Select'));
      
      console.log(`Found ${checkboxes.length} transaction checkboxes`);
      
      checkboxes.forEach(checkbox => {
        try {
          // Navigate up to find the row container
          let row = checkbox;
          for (let i = 0; i < 10; i++) {
            row = row.parentElement;
            if (!row) break;
            
            // Check if this looks like a transaction row
            const text = row.textContent;
            if (text.includes('$') && /Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep/.test(text)) {
              break;
            }
          }
          
          if (!row) return;
          
          const rowText = row.textContent;
          const transactionId = checkbox.value;
          
          // Extract date
          const dateMatch = rowText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/);
          const date = dateMatch ? dateMatch[0] : null;
          
          // Extract amount (look for patterns like $123.45 or -$123.45)
          const amountMatch = rowText.match(/(-?\$[\d,]+\.\d{2})/);
          const amount = amountMatch ? parseFloat(amountMatch[0].replace(/[$,]/g, '')) : null;
          
          // Extract status
          const status = rowText.includes('Credit') ? 'Credit' : 
                        rowText.match(/\d+X Points/) ? rowText.match(/\d+X Points/)[0] : null;
          
          // Extract description - text between status and amount
          const parts = rowText.split(/\$[\d,]+\.\d{2}/)[0];
          const descParts = parts.split(status || date);
          const description = descParts[descParts.length - 1]
            ?.replace(/Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep/g, '')
            ?.replace(/\d{1,2}/g, '')
            ?.replace(/Credit/g, '')
            ?.replace(/Points/g, '')
            ?.replace(/X/g, '')
            ?.trim();
          
          // Extract tag if present
          const tagMatch = rowText.match(/\b(arfan|tosifa|employee)\b/i);
          const tag = tagMatch ? tagMatch[0] : null;
          
          if (transactionId && date && amount !== null) {
            transactions.push({
              transactionId,
              date,
              status,
              description,
              tag,
              amount
            });
          }
        } catch (e) {
          console.warn('Error processing transaction:', e);
        }
      });
      
      return transactions;
    };
    
    // Method 2: Try table-based extraction
    const tryMethod2 = () => {
      console.log('Trying Method 2: Table-based extraction...');
      
      const table = document.querySelector('[role="table"]');
      if (!table) {
        console.log('No table found');
        return [];
      }
      
      const rows = table.querySelectorAll('[role="row"]');
      const extracted = [];
      
      rows.forEach(row => {
        try {
          const checkbox = row.querySelector('input[type="checkbox"]');
          if (!checkbox || !checkbox.value || checkbox.value.includes('Select')) return;
          
          const cells = Array.from(row.querySelectorAll('[role="gridcell"], [role="generic"]'));
          const text = row.textContent;
          
          // Find date
          const dateCell = cells.find(c => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/.test(c.textContent.trim()));
          
          // Find amount
          const amountCell = cells.find(c => /^[-]?\$[\d,]+\.\d{2}$/.test(c.textContent.trim()));
          
          if (dateCell && amountCell) {
            extracted.push({
              transactionId: checkbox.value,
              date: dateCell.textContent.trim(),
              status: text.includes('Credit') ? 'Credit' : (text.match(/\d+X Points/)?.[0] || null),
              description: text.split(dateCell.textContent)[1]?.split(amountCell.textContent)[0]?.trim() || null,
              tag: text.match(/\b(arfan|tosifa|employee)\b/i)?.[0] || null,
              amount: parseFloat(amountCell.textContent.replace(/[$,]/g, ''))
            });
          }
        } catch (e) {
          console.warn('Error in method 2:', e);
        }
      });
      
      return extracted;
    };

    // Method 3: Try test-id based extraction
    const tryMethod3 = () => {
      console.log('Trying Method 3: Test-id based extraction...');
      const rows = Array.from(document.querySelectorAll('[data-testid="transaction-table-row"]'));
      console.log(`Found ${rows.length} transaction rows via test-id`);
      
      return rows.map(row => {
        try {
          const transactionId = row.id;
          const text = row.innerText;
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          
          // Extract date
          const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/);
          
          // Extract amount
          const amountMatch = text.match(/(-?\$[\d,]+\.\d{2})/);
          const amount = amountMatch ? parseFloat(amountMatch[0].replace(/[$,]/g, '')) : null;
          
          // Extract description - look for the main text line that isn't date or amount or ID
          const description = lines.find(l => 
            l.length > 5 && 
            !l.includes('$') && 
            !/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(l) &&
            l !== transactionId
          ) || lines[3];
          
          return {
            transactionId,
            date: dateMatch ? dateMatch[0] : null,
            amount,
            description: description?.trim(),
            status: lines.find(l => l.includes('Points') || l.includes('Credit')) || null,
            tag: text.match(/\b(arfan|tosifa|employee)\b/i)?.[0] || null
          };
        } catch (e) {
          return null;
        }
      }).filter(t => t && t.transactionId && t.amount !== null);
    };
    
    // Try extraction methods
    let results = tryMethod3();
    
    if (results.length === 0) {
      console.log('Method 3 failed, trying Method 1...');
      results = tryMethod1();
    }
    
    if (results.length === 0) {
      console.log('Method 1 failed, trying Method 2...');
      results = tryMethod2();
    }
    
    return results;
  };

  const fetchOrderLinks = async (transactions) => {
    console.log('\n🔗 Starting deep extraction of Amazon order links...');
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Filter for potential Amazon transactions
    const amazonTransactions = transactions.filter(t => 
      t.description && t.description.toLowerCase().includes('amazon')
    );
    
    console.log(`Found ${amazonTransactions.length} potential Amazon transactions to check`);
    
    for (let i = 0; i < amazonTransactions.length; i++) {
      const t = amazonTransactions[i];
      try {
        const row = document.getElementById(t.transactionId);
        if (row) {
          console.log(`   [${i + 1}/${amazonTransactions.length}] Checking: ${t.description}`);
          
          // Click to expand
          row.click();
          await sleep(2000); // Wait for expansion and receipt link
          
          const anchor = document.getElementById('digitalReceiptAnchor');
          if (anchor) {
            t.orderLink = anchor.href;
            console.log(`      ✅ Found link: ${t.orderLink}`);
          } else {
            console.log(`      ⚠️ No digital receipt link found`);
          }
          
          // Click again to collapse (optional, but keeps view clean)
          row.click();
          await sleep(500);
        } else {
          console.warn(`      ⚠️ Could not find DOM element for ${t.transactionId}`);
        }
      } catch (e) {
        console.warn(`      ❌ Error checking ${t.transactionId}:`, e);
      }
    }
    console.log('✅ Finished order link extraction\n');
  };
  
  // Execute extraction
  const transactions = extractTransactions();
  
  if (transactions.length === 0) {
    console.error('❌ Could not extract any transactions. Please make sure:');
    console.error('   1. You are on the American Express Activity page');
    console.error('   2. Transactions are loaded and visible');
    console.error('   3. You are logged in to your account');
    return;
  }

  // Fetch order links for Amazon transactions if enabled
  if (CONFIG.fetchOrderLinks) {
    await fetchOrderLinks(transactions);
  } else {
    console.log('ℹ️ Skipping deep extraction of order links (disabled in CONFIG)');
  }
  
  console.log(`✅ Successfully extracted ${transactions.length} transactions!`);
  
  // Calculate statistics
  const charges = transactions.filter(t => t.amount > 0);
  const credits = transactions.filter(t => t.amount < 0);
  const totalCharges = charges.reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = Math.abs(credits.reduce((sum, t) => sum + t.amount, 0));
  
  console.log('\n📊 Summary:');
  console.log(`   💰 Total Charges: $${totalCharges.toFixed(2)} (${charges.length} transactions)`);
  console.log(`   💳 Total Credits: $${totalCredits.toFixed(2)} (${credits.length} transactions)`);
  console.log(`   📈 Net Amount: $${(totalCharges - totalCredits).toFixed(2)}`);
  
  // Group by merchant
  const byMerchant = {};
  transactions.forEach(t => {
    if (t.amount > 0) { // Only count charges
      const merchant = t.description || 'Unknown';
      byMerchant[merchant] = (byMerchant[merchant] || 0) + t.amount;
    }
  });
  
  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (topMerchants.length > 0) {
    console.log('\n🏪 Top 5 Merchants:');
    topMerchants.forEach(([merchant, amount], i) => {
      console.log(`   ${i + 1}. ${merchant.substring(0, 40)}: $${amount.toFixed(2)}`);
    });
  }
  
  // Display JSON
  console.log('\n📄 Transaction Data:');
  console.log(JSON.stringify(transactions, null, 2));
  
  // Create download function
  window.amexTransactions = transactions;
  
  window.downloadAmexTransactions = function(filename) {
    const fname = filename || `amex_transactions_${new Date().toISOString().split('T')[0]}.json`;
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fname;
    link.click();
    URL.revokeObjectURL(url);
    console.log(`✅ Downloaded: ${fname}`);
  };
  
  window.copyAmexTransactions = function() {
    const dataStr = JSON.stringify(transactions, null, 2);
    navigator.clipboard.writeText(dataStr).then(() => {
      console.log('✅ Transactions copied to clipboard!');
      // Cleanup fallback if it was used
      if (window._amexCopyFallback) {
        window.removeEventListener('click', window._amexCopyFallback);
        window._amexCopyFallback = null;
      }
    }).catch(err => {
      if (err.name === 'NotAllowedError') {
        console.warn('📋 Clipboard copy failed because the page isn\'t focused.');
        console.warn('👉 CLICK anywhere on the Amex page, and it will copy automatically!');
        
        // Setup a one-time click listener to retry
        if (!window._amexCopyFallback) {
          window._amexCopyFallback = function() {
            window.copyAmexTransactions();
          };
          window.addEventListener('click', window._amexCopyFallback, { once: true });
        }
      } else {
        console.error('❌ Failed to copy:', err);
      }
    });
  };

  // Automatically copy to clipboard if enabled
  if (CONFIG.autoCopyToClipboard) {
    window.copyAmexTransactions();
  }
  
  console.log('\n💡 Available commands:');
  console.log('   downloadAmexTransactions()     - Download as JSON file');
  console.log('   copyAmexTransactions()         - Copy to clipboard');
  console.log('   amexTransactions              - Access the data');
  
  return transactions;
})();