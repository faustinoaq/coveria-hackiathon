# Progreso de CoverIA

| Fase | Estado | Fecha | Nota |
|------|--------|-------|------|
| 0 | hecha | 2026-09-17 | Preflight OK. Node v24.6.0, npm 11.5.1, git 2.43.0. Owner GitHub: faustinoaq. Cuenta Vercel: faustinoaq1. Modelo LLM verificado: gpt-5-nano (proveedor openai). |
| 1 | hecha | 2026-09-17 | Scaffold Next.js 16.3.5 + TypeScript + Tailwind v4. Build OK. Repo publico: https://github.com/faustinoaq/coveria-hackiathon |
| 2 | hecha | 2026-09-17 | Proyecto Vercel `coveria-hackiathon` vinculado (cuenta faustinoaq1), repo de GitHub conectado. Neon Postgres provisionado (plan free_v3, region iad1) sin bloqueo de terminos. `DATABASE_URL` confirmada en produccion y development. Secretos generados (SESSION_SECRET, ADMIN_PASSWORD_HASH via scrypt) y cargados por stdin. `MCP_TOKEN` generado para la fase 10. |
| 3 | hecha | 2026-09-17 | `db/schema.sql` aplicado y `scripts/seed.ts` ejecutado: 15 hospitales, 45 coberturas, 150 tarifas, 60 polizas (incluyendo las 5 reservadas), 74 sintomas. Test de consistencia de catalogo OK (cada especialidad de sintomas tiene cobertura en los 3 planes y >=2 hospitales en red). |
| 4 | hecha | 2026-09-17 | `lib/pago.ts` (calculo en centavos, redondeo half-up solo en paciente). 9 casos de B.8 + prueba de propiedades (500 combinaciones aleatorias) OK. `lib/formato.ts` y `lib/errores.ts` agregados. 18 tests pasando en total. |
| 5 | pendiente | | |
| 6 | pendiente | | |
| 7 | pendiente | | |
| 8 | pendiente | | |
| 9 | pendiente | | |
| 10 | pendiente | | |
| 11 | pendiente | | |

## Notas de compatibilidad de librerias

- Next.js 16: `middleware.ts` fue renombrado a `proxy.ts` (confirmado en la documentacion del proyecto vercel:nextjs).
- AI SDK v7 (`ai@7.0.105`): los tools usan `inputSchema` (ya no `parameters`). Se usa `streamText` + `tool()` + `stopWhen: isStepCount(5)` en vez del `maxSteps` de versiones anteriores. Se usa `createUIMessageStream`/`createUIMessageStreamResponse` para el endpoint `/api/chat`.
- Tipografia: "Atkinson Hyperlegible Next" no esta disponible aun en `next/font/google`; se usa "Atkinson Hyperlegible" (pesos 400/700) como indica el spec como alternativa.
- `@types/node` se fijo en `^24` (en vez de `^20` del scaffold por defecto) porque `vitest@5` requiere `@types/node >=22`.
- `util.promisify(crypto.scrypt)` no tipa bien la sobrecarga con `options`; se cambio a `crypto.scryptSync` en `lib/auth.ts` (mismo resultado, sin el problema de tipos).
- Bug conocido de npm con dependencias opcionales (rolldown/vitest) causo `Cannot find native binding`; se resolvio borrando `node_modules`/`package-lock.json` y reinstalando.
- Seed genero 74 sintomas (el spec sugiere "~80"); es una aproximacion razonable, todas las 15 especialidades quedan cubiertas.
