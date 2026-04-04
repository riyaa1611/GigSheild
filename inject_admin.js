const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
require('dotenv').config({ path: './backend/.env' });

const redisClient = new Redis('redis://localhost:6379'); // since we run this outside docker, map port or connect natively. Wait, is redis exposed on localhost? Yes, docker-compose exposes 6379 natively.

async function injectAdmin() {
  const token = jwt.sign({ userId: 'admin_test', role: 'admin' }, process.env.JWT_SECRET || 'fallback-secret-for-dev');
  await redisClient.set('session:admin_test', JSON.stringify({ token, last_seen: Date.now() }), 'EX', 7 * 24 * 60 * 60);
  console.log("Admin session injected directly into Redis!");
  console.log("TOKEN:", token);
  process.exit(0);
}

injectAdmin().catch(e => {
  console.error(e);
  process.exit(1);
});
