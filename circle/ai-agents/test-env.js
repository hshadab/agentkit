import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

console.log('Environment test:');
console.log('PRIVATE_KEY exists:', !!process.env.PRIVATE_KEY);
console.log('GATEWAY_PRIVATE_KEY exists:', !!process.env.GATEWAY_PRIVATE_KEY);
console.log('CIRCLE_API_KEY exists:', !!process.env.CIRCLE_API_KEY);
console.log('All KEY env vars:', Object.keys(process.env).filter(k => k.includes('KEY')).join(', '));