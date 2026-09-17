import type { CoverIAUIMessage } from "./chat-tipos";

const CLAVE_BORRADOR = "coveria:borrador";
const CLAVE_CHAT = "coveria:chat";

/** Borrador de "Describe tu sintoma": sobrevive a un recargo/cierre del navegador. */
export function leerBorrador(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(CLAVE_BORRADOR) ?? "";
  } catch {
    return "";
  }
}

export function guardarBorrador(texto: string): void {
  if (typeof window === "undefined") return;
  try {
    if (texto) window.localStorage.setItem(CLAVE_BORRADOR, texto);
    else window.localStorage.removeItem(CLAVE_BORRADOR);
  } catch {
    // localStorage no disponible (modo privado, cuota llena, etc.)
  }
}

/** Sesion de chat activa: se guarda solo en este navegador, nunca en el servidor. */
export function leerChatGuardado(): CoverIAUIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAVE_CHAT);
    if (!raw) return [];
    const datos = JSON.parse(raw);
    return Array.isArray(datos) ? (datos as CoverIAUIMessage[]) : [];
  } catch {
    return [];
  }
}

export function guardarChat(mensajes: CoverIAUIMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    if (mensajes.length > 0) {
      window.localStorage.setItem(CLAVE_CHAT, JSON.stringify(mensajes));
    } else {
      window.localStorage.removeItem(CLAVE_CHAT);
    }
  } catch {
    // localStorage no disponible o cuota llena; la conversacion sigue en memoria
  }
}
