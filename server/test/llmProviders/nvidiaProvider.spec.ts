import { describe, it, expect } from "vitest";

import { extractContent } from "../../src/lib/llmProviders/nvidiaProvider";

describe("nvidiaProvider.extractContent", () => {
  it("returns string when content is plain string", () => {
    expect(extractContent("hello world")).toBe("hello world");
  });

  it("joins array of strings", () => {
    expect(extractContent(["hello", " ", "world"]))?.toBe("hello world");
  });

  it("handles array of objects with text property", () => {
    const content = [{ type: "output", text: "abc" }, { text: "def" }];
    expect(extractContent(content)).toBe("abcdef");
  });

  it("serializes object-shaped parts (value/json) to string", () => {
    const content = [
      { type: "json", value: { foo: "bar" } },
      { json: { num: 1 } }
    ];

    const res = extractContent(content);
    expect(res).toBe(JSON.stringify({ foo: "bar" }) + JSON.stringify({ num: 1 }));
  });

  it("returns undefined for empty/whitespace-only values", () => {
    expect(extractContent("")).toBeUndefined();
    expect(extractContent(["", "   ", { text: "" }])).toBeUndefined();
  });
});
