const net = require('net');
const os = require('os');

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal &&
        !iface.address.startsWith('100.') &&
        !iface.address.startsWith('172.')
      ) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const server = net.createServer((clientSocket) => {
  const targetSocket = net.connect(54321, '127.0.0.1');
  clientSocket.pipe(targetSocket);
  targetSocket.pipe(clientSocket);

  clientSocket.on('error', () => targetSocket.destroy());
  targetSocket.on('error', () => clientSocket.destroy());
});

server.listen(54321, '0.0.0.0', () => {
  const lanIp = getLanIp();
  console.log(`[Supabase Wi-Fi Proxy] Running on 0.0.0.0:54321 -> 127.0.0.1:54321`);
  console.log(`[Supabase Wi-Fi Proxy] Phone Supabase URL: http://${lanIp}:54321`);
});
