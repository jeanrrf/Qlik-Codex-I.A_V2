
import { config } from "dotenv";
config();
import { nvidiaProvider } from "./src/lib/llmProviders/nvidiaProvider";

async function test() {
  console.log('Testing NVIDIA Provider...');
  try {
    const result = await nvidiaProvider.generateStructuredJson(
      'Responda com um JSON: {"status": "ok"}',
      { model: 'meta/llama-3.1-70b-instruct' }
    );
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
