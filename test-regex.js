
const code = `
LOAD * 
WHERE Value < 100;
WHERE Value<10;

// This is a comment
LOAD * 
WHERE Value > 50;

<span class="syntax-keyword">SET</span> vVar = 1;
`;

// Refined regex: Tag name must start with a letter
const refinedClean = code.replace(/<\/?\s*[a-zA-Z][^>]*>/g, '[REMOVED]');

console.log("Original:");
console.log(code);
console.log("----------------");
console.log("Refined Clean:");
console.log(refinedClean);