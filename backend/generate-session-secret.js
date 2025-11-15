// Script to generate a secure SESSION_SECRET
// Run with: node generate-session-secret.js

const crypto = require('crypto');

const sessionSecret = crypto.randomBytes(64).toString('hex');

console.log('\n✅ Generated SESSION_SECRET:');
console.log(sessionSecret);
console.log('\n📝 Add this to your .env file:');
console.log(`SESSION_SECRET=${sessionSecret}\n`);

