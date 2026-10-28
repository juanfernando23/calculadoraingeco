/* sw.js
 * Trabajador de la app instalable: guarda una copia de los archivos para que la calculadora
 * funcione sin internet. Solo actúa cuando la app está publicada (https); abierta con doble
 * clic (file://) no se usa.
 *
 * Estrategia: primero la red, para que con conexión siempre se vea la última versión
 * publicada; si no hay conexión (o tarda demasiado), la copia guardada. Cada respuesta buena
 * de la red actualiza la copia, así que al cambiar un archivo no hace falta tocar este.
 * Solo si se agregan o se quitan archivos: actualizar ARCHIVOS y subir VERSION.
 */

const VERSION = "calculadora-v3";
const ARCHIVOS = [
  "./",
  "index.html",
  "estilos.css",
  "finanzas.js",
  "animaciones.js",
  "diagramas.js",
  "visuales.js",
  "voz.js",
  "app.js",
  "formularios.js",
  "conversion.js",
  "indexadas.js",
  "anualidades.js",
  "validacion.js",
  "pruebas.html",
  "pruebas.js",
  "manifest.webmanifest",
  "iconos/icono.svg",
  "iconos/icono-192.png",
  "iconos/icono-512.png",
  "iconos/icono-maskable-512.png",
  "iconos/apple-touch-icon.png",
];
const ESPERA_RED = 4000; // ms: con una conexión muy lenta se usa la copia guardada

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      .then((copia) => copia.addAll(ARCHIVOS.map((archivo) => new Request(archivo, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

// Al estrenar una versión, se borran las copias de las anteriores.
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((nombre) => nombre !== VERSION).map((nombre) => caches.delete(nombre))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  // "no-cache": se pregunta al servidor si el archivo cambió (si no cambió, la respuesta es mínima).
  const red = fetch(request.url, { cache: "no-cache", credentials: "same-origin" });
  // Cada respuesta buena actualiza la copia, aunque llegue después de usar la guardada.
  evento.waitUntil(
    red
      .then((respuesta) => {
        if (!respuesta.ok) return;
        const duplicado = respuesta.clone(); // antes de que la página lea la respuesta
        return caches.open(VERSION).then((copia) => copia.put(request, duplicado));
      })
      .catch(() => {})
  );
  evento.respondWith(responder(request, red));
});

async function responder(request, red) {
  try {
    return await Promise.race([red, new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("red lenta")), ESPERA_RED))]);
  } catch (error) {
    const copia = await caches.open(VERSION);
    const guardada = (await copia.match(request, { ignoreSearch: true })) || (request.mode === "navigate" ? await copia.match("index.html") : undefined);
    return guardada || red; // sin copia, se espera a la red de todos modos
  }
}
