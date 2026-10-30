/* app.js
 * Interfaz de la calculadora: navegación, lectura y validación de datos, y presentación
 * de resultados. Los cálculos vienen de finanzas.js, las animaciones de animaciones.js y la
 * narración en voz alta de voz.js.
 */

const $ = (id) => document.getElementById(id);

// ===================== Formato de números =====================

// Regla de la app: los porcentajes siempre con 2 decimales y el dinero sin decimales; el tiempo
// (n), entero o con 2 decimales. Dentro de las fórmulas los números van completos (i = 0,015;
// 1,015²⁴ = 1,42950281), para poder comprobar las cuentas a mano.
const formatoPesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const formatoPesosLeidos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const formatoDos = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const formatoHastaCuatro = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 });
const formatoHastaOcho = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 8 });
const formatoHastaDos = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const formatoCompacto = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const formatoEntrada = new Intl.NumberFormat("es-CO", { useGrouping: false, maximumFractionDigits: 6 });

const esEntero = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const pesos = (valor) => formatoPesos.format(valor); // $ 14.295.028
const pesosLeidos = (valor) => formatoPesosLeidos.format(valor); // $ 1.500.000,5: como se escribió ("Se leyó como")
const porcentaje = (tasa) => `${formatoDos.format(tasa * 100)} %`; // 1,50 %
const decimal = (x) => formatoHastaOcho.format(x); // 0,01388843 (en las fórmulas)
const cifra = (x) => formatoHastaDos.format(x); // 10.000.000 (en las fórmulas)
const pesosCompacto = (valor) => `$ ${formatoCompacto.format(valor)}`; // $ 5 M
const exponente = (n) => formatoHastaCuatro.format(n); // 24 · 2,5 (en las fórmulas)
const cantidadPeriodos = (n) => (esEntero(n) ? cifra(Math.round(n)) : formatoDos.format(n)); // 24 · 27,23
const textoDeEntrada = (x) => formatoEntrada.format(x); // 1,55 · 10000000: como se escribe en el formulario
const factor = (x) => `× ${formatoHastaDos.format(x)}`; // × 1,65
const sinRuido = (x) => Math.round(x * 1e9) / 1e9; // 0.07 * 100 = 7.000000000000001 → 7

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// ===================== Lectura de números =====================

// Lee lo que escribió el usuario. Acepta coma o punto decimal y rechaza los puntos de
// miles ("1.500.000"), que se confunden con decimales. Ignora "$", "%" y espacios.
function leerNumero(texto) {
  const limpio = texto.replace(/[\s$%]/g, "");
  if (limpio === "") return { vacio: true };
  if ((limpio.match(/[.,]/g) || []).length > 1) {
    return { error: "Escribe el número sin puntos de miles. Ejemplo: 1500000,50" };
  }
  const normalizado = limpio.replace(",", ".");
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(normalizado)) {
    return { error: "Escribe solo números. Para decimales usa coma o punto." };
  }
  // "1.500" se lee como 1,5: se avisa por si la persona quería escribir mil quinientos.
  return { valor: Number(normalizado), ambiguo: /^\d{1,3}[.,]\d{3}$/.test(limpio) };
}

// ===================== Periodos y descripciones =====================

// nombreTasa: la tasa efectiva de ese periodo, como la llama la hoja de clase: la de un periodo
// menor que el año es la periódica (i_p); la del año, la efectiva anual (i_ea).
const PERIODICIDADES = {
  52: { singular: "semana", plural: "semanas", adjetivo: "semanal", nombreTasa: "periódica semanal", femenino: true },
  24: { singular: "quincena", plural: "quincenas", adjetivo: "quincenal", nombreTasa: "periódica quincenal", femenino: true },
  12: { singular: "mes", plural: "meses", adjetivo: "mensual", nombreTasa: "periódica mensual" },
  6: { singular: "bimestre", plural: "bimestres", adjetivo: "bimestral", nombreTasa: "periódica bimestral" },
  4: { singular: "trimestre", plural: "trimestres", adjetivo: "trimestral", nombreTasa: "periódica trimestral" },
  3: { singular: "cuatrimestre", plural: "cuatrimestres", adjetivo: "cuatrimestral", nombreTasa: "periódica cuatrimestral" },
  2: { singular: "semestre", plural: "semestres", adjetivo: "semestral", nombreTasa: "periódica semestral" },
  1: { singular: "año", plural: "años", adjetivo: "anual", nombreTasa: "efectiva anual" },
};

// Tipo de tasa en los formularios: en pantalla hay tres, los de la hoja de clase (sección 1):
// periódica, nominal y efectiva anual. En los cálculos (convertirTasa) hay dos: la periódica
// y la efectiva anual son "efectiva", de m periodos por año o de uno solo.
function formaElegida(tipo, periodo, modalidad) {
  if (tipo === "nominal") return { tipo, m: Number(periodo), modalidad };
  return { tipo: "efectiva", m: tipo === "anual" ? 1 : Number(periodo), modalidad };
}

// Lo contrario, para llenar un formulario: { tipo en pantalla, periodo }. También entiende los
// cálculos guardados antes de los tres tipos ("efectiva", o una nominal capitalizable cada año,
// que es la misma efectiva anual).
function tipoEnPantalla(tipo, periodo) {
  if (tipo === "anual" || String(periodo) === "1") return { tipo: "anual", periodo: "1" };
  return { tipo: tipo === "nominal" ? "nominal" : "periodica", periodo: String(periodo) };
}

// El periodo sigue al tipo: con la efectiva anual queda fijo en "Anual"; con la periódica y la
// nominal, "Anual" no se ofrece (sería otra vez la efectiva anual) y la etiqueta dice "Periodo
// de la tasa" o "Capitalización".
function ajustarPeriodoDeTasa(selector, etiqueta, tipo) {
  const anual = tipo === "anual";
  const opcionAnual = selector.querySelector('option[value="1"]');
  if (anual && selector.value !== "1") selector.dataset.anterior = selector.value;
  opcionAnual.disabled = opcionAnual.hidden = !anual;
  if (anual) selector.value = "1";
  else if (selector.value === "1") selector.value = selector.dataset.anterior || "12";
  selector.disabled = anual;
  etiqueta.textContent = tipo === "nominal" ? "Capitalización" : "Periodo de la tasa";
}

// "18 % nominal anual mes vencido", "1,5 % periódica mensual", "3 % periódica mensual anticipada"
function describirTasa(tasa) {
  const p = PERIODICIDADES[tasa.m];
  const valor = porcentaje(tasa.valor);
  if (tasa.tipo === "nominal") {
    const sufijo = p.femenino ? "a" : "o"; // "mes vencido", "quincena vencida"
    return `${valor} nominal anual ${p.singular} ${tasa.modalidad === "anticipada" ? "anticipad" : "vencid"}${sufijo}`;
  }
  return `${valor} ${p.nombreTasa}${tasa.modalidad === "anticipada" ? " anticipada" : ""}`;
}

// "24 meses", "1 año", "2,5 años"
function describirTiempo(n, m) {
  const p = PERIODICIDADES[m];
  return `${cantidadPeriodos(n)} ${esEntero(n) && Math.round(n) === 1 ? p.singular : p.plural}`;
}

// "al final del mes 24" o "dentro de 2,5 años"
function momentoFinal(n, m) {
  const p = PERIODICIDADES[m];
  return esEntero(n) ? `al final del ${p.singular} ${cifra(Math.round(n))}` : `dentro de ${describirTiempo(n, m)}`;
}

// Piezas para escribir fórmulas en HTML. Solo reciben números ya formateados.
const variable = (nombre, subindice) => `<var>${nombre}</var>${subindice ? `<sub>${subindice}</sub>` : ""}`;
const insignia = (numero) => `<span class="insignia">${numero}</span>`;
const formula = (html) => `<span class="formula">${html}</span>`;

const NOMBRES_CONVERSION = {
  "1.1": "Nominal → periódica",
  "3.2": "Anticipada → vencida",
  "1.5": "Periódica → efectiva anual",
  "1.6": "Efectiva anual → periódica",
  "3.1": "Vencida → anticipada",
  "1.2": "Periódica → nominal",
};

function expresionConversion(paso) {
  const e = decimal(paso.entrada);
  const r = decimal(paso.valor);
  const m = paso.m;
  switch (paso.formula) {
    case "1.1": return `${variable("i", "p")} = ${variable("i", "n")} / ${variable("m")} = ${e} / ${m} = ${r}`;
    case "3.2": return `${variable("i", "v")} = ${variable("i", "a")} / (1 − ${variable("i", "a")}) = ${e} / (1 − ${e}) = ${r}`;
    case "1.5": return `${variable("i", "ea")} = (1 + ${variable("i", "p")})<sup>${variable("m")}</sup> − 1 = (1 + ${e})<sup>${m}</sup> − 1 = ${r}`;
    case "1.6": return `${variable("i", "p")} = (1 + ${variable("i", "ea")})<sup>1/${variable("m")}</sup> − 1 = (1 + ${e})<sup>1/${m}</sup> − 1 = ${r}`;
    case "3.1": return `${variable("i", "a")} = ${variable("i", "v")} / (1 + ${variable("i", "v")}) = ${e} / (1 + ${e}) = ${r}`;
    case "1.2": return `${variable("i", "n")} = ${variable("i", "p")} · ${variable("m")} = ${e} · ${m} = ${r}`;
    default: return "";
  }
}

// ===================== Navegación y tema =====================

const PANTALLAS = {
  inicio: { titulo: "Calculadora Financiera", volver: false, nav: "inicio" },
  "interes-compuesto": { titulo: "Interés compuesto", volver: true, nav: "inicio" },
  "conversion-tasas": { titulo: "Conversión de tasas", volver: true, nav: "inicio" },
  "tasas-indexadas": { titulo: "Tasas indexadas", volver: true, nav: "inicio" },
  // La vencida y la anticipada comparten la pantalla: cambian las fórmulas y el diagrama.
  "anualidad-vencida": { titulo: "Anualidad vencida", volver: true, nav: "inicio", pantalla: "anualidad" },
  "anualidad-anticipada": { titulo: "Anualidad anticipada", volver: true, nav: "inicio", pantalla: "anualidad" },
  "anualidad-perpetua": { titulo: "Anualidad perpetua", volver: true, nav: "inicio" },
  historial: { titulo: "Historial", volver: false, nav: "historial" },
  ayuda: { titulo: "Ayuda", volver: false, nav: "ayuda" },
  acerca: { titulo: "Acerca de", volver: false, nav: "acerca" },
  validacion: { titulo: "Validación", volver: true, nav: "acerca", volverA: "acerca" },
};

// Profundidad de cada pantalla: decide si la transición va hacia adelante o hacia atrás.
// Las de profundidad 1 son los módulos y la validación (que se abre desde Acerca de).
const PROFUNDIDAD = {
  inicio: 0,
  historial: 0,
  ayuda: 0,
  acerca: 0,
  "interes-compuesto": 1,
  "conversion-tasas": 1,
  "tasas-indexadas": 1,
  "anualidad-vencida": 1,
  "anualidad-anticipada": 1,
  "anualidad-perpetua": 1,
  validacion: 1,
};

// ===================== Módulos =====================

// Interés compuesto vive en este archivo; los demás módulos se registran desde su propio
// archivo (conversion.js, indexadas.js, anualidades.js) con:
//   id                 la ruta (#conversion-tasas…)
//   formulario         su <form>
//   calcular()         valida y devuelve el resultado listo para mostrar, o null si hay errores
//   limpiar()          deja el formulario vacío
//   alEntrar()         opcional: al abrir su pantalla
//   ysi                ganchos de "¿Y si…?" (ver más abajo), o null
// El resultado (v) tiene la misma forma que el de interés compuesto, más:
//   modulo, visual: { tipo, datos, titulo }, resumen (para el historial) y calculo (los datos).
const MODULOS = {};

function registrarModulo(modulo) {
  MODULOS[modulo.id] = modulo;
}

const moduloDelResultado = (v) => (v?.modulo ? MODULOS[v.modulo] : null);
const esRutaDeModulo = (ruta) => ruta === "interes-compuesto" || Boolean(MODULOS[ruta]);

// Calcula con lo que está escrito en el módulo que se está mostrando.
function calcularActual() {
  const modulo = moduloDelResultado(resultadoActual) || MODULOS[rutaActual];
  if (modulo) calcularModulo(modulo);
  else calcular();
}

function calcularModulo(modulo) {
  const v = modulo.calcular();
  if (!v) return;
  vibrar(14);
  cerrarYSi(); // el cálculo nuevo es la base de cualquier "¿Y si…?"
  mostrarResultado(v);
  guardarEnHistorial(v);
}

// La sección del resultado es una sola: se lleva a la pantalla del módulo que se abre. El último
// resultado de cada módulo se recuerda, para mostrarlo otra vez al volver.
const resultadosGuardados = {};

function entrarAlModulo(ruta) {
  const actual = resultadoActual ? resultadoActual.modulo || "interes-compuesto" : null;
  if (actual !== ruta) {
    if (resultadoActual) resultadosGuardados[actual] = resultadoActual;
    ocultarResultado();
    $(`pantalla-${PANTALLAS[ruta].pantalla || ruta}`).append(ui.resultado);
  }
  MODULOS[ruta]?.alEntrar?.();
  if (actual !== ruta && resultadosGuardados[ruta]) mostrarResultado(resultadosGuardados[ruta], { desplazar: false });
}

const barraSuperior = $("barra-superior");
let observadorTitulo = null;
let rutaActual = null;
let trasNavegar = null; // algo que hacer cuando termine la transición de pantalla (abrir un cálculo del historial)

function rutaDelEnlace() {
  const ruta = location.hash.replace("#", "") || "inicio";
  return PANTALLAS[ruta] ? ruta : "inicio";
}

// Cambia de pantalla con una transición: la tarjeta del inicio se transforma en el
// encabezado del módulo (View Transitions). Sin ese soporte, la pantalla solo aparece.
function navegar() {
  const destino = rutaDelEnlace();
  if (destino === rutaActual) {
    ejecutarTrasNavegar();
    return;
  }
  const antes = PROFUNDIDAD[rutaActual] ?? 0;
  const despues = PROFUNDIDAD[destino];
  document.documentElement.dataset.direccion = despues > antes ? "adelante" : despues < antes ? "atras" : "lado";
  if (rutaActual === null || !document.startViewTransition) {
    mostrarRuta(destino, true);
    ejecutarTrasNavegar();
    return;
  }
  const transicion = document.startViewTransition(() => mostrarRuta(destino, false));
  transicion.ready.catch(() => {}); // si se interrumpe por otra navegación, no es un error
  transicion.finished.catch(() => {}).finally(ejecutarTrasNavegar);
}

// Va a una pantalla; si ya está en ella, igual hace lo que quedó pendiente (trasNavegar).
function irARuta(ruta) {
  if (location.hash === `#${ruta}`) navegar();
  else location.hash = `#${ruta}`;
}

function ejecutarTrasNavegar() {
  const funcion = trasNavegar;
  trasNavegar = null;
  if (funcion) requestAnimationFrame(funcion);
}

function mostrarRuta(ruta, animarEntrada) {
  rutaActual = ruta;
  const config = PANTALLAS[ruta];
  if (vozEncendida) apagarVoz(); // la explicación en voz alta no sigue en otra pantalla

  for (const pantalla of document.querySelectorAll(".pantalla")) {
    const activa = pantalla.id === `pantalla-${config.pantalla || ruta}`;
    pantalla.hidden = !activa;
    if (activa) {
      if (animarEntrada) reiniciarAnimacion(pantalla, "pantalla--entrando");
      observarTituloGrande(pantalla);
    }
  }
  if (ruta === "historial") pintarHistorial(true);
  if (ruta === "validacion") pintarValidacion(); // validacion.js
  if (esRutaDeModulo(ruta)) entrarAlModulo(ruta);
  window.scrollTo(0, 0);

  $("titulo-barra").textContent = config.titulo;
  $("volver").classList.toggle("oculto", !config.volver);
  $("volver").tabIndex = config.volver ? 0 : -1;
  for (const enlace of document.querySelectorAll("[data-nav]")) {
    if (enlace.dataset.nav === config.nav) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");
  }
  document.title = ruta === "inicio" ? "Calculadora Financiera" : `${config.titulo} · Calculadora Financiera`;
}

// El título de la barra superior aparece cuando el título grande sale de la vista.
function observarTituloGrande(pantalla) {
  observadorTitulo?.disconnect();
  barraSuperior.classList.remove("barra-superior--con-titulo");
  const grande = pantalla.querySelector("[data-titulo-grande]");
  if (!grande) return;
  observadorTitulo = new IntersectionObserver(
    ([entrada]) => barraSuperior.classList.toggle("barra-superior--con-titulo", !entrada.isIntersecting),
    { rootMargin: "-56px 0px 0px 0px" }
  );
  observadorTitulo.observe(grande);
}

const temaOscuroDelSistema = window.matchMedia("(prefers-color-scheme: dark)");

function temaActual() {
  return document.documentElement.dataset.theme || (temaOscuroDelSistema.matches ? "dark" : "light");
}

function actualizarControlesDeTema() {
  const oscuro = temaActual() === "dark";
  $("icono-tema").setAttribute("href", oscuro ? "#i-sol" : "#i-luna");
  $("cambiar-tema").setAttribute("aria-label", oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  const fondo = getComputedStyle(document.documentElement).getPropertyValue("--fondo").trim();
  document.querySelector('meta[name="theme-color"]').setAttribute("content", fondo);
}

// El tema nuevo se revela en un círculo que crece desde el botón.
function cambiarTema() {
  const raiz = document.documentElement;
  const boton = $("cambiar-tema");
  const nuevo = temaActual() === "dark" ? "light" : "dark";
  const aplicar = () => {
    raiz.dataset.theme = nuevo;
    try {
      localStorage.setItem("tema", nuevo);
    } catch (e) {
      /* sin almacenamiento: el tema dura hasta cerrar la página */
    }
    actualizarControlesDeTema();
    document.dispatchEvent(new Event("cambio-tema"));
  };

  if (!document.startViewTransition || movimientoReducido()) {
    raiz.classList.add("cambiando-tema");
    aplicar();
    setTimeout(() => raiz.classList.remove("cambiando-tema"), 250);
    return;
  }

  const caja = boton.getBoundingClientRect();
  const x = caja.left + caja.width / 2;
  const y = caja.top + caja.height / 2;
  const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  raiz.dataset.direccion = "tema";
  raiz.classList.add("transicion-tema");
  const transicion = document.startViewTransition(aplicar);
  transicion.ready
    .then(() => {
      raiz.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" }
      );
      boton.querySelector("svg").animate(
        [{ transform: "rotate(-120deg) scale(0.4)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 600, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
      );
    })
    .catch(() => {});
  transicion.finished.catch(() => {}).finally(() => raiz.classList.remove("transicion-tema"));
}

// Vuelve a disparar una animación CSS quitando y poniendo su clase.
function reiniciarAnimacion(elemento, clase) {
  elemento.classList.remove(clase);
  void elemento.offsetWidth;
  elemento.classList.add(clase);
}

function anunciar(texto) {
  const region = $("anuncio");
  region.textContent = "";
  requestAnimationFrame(() => (region.textContent = texto));
}

// Aviso flotante sobre la barra inferior, con una acción opcional (por ejemplo, "Deshacer").
let temporizadorAviso = 0;
let temporizadorSalidaAviso = 0;

function avisar(texto, { accion = null, alTocar = null, duracion = 4500 } = {}) {
  const caja = $("aviso-flotante");
  const boton = $("aviso-flotante-accion");
  clearTimeout(temporizadorAviso);
  clearTimeout(temporizadorSalidaAviso);
  caja.classList.remove("aviso-flotante--saliendo");
  $("aviso-flotante-texto").textContent = texto;
  boton.hidden = !accion;
  boton.textContent = accion || "";
  boton.onclick = accion
    ? () => {
        ocultarAviso();
        alTocar();
      }
    : null;
  if (caja.hidden) caja.hidden = false;
  else fundir(caja);
  temporizadorAviso = setTimeout(ocultarAviso, duracion);
}

function ocultarAviso() {
  const caja = $("aviso-flotante");
  clearTimeout(temporizadorAviso);
  if (caja.hidden) return;
  caja.classList.add("aviso-flotante--saliendo");
  temporizadorSalidaAviso = setTimeout(
    () => {
      caja.hidden = true;
      caja.classList.remove("aviso-flotante--saliendo");
    },
    movimientoReducido() ? 0 : 200
  );
}

// Fundido corto para textos que cambian (también se usa en movimiento reducido).
function fundir(elemento) {
  elemento.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
}

// Vibración muy corta (solo en celulares que la permiten, como los Android).
// Acompaña a las animaciones: con "Reducidas" tampoco vibra. El navegador la bloquea (y
// avisa con un error en la consola) si la página aún no ha recibido ningún toque.
function vibrar(patron) {
  if (movimientoReducido() || !navigator.vibrate) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  navigator.vibrate(patron);
}

// Onda que se abre desde el punto donde se tocó un botón.
function ondaAlTocar(evento) {
  if (movimientoReducido()) return;
  const boton = evento.currentTarget;
  const caja = boton.getBoundingClientRect();
  const tamano = Math.max(caja.width, caja.height) * 2.2;
  const onda = document.createElement("span");
  onda.className = "onda";
  onda.style.width = onda.style.height = `${tamano}px`;
  onda.style.left = `${evento.clientX - caja.left - tamano / 2}px`;
  onda.style.top = `${evento.clientY - caja.top - tamano / 2}px`;
  boton.append(onda);
  onda.addEventListener("animationend", () => onda.remove());
}

// ===================== Preferencia de animaciones =====================

// "auto" sigue al sistema; "siempre" muestra todas las animaciones aunque el sistema pida
// reducir el movimiento; "reducidas" deja solo fundidos.
const sistemaReduceMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
let movimientoElegido = null; // respaldo si el navegador no deja guardar

function preferenciaMovimiento() {
  if (movimientoElegido) return movimientoElegido;
  try {
    return localStorage.getItem("movimiento") || "auto";
  } catch (e) {
    return "auto";
  }
}

function aplicarMovimiento() {
  const preferencia = preferenciaMovimiento();
  const reducido = preferencia === "reducidas" || (preferencia === "auto" && sistemaReduceMovimiento.matches);
  document.documentElement.dataset.movimiento = reducido ? "reducido" : "completo";

  const sistemaLimita = preferencia === "auto" && sistemaReduceMovimiento.matches;
  let avisoDescartado = false;
  try {
    avisoDescartado = localStorage.getItem("aviso-movimiento") === "descartado";
  } catch (e) {
    /* sin almacenamiento */
  }
  $("nota-movimiento").hidden = !sistemaLimita;
  $("aviso-movimiento").hidden = !sistemaLimita || avisoDescartado;
}

function elegirMovimiento(valor) {
  movimientoElegido = valor;
  try {
    localStorage.setItem("movimiento", valor);
  } catch (e) {
    /* solo dura esta visita */
  }
  const opcion = document.querySelector(`input[name="movimiento"][value="${valor}"]`);
  if (!opcion.checked) {
    opcion.checked = true;
    opcion.dispatchEvent(new Event("change", { bubbles: true }));
  }
  aplicarMovimiento();
}

// ===================== Vista del gráfico =====================

// Cada tipo de gráfico tiene sus vistas; la elegida se recuerda en este navegador. Pistas de una
// sola línea, para que el gráfico quepa completo en la pantalla del celular.
// leyenda: [clase, texto] de cada elemento.
const LEYENDA_FLUJO = [
  ["leyenda-flecha leyenda-flecha--sale", "Sale dinero"],
  ["leyenda-flecha leyenda-flecha--entra", "Entra dinero"],
  ["leyenda-flecha leyenda-flecha--interes", "Interés"],
];
const TIPOS_GRAFICO = {
  // Interés compuesto (animaciones.js)
  crecimiento: {
    clave: "vista-grafico",
    vistas: {
      flujo: { texto: "Flujo", icono: "i-flujo", titulo: "Flujo de caja", pista: "Desliza el dedo por la línea de tiempo.", leyenda: LEYENDA_FLUJO },
      barras: { texto: "Barras", icono: "i-barras", titulo: "Crecimiento del dinero", pista: "Desliza el dedo para ver cada periodo.", leyenda: [["leyenda", "Capital"], ["leyenda leyenda--interes", "Intereses"]] },
      area: { texto: "Área", icono: "i-area", titulo: "Crecimiento del dinero", pista: "Desliza el dedo para ver cada periodo.", leyenda: [["leyenda", "Capital"], ["leyenda leyenda--interes", "Intereses"]] },
    },
  },
  // Anualidades vencida y anticipada (diagramas.js)
  pagos: {
    clave: "vista-pagos",
    vistas: {
      flujo: { texto: "Flujo", icono: "i-flujo", titulo: "Flujo de caja", pista: "Desliza el dedo por los pagos.", leyenda: LEYENDA_FLUJO },
      valor: { texto: "Cada pago", icono: "i-barras", titulo: "Lo que vale cada pago", pista: "Desliza el dedo para ver cada pago.", leyenda: [["leyenda", "Pago (A)"], ["leyenda leyenda--interes", "Intereses"]] },
    },
  },
  // Anualidad perpetua (diagramas.js)
  perpetua: {
    clave: "vista-perpetua",
    vistas: {
      flujo: { texto: "Flujo", icono: "i-flujo", titulo: "Flujo de caja", pista: "Desliza el dedo por los pagos.", leyenda: LEYENDA_FLUJO },
      suma: { texto: "Suma", icono: "i-area", titulo: "La suma que converge", pista: "Desliza el dedo para sumar pagos.", leyenda: [["leyenda", "Lo que valen hoy los pagos sumados"], ["leyenda leyenda--meta", "P = A / i"]] },
    },
  },
  // Conversión de tasas y tasas indexadas (visuales.js)
  cadena: { vistas: { pasos: { titulo: "Cadena de conversión", pista: "", leyenda: [] } } },
};
let tipoVisual = "crecimiento"; // el tipo de gráfico que tiene la tarjeta
let tituloVisual = null; // título propio del módulo (si no, el de la vista)
let leyendaConMeta = false;
const vistasElegidas = {}; // respaldo si el navegador no deja guardar

function vistaGuardada(tipo) {
  const config = TIPOS_GRAFICO[tipo];
  const primera = Object.keys(config.vistas)[0];
  if (!config.clave) return primera;
  if (vistasElegidas[tipo]) return vistasElegidas[tipo];
  try {
    const guardada = localStorage.getItem(config.clave);
    return config.vistas[guardada] ? guardada : primera;
  } catch (e) {
    return primera;
  }
}

const tipoGrafico = () => vistaGuardada("crecimiento");

// Deja la tarjeta lista para un tipo de gráfico: selector de vistas, lienzo o pasos en HTML,
// título, leyenda y pista. meta: la leyenda incluye la línea de la meta (interés compuesto, n).
function prepararTarjetaGrafico(tipo, { titulo = null, meta = false } = {}) {
  tipoVisual = tipo;
  tituloVisual = titulo;
  leyendaConMeta = meta;
  const vistas = Object.entries(TIPOS_GRAFICO[tipo].vistas);
  const selector = $("selector-vista");
  selector.hidden = vistas.length < 2;
  if (vistas.length > 1 && selector.dataset.tipo !== tipo) {
    selector.dataset.tipo = tipo;
    selector.style.setProperty("--opciones", vistas.length);
    selector.innerHTML =
      '<span class="segmentado__indicador" aria-hidden="true"></span>' +
      vistas
        .map(([valor, vista]) => `<label class="segmentado__opcion"><input type="radio" name="tipo-grafico" value="${valor}"><svg class="icono" width="16" height="16" aria-hidden="true"><use href="#${vista.icono}"/></svg>${vista.texto}</label>`)
        .join("");
  }
  const vista = vistaGuardada(tipo);
  if (vistas.length > 1) {
    selector.querySelector(`input[value="${vista}"]`).checked = true;
    actualizarSegmentado(selector);
  }
  ui.lienzo.hidden = tipo === "cadena";
  ui.visualHTML.hidden = tipo !== "cadena";
  ui.tarjetaGrafico.classList.toggle("grafico--cadena", tipo === "cadena"); // en "Explícame", el panel queda fijo abajo
  mostrarVistaGrafico(vista);
}

// Título, leyenda y pista de la tarjeta según la vista.
function mostrarVistaGrafico(valor, conFundido = false) {
  const vista = TIPOS_GRAFICO[tipoVisual].vistas[valor];
  const titulo = $("titulo-grafico");
  const texto = tituloVisual || vista.titulo;
  if (titulo.textContent !== texto) {
    titulo.textContent = texto;
    if (conFundido) fundir(titulo);
  }
  const pista = $("grafico-pista");
  pista.textContent = vista.pista;
  pista.hidden = !vista.pista;
  const leyenda = vista.leyenda.concat(leyendaConMeta && valor !== "flujo" ? [["leyenda leyenda--meta", "Meta"]] : []);
  const caja = $("grafico-leyenda");
  caja.innerHTML = leyenda.map(([clase, texto]) => `<span class="${clase}">${texto}</span>`).join("");
  caja.hidden = leyenda.length === 0;
}

function elegirTipoGrafico(valor) {
  vistasElegidas[tipoVisual] = valor;
  try {
    localStorage.setItem(TIPOS_GRAFICO[tipoVisual].clave, valor);
  } catch (e) {
    /* solo dura esta visita */
  }
  mostrarVistaGrafico(valor, true);
  grafico?.cambiarTipo(valor);
  // Con "Explícame" abierto, los pasos pasan a hablar de la vista nueva (desde el mismo paso).
  if (explicacion && resultadoActual) {
    explicacion.pasos = resultadoActual.explicacion(grafico, valor);
    explicacion.indice = Math.min(explicacion.indice, explicacion.pasos.length - 1);
    ui.puntos.innerHTML = explicacion.pasos.map(() => "<span></span>").join("");
    mostrarPasoExplicame();
  }
}

// Entrada del inicio: título y tarjetas aparecen escalonados.
function animarInicio() {
  const portada = $("portada");
  const modulos = $("modulos");
  reiniciarAnimacion(portada, "portada--entrar");
  reiniciarAnimacion(modulos, "modulos--entrar");
  setTimeout(() => {
    portada.classList.remove("portada--entrar");
    modulos.classList.remove("modulos--entrar");
  }, 1500);
}

// Controles segmentados: el indicador se desliza bajo la opción marcada. Las opciones pueden
// cambiar (el selector de vistas y el de "¿Y si…?" se arman según el módulo).
function actualizarSegmentado(grupo) {
  const opciones = [...grupo.querySelectorAll(".segmentado__opcion")];
  const indice = opciones.findIndex((opcion) => opcion.querySelector("input").checked);
  grupo.style.setProperty("--indice", indice);
  opciones.forEach((opcion, k) => opcion.classList.toggle("segmentado__opcion--activa", k === indice));
}

function prepararSegmentados(raiz = document) {
  for (const grupo of raiz.querySelectorAll("[data-segmentado]")) {
    if (!grupo.dataset.listo) {
      grupo.dataset.listo = "si";
      grupo.addEventListener("change", (evento) => {
        actualizarSegmentado(grupo);
        if (evento.isTrusted) vibrar(8); // solo si lo tocó la persona, no al cargar un ejemplo
      });
    }
    actualizarSegmentado(grupo);
  }
}

// ===================== Interés compuesto =====================

// Datos que pide cada incógnita (requisito b: solo los necesarios).
const CAMPOS = {
  F: ["P", "tasa", "tiempo"],
  P: ["F", "tasa", "tiempo"],
  i: ["P", "F", "tiempo"],
  n: ["P", "F", "tasa"],
};

// Ejemplos resueltos de docs/02-modulos-y-formulas.md
const EJEMPLOS = {
  F: { P: "10000000", tasa: "18", tipo: "nominal", m: 12, modalidad: "vencida", tiempo: "24", unidad: 12 },
  P: { F: "25000000", tasa: "12", tipo: "efectiva", m: 1, modalidad: "vencida", tiempo: "3", unidad: 1 },
  i: { P: "10000000", F: "14000000", tiempo: "24", unidad: 12 },
  n: { P: "10000000", F: "15000000", tasa: "1,5", tipo: "efectiva", m: 12, modalidad: "vencida", unidad: 12 },
};

const ui = {
  form: $("form-compuesto"),
  entradas: { P: $("entrada-P"), F: $("entrada-F"), tasa: $("entrada-tasa"), tiempo: $("entrada-tiempo") },
  campos: { P: $("campo-P"), F: $("campo-F"), tasa: $("campo-tasa"), tiempo: $("campo-tiempo") },
  errores: { P: $("error-P"), F: $("error-F"), tasa: $("error-tasa"), tiempo: $("error-tiempo") },
  leidos: { P: $("leido-P"), F: $("leido-F") },
  periodoTasa: $("periodo-tasa"),
  etiquetaPeriodo: $("etiqueta-periodo"),
  traduccion: $("traduccion-texto"),
  unidadTiempo: $("unidad-tiempo"),
  etiquetaTiempo: $("etiqueta-tiempo"),
  ayudaTiempo: $("ayuda-tiempo"),
  filaTiempo: $("fila-tiempo"),
  cajaTiempo: $("caja-tiempo"),
  errorGeneral: $("error-general"),

  resultado: $("resultado"),
  aviso: $("resultado-aviso"),
  etiqueta: $("resultado-etiqueta"),
  valor: $("resultado-valor"),
  momento: $("resultado-momento"),
  extras: $("resultado-extras"),
  interpretacion: $("resultado-interpretacion"),
  iconoCopiar: $("icono-copiar"),
  textoCopiar: $("texto-copiar"),

  tarjetaGrafico: $("tarjeta-grafico"),
  lienzo: $("grafico-compuesto"),
  lectura: $("grafico-lectura"),
  visualHTML: $("visual-html"),
  accionesGrafico: $("grafico-acciones"),

  explicame: $("explicame"),
  contador: $("explicame-contador"),
  cuerpo: $("explicame-cuerpo"),
  explicameTexto: $("explicame-texto"),
  explicameFormula: $("explicame-formula"),
  puntos: $("explicame-puntos"),
  anterior: $("explicame-anterior"),
  siguiente: $("explicame-siguiente"),
  botonVoz: $("explicame-voz"),
  textoVoz: $("explicame-voz-texto"),

  ysi: $("ysi"),
  ysiOpciones: $("ysi-opciones"),
  ysiNombre: $("ysi-nombre"),
  ysiValor: $("ysi-valor"),
  ysiDeslizador: $("ysi-deslizador"),
  ysiMinimo: $("ysi-minimo"),
  ysiMaximo: $("ysi-maximo"),
  ysiComparacion: $("ysi-comparacion"),
  ysiEfecto: $("ysi-efecto"),
  ysiDoble: $("ysi-doble"),

  detalleBoton: $("detalle-boton"),
  detallePlegable: $("detalle-plegable"),
  detalleContenido: $("detalle-contenido"),
  pasos: $("detalle-pasos"),
};

let resultadoActual = null; // lo que se está mostrando
let grafico = null;
let explicacion = null; // { pasos, indice } mientras el modo "Explícame" está abierto
let temporizadorCopia = 0;
let temporizadorEntrada = 0;

const valorMarcado = (nombre) => ui.form.querySelector(`input[name="${nombre}"]:checked`).value;
const incognitaActual = () => valorMarcado("incognita");

function marcar(nombre, valor) {
  const opcion = ui.form.querySelector(`input[name="${nombre}"][value="${valor}"]`);
  opcion.checked = true;
  opcion.dispatchEvent(new Event("change", { bubbles: true }));
}

function tasaElegida(valor) {
  return { valor, ...formaElegida(valorMarcado("tipo-tasa"), ui.periodoTasa.value, valorMarcado("modalidad-tasa")) };
}

// Marca en el formulario la forma de una tasa ({ tipo, m, modalidad }).
function marcarFormaDeTasa(forma) {
  const enPantalla = tipoEnPantalla(forma.tipo, forma.m);
  marcar("tipo-tasa", enPantalla.tipo);
  marcar("modalidad-tasa", forma.modalidad);
  ui.periodoTasa.value = enPantalla.periodo;
  actualizarPeriodoTasa();
}

// ----- Campos visibles, lecturas y traducción de la tasa -----

function mostrarCampos() {
  const visibles = CAMPOS[incognitaActual()];
  for (const plegable of ui.form.querySelectorAll(".plegable[data-campo]")) {
    const visible = visibles.includes(plegable.dataset.campo);
    plegable.classList.toggle("plegable--cerrado", !visible);
    plegable.querySelector(".plegable__interior").inert = !visible;
  }

  const pideTiempo = visibles.includes("tiempo");
  ui.cajaTiempo.hidden = !pideTiempo;
  ui.filaTiempo.classList.toggle("fila-tiempo--solo-unidad", !pideTiempo);
  ui.etiquetaTiempo.innerHTML = pideTiempo ? 'Tiempo <span class="campo__simbolo">(n)</span>' : "¿En qué unidad quieres el tiempo?";
  ui.etiquetaTiempo.htmlFor = pideTiempo ? "entrada-tiempo" : "unidad-tiempo";
  ui.ayudaTiempo.textContent = pideTiempo
    ? "La tasa se convierte a esta unidad antes de calcular."
    : "El tiempo (n) se calculará en esta unidad.";

  for (const campo of Object.keys(ui.entradas)) {
    if (!visibles.includes(campo)) limpiarError(campo);
  }
  actualizarTraduccion();
}

function actualizarPeriodoTasa() {
  ajustarPeriodoDeTasa(ui.periodoTasa, ui.etiquetaPeriodo, valorMarcado("tipo-tasa"));
}

// Debajo de cada valor en pesos se muestra cómo se leyó el número (docs/04).
function actualizarLeido(campo) {
  const salida = ui.leidos[campo];
  const lectura = leerNumero(ui.entradas[campo].value);
  const estabaVacio = salida.textContent === "";
  salida.classList.remove("campo__leido--aviso");
  if (lectura.vacio || lectura.error) {
    salida.textContent = "";
    return;
  }
  salida.textContent = `Se leyó como ${pesosLeidos(lectura.valor)}`;
  if (lectura.ambiguo) {
    salida.textContent += `. Si querías ${pesosLeidos(lectura.valor * 1000)}, escríbelo sin punto.`;
    salida.classList.add("campo__leido--aviso");
  }
  if (estabaVacio) fundir(salida);
}

// Muestra en vivo a qué tasa efectiva del periodo del tiempo equivale la tasa escrita (requisito e).
function actualizarTraduccion(animar = true) {
  if (incognitaActual() === "i") return;
  const m = Number(ui.unidadTiempo.value);
  const p = PERIODICIDADES[m];
  const lectura = leerNumero(ui.entradas.tasa.value);
  let texto;
  if (lectura.vacio || lectura.error || lectura.valor <= 0) {
    texto = `Se convertirá a tasa ${p.nombreTasa}, la unidad del tiempo.`;
  } else {
    const tasa = tasaElegida(lectura.valor / 100);
    const conversion = convertirTasa(tasa, { tipo: "efectiva", m, modalidad: "vencida" });
    if (!Number.isFinite(conversion.valor)) texto = "Una tasa anticipada por periodo debe ser menor que 100 %.";
    else if (conversion.pasos.length === 0) texto = `${describirTasa(tasa)}: ya está en la unidad del tiempo.`;
    else texto = `${describirTasa(tasa)} = ${porcentaje(conversion.valor)} ${p.nombreTasa}`;
  }
  if (texto === ui.traduccion.textContent) return;
  ui.traduccion.textContent = texto;
  if (animar) fundir(ui.traduccion.parentElement);
}

// ----- Errores -----

function limpiarError(campo) {
  ui.campos[campo].classList.remove("campo--error");
  ui.errores[campo].textContent = "";
  ui.entradas[campo].removeAttribute("aria-invalid");
}

function limpiarErrores() {
  for (const campo of Object.keys(ui.entradas)) limpiarError(campo);
  ui.errorGeneral.hidden = true;
}

function sacudir(elemento) {
  reiniciarAnimacion(elemento, "campo--sacudir");
  elemento.addEventListener("animationend", () => elemento.classList.remove("campo--sacudir"), { once: true });
}

function mostrarErrores(errores) {
  let primero = null;
  for (const [campo, mensaje] of Object.entries(errores)) {
    ui.campos[campo].classList.add("campo--error");
    ui.errores[campo].innerHTML = '<svg class="icono" width="16" height="16" aria-hidden="true"><use href="#i-alerta"/></svg><span></span>';
    ui.errores[campo].querySelector("span").textContent = mensaje;
    ui.entradas[campo].setAttribute("aria-invalid", "true");
    sacudir(ui.campos[campo]);
    primero ??= campo;
  }
  vibrar([14, 60, 14]);
  ui.entradas[primero].focus();
}

function mostrarErrorGeneral(mensaje) {
  ui.errorGeneral.textContent = mensaje;
  ui.errorGeneral.hidden = false;
}

// ----- Lectura y validación (catálogo de docs/04-requisitos-de-la-app.md) -----

function leerDinero(campo, nombre, errores) {
  const lectura = leerNumero(ui.entradas[campo].value);
  if (lectura.vacio) errores[campo] = `Falta ${nombre} (${campo}).`;
  else if (lectura.error) errores[campo] = lectura.error;
  else if (lectura.valor <= 0) errores[campo] = `${mayuscula(nombre)} debe ser mayor que cero.`;
  else return lectura.valor;
}

function leerTasa(errores) {
  const lectura = leerNumero(ui.entradas.tasa.value);
  if (lectura.vacio) errores.tasa = "Falta la tasa de interés.";
  else if (lectura.error) errores.tasa = lectura.error;
  else if (lectura.valor <= 0) errores.tasa = "La tasa debe ser mayor que 0 %.";
  else {
    const tasa = tasaElegida(lectura.valor / 100);
    const porPeriodo = tasa.tipo === "nominal" ? nominalAPeriodica(tasa.valor, tasa.m) : tasa.valor; // Hoja 1.1
    if (tasa.modalidad === "anticipada" && porPeriodo >= 1) errores.tasa = "Una tasa anticipada por periodo debe ser menor que 100 %.";
    else return tasa;
  }
}

function leerTiempo(errores) {
  const lectura = leerNumero(ui.entradas.tiempo.value);
  if (lectura.vacio) errores.tiempo = "Falta el tiempo (n).";
  else if (lectura.error) errores.tiempo = lectura.error;
  else if (lectura.valor <= 0) errores.tiempo = "El número de periodos debe ser mayor que cero.";
  else return lectura.valor;
}

// ----- Cálculo -----

function calcular() {
  limpiarErrores();
  const incognita = incognitaActual();
  const visibles = CAMPOS[incognita];
  const errores = {};
  const datos = { incognita, m: Number(ui.unidadTiempo.value) };

  if (visibles.includes("P")) datos.P = leerDinero("P", "el valor presente", errores);
  if (visibles.includes("F")) datos.F = leerDinero("F", "el valor futuro", errores);
  if (visibles.includes("tasa")) datos.tasa = leerTasa(errores);
  if (visibles.includes("tiempo")) datos.n = leerTiempo(errores);

  if (datos.P !== undefined && datos.F !== undefined) {
    if (incognita === "i" && datos.F < datos.P) errores.F = "Con F menor que P la tasa sería negativa. Revisa los datos.";
    else if (incognita === "i" && datos.F === datos.P) errores.F = "Si F es igual a P no hay interés: la tasa sería 0 %.";
    else if (incognita === "n" && datos.F <= datos.P) errores.F = "Con una tasa positiva, el valor futuro debe ser mayor que el valor presente.";
  }

  if (Object.keys(errores).length) {
    mostrarErrores(errores);
    return;
  }

  const r = resolver(datos);
  if (!Number.isFinite(r.calculado) || Math.abs(r.calculado) > 1e15) {
    mostrarErrorGeneral("El resultado es demasiado grande para mostrarlo. Revisa la tasa y el tiempo.");
    return;
  }
  if (incognita === "P" && r.P < 0.01) {
    mostrarErrorGeneral("El valor presente da menos de un centavo. Revisa la tasa y el tiempo.");
    return;
  }
  vibrar(14);
  cerrarYSi(); // el cálculo nuevo es la base de cualquier "¿Y si…?"
  const v = presentar(r);
  mostrarResultado(v);
  guardarEnHistorial(v);
}

// Convierte la tasa a la unidad del tiempo y aplica la fórmula de la incógnita.
function resolver(datos) {
  const r = { ...datos, p: PERIODICIDADES[datos.m], conversion: null };
  if (datos.incognita !== "i") {
    r.conversion = convertirTasa(datos.tasa, { tipo: "efectiva", m: datos.m, modalidad: "vencida" });
    r.i = r.conversion.valor;
  }
  switch (datos.incognita) {
    case "F": r.F = r.calculado = vfCompuesto(r.P, r.i, r.n); break; // Hoja 2.1
    case "P": r.P = r.calculado = vpCompuesto(r.F, r.i, r.n); break; // Hoja 2.2
    case "i": r.i = r.calculado = tasaCompuesto(r.P, r.F, r.n); break; // Hoja 2.3
    case "n": r.n = r.calculado = nCompuesto(r.P, r.F, r.i); break; // Hoja 2.4
  }
  return r;
}

// ----- Presentación del resultado -----

function pasoDatos(r) {
  const lineas = [];
  if (r.incognita !== "P") lineas.push(`Valor presente: ${formula(`${variable("P")} = ${pesos(r.P)}`)}`);
  if (r.incognita !== "F") lineas.push(`Valor futuro: ${formula(`${variable("F")} = ${pesos(r.F)}`)}`);
  if (r.incognita !== "i") lineas.push(`Tasa: ${describirTasa(r.tasa)}`);
  if (r.incognita !== "n") lineas.push(`Tiempo: ${formula(`${variable("n")} = ${describirTiempo(r.n, r.m)}`)}`);
  else lineas.push(`Unidad del tiempo: ${r.p.plural}`);
  return { titulo: "Datos", lineas };
}

function pasoTasa(r) {
  const titulo = `Tasa ${r.p.nombreTasa}`;
  const tasaFinal = formula(`${variable("i")} = ${decimal(r.i)}`);
  if (!r.conversion.pasos.length) {
    return { titulo, lineas: [`La tasa ya está en la unidad del tiempo; se usa tal cual: ${tasaFinal}`] };
  }
  const lineas = r.conversion.pasos.map(
    (paso) => `${insignia(paso.formula)}${NOMBRES_CONVERSION[paso.formula]}: ${formula(expresionConversion(paso))}`
  );
  lineas.push(`Tasa para el cálculo: ${tasaFinal} (${porcentaje(r.i)} ${r.p.nombreTasa})`);
  return { titulo, lineas };
}

const pasoFormula = (numero, html) => ({ titulo: "Fórmula", lineas: [`${insignia(numero)}${formula(html)}`] });

// Sustitución paso a paso: una línea por cada operación, hasta el resultado.
const pasoNumeros = (lineas) => ({ titulo: "Con los números", lineas: lineas.map((linea) => formula(linea)) });

const FORMULAS = {
  F: `${variable("VF")} = ${variable("P")} · (1 + ${variable("i")})<sup>${variable("n")}</sup>`,
  P: `${variable("P")} = ${variable("F")} / (1 + ${variable("i")})<sup>${variable("n")}</sup>`,
  i: `${variable("i")} = <sup>${variable("n")}</sup>√(${variable("F")} / ${variable("P")}) − 1`,
  n: `${variable("n")} = ln(${variable("F")} / ${variable("P")}) / ln(1 + ${variable("i")})`,
};

function presentar(r) {
  const { P, F, i, n, m, p } = r;
  const pasos = [pasoDatos(r)];
  if (r.incognita !== "i") pasos.push(pasoTasa(r));
  const tasaUsada = `${porcentaje(i)} ${p.nombreTasa}`;
  const factor = vfCompuesto(1, i, n); // (1 + i)^n: Hoja 2.1 con P = 1
  // Textos del diagrama de flujo de caja.
  const flujo = {
    incognita: r.incognita,
    base: decimal(1 + i),
    exponente: r.incognita === "n" ? "n" : exponente(n),
    tasa: `${porcentaje(i)} ${p.adjetivo}`,
  };
  const comun = { calculo: r, pasos, grafico: { P, i, n, meta: r.incognita === "n" ? F : undefined, singular: p.singular, plural: p.plural, flujo } };
  const base = formatoHastaCuatro.format(1 + i); // 1 + i para leer en voz alta: 1,015

  if (r.incognita === "F") {
    const conNumeros = `${cifra(P)} · (1 + ${decimal(i)})<sup>${exponente(n)}</sup>`;
    pasos.push(
      pasoFormula("2.1", FORMULAS.F),
      pasoNumeros([
        `${variable("VF")} = ${conNumeros}`,
        `${variable("VF")} = ${cifra(P)} · ${decimal(1 + i)}<sup>${exponente(n)}</sup>`,
        `${variable("VF")} = ${cifra(P)} · ${decimal(factor)}`,
        `${variable("VF")} = <strong>${pesos(F)}</strong>`,
      ])
    );
    return {
      ...comun,
      etiqueta: "Valor futuro (F)",
      valor: F,
      formatear: pesos,
      momento: momentoFinal(n, m),
      extras: [["Intereses ganados", pesos(F - P)], ["Tasa usada", tasaUsada]],
      interpretacion: `Si inviertes ${pesos(P)} hoy a una tasa de ${porcentaje(i)} ${p.nombreTasa}, ${momentoFinal(n, m)} tendrás ${pesos(F)}.`,
      numeroFormula: "2.1",
      explicacion: (g, vista) =>
        explicacionValorFuturo(r, g, vista, {
          formula: `${FORMULAS.F} = ${conNumeros}`,
          voz: `El valor futuro es igual al valor presente por uno más i, elevado a la n. Con los números: ${cifra(P)} por ${base} elevado a la ${exponente(n)}, que da ${pesos(F)}.`,
        }),
    };
  }

  if (r.incognita === "P") {
    const conNumeros = `${cifra(F)} / (1 + ${decimal(i)})<sup>${exponente(n)}</sup>`;
    pasos.push(
      pasoFormula("2.2", FORMULAS.P),
      pasoNumeros([
        `${variable("P")} = ${conNumeros}`,
        `${variable("P")} = ${cifra(F)} / ${decimal(1 + i)}<sup>${exponente(n)}</sup>`,
        `${variable("P")} = ${cifra(F)} / ${decimal(factor)}`,
        `${variable("P")} = <strong>${pesos(P)}</strong>`,
      ])
    );
    return {
      ...comun,
      etiqueta: "Valor presente (P)",
      valor: P,
      formatear: pesos,
      momento: "hoy, en el periodo 0",
      extras: [["Intereses", pesos(F - P)], ["Tasa usada", tasaUsada]],
      interpretacion: `Para tener ${pesos(F)} ${momentoFinal(n, m)} a una tasa de ${porcentaje(i)} ${p.nombreTasa}, hoy debes invertir ${pesos(P)}.`,
      numeroFormula: "2.2",
      explicacion: (g, vista) =>
        explicacionValorPresente(r, vista, {
          formula: `${FORMULAS.P} = ${conNumeros}`,
          voz: `El valor presente es igual al valor futuro dividido entre uno más i, elevado a la n. Con los números: ${cifra(F)} entre ${base} elevado a la ${exponente(n)}, que da ${pesos(P)}.`,
        }),
    };
  }

  if (r.incognita === "i") {
    const conNumeros = `<sup>${exponente(n)}</sup>√(${cifra(F)} / ${cifra(P)}) − 1`;
    pasos.push(
      pasoFormula("2.3", FORMULAS.i),
      pasoNumeros([
        `${variable("i")} = ${conNumeros}`,
        `${variable("i")} = <sup>${exponente(n)}</sup>√${decimal(F / P)} − 1`,
        `${variable("i")} = ${decimal(1 + i)} − 1`,
        `${variable("i")} = ${decimal(i)} = <strong>${porcentaje(i)}</strong>`,
      ])
    );
    const anual = periodicaAEfectiva(i, m); // Hoja 1.5
    if (m !== 1) {
      const nominal = periodicaANominal(i, m); // Hoja 1.2
      pasos.push({
        titulo: "Equivalencias",
        lineas: [
          `${insignia("1.5")}Efectiva anual: ${formula(`(1 + ${decimal(i)})<sup>${m}</sup> − 1 = ${porcentaje(anual)}`)}`,
          `${insignia("1.2")}Nominal anual ${p.singular} vencido: ${formula(`${decimal(i)} · ${m} = ${porcentaje(nominal)}`)}`,
        ],
      });
    }
    return {
      ...comun,
      etiqueta: "Tasa de interés (i)",
      valor: i,
      formatear: porcentaje,
      tasa: { valor: i, tipo: "efectiva", m, modalidad: "vencida" },
      momento: m !== 1 ? `${p.nombreTasa} · ${porcentaje(anual)} efectiva anual` : "efectiva anual",
      extras: [["Efectiva anual", porcentaje(anual)], ["Intereses", pesos(F - P)]],
      interpretacion: `Para que ${pesos(P)} se conviertan en ${pesos(F)} en ${describirTiempo(n, m)}, se necesita una tasa de ${porcentaje(i)} ${p.nombreTasa}.`,
      numeroFormula: "2.3",
      explicacion: (g, vista) =>
        explicacionTasa(r, vista, anual, {
          formula: `${FORMULAS.i} = ${conNumeros}`,
          voz: `La tasa es igual a la raíz de índice n del valor futuro entre el valor presente, menos uno. Con los números: raíz de índice ${exponente(n)} de ${cifra(F)} entre ${cifra(P)}, menos uno, que da ${porcentaje(i)} ${p.nombreTasa}.`,
        }),
    };
  }

  // Incógnita: tiempo
  const conNumeros = `ln(${cifra(F)} / ${cifra(P)}) / ln(1 + ${decimal(i)})`;
  pasos.push(
    pasoFormula("2.4", FORMULAS.n),
    pasoNumeros([
      `${variable("n")} = ${conNumeros}`,
      `${variable("n")} = ln(${decimal(F / P)}) / ln(${decimal(1 + i)})`,
      `${variable("n")} = ${decimal(Math.log(F / P))} / ${decimal(Math.log(1 + i))}`,
      `${variable("n")} = <strong>${describirTiempo(n, m)}</strong>`,
    ])
  );
  const entero = esEntero(n);
  const antes = entero ? Math.round(n) - 1 : Math.floor(n);
  const despues = entero ? Math.round(n) : Math.ceil(n);
  const saldoAntes = vfCompuesto(P, i, antes); // Hoja 2.1
  const saldoDespues = vfCompuesto(P, i, despues); // Hoja 2.1
  const etiquetaAntes = antes === 0 ? "Hoy" : `Al final del ${p.singular} ${cifra(antes)}`;
  const etiquetaDespues = `Al final del ${p.singular} ${cifra(despues)}`;
  const lineas = [
    `${etiquetaAntes}: ${pesos(saldoAntes)}, todavía no llega a la meta.`,
    `${etiquetaDespues}: ${pesos(saldoDespues)}, ${entero ? "llega justo a la meta" : "ya la supera"}.`,
  ];
  if (m !== 1) lineas.push(`En años: ${formatoDos.format(n / m)} años.`);
  pasos.push({ titulo: "Interpretación", lineas });

  // Cada paso dice lo que muestra la vista: en el diagrama, las flechas y el arco; en barras y
  // en área, la línea punteada de la meta y dónde la cruza la curva.
  const explicacionTiempo = (g, vista) => {
    const partes = partesDeVista(vista);
    const enFlujo = vista === "flujo";
    const lista = [
      {
        texto: enFlujo
          ? `Empiezas con ${pesos(P)}: el valor presente (VP), ${partes.hoy}. La meta es llegar a ${pesos(F)} (VF).`
          : `Empiezas con ${pesos(P)} (P), ${partes.hoy}. La meta, ${pesos(F)} (F), es la línea punteada.`,
        vista: { visibles: 1, enfoque: "capital" },
      },
    ];
    // El último periodo que se ve antes de la meta (el gráfico agrupa los periodos si son muchos).
    const visto = periodosDelGrafico(n, true).filter((k) => k <= antes + 1e-9).pop() ?? 0; // animaciones.js
    if (visto >= 1) {
      lista.push({
        texto: `Al final del ${p.singular} ${cifra(visto)} tienes ${pesos(vfCompuesto(P, i, visto))}: ${enFlujo ? "todavía no llegas" : `${vista === "area" ? "la curva" : "la barra"} todavía no llega a la línea`}.`, // Hoja 2.1
        vista: { visibles: g.barrasHasta(visto), enfoque: "todo" },
      });
    }
    lista.push({
      texto: entero
        ? `Llegas exactamente a la meta al final del ${p.singular} ${cifra(despues)}${enFlujo ? "" : ": la curva toca la línea"}.`
        : `La meta se alcanza en n = ${cantidadPeriodos(n)} ${p.plural}${enFlujo ? "" : ", donde la curva cruza la línea"}. Como el interés se suma cada ${p.singular}, la alcanzas al final del ${p.singular} ${cifra(despues)}, con ${pesos(saldoDespues)}.`,
      vista: { enfoque: "meta" },
    });
    lista.push({
      texto: "Con la fórmula del tiempo:",
      formula: `${FORMULAS.n} = ${conNumeros}`,
      voz: `El tiempo es igual al logaritmo natural del valor futuro entre el valor presente, dividido entre el logaritmo natural de uno más i. Con los números da ${describirTiempo(n, m)}.`,
      vista: { enfoque: "todo" },
    });
    return lista;
  };

  return {
    ...comun,
    etiqueta: "Tiempo (n)",
    valor: n,
    formatear: (x) => describirTiempo(x, m),
    momento: entero ? `Llega justo a la meta al final del ${p.singular} ${cifra(despues)}` : `La meta se cumple al final del ${p.singular} ${cifra(despues)}`,
    extras: [[etiquetaAntes, pesos(saldoAntes)], [etiquetaDespues, pesos(saldoDespues)]],
    interpretacion: `A una tasa de ${porcentaje(i)} ${p.nombreTasa}, ${pesos(P)} tardan ${describirTiempo(n, m)} en llegar a ${pesos(F)}.${entero ? "" : ` Como el interés se capitaliza cada ${p.singular}, la meta se alcanza al final del ${p.singular} ${cifra(despues)}.`}`,
    numeroFormula: "2.4",
    explicacion: explicacionTiempo,
  };
}

// ----- "Explícame" de interés compuesto -----
// Cada paso dice lo que muestra la vista del gráfico ("flujo", "barras" o "area"): en el
// diagrama de flujo de caja, las flechas y el arco; en barras y en área, el capital y la parte
// de intereses de cada periodo. pasoFormula: { formula (HTML), voz (para leer) }.

// Cómo se llama cada parte del gráfico en esa vista.
function partesDeVista(vista) {
  if (vista === "flujo") return { p: "VP", f: "VF", hoy: "la flecha que sale en el periodo 0", final: "la flecha que llega al final", intereses: "el arco" };
  if (vista === "area") return { p: "P", f: "F", hoy: "el punto de partida de la curva", final: "la altura de la curva al final", intereses: "la banda ámbar" };
  return { p: "P", f: "F", hoy: "la primera barra", final: "la última barra", intereses: "la parte ámbar de cada barra" };
}

function explicacionValorFuturo(r, g, vista, pasoFormula) {
  const { P, F, i, n, m, p } = r;
  const partes = partesDeVista(vista);
  const periodos = periodosDelGrafico(n, false); // los que dibuja el gráfico (animaciones.js)
  const k1 = periodos[1] ?? 1; // el primer periodo después de hoy
  const interesEn = (k) => vfCompuesto(P, i, k) - vfCompuesto(P, i, k - 1); // Hoja 2.1
  const enElPeriodo = (k) => (k === 1 ? `el primer ${p.singular}` : `el ${p.singular} ${cifra(k)}`);
  const delPeriodo = (k) => (k === 1 ? `del primer ${p.singular}` : `del ${p.singular} ${cifra(k)}`);
  const lista = [{ texto: `Hoy tienes ${pesos(P)}: el valor presente (${partes.p}), ${partes.hoy}.`, vista: { visibles: 1, enfoque: "capital" } }];
  if (vista === "flujo") {
    const multiplica = vfCompuesto(1, i, n); // (1 + i)^n
    lista.push({
      texto: `El arco lleva ese dinero en el tiempo: cada ${p.singular} se multiplica por ${decimal(1 + i)}. Al final ${delPeriodo(k1)} ya son ${pesos(vfCompuesto(P, i, k1))}.`,
      vista: { visibles: 2, enfoque: "intereses" },
    });
    lista.push({
      texto: `En ${describirTiempo(n, m)}, el arco multiplica el dinero por ${decimal(1 + i)} elevado a ${exponente(n)}: por ${formatoDos.format(multiplica)}. Si solo se ganara interés sobre los ${pesos(P)} iniciales, sería por ${formatoDos.format(1 + i * n)}: lo de más son intereses ganados sobre intereses. Eso es el interés compuesto.`,
      vista: { enfoque: "intereses" },
    });
  } else {
    lista.push({
      texto: `Cada ${p.singular} el saldo gana ${porcentaje(i)} sobre todo lo acumulado: ${partes.intereses} son los intereses. En ${enElPeriodo(k1)} se ganan ${pesos(interesEn(k1))}.`,
      vista: { visibles: Math.min(2, g.total), enfoque: "todo", notas: "primero" },
    });
    const enteros = periodos.filter((k) => Number.isInteger(k));
    const ultimo = enteros[enteros.length - 1];
    if (enteros.length > 2) {
      lista.push({
        texto: `Los intereses crecen cada ${p.singular}, porque también se ganan sobre los intereses anteriores: en el ${p.singular} ${cifra(ultimo)} ya se ganan ${pesos(interesEn(ultimo))}. Eso es el interés compuesto.`,
        vista: { enfoque: "intereses", notas: "comparar" },
      });
    }
  }
  lista.push({
    texto: `${mayuscula(momentoFinal(n, m))} tienes ${pesos(F)}: el valor futuro (${partes.f}), ${partes.final}. Los intereses suman ${pesos(F - P)}.`,
    vista: { enfoque: "final" },
  });
  lista.push({ texto: "Con la fórmula del valor futuro:", ...pasoFormula, vista: { enfoque: "todo" } });
  return lista;
}

function explicacionValorPresente(r, vista, pasoFormula) {
  const { P, F, i, n, m, p } = r;
  const partes = partesDeVista(vista);
  const lista = [{ texto: `La meta es tener ${pesos(F)} ${momentoFinal(n, m)}: el valor futuro (${partes.f}), ${partes.final}.`, vista: { enfoque: "final" } }];
  if (vista === "flujo") {
    lista.push({ texto: `El arco trae ese dinero hacia hoy: por cada ${p.singular} de espera se divide entre ${decimal(1 + i)}. Eso es descontar.`, vista: { enfoque: "intereses" } });
    lista.push({ texto: `Hoy hay que invertir ${pesos(P)}: el valor presente (VP), ${partes.hoy}. La diferencia, ${pesos(F - P)}, la ponen los intereses.`, vista: { enfoque: "capital" } });
  } else {
    lista.push({
      texto: `El valor presente es lo que hay que invertir hoy para llegar a esa meta: ${pesos(P)}, ${vista === "area" ? "la banda de abajo" : "la parte de capital de cada barra"}.`,
      vista: { enfoque: "capital" },
    });
    lista.push({ texto: `La diferencia, ${pesos(F - P)}, la ponen los intereses: ${partes.intereses}, que crece cada ${p.singular}.`, vista: { enfoque: "intereses", notas: "comparar" } });
  }
  lista.push({ texto: "Con la fórmula del valor presente:", ...pasoFormula, vista: { enfoque: "todo" } });
  return lista;
}

function explicacionTasa(r, vista, anual, pasoFormula) {
  const { P, F, i, n, m, p } = r;
  const partes = partesDeVista(vista);
  const equivale = m !== 1 ? `, que equivale a ${porcentaje(anual)} efectiva anual` : "";
  return [
    { texto: `Empiezas con ${pesos(P)}: el valor presente (${partes.p}), ${partes.hoy}.`, vista: { visibles: 1, enfoque: "capital" } },
    { texto: `La meta es llegar a ${pesos(F)} ${momentoFinal(n, m)}: el valor futuro (${partes.f}), ${partes.final}.`, vista: { enfoque: "final" } },
    vista === "flujo"
      ? { texto: `Para que el arco lleve ${pesos(P)} hasta ${pesos(F)} hace falta una tasa de ${porcentaje(i)} ${p.nombreTasa}${equivale}.`, vista: { enfoque: "intereses" } }
      : {
          texto: `La tasa que logra ese crecimiento es ${porcentaje(i)} ${p.nombreTasa}${equivale}. Los intereses que produce son ${partes.intereses}.`,
          vista: { enfoque: "intereses", notas: "comparar" },
        },
    { texto: "Con la fórmula de la tasa:", ...pasoFormula, vista: { enfoque: "todo" } },
  ];
}

// enVivo: llega del deslizador de "¿Y si…?" (muchas veces por segundo). El número se escribe
// directo, sin girar ni anunciarse, y el gráfico hace una transición corta.
// desplazar: llevar la vista al resultado.
// transformar: el gráfico se transforma aunque el cambio sea grande (no se construye de nuevo).
function mostrarResultado(v, { enVivo = false, desplazar = true, transformar = enVivo } = {}) {
  // Al recalcular la misma incógnita, las tarjetas no vuelven a entrar: el número gira desde
  // el valor anterior y el gráfico se transforma (docs/09-animaciones.md, regla 9).
  const previo = !ui.resultado.hidden && resultadoActual?.etiqueta === v.etiqueta && resultadoActual?.modulo === v.modulo ? resultadoActual : null;
  resultadoActual = v;
  cerrarExplicame(false);
  ui.resultado.hidden = false;
  ui.resultado.classList.remove("resultado--desactualizado");
  ui.aviso.hidden = true;
  // La clase de entrada se quita al terminar, para que el contenido nuevo de un recálculo
  // (como las casillas de datos) no vuelva a animarse.
  clearTimeout(temporizadorEntrada);
  if (previo) ui.resultado.classList.remove("resultado--entrando");
  else {
    reiniciarAnimacion(ui.resultado, "resultado--entrando");
    temporizadorEntrada = setTimeout(() => ui.resultado.classList.remove("resultado--entrando"), 1400);
  }

  ui.etiqueta.textContent = v.etiqueta;
  const textoFinal = v.formatear(v.valor);
  ui.valor.classList.toggle("resultado__valor--largo", textoFinal.length > 15 && textoFinal.length <= 19);
  ui.valor.classList.toggle("resultado__valor--muy-largo", textoFinal.length > 19);
  if (enVivo) ui.valor.textContent = textoFinal; // sigue al dedo
  else rodarNumero(ui.valor, textoFinal, { desde: previo ? previo.formatear(previo.valor) : null });
  const cambiantes = [ui.momento, ui.extras, ui.interpretacion];
  const textosAntes = cambiantes.map((elemento) => elemento.textContent);
  ui.momento.textContent = v.momento;
  ui.extras.innerHTML = v.extras.map(([titulo, valor]) => `<div><dt>${titulo}</dt><dd>${valor}</dd></div>`).join("");
  ui.interpretacion.textContent = v.interpretacion;
  if (previo && !enVivo) cambiantes.forEach((elemento, k) => elemento.textContent !== textosAntes[k] && fundir(elemento));
  ui.pasos.innerHTML = v.pasos
    .map(
      (paso, k) => `<li class="paso" style="--i: ${k}">
        <span class="paso__numero">${k + 1}</span>
        <div><p class="paso__titulo">${paso.titulo}</p>${paso.lineas.map((linea) => `<p class="paso__linea">${linea}</p>`).join("")}</div>
      </li>`
    )
    .join("");
  if (!enVivo && ui.detalleBoton.getAttribute("aria-expanded") === "true") reiniciarAnimacion(ui.pasos, "pasos--entrando");

  // El gráfico: el de interés compuesto (v.grafico) o el que trae el módulo (v.visual).
  const visual = v.visual || {
    tipo: "crecimiento",
    datos: v.grafico,
    meta: v.grafico.meta !== undefined,
    descripcion: `Gráfico del crecimiento de ${pesos(v.grafico.P)} en el tiempo. ${v.interpretacion}`,
  };
  if (!enVivo) {
    prepararUsarTasa(v);
    prepararTarjetaGrafico(visual.tipo, { titulo: visual.titulo, meta: visual.meta });
    $("abrir-ysi").hidden = !ganchosYSi(v)?.variables(v.calculo)?.length; // sin variables que mover (UVR en pesos), no se ofrece
  }
  const vista = vistaGuardada(visual.tipo);
  const datosGrafico = {
    ...visual.datos,
    tipo: vista, // interés compuesto llama "tipo" a la vista
    vista,
    dinero: pesos,
    dineroCompacto: pesosCompacto,
    numero: cantidadPeriodos,
    porcentaje,
    descripcion: visual.descripcion || v.interpretacion,
    alLeer: (texto) => (ui.lectura.textContent = texto),
  };
  if (!(previo && grafico?.tipoVisual === visual.tipo && grafico.actualizar(datosGrafico, { enVivo, forzar: transformar }))) {
    grafico?.destruir();
    grafico = crearVisual(visual.tipo, datosGrafico);
    grafico.construir();
  }

  if (enVivo) return;
  anunciar(`${v.etiqueta}: ${textoFinal}. ${v.momento}.`);
  if (desplazar) llevarAlResultado();
}

// Componente del gráfico según su tipo. Todos responden a construir, actualizar, cambiarTipo,
// irA y destruir.
function crearVisual(tipo, datos) {
  let visual;
  if (tipo === "crecimiento") visual = crearGraficoCrecimiento(ui.lienzo, datos); // animaciones.js
  else if (tipo === "cadena") visual = crearCadena(ui.visualHTML, datos); // visuales.js
  else visual = crearDiagramaPagos(ui.lienzo, datos); // diagramas.js: anualidades y perpetua
  visual.tipoVisual = tipo;
  return visual;
}

// Altura de un elemento en la página, sin contar transformaciones (las tarjetas del
// resultado entran desplazadas por su animación).
function alturaEnPagina(elemento) {
  let y = 0;
  for (let actual = elemento; actual; actual = actual.offsetParent) y += actual.offsetTop;
  return y;
}

// Lleva la vista al resultado: el número arriba y el gráfico completo debajo. En pantallas
// bajas, donde no caben los dos, baja lo justo para que el gráfico se vea entero.
function llevarAlResultado() {
  const arriba = barraSuperior.offsetHeight + 12;
  const abajo = document.querySelector(".barra-inferior").offsetHeight + 8;
  const inicio = alturaEnPagina(ui.resultado) - arriba;
  // Con pasos en HTML (que pueden ser largos) basta con que se vea el número.
  const finGrafico = ui.lienzo.hidden ? 0 : alturaEnPagina(ui.lienzo) + ui.lienzo.offsetHeight;
  const destino = Math.max(inicio, finGrafico - (innerHeight - abajo));
  window.scrollTo({ top: Math.max(0, destino), behavior: movimientoReducido() ? "auto" : "smooth" }); // movimientoReducido: animaciones.js
}

// ----- Usar una tasa calculada en otro módulo -----
// Los resultados que son una tasa (la conversión, la tasa indexada o la tasa que se calcula en
// interés compuesto o en una anualidad) traen su forma en v.tasa: { valor, tipo, m, modalidad }.
// Con un toque, esa tasa queda escrita en otro módulo, con su tipo, periodo y modalidad.
const DESTINOS_DE_TASA = [
  ["interes-compuesto", "Interés compuesto", "i-compuesto"],
  ["conversion-tasas", "Conversión de tasas", "i-conversion"],
  ["anualidad-vencida", "Anualidad vencida", "i-vencida"],
  ["anualidad-anticipada", "Anualidad anticipada", "i-anticipada"],
  ["anualidad-perpetua", "Anualidad perpetua", "i-perpetua"],
];

function prepararUsarTasa(v) {
  cerrarUsarTasa();
  $("usar-tasa").hidden = !v.tasa;
  if (!v.tasa) return;
  const origen = v.modulo || "interes-compuesto";
  $("usar-tasa-lista").innerHTML = DESTINOS_DE_TASA.filter(([id]) => id !== origen)
    .map(([id, nombre, icono]) => `<button class="boton boton--chico" type="button" data-destino="${id}"><svg class="icono" width="18" height="18" aria-hidden="true"><use href="#${icono}"/></svg>${nombre}</button>`)
    .join("");
}

function alternarUsarTasa() {
  const abierto = $("usar-tasa").getAttribute("aria-expanded") === "true";
  if (abierto) return cerrarUsarTasa();
  $("usar-tasa").setAttribute("aria-expanded", "true");
  $("usar-tasa-opciones").hidden = false;
  fundir($("usar-tasa-opciones"));
}

function cerrarUsarTasa() {
  $("usar-tasa").setAttribute("aria-expanded", "false");
  $("usar-tasa-opciones").hidden = true;
}

// Escribe la tasa del resultado en el módulo de destino (sin calcular: faltan sus otros datos).
// Si allí la incógnita era la tasa, pasa a la primera de las demás.
function usarTasaEn(destino) {
  const tasa = resultadoActual?.tasa;
  if (!tasa) return;
  const texto = textoDeEntrada(sinRuido(tasa.valor * 100));
  trasNavegar = () => {
    if (destino === "interes-compuesto") {
      if (incognitaActual() === "i") marcar("incognita", "F");
      ui.entradas.tasa.value = texto;
      limpiarError("tasa");
      marcarFormaDeTasa(tasa);
      actualizarTraduccion(false);
    } else {
      const { formulario } = MODULOS[destino];
      const enPantalla = tipoEnPantalla(tasa.tipo, tasa.m);
      const datos = { tasa: texto, "tasa-tipo": enPantalla.tipo, "tasa-periodo": enPantalla.periodo, "tasa-modalidad": tasa.modalidad };
      if (formulario.querySelector('input[name="incognita"][value="i"]:checked')) datos.incognita = "P";
      escribirFormulario(formulario, datos);
    }
    avisar(`Tasa lista: ${describirTasa(tasa)}. Completa los demás datos y calcula.`);
  };
  irARuta(destino);
}

function ocultarResultado() {
  cerrarUsarTasa();
  cerrarYSi();
  cerrarExplicame(false);
  grafico?.destruir();
  grafico = null;
  resultadoActual = null;
  ui.resultado.hidden = true;
}

function marcarDesactualizado() {
  cerrarYSi(); // si cambia el formulario, "¿Y si…?" ya no parte de lo que se ve
  if (ui.resultado.hidden || ui.resultado.classList.contains("resultado--desactualizado")) return;
  ui.resultado.classList.add("resultado--desactualizado");
  ui.aviso.hidden = false;
}

function alternarDetalle() {
  const abrir = ui.detalleBoton.getAttribute("aria-expanded") !== "true";
  ui.detalleBoton.setAttribute("aria-expanded", String(abrir));
  ui.detallePlegable.classList.toggle("plegable--cerrado", !abrir);
  ui.detalleContenido.inert = !abrir;
  if (abrir) reiniciarAnimacion(ui.pasos, "pasos--entrando");
}

async function copiarResultado() {
  if (!resultadoActual) return;
  const v = resultadoActual;
  const fuente = v.fuente || `Fórmula ${v.numeroFormula}.`; // con varias fórmulas, el módulo trae la suya
  const texto = `${v.etiqueta}: ${v.formatear(v.valor)} (${v.momento}).\n${v.interpretacion}\n${fuente}`;
  try {
    await navigator.clipboard.writeText(texto);
  } catch (e) {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  ui.iconoCopiar.setAttribute("href", "#i-listo");
  ui.textoCopiar.textContent = "Copiado";
  ui.iconoCopiar.parentElement.animate(
    movimientoReducido()
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ transform: "scale(0.3) rotate(-30deg)", opacity: 0 }, { transform: "none", opacity: 1 }],
    { duration: 450, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
  );
  clearTimeout(temporizadorCopia);
  temporizadorCopia = setTimeout(() => {
    ui.iconoCopiar.setAttribute("href", "#i-copiar");
    ui.textoCopiar.textContent = "Copiar resultado";
  }, 1200);
}

// ----- Modo "Explícame" (docs/09-animaciones.md) -----

function abrirExplicame() {
  if (!resultadoActual || !grafico) return;
  explicacion = { pasos: resultadoActual.explicacion(grafico, vistaGuardada(tipoVisual)), indice: 0 };
  ui.puntos.innerHTML = explicacion.pasos.map(() => "<span></span>").join("");
  ui.explicame.hidden = false;
  ui.accionesGrafico.hidden = true;
  actualizarBotonVoz();
  mostrarPasoExplicame();
  // Si la última vez se escuchó, vuelve a hablar sola (este toque permite que suene).
  if (narrador?.tieneVoz() && preferenciaVoz()) encenderVoz();
  ui.siguiente.focus({ preventScroll: true });
}

// Que se vean juntos el gráfico y la explicación: lo justo para que el panel quede sobre la barra
// inferior, sin que el gráfico se salga por arriba (si no caben los dos, manda el gráfico).
function encuadrarExplicame() {
  const arriba = barraSuperior.offsetHeight + 8;
  const abajo = innerHeight - document.querySelector(".barra-inferior").offsetHeight - 8;
  const suave = movimientoReducido() ? "auto" : "smooth";
  if (ui.lienzo.hidden) {
    // Cadenas (conversión e indexadas): el panel queda fijo abajo (CSS) y se trae a la vista el
    // paso resaltado, sin que lo tape el panel.
    const nodo = (ui.visualHTML.querySelector(".cadena__nodo--resaltado") || ui.visualHTML).getBoundingClientRect();
    const libre = abajo - ui.explicame.offsetHeight - 8;
    if (nodo.top < arriba || nodo.bottom > libre) window.scrollTo({ top: Math.max(0, scrollY + nodo.top - arriba), behavior: suave });
    return;
  }
  const visual = ui.lienzo;
  const hastaElGrafico = alturaEnPagina(visual) - arriba; // más abajo de esto, el gráfico se sale
  const hastaElPanel = alturaEnPagina(ui.explicame) + ui.explicame.offsetHeight - abajo; // menos, el panel queda tapado
  const destino = Math.min(Math.max(scrollY, hastaElPanel), Math.max(hastaElGrafico, 0));
  if (Math.abs(destino - scrollY) > 2) window.scrollTo({ top: destino, behavior: suave });
}

function mostrarPasoExplicame() {
  const { pasos, indice } = explicacion;
  const paso = pasos[indice];
  ui.contador.textContent = `Paso ${indice + 1} de ${pasos.length}`;
  ui.explicameTexto.textContent = paso.texto;
  ui.explicameFormula.hidden = !paso.formula;
  ui.explicameFormula.innerHTML = paso.formula || "";
  reiniciarAnimacion(ui.cuerpo, "explicame__cuerpo--cambio");
  [...ui.puntos.children].forEach((punto, k) => punto.classList.toggle("activo", k === indice));
  ui.anterior.disabled = indice === 0;
  ui.siguiente.textContent = indice === pasos.length - 1 ? "Terminar" : "Siguiente";
  grafico.irA(paso.vista, 700);
  encuadrarExplicame();
  if (vozEncendida) narrarPaso();
}

function cerrarExplicame(restaurarGrafico = true) {
  if (!explicacion) return;
  apagarVoz();
  explicacion = null;
  ui.explicame.hidden = true;
  ui.accionesGrafico.hidden = false;
  if (restaurarGrafico && grafico) {
    grafico.irA({ enfoque: "todo" }, 400);
    $("abrir-explicame").focus({ preventScroll: true });
  }
}

// ----- Explicación en voz alta (voz.js) -----

// Con "Escuchar", cada paso se lee en voz alta y, al terminar, la explicación avanza sola.
// Anterior y Siguiente siguen funcionando: el paso nuevo se lee desde el principio.
const narrador = typeof vozDisponible === "function" && vozDisponible() ? crearNarrador() : null;
let vozEncendida = false;
let turnoNarracion = 0; // cambia al interrumpir: lo que termine tarde se ignora
let temporizadorNarracion = 0;
let vozElegida = null; // respaldo si el navegador no deja guardar

function preferenciaVoz() {
  if (vozElegida !== null) return vozElegida;
  try {
    return localStorage.getItem("voz-explicame") === "si";
  } catch (e) {
    return false;
  }
}

function guardarPreferenciaVoz(si) {
  vozElegida = si;
  try {
    localStorage.setItem("voz-explicame", si ? "si" : "no");
  } catch (e) {
    /* solo dura esta visita */
  }
}

function actualizarBotonVoz() {
  ui.botonVoz.hidden = !narrador || !narrador.tieneVoz();
  ui.botonVoz.setAttribute("aria-pressed", String(vozEncendida));
  ui.botonVoz.setAttribute("aria-label", vozEncendida ? "Detener la explicación en voz alta" : "Escuchar la explicación en voz alta");
  ui.textoVoz.textContent = vozEncendida ? "Detener" : "Escuchar";
}

function narrarPaso() {
  const turno = ++turnoNarracion;
  clearTimeout(temporizadorNarracion);
  const paso = explicacion.pasos[explicacion.indice];
  narrador.hablar(paso.voz ?? paso.texto).then((resultado) => {
    if (turno !== turnoNarracion || !explicacion || !vozEncendida) return;
    if (resultado === "error") {
      apagarVoz();
      avisar("No se pudo usar la voz en este dispositivo.");
      return;
    }
    if (resultado !== "fin") return;
    if (explicacion.indice >= explicacion.pasos.length - 1) {
      apagarVoz(); // terminó la explicación
      return;
    }
    // Una pausa corta entre pasos, como al explicar en el tablero.
    temporizadorNarracion = setTimeout(() => {
      if (turno !== turnoNarracion || !explicacion || !vozEncendida) return;
      explicacion.indice += 1;
      mostrarPasoExplicame();
    }, 700);
  });
}

function encenderVoz() {
  if (!narrador || !explicacion) return;
  vozEncendida = true;
  actualizarBotonVoz();
  narrarPaso();
}

function apagarVoz() {
  vozEncendida = false;
  turnoNarracion++;
  clearTimeout(temporizadorNarracion);
  narrador?.detener();
  actualizarBotonVoz();
}

function alternarVoz() {
  if (vozEncendida) {
    apagarVoz();
    guardarPreferenciaVoz(false);
  } else {
    guardarPreferenciaVoz(true);
    encenderVoz();
  }
}

// ----- ¿Y si…? -----

// Un deslizador mueve una variable del cálculo (la tasa, el tiempo…) y todo se recalcula en
// vivo con las fórmulas de finanzas.js: el número, el procedimiento y el gráfico, que se
// transforma. Las barras de abajo comparan cuánto cambió cada cosa frente a tu cálculo (× 1):
// así se ve, por ejemplo, que los intereses no crecen al mismo ritmo que el tiempo.
//
// Cada módulo dice cómo se mueven sus variables con unos ganchos (los de interés compuesto
// están aquí; los demás módulos los traen en registrarModulo):
//   variables(r)                       las que se pueden mover (no la que se calcula)
//   nombre(variable)                   "Tasa", "Tiempo"…
//   rango(variable, r)                 { inicial, maximo, paso? } en las unidades del deslizador
//   recalcular(r, variable, valor)     el cálculo con ese valor, o null si no tiene sentido
//   presentar(r)                       el resultado listo para mostrar
//   texto(variable, valor, r, corto)   cómo se lee el valor ("1,8 % efectiva mensual")
//   capturar() / restaurar(textos)     lo escrito en el formulario, para volver a dejarlo igual
//   escribir(variable, valor)          el formulario sigue al deslizador
//   filas(r, o, variable)              comparación: [{ nombre, valor, factor, clase }]
//   efecto(r, o, variable, sentido, filas)  la frase que explica el cambio (sentido: -1, 0, 1)
//   nota(r)                            una línea extra (por ejemplo, cada cuánto se duplica)

// Paso "redondo" del deslizador: el menor de la lista que no baja de `bruto`.
function pasoRedondo(bruto, opciones) {
  return opciones.find((opcion) => opcion >= bruto) ?? opciones[opciones.length - 1];
}

// Rangos comunes: una tasa (en %, como se escribió) o un número de periodos, desde casi cero
// hasta unas tres veces tu cálculo.
function rangoDeTasa(tasa) {
  const inicial = sinRuido(tasa.valor * 100);
  let maximo = Math.max(inicial * 3, inicial + 1);
  // Una tasa anticipada por periodo debe ser menor que 100 %.
  if (tasa.modalidad === "anticipada") maximo = Math.max(inicial, Math.min(maximo, 95 * (tasa.tipo === "nominal" ? tasa.m : 1)));
  return { inicial, maximo, paso: pasoRedondo(maximo / 200, [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10]) };
}

function rangoDePeriodos(n, minimoMaximo = 6) {
  const maximo = Math.max(n * 3, n + minimoMaximo);
  let paso = n >= 6 || esEntero(n) ? 1 : esEntero(n * 2) ? 0.5 : esEntero(n * 4) ? 0.25 : 0.1;
  paso = Math.max(paso, pasoRedondo(maximo / 400, [1, 2, 5, 10, 20, 50, 100]));
  return { inicial: n, maximo, paso };
}

// Cada cuánto se duplica el dinero a una tasa (Hoja 2.4 con F = 2P).
const notaDuplica = (i, p) => (i > 0 ? `A ${porcentaje(i)} ${p.adjetivo}, el dinero se duplica cada ${cantidadPeriodos(nCompuesto(1, 2, i))} ${p.plural}.` : "");

const YSI_COMPUESTO = {
  variables: (r) => ({ F: ["tiempo", "tasa"], P: ["tiempo", "tasa"], i: ["tiempo"], n: ["tasa"] })[r.incognita],
  nombre: (variable) => (variable === "tasa" ? "Tasa" : "Tiempo"),
  rango: (variable, r) => (variable === "tasa" ? rangoDeTasa(r.tasa) : rangoDePeriodos(r.n)),
  // Devuelve null si el resultado no tendría sentido (demasiado grande, menos de un centavo o
  // demasiados periodos para dibujar).
  recalcular(o, variable, valor) {
    const base = { incognita: o.incognita, m: o.m, P: o.P, F: o.F, tasa: o.tasa, n: o.n };
    const datos = variable === "tasa" ? { ...base, tasa: { ...base.tasa, valor: valor / 100 } } : { ...base, n: valor };
    const r = resolver(datos);
    if (!Number.isFinite(r.calculado) || Math.abs(r.calculado) > 1e15 || !Number.isFinite(r.i)) return null;
    if (r.incognita === "P" && r.P < 0.01) return null;
    if (r.incognita === "n" && r.n > 5000) return null;
    return r;
  },
  presentar: (r) => presentar(r),
  // "Tasa" se lee como se escribió (efectiva mensual, nominal…); "Tiempo", en su unidad.
  texto(variable, valor, r, corto) {
    if (variable === "tasa") {
      const tasa = { ...r.tasa, valor: valor / 100 };
      return corto ? porcentaje(tasa.valor) : describirTasa(tasa);
    }
    return describirTiempo(valor, r.m);
  },
  capturar: () => ({ tasa: ui.entradas.tasa.value, tiempo: ui.entradas.tiempo.value }),
  restaurar(textos) {
    ui.entradas.tasa.value = textos.tasa;
    ui.entradas.tiempo.value = textos.tiempo;
    actualizarTraduccion(false);
  },
  escribir(variable, valor) {
    if (variable === "tasa") {
      ui.entradas.tasa.value = textoDeEntrada(valor);
      actualizarTraduccion(false);
    } else ui.entradas.tiempo.value = textoDeEntrada(valor);
  },
  // La variable que se mueve y lo que más cambia con ella. factor: frente a tu cálculo (1 = igual).
  filas(r, o, variable) {
    const fila =
      variable === "tasa"
        ? { nombre: "Tasa", valor: porcentaje(r.tasa.valor), factor: r.tasa.valor / o.tasa.valor, clase: "" }
        : { nombre: "Tiempo", valor: describirTiempo(r.n, r.m), factor: r.n / o.n, clase: "" };
    switch (r.incognita) {
      case "F":
        return [fila, { nombre: "Intereses", valor: pesos(r.F - r.P), factor: (r.F - r.P) / (o.F - o.P), clase: "interes" }];
      case "P":
        return [fila, { nombre: "Hoy necesitas", valor: pesos(r.P), factor: r.P / o.P, clase: "capital" }];
      case "i":
        return [fila, { nombre: "Tasa necesaria", valor: `${porcentaje(r.i)} ${r.p.adjetivo}`, factor: r.i / o.i, clase: "interes" }];
      default:
        return [fila, { nombre: "Tiempo necesario", valor: describirTiempo(r.n, r.m), factor: r.n / o.n, clase: "capital" }];
    }
  },
  efecto(r, o, variable, sentido, [fila, efecto]) {
    const p = r.p;
    const deLaTasa = variable === "tasa";
    const comparacion = `(${factor(efecto.factor)} contra ${factor(fila.factor)})`;
    if (sentido === 0) {
      switch (r.incognita) {
        case "F":
          return `Mueve el control: si ${deLaTasa ? "duplicas la tasa" : "duplicas el tiempo"}, ¿se duplican los intereses?`;
        case "P":
          return `Mueve el control para ver cuánto tendrías que invertir hoy con ${deLaTasa ? "otra tasa" : "más o menos tiempo"}.`;
        case "i":
          return "Mueve el control para ver qué tasa necesitarías con más o menos tiempo.";
        default:
          return "Mueve el control para ver cuánto tardarías con otra tasa.";
      }
    }
    const sube = sentido > 0;
    switch (r.incognita) {
      case "F":
        if (!deLaTasa) {
          return sube
            ? `Los intereses crecen más rápido que el tiempo ${comparacion}: cada ${p.singular} también se gana interés sobre los intereses anteriores. Eso es el crecimiento exponencial.`
            : `Los intereses bajan más rápido que el tiempo ${comparacion}: se pierde el interés que ganarían los intereses en los últimos ${p.plural}.`;
        }
        if (o.n <= 1) return `Los intereses cambian ${factor(efecto.factor)} cuando la tasa cambia ${factor(fila.factor)}.`;
        return sube
          ? `Los intereses crecen más que la tasa ${comparacion}: la tasa se aplica ${describirTiempo(r.n, r.m)} seguidos, cada vez sobre un saldo mayor.`
          : `Los intereses bajan más que la tasa ${comparacion}: el efecto de la tasa se repite en cada uno de los ${describirTiempo(r.n, r.m)}.`;
      case "P":
        if (!deLaTasa) {
          return sube
            ? `Con más tiempo necesitas invertir menos hoy: por cada ${p.singular} de más, lo que necesitas se divide entre ${decimal(1 + r.i)}.`
            : `Con menos tiempo necesitas invertir más hoy: por cada ${p.singular} de menos, lo que necesitas se multiplica por ${decimal(1 + r.i)}.`;
        }
        return sube ? "Con una tasa más alta necesitas invertir menos hoy: cada peso crece más rápido." : "Con una tasa más baja necesitas invertir más hoy: cada peso crece más despacio.";
      case "i":
        return sube
          ? `Con más tiempo basta una tasa menor para llegar a ${pesos(r.F)}: el interés tiene más ${p.plural} para acumularse.`
          : `Con menos tiempo necesitas una tasa mayor para llegar a ${pesos(r.F)}.`;
      default:
        return sube
          ? `Con una tasa mayor llegas antes a la meta: ${describirTiempo(r.n, r.m)} en vez de ${describirTiempo(o.n, o.m)}.`
          : `Con una tasa menor tardas más en llegar a la meta: ${describirTiempo(r.n, r.m)} en vez de ${describirTiempo(o.n, o.m)}.`;
    }
  },
  nota: (r) => notaDuplica(r.i, r.p),
};

const ganchosYSi = (v) => (v.modulo ? MODULOS[v.modulo].ysi : YSI_COMPUESTO);

// ysi: { ganchos, original (resultado de tu cálculo), textos (lo que estaba escrito),
// variable, rango, j (pasos desde tu cálculo), escala }
let ysi = null;
let cuadroYSi = 0;

function abrirYSi() {
  if (!resultadoActual || !grafico) return;
  if (ui.resultado.classList.contains("resultado--desactualizado")) {
    calcularActual(); // primero se calcula con lo que está escrito
    if (ui.resultado.classList.contains("resultado--desactualizado")) return;
  }
  const ganchos = ganchosYSi(resultadoActual);
  if (!ganchos) return;
  ysi = { ganchos, original: resultadoActual, textos: ganchos.capturar(), variable: null, j: 0 };
  const variables = ganchos.variables(resultadoActual.calculo);
  // Una opción por variable (tasa, tiempo, puntos…); con una sola, no hace falta elegir.
  ui.ysiOpciones.style.setProperty("--opciones", variables.length);
  ui.ysiOpciones.innerHTML =
    '<span class="segmentado__indicador" aria-hidden="true"></span>' +
    variables.map((variable) => `<label class="segmentado__opcion"><input type="radio" name="ysi-variable" value="${variable}">${ganchos.nombre(variable)}</label>`).join("");
  ui.ysiOpciones.hidden = variables.length < 2;
  const opcion = ui.ysiOpciones.querySelector(`input[value="${variables[0]}"]`);
  opcion.checked = true;
  opcion.dispatchEvent(new Event("change", { bubbles: true })); // mueve el indicador y prepara el deslizador
  if (ysi.variable !== variables[0]) prepararVariableYSi(variables[0]);
  ui.ysi.hidden = false;
  ui.accionesGrafico.hidden = true;
  ui.tarjetaGrafico.classList.add("grafico--ysi"); // sin leyenda ni pista: el gráfico y el panel caben juntos
  ui.ysiDeslizador.focus({ preventScroll: true });
  ui.lectura.scrollIntoView({ behavior: movimientoReducido() ? "auto" : "smooth", block: "start" });
}

// Valor de la variable a j pasos de tu cálculo.
function valorYSi(j) {
  return sinRuido(ysi.rango.inicial + j * ysi.rango.paso);
}

function calculoYSi(j) {
  return ysi.ganchos.recalcular(ysi.original.calculo, ysi.variable, valorYSi(j));
}

// Rango del deslizador, con tu cálculo exactamente en una posición (j = 0).
function prepararVariableYSi(variable) {
  const { ganchos } = ysi;
  const o = ysi.original.calculo;
  const habiaCambio = ysi.j !== 0;
  ysi.variable = variable;
  ganchos.restaurar(ysi.textos); // cada variable se compara sola con tu cálculo: la otra vuelve a su valor
  const { inicial, maximo, paso } = ganchos.rango(variable, o);
  ysi.rango = { inicial, paso };
  let jMin = Math.ceil((paso / 2 - inicial) / paso - 1e-9);
  let jMax = Math.floor((maximo - inicial) / paso + 1e-9);
  while (jMax > 0 && !calculoYSi(jMax)) jMax--;
  while (jMin < 0 && !calculoYSi(jMin)) jMin++;
  ysi.rango.jMin = jMin;
  ysi.rango.jMax = jMax;

  ui.ysiNombre.textContent = ganchos.nombre(variable);
  ui.ysiDeslizador.min = String(jMin);
  ui.ysiDeslizador.max = String(jMax);
  ui.ysiDeslizador.value = "0";
  ui.ysiMinimo.textContent = ganchos.texto(variable, valorYSi(jMin), o, true);
  ui.ysiMaximo.textContent = ganchos.texto(variable, valorYSi(jMax), o, true);
  ui.ysi.style.setProperty("--marca", String(-jMin / (jMax - jMin || 1)));

  // Una escala fija para las barras mientras se mueve esta variable: la más larga cabe justo
  // (hasta × 4; lo que pase de ahí llena la barra).
  const extremos = [jMin, jMax].map(calculoYSi).filter(Boolean);
  const mayor = Math.max(...extremos.flatMap((r) => ganchos.filas(r, o, variable).map((fila) => fila.factor)));
  ysi.escala = Math.min(Math.max(1.5, mayor * 1.04), 4);
  ui.ysiComparacion.innerHTML = ganchos
    .filas(o, o, variable)
    .map(
      (fila) => `<div class="comparacion__fila${fila.clase ? ` comparacion__fila--${fila.clase}` : ""}">
        <span class="comparacion__texto">${fila.nombre} <strong></strong></span>
        <span class="comparacion__factor"></span>
        <span class="comparacion__barra" style="--origen: ${1 / ysi.escala}"><span></span></span>
      </div>`
    )
    .join("");
  ysi.j = 0;
  if (habiaCambio) aplicarYSi(0, false); // de vuelta a tu cálculo, con transición
  else pintarYSi(o, ysi.original);
}

// Mueve la variable a j pasos de tu cálculo y recalcula todo.
// enVivo: llega del deslizador; si no, es un salto (por ejemplo, volver a tu cálculo).
function aplicarYSi(j, enVivo = true) {
  const r = calculoYSi(j);
  if (!r) return;
  if (j === 0 && ysi.j !== 0 && enVivo) vibrar(6); // un toque leve al pasar por tu cálculo
  ysi.j = j;
  // El formulario sigue al deslizador: lo que se ve calculado es lo que está escrito.
  if (j === 0) ysi.ganchos.restaurar(ysi.textos);
  else ysi.ganchos.escribir(ysi.variable, valorYSi(j));
  const v = ysi.ganchos.presentar(r);
  mostrarResultado(v, { enVivo, desplazar: false, transformar: true });
  pintarYSi(r, v);
}

function pintarYSi(r, v) {
  const { ganchos } = ysi;
  const o = ysi.original.calculo;
  const { jMin, jMax } = ysi.rango;
  const total = jMax - jMin || 1;
  const marca = -jMin / total;
  const posicion = (ysi.j - jMin) / total;
  ui.ysi.style.setProperty("--desde", String(Math.min(marca, posicion)));
  ui.ysi.style.setProperty("--hasta", String(Math.max(marca, posicion)));
  const valorTexto = ganchos.texto(ysi.variable, valorYSi(ysi.j), o, false);
  ui.ysiValor.textContent = valorTexto;
  ui.ysiDeslizador.setAttribute("aria-valuetext", `${valorTexto}. ${v.etiqueta}: ${v.formatear(v.valor)}`);

  const filas = ganchos.filas(r, o, ysi.variable);
  [...ui.ysiComparacion.children].forEach((elemento, k) => {
    const fila = filas[k];
    elemento.querySelector("strong").textContent = fila.valor;
    elemento.querySelector(".comparacion__factor").textContent = factor(fila.factor);
    elemento.querySelector(".comparacion__barra").style.setProperty("--largo", String(fila.factor / ysi.escala));
  });
  ui.ysiEfecto.textContent = ganchos.efecto(r, o, ysi.variable, Math.sign(ysi.j), filas);
  ui.ysiDoble.textContent = ganchos.nota(r);
}

// El deslizador puede mandar muchos cambios por cuadro: se aplica solo el último.
function alMoverYSi() {
  if (!ysi || cuadroYSi) return;
  cuadroYSi = requestAnimationFrame(() => {
    cuadroYSi = 0;
    if (ysi) aplicarYSi(Number(ui.ysiDeslizador.value));
  });
}

function volverAMiCalculo() {
  if (!ysi) return;
  cancelAnimationFrame(cuadroYSi);
  cuadroYSi = 0;
  ui.ysiDeslizador.value = "0";
  if (ysi.j !== 0) aplicarYSi(0, false);
}

// Cierra "¿Y si…?". Con guardar (botón "Listo"), si el resultado cambió queda como un cálculo
// más en el historial; si no, los valores quedan como estén.
function cerrarYSi(guardar = false) {
  if (!ysi) return;
  cancelAnimationFrame(cuadroYSi);
  cuadroYSi = 0;
  const cambio = ysi.j !== 0;
  ysi = null;
  ui.ysi.hidden = true;
  ui.accionesGrafico.hidden = false;
  ui.tarjetaGrafico.classList.remove("grafico--ysi");
  if (!guardar) return;
  $("abrir-ysi").focus({ preventScroll: true });
  if (cambio && resultadoActual) {
    guardarEnHistorial(resultadoActual);
    anunciar(`${resultadoActual.etiqueta}: ${resultadoActual.formatear(resultadoActual.valor)}.`);
  }
}

// ----- Limpiar y ejemplos -----

function limpiar() {
  for (const campo of Object.keys(ui.entradas)) ui.entradas[campo].value = "";
  limpiarErrores();
  actualizarLeido("P");
  actualizarLeido("F");
  actualizarTraduccion();
  ocultarResultado();
}

function cargarEjemplo() {
  const ejemplo = EJEMPLOS[incognitaActual()];
  limpiarErrores();
  for (const campo of Object.keys(ui.entradas)) ui.entradas[campo].value = ejemplo[campo] ?? "";
  if (ejemplo.tipo) marcarFormaDeTasa(ejemplo);
  ui.unidadTiempo.value = String(ejemplo.unidad);
  actualizarLeido("P");
  actualizarLeido("F");
  actualizarPeriodoTasa();
  actualizarTraduccion();
  marcarDesactualizado();
}

// ===================== Historial =====================

// Los últimos cálculos se guardan en este navegador (localStorage "historial") con los datos
// que se escribieron, para volver a cualquiera con un toque: se llenan los campos y se calcula.
const MAX_HISTORIAL = 20;
let historialRespaldo = []; // si el navegador no deja guardar, dura esta visita

function leerHistorial() {
  try {
    const lista = JSON.parse(localStorage.getItem("historial") || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return historialRespaldo;
  }
}

function escribirHistorial(lista) {
  historialRespaldo = lista;
  try {
    localStorage.setItem("historial", JSON.stringify(lista));
  } catch (e) {
    /* solo dura esta visita */
  }
}

// Los datos que se escribieron (solo los que pide la incógnita), en números.
function camposDelCalculo(r) {
  const usa = CAMPOS[r.incognita];
  const campos = { incognita: r.incognita, unidad: r.m };
  if (usa.includes("P")) campos.P = r.P;
  if (usa.includes("F")) campos.F = r.F;
  if (usa.includes("tasa")) campos.tasa = { porcentaje: sinRuido(r.tasa.valor * 100), tipo: r.tasa.tipo, m: r.tasa.m, modalidad: r.tasa.modalidad };
  if (usa.includes("tiempo")) campos.n = r.n;
  return campos;
}

// "P = $ 10.000.000 · 18 % nominal anual mes vencido · 24 meses"
function resumenDelCalculo(r) {
  const partes = [];
  if (r.incognita !== "P") partes.push(`P = ${pesos(r.P)}`);
  if (r.incognita !== "F") partes.push(`F = ${pesos(r.F)}`);
  if (r.incognita !== "i") partes.push(describirTasa(r.tasa));
  if (r.incognita !== "n") partes.push(describirTiempo(r.n, r.m));
  return partes.join(" · ");
}

// Un cálculo con los mismos datos no se repite: sube al principio con su hora nueva.
// Interés compuesto guarda sus datos en números (campos); los demás módulos guardan lo que
// está escrito en su formulario (formulario.js: leerFormulario).
function guardarEnHistorial(v) {
  const modulo = moduloDelResultado(v);
  const entrada = modulo
    ? { modulo: v.modulo, formulario: leerFormulario(modulo.formulario), resumen: v.resumen }
    : { campos: camposDelCalculo(v.calculo), resumen: resumenDelCalculo(v.calculo) };
  entrada.clave = JSON.stringify([v.modulo || "interes-compuesto", entrada.formulario || entrada.campos]);
  const lista = leerHistorial().filter((otra) => otra.clave !== entrada.clave);
  lista.unshift({ ...entrada, fecha: Date.now(), etiqueta: v.etiqueta, valor: v.formatear(v.valor) });
  escribirHistorial(lista.slice(0, MAX_HISTORIAL));
}

const formatoHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });
const formatoDia = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });

// "hoy, 10:32 a. m.", "ayer, 4:05 p. m." o "12 oct"
function cuandoFue(fecha) {
  const dia = new Date(fecha);
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (dia.toDateString() === hoy.toDateString()) return `hoy, ${formatoHora.format(dia)}`;
  if (dia.toDateString() === ayer.toDateString()) return `ayer, ${formatoHora.format(dia)}`;
  return formatoDia.format(dia);
}

const escaparHTML = (texto) => String(texto).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function pintarHistorial(animar = false) {
  const lista = leerHistorial();
  const contenedor = $("historial-lista");
  contenedor.innerHTML = lista
    .map(
      (entrada, k) => `<li class="historial__item" style="--i: ${k}">
        <button class="historial__abrir" type="button" data-fecha="${entrada.fecha}">
          <span class="historial__icono" aria-hidden="true"><svg class="icono" width="22" height="22"><use href="#${MODULOS[entrada.modulo]?.icono || "i-compuesto"}"/></svg></span>
          <span class="historial__texto">
            <span class="historial__titulo">${escaparHTML(entrada.etiqueta)} · ${cuandoFue(entrada.fecha)}</span>
            <span class="historial__valor">${escaparHTML(entrada.valor)}</span>
            <span class="historial__detalle">${escaparHTML(entrada.resumen)}</span>
          </span>
        </button>
        <button class="boton-icono historial__quitar" type="button" data-quitar="${entrada.fecha}" aria-label="Quitar del historial: ${escaparHTML(entrada.etiqueta)} ${escaparHTML(entrada.valor)}">
          <svg class="icono" width="20" height="20" aria-hidden="true"><use href="#i-cerrar"/></svg>
        </button>
      </li>`
    )
    .join("");
  if (animar) reiniciarAnimacion(contenedor, "historial--entrar");
  $("historial-vacio").hidden = lista.length > 0;
  $("historial-borrar").hidden = lista.length === 0;
}

