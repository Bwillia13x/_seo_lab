import { describe, it, expect } from "vitest";
import { parseCSV } from "../csv";

describe("csv", () => {
  it("parses quoted commas", () => {
    const rows = parseCSV('a,b\n"x, y",z');
    expect(rows[0].a).toBe("x, y");
  });

  it("parses simple csv", () => {
    const rows = parseCSV("name,value\ntest,123");
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("test");
    expect(rows[0].value).toBe("123");
  });
});
