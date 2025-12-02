export function formatQlikScript(input: string): string {
  const lines = input.replace(/\r\n/g, "\n").split("\n");

  let indentLevel = 0;
  const indentSize = 2;

  const decreaseBefore = /^(END IF|NEXT|LOOP|END SUB)\b/i;
  const increaseAfter = /^(IF\b(?!.*\bEND IF\b)|FOR\b|DO\b|SUB\b)/i;

  const keywordMap: Record<string, string> = {
    load: "LOAD",
    select: "SELECT",
    from: "FROM",
    where: "WHERE",
    group: "GROUP",
    by: "BY",
    join: "JOIN",
    inner: "INNER",
    left: "LEFT",
    right: "RIGHT",
    outer: "OUTER",
    resident: "RESIDENT",
    concatenate: "CONCATENATE",
    as: "AS",
    if: "IF",
    then: "THEN",
    else: "ELSE",
    "end": "END",
    "end if": "END IF",
    for: "FOR",
    next: "NEXT",
    do: "DO",
    loop: "LOOP",
    sub: "SUB"
  };

  const formatKeywords = (line: string): string => {
    let result = line;
    Object.keys(keywordMap).forEach((key) => {
      const value = keywordMap[key];
      const pattern = new RegExp(`\\b${key}\\b`, "gi");
      result = result.replace(pattern, value);
    });
    return result;
  };

  const formatted: string[] = [];

  for (const raw of lines) {
    let line = raw.trimEnd();

    if (line.trim() === "") {
      continue;
    }

    const trimmed = line.trim();
    const isComment = trimmed.startsWith("//") || trimmed.startsWith("/*");

    if (!isComment && decreaseBefore.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indent = " ".repeat(indentLevel * indentSize);

    if (!isComment) {
      line = formatKeywords(trimmed);
      line = line.replace(/\s*=\s*/g, " = ");
    } else {
      line = trimmed;
    }

    formatted.push(indent + line);

    if (!isComment && increaseAfter.test(trimmed)) {
      indentLevel += 1;
    }
  }

  return formatted.join("\n").trimEnd();
}

