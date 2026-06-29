import { config } from 'dotenv';
config({ path: '.env.local' });
import { invokeLLM } from '../src/lib/utils/llm';

async function run() {
  try {
    console.log('Invoking LLM...');
    const start = Date.now();
    const res = await invokeLLM('Say the word SUCCESS and nothing else.');
    console.log('Response:', res);
    console.log('Time taken:', Date.now() - start, 'ms');
  } catch(e) {
    console.error('Error:', e);
  }
}
run();
