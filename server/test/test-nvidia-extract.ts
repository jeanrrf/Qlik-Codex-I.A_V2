
import { extractContent } from "../src/lib/llmProviders/nvidiaProvider";
import { expect } from "chai";

// Mock types since we can't easily import them if they are not exported or if we are running ts-node
// But we can just test the function behavior.

console.log("Testing extractContent...");

const testCases = [
  {
    name: "Single string",
    input: "Hello World",
    expected: "Hello World"
  },
  {
    name: "Array of strings (lines)",
    input: ["Line 1", "Line 2"],
    expected: "Line 1\nLine 2"
  },
  {
    name: "Array of objects with text",
    input: [{ text: "Part 1" }, { text: "Part 2" }],
    expected: "Part 1\nPart 2"
  },
  {
    name: "Mixed content",
    input: ["Start", { text: "Middle" }, "End"],
    expected: "Start\nMiddle\nEnd"
  }
];

let passed = 0;
let failed = 0;

testCases.forEach(tc => {
  try {
    const result = extractContent(tc.input as any);
    if (result === tc.expected) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.log(`[FAIL] ${tc.name}`);
      console.log(`  Expected: ${JSON.stringify(tc.expected)}`);
      console.log(`  Actual:   ${JSON.stringify(result)}`);
      failed++;
    }
  } catch (e) {
    console.log(`[ERROR] ${tc.name}: ${e}`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);

if (failed > 0) process.exit(1);
