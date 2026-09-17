export type NivelUrgencia = "ninguna" | "urgente" | "crisis";

export function normalizarParaUrgencia(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

interface Patron {
  nivel: NivelUrgencia;
  regex: RegExp;
}

// Capa 1 (codigo, antes del LLM). Cada patron se evalua sobre texto
// normalizado (minusculas, sin tildes) y no depende del orden de las
// palabras dentro de la frase.
const PATRONES: Patron[] = [
  // Pensamientos de hacerse dano: maxima prioridad, no se cotiza.
  {
    nivel: "crisis",
    regex:
      /(pensamiento\w*.*(hacer\w*\s*dan\w*|suicid\w*)|quiero\s*morir|no\s*quiero\s*seguir\s*viviendo|ganas\s*de\s*morir\w*|quitarme\s*la\s*vida)/,
  },
  // Dolor de pecho intenso u opresivo, o que se irradia al brazo o mandibula.
  {
    nivel: "urgente",
    regex:
      /(?=.*\bpecho\b)(?=.*(fuerte|intenso|opresiv\w*|oprim\w*|irradia\w*|brazo|mandibula))/,
  },
  // No puedo respirar, me ahogo.
  { nivel: "urgente", regex: /(no\s*puedo\s*respirar|me\s*ahogo|ahogandome|falta\s*de\s*aire\s*(severa|intensa))/ },
  // Desmayo, perdida de conocimiento.
  { nivel: "urgente", regex: /(desmay\w*|perdi\w*\s*(el\s*)?conocimiento)/ },
  // Sangrado abundante.
  { nivel: "urgente", regex: /(sangrado\s*abundante|sangra\s*mucho|no\s*para\s*de\s*sangrar)/ },
  // Debilidad o adormecimiento de un lado, cara caida, habla arrastrada.
  {
    nivel: "urgente",
    regex:
      /((debilidad|adormec\w*|se\s*(le\s*)?(duerme|durmi\w*)).*(un\s*lado|mitad\s*del\s*cuerpo)|cara\s*(caida|se\s*(le\s*)?cay\w*)|habla\s*arrastrada)/,
  },
  // Convulsion.
  { nivel: "urgente", regex: /(convulsion\w*|ataque\s*de\s*epilepsia)/ },
];

export function detectarUrgencia(texto: string): NivelUrgencia {
  const normalizado = normalizarParaUrgencia(texto);
  let nivel: NivelUrgencia = "ninguna";
  for (const patron of PATRONES) {
    if (patron.regex.test(normalizado)) {
      if (patron.nivel === "crisis") return "crisis";
      nivel = "urgente";
    }
  }
  return nivel;
}
