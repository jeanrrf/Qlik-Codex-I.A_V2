
const code = `
LOAD * 
WHERE Value < 100;

// This is a comment
LOAD * 
WHERE Value > 50;
`;

const cleanCode = code.replace(/<[^>]*>/g, '[REMOVED]');

console.log("Original:");
console.log(code);
console.log("----------------");
console.log("Cleaned:");
console.log(cleanCode);
