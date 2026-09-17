export interface CiudadCentro {
  ciudad: string;
  lat: number;
  lon: number;
}

// Centroides aproximados de las ciudades presentes en la red de hospitales
// (ver scripts/seed.ts). Solo se usan para elegir una ciudad por defecto a
// partir de la geolocalizacion del navegador; el paciente siempre puede
// mencionar otra ciudad en el chat para sobreescribirla.
export const CIUDADES: CiudadCentro[] = [
  { ciudad: "Ciudad de Panama", lat: 8.9824, lon: -79.5199 },
  { ciudad: "San Miguelito", lat: 9.0333, lon: -79.5 },
  { ciudad: "La Chorrera", lat: 8.88, lon: -79.7833 },
  { ciudad: "Colon", lat: 9.3547, lon: -79.9014 },
  { ciudad: "David", lat: 8.4333, lon: -82.4333 },
  { ciudad: "Penonome", lat: 8.5167, lon: -80.35 },
  { ciudad: "Chitre", lat: 7.9667, lon: -80.4333 },
  { ciudad: "Santiago", lat: 8.1, lon: -80.9833 },
  { ciudad: "Changuinola", lat: 9.4306, lon: -82.5219 },
];

function distanciaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Ciudad de la red mas cercana a una coordenada dada. Logica pura y testeable. */
export function ciudadMasCercana(lat: number, lon: number): string {
  let mejor = CIUDADES[0];
  let mejorDistancia = distanciaKm({ lat, lon }, mejor);
  for (const candidata of CIUDADES.slice(1)) {
    const distancia = distanciaKm({ lat, lon }, candidata);
    if (distancia < mejorDistancia) {
      mejor = candidata;
      mejorDistancia = distancia;
    }
  }
  return mejor.ciudad;
}
