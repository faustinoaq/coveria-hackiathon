create extension if not exists pg_trgm;

create table if not exists polizas (
  numero_poliza        text primary key,
  plan                 text not null check (plan in ('BRONCE','PLATA','ORO')),
  estado               text not null check (estado in ('ACTIVA','INACTIVA','SUSPENDIDA')),
  vigente_desde        date not null,
  vigente_hasta        date not null,
  deducible_anual      integer not null,
  deducible_consumido  integer not null
);

create table if not exists coberturas (
  plan               text not null,
  especialidad       text not null,
  cubierto           boolean not null,
  cobertura_pct      integer not null check (cobertura_pct between 0 and 100),
  copago_fijo        integer not null,
  aplica_deducible   boolean not null,
  limite_anual_info  text,
  primary key (plan, especialidad)
);

create table if not exists hospitales (
  hospital_id  text primary key,
  nombre       text not null,
  provincia    text not null,
  ciudad       text not null,
  rating       numeric(2,1) not null,
  en_red       boolean not null
);

create table if not exists tarifas (
  hospital_id   text references hospitales(hospital_id),
  especialidad  text not null,
  tarifa        integer not null,
  primary key (hospital_id, especialidad)
);

create table if not exists sintomas (
  id            text primary key,
  sintoma       text not null,
  sinonimos     text not null default '',
  especialidad  text not null,
  prioridad     text not null check (prioridad in ('ALTA','MEDIA','BAJA')),
  bandera_roja  boolean not null default false
);
create index if not exists sintomas_trgm on sintomas using gin ((sintoma || ' ' || sinonimos) gin_trgm_ops);

create table if not exists runs (
  run_id      uuid primary key,
  created_at  timestamptz not null default now(),
  urgente     boolean not null default false,
  total_ms    integer
);

create table if not exists run_events (
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

create table if not exists rate_limits (
  clave   text primary key,
  conteo  integer not null,
  expira  timestamptz not null
);
