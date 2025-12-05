
const textMinified = '{"script": "Line 1\\nLine 2"}';
const textPretty = '{\n  "script": "Line 1\\nLine 2"\n}';

function fix(content) {
    const trimmed = content.trim();
    // Fix: Se o texto vier "encavalado" com literais \n mas sem quebras reais
    if (trimmed.length > 10 && !trimmed.includes('\n') && trimmed.includes('\\n')) {
      console.log("Fix triggered!");
      return trimmed.replace(/\\n/g, '\n');
    }
    console.log("Fix skipped.");
    return trimmed;
}

console.log("--- Minified ---");
const fixedMinified = fix(textMinified);
console.log("Result:", fixedMinified);
try {
    JSON.parse(fixedMinified);
    console.log("JSON Parse: Success");
} catch (e) {
    console.log("JSON Parse: Failed", e.message);
}

console.log("\n--- Pretty ---");
const fixedPretty = fix(textPretty);
console.log("Result:", fixedPretty);
try {
    JSON.parse(fixedPretty);
    console.log("JSON Parse: Success");
} catch (e) {
    console.log("JSON Parse: Failed", e.message);
}
