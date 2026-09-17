import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@neondatabase/serverless";
import { ESPECIALIDADES, PLANES, type Especialidad, type Plan } from "../lib/catalogo";

// ---------------------------------------------------------------------------
// Hospitales (15), distribuidos por provincia/ciudad segun el spec (B.10).
// Nombres y aseguradora ficticios.
// ---------------------------------------------------------------------------
interface HospitalSeed {
  hospital_id: string;
  nombre: string;
  provincia: string;
  ciudad: string;
  rating: number;
}

const HOSPITALES: HospitalSeed[] = [
  { hospital_id: "HOSP-001", nombre: "Hospital Bahia Serena", provincia: "Panama", ciudad: "Ciudad de Panama", rating: 4.5 },
  { hospital_id: "HOSP-002", nombre: "Clinica Vista del Istmo", provincia: "Panama", ciudad: "Ciudad de Panama", rating: 4.1 },
  { hospital_id: "HOSP-003", nombre: "Centro Medico Puente del Pacifico", provincia: "Panama", ciudad: "Ciudad de Panama", rating: 4.6 },
  { hospital_id: "HOSP-004", nombre: "Clinica Altos del Rio", provincia: "Panama", ciudad: "Ciudad de Panama", rating: 4.3 },
  { hospital_id: "HOSP-005", nombre: "Hospital Costa Esmeralda", provincia: "Panama", ciudad: "Ciudad de Panama", rating: 4.0 },
  { hospital_id: "HOSP-006", nombre: "Clinica San Miguel del Lago", provincia: "Panama", ciudad: "San Miguelito", rating: 4.2 },
  { hospital_id: "HOSP-007", nombre: "Hospital Rio Chorrera", provincia: "Panama Oeste", ciudad: "La Chorrera", rating: 4.0 },
  { hospital_id: "HOSP-008", nombre: "Clinica Valle Verde", provincia: "Panama Oeste", ciudad: "La Chorrera", rating: 4.4 },
  { hospital_id: "HOSP-009", nombre: "Hospital Puerto Colon Demo", provincia: "Colon", ciudad: "Colon", rating: 4.1 },
  { hospital_id: "HOSP-010", nombre: "Clinica Occidente Chiriqui", provincia: "Chiriqui", ciudad: "David", rating: 4.3 },
  { hospital_id: "HOSP-011", nombre: "Hospital Frontera Verde", provincia: "Chiriqui", ciudad: "David", rating: 4.0 },
  { hospital_id: "HOSP-012", nombre: "Clinica Rio Grande de Cocle", provincia: "Cocle", ciudad: "Penonome", rating: 4.2 },
  { hospital_id: "HOSP-013", nombre: "Hospital Llanos de Herrera", provincia: "Herrera", ciudad: "Chitre", rating: 4.1 },
  { hospital_id: "HOSP-014", nombre: "Clinica Central de Veraguas", provincia: "Veraguas", ciudad: "Santiago", rating: 4.0 },
  { hospital_id: "HOSP-015", nombre: "Hospital Laguna de Bocas", provincia: "Bocas del Toro", ciudad: "Changuinola", rating: 4.2 },
];

// ---------------------------------------------------------------------------
// Coberturas: 3 planes x 15 especialidades = 45 filas.
// ---------------------------------------------------------------------------
const COBERTURA_PCT: Record<Plan, number> = { BRONCE: 50, PLATA: 60, ORO: 70 };
const COPAGO_GENERAL: Record<Plan, number> = { BRONCE: 2500, PLATA: 2000, ORO: 1500 };
const COPAGO_EMERGENCIA: Record<Plan, number> = { BRONCE: 5000, PLATA: 4000, ORO: 3000 };
const LIMITE_ANUAL: Record<Plan, string> = {
  BRONCE: "$2,000.00 por año",
  PLATA: "$3,500.00 por año",
  ORO: "$5,000.00 por año",
};

interface CoberturaSeed {
  plan: Plan;
  especialidad: Especialidad;
  cubierto: boolean;
  cobertura_pct: number;
  copago_fijo: number;
  aplica_deducible: boolean;
  limite_anual_info: string;
}

const COBERTURAS: CoberturaSeed[] = [];
for (const plan of PLANES) {
  for (const especialidad of ESPECIALIDADES) {
    const esEmergencia = especialidad === "EMERGENCIA";
    // Caso deliberado de beneficio no cubierto por el plan base (para pruebas E101).
    const cubierto = !(plan === "BRONCE" && especialidad === "PSIQUIATRIA");
    COBERTURAS.push({
      plan,
      especialidad,
      cubierto,
      cobertura_pct: cubierto ? COBERTURA_PCT[plan] : 0,
      copago_fijo: esEmergencia ? COPAGO_EMERGENCIA[plan] : COPAGO_GENERAL[plan],
      aplica_deducible: !esEmergencia,
      limite_anual_info: LIMITE_ANUAL[plan],
    });
  }
}

// ---------------------------------------------------------------------------
// Tarifas: cada especialidad queda cubierta por exactamente 10 de los 15
// hospitales (siempre >= 2), ~150 filas en total.
// ---------------------------------------------------------------------------
function rangoTarifa(especialidad: Especialidad): [number, number] {
  if (especialidad === "MEDICINA_GENERAL") return [4000, 9000];
  if (especialidad === "EMERGENCIA") return [15000, 40000];
  return [8000, 18000];
}

interface TarifaSeed {
  hospital_id: string;
  especialidad: Especialidad;
  tarifa: number;
}

const TARIFAS: TarifaSeed[] = [];
HOSPITALES.forEach((hospital, i) => {
  ESPECIALIDADES.forEach((especialidad, idx) => {
    if ((i + idx) % 3 === 0) return; // excluido de esta especialidad
    const [min, max] = rangoTarifa(especialidad);
    let tarifa: number;
    if (hospital.hospital_id === "HOSP-004" && especialidad === "ORTOPEDIA") {
      tarifa = 9000; // coincide con el ejemplo documentado en B.5
    } else {
      tarifa = min + ((i * 733 + idx * 197) % (max - min + 100)) - ((i * 733 + idx * 197) % 100);
      tarifa = Math.min(max, Math.max(min, tarifa));
    }
    TARIFAS.push({ hospital_id: hospital.hospital_id, especialidad, tarifa });
  });
});

// ---------------------------------------------------------------------------
// Polizas: 60 en total. Las primeras 5 son casos reservados por el spec.
// ---------------------------------------------------------------------------
interface PolizaSeed {
  numero_poliza: string;
  plan: Plan;
  estado: "ACTIVA" | "INACTIVA" | "SUSPENDIDA";
  vigente_desde: string;
  vigente_hasta: string;
  deducible_anual: number;
  deducible_consumido: number;
}

const HOY = "2026-09-17";
const POLIZAS: PolizaSeed[] = [
  {
    numero_poliza: "POL-2026-0001",
    plan: "ORO",
    estado: "ACTIVA",
    vigente_desde: "2026-01-01",
    vigente_hasta: "2026-12-31",
    deducible_anual: 100000,
    deducible_consumido: 100000, // deducible consumido
  },
  {
    numero_poliza: "POL-2026-0002",
    plan: "PLATA",
    estado: "ACTIVA",
    vigente_desde: "2026-01-01",
    vigente_hasta: "2026-12-31",
    deducible_anual: 50000,
    deducible_consumido: 20000, // deducible parcial
  },
  {
    numero_poliza: "POL-2026-0003",
    plan: "BRONCE",
    estado: "ACTIVA",
    vigente_desde: "2026-01-01",
    vigente_hasta: "2026-12-31",
    deducible_anual: 50000,
    deducible_consumido: 0, // deducible completo pendiente
  },
  {
    numero_poliza: "POL-2026-0004",
    plan: "PLATA",
    estado: "INACTIVA",
    vigente_desde: "2026-01-01",
    vigente_hasta: "2026-12-31",
    deducible_anual: 25000,
    deducible_consumido: 0,
  },
  {
    numero_poliza: "POL-2026-0005",
    plan: "BRONCE",
    estado: "ACTIVA",
    vigente_desde: "2024-01-01",
    vigente_hasta: "2025-01-01", // vencida
    deducible_anual: 25000,
    deducible_consumido: 10000,
  },
];

