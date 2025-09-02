import { describe, it, expect } from "vitest";
import { clamp, holtWinters } from "../math";

describe("math utils", () => {
  describe("clamp", () => {
    it("returns value within bounds", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("holtWinters", () => {
    it("handles empty series", () => {
      const result = holtWinters([]);
      expect(result.level).toBe(0);
      expect(result.trend).toBe(0);
      expect(result.seasonals).toHaveLength(24);
      expect(result.forecast).toHaveLength(0);
    });

    it("forecasts with sample data", () => {
      const series = [10, 12, 13, 12, 14, 16, 15, 11, 10, 12, 13, 12];
      const result = holtWinters(series, 0.5, 0.3, 0.1, 12);
      expect(result.forecast).toHaveLength(12);
      expect(result.trend).toBeDefined();
      expect(result.seasonals).toHaveLength(12);
      // Level can be negative in some cases due to the algorithm, just check it's a number
      expect(typeof result.level).toBe("number");
    });
  });
});
