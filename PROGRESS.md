# Progreso de CoverIA

| Fase | Estado | Fecha | Nota |
|------|--------|-------|------|
| 0 | hecha | 2026-09-17 | Preflight OK. Node v24.6.0, npm 11.5.1, git 2.43.0. Owner GitHub: faustinoaq. Cuenta Vercel: faustinoaq1. Modelo LLM verificado: gpt-5-nano (proveedor openai). |
| 1 | en progreso | 2026-09-17 | Scaffold Next.js 16.3.5 + TypeScript + Tailwind v4 creado con create-next-app. |
| 2 | pendiente | | |
| 3 | pendiente | | |
| 4 | pendiente | | |
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
