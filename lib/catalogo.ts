export const ESPECIALIDADES = [
  "MEDICINA_GENERAL",
  "PEDIATRIA",
  "GINECOLOGIA",
  "CARDIOLOGIA",
  "DERMATOLOGIA",
  "ORTOPEDIA",
  "NEUROLOGIA",
  "GASTROENTEROLOGIA",
  "PSICOLOGIA",
  "PSIQUIATRIA",
  "OTORRINOLARINGOLOGIA",
  "OFTALMOLOGIA",
  "UROLOGIA",
  "FISIOTERAPIA",
  "EMERGENCIA",
] as const;

export type Especialidad = (typeof ESPECIALIDADES)[number];

export function esEspecialidad(valor: string): valor is Especialidad {
  return (ESPECIALIDADES as readonly string[]).includes(valor);
}

export const PLANES = ["BRONCE", "PLATA", "ORO"] as const;
export type Plan = (typeof PLANES)[number];

export const NOMBRE_ASEGURADORA = "Aseguradora Istmo Demo";

// Nombres reales de hospitales de Panama a evitar en los datos sinteticos.
export const NOMBRES_HOSPITALES_REALES = [
  "Hospital Punta Pacifica",
  "Hospital Nacional",
  "Hospital San Fernando",
  "Complejo Hospitalario Dr. Arnulfo Arias Madrid",
  "Hospital Santo Tomas",
  "Centro Medico Paitilla",
  "Hospital del Nino",
  "Hospital Chiriqui",
  "Hospital Metropolitano",
  "Hospital Clinica Hospital San Fernando",
];
