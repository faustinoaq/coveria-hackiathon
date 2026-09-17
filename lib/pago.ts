/**
 * Todos los montos se manejan en centavos enteros. Solo `paciente` se
 * redondea (half up); `aseguradora` se deriva como `tarifa - paciente` para
 * garantizar que el paciente nunca pague mas que la tarifa.
 */
export interface CalculoInput {
  tarifa: number;
  deduciblePendiente: number;
  coberturaPct: number;
  copagoFijo: number;
  aplicaDeducible: boolean;
  cubierto: boolean;
}

export interface CalculoResultado {
  deducible: number;
  coaseguro: number;
  copago: number;
  paciente: number;
  aseguradora: number;
}

function redondearHalfUp(valorX100: number): number {
  const entero = Math.floor(valorX100 / 100);
  const resto = valorX100 - entero * 100;
  return resto * 2 >= 100 ? entero + 1 : entero;
}

export function calcular({
  tarifa,
  deduciblePendiente,
  coberturaPct,
  copagoFijo,
  aplicaDeducible,
  cubierto,
}: CalculoInput): CalculoResultado {
  if (!cubierto) {
    return { deducible: 0, coaseguro: 0, copago: 0, paciente: tarifa, aseguradora: 0 };
  }

  const deducible = aplicaDeducible ? Math.min(deduciblePendiente, tarifa) : 0;
  const coaseguroX100 = (tarifa - deducible) * (100 - coberturaPct);
  const sumaX100 = deducible * 100 + coaseguroX100 + copagoFijo * 100;

  const paciente = Math.min(tarifa, redondearHalfUp(sumaX100));
  const coaseguro = redondearHalfUp(coaseguroX100);

  return {
    deducible,
    coaseguro,
    copago: copagoFijo,
    paciente,
    aseguradora: tarifa - paciente,
  };
}
