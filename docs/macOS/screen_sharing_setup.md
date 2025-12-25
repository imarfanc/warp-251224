# macOS Screen Sharing Instructions

To find the IP address required to connect to this machine via Screen Sharing:

1. **Open Terminal.**
2. **Run the following command** to get the VNC connection string:
   ```bash
   ifconfig | awk '/inet / && !/127.0.0.1/ {print "vnc://" $2}'
   ```
3. **Connect** using the outputted VNC protocol address by entering it into the "Connect to Server" dialog (Cmd+K in Finder) or the Screen Sharing app.

# ifconfig tool help

2. **Run the following command** to find the active IP address (usually on `en1` for Wi-Fi or `en0` for Ethernet):
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
