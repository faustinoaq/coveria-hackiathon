import { z } from "zod";
import { sql } from "../db";
import { error, type ResultadoError } from "../errores";
import { hoyPanama } from "../formato";
import { calcular } from "../pago";
import { ESPECIALIDADES, type Especialidad, type Plan } from "../catalogo";
import { evaluarPoliza, normalizarNumeroPoliza, type PolizaRow } from "./buscar-poliza";

export const cotizarInputSchema = z.object({
  numero_poliza: z.string().regex(/^POL-\d{4}-\d{4,6}$/i),
  especialidad: z.enum(ESPECIALIDADES as unknown as [Especialidad, ...Especialidad[]]),
  ciudad: z.string().trim().min(1).nullable().optional(),
});

export type CotizarInput = z.infer<typeof cotizarInputSchema>;

interface HospitalTarifaRow {
  hospital_id: string;
  nombre: string;
  provincia: string;
  ciudad: string;
  rating: number;
  tarifa: number;
}

interface CoberturaRow {
  cubierto: boolean;
  cobertura_pct: number;
  copago_fijo: number;
  aplica_deducible: boolean;
  limite_anual_info: string | null;
}

export interface HospitalCotizado {
  hospital_id: string;
  nombre: string;
  provincia: string;
  ciudad: string;
  rating: number;
  tarifa: number;
  deducible_aplicado: number;
  coaseguro_paciente: number;
  copago: number;
  pago_paciente: number;
  pago_aseguradora: number;
}

export interface CotizacionOk {
  ok: true;
  especialidad: Especialidad;
  plan: Plan;
  cobertura_pct: number;
  copago_fijo: number;
  deducible_pendiente: number;
  limite_anual_info: string | null;
  ciudad_sin_resultados: boolean;
  hospitales: HospitalCotizado[];
  pasos: string[];
}

/** Logica pura: cobertura, filtro de red y calculo. Sin acceso a base de datos. */
export function construirCotizacion(params: {
  plan: Plan;
  especialidad: Especialidad;
  deduciblePendiente: number;
  cobertura: CoberturaRow | undefined;
  hospitales: HospitalTarifaRow[];
  ciudad?: string | null;
}): CotizacionOk | ResultadoError {
  const { plan, especialidad, deduciblePendiente, cobertura, hospitales, ciudad } = params;

  if (!cobertura) return error("E003");
  if (!cobertura.cubierto) return error("E101");

  let filtrados = hospitales;
  let ciudadSinResultados = false;
  if (ciudad) {
    const conCiudad = hospitales.filter(
      (h) => h.ciudad.toLowerCase() === ciudad.toLowerCase(),
    );
    if (conCiudad.length > 0) {
      filtrados = conCiudad;
    } else {
      ciudadSinResultados = true;
    }
  }

  if (filtrados.length === 0) return error("E102");

  const cotizados: HospitalCotizado[] = filtrados.map((h) => {
    const r = calcular({
      tarifa: h.tarifa,
      deduciblePendiente,
      coberturaPct: cobertura.cobertura_pct,
      copagoFijo: cobertura.copago_fijo,
      aplicaDeducible: cobertura.aplica_deducible,
      cubierto: true,
    });
    return {
      hospital_id: h.hospital_id,
      nombre: h.nombre,
      provincia: h.provincia,
      ciudad: h.ciudad,
      rating: h.rating,
      tarifa: h.tarifa,
      deducible_aplicado: r.deducible,
      coaseguro_paciente: r.coaseguro,
      copago: r.copago,
      pago_paciente: r.paciente,
      pago_aseguradora: r.aseguradora,
    };
  });

  cotizados.sort((a, b) => {
    if (a.pago_paciente !== b.pago_paciente) return a.pago_paciente - b.pago_paciente;
    if (a.rating !== b.rating) return b.rating - a.rating;
    return a.nombre.localeCompare(b.nombre);
  });

  return {
    ok: true,
    especialidad,
    plan,
    cobertura_pct: cobertura.cobertura_pct,
    copago_fijo: cobertura.copago_fijo,
    deducible_pendiente: deduciblePendiente,
    limite_anual_info: cobertura.limite_anual_info,
    ciudad_sin_resultados: ciudadSinResultados,
    hospitales: cotizados.slice(0, 3),
    pasos: ["cobertura", "red", "calculo"],
  };
}

export async function cotizar(
  input: CotizarInput,
): Promise<CotizacionOk | ResultadoError> {
  const numeroPoliza = normalizarNumeroPoliza(input.numero_poliza);

  const polizaFilas = await sql<PolizaRow>`
    select numero_poliza, plan, estado,
           vigente_desde::text, vigente_hasta::text,
           deducible_anual, deducible_consumido
    from polizas
    where numero_poliza = ${numeroPoliza}
  `;

  const evaluada = evaluarPoliza(polizaFilas[0], hoyPanama());
  if (!evaluada.ok) return evaluada;

  const coberturaFilas = await sql<CoberturaRow>`
    select cubierto, cobertura_pct, copago_fijo, aplica_deducible, limite_anual_info
    from coberturas
    where plan = ${evaluada.plan} and especialidad = ${input.especialidad}
  `;

  const hospitalFilas = await sql<HospitalTarifaRow>`
    select h.hospital_id, h.nombre, h.provincia, h.ciudad, h.rating::float as rating, t.tarifa
    from tarifas t
    join hospitales h on h.hospital_id = t.hospital_id
    where t.especialidad = ${input.especialidad} and h.en_red = true
  `;

  return construirCotizacion({
    plan: evaluada.plan,
    especialidad: input.especialidad,
    deduciblePendiente: evaluada.deducible_pendiente,
    cobertura: coberturaFilas[0],
    hospitales: hospitalFilas,
    ciudad: input.ciudad,
  });
}