const DEDUCIBLES_ANUALES = [0, 25000, 50000, 100000];
for (let n = 6; n <= 60; n++) {
  const plan = PLANES[n % 3];
  const estadoRoll = n % 11;
  const estado: PolizaSeed["estado"] =
    estadoRoll === 0 ? "INACTIVA" : estadoRoll === 1 ? "SUSPENDIDA" : "ACTIVA";
  const deducibleAnual = DEDUCIBLES_ANUALES[n % DEDUCIBLES_ANUALES.length];
  const deducibleConsumido =
    deducibleAnual === 0 ? 0 : Math.floor((deducibleAnual * ((n * 37) % 100)) / 100);
  POLIZAS.push({
    numero_poliza: `POL-2026-${String(n).padStart(4, "0")}`,
    plan,
    estado,
    vigente_desde: "2026-01-01",
    vigente_hasta: "2026-12-31",
    deducible_anual: deducibleAnual,
    deducible_consumido: deducibleConsumido,
  });
}

// ---------------------------------------------------------------------------
// Sintomas (~80), con sinonimos coloquiales de Panama. Requiere validacion
// humana antes de publicar (ver README).
// ---------------------------------------------------------------------------
interface SintomaSeed {
  id: string;
  sintoma: string;
  sinonimos: string;
  especialidad: Especialidad;
  prioridad: "ALTA" | "MEDIA" | "BAJA";
  bandera_roja: boolean;
}

