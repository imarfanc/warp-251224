---
name: clean_amazon_order_links
overview: Create a shell script to remove the `&ref_=yt_ti_v` query parameter from order links in the specified JSON file.
todos:
  - id: create-script
    content: Create clean_links.sh script
    status: completed
  - id: make-executable
    content: Make the script executable
    status: completed
  - id: run-script
    content: Run the script to clean transactions-oct.json
    status: completed
isProject: false
---

1.  Create a shell script named `clean_links.sh` in the workspace root.
2.  The script will target `transactions/25.oct/transactions-oct.json` by default.
3.  The script will use `sed` for in-place replacement of the `&ref_=yt_ti_v` string.
4.  The script will handle both macOS and Linux `sed` differences.
5.  Make the script executable.
6.  Run the script to clean the file.