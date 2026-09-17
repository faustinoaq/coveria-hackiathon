import { describe, expect, it } from "vitest";
import { calcular } from "../lib/pago";

const dolares = (d: number) => Math.round(d * 100);

describe("calcular: casos de la tabla B.8", () => {
  it("1. deducible consumido", () => {
    const r = calcular({
      tarifa: dolares(1000),
      deduciblePendiente: dolares(0),
      coberturaPct: 80,
      copagoFijo: dolares(500),
      aplicaDeducible: true,
      cubierto: true,
    });
    expect(r.paciente).toBe(dolares(700));
    expect(r.aseguradora).toBe(dolares(300));
  });

  it("2. deducible parcial", () => {
    const r = calcular({
      tarifa: dolares(1000),
      deduciblePendiente: dolares(200),
      coberturaPct: 80,
      copagoFijo: dolares(500),
      aplicaDeducible: true,
      cubierto: true,
    });
    expect(r.paciente).toBe(dolares(860));
    expect(r.aseguradora).toBe(dolares(140));
  });

  it("3. deducible igual a la tarifa", () => {
    const r = calcular({
      tarifa: dolares(500),
      deduciblePendiente: dolares(500),
      coberturaPct: 80,
      copagoFijo: dolares(500),
      aplicaDeducible: true,
      cubierto: true,
    });
    expect(r.paciente).toBe(dolares(500));
    expect(r.aseguradora).toBe(dolares(0));
  });

  it("4. no aplica deducible", () => {
    const r = calcular({
      tarifa: dolares(1000),
      deduciblePendiente: dolares(300),
      coberturaPct: 70,
      copagoFijo: dolares(500),
      aplicaDeducible: false,
      cubierto: true,
    });
    expect(r.paciente).toBe(dolares(800));
    expect(r.aseguradora).toBe(dolares(200));
  });

  it("5. no cubierto", () => {
    const r = calcular({
      tarifa: dolares(1000),
      deduciblePendiente: dolares(0),
      coberturaPct: 0,
      copagoFijo: dolares(0),
      aplicaDeducible: true,
      cubierto: false,
    });
    expect(r.paciente).toBe(dolares(1000));
    expect(r.aseguradora).toBe(dolares(0));
  });

  it("6. consulta tipica", () => {
    const r = calcular({
      tarifa: dolares(100),
      deduciblePendiente: dolares(0),
      coberturaPct: 80,
      copagoFijo: dolares(0.15 * 100),
      aplicaDeducible: true,
      cubierto: true,
    });
    expect(r.paciente).toBe(dolares(35));
    expect(r.aseguradora).toBe(dolares(65));
  });

  it("7. tope por tarifa", () => {
    const r = calcular({
      tarifa: dolares(40),
      deduciblePendiente: dolares(0),
      coberturaPct: 80,
      copagoFijo: dolares(50),
      aplicaDeducible: true,
      cubierto: true,
    });
    expect(r.paciente).toBe(dolares(40));
    expect(r.aseguradora).toBe(dolares(0));
  });

  it("8. redondeo", () => {
    const r = calcular({
      tarifa: dolares(99.99),
      deduciblePendiente: dolares(10.01),
      coberturaPct: 70,
      copagoFijo: dolares(5),
      aplicaDeducible: true,
      cubierto: true,
    });
    expect(r.paciente).toBe(dolares(42));
    expect(r.aseguradora).toBe(dolares(57.99));
  });

  it("9. ejemplo de B.5", () => {
    const r = calcular({
      tarifa: dolares(90),
      deduciblePendiente: dolares(0),
      coberturaPct: 70,
      copagoFijo: dolares(15),
      aplicaDeducible: true,
      cubierto: true,
    });
    expect(r.paciente).toBe(dolares(42));
    expect(r.aseguradora).toBe(dolares(48));
  });
});

describe("calcular: propiedades con valores aleatorios", () => {
  function rngSeeded(seed: number) {
    let a = seed;
    return () => {
      a = (a * 1103515245 + 12345) & 0x7fffffff;
      return a / 0x7fffffff;
    };
  }

  it("paciente + aseguradora == tarifa y 0 <= paciente <= tarifa", () => {
    const rand = rngSeeded(42);
    for (let i = 0; i < 500; i++) {
      const tarifa = Math.floor(rand() * 100000);
      const deduciblePendiente = Math.floor(rand() * 100000);
      const coberturaPct = Math.floor(rand() * 101);
      const copagoFijo = Math.floor(rand() * 10000);
      const aplicaDeducible = rand() > 0.5;
      const cubierto = rand() > 0.1;

      const r = calcular({
        tarifa,
        deduciblePendiente,
        coberturaPct,
        copagoFijo,
        aplicaDeducible,
        cubierto,
      });

      expect(r.paciente + r.aseguradora).toBe(tarifa);
      expect(r.paciente).toBeGreaterThanOrEqual(0);
      expect(r.paciente).toBeLessThanOrEqual(tarifa);
    }
  });
});