const SINTOMAS: SintomaSeed[] = [
  { id: "S001", sintoma: "resfriado comun", sinonimos: "gripe, catarro, moqueo, estornudos", especialidad: "MEDICINA_GENERAL", prioridad: "BAJA", bandera_roja: false },
  { id: "S002", sintoma: "fiebre y tos", sinonimos: "calentura, tos seca, tos con flema", especialidad: "MEDICINA_GENERAL", prioridad: "MEDIA", bandera_roja: false },
  { id: "S003", sintoma: "dolor de garganta", sinonimos: "carraspera, garganta irritada", especialidad: "MEDICINA_GENERAL", prioridad: "BAJA", bandera_roja: false },
  { id: "S004", sintoma: "malestar general", sinonimos: "cuerpo cortado, decaido, sin energia", especialidad: "MEDICINA_GENERAL", prioridad: "BAJA", bandera_roja: false },
  { id: "S005", sintoma: "dolor de cabeza leve", sinonimos: "cefalea, jaqueca leve, cabeza pesada", especialidad: "MEDICINA_GENERAL", prioridad: "BAJA", bandera_roja: false },
  { id: "S006", sintoma: "chequeo general", sinonimos: "consulta de rutina, control anual", especialidad: "MEDICINA_GENERAL", prioridad: "BAJA", bandera_roja: false },

  { id: "S010", sintoma: "fiebre en nino", sinonimos: "calentura en el nino, nino con fiebre", especialidad: "PEDIATRIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S011", sintoma: "vomito y diarrea en nino", sinonimos: "nino con diarrea, chorro en el nino", especialidad: "PEDIATRIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S012", sintoma: "tos en bebe", sinonimos: "bebe con tos, gripe del bebe", especialidad: "PEDIATRIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S013", sintoma: "control de crecimiento", sinonimos: "control del nino sano, peso y talla", especialidad: "PEDIATRIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S014", sintoma: "erupcion en la piel del nino", sinonimos: "salpullido en el nino, ronchas en el nino", especialidad: "PEDIATRIA", prioridad: "MEDIA", bandera_roja: false },

  { id: "S020", sintoma: "dolor abdominal en el embarazo", sinonimos: "dolor de barriga embarazada, molestia en el embarazo", especialidad: "GINECOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S021", sintoma: "control prenatal", sinonimos: "chequeo de embarazo, cita prenatal", especialidad: "GINECOLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S022", sintoma: "sangrado vaginal fuera de regla", sinonimos: "sangrado irregular, manchado fuera de fecha", especialidad: "GINECOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S023", sintoma: "dolor menstrual intenso", sinonimos: "colicos fuertes, dolor de regla fuerte", especialidad: "GINECOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S024", sintoma: "control ginecologico anual", sinonimos: "papanicolau, chequeo de la mujer", especialidad: "GINECOLOGIA", prioridad: "BAJA", bandera_roja: false },

  { id: "S030", sintoma: "dolor de pecho intenso", sinonimos: "dolor fuerte en el pecho, opresion en el pecho, dolor que se va al brazo", especialidad: "CARDIOLOGIA", prioridad: "ALTA", bandera_roja: true },
  { id: "S031", sintoma: "palpitaciones", sinonimos: "corazon acelerado, se me sale el corazon", especialidad: "CARDIOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S032", sintoma: "presion alta", sinonimos: "hipertension, presion arterial alta", especialidad: "CARDIOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S033", sintoma: "control cardiologico", sinonimos: "chequeo del corazon, electrocardiograma de rutina", especialidad: "CARDIOLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S034", sintoma: "hinchazon de piernas y falta de aire", sinonimos: "piernas hinchadas y ahogo, retencion de liquido", especialidad: "CARDIOLOGIA", prioridad: "MEDIA", bandera_roja: false },

  { id: "S040", sintoma: "manchas en la piel", sinonimos: "ronchas, salpullido, alergia en la piel", especialidad: "DERMATOLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S041", sintoma: "acne severo", sinonimos: "espinillas, barros en la cara", especialidad: "DERMATOLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S042", sintoma: "picazon fuerte en la piel", sinonimos: "comezon en el cuerpo, rasquina", especialidad: "DERMATOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S043", sintoma: "lunar que cambio de color", sinonimos: "mancha nueva en la piel, lunar sospechoso", especialidad: "DERMATOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S044", sintoma: "caida de cabello", sinonimos: "alopecia, se me cae el pelo", especialidad: "DERMATOLOGIA", prioridad: "BAJA", bandera_roja: false },

  { id: "S050", sintoma: "dolor de rodilla al subir escaleras", sinonimos: "me duele la rodilla, rodilla hinchada", especialidad: "ORTOPEDIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S051", sintoma: "dolor de espalda baja", sinonimos: "dolor lumbar, dolor en la cintura", especialidad: "ORTOPEDIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S052", sintoma: "torcedura de tobillo", sinonimos: "me torci el tobillo, tobillo hinchado", especialidad: "ORTOPEDIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S053", sintoma: "dolor de hombro al levantar el brazo", sinonimos: "hombro trabado, dolor en el hombro", especialidad: "ORTOPEDIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S054", sintoma: "posible fractura tras caida", sinonimos: "me cai y no puedo mover el brazo, hueso roto", especialidad: "ORTOPEDIA", prioridad: "ALTA", bandera_roja: false },

  { id: "S060", sintoma: "debilidad de un lado del cuerpo", sinonimos: "se me duerme un lado, cara caida, no puedo hablar bien", especialidad: "NEUROLOGIA", prioridad: "ALTA", bandera_roja: true },
  { id: "S061", sintoma: "convulsion", sinonimos: "ataque de epilepsia, se le fueron los ojos y tembló", especialidad: "NEUROLOGIA", prioridad: "ALTA", bandera_roja: true },
  { id: "S062", sintoma: "migrana frecuente", sinonimos: "dolor de cabeza fuerte y recurrente, jaqueca con luces", especialidad: "NEUROLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S063", sintoma: "mareo y perdida de equilibrio", sinonimos: "vertigo, se me va la cabeza", especialidad: "NEUROLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S064", sintoma: "perdida de memoria reciente", sinonimos: "se me olvidan las cosas, confusion frecuente", especialidad: "NEUROLOGIA", prioridad: "MEDIA", bandera_roja: false },

  { id: "S070", sintoma: "dolor de estomago fuerte", sinonimos: "dolor de barriga, dolor abdominal", especialidad: "GASTROENTEROLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S071", sintoma: "acidez frecuente", sinonimos: "reflujo, agruras", especialidad: "GASTROENTEROLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S072", sintoma: "diarrea persistente", sinonimos: "chorro seguido, del estomago suelto", especialidad: "GASTROENTEROLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S073", sintoma: "sangre en las heces", sinonimos: "sangrado abundante al ir al bano, popo con sangre", especialidad: "GASTROENTEROLOGIA", prioridad: "ALTA", bandera_roja: true },
  { id: "S074", sintoma: "estrenimiento cronico", sinonimos: "no puedo hacer del bano, panza dura", especialidad: "GASTROENTEROLOGIA", prioridad: "BAJA", bandera_roja: false },

  { id: "S080", sintoma: "ansiedad", sinonimos: "nervios, estres constante, no puedo dormir por preocupacion", especialidad: "PSICOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S081", sintoma: "tristeza persistente", sinonimos: "me siento deprimido, sin ganas de nada", especialidad: "PSICOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S082", sintoma: "problemas para dormir", sinonimos: "insomnio, no puedo pegar el ojo", especialidad: "PSICOLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S083", sintoma: "estres laboral", sinonimos: "agotamiento en el trabajo, burnout", especialidad: "PSICOLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S084", sintoma: "duelo dificil de manejar", sinonimos: "no supero la perdida, luto complicado", especialidad: "PSICOLOGIA", prioridad: "MEDIA", bandera_roja: false },

  { id: "S090", sintoma: "pensamientos de hacerse dano", sinonimos: "ganas de morirme, pensamientos suicidas, no quiero seguir viviendo", especialidad: "PSIQUIATRIA", prioridad: "ALTA", bandera_roja: true },
  { id: "S091", sintoma: "crisis de panico", sinonimos: "ataque de panico, siento que me voy a morir de nervios", especialidad: "PSIQUIATRIA", prioridad: "ALTA", bandera_roja: false },
  { id: "S092", sintoma: "cambios de animo extremos", sinonimos: "bipolaridad, subo y bajo de animo de golpe", especialidad: "PSIQUIATRIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S093", sintoma: "seguimiento de medicacion psiquiatrica", sinonimos: "control de pastillas psiquiatricas, receta de psiquiatra", especialidad: "PSIQUIATRIA", prioridad: "BAJA", bandera_roja: false },

  { id: "S100", sintoma: "dolor de oido", sinonimos: "me duele el oido, oido tapado", especialidad: "OTORRINOLARINGOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S101", sintoma: "congestion nasal cronica", sinonimos: "nariz tapada siempre, sinusitis", especialidad: "OTORRINOLARINGOLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S102", sintoma: "zumbido en el oido", sinonimos: "tinnitus, pitido en el oido", especialidad: "OTORRINOLARINGOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S103", sintoma: "perdida de la voz", sinonimos: "afonia, ronquera persistente", especialidad: "OTORRINOLARINGOLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S104", sintoma: "vertigo con nauseas", sinonimos: "mareo que gira todo, vertigo posicional", especialidad: "OTORRINOLARINGOLOGIA", prioridad: "MEDIA", bandera_roja: false },

  { id: "S110", sintoma: "vision borrosa", sinonimos: "no veo bien, vista nublada", especialidad: "OFTALMOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S111", sintoma: "ojo rojo con dolor", sinonimos: "conjuntivitis, ojo irritado", especialidad: "OFTALMOLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S112", sintoma: "perdida de vision repentina", sinonimos: "me quede ciego de un ojo de repente, vista se apago de golpe", especialidad: "OFTALMOLOGIA", prioridad: "ALTA", bandera_roja: false },
  { id: "S113", sintoma: "control de lentes", sinonimos: "chequeo de la vista, graduacion de lentes", especialidad: "OFTALMOLOGIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S114", sintoma: "sensibilidad a la luz", sinonimos: "fotofobia, molestia con la luz", especialidad: "OFTALMOLOGIA", prioridad: "BAJA", bandera_roja: false },

  { id: "S120", sintoma: "ardor al orinar", sinonimos: "dolor al hacer pipi, infeccion urinaria", especialidad: "UROLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S121", sintoma: "sangre en la orina", sinonimos: "orina con sangre, pipi con sangre", especialidad: "UROLOGIA", prioridad: "ALTA", bandera_roja: false },
  { id: "S122", sintoma: "dolor en los rinones", sinonimos: "dolor lumbar tipo rinon, colico renal", especialidad: "UROLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S123", sintoma: "dificultad para orinar", sinonimos: "no puedo orinar bien, chorro debil", especialidad: "UROLOGIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S124", sintoma: "control de prostata", sinonimos: "chequeo de prostata, antigeno prostatico", especialidad: "UROLOGIA", prioridad: "BAJA", bandera_roja: false },

  { id: "S130", sintoma: "dolor de espalda por mala postura", sinonimos: "contractura muscular, dolor de cuello por trabajo", especialidad: "FISIOTERAPIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S131", sintoma: "rehabilitacion tras cirugia", sinonimos: "terapia despues de operacion, recuperacion postoperatoria", especialidad: "FISIOTERAPIA", prioridad: "MEDIA", bandera_roja: false },
  { id: "S132", sintoma: "rigidez muscular", sinonimos: "musculos duros, cuerpo agarrotado", especialidad: "FISIOTERAPIA", prioridad: "BAJA", bandera_roja: false },
  { id: "S133", sintoma: "dolor cronico de rodilla en tratamiento", sinonimos: "terapia de rodilla, rehabilitacion de rodilla", especialidad: "FISIOTERAPIA", prioridad: "BAJA", bandera_roja: false },

  { id: "S140", sintoma: "no puedo respirar", sinonimos: "me ahogo, falta de aire severa", especialidad: "EMERGENCIA", prioridad: "ALTA", bandera_roja: true },
  { id: "S141", sintoma: "desmayo o perdida de conocimiento", sinonimos: "se desmayo, perdio el conocimiento", especialidad: "EMERGENCIA", prioridad: "ALTA", bandera_roja: true },
  { id: "S142", sintoma: "sangrado abundante por herida", sinonimos: "herida que no para de sangrar, corte profundo", especialidad: "EMERGENCIA", prioridad: "ALTA", bandera_roja: true },
  { id: "S143", sintoma: "accidente de auto con lesiones", sinonimos: "choque con heridos, accidente de trafico", especialidad: "EMERGENCIA", prioridad: "ALTA", bandera_roja: false },
  { id: "S144", sintoma: "quemadura extensa", sinonimos: "me queme fuerte, quemadura grave", especialidad: "EMERGENCIA", prioridad: "ALTA", bandera_roja: false },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no esta definido");

  const client = new Client(url);
  await client.connect();

  try {
    const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
    await client.query(schema);

    await client.query(
      "truncate table run_events, runs, rate_limits, tarifas, coberturas, sintomas, hospitales, polizas cascade",
    );

    for (const h of HOSPITALES) {
      await client.query(
        "insert into hospitales (hospital_id, nombre, provincia, ciudad, rating, en_red) values ($1,$2,$3,$4,$5,true)",
        [h.hospital_id, h.nombre, h.provincia, h.ciudad, h.rating],
      );
    }

    for (const c of COBERTURAS) {
      await client.query(
        "insert into coberturas (plan, especialidad, cubierto, cobertura_pct, copago_fijo, aplica_deducible, limite_anual_info) values ($1,$2,$3,$4,$5,$6,$7)",
        [c.plan, c.especialidad, c.cubierto, c.cobertura_pct, c.copago_fijo, c.aplica_deducible, c.limite_anual_info],
      );
    }

    for (const t of TARIFAS) {
      await client.query(
        "insert into tarifas (hospital_id, especialidad, tarifa) values ($1,$2,$3)",
        [t.hospital_id, t.especialidad, t.tarifa],
      );
    }

    for (const p of POLIZAS) {
      await client.query(
        "insert into polizas (numero_poliza, plan, estado, vigente_desde, vigente_hasta, deducible_anual, deducible_consumido) values ($1,$2,$3,$4,$5,$6,$7)",
        [p.numero_poliza, p.plan, p.estado, p.vigente_desde, p.vigente_hasta, p.deducible_anual, p.deducible_consumido],
      );
    }

    for (const s of SINTOMAS) {
      await client.query(
        "insert into sintomas (id, sintoma, sinonimos, especialidad, prioridad, bandera_roja) values ($1,$2,$3,$4,$5,$6)",
        [s.id, s.sintoma, s.sinonimos, s.especialidad, s.prioridad, s.bandera_roja],
      );
    }

    console.log(`hospitales: ${HOSPITALES.length}`);
    console.log(`coberturas: ${COBERTURAS.length}`);
    console.log(`tarifas: ${TARIFAS.length}`);
    console.log(`polizas: ${POLIZAS.length}`);
    console.log(`sintomas: ${SINTOMAS.length}`);
    console.log(`referencia HOY (para pruebas de vigencia): ${HOY}`);
    console.log("seed OK");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
