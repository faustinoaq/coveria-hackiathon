import { describe, expect, it } from "vitest";
import { fecha, moneda } from "../lib/formato";

describe("moneda", () => {
  it('formatea 4200 centavos como "$42.00"', () => {
    expect(moneda(4200)).toBe("$42.00");
  });

  it('formatea 100000 centavos como "$1,000.00"', () => {
    expect(moneda(100000)).toBe("$1,000.00");
  });

  it('formatea 0 centavos como "$0.00"', () => {
    expect(moneda(0)).toBe("$0.00");
  });

  it('formatea 5 centavos como "$0.05"', () => {
    expect(moneda(5)).toBe("$0.05");
  });
});

describe("fecha", () => {
  it("formatea como dd/mm/aaaa", () => {
    const d = new Date(Date.UTC(2026, 8, 17, 12, 0, 0));
    expect(fecha(d)).toBe("17/09/2026");
  });
});
