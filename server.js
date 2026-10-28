import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const [{ default: app }, { default: connectDB }] = await Promise.all([
  import('./app.js'),
  import('./config/database.js')
]);

const port = Number(process.env.PORT) || 5001;

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'replace_this_with_a_long_random_secret') {
    throw new Error('Set JWT_SECRET to a random value with at least 32 characters in adminBackend/.env.');
  }

  await connectDB();
  app.listen(port, () => {
    console.log(`Admin backend listening on port ${port}.`);
  });
} catch (error) {
  console.error(`Admin backend could not start: ${error.message}`);
  process.exit(1);
}
