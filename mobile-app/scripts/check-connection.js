/**
 * Prints your PC's LAN IP and instructions so your phone can reach Metro.
 * Run this to fix "request timed out" when the phone can't connect.
 *
 * Usage: node scripts/check-connection.js
 */

const os = require('os');

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const addr = iface.address;
        if (addr.startsWith('192.168.') || addr.startsWith('10.') || addr.startsWith('172.')) {
          return addr;
        }
      }
    }
  }
  return null;
}

const ip = getLocalIP();
const port = 8081;
if (!ip) {
  console.log('Could not detect a LAN IP (192.168.x.x, 10.x.x.x). Are you on WiFi?');
  process.exit(1);
}

console.log('');
console.log('--- Phone connection setup ---');
console.log('Your PC\'s LAN IP:', ip);
console.log('');
console.log('1) Set the packager hostname (use this IP in Expo):');
console.log('   PowerShell:  $env:REACT_NATIVE_PACKAGER_HOSTNAME = "' + ip + '"');
console.log('   Then start Expo in the SAME terminal:  npx expo start');
console.log('');
console.log('2) Allow Node through Windows Firewall (if needed):');
console.log('   Windows Security → Firewall → Allow an app → Node.js: allow Private networks.');
console.log('   Or run:  netsh advfirewall firewall add rule name="Node Metro" dir=in action=allow program="' + process.execPath + '"');
console.log('');
console.log('3) On your iPhone, open Safari and go to:');
console.log('   http://' + ip + ':' + port);
console.log('   If the page loads, your phone can reach Metro. Then scan the Expo QR code.');
console.log('   If it does not load, fix the firewall or use:  npx expo start --tunnel');
console.log('');
