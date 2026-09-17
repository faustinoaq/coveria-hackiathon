import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Selecciona el modelo segun `LLM_PROVIDER`. Soporta `openai` (por defecto)
 * y `anthropic`. `LLM_API_KEY` es el nombre generico pedido por el spec; si
 * el paquete del proveedor exige otro nombre, se puede ajustar aqui.
 */
export function obtenerModelo(): LanguageModel {
  const proveedor = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  const apiKey = process.env.LLM_API_KEY;
  const modelo = process.env.MODEL_AGENTE;

  if (!apiKey) throw new Error("LLM_API_KEY no esta definido");
  if (!modelo) throw new Error("MODEL_AGENTE no esta definido");

  if (proveedor === "anthropic") {
    return createAnthropic({ apiKey })(modelo);
  }
  return createOpenAI({ apiKey })(modelo);
}
