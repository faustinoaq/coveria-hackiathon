# CoverIA

Agente conversacional de beneficios de salud para el hackIAthon Viamatica / ADEN (Reto 3:
"Estimador Agentico de Copago y Cobertura para el Paciente"). Pais: Panama. Datos 100%
sinteticos. Moneda: dolar estadounidense. Aseguradora ficticia: **Aseguradora Istmo Demo**.

## Enlace publico

**https://coveria-hackiathon.vercel.app**

El acceso requiere usuario y contraseña. Las credenciales de evaluacion se enviaron por
correo a hackiathon@viamatica.com y se rotaran al terminar la evaluacion.

## Polizas de demo

| Poliza | Estado |
|---|---|
| `POL-2026-0001` | ORO, activa, deducible consumido |
| `POL-2026-0002` | PLATA, activa, deducible parcial |
| `POL-2026-0003` | BRONCE, activa, deducible pendiente completo |
| `POL-2026-0004` | inactiva (error esperado: E002) |
| `POL-2026-0005` | vencida (error esperado: E002) |

Hay 60 polizas sembradas en total, 15 hospitales en 9 provincias/ciudades de Panama, 45
filas de cobertura (3 planes x 15 especialidades), ~150 tarifas y 74 sintomas con
sinonimos coloquiales panamenos.

## Como cumple cada punto del reto

1. **Agente conversacional**: `app/api/chat/route.ts` usa `streamText` de la AI SDK con
   tool calling (maximo 5 pasos) sobre el modelo configurado en `MODEL_AGENTE`.
2. **El paciente ingresa su sintoma**: el chat (`components/AppShell.tsx`) recibe texto
   libre; `buscar_sintomas` normaliza y busca por similitud (`pg_trgm`, con respaldo en
   codigo si la extension no esta disponible).
3. **El agente sugiere la especialidad**: el modelo elige una especialidad solo entre los
   candidatos devueltos por `buscar_sintomas` (regla reforzada en el prompt y con limite
   de 2 intentos antes de devolver `E005`).
4. **Cruza datos con el plan de seguro**: `cotizar` valida la poliza (`buscar_poliza`) y
   lee la cobertura real del plan (`coberturas`) antes de calcular nada.
5. **Indica el copago exacto**: `lib/pago.ts` calcula deducible, coaseguro, copago y total
   a pagar en centavos enteros; el LLM nunca escribe cifras, solo la interfaz las muestra
   (reforzado por `lib/guarda-montos.ts`).
6. **Indica el hospital mas economico**: `cotizar` ordena por `pago_paciente` asc, rating
   desc y nombre asc, y muestra hasta 3 opciones con la etiqueta "Mas economico".

## Arquitectura

```
Navegador (sesion en cookie httpOnly)
  |
proxy.ts                 verifica la cookie de sesion (capa 1)
  |
/api/chat                requireSession + limite por hora (capa 2)
  |-- urgencias.ts        regex de 2 capas, antes de llamar al LLM
  |-- streamText (AI SDK) agente con 3 tools, maximo 5 pasos
  |     |-- buscar_poliza
  |     |-- buscar_sintomas
  |     |-- cotizar         (cobertura + red + calculo, siempre en codigo)
  |-- guarda-montos.ts     valida que toda cifra del texto venga de una herramienta
  |-- eventos.ts           registra runs/run_events y alimenta el Recorrido/Pasos
  |
Neon Postgres (polizas, coberturas, hospitales, tarifas, sintomas, runs, run_events)
```

Endpoint MCP opcional en `/api/mcp` (protegido con `MCP_TOKEN` via bearer token, usando
`mcp-handler`): expone `buscar_poliza`, `buscar_sintomas` y `cotizar` para clientes
externos como Claude Desktop. La app en si no usa este endpoint; llama las funciones
directamente en proceso.

## Por que un solo agente

Un agente con tres herramientas en el mismo proceso es mas corto, mas barato y tiene
menos puntos de falla que un sistema multiagente para este flujo: sintoma -> especialidad
-> cobertura -> hospital. No hay coordinacion entre agentes que sincronizar, ni protocolo
A2A que depurar, ni latencia adicional de llamadas entre servicios. El modelo decide que
herramienta usar y en que orden; el codigo hace todo el calculo.

## Formula de pago

Montos en centavos enteros. Solo `pago_paciente` se redondea (half up);
`pago_aseguradora = tarifa - pago_paciente`, por lo que el paciente nunca paga mas que la
tarifa. Ver `lib/pago.ts` y los 9 casos de prueba + pruebas de propiedades en
`tests/pago.test.ts` (incluye el caso de tope por tarifa y el de redondeo).

## Resultados de evals y latencia

Ultima corrida de `npm run evals` (modelo `gpt-5-nano`, `LLM_PROVIDER=openai`):

- Precision de especialidad (30 casos, LLM real): **100%** (meta: >= 90%).
- Recall de urgencias (17 casos, capa 1 por regex, sin LLM): **100%** (meta: 100%).
- Cifras no respaldadas entregadas al paciente: **0** (garantizado en codigo por
  `lib/guarda-montos.ts`, no solo medido).
- Latencia p50 por consulta completa (3 herramientas + texto final): **~14 s** con
  `gpt-5-nano` en `reasoningEffort: "low"`. Es un modelo de razonamiento economico; parte
  del tiempo se va en tokens de razonamiento interno antes de la respuesta visible.

## Como correr local

```bash
npm install
npx vercel env pull .env.local   # o copiar .env.example y completarlo a mano
npm run db:setup                 # aplica db/schema.sql y siembra los datos de demo
npm run dev
```

Scripts disponibles: `npm run dev`, `npm run build`, `npm start`, `npm test`,
`npm run db:setup`, `npm run hash-password`, `npm run smoke`, `npm run evals`.

## Endpoint MCP

```json
{
  "coveria": {
    "url": "https://coveria-hackiathon.vercel.app/api/mcp",
    "headers": { "Authorization": "Bearer <MCP_TOKEN>" }
  }
}
```

Para clientes que solo hablan stdio, usar `mcp-remote`:

```json
{
  "coveria": {
    "command": "npx",
    "args": [
      "-y", "mcp-remote", "https://coveria-hackiathon.vercel.app/api/mcp",
      "--header", "Authorization: Bearer <MCP_TOKEN>"
    ]
  }
}
```

## Limitaciones

- Todos los datos (polizas, coberturas, tarifas, hospitales) son sinteticos y la
  aseguradora es ficticia. No representan precios ni cobertura reales.
- CoverIA no diagnostica ni garantiza cobertura, pagos o autorizaciones; toda estimacion
  es referencial y esta sujeta a validacion final de la aseguradora.
- Los sinonimos coloquiales de sintomas en panameno (`db/schema.sql` + `scripts/seed.ts`)
  fueron generados por el agente de codigo y **quedan pendientes de validacion humana**
  antes de cualquier uso mas alla de esta demo.
- El numero de emergencias (911) y la linea de salud mental del MINSA (169) deben
  verificarse por un humano antes de publicar la app fuera del contexto del hackathon,
  ya que las fuentes usadas datan de 2020-2021.