// Llena el formulario con los datos guardados (como "Cargar un ejemplo").
function llenarFormulario(campos) {
  limpiarErrores();
  marcar("incognita", campos.incognita);
  for (const campo of Object.keys(ui.entradas)) ui.entradas[campo].value = "";
  if (campos.P !== undefined) ui.entradas.P.value = textoDeEntrada(campos.P);
  if (campos.F !== undefined) ui.entradas.F.value = textoDeEntrada(campos.F);
  if (campos.tasa) {
    ui.entradas.tasa.value = textoDeEntrada(campos.tasa.porcentaje);
    marcarFormaDeTasa(campos.tasa);
  }
  if (campos.n !== undefined) ui.entradas.tiempo.value = textoDeEntrada(campos.n);
  ui.unidadTiempo.value = String(campos.unidad);
  actualizarLeido("P");
  actualizarLeido("F");
  actualizarPeriodoTasa();
  actualizarTraduccion(false);
}

function abrirDelHistorial(fecha) {
  const entrada = leerHistorial().find((otra) => otra.fecha === fecha);
  if (entrada) abrirCalculo(entrada);
}

// Abre un cálculo con sus datos: { modulo, formulario } de un módulo o { campos } de interés
// compuesto (como los guarda el historial). Llena el formulario y calcula.
function abrirCalculo(entrada) {
  const modulo = entrada.modulo ? MODULOS[entrada.modulo] : null;
  if (modulo) {
    // Se llena al llegar, porque al entrar el módulo puede reacomodar su formulario.
    trasNavegar = () => {
      escribirFormulario(modulo.formulario, entrada.formulario);
      calcularModulo(modulo);
    };
    irARuta(modulo.id);
    return;
  }
  llenarFormulario(entrada.campos);
  trasNavegar = calcular;
  irARuta("interes-compuesto");
}

