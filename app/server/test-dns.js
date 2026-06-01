const dns = require('dns');
const host = '_mongodb._tcp.studix.jttjqci.mongodb.net';

console.log(`Testing SRV lookup for: ${host}`);

dns.resolveSrv(host, (err, addresses) => {
  if (err) {
    console.error('❌ SRV Lookup Failed:', err);
    if (err.code === 'ENOTFOUND') {
      console.log('💡 TIP: The domain was not found. Check your cluster name.');
    } else if (err.code === 'ECONNREFUSED' || err.code === 'EREFUSED') {
      console.log('💡 TIP: DNS connection refused. Your network or DNS server might be blocking SRV records.');
    }
  } else {
    console.log('✅ SRV Lookup Success:', addresses);
  }
});

const standardHost = 'studix.jttjqci.mongodb.net';
console.log(`Testing A record lookup for: ${standardHost}`);
dns.resolve4(standardHost, (err, addresses) => {
  if (err) {
    console.error('❌ A record Lookup Failed:', err);
  } else {
    console.log('✅ A record Lookup Success:', addresses);
  }
});
