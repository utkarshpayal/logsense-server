import 'dotenv/config';
import { ollamaClient } from '../src/modules/ai/ollama.client';

async function test() {
  const context = 'The user logged in successfully at 10:00 AM. '.repeat(150); // ~1,200 tokens
  const prompt = `Summarize this context:\n${context}`;
  
  console.log(`Sending prompt of length ${prompt.length}...`);
  const t0 = Date.now();
  try {
    const res = await ollamaClient.generate(prompt, false, { temperature: 0.1, num_predict: 200 });
    console.log('Result:', res.text);
    console.log(`Success! Time taken: ${(Date.now() - t0)/1000}s`);
  } catch (err: any) {
    console.error('Failed:', err.message);
    console.log(`Failed after: ${(Date.now() - t0)/1000}s`);
  }
}
test().catch(console.error);
