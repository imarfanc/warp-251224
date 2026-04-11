// American Express Transaction Extractor
// Paste this script into your browser console on the AmEx Activity page

(function() {
    console.log('🔍 Extracting American Express transactions...');
    
    // Find the transactions table
    const table = document.querySelector('[role="table"]');
    
    if (!table) {
      console.error('❌ Could not find transactions table. Make sure you are on the Activity page.');
      return;
    }
    
    const transactions = [];
    
    // Get all checkbox inputs (each transaction has a checkbox with the transaction ID)
    const checkboxes = table.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
      // Skip the "Select All" checkbox
      if (checkbox.parentElement.textContent.includes('Select All')) {
        return;
      }
      
      // Get the transaction row container
      const row = checkbox.closest('[role="row"]') || checkbox.parentElement.parentElement.parentElement;
      
      if (!row) return;
      
      // Extract transaction ID from checkbox value
      const transactionId = checkbox.value;
      
      // Get all generic elements in the row to extract data
      const generics = Array.from(row.querySelectorAll('[role="generic"]'));
      
      // Extract date (format: "Oct 24", "Oct 23", etc.)
      const dateElement = generics.find(el => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/.test(el.textContent.trim()));
      const date = dateElement ? dateElement.textContent.trim() : null;
      
      // Extract status (5X Points, Credit, etc.)
      const statusElement = generics.find(el => {
        const text = el.textContent.trim();
        return text.includes('Points') || text === 'Credit';
      });
      const status = statusElement ? statusElement.textContent.trim() : null;
      
      // Extract description (merchant name)
      const descriptionElement = generics.find(el => {
        const text = el.textContent.trim();
        return text.length > 10 && 
               !text.includes('Points') && 
               text !== 'Credit' &&
               !text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/) &&
               !text.match(/^[-$]?\d+\.\d{2}$/) &&
               !['arfan', 'tosifa', 'employee'].includes(text);
      });
      const description = descriptionElement ? descriptionElement.textContent.trim() : null;
      
      // Extract amount (format: "$123.45" or "-$123.45")
      const amountElement = generics.find(el => {
        const text = el.textContent.trim();
        return /^[-]?\$\d+\.\d{2}$/.test(text);
      });
      const amountText = amountElement ? amountElement.textContent.trim() : null;
      const amount = amountText ? parseFloat(amountText.replace(/[$,]/g, '')) : null;
      
      // Extract tag (arfan, tosifa, employee, etc.) - might not exist for all transactions
      const tagElement = generics.find(el => {
        const text = el.textContent.trim();
        return ['arfan', 'tosifa', 'employee'].includes(text);
      });
      const tag = tagElement ? tagElement.textContent.trim() : null;
      
      // Only add transaction if we have the essential data
      if (transactionId && date && description && amount !== null) {
        transactions.push({
          transactionId,
          date,
          status,
          description,
          tag,
          amount
        });
      }
    });
    
    console.log(`✅ Extracted ${transactions.length} transactions`);
    
    // Calculate summary statistics
    const totalCharges = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalCredits = Math.abs(transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));
    
    console.log(`💰 Total Charges: $${totalCharges.toFixed(2)}`);
    console.log(`💳 Total Credits: $${totalCredits.toFixed(2)}`);
    console.log(`📊 Net Amount: $${(totalCharges - totalCredits).toFixed(2)}`);
    
    // Pretty print the JSON
    console.log('\n📄 Transaction Data (JSON):');
    console.log(JSON.stringify(transactions, null, 2));
    
    // Create downloadable JSON file
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `amex_transactions_${new Date().toISOString().split('T')[0]}.json`;
    
    console.log('\n💾 To download as JSON file, run: downloadTransactions()');
    
    // Expose functions to global scope
    window.extractedTransactions = transactions;
    window.downloadTransactions = function() {
      link.click();
      console.log('✅ Download started!');
    };
    
    return transactions;
  })();