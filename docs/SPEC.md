# CoverIA - Spec v5.0

Reto: hackIAthon Viamatica / ADEN, Reto 3 "Estimador Agentico de Copago y Cobertura para el Paciente".
Reemplaza: v2.0, v3.0, v4.0 y v4.1.
Arquitectura: un solo agente con herramientas.
Pais: Panama. Datos 100% sinteticos. Moneda: dolar estadounidense.
Acceso: privado, con usuario y contraseña.
Ejecucion: pensado para que un agente de codigo (Claude Code u otro) lo construya y despliegue sin supervision.

# PARTE A. Instrucciones para el agente de codigo

Esta parte es obligatoria y va antes de escribir codigo.

## A.1 Resultado esperado

Al terminar, imprimir exactamente este bloque (sin secretos):

```
COVERIA LISTO
URL produccion: https://<dominio>.vercel.app
Repositorio:    https://github.com/<owner>/<repo>
Usuario demo:   <ADMIN_USER>
Tests:          <n> pasados, 0 fallidos
Smoke tests:    <n> pasados, 0 fallidos
Pendientes:     <lista o "ninguno">
```

Si no se puede terminar, imprimir `COVERIA BLOQUEADO` con el paso, el error y la accion humana necesaria.

## A.2 Pasos humanos previos (una sola vez, antes de lanzar el agente)

1. Cuenta personal de Vercel (plan Hobby). El plan Hobby no conecta repos de organizaciones de GitHub: usar cuenta personal.
2. Aceptar los terminos de la integracion Neon en Vercel. La primera aceptacion requiere navegador y un agente no puede saltarla. Opcion: ejecutar `vercel integration add neon` una vez de forma interactiva, o aceptar desde el Marketplace en el dashboard.
3. Crear tokens:
   - `GH_TOKEN`: token de GitHub con permiso para crear repos y hacer push en la cuenta personal.
   - `VERCEL_TOKEN`: token de Vercel de la cuenta personal.
   - API key del proveedor LLM, con limite de gasto configurado en el proveedor.
4. Exportar en la terminal donde corre el agente:

```
export GH_TOKEN=...
export VERCEL_TOKEN=...
export LLM_PROVIDER=...            # ej. anthropic u openai
export LLM_API_KEY=...
export MODEL_AGENTE=...            # id exacto del modelo
export ADMIN_USER=usuario
export ADMIN_PASSWORD=...          # el agente la convierte en hash y no la guarda
export PROJECT_NAME=coveria-hackiathon
export WORKSPACE_DIR="$HOME/projects"
```

5. Lanzar el agente en modo no interactivo con permisos para ejecutar comandos, editar archivos y usar red. En Claude Code, usar el modo headless (`claude -p`) con un modo de permisos que no pida confirmacion. Verificar las opciones exactas con `claude --help` en la version instalada. Recomendado: correrlo dentro de un contenedor o VM desechable.

## A.3 Preflight (fase 0)

Ejecutar todas las comprobaciones. Si alguna falla, no crear archivos del proyecto; imprimir `COVERIA BLOQUEADO` con la lista completa de fallas y terminar.

| # | Comprobacion | Como | Falla si |
|---|--------------|------|----------|
| 1 | Node 20 o superior | `node -v` | version menor o ausente |
| 2 | npm | `npm -v` | ausente |
| 3 | git | `git --version` | ausente |
| 4 | GitHub CLI autenticado | `gh auth status` (usa `GH_TOKEN`) | no autenticado |
| 5 | Owner de GitHub | `gh api user --jq .login` | error |
| 6 | Nombre de repo libre o propio | `gh repo view <owner>/$PROJECT_NAME` | existe y no es de este proyecto (ver A.4) |
| 7 | Vercel CLI | `npx vercel@latest --version` | no instala |
| 8 | Vercel autenticado | `npx vercel whoami --token "$VERCEL_TOKEN"` | error |
| 9 | Red | `curl -sI` a registry.npmjs.org, api.github.com, api.vercel.com y la API del proveedor LLM | alguna no responde |
| 10 | API key y modelo LLM | llamada minima de 1 token con `MODEL_AGENTE` | error de auth o modelo inexistente |
| 11 | Variables requeridas | todas las de A.2 definidas y no vacias | falta alguna |
| 12 | Escritura en disco | crear y borrar un archivo en `$WORKSPACE_DIR` | sin permiso |
| 13 | Permisos del agente | ejecutar un comando inocuo (`echo ok`) sin confirmacion | pide confirmacion |
| 14 | Integracion Neon | `npx vercel integration list --token "$VERCEL_TOKEN"` o intento de alta en A.6 | pide terminos en navegador |

Si alguna herramienta falta pero se puede instalar sin sudo (ej. Vercel CLI via `npx`), instalarla y repetir la comprobacion.

GitHub: usar `gh`. Si el agente tiene GitHub MCP configurado, puede usarlo, pero `gh` es la ruta principal por ser mas predecible sin supervision.
Vercel: usar Vercel CLI para crear, configurar y desplegar. Vercel MCP es opcional y sirve para leer logs y documentacion.

## A.4 Carpeta del proyecto

El agente puede arrancar en una carpeta cualquiera. No trabajar ahi.

1. `PROJECT_DIR="$WORKSPACE_DIR/$PROJECT_NAME"`.
2. Si no existe: crearla.
3. Si existe y esta vacia: usarla.
4. Si existe con `.git` y su remoto `origin` es `github.com/<owner>/$PROJECT_NAME`: reanudar (leer `PROGRESS.md`).
5. Si existe con otro contenido: no tocarla. Crear `$PROJECT_NAME-2` (o el siguiente numero libre) y usar ese nombre tambien para repo y proyecto de Vercel.
6. `cd "$PROJECT_DIR"` y usar rutas absolutas en todos los comandos siguientes.

## A.5 Sincronizacion con GitHub

1. Crear `.gitignore` antes del primer commit. Debe incluir: `node_modules`, `.next`, `.env`, `.env.*`, `!.env.example`, `.vercel`.
2. `git init -b main`.
3. Primer commit con `.gitignore`, `README.md` inicial y `PROGRESS.md`.
4. `gh repo create "$PROJECT_NAME" --public --source . --remote origin --push`. El repo debe ser publico porque es un entregable.
5. Despues de cada fase: commit con mensaje `fase N: <resumen>` y `git push`.
6. Antes de cada push, revision de secretos:
   - `git ls-files` no contiene `.env` ni `.env.local`.
   - Buscar en archivos versionados los valores de `LLM_API_KEY`, `GH_TOKEN`, `VERCEL_TOKEN`, `ADMIN_PASSWORD` y el prefijo de `DATABASE_URL`. Si aparece alguno, detener, quitarlo y reescribir el commit local antes de hacer push.
7. Nunca `git push --force` sobre `main` despues del primer push.

## A.6 Infraestructura en Vercel y Neon

Todos los comandos con `--token "$VERCEL_TOKEN"`.

1. Enlazar proyecto: `npx vercel link --yes --project "$PROJECT_NAME"`.
2. Provisionar Neon (plan gratis):
   `npx vercel integration add neon --name "$PROJECT_NAME-db" --plan free -e production -e development`
   Region: la mas cercana a la region de las funciones de Vercel (por defecto en Estados Unidos este). Revisar la clave de metadata con `npx vercel integration add neon --help` y pasarla con `-m`.
3. Verificar que exista `DATABASE_URL`: `npx vercel env ls`.
4. Generar secretos:
   - `SESSION_SECRET`: `openssl rand -base64 32`.
   - `ADMIN_PASSWORD_HASH`: `npm run hash-password` leyendo `ADMIN_PASSWORD` del entorno.
5. Cargar variables de produccion leyendo el valor por stdin (nunca como argumento visible):
   `printf %s "$VALOR" | npx vercel env add NOMBRE production`
   Variables: `LLM_PROVIDER`, `LLM_API_KEY` (o el nombre que exija el paquete del proveedor), `MODEL_AGENTE`, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `TZ_APP`, `EMERGENCY_NUMBER`, `CRISIS_LINE`, `MAX_CONSULTAS_POR_HORA`, `MAX_INTENTOS_LOGIN`.
6. `npx vercel env pull .env.local --yes` para desarrollo local.
7. Borrar `ADMIN_PASSWORD` de la memoria de trabajo: no escribirla en archivos ni logs.
8. Opcional: `npx vercel git connect` para despliegues automaticos al hacer push. Si falla, seguir con despliegue por CLI.

## A.7 Fases de construccion

| Fase | Contenido | Criterio para avanzar |
|------|-----------|-----------------------|
| 0 | Preflight | todas las comprobaciones OK |
| 1 | Carpeta, repo, scaffold Next.js + Tailwind + TypeScript | `npm run build` OK; push |
| 2 | Vercel link, Neon, variables | `DATABASE_URL` presente |
| 3 | `db/schema.sql`, `scripts/seed.ts`, `npm run db:setup` | tablas creadas y con datos; test de catalogo OK |
| 4 | `lib/pago.ts` + tests | 9 casos y propiedades OK |
| 5 | Login (`lib/auth.ts`, `proxy.ts`, rutas auth, `/login`) + tests | tests de auth OK |
| 6 | Herramientas + agente + `/api/chat` + urgencias + guarda de montos | tests de herramientas OK; consulta local de ejemplo devuelve estimacion |
| 7 | UI completa | build OK; revision visual con capturas si el entorno lo permite |
| 8 | Deploy produccion: `npx vercel deploy --prod` | URL responde |
| 9 | Smoke tests contra produccion (A.8) | todos OK |
| 10 | README final, endpoint MCP opcional, evals | push final |
| 11 | Reporte A.1 | impreso |

`PROGRESS.md` en la raiz: lista de fases con estado (`pendiente`, `hecha`, `bloqueada`), fecha y nota breve. Actualizar al terminar cada fase. Si el agente se reinicia, retomar desde la primera fase no hecha.

## A.8 Smoke tests de produccion (`scripts/smoke.ts`)

Ejecutar contra la URL de produccion. Leer `ADMIN_PASSWORD` del entorno solo para este paso.

| # | Prueba | Esperado |
|---|--------|----------|
| 1 | `GET /login` | 200 |
| 2 | `GET /` sin cookie | redireccion a `/login` |
| 3 | `POST /api/chat` sin cookie | 401 |
| 4 | Login con contraseña incorrecta | 401 con mensaje generico |
| 5 | Login correcto | 200 y cookie `coveria_session` |
| 6 | Chat: "Me duele la rodilla, POL-2026-0001" | respuesta con estimacion, especialidad ORTOPEDIA, 3 hospitales o menos |
| 7 | Chat: "Tengo fiebre, POL-2026-0004" | error E002 |
| 8 | Chat: "Dolor fuerte en el pecho, POL-2026-0003" | bandera de urgencia activa |
| 9 | Respuesta 6: `pago_paciente + pago_aseguradora == tarifa` en cada hospital | verdadero |
| 10 | Logout | cookie eliminada |

Si una prueba falla: revisar logs (`npx vercel logs <url>` o Vercel MCP), corregir, redeployar y repetir. Maximo 3 ciclos por prueba; luego `COVERIA BLOQUEADO`.

## A.9 Reglas de ejecucion

- Reintentar cada comando de red hasta 3 veces con espera creciente.
- No imprimir secretos. Al mostrar variables, enmascarar todo salvo los ultimos 4 caracteres.
- No usar planes de pago ni aceptar cargos.
- No borrar repos, proyectos ni bases que no haya creado esta ejecucion.
- No modificar archivos fuera de `PROJECT_DIR`.
- Fijar versiones de dependencias con el `package-lock.json` que genere `npm install`. No copiar versiones de este documento.
- Si una libreria cambio su API respecto a lo descrito aqui, seguir la documentacion actual de la libreria y anotarlo en `PROGRESS.md`.

# PARTE B. Producto

## B.1 Que pide el reto

1. Agente conversacional.
2. El paciente ingresa su sintoma.
3. El agente sugiere la especialidad en el hospital.
4. Cruza datos con su plan de seguro.
5. Indica exactamente cuanto sera su copago.
6. Indica que hospital de la red le conviene mas economicamente.

Entregables: enlace publico del agente y repositorio en GitHub.

## B.2 Principios

1. Un solo agente LLM. Decide que herramienta usar y explica el resultado.
2. El codigo calcula. Ningun monto sale de texto generado.
3. Urgencias se detectan en codigo antes del LLM.
4. Sin memoria compartida entre instancias. Todo estado persistente vive en Postgres o en la cookie de sesion.
5. Nadie usa el agente sin iniciar sesion.

## B.3 Stack

| Capa | Eleccion |
|------|----------|
| App y API | Next.js (App Router, version 16 o superior) + TypeScript |
| Estilos | Tailwind CSS con tokens propios |
| Agente | AI SDK (`ai` + paquete del proveedor) con tool calling |
| Base de datos | Neon Postgres via Vercel Marketplace, plan gratis |
| Driver | `@neondatabase/serverless`, SQL plano |
| Validacion | `zod` |
| Sesion | libreria `jose` para firmar el JWT de la cookie; `node:crypto` (scrypt) para la contraseña |
| Pruebas | `vitest` |
| Hosting | Vercel Hobby (uso personal, no comercial) |

Notas:
- En Next.js 16, `middleware.ts` se llama `proxy.ts` y corre en runtime Node.js.
- En Vercel, el tiempo esperando al LLM o a la base no cuenta como CPU activa.
- No guardar estado en variables globales: una instancia puede reutilizarse o no.

## B.4 Arquitectura

```
Navegador (sesion en cookie)
  |
proxy.ts            verifica sesion
  |
/api/chat           requireSession + limite de uso
  |-- urgencias.ts  regex antes del LLM
  |-- agente (AI SDK, max 5 pasos)
  |     |-- buscar_poliza
  |     |-- buscar_sintomas
  |     |-- cotizar        (cobertura + red + calculo en codigo)
  |-- guarda-montos.ts
  |-- eventos.ts    guarda pasos en run_events y los envia a la UI
  |
Neon Postgres
```

Endpoint MCP opcional (`/api/mcp`, fase 10): expone las mismas 3 herramientas para clientes externos como Claude Desktop. Protegido con `MCP_TOKEN`. El agente de la app no lo usa; llama las funciones directamente.

## B.5 Herramientas

Todas devuelven JSON con `ok`. Si `ok` es false: `codigo` y `mensaje`. Entradas validadas con zod.

### buscar_poliza

Entrada: `{ "numero_poliza": "POL-2026-0001" }`. Formato `^POL-\d{4}-\d{4,6}$`, normalizado a mayusculas.

Salida: `plan`, `estado`, `vigente_hasta`, `deducible_anual`, `deducible_pendiente`.
Errores: E001 no existe; E002 inactiva o fuera de vigencia (fecha actual en `America/Panama`).

### buscar_sintomas

Entrada: `{ "texto": "me duele la rodilla al subir escaleras" }`.

Salida: hasta 5 candidatos con `sintoma`, `especialidad`, `prioridad`, `bandera_roja`, `score`.
Implementacion: normalizar texto (minusculas, sin tildes) y usar `pg_trgm` sobre `sintoma` y `sinonimos`. Si la extension no esta disponible, calcular similitud en codigo.
Regla: el agente solo puede elegir una especialidad presente en los candidatos. Si ninguna encaja, pregunta. Maximo 2 intentos; luego E005.

### cotizar

Entrada: `{ "numero_poliza": "POL-2026-0001", "especialidad": "ORTOPEDIA", "ciudad": null }`.

Proceso en codigo:
1. Poliza y deducible pendiente.
2. Cobertura por (plan, especialidad). Sin fila: E003. `cubierto = false`: E101.
3. Hospitales en red con tarifa para la especialidad. Filtrar por `ciudad` si hay resultados; si no, usar todos y marcar `ciudad_sin_resultados`.
4. Calcular pago por hospital.
5. Ordenar por pago_paciente asc, rating desc, nombre asc. Top 3.
6. Sin hospitales: E102.

Salida:
```json
{
  "ok": true,
  "especialidad": "ORTOPEDIA",
  "plan": "ORO",
  "cobertura_pct": 70,
  "copago_fijo": 15.00,
  "deducible_pendiente": 0.00,
  "limite_anual_info": "$5,000.00 por año",
  "ciudad_sin_resultados": false,
  "hospitales": [
    {
      "hospital_id": "HOSP-004",
      "nombre": "Clinica Altos del Rio",
      "provincia": "Panama",
      "ciudad": "Ciudad de Panama",
      "rating": 4.3,
      "tarifa": 90.00,
      "deducible_aplicado": 0.00,
      "coaseguro_paciente": 27.00,
      "copago": 15.00,
      "pago_paciente": 42.00,
      "pago_aseguradora": 48.00
    }
  ],
  "pasos": ["cobertura", "red", "calculo"]
}
```

`pasos` alimenta el recorrido de la UI con tiempos por sub-paso.

## B.6 Agente

- Ruta `app/api/chat/route.ts` con `streamText` y las 3 herramientas.
- Maximo 5 pasos por turno. `maxOutputTokens` bajo.
- Historial: el cliente envia los mensajes; el servidor usa los ultimos 10.
- La tarjeta de estimacion se arma desde la salida de `cotizar`, no desde el texto.
- Guarda de montos: toda cifra del texto del agente debe existir en salidas de herramientas; si no, se reemplaza por una frase plantilla.

Prompt del sistema:
```
Eres CoverIA, asistente de beneficios de salud de Aseguradora Istmo Demo en Panama.
Hablas en espanol claro, amable y breve.
1. Consigue el sintoma y el numero de poliza.
2. Valida la poliza con buscar_poliza.
3. Usa buscar_sintomas y elige una especialidad solo de los candidatos. Si no hay una clara, haz una pregunta concreta.
4. Llama cotizar con la poliza y la especialidad.
5. Explica el resultado en 2 a 4 frases. No escribas cifras; la pantalla las muestra.
6. Si una herramienta devuelve error, explica que paso, que puede hacer el paciente y el codigo.
7. No diagnosticas. No garantizas cobertura, pagos ni autorizaciones.
8. Si la consulta no es sobre beneficios de salud, redirige con amabilidad.
Cierra toda respuesta con estimacion con: "Esta informacion es una estimacion referencial. La validacion final de cobertura y beneficios corresponde a la aseguradora."
```

## B.7 Urgencias

Capa 1 (codigo, antes del LLM), regex sobre texto normalizado:
- dolor de pecho intenso u opresivo, o que se irradia al brazo o mandibula
- no puedo respirar, me ahogo
- desmayo, perdida de conocimiento
- sangrado abundante
- debilidad o adormecimiento de un lado, cara caida, habla arrastrada
- convulsion
- pensamientos de hacerse dano

Capa 2: candidato con `bandera_roja` en `buscar_sintomas`.

Efecto:
- Franja fija arriba del chat: acudir a emergencias o llamar al 911.
- Pensamientos de hacerse dano: mostrar la linea `CRISIS_LINE` y no cotizar.
- Otros casos: cotizar la especialidad sugerida y EMERGENCIA.

## B.8 Formula de pago

Reglas:
- Montos en centavos enteros.
- `cobertura_pct` de 0 a 100.
- Redondear solo `pago_paciente` (half up). `pago_aseguradora = tarifa - pago_paciente`.
- El paciente nunca paga mas que la tarifa.
- Estimar no consume deducible.

```ts
function calcular({ tarifa, deduciblePendiente, coberturaPct, copagoFijo, aplicaDeducible, cubierto }) {
  if (!cubierto) return { deducible: 0, coaseguro: 0, copago: 0, paciente: tarifa, aseguradora: 0 };
  const deducible = aplicaDeducible ? Math.min(deduciblePendiente, tarifa) : 0;
  const coaseguro = (tarifa - deducible) * (1 - coberturaPct / 100);
  const paciente = Math.min(tarifa, deducible + coaseguro + copagoFijo);
  return { deducible, coaseguro, copago: copagoFijo, paciente, aseguradora: tarifa - paciente };
}
```

Casos (en dolares; el test los convierte a centavos):

| # | Caso | Tarifa | Ded. pend. | Aplica | Cob. | Copago | Paciente | Aseguradora |
|---|------|--------|------------|--------|------|--------|----------|-------------|
| 1 | Deducible consumido | 1000 | 0 | si | 80 | 500 | 700.00 | 300.00 |
| 2 | Deducible parcial | 1000 | 200 | si | 80 | 500 | 860.00 | 140.00 |
| 3 | Deducible = tarifa | 500 | 500 | si | 80 | 500 | 500.00 | 0.00 |
| 4 | No aplica deducible | 1000 | 300 | no | 70 | 500 | 800.00 | 200.00 |
| 5 | No cubierto | 1000 | 0 | si | 0 | 0 | 1000.00 | 0.00 |
| 6 | Consulta tipica | 100 | 0 | si | 80 | 15 | 35.00 | 65.00 |
| 7 | Tope por tarifa | 40 | 0 | si | 80 | 50 | 40.00 | 0.00 |
| 8 | Redondeo | 99.99 | 10.01 | si | 70 | 5 | 42.00 | 57.99 |
| 9 | Ejemplo de B.5 | 90 | 0 | si | 70 | 15 | 42.00 | 48.00 |

Propiedades con valores aleatorios: `paciente + aseguradora == tarifa` y `0 <= paciente <= tarifa`.

En pantalla se muestra "Total a pagar" con desglose, para que "copago" y "total" no parezcan contradictorios.

## B.9 Acceso con usuario y contraseña

- Una cuenta definida por entorno: `ADMIN_USER` (sugerido `usuario`), `ADMIN_PASSWORD_HASH` (scrypt con sal, formato `scrypt$N$r$p$sal$hash`), `SESSION_SECRET`.
- `POST /api/auth/login`: compara con `timingSafeEqual`. Si es correcto, JWT HS256 (`sub`, `iat`, `exp` 8 h) en cookie `coveria_session` con `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- `POST /api/auth/logout`: borra la cookie.
- Dos capas: `proxy.ts` (filtro rapido) y `requireSession()` dentro de `/api/chat` y paginas privadas.
- Fuerza bruta: 5 fallos por IP en 15 min bloquean 15 min (E429). Mensaje unico para usuario o contraseña incorrectos. Retraso fijo de ~300 ms en fallos.
- Uso: `MAX_CONSULTAS_POR_HORA` por sesion y por IP, contado en Postgres.

| Ruta | Acceso |
|------|--------|
| `/login`, `/api/auth/*` | publico |
| `/`, `/runs/*`, `/api/chat` | sesion |
| `/api/mcp` (opcional) | `MCP_TOKEN` |

Pantalla `/login`:
- Titulo "CoverIA". Texto: "Acceso para evaluadores. Usa las credenciales del correo de entrega."
- Campos "Usuario" y "Contraseña". Boton "Entrar".
- Error: "Usuario o contraseña incorrectos." Bloqueo: "Demasiados intentos. Intenta de nuevo en 15 minutos."

Entrega: credenciales solo en el correo a hackiathon@viamatica.com. Rotar `ADMIN_PASSWORD_HASH` y `SESSION_SECRET` al terminar la evaluacion.

## B.10 Base de datos

```sql
create extension if not exists pg_trgm;

create table polizas (
  numero_poliza        text primary key,
  plan                 text not null check (plan in ('BRONCE','PLATA','ORO')),
  estado               text not null check (estado in ('ACTIVA','INACTIVA','SUSPENDIDA')),
  vigente_desde        date not null,
  vigente_hasta        date not null,
  deducible_anual      integer not null,
  deducible_consumido  integer not null
);

create table coberturas (
  plan               text not null,
  especialidad       text not null,
  cubierto           boolean not null,
  cobertura_pct      integer not null check (cobertura_pct between 0 and 100),
  copago_fijo        integer not null,
  aplica_deducible   boolean not null,
  limite_anual_info  text,
  primary key (plan, especialidad)
);

create table hospitales (
  hospital_id  text primary key,
  nombre       text not null,
  provincia    text not null,
  ciudad       text not null,
  rating       numeric(2,1) not null,
  en_red       boolean not null
);

create table tarifas (
  hospital_id   text references hospitales(hospital_id),
  especialidad  text not null,
  tarifa        integer not null,
  primary key (hospital_id, especialidad)
);

create table sintomas (
  id            text primary key,
  sintoma       text not null,
  sinonimos     text not null default '',
  especialidad  text not null,
  prioridad     text not null check (prioridad in ('ALTA','MEDIA','BAJA')),
  bandera_roja  boolean not null default false
);
create index sintomas_trgm on sintomas using gin ((sintoma || ' ' || sinonimos) gin_trgm_ops);

create table runs (
  run_id      uuid primary key,
  created_at  timestamptz not null default now(),
  urgente     boolean not null default false,
  total_ms    integer
);

create table run_events (
  id        bigserial primary key,
  run_id    uuid references runs(run_id),
  seq       integer not null,
  tipo      text not null check (tipo in ('llm','herramienta','subpaso','urgencia','error')),
  nombre    text not null,
  estado    text not null,
  ms        integer,
  resumen   text,
  payload   jsonb
);

create table rate_limits (
  clave   text primary key,
  conteo  integer not null,
  expira  timestamptz not null
);
```

Montos en centavos. `run_events.payload` no guarda texto libre del paciente.

Especialidades (enum en `lib/catalogo.ts`):
MEDICINA_GENERAL, PEDIATRIA, GINECOLOGIA, CARDIOLOGIA, DERMATOLOGIA, ORTOPEDIA, NEUROLOGIA, GASTROENTEROLOGIA, PSICOLOGIA, PSIQUIATRIA, OTORRINOLARINGOLOGIA, OFTALMOLOGIA, UROLOGIA, FISIOTERAPIA, EMERGENCIA.

Test de consistencia: toda especialidad de `sintomas` tiene cobertura en los 3 planes y al menos 2 hospitales en red con tarifa.

### Datos de Panama (`scripts/seed.ts`, semilla fija)

| Provincia | Ciudad | Hospitales |
|-----------|--------|------------|
| Panama | Ciudad de Panama | 5 |
| Panama | San Miguelito | 1 |
| Panama Oeste | La Chorrera | 2 |
| Colon | Colon | 1 |
| Chiriqui | David | 2 |
| Cocle | Penonome | 1 |
| Herrera | Chitre | 1 |
| Veraguas | Santiago | 1 |
| Bocas del Toro | Changuinola | 1 |

- Nombres de hospitales y aseguradora ficticios ("Aseguradora Istmo Demo"). Test contra una lista de nombres reales a evitar.
- Tarifas sinteticas: general $40 a $90; especialista $80 a $180; emergencia $150 a $400. No representan precios reales.
- Copagos: BRONCE $25, PLATA $20, ORO $15; emergencia $50, $40, $30.
- Deducibles: $0, $250, $500, $1,000 con consumo variado.
- ~60 polizas, 45 coberturas, 15 hospitales, ~150 tarifas, ~80 sintomas.
- Polizas reservadas:
  - POL-2026-0001: ORO, activa, deducible consumido.
  - POL-2026-0002: PLATA, activa, deducible parcial.
  - POL-2026-0003: BRONCE, activa, deducible completo pendiente.
  - POL-2026-0004: inactiva.
  - POL-2026-0005: vencida.
- Sinonimos con expresiones coloquiales de Panama; dejar una nota en README pidiendo validacion humana.
- Formato: `$42.00`, `$1,000.00`; fechas `dd/mm/aaaa`; zona `America/Panama`.
- Emergencias 911. Linea de salud mental 169 del MINSA (fuentes de 2020 y 2021; verificar vigencia antes de publicar).

### Neon en plan gratis

- El computo se suspende tras 5 minutos sin actividad. En plan gratis no se puede cambiar.
- Se reactiva solo con la siguiente consulta, normalmente en unos cientos de milisegundos. La app sigue funcionando cuando el jurado entra; la primera consulta tarda un poco mas.
- Cuota: 100 CU-horas por proyecto al mes. Si se agota, el computo queda suspendido hasta el siguiente periodo. Con uso de demo no deberia agotarse.
- No crear un cron que mantenga la base despierta: 0.25 CU todo el mes son unas 180 CU-horas y agotarian la cuota.
- `lib/db.ts`: un reintento con espera corta si la primera conexion falla.
- La base es de 0.5 GB en plan gratis; los datos de la demo ocupan muy poco.

## B.11 Interfaz

### Direccion visual

Senaletica hospitalaria: lineas de color en el piso que guian al paciente. Cada herramienta del agente es una estacion con su color y cada consulta dibuja su recorrido.

| Token | Hex | Uso |
|-------|-----|-----|
| sala | `#E9EFF2` | fondo |
| superficie | `#FFFFFF` | paneles |
| tinta | `#16384A` | texto y trazos |
| linea-agente | `#2F6FDE` | CoverIA (el agente) |
| linea-sintomas | `#8A4FD8` | buscar_sintomas |
| linea-poliza | `#E3A600` | buscar_poliza |
| linea-red | `#12946A` | cotizar |
| urgencia | `#D62839` | solo urgencias y errores |

Verificar contraste AA; usar variantes mas oscuras para texto sobre color.

Tipografia: Atkinson Hyperlegible Next (Google Fonts), pesos 400, 600, 800, cifras tabulares. Alternativa: Atkinson Hyperlegible. Escala 14 / 16 / 20 / 28 / 44 px. Maximo 70 caracteres por linea.

Radios: paneles 4 px, chips redondos, estaciones circulares. Sin sombras; separacion por color y trazos de 2 px.

Evitar: fondo crema con serif y acento terracota; fondo negro con acento neon; tarjetas identicas con sombra suave; etiquetas en mayusculas espaciadas; monoespaciada en etiquetas; flechas en botones; puntos medios entre metadatos; degradados decorativos.

### Layout escritorio

```
+----------------------------------------------------------------------+
| CoverIA            Ver detalles tecnicos [ interruptor ]      Salir  |
+----------------------------+-----------------------------------------+
| Conversacion               | Recorrido de tu consulta                |
|                            |                                         |
|  burbujas                  |  (CoverIA)====azul====(Poliza)          |
|                            |      |                                  |
|                            |    morado                               |
|                            |      |                                  |
|                            |  (Sintomas)                             |
|                            |      |                                  |
|                            |    verde==(Cobertura)-(Red)-(Calculo)   |
|                            |                                         |
|                            | Pasos                                   |
|                            |  1 Validar poliza          180 ms       |
|                            |  2 Buscar sintomas         240 ms       |
|                            |  3 Cotizar                 410 ms       |
|                            +-----------------------------------------+
| [ Describe tu sintoma    ] | Tu estimacion                           |
| chips de ejemplo           | Pagarias $42.00 en Clinica Altos del Rio|
+----------------------------+-----------------------------------------+
```

Todo alineado a la izquierda.

### Componentes

- Recorrido (SVG propio): estaciones fijas; cada llamada traza su tramo mientras corre y queda solido al terminar; errores en color urgencia con su codigo; estacion activa con un anillo que late (unica animacion no solicitada); sin animacion con `prefers-reduced-motion`.
- Pasos: lista numerada con frase simple, duracion y, con "Ver detalles tecnicos", entrada y salida JSON.
- Estimacion: frase con la cifra dentro del texto; tabla de hasta 3 hospitales (nombre, ciudad, rating, tarifa, total a pagar), el primero marcado "Mas economico"; desglose plegable; limite anual informativo; disclaimer.
- Aviso de urgencia fijo sobre el chat.
- `/runs/[id]`: repeticion de una consulta desde `run_events`, enlazada desde cada estimacion.

### Movil

Pestanas "Conversacion" y "Recorrido". Franja superior con puntos de color que se encienden segun la herramienta activa. La estimacion aparece dentro de la conversacion.

### Textos

- Boton "Consultar". Reinicio "Nueva consulta". Salida "Salir".
- Estado vacio: "Cuentanos que sientes y tu numero de poliza." Chips: "Me duele la rodilla, POL-2026-0001", "Tengo fiebre y tos en David, POL-2026-0002", "Dolor fuerte en el pecho, POL-2026-0003".
- Errores con que paso y que hacer: "No encontramos la poliza POL-9999-0000. Revisa el numero en tu carnet. Codigo E001."

### Calidad

Responsive hasta 360 px, foco visible, contraste AA, `lang="es-PA"`.

## B.12 Errores

| Codigo | Descripcion |
|--------|-------------|
| E001 | No se encontro la poliza |
| E002 | Poliza inactiva o fuera de vigencia |
| E003 | No existe cobertura definida para la especialidad |
| E005 | No fue posible identificar la especialidad |
| E101 | Beneficio no cubierto por el plan |
| E102 | No hay hospitales de la red para la especialidad |
| E201 | El modelo no respondio a tiempo |
| E203 | Error al consultar la base de datos |
| E204 | Error interno durante el calculo |
| E401 | Sesion requerida o vencida |
| E429 | Limite de consultas o de intentos de acceso alcanzado |

## B.13 Estructura del repositorio

```
coveria-hackiathon/
  app/
    layout.tsx
    page.tsx
    login/page.tsx
    runs/[id]/page.tsx
    api/
      auth/login/route.ts
      auth/logout/route.ts
      chat/route.ts
      mcp/route.ts               # opcional, fase 10
  components/
    Chat.tsx
    Recorrido.tsx
    Pasos.tsx
    Estimacion.tsx
    AvisoUrgencia.tsx
  lib/
    agente.ts                    # prompt, herramientas, modelo
    herramientas/
      buscar-poliza.ts
      buscar-sintomas.ts
      cotizar.ts
    pago.ts
    urgencias.ts
    guarda-montos.ts
    catalogo.ts
    errores.ts
    eventos.ts
    auth.ts
    limites.ts
    db.ts
    formato.ts                   # moneda y fecha es-PA
  db/schema.sql
  scripts/
    seed.ts
    hash-password.ts
    smoke.ts
    evals.ts
  tests/
    pago.test.ts
    urgencias.test.ts
    catalogo.test.ts
    herramientas.test.ts
    auth.test.ts
    formato.test.ts
  evals/
    sintomas.jsonl
    urgencias.jsonl
  proxy.ts
  next.config.ts
  .env.example
  .gitignore
  PROGRESS.md
  README.md
  LICENSE
```

Scripts en `package.json`: `dev`, `build`, `start`, `test`, `db:setup`, `hash-password`, `smoke`, `evals`.

## B.14 Variables de entorno (`.env.example`)

```
LLM_PROVIDER=
LLM_API_KEY=
MODEL_AGENTE=

DATABASE_URL=

ADMIN_USER=usuario
ADMIN_PASSWORD_HASH=
SESSION_SECRET=
SESSION_HORAS=8

TZ_APP=America/Panama
EMERGENCY_NUMBER=911
CRISIS_LINE=169
MAX_CONSULTAS_POR_HORA=20
MAX_INTENTOS_LOGIN=5

MCP_TOKEN=
```

## B.15 Pruebas

Unitarias (`npm test`):
- `pago.test.ts`: 9 casos y propiedades.
- `urgencias.test.ts`: frases positivas y negativas.
- `catalogo.test.ts`: consistencia y nombres ficticios.
- `herramientas.test.ts`: E001, E002 (inactiva y vencida), E003, E101, E102, filtro de ciudad con fallback.
- `auth.test.ts`: hash scrypt, JWT vencido, firma invalida, bloqueo tras 5 fallos.
- `formato.test.ts`: `$42.00`, `$1,000.00`, `dd/mm/aaaa`.

Evals (`npm run evals`, con LLM real):
- Precision de especialidad en `evals/sintomas.jsonl` (~30 casos). Meta propuesta: 90% o mas.
- Recall de urgencias en `evals/urgencias.jsonl` (~15 casos). Meta: 100%.
- Cifras no respaldadas en texto: 0.
- Latencia p50 por consulta. Registrar en README.

Smoke tests de produccion: ver A.8.

## B.16 Riesgos

| Riesgo | Mitigacion |
|--------|------------|
| Neon suspendido al entrar el jurado | Se reactiva solo; reintento en `db.ts` |
| Cuota de Neon agotada | Sin cron de calentamiento; uso de demo es bajo |
| Gasto del LLM por abuso | Login, limite por sesion e IP, `maxOutputTokens` bajo, limite de gasto en el proveedor |
| Secretos en el repo | `.gitignore` desde el primer commit y revision antes de cada push |
| Terminos de Neon sin aceptar | Paso humano previo A.2 y comprobacion 14 del preflight |
| Cambios de API en librerias | Seguir documentacion actual y anotar en `PROGRESS.md` |
| Uso comercial en Hobby | Proyecto personal de concurso; no agregar pagos ni anuncios |

## B.17 README (contenido minimo)

- Enlace publico. Aviso: el acceso requiere credenciales enviadas por correo.
- Polizas de demo.
- Como cumple cada punto del reto.
- Diagrama de arquitectura y lista de herramientas.
- Por que un solo agente: flujo corto y secuencial; menos latencia, costo y puntos de falla que un sistema multiagente.
- Formula de pago y casos de prueba.
- Resultados de evals y latencia.
- Como correr local: `npm install`, `vercel env pull .env.local`, `npm run db:setup`, `npm run dev`.
- Endpoint MCP opcional y como conectarlo.
- Limitaciones: datos sinteticos, aseguradora ficticia, no es diagnostico, estimacion referencial, sinonimos pendientes de validacion humana.

## B.18 Cambios vs v4.1

| Tema | v4.1 | v5.0 |
|------|------|------|
| Arquitectura | 4 agentes con A2A y MCP interno | 1 agente con 3 herramientas en proceso; MCP externo opcional |
| Ejecucion | Plan de 5 dias para personas | Instrucciones para agente de codigo no supervisado con preflight, carpeta propia, sync con GitHub y smoke tests |
| Infraestructura | Dashboard manual | Vercel CLI y `vercel integration add neon` |
| Neon | Nota general de reactivacion | Comportamiento del plan gratis, cuota y prohibicion de cron de calentamiento |
| UI | Estaciones por agente | Estaciones por herramienta, mismo lenguaje visual |
