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
//
// El agente ahora responde en el idioma del paciente (ver PROMPT_SISTEMA en
// lib/agente.ts), asi que esta capa de seguridad no puede seguir siendo
// solo en espanol: alguien en crisis o con una emergencia real que escribe
// en ingles debe activarla igual. Cada patron incluye variantes en espanol
// (ES) e ingles (EN); si el paciente escribe en otro idioma no cubierto, el
// LLM sigue siendo la segunda capa, pero esta capa 1 (mas rapida y
// confiable) queda ciega para ese idioma.
const PATRONES: Patron[] = [
  // Pensamientos de hacerse dano: maxima prioridad, no se cotiza.
  {
    nivel: "crisis",
    regex:
      /(pensamiento\w*.*(hacer\w*\s*dan\w*|suicid\w*)|quiero\s*morir|no\s*quiero\s*seguir\s*viviendo|ganas\s*de\s*morir\w*|quitarme\s*la\s*vida|want\s*to\s*die|don'?t\s*want\s*to\s*live|kill\s*myself|end\s*my\s*life|suicid\w*|thoughts?\s*of\s*(harming|hurting)\s*myself|harm\w*\s*myself|hurt\w*\s*myself)/,
  },
  // Dolor de pecho intenso u opresivo, o que se irradia al brazo o mandibula.
  {
    nivel: "urgente",
    regex:
      /((?=.*\bpecho\b)(?=.*(fuerte|intenso|opresiv\w*|oprim\w*|irradia\w*|brazo|mandibula))|(?=.*\bchest\b)(?=.*(pain|tight\w*|pressure|radiat\w*|\barm\b|jaw)))/,
  },
  // No puedo respirar, me ahogo.
  {
    nivel: "urgente",
    regex:
      /(no\s*puedo\s*respirar|me\s*ahogo|ahogandome|falta\s*de\s*aire\s*(severa|intensa)|can'?t\s*breathe|can\s*not\s*breathe|choking|gasping\s*for\s*air)/,
  },
  // Desmayo, perdida de conocimiento.
  {
    nivel: "urgente",
    regex: /(desmay\w*|perdi\w*\s*(el\s*)?conocimiento|fainted|fainting|passed\s*out|lost\s*consciousness)/,
  },
  // Sangrado abundante.
  {
    nivel: "urgente",
    regex: /(sangrado\s*abundante|sangra\s*mucho|no\s*para\s*de\s*sangrar|heavy\s*bleeding|bleeding\s*a\s*lot|won'?t\s*stop\s*bleeding)/,
  },
  // Debilidad o adormecimiento de un lado, cara caida, habla arrastrada.
  {
    nivel: "urgente",
    regex:
      /((debilidad|adormec\w*|se\s*(le\s*)?(duerme|durmi\w*)).*(un\s*lado|mitad\s*del\s*cuerpo)|cara\s*(caida|se\s*(le\s*)?cay\w*)|habla\s*arrastrada|(weak\w*|numb\w*).*(one\s*side|side\s*of\s*(the\s*)?body)|face\s*(is\s*)?droop\w*|slurred\s*speech)/,
  },
  // Convulsion.
  { nivel: "urgente", regex: /(convulsion\w*|ataque\s*de\s*epilepsia|seizure|convulsing)/ },
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