function quitarDelHistorial(fecha, elemento) {
  escribirHistorial(leerHistorial().filter((entrada) => entrada.fecha !== fecha));
  const terminar = () => pintarHistorial();
  if (movimientoReducido()) {
    terminar();
    return;
  }
  // Se desliza a un lado y la lista se cierra sobre el hueco.
  const alto = elemento.offsetHeight;
  elemento.animate(
    [
      { opacity: 1, transform: "none", height: `${alto}px`, marginBottom: "0px" },
      { opacity: 0, transform: "translateX(-24px)", height: `${alto}px`, marginBottom: "0px", offset: 0.45 },
      { opacity: 0, transform: "translateX(-24px)", height: "0px", marginBottom: "-10px" },
    ],
    { duration: 380, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }
  ).finished.then(terminar, terminar);
}

function borrarHistorial() {
  const respaldo = leerHistorial();
  escribirHistorial([]);
  pintarHistorial();
  avisar("Se borró el historial.", {
    accion: "Deshacer",
    alTocar: () => {
      escribirHistorial(respaldo);
      pintarHistorial(true);
    },
    duracion: 6000,
  });
}

// ===================== App instalable y sin internet =====================

// Publicada en internet (https), la app se instala como cualquier otra y funciona sin
// conexión gracias a sw.js. Abierta con doble clic (file://) también funciona, pero no se instala.
const publicada = location.protocol === "https:" || location.protocol === "http:";
let invitacionInstalar = null; // evento "beforeinstallprompt" (Chrome y Edge, en Android y en computador)

const enModoApp = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const esIPhone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function prepararAppInstalable() {
  if (publicada && "serviceWorker" in navigator) {
    const registrar = () => navigator.serviceWorker.register("sw.js").catch(() => {}); // sin él, la app funciona igual con internet
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
    navigator.serviceWorker.ready.then(() => ($("instalar-sin-internet").hidden = false));
  }
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault(); // se ofrece con un botón propio
    invitacionInstalar = evento;
    mostrarEstadoInstalacion();
  });
  window.addEventListener("appinstalled", () => {
    invitacionInstalar = null;
    mostrarEstadoInstalacion();
    avisar("Listo: la calculadora quedó instalada.");
  });
  window.addEventListener("offline", () => avisar("Sin conexión. La calculadora sigue funcionando."));
  $("instalar").addEventListener("click", instalar);
  $("instalar-desde-inicio").addEventListener("click", instalar);
  $("descartar-instalar").addEventListener("click", () => {
    try {
      localStorage.setItem("aviso-instalar", "descartado");
    } catch (e) {
      /* sin almacenamiento */
    }
    $("aviso-instalar").hidden = true;
  });
  mostrarEstadoInstalacion();
}

async function instalar() {
  if (!invitacionInstalar) return;
  const evento = invitacionInstalar;
  invitacionInstalar = null; // la invitación solo se puede usar una vez
  evento.prompt();
  await evento.userChoice.catch(() => null);
  mostrarEstadoInstalacion();
}

function mostrarEstadoInstalacion() {
  const estado = $("instalar-estado");
  if (enModoApp()) estado.textContent = "Estás usando la app instalada.";
  else if (!publicada) estado.textContent = "Cuando la app esté publicada en internet (por ejemplo, en GitHub Pages), podrás instalarla en el celular y usarla sin conexión.";
  else if (invitacionInstalar) estado.textContent = "Instálala para abrirla desde la pantalla de inicio, como cualquier app, también sin internet.";
  else if (esIPhone()) estado.innerHTML = "En iPhone o iPad: toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.";
  else estado.innerHTML = "Para instalarla, abre el menú del navegador y elige <strong>Instalar app</strong> o <strong>Agregar a la pantalla de inicio</strong>.";
  $("instalar").hidden = !invitacionInstalar;
  let descartado = false;
  try {
    descartado = localStorage.getItem("aviso-instalar") === "descartado";
  } catch (e) {
    /* sin almacenamiento */
  }
  $("aviso-instalar").hidden = !invitacionInstalar || descartado || enModoApp();
}

// ===================== Inicio =====================

function iniciar() {
  const opcionMovimiento = document.querySelector(`input[name="movimiento"][value="${preferenciaMovimiento()}"]`);
  if (opcionMovimiento) opcionMovimiento.checked = true;
  prepararTarjetaGrafico("crecimiento");
  aplicarMovimiento();
  prepararSegmentados();
  actualizarControlesDeTema();
  mostrarCampos();
  actualizarPeriodoTasa();

  ui.form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    calcular();
  });
  ui.form.addEventListener("input", marcarDesactualizado);
  ui.form.addEventListener("change", (evento) => {
    marcarDesactualizado();
    if (evento.target.name === "incognita") mostrarCampos();
    if (evento.target.name === "tipo-tasa") actualizarPeriodoTasa();
    actualizarTraduccion();
  });
  for (const campo of Object.keys(ui.entradas)) {
    ui.entradas[campo].addEventListener("input", () => {
      limpiarError(campo);
      if (ui.leidos[campo]) actualizarLeido(campo);
      if (campo === "tasa") actualizarTraduccion(false);
    });
  }

  $("limpiar").addEventListener("click", limpiar);
  $("cargar-ejemplo").addEventListener("click", cargarEjemplo);
  $("nuevo-calculo").addEventListener("click", () => {
    const modulo = moduloDelResultado(resultadoActual);
    if (modulo) modulo.limpiar();
    else limpiar();
    window.scrollTo({ top: 0, behavior: movimientoReducido() ? "auto" : "smooth" });
    const formulario = modulo ? modulo.formulario : ui.form;
    const primero = formulario.querySelector(".plegable:not(.plegable--cerrado) input[type=text], .campo input[type=text]");
    primero?.focus({ preventScroll: true });
  });
  $("copiar-resultado").addEventListener("click", copiarResultado);
  $("usar-tasa").addEventListener("click", alternarUsarTasa);
  $("usar-tasa-lista").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-destino]");
    if (boton) usarTasaEn(boton.dataset.destino);
  });
  $("repetir-grafico").addEventListener("click", () => grafico?.construir());
  $("abrir-explicame").addEventListener("click", abrirExplicame);
  ui.anterior.addEventListener("click", () => {
    explicacion.indice -= 1;
    mostrarPasoExplicame();
  });
  ui.siguiente.addEventListener("click", () => {
    if (explicacion.indice === explicacion.pasos.length - 1) cerrarExplicame();
    else {
      explicacion.indice += 1;
      mostrarPasoExplicame();
    }
  });
  $("explicame-cerrar").addEventListener("click", () => cerrarExplicame());
  ui.botonVoz.addEventListener("click", alternarVoz);
  narrador?.alCambiarVoces(actualizarBotonVoz); // algunas voces llegan después de cargar
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && vozEncendida) apagarVoz();
  });
  ui.detalleBoton.addEventListener("click", alternarDetalle);

  // ¿Y si…?
  $("abrir-ysi").addEventListener("click", abrirYSi);
  ui.ysiDeslizador.addEventListener("input", alMoverYSi);
  ui.ysiDeslizador.addEventListener("change", () => ysi && anunciar(ui.ysiEfecto.textContent));
  ui.ysiOpciones.addEventListener("change", (evento) => {
    if (ysi && ysi.variable !== evento.target.value) prepararVariableYSi(evento.target.value);
  });
  $("ysi-volver").addEventListener("click", volverAMiCalculo);
  $("ysi-listo").addEventListener("click", () => cerrarYSi(true));

  // Historial
  $("historial-lista").addEventListener("click", (evento) => {
    const abrir = evento.target.closest("[data-fecha]");
    const quitar = evento.target.closest("[data-quitar]");
    if (abrir) abrirDelHistorial(Number(abrir.dataset.fecha));
    else if (quitar) quitarDelHistorial(Number(quitar.dataset.quitar), quitar.closest("li"));
  });
  $("historial-borrar").addEventListener("click", borrarHistorial);

  $("cambiar-tema").addEventListener("click", cambiarTema);
  temaOscuroDelSistema.addEventListener("change", () => {
    actualizarControlesDeTema();
    document.dispatchEvent(new Event("cambio-tema"));
  });
  $("volver").addEventListener("click", () => (location.hash = `#${PANTALLAS[rutaActual]?.volverA || "inicio"}`));
  window.addEventListener("hashchange", navegar);

  // Animaciones: onda en los botones, preferencia en "Acerca de" y aviso del inicio.
  for (const boton of document.querySelectorAll(".boton")) boton.addEventListener("pointerdown", ondaAlTocar);
  for (const opcion of document.querySelectorAll('input[name="movimiento"]')) {
    opcion.addEventListener("change", () => elegirMovimiento(opcion.value));
  }
  $("selector-vista").addEventListener("change", (evento) => elegirTipoGrafico(evento.target.value));
  sistemaReduceMovimiento.addEventListener("change", aplicarMovimiento);
  $("activar-animaciones").addEventListener("click", () => {
    elegirMovimiento("siempre");
    animarInicio();
  });
  $("descartar-aviso").addEventListener("click", () => {
    try {
      localStorage.setItem("aviso-movimiento", "descartado");
    } catch (e) {
      /* sin almacenamiento */
    }
    $("aviso-movimiento").hidden = true;
  });

  prepararAppInstalable();
  animarInicio();
  navegar();
}

// iniciar() se llama al final de index.html, cuando ya se registraron todos los módulos.
