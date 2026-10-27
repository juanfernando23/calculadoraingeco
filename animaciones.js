/* animaciones.js
 * Animaciones de la calculadora (ver docs/09-animaciones.md).
 * Regla: aquí no se calcula nada financiero. Las cifras vienen del resultado ya
 * calculado o de las funciones de finanzas.js.
 */

// ===================== Preferencia de movimiento =====================

// La página marca <html data-movimiento="reducido"> cuando el sistema pide reducir el
// movimiento (y la persona no eligió "Siempre") o cuando eligió "Reducidas".
// En ese modo no hay desplazamientos: las animaciones se cambian por fundidos cortos.
function movimientoReducido() {
  return document.documentElement.dataset.movimiento === "reducido";
}

// ===================== Curvas de velocidad =====================

// Frena al final.
function suavizar(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Arranca despacio, acelera y vuelve a frenar.
function entradaSalida(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Pasa un poco del final y regresa (≈ 5 %): da sensación de peso.
function resorte(t) {
  const u = t - 1;
  return 1 + 2.2 * u * u * u + 1.2 * u * u;
}

function mezclar(a, b, t) {
  return a + (b - a) * t;
}

// ===================== Herramientas generales =====================

// Reproduce dibujar(t), con t de 0 a 1, durante `duracion` milisegundos.
// Devuelve una función que salta al estado final. Mientras estaPausada() sea verdadera
// el tiempo no avanza (por ejemplo, si el gráfico salió de la pantalla).
// En movimiento reducido dibuja directamente el estado final.
function reproducir(dibujar, duracion, estaPausada = () => false) {
  if (movimientoReducido() || duracion <= 0) {
    dibujar(1);
    return () => {};
  }
  let id = 0;
  let anterior = null;
  let transcurrido = 0;
  let terminada = false;

  function cuadro(ahora) {
    const pausada = estaPausada();
    if (anterior !== null && !pausada) {
      // Si la pestaña estuvo oculta, el avance se limita a 50 ms: la animación no salta.
      transcurrido += Math.min(ahora - anterior, 50);
    }
    anterior = ahora;
    const t = Math.min(transcurrido / duracion, 1);
    if (t >= 1) terminada = true;
    if (!pausada || terminada) dibujar(t);
    if (!terminada) id = requestAnimationFrame(cuadro);
  }

  id = requestAnimationFrame(cuadro);
  return () => {
    if (terminada) return;
    terminada = true;
    cancelAnimationFrame(id);
    dibujar(1);
  };
}

// Avance (0 a 1) del elemento `indice` cuando la animación general va en `t`.
// Todos los elementos caben en la misma duración total, sean 6 o 360.
function avanceEscalonado(t, indice, total, solape = 0.3) {
  const tramo = 1 / (total * (1 - solape) + solape);
  const inicio = indice * tramo * (1 - solape);
  return Math.min(Math.max((t - inicio) / tramo, 0), 1);
}

// Número tipo odómetro: cada dígito es una columna que gira hasta su valor.
// Con `desde` (el texto que se mostraba antes, con el mismo formato) solo giran los dígitos
// que cambian, desde su valor anterior y en el sentido en que cambió el número: así se ve
// cuánto cambió el resultado. El texto completo queda disponible para lectores de pantalla.
function rodarNumero(elemento, texto, { duracion = 950, escalonado = 28, desde = null } = {}) {
  elemento.textContent = "";
  const accesible = document.createElement("span");
  accesible.className = "solo-lector";
  accesible.textContent = texto;
  const visual = document.createElement("span");
  visual.className = "odometro";
  visual.setAttribute("aria-hidden", "true");
  elemento.append(accesible, visual);

  if (movimientoReducido()) {
    visual.textContent = texto;
    visual.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    return;
  }

  const esDigito = (caracter) => caracter >= "0" && caracter <= "9";
  const nuevo = [...texto];
  const viejo = desde === null ? null : [...desde];
  // Se compara de derecha a izquierda para que los decimales queden alineados.
  const anteriorEn = (k) => (viejo ? viejo[viejo.length - nuevo.length + k] : undefined);
  const sube = !viejo || Number(texto.replace(/\D/g, "")) >= Number(desde.replace(/\D/g, ""));
  const posicion = (indice) => `translateY(calc(var(--alto-digito) * ${-indice}))`;

  const tiras = [];
  let orden = 0; // al recalcular, el escalonado solo cuenta lo que cambia
  nuevo.forEach((caracter, k) => {
    const celda = document.createElement("span");
    celda.className = "odometro__celda";
    visual.append(celda);
    const antes = anteriorEn(k);
    if (!esDigito(caracter)) {
      celda.textContent = caracter;
      if (antes !== caracter) {
        celda.classList.add("odometro__signo");
        celda.style.animationDelay = `${(viejo ? orden : k) * escalonado}ms`;
      }
      return;
    }
    // Dos vueltas de 0 a 9 en cada columna.
    const tira = document.createElement("span");
    tira.className = "odometro__tira";
    for (let vuelta = 0; vuelta < 2; vuelta++) {
      for (let d = 0; d <= 9; d++) {
        const digito = document.createElement("span");
        digito.textContent = d;
        tira.append(digito);
      }
    }
    celda.append(tira);

    const d = Number(caracter);
    let inicio = 0;
    let fin = 10 + d;
    if (viejo) {
      const v = antes !== undefined && esDigito(antes) ? Number(antes) : 0;
      if (v === d) inicio = fin = 10 + d;
      else if (sube) [inicio, fin] = [v, d > v ? d : d + 10];
      else [inicio, fin] = [v + 10, d < v ? d + 10 : d];
    }
    tira.style.transform = posicion(inicio);
    if (inicio !== fin) {
      tira.style.transitionDuration = `${viejo ? 750 : duracion}ms`;
      tira.style.transitionDelay = `${(viejo ? orden : k) * escalonado}ms`;
      tiras.push({ tira, fin });
      orden++;
    }
  });

  // Dos cuadros después, para que el navegador pinte la posición inicial antes de girar.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const { tira, fin } of tiras) tira.style.transform = posicion(fin);
    })
  );
}

// Ajusta el canvas a la densidad de la pantalla para que se vea nítido.
function prepararCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // se dibuja en píxeles CSS
  return { ctx, width, height };
}

// Los colores salen de las variables CSS, así el modo oscuro también aplica al canvas.
function leerColores(elemento) {
  const css = getComputedStyle(elemento);
  const valor = (nombre) => css.getPropertyValue(nombre).trim();
  return {
    capital: valor("--grafico-capital"),
    interes: valor("--grafico-interes"),
    interesSuave: valor("--interes-suave"),
    linea: valor("--primario-fuerte"),
    meta: valor("--texto-2"),
    texto: valor("--texto-3"),
    textoFuerte: valor("--texto"),
    borde: valor("--borde"),
    superficie: valor("--superficie"),
    fuente: css.fontFamily,
  };
}

// "#0b5c6b" con transparencia, para degradados y halos.
function conAlfa(color, alfa) {
  const hex = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

function rectanguloRedondeado(ctx, x, y, ancho, alto, radios) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, ancho, alto, radios);
  else ctx.rect(x, y, ancho, alto);
}

// Barra con las esquinas de arriba redondeadas.
function rellenarBarra(ctx, x, y, ancho, alto, radio) {
  if (alto <= 0) return;
  rectanguloRedondeado(ctx, x, y, ancho, alto, radio > 0 ? [radio, radio, 0, 0] : 0);
  ctx.fill();
}

// ===================== Curva suave =====================

// Pendientes de una curva monótona (método de Fritsch y Carlson): la curva pasa por todos
// los puntos, es suave y nunca sube o baja más allá de ellos (no inventa ondas).
function tangentesMonotonas(puntos) {
  const n = puntos.length;
  if (n < 2) return new Array(n).fill(0);
  const pendientes = [];
  for (let k = 0; k < n - 1; k++) {
    pendientes.push((puntos[k + 1].y - puntos[k].y) / (puntos[k + 1].x - puntos[k].x || 1));
  }
  const m = new Array(n);
  m[0] = pendientes[0];
  m[n - 1] = pendientes[n - 2];
  for (let k = 1; k < n - 1; k++) {
    m[k] = pendientes[k - 1] * pendientes[k] <= 0 ? 0 : (pendientes[k - 1] + pendientes[k]) / 2;
  }
  for (let k = 0; k < n - 1; k++) {
    const d = pendientes[k];
    if (d === 0) {
      m[k] = 0;
      m[k + 1] = 0;
      continue;
    }
    const a = m[k] / d;
    const b = m[k + 1] / d;
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      m[k] = tau * a * d;
      m[k + 1] = tau * b * d;
    }
  }
  return m;
}

// Agrega al trazo los tramos curvos desde puntos[0] (que debe ser el punto actual).
function tramosSuaves(ctx, puntos, tangentes) {
  for (let k = 0; k < puntos.length - 1; k++) {
    const a = puntos[k];
    const b = puntos[k + 1];
    const h = (b.x - a.x) / 3;
    ctx.bezierCurveTo(a.x + h, a.y + tangentes[k] * h, b.x - h, b.y - tangentes[k + 1] * h, b.x, b.y);
  }
}

// Altura de la curva suave en cualquier x (para que los puntos corran sobre ella).
function yEnCurva(puntos, tangentes, x) {
  if (x <= puntos[0].x) return puntos[0].y;
  for (let k = 0; k < puntos.length - 1; k++) {
    const a = puntos[k];
    const b = puntos[k + 1];
    if (x <= b.x) {
      const h = b.x - a.x || 1;
      const t = (x - a.x) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * a.y + (t3 - 2 * t2 + t) * h * tangentes[k] + (-2 * t3 + 3 * t2) * b.y + (t3 - t2) * h * tangentes[k + 1];
    }
  }
  return puntos[puntos.length - 1].y;
}

// ===================== A4 · Crecimiento compuesto =====================

const MAX_BARRAS = 40;
const DURACION_CONSTRUIR = 3600;
const DURACION_ACTUALIZAR = 900;
const DURACION_EN_VIVO = 260; // cada paso del deslizador de "¿Y si…?"

// Qué tan visible queda cada parte del gráfico en cada enfoque (0 a 1).
// "resto" son todas las barras menos la última; "cruce" es la marca donde se alcanza la meta.
// vp, vf y arco son las partes del diagrama de flujo de caja.
const ENFOQUES = {
  todo: { capital: 1, interes: 1, resto: 1, ultima: 1, cruce: 1, vp: 1, vf: 1, arco: 1 },
  capital: { capital: 1, interes: 0.2, resto: 1, ultima: 1, cruce: 0, vp: 1, vf: 0.25, arco: 0.25 },
  intereses: { capital: 0.25, interes: 1, resto: 1, ultima: 1, cruce: 0, vp: 0.4, vf: 0.4, arco: 1 },
  final: { capital: 1, interes: 1, resto: 0.25, ultima: 1, cruce: 0, vp: 0.25, vf: 1, arco: 0.25 },
  meta: { capital: 1, interes: 1, resto: 0.4, ultima: 0.4, cruce: 1, vp: 0.3, vf: 1, arco: 0.4 },
};

// Diagrama de flujo de caja: en qué tramo de la construcción (0 a 1) aparece cada parte.
// Primero lo conocido; luego el arco que lleva el dinero en el tiempo; al final la incógnita,
// con "?", que se resuelve en el valor calculado.
const ORDEN_FLUJO = {
  F: { vp: [0.16, 0.32], arco: [0.32, 0.7], vf: [0.7, 0.84], resolver: [0.86, 1] },
  P: { vf: [0.16, 0.32], arco: [0.32, 0.7], vp: [0.7, 0.84], resolver: [0.86, 1] },
  i: { vp: [0.16, 0.3], vf: [0.24, 0.38], arco: [0.38, 0.76], resolver: [0.86, 1] },
  n: { vp: [0.16, 0.3], vf: [0.24, 0.38], arco: [0.38, 0.76], resolver: [0.86, 1] },
};

function tramo(t, [desde, hasta]) {
  return Math.min(Math.max((t - desde) / (hasta - desde), 0), 1);
}

// Eje del diagrama: 0, 1, 2, 3, …, los dos periodos enteros antes del final y el final n
// (todos si son pocos), como se dibuja en clase. u es la posición en unidades del eje; el
// "…" ocupa dos unidades y resume los periodos del medio, así que el eje no va a escala.
function ejeDelFlujo(n) {
  const enteros = [];
  for (let k = 0; k < n - 1e-9; k++) enteros.push(k);
  const conCorte = enteros.length > 7;
  const valores = conCorte ? [0, 1, 2, 3, null, enteros[enteros.length - 2], enteros[enteros.length - 1], n] : [...enteros, n];
  const marcas = [];
  valores.forEach((k, u) => {
    if (k !== null) marcas.push({ k, u });
  });
  return { n, marcas, conCorte, uFin: valores.length - 1 };
}

// Posición en el eje (u) de un periodo cualquiera, y al revés. Entre marcas, en línea recta.
function unidadEnEje(eje, k) {
  const { marcas } = eje;
  for (let j = 1; j < marcas.length; j++) {
    const a = marcas[j - 1];
    const b = marcas[j];
    if (k <= b.k + 1e-9) return a.u + (Math.max(k - a.k, 0) / (b.k - a.k || 1)) * (b.u - a.u);
  }
  return eje.uFin;
}

function periodoEnEje(eje, u) {
  const { marcas } = eje;
  for (let j = 1; j < marcas.length; j++) {
    const a = marcas[j - 1];
    const b = marcas[j];
    if (u <= b.u + 1e-9) return a.k + (Math.max(u - a.u, 0) / (b.u - a.u || 1)) * (b.k - a.k);
  }
  return eje.n;
}

// Periodos que se dibujan como barras. Con muchos periodos se agrupan para no pasar de
// MAX_BARRAS. Si hay meta, se dibuja hasta el primer periodo entero que la supera.
function periodosDelGrafico(n, hastaLaMeta) {
  const ultimo = hastaLaMeta ? Math.ceil(n - 1e-9) : Math.floor(n + 1e-9);
  const salto = Math.max(1, Math.ceil(ultimo / MAX_BARRAS));
  const lista = [];
  for (let k = 0; k <= ultimo; k += salto) lista.push(k);
  const anterior = lista[lista.length - 1];
  if (anterior !== ultimo) {
    if (ultimo - anterior < salto / 2) lista[lista.length - 1] = ultimo;
    else lista.push(ultimo);
  }
  if (!hastaLaMeta && n - ultimo > 1e-9) lista.push(n); // último tramo no entero, ej. 2,5 años
  return lista;
}

// Separación "redonda" entre las líneas guía: 1, 2, 2,5 o 5 × 10^k.
function pasoDeGuia(maximo, cantidad = 4) {
  const bruto = maximo / cantidad;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  return potencia * [1, 2, 2.5, 5, 10].find((opcion) => opcion * potencia >= bruto);
}

// Lo que el gráfico necesita de un cálculo: periodos, saldos y escala.
function modeloDeCrecimiento(datos) {
  const conMeta = datos.meta !== undefined;
  const periodos = periodosDelGrafico(datos.n, conMeta);
  const saldos = periodos.map((k) => vfCompuesto(datos.P, datos.i, k)); // Hoja 2.1, de finanzas.js
  const maximo = Math.max(saldos[saldos.length - 1], datos.meta || 0) * 1.12;
  const paso = pasoDeGuia(maximo);
  const guias = [];
  for (let k = 1; k * paso < maximo * 0.97; k++) guias.push(k * paso);
  return {
    conMeta,
    periodos,
    saldos,
    total: periodos.length,
    kMax: periodos[periodos.length - 1],
    P: datos.P,
    i: datos.i,
    n: datos.n,
    meta: datos.meta,
    VF: conMeta ? datos.meta : saldos[saldos.length - 1], // valor futuro en n
    maximo,
    guias,
  };
}

// Empareja por periodo las barras de dos cálculos, para pasar de uno al otro. Cada barra
// lleva su saldo con los datos de cada cálculo (Hoja 2.1), aunque en uno de ellos no se
// dibuje: así la curva cambia de forma sin saltos. j es el índice en el cálculo nuevo.
function emparejarBarras(antes, despues) {
  const lista = [];
  let a = 0;
  let b = 0;
  while (a < antes.total || b < despues.total) {
    const ka = a < antes.total ? antes.periodos[a] : Infinity;
    const kb = b < despues.total ? despues.periodos[b] : Infinity;
    if (Math.abs(ka - kb) < 1e-9) {
      lista.push({ k: kb, antes: true, despues: true, j: b++ });
      a++;
    } else if (ka < kb) {
      lista.push({ k: ka, antes: true, despues: false, j: null });
      a++;
    } else {
      lista.push({ k: kb, antes: false, despues: true, j: b++ });
    }
  }
  for (const barra of lista) {
    barra.saldoAntes = vfCompuesto(antes.P, antes.i, barra.k);
    barra.saldoDespues = vfCompuesto(despues.P, despues.i, barra.k);
  }
  return lista;
}

// Gráfico del crecimiento: capital (abajo) e intereses acumulados (encima) en cada periodo,
// como barras o como área (dos bandas apiladas bajo la curva).
//
// datos: {
//   tipo                    "flujo" (por defecto: diagrama de flujo de caja), "barras" o "area"
//   flujo                   textos del diagrama: { incognita: "F" | "P" | "i" | "n",
//                           base: "1,015", exponente: "24" o "n", tasa: "1,5 % mensual" }
//   P, i, n                 valores ya calculados (i en decimal, n en periodos)
//   meta                    opcional: valor futuro buscado, cuando la incógnita es el tiempo
//   singular, plural        nombre del periodo ("mes", "meses")
//   dinero(valor)           pesos con centavos: $ 14.295.028,12
//   dineroCorto(valor)      pesos sin centavos de sobra: $ 150.000
//   dineroCompacto(valor)   pesos abreviados para la escala: $ 5 M
//   numero(valor)           número de periodos: 24 · 2,5
//   descripcion             texto para lectores de pantalla
//   alLeer(texto)           recibe la lectura del periodo seleccionado
// }
//
// Devuelve { total, barrasHasta, construir, actualizar, cambiarTipo, irA, destruir }.
function crearGraficoCrecimiento(canvas, datosIniciales) {
  let datos = datosIniciales;
  let modelo = modeloDeCrecimiento(datos);
  let pesoFlujo = datos.tipo === "barras" || datos.tipo === "area" ? 0 : 1; // 1 = diagrama de flujo de caja
  let mezclaArea = datos.tipo === "area" ? 1 : 0; // 0 = barras, 1 = área; en medio, pasando de uno a otro
  let saltarCambioTipo = null;
  let capa = null; // lienzo aparte para fundir el diagrama con el gráfico al cambiar de vista
  // Mientras se pasa de un cálculo al siguiente: { anterior, datosAnteriores, barras, mezcla,
  // textoBurbuja, alfaBurbuja }. "mezcla" va de 0 (cálculo anterior) a 1 (cálculo nuevo).
  let transicion = null;

  let lienzo = null;
  let geometrias = null; // posiciones del cálculo actual (y del anterior, durante una transición)
  let medidas = null;
  let colores = leerColores(canvas);
  let estado = { visibles: 0, enfoque: "todo", notas: null };
  let vista = calcularVista(estado, estado, 1);
  let inspeccion = null; // periodo elegido con el dedo, el mouse o el teclado
  const guia = { x: 0, alfa: 0, k: null }; // lo que se dibuja: se acerca con suavidad al objetivo
  const guiaObjetivo = { x: 0, alfa: 0 };
  let idGuia = 0;
  let anillo = null; // avance (0 a 1) del pulso que marca el final, o null
  let alfaBurbuja = 1; // la burbuja del valor final aparece después de construir
  let construido = false; // ya terminó la primera construcción
  let saltarAnimacion = null; // existe mientras hay una animación en curso
  let saltarPulso = null;
  let temporizadorPulso = 0; // en vivo, el pulso espera a que el deslizador se quede quieto
  let enPantalla = false;
  let pendiente = false;
  let arrastrando = false;
  let destruido = false;

  // Valor del cálculo; durante una transición, mezcla el del cálculo anterior con el del nuevo.
  function mezclado(clave) {
    return transicion ? mezclar(transicion.anterior[clave], modelo[clave], transicion.mezcla) : modelo[clave];
  }

  function nombrePeriodo() {
    return datos.singular.charAt(0).toUpperCase() + datos.singular.slice(1);
  }

  // ----- Estados y transiciones -----

  function alfas(e) {
    const enfoque = ENFOQUES[e.enfoque];
    return { ...enfoque, cruce: e.visibles >= modelo.total ? enfoque.cruce : 0 };
  }

  // Notas de "Explícame": el interés que se gana en el periodo de una barra,
  // saldo(k) - saldo(k - 1) con la Hoja 2.1. "comparar" muestra el primero y el último.
  function crearNotas(tipo) {
    const { periodos, total } = modelo;
    const nota = (j) => {
      const k = Math.floor(periodos[j]);
      const interes = vfCompuesto(modelo.P, modelo.i, k) - vfCompuesto(modelo.P, modelo.i, k - 1);
      return { indice: j, texto: `+${datos.dineroCorto(interes)}` };
    };
    let ultimaEntera = total - 1;
    while (ultimaEntera > 1 && !Number.isInteger(periodos[ultimaEntera])) ultimaEntera--;
    if (tipo === "primero" && total > 1) return [nota(1)];
    if (tipo === "comparar" && ultimaEntera > 1) return [nota(1), nota(ultimaEntera)];
    return null;
  }

  // Mezcla dos estados: las barras nuevas crecen escalonadas (con un rebote leve);
  // las que sobran se desvanecen en su sitio. "cabeza" es la posición (índice con decimales)
  // del punto que se desliza por la curva mientras crecen las barras.
  //
  // Al construir el gráfico, primero aparecen las guías (10 % del tiempo) y después las
  // barras suben como una ola que arranca despacio y frena al final; cada barra se toma
  // más tiempo (solape alto) para que el movimiento se lea fluido.
  function calcularVista(desde, hasta, t, construyendo = false) {
    const s = suavizar(t);
    const tBarras = construyendo ? entradaSalida(Math.max(0, (t - 0.1) / 0.9)) : t;
    const solape = construyendo ? 0.6 : 0.3;
    const nuevas = hasta.visibles - desde.visibles;
    const barras = []; // altura de cada barra (0 a 1)
    const opacidades = []; // 1, salvo en las barras que se están yendo
    for (let j = 0; j < modelo.total; j++) {
      const antes = j < desde.visibles ? 1 : 0;
      const despues = j < hasta.visibles ? 1 : 0;
      if (antes === despues) {
        barras.push(antes);
        opacidades.push(1);
      } else if (despues === 1) {
        const avance = avanceEscalonado(tBarras, j - desde.visibles, nuevas, solape);
        barras.push(avance >= 1 ? 1 : resorte(avance));
        opacidades.push(1);
      } else {
        barras.push(t < 1 ? 1 : 0);
        opacidades.push(1 - s);
      }
    }

    // El punto va sobre la barra que lleva el 70 % de su subida.
    let cabeza = null;
    if (nuevas > 0 && t < 1) {
      const tramo = 1 / (nuevas * (1 - solape) + solape);
      const k = (tBarras - 0.7 * tramo) / (tramo * (1 - solape));
      if (k >= 0) cabeza = desde.visibles + Math.min(k, nuevas - 1);
    }

    const a = alfas(desde);
    const b = alfas(hasta);
    const mezcla = {};
    for (const clave of Object.keys(a)) mezcla[clave] = mezclar(a[clave], b[clave], s);
    const mismasNotas = desde.notas === hasta.notas;
    return {
      barras,
      opacidades,
      ...mezcla,
      guias: mezclar(desde.visibles > 0 ? 1 : 0, hasta.visibles > 0 ? 1 : 0, Math.min(t * 6, 1)),
      creciendo: nuevas > 0 && t < 1,
      inicio: desde.visibles, // barras que ya estaban antes de crecer
      construyendo,
      progreso: t,
      // Índice (con decimales) de la última barra visible: hasta ahí llega el arco del diagrama.
      alcance: nuevas > 0 && t < 1 ? cabeza ?? desde.visibles - 1 : mezclar(desde.visibles - 1, hasta.visibles - 1, s),
      cabeza,
      notasAntes: mismasNotas ? null : desde.notas,
      notasDespues: hasta.notas,
      alfaNotas: mismasNotas ? 1 : s,
    };
  }

  // ----- Medidas -----

  // Margen izquierdo (según las etiquetas de su escala), ancho de las barras y posición de
  // cada periodo (x = inicio + k · paso) de un cálculo.
  function geometriaDe(mod) {
    const { ctx, width } = lienzo;
    ctx.font = `500 10.5px ${colores.fuente}`;
    const anchoEscala = Math.max(0, ...mod.guias.map((valor) => ctx.measureText(datos.dineroCompacto(valor)).width));
    const izquierda = Math.ceil(anchoEscala) + 12;
    const util = width - 6 - izquierda;
    let espacioMinimo = 1;
    for (let j = 1; j < mod.total; j++) {
      espacioMinimo = Math.min(espacioMinimo, (mod.periodos[j] - mod.periodos[j - 1]) / (mod.kMax || 1));
    }
    const anchoBarra = Math.max(2, Math.min(22, espacioMinimo * util * 0.62));
    return { izquierda, anchoBarra, inicio: izquierda + anchoBarra / 2, paso: mod.kMax ? (util - anchoBarra) / mod.kMax : 0 };
  }

  function medir() {
    geometrias = { antes: transicion ? geometriaDe(transicion.anterior) : null, despues: geometriaDe(modelo) };
    actualizarMedidas();
  }

  // Medidas del cuadro: durante una transición, márgenes, anchos, posiciones y escala se
  // mezclan entre los dos cálculos.
  function actualizarMedidas() {
    const { width, height } = lienzo;
    const b = geometrias.despues;
    const a = geometrias.antes || b;
    const s = transicion ? transicion.mezcla : 1;
    const arriba = 36; // espacio para la burbuja del valor
    const abajo = height - 26;
    const maximo = mezclado("maximo");
    const xAntes = (k) => a.inicio + k * a.paso;
    const xDespues = (k) => b.inicio + k * b.paso;
    medidas = {
      izquierda: mezclar(a.izquierda, b.izquierda, s),
      derecha: width - 6,
      arriba,
      abajo,
      anchoBarra: mezclar(a.anchoBarra, b.anchoBarra, s),
      xAntes,
      xDespues,
      x: (k) => mezclar(xAntes(k), xDespues(k), s),
      y: (valor) => abajo - (valor / maximo) * (abajo - arriba),
    };
  }

  // ----- Dibujo -----

  function burbuja(ctx, texto, x, base, alfa, fondo, colorTexto) {
    ctx.font = `600 11.5px ${colores.fuente}`;
    const ancho = ctx.measureText(texto).width + 16;
    const alto = 22;
    const izquierda = Math.min(Math.max(x - ancho / 2, 2), lienzo.width - ancho - 2);
    const arriba = Math.max(2, base - alto);
    ctx.globalAlpha = alfa;
    ctx.fillStyle = fondo;
    rectanguloRedondeado(ctx, izquierda, arriba, ancho, alto, 11);
    ctx.fill();
    ctx.fillStyle = colorTexto;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, izquierda + ancho / 2, arriba + alto / 2 + 0.5);
  }

  // Dibuja solo lo que queda a la izquierda de xMaximo.
  function recortar(ctx, xMaximo, dibujar) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(0, xMaximo), lienzo.height);
    ctx.clip();
    dibujar();
    ctx.restore();
  }

  // Rótulo que depende del cálculo. Si cambió con el nuevo, se relevan sin encimarse: en la
  // primera mitad el anterior sube y se desvanece; en la segunda, el nuevo entra desde abajo.
  // En vivo (deslizador) cambia sin relevo, para que el texto no parpadee con cada paso.
  // dibujar(texto, alfa, desplazamiento vertical en px).
  function rotulo(componer, dibujar) {
    const nuevo = componer(modelo, datos);
    const viejo = transicion && !transicion.enVivo ? componer(transicion.anterior, transicion.datosAnteriores) : nuevo;
    if (viejo === nuevo) {
      dibujar(nuevo, 1, 0);
      return;
    }
    const s = transicion.mezcla;
    if (s < 0.5) dibujar(viejo, 1 - 2 * s, -10 * s);
    else dibujar(nuevo, 2 * s - 1, 10 * (1 - s));
  }

  // Al cambiar la escala, las líneas que siguen se deslizan a su nueva altura; las que
  // sobran se desvanecen y las nuevas aparecen.
  function dibujarGuias(ctx, m) {
    ctx.lineWidth = 1;
    ctx.font = `500 10.5px ${colores.fuente}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const anteriores = transicion ? transicion.anterior.guias : [];
    const esta = (lista, valor) => lista.some((otro) => Math.abs(otro - valor) <= valor * 1e-9);
    const valores = modelo.guias.concat(anteriores.filter((valor) => !esta(modelo.guias, valor)));
    for (const valor of valores) {
      let alfa = vista.guias;
      if (transicion) {
        if (!esta(anteriores, valor)) alfa *= transicion.mezcla;
        else if (!esta(modelo.guias, valor)) alfa *= 1 - transicion.mezcla;
      }
      const y = Math.round(m.y(valor)) + 0.5;
      if (alfa <= 0.01 || y < m.arriba - 24) continue; // fuera del área mientras cambia la escala
      ctx.globalAlpha = alfa;
      ctx.strokeStyle = colores.borde;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(m.izquierda, y);
      ctx.lineTo(m.derecha, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colores.texto;
      ctx.fillText(datos.dineroCompacto(valor), m.izquierda - 8, y);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colores.borde;
    ctx.beginPath();
    ctx.moveTo(m.izquierda, Math.round(m.abajo) + 0.5);
    ctx.lineTo(m.derecha, Math.round(m.abajo) + 0.5);
    ctx.stroke();
  }

  // Barras que se dibujan: { k (periodo), j (índice en el cálculo actual), saldo, factor
  // (altura de 0 a 1), opacidad }.
  function barrasDelModelo() {
    return modelo.periodos.map((k, j) => ({ k, j, saldo: modelo.saldos[j], factor: vista.barras[j], opacidad: vista.opacidades[j] }));
  }

  // Durante una transición: las barras con pareja cambian de altura y de sitio; las que solo
  // existen en uno de los dos cálculos aparecen o se desvanecen.
  function barrasDeTransicion() {
    const s = transicion.mezcla;
    return transicion.barras.map((barra) => ({
      k: barra.k,
      j: barra.j,
      saldo: mezclar(barra.saldoAntes, barra.saldoDespues, s),
      factor: 1,
      opacidad: barra.antes && barra.despues ? 1 : barra.despues ? s : 1 - s,
    }));
  }

  // Al mirar un periodo, las demás barras se atenúan; la guía ilumina con suavidad las
  // barras por las que pasa.
  function resalte(m, centro) {
    if (guia.alfa <= 0.001) return 1;
    const separacion = Math.max((m.x(modelo.kMax) - m.x(0)) / Math.max(modelo.total - 1, 1), 1);
    const cercania = Math.max(0, 1 - Math.abs(centro - guia.x) / separacion);
    return mezclar(1, mezclar(0.35, 1, cercania), guia.alfa);
  }

  // Devuelve las puntas de las barras que se quedan ("fijas") y las de las que se están
  // yendo ("salientes"), para dibujar la curva de cada grupo por separado.
  // Al pasar al área, las barras se adelgazan y se desvanecen; sus puntas siguen guiando la curva.
  function dibujarBarras(ctx, m, barras) {
    const visibilidad = 1 - mezclaArea;
    const ancho = m.anchoBarra * (1 - 0.7 * mezclaArea);
    const radio = Math.min(4, ancho / 2);
    const altoCapital = m.abajo - m.y(mezclado("P"));
    const fijas = [];
    const salientes = [];
    let alfaSaliente = 0;
    for (const barra of barras) {
      const { factor, opacidad } = barra;
      if (factor <= 0 || opacidad <= 0) continue;
      const centro = m.x(barra.k);
      const altoTotal = (m.abajo - m.y(barra.saldo)) * factor;
      if (visibilidad > 0.001) {
        const capitalBarra = Math.min(altoTotal, altoCapital);
        const intereses = altoTotal - capitalBarra;
        const alfa = (barra.j === modelo.total - 1 ? vista.ultima : vista.resto) * opacidad * resalte(m, centro) * visibilidad;
        ctx.globalAlpha = alfa * vista.capital;
        ctx.fillStyle = colores.capital;
        rellenarBarra(ctx, centro - ancho / 2, m.abajo - capitalBarra, ancho, capitalBarra, intereses > 0.5 ? 0 : radio);
        if (intereses > 0) {
          const aire = intereses > 4 ? 2 : 0; // 2 px entre capital e intereses para separar los dos tramos
          ctx.globalAlpha = alfa * vista.interes;
          ctx.fillStyle = colores.interes;
          rellenarBarra(ctx, centro - ancho / 2, m.abajo - altoTotal, ancho, intereses - aire, radio);
        }
      }
      const punta = { x: centro, y: m.abajo - altoTotal, j: barra.j };
      if (opacidad >= 1) fijas.push(punta);
      else {
        salientes.push(punta);
        alfaSaliente = opacidad;
      }
    }
    return { fijas, salientes, alfaSaliente };
  }

  // Área: banda plana del capital y, encima, la de los intereses hasta la curva, con 2 px de
  // aire entre las dos (como entre los tramos de cada barra).
  function dibujarBandas(ctx, m, puntos, tangentes, alfa) {
    const primera = puntos[0];
    const ultima = puntos[puntos.length - 1];
    const yCapital = m.y(mezclado("P"));

    ctx.globalAlpha = alfa * vista.capital;
    ctx.fillStyle = conAlfa(colores.capital, 0.24);
    ctx.fillRect(primera.x, yCapital, ultima.x - primera.x, m.abajo - yCapital);
    ctx.strokeStyle = colores.capital;
    ctx.lineWidth = 2;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(primera.x, yCapital);
    ctx.lineTo(ultima.x, yCapital);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, lienzo.width, yCapital - 3);
    ctx.clip();
    const degradado = ctx.createLinearGradient(0, m.arriba, 0, yCapital);
    degradado.addColorStop(0, conAlfa(colores.interes, 0.62));
    degradado.addColorStop(1, conAlfa(colores.interes, 0.34));
    ctx.globalAlpha = alfa * vista.interes;
    ctx.fillStyle = degradado;
    ctx.beginPath();
    ctx.moveTo(primera.x, yCapital);
    ctx.lineTo(primera.x, primera.y);
    tramosSuaves(ctx, puntos, tangentes);
    ctx.lineTo(ultima.x, yCapital);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Curva suave con un brillo leve sobre las puntas de las barras. Debajo: un degradado
  // (barras) o las bandas de capital e intereses (área).
  function dibujarCurva(ctx, m, puntos, tangentes, alfaGrupo = 1) {
    if (puntos.length < 2 || alfaGrupo <= 0) return;
    const primera = puntos[0];

    if (mezclaArea < 1) {
      const ultima = puntos[puntos.length - 1];
      const degradado = ctx.createLinearGradient(0, m.arriba, 0, m.abajo);
      degradado.addColorStop(0, conAlfa(colores.capital, 0.2));
      degradado.addColorStop(1, conAlfa(colores.capital, 0));
      ctx.globalAlpha = vista.resto * alfaGrupo * (1 - mezclaArea);
      ctx.fillStyle = degradado;
      ctx.beginPath();
      ctx.moveTo(primera.x, m.abajo);
      ctx.lineTo(primera.x, primera.y);
      tramosSuaves(ctx, puntos, tangentes);
      ctx.lineTo(ultima.x, m.abajo);
      ctx.closePath();
      ctx.fill();
    }
    if (mezclaArea > 0) dibujarBandas(ctx, m, puntos, tangentes, vista.resto * alfaGrupo * mezclaArea);

    ctx.globalAlpha = 0.9 * vista.resto * alfaGrupo;
    ctx.strokeStyle = colores.linea;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = conAlfa(colores.capital, 0.5);
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(primera.x, primera.y);
    tramosSuaves(ctx, puntos, tangentes);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Posición del momento en que se alcanza la meta (n con decimales).
  function xDeN(m) {
    if (!transicion) return m.x(modelo.n);
    return mezclar(m.xAntes(transicion.anterior.n), m.xDespues(modelo.n), transicion.mezcla);
  }

  function dibujarMeta(ctx, m) {
    const yMeta = Math.round(m.y(mezclado("meta"))) + 0.5;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = colores.meta;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(m.izquierda, yMeta);
    ctx.lineTo(m.derecha, yMeta);
    ctx.stroke();
    ctx.setLineDash([]);
    rotulo(
      (mod, d) => `Meta ${d.dinero(mod.meta)}`,
      (texto, alfa, desplazamiento) => burbuja(ctx, texto, m.izquierda + 70, yMeta - 6 + desplazamiento, 0.95 * alfa, colores.superficie, colores.meta)
    );

    if (vista.cruce > 0) {
      const xCruce = xDeN(m);
      ctx.globalAlpha = vista.cruce;
      ctx.strokeStyle = colores.linea;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(xCruce, m.abajo);
      ctx.lineTo(xCruce, yMeta);
      ctx.stroke();
      ctx.setLineDash([]);
      punto(ctx, xCruce, yMeta, vista.cruce);
    }
  }

  // Punto con halo luminoso.
  function punto(ctx, x, y, alfa) {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 13);
    halo.addColorStop(0, conAlfa(colores.capital, 0.4));
    halo.addColorStop(1, conAlfa(colores.capital, 0));
    ctx.globalAlpha = alfa;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colores.linea;
    ctx.strokeStyle = colores.superficie;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function dibujarEjeX(ctx, m) {
    ctx.font = `500 11px ${colores.fuente}`;
    ctx.textBaseline = "top";
    ctx.fillStyle = colores.texto;
    const yTexto = m.abajo + 8;
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.fillText("Hoy", m.izquierda, yTexto);
    const alfaCruce = modelo.conMeta ? vista.cruce : 0;
    if (alfaCruce < 1) {
      ctx.textAlign = "right";
      rotulo(
        (mod, d) => `${d.numero(mod.kMax)} ${mod.kMax === 1 ? d.singular : d.plural}`,
        (texto, alfa, desplazamiento) => {
          ctx.globalAlpha = (1 - alfaCruce) * alfa;
          ctx.fillText(texto, m.derecha, yTexto + desplazamiento);
        }
      );
    }
    if (alfaCruce > 0) {
      const x = xDeN(m);
      ctx.fillStyle = colores.linea;
      ctx.textAlign = "center";
      rotulo(
        (mod, d) => `n = ${d.numero(mod.n)}`,
        (texto, alfa, desplazamiento) => {
          const ancho = ctx.measureText(texto).width;
          ctx.globalAlpha = alfaCruce * alfa;
          ctx.fillText(texto, Math.min(Math.max(x, m.izquierda + ancho / 2), m.derecha - ancho / 2), yTexto + desplazamiento);
        }
      );
    }
  }

  // Notas "+$ interés" que suben sobre las barras (modo Explícame).
  function dibujarNotas(ctx, m) {
    const dibujar = (notas, alfa, subida) => {
      if (!notas || alfa <= 0.01) return;
      for (const nota of notas) {
        if (vista.barras[nota.indice] <= 0) continue;
        const x = m.x(modelo.periodos[nota.indice]);
        const base = m.y(modelo.saldos[nota.indice]) - 10 + subida;
        burbuja(ctx, nota.texto, x, base, alfa, colores.interesSuave, colores.textoFuerte);
      }
    };
    dibujar(vista.notasAntes, 1 - vista.alfaNotas, 0);
    dibujar(vista.notasDespues, vista.alfaNotas, (1 - vista.alfaNotas) * 12);
  }

  // Con el gráfico quieto, el punto queda en la última barra y su valor aparece en una burbuja.
  function dibujarFinal(ctx, puntas) {
    if (!puntas.length) return;
    const ultima = puntas[puntas.length - 1];
    const alfa = vista.ultima * (modelo.conMeta ? 1 - vista.cruce : 1) * (1 - guia.alfa);
    if (alfa <= 0.01) return;
    punto(ctx, ultima.x, ultima.y, alfa);
    if (!modelo.conMeta && !vista.notasDespues && alfaBurbuja > 0) {
      const subida = (1 - alfaBurbuja) * 8;
      burbuja(ctx, datos.dinero(modelo.saldos[ultima.j]), ultima.x, ultima.y - 12 + subida, alfa * alfaBurbuja, colores.textoFuerte, colores.superficie);
    }
  }

  // En el área, una línea de dos colores marca un periodo: capital abajo, intereses arriba.
  function dibujarPin(ctx, m, x, yTope, alfa) {
    if (alfa <= 0.01) return;
    const yCapital = m.y(mezclado("P"));
    ctx.globalAlpha = alfa;
    ctx.lineWidth = 3;
    ctx.lineCap = "butt";
    ctx.strokeStyle = colores.capital;
    ctx.beginPath();
    ctx.moveTo(x, m.abajo);
    ctx.lineTo(x, yCapital + 1);
    ctx.stroke();
    if (yTope < yCapital - 4) {
      ctx.strokeStyle = colores.interes;
      ctx.beginPath();
      ctx.moveTo(x, yCapital - 3);
      ctx.lineTo(x, yTope);
      ctx.stroke();
    }
  }

  // Guía del periodo que se está mirando: se desliza y su punto corre sobre la curva.
  // En barras es una línea punteada; en el área, la línea de dos colores.
  function dibujarInspeccion(ctx, m, puntas, tangentes) {
    if (guia.k === null || guia.alfa <= 0.01 || !puntas.length) return;
    const x = guia.x;
    const y = yEnCurva(puntas, tangentes, x);
    if (mezclaArea < 1) {
      ctx.globalAlpha = 0.7 * guia.alfa * (1 - mezclaArea);
      ctx.strokeStyle = colores.texto;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, y);
      ctx.lineTo(Math.round(x) + 0.5, m.abajo);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    dibujarPin(ctx, m, x, y, guia.alfa * mezclaArea);
    punto(ctx, x, y, guia.alfa);
    burbuja(ctx, textoDe(guia.k), x, y - 12, guia.alfa, colores.textoFuerte, colores.superficie);
  }

  // Pulso que se abre una vez cuando el gráfico termina de construirse o de actualizarse.
  function dibujarAnillo(ctx, m, puntas) {
    if (anillo === null || !puntas.length) return;
    const centro = modelo.conMeta ? { x: xDeN(m), y: m.y(modelo.meta) } : puntas[puntas.length - 1];
    ctx.globalAlpha = 0.5 * (1 - anillo);
    ctx.strokeStyle = colores.capital;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centro.x, centro.y, 5 + 18 * suavizar(anillo), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Gráfico quieto (o un cambio de "Explícame" que no agrega barras).
  function pintarQuieto(ctx, m) {
    const { fijas, salientes, alfaSaliente } = dibujarBarras(ctx, m, barrasDelModelo());
    const tangentes = tangentesMonotonas(fijas);
    dibujarCurva(ctx, m, fijas, tangentes);
    if (salientes.length) {
      const tramo = fijas.slice(-1).concat(salientes);
      dibujarCurva(ctx, m, tramo, tangentesMonotonas(tramo), alfaSaliente);
    }
    // En el área, el último periodo se marca cuando es el único visible ("Hoy") o cuando
    // "Explícame" lo resalta (enfoque "final"), como la última barra.
    if (mezclaArea > 0 && fijas.length) {
      const ultima = fijas[fijas.length - 1];
      const resaltado = fijas.length === 1 ? 1 : Math.max(0, vista.ultima - vista.resto) / 0.75;
      dibujarPin(ctx, m, ultima.x, ultima.y, mezclaArea * Math.min(1, resaltado));
    }
    if (modelo.conMeta) dibujarMeta(ctx, m);
    dibujarEjeX(ctx, m);
    dibujarNotas(ctx, m);
    dibujarFinal(ctx, fijas);
    dibujarInspeccion(ctx, m, fijas, tangentes);
    dibujarAnillo(ctx, m, fijas);
  }

  // Mientras crecen las barras, la curva va adelante: es la curva final, que se descubre hasta
  // el punto luminoso, y las barras suben a alcanzarla. En el área, las bandas se descubren
  // con la curva, de izquierda a derecha. Sin texto, para no distraer.
  function pintarCrecimiento(ctx, m) {
    dibujarBarras(ctx, m, barrasDelModelo());
    // Hasta que arranca el punto, la curva llega a la última barra que ya estaba.
    const hasta = vista.cabeza ?? vista.inicio - 1;
    let cabeza = null;
    if (hasta >= 0) {
      const curva = [];
      for (let j = 0; j < estado.visibles; j++) curva.push({ x: m.x(modelo.periodos[j]), y: m.y(modelo.saldos[j]) });
      const tangentes = tangentesMonotonas(curva);
      const a = Math.floor(hasta);
      const b = Math.min(a + 1, modelo.total - 1);
      const x = mezclar(m.x(modelo.periodos[a]), m.x(modelo.periodos[b]), hasta - a);
      recortar(ctx, x, () => dibujarCurva(ctx, m, curva, tangentes));
      if (vista.cabeza !== null) cabeza = { x, y: yEnCurva(curva, tangentes, x) };
    }
    if (modelo.conMeta) dibujarMeta(ctx, m);
    dibujarEjeX(ctx, m);
    dibujarNotas(ctx, m);
    if (cabeza) punto(ctx, cabeza.x, cabeza.y, 1);
  }

  // De un cálculo al siguiente: lo que sale por la derecha se recorta en el borde y el punto
  // se mantiene al final de la curva mientras esta cambia de forma.
  function pintarTransicion(ctx, m) {
    const barras = barrasDeTransicion();
    recortar(ctx, m.derecha, () => dibujarBarras(ctx, m, barras));
    const curva = barras.map((barra) => ({ x: m.x(barra.k), y: m.y(barra.saldo) }));
    const tangentes = tangentesMonotonas(curva);
    const xFinal = m.derecha - m.anchoBarra / 2;
    recortar(ctx, xFinal, () => dibujarCurva(ctx, m, curva, tangentes));
    if (modelo.conMeta) dibujarMeta(ctx, m);
    dibujarEjeX(ctx, m);
    if (modelo.conMeta) return;
    const yFinal = yEnCurva(curva, tangentes, xFinal);
    punto(ctx, xFinal, yFinal, 1);
    if (transicion.alfaBurbuja > 0.01) {
      burbuja(ctx, transicion.textoBurbuja, xFinal, yFinal - 12, transicion.alfaBurbuja, colores.textoFuerte, colores.superficie);
    }
  }

  // Barras o área.
  function pintarGrafico(ctx) {
    dibujarGuias(ctx, medidas);
    if (transicion) pintarTransicion(ctx, medidas);
    else if (vista.creciendo) pintarCrecimiento(ctx, medidas);
    else pintarQuieto(ctx, medidas);
  }

  // Lienzo del mismo tamaño, para pintar el gráfico aparte mientras se funde con el diagrama.
  function capaAuxiliar() {
    const { ctx, width, height } = lienzo;
    if (!capa || capa.canvas.width !== ctx.canvas.width || capa.canvas.height !== ctx.canvas.height) {
      const otro = document.createElement("canvas");
      otro.width = ctx.canvas.width;
      otro.height = ctx.canvas.height;
      capa = otro.getContext("2d");
    }
    capa.setTransform(ctx.getTransform());
    capa.clearRect(0, 0, width, height);
    return capa;
  }

  function pintar() {
    if (!lienzo || lienzo.width === 0 || !geometrias) return;
    if (transicion) actualizarMedidas();
    const { ctx, width, height } = lienzo;
    ctx.clearRect(0, 0, width, height);
    if (pesoFlujo < 1) {
      if (pesoFlujo <= 0) pintarGrafico(ctx);
      else {
        const aparte = capaAuxiliar();
        pintarGrafico(aparte);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 - pesoFlujo;
        ctx.drawImage(aparte.canvas, 0, 0);
        ctx.restore();
      }
    }
    if (pesoFlujo > 0) dibujarFlujo(ctx, pesoFlujo);
    ctx.globalAlpha = 1;
  }

  // ----- Diagrama de flujo de caja -----

  // Medidas del diagrama en este cuadro. Las flechas van a escala: el largo de VP y el de VF
  // son proporcionales a sus valores (VP con un mínimo, para que siempre se vea).
  function medidasFlujo() {
    const { width, height } = lienzo;
    const izquierda = 26;
    const derecha = width - 34;
    const arriba = 34; // espacio para el rótulo de VF
    const abajo = height - 14; // fila de los periodos
    const ejeNuevo = ejeDelFlujo(modelo.n);
    const ejeViejo = transicion ? ejeDelFlujo(transicion.anterior.n) : ejeNuevo;
    const s = transicion ? transicion.mezcla : 1;
    const P = mezclado("P");
    const VF = mezclado("VF");
    const disponible = abajo - 36 - arriba; // 36 px para el rótulo de VP bajo su flecha
    const largoVP = Math.max(28, (disponible * P) / (P + VF));
    const largoVF = disponible - largoVP;
    const xEn = (eje, k) => izquierda + (unidadEnEje(eje, k) / eje.uFin) * (derecha - izquierda);
    return {
      izquierda,
      derecha,
      abajo,
      yEje: arriba + largoVF,
      largoVP,
      largoVF,
      escala: largoVF / VF, // píxeles por peso, para la flecha de equivalencia
      ejeNuevo,
      ejeViejo,
      s,
      xEn,
      x: (k) => xEn(ejeNuevo, k),
    };
  }

  // Texto con exponente: partes = [{ t: "× 1,015" }, { t: "24", sup: true }].
  function medirParte(ctx, parte, tamano, peso) {
    ctx.font = `${peso} ${parte.sup ? tamano * 0.72 : tamano}px ${colores.fuente}`;
    return ctx.measureText(parte.t).width + (parte.sup ? 1 : 0);
  }

  function anchoConExponente(ctx, partes, tamano, peso) {
    return partes.reduce((suma, parte) => suma + medirParte(ctx, parte, tamano, peso), 0);
  }

  function textoConExponente(ctx, partes, x, y, alineacion, tamano, peso) {
    const ancho = anchoConExponente(ctx, partes, tamano, peso);
    let cursor = alineacion === "center" ? x - ancho / 2 : alineacion === "right" ? x - ancho : x;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    for (const parte of partes) {
      const avance = medirParte(ctx, parte, tamano, peso);
      ctx.fillText(parte.t, cursor + (parte.sup ? 1 : 0), parte.sup ? y - tamano * 0.38 : y);
      cursor += avance;
    }
  }

  // Relevo entre dos textos (s de 0 a 1): el anterior sube y se desvanece; luego entra el nuevo.
  function relevar(viejo, nuevo, s, dibujar) {
    if (JSON.stringify(viejo) === JSON.stringify(nuevo) || s >= 1) {
      dibujar(nuevo, 1, 0);
      return;
    }
    if (s < 0.5) dibujar(viejo, 1 - 2 * s, -10 * s);
    else dibujar(nuevo, 2 * s - 1, 10 * (1 - s));
  }

  // Texto de cada parte del diagrama para un cálculo (mod, d) y si la incógnita ya se resolvió.
  function textosFlujo(mod, d, resuelta) {
    const f = d.flujo;
    const oculta = (letra) => f.incognita === letra && !resuelta;
    const plural = Math.abs(mod.n - 1) < 1e-9 ? d.singular : d.plural;
    return {
      vp: oculta("P") ? "VP = ?" : `VP = ${d.dinero(mod.P)}`,
      vf: oculta("F") ? "VF = ?" : `VF = ${d.dinero(mod.VF)}`,
      n: oculta("n") ? "n = ?" : `n = ${d.numero(mod.n)} ${plural}`,
      final: oculta("n") ? "?" : d.numero(mod.n),
      arriba:
        f.incognita === "i"
          ? [{ t: oculta("i") ? "i = ?" : `i = ${f.tasa}` }]
          : [{ t: `${f.incognita === "P" ? "÷" : "×"} ${f.base}` }, { t: f.exponente, sup: true }],
      adentro: f.incognita === "i" ? [{ t: "× (1 + i)" }, { t: f.exponente, sup: true }] : [{ t: `i = ${f.tasa}` }],
    };
  }

  // Flecha vertical con punta: de (x, y0) a (x, y1).
  function flecha(ctx, x, y0, y1, color, alfa, discontinua = false) {
    if (alfa <= 0.01 || Math.abs(y1 - y0) < 1) return;
    const sentido = Math.sign(y1 - y0);
    const punta = Math.min(9, Math.abs(y1 - y0) * 0.6);
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.setLineDash(discontinua ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1 - sentido * punta * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x - 5.5, y1 - sentido * punta);
    ctx.lineTo(x + 5.5, y1 - sentido * punta);
    ctx.closePath();
    ctx.fill();
  }

  // Punto de la curva cuadrática del arco en t (0 a 1).
  function puntoDeArco(a, c, b, t) {
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  }

  function dibujarFlujo(ctx, alfaVista) {
    const f = medidasFlujo();
    const flujo = datos.flujo;
    const orden = ORDEN_FLUJO[flujo.incognita];
    const s = f.s;
    const vacio = estado.visibles === 0 && !vista.construyendo;
    if (vacio) return; // todavía no ha empezado a construirse

    // Avance de cada parte: durante la construcción, por tramos; después, completo.
    const t = vista.construyendo ? vista.progreso : 1;
    const parte = (rango) => (vista.construyendo ? tramo(t, rango) : 1);
    const avanceEje = vista.construyendo ? entradaSalida(tramo(t, [0, 0.18])) : 1;
    const avanceVP = parte(orden.vp);
    const avanceVF = parte(orden.vf);
    const resuelta = parte(orden.resolver);

    // Hasta dónde llega el arco: en la construcción, su tramo; en "Explícame", la última barra
    // visible (el dinero ha viajado hasta ese periodo).
    let alcance = entradaSalida(parte(orden.arco));
    if (!vista.construyendo) {
      const indice = vista.alcance;
      if (indice < 0) alcance = 0;
      else {
        const a = Math.floor(indice);
        const b = Math.min(a + 1, modelo.total - 1);
        const k = Math.min(mezclar(modelo.periodos[a], modelo.periodos[b], indice - a), modelo.n);
        alcance = (f.x(k) - f.izquierda) / (f.derecha - f.izquierda);
      }
    }

    // Enfoque de "Explícame"; mientras se mira un periodo, el diagrama se atenúa un poco.
    const atenuar = mezclar(1, 0.45, guia.alfa);
    const alfaVP = alfaVista * vista.vp * atenuar;
    const alfaVF = alfaVista * vista.vf * atenuar * (alcance < 0.999 && !vista.construyendo ? 0.35 : 1);
    const alfaArco = alfaVista * vista.arco * atenuar;

    const { yEje, izquierda, derecha } = f;
    const textos = textosFlujo(modelo, datos, resuelta >= 0.5);
    const anteriores = transicion ? textosFlujo(transicion.anterior, transicion.datosAnteriores, true) : textos;
    const ahora = transicion && !transicion.enVivo ? s : 1; // en vivo, los rótulos cambian sin relevo

    // Eje del tiempo con su punta.
    const inicioEje = izquierda - 16;
    const finEje = lienzo.width - 6;
    const xCabezaEje = mezclar(inicioEje, finEje, avanceEje);
    ctx.globalAlpha = alfaVista;
    ctx.strokeStyle = colores.meta;
    ctx.fillStyle = colores.meta;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(inicioEje, yEje);
    ctx.lineTo(xCabezaEje, yEje);
    ctx.stroke();
    if (avanceEje > 0.98) {
      ctx.beginPath();
      ctx.moveTo(finEje + 2, yEje);
      ctx.lineTo(finEje - 7, yEje - 4.5);
      ctx.lineTo(finEje - 7, yEje + 4.5);
      ctx.closePath();
      ctx.fill();
    }

    // Marcas y periodos (0, 1, 2, 3, …, n). Aparecen cuando el eje pasa por ellas.
    const escribirPeriodo = (texto, x, alfa, esFinal, desplazamiento = 0) => {
      ctx.globalAlpha = alfa;
      ctx.fillStyle = esFinal ? colores.textoFuerte : colores.texto;
      ctx.font = `${esFinal ? 600 : 500} 11px ${colores.fuente}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const ancho = ctx.measureText(texto).width;
      ctx.fillText(texto, Math.min(x, lienzo.width - 4 - ancho / 2), f.abajo + desplazamiento);
    };
    const dibujarMarcas = (eje, alfaGrupo, etiqueta) => {
      if (alfaGrupo <= 0.01) return;
      eje.marcas.forEach((marca, j) => {
        const x = f.xEn(eje, marca.k);
        const aparicion = Math.min(Math.max((avanceEje * (finEje - inicioEje) - (x - inicioEje)) / 30, 0), 1);
        const alfa = alfaGrupo * aparicion;
        if (alfa <= 0.01) return;
        ctx.globalAlpha = alfa;
        ctx.strokeStyle = colores.meta;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, yEje - 4);
        ctx.lineTo(x, yEje + 4);
        ctx.stroke();
        if (marca.k > 0) {
          // Línea punteada hasta el número del periodo, como en el cuaderno.
          ctx.globalAlpha = alfa * 0.6;
          ctx.strokeStyle = colores.borde;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(x, yEje + 7);
          ctx.lineTo(x, f.abajo - 14);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        etiqueta(marca, j, x, alfa);
      });
      if (eje.conCorte) {
        escribirPeriodo("…", f.izquierda + (4 / eje.uFin) * (f.derecha - f.izquierda), alfaGrupo * Math.min(Math.max(avanceEje * 2 - 1, 0), 1), false);
      }
    };
    const mismasMarcas =
      f.ejeViejo.marcas.length === f.ejeNuevo.marcas.length && f.ejeViejo.marcas.every((marca, j) => marca.u === f.ejeNuevo.marcas[j].u);
    if (!transicion || mismasMarcas) {
      // Mismas posiciones: los números que cambian se relevan. El final (n) se resuelve con
      // la incógnita cuando es el tiempo.
      dibujarMarcas(f.ejeNuevo, alfaVista, (marca, j, x, alfa) => {
        const esFinal = j === f.ejeNuevo.marcas.length - 1;
        const nuevo = esFinal ? textos.final : datos.numero(marca.k);
        let viejo = nuevo;
        let avance = 1;
        if (esFinal && flujo.incognita === "n" && vista.construyendo) {
          viejo = "?";
          avance = resuelta;
        } else if (transicion) {
          viejo = esFinal ? anteriores.final : transicion.datosAnteriores.numero(f.ejeViejo.marcas[j].k);
          avance = ahora;
        }
        relevar(viejo, nuevo, avance, (texto, alfaRelevo, desplazamiento) => escribirPeriodo(texto, x, alfa * alfaRelevo, esFinal, desplazamiento));
      });
    } else {
      // Otro número de marcas: las anteriores se desvanecen y aparecen las nuevas.
      const ultimaDe = (eje) => eje.marcas.length - 1;
      dibujarMarcas(f.ejeViejo, alfaVista * (1 - s), (marca, j, x, alfa) =>
        escribirPeriodo(j === ultimaDe(f.ejeViejo) ? anteriores.final : transicion.datosAnteriores.numero(marca.k), x, alfa, j === ultimaDe(f.ejeViejo))
      );
      dibujarMarcas(f.ejeNuevo, alfaVista * s, (marca, j, x, alfa) =>
        escribirPeriodo(j === ultimaDe(f.ejeNuevo) ? textos.final : datos.numero(marca.k), x, alfa, j === ultimaDe(f.ejeNuevo))
      );
    }

    // n bajo el eje, en el centro: "n = 24 meses" (o "n = ?" mientras se calcula).
    ctx.font = `500 11.5px ${colores.fuente}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const centroEje = (izquierda + derecha) / 2;
    const textoNSinResolver = textosFlujo(modelo, datos, false).n;
    relevar(
      flujo.incognita === "n" && vista.construyendo ? textoNSinResolver : anteriores.n,
      textos.n,
      flujo.incognita === "n" && vista.construyendo ? resuelta : ahora,
      (texto, alfa, desplazamiento) => {
        // Aparece cuando el eje pasa por el centro.
        ctx.globalAlpha = alfaVista * tramo(avanceEje, [0.45, 0.75]) * alfa * (flujo.incognita === "n" ? 1 : 0.9);
        ctx.fillStyle = flujo.incognita === "n" ? colores.linea : colores.meta;
        ctx.font = `${flujo.incognita === "n" ? 600 : 500} 11.5px ${colores.fuente}`;
        ctx.fillText(texto, centroEje, yEje + 8 + desplazamiento);
      }
    );

    // Arco que lleva el dinero en el tiempo: de VP a VF (×) o de VF a VP (÷, descontar).
    const alto = Math.min(Math.max(f.largoVF * 0.62, 30), 64);
    const izquierdaArco = { x: izquierda + 6, y: yEje - 4 };
    const derechaArco = { x: derecha - 6, y: yEje - 4 };
    const control = { x: (izquierdaArco.x + derechaArco.x) / 2, y: yEje - 4 - 2 * alto };
    const haciaAtras = flujo.incognita === "P";
    const desde = haciaAtras ? derechaArco : izquierdaArco;
    const hacia = haciaAtras ? izquierdaArco : derechaArco;
    if (alcance > 0.001 && alfaArco > 0.01) {
      const extremo = puntoDeArco(desde, control, hacia, alcance);
      const controlParcial = { x: mezclar(desde.x, control.x, alcance), y: mezclar(desde.y, control.y, alcance) };
      ctx.globalAlpha = alfaArco;
      ctx.strokeStyle = colores.interes;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(desde.x, desde.y);
      ctx.quadraticCurveTo(controlParcial.x, controlParcial.y, extremo.x, extremo.y);
      ctx.stroke();
      if (alcance >= 0.999) {
        // Punta en la dirección del arco.
        const angulo = Math.atan2(hacia.y - control.y, hacia.x - control.x);
        ctx.fillStyle = colores.interes;
        ctx.beginPath();
        ctx.moveTo(hacia.x, hacia.y);
        ctx.lineTo(hacia.x - 9 * Math.cos(angulo - 0.42), hacia.y - 9 * Math.sin(angulo - 0.42));
        ctx.lineTo(hacia.x - 9 * Math.cos(angulo + 0.42), hacia.y - 9 * Math.sin(angulo + 0.42));
        ctx.closePath();
        ctx.fill();
      } else {
        punto(ctx, extremo.x, extremo.y, alfaArco); // el dinero viajando en el tiempo
      }
    }
    // Rótulos del arco: el factor (o "i = ?") arriba y la tasa adentro. Aparecen cuando el arco
    // está casi completo: el factor es del viaje entero.
    const alfaRotulos = alfaArco * tramo(alcance, [0.75, 1]);
    if (alfaRotulos > 0.01) {
      // La tasa va bajo la cima, sin tocar el arco aunque el gráfico sea angosto.
      const mitad = (derechaArco.x - izquierdaArco.x) / 2;
      const anchoAdentro = anchoConExponente(ctx, textos.adentro, 11.5, 500);
      const caida = Math.min((anchoAdentro / 2 + 4) / mitad, 1) ** 2;
      const yAdentro = Math.min(Math.max(yEje - 4 - alto + 17, yEje - 4 - alto * (1 - caida) + 14), yEje - 8);
      const yArriba = yEje - 4 - alto - 9;
      relevar(
        flujo.incognita === "i" && vista.construyendo ? textosFlujo(modelo, datos, false).arriba : anteriores.arriba,
        textos.arriba,
        flujo.incognita === "i" && vista.construyendo ? resuelta : ahora,
        (partes, alfa, desplazamiento) => {
          ctx.globalAlpha = alfaRotulos * alfa;
          ctx.fillStyle = colores.interes;
          textoConExponente(ctx, partes, control.x, yArriba + desplazamiento, "center", 13, 700);
        }
      );
      relevar(anteriores.adentro, textos.adentro, ahora, (partes, alfa, desplazamiento) => {
        ctx.globalAlpha = alfaRotulos * alfa * 0.95;
        ctx.fillStyle = colores.meta;
        textoConExponente(ctx, partes, control.x, yAdentro + desplazamiento, "center", 11.5, 500);
      });
    }

    // Flechas: VP sale hoy (hacia abajo), VF entra en n (hacia arriba). La incógnita se dibuja
    // punteada con "?" hasta que se resuelve.
    const xVF = f.xEn(f.ejeNuevo, modelo.n);
    const largoVP = f.largoVP * (vista.construyendo ? resorte(Math.min(avanceVP * 1.15, 1)) : 1) * (avanceVP > 0 ? 1 : 0);
    const largoVF = f.largoVF * (vista.construyendo ? resorte(Math.min(avanceVF * 1.15, 1)) : 1) * (avanceVF > 0 ? 1 : 0);
    const punteadaVP = flujo.incognita === "P" ? 1 - resuelta : 0;
    const punteadaVF = flujo.incognita === "F" ? 1 - resuelta : 0;
    flecha(ctx, izquierda, yEje, yEje + largoVP, colores.capital, alfaVP * (1 - punteadaVP));
    flecha(ctx, izquierda, yEje, yEje + largoVP, colores.capital, alfaVP * punteadaVP, true);
    flecha(ctx, xVF, yEje, yEje - largoVF, colores.linea, alfaVF * (1 - punteadaVF));
    flecha(ctx, xVF, yEje, yEje - largoVF, colores.linea, alfaVF * punteadaVF, true);

    const rotuloFlecha = (clave, x, y, alineacion, alfaFlecha, avance) => {
      const sinResolver = flujo.incognita === (clave === "vp" ? "P" : "F") && vista.construyendo;
      relevar(sinResolver ? textosFlujo(modelo, datos, false)[clave] : anteriores[clave], textos[clave], sinResolver ? resuelta : ahora, (texto, alfa, desplazamiento) => {
        ctx.globalAlpha = alfaFlecha * alfa * tramo(avance, [0.5, 1]);
        ctx.fillStyle = colores.textoFuerte;
        ctx.font = `600 12px ${colores.fuente}`;
        ctx.textBaseline = "alphabetic";
        const ancho = ctx.measureText(texto).width;
        ctx.textAlign = "left";
        const izquierdaTexto = alineacion === "left" ? Math.max(4, x - 8) : Math.min(x + 8, lienzo.width - 4) - ancho;
        ctx.fillText(texto, izquierdaTexto, y + desplazamiento);
      });
    };
    rotuloFlecha("vp", izquierda, yEje + largoVP + 17, "left", alfaVP, avanceVP);
    rotuloFlecha("vf", xVF, yEje - largoVF - 9, "right", alfaVF, avanceVF);

    // Mirar un periodo: cuánto vale ese dinero en ese momento (equivalencia).
    if (guia.k !== null && guia.alfa > 0.01) {
      const k = periodoEnEje(f.ejeNuevo, ((guia.x - izquierda) / (derecha - izquierda)) * f.ejeNuevo.uFin);
      const valor = vfCompuesto(modelo.P, modelo.i, Math.min(Math.max(k, 0), modelo.n)); // Hoja 2.1
      const yTope = yEje - valor * f.escala;
      ctx.globalAlpha = alfaVista * guia.alfa * 0.85;
      ctx.strokeStyle = colores.capital;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(guia.x, yEje);
      ctx.lineTo(guia.x, yTope);
      ctx.stroke();
      ctx.setLineDash([]);
      punto(ctx, guia.x, yTope, alfaVista * guia.alfa);
      burbuja(ctx, textoDe(guia.k), guia.x, yTope - 12, alfaVista * guia.alfa, colores.textoFuerte, colores.superficie);
    }

    // Pulso en la incógnita al terminar.
    if (anillo !== null) {
      const centro =
        flujo.incognita === "P"
          ? { x: izquierda, y: yEje + f.largoVP }
          : flujo.incognita === "F"
          ? { x: xVF, y: yEje - f.largoVF }
          : flujo.incognita === "i"
          ? { x: control.x, y: yEje - 4 - alto - 14 }
          : { x: centroEje, y: yEje + 15 };
      ctx.globalAlpha = 0.5 * (1 - anillo) * alfaVista;
      ctx.strokeStyle = colores.capital;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centro.x, centro.y, 5 + 18 * suavizar(anillo), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ----- Lectura del periodo -----

  function enDiagrama() {
    return pesoFlujo >= 0.5;
  }

  // Saldo en el periodo k (Hoja 2.1): lo mismo que mide cada barra.
  function saldoEn(k) {
    return vfCompuesto(modelo.P, modelo.i, k);
  }

  function textoDe(k) {
    if (k === 0) return `Hoy · ${datos.dinero(saldoEn(0))}`;
    return `${nombrePeriodo()} ${datos.numero(k)} · ${datos.dinero(saldoEn(k))}`;
  }

  // En el diagrama, la lectura habla de equivalencia: lo que vale ese dinero en ese periodo.
  function lecturaDe(k) {
    if (k === 0) return textoDe(0);
    if (enDiagrama()) return `${nombrePeriodo()} ${datos.numero(k)} · los ${datos.dineroCorto(modelo.P)} de hoy equivalen a ${datos.dinero(saldoEn(k))}`;
    return `${textoDe(k)} · intereses ${datos.dinero(saldoEn(k) - modelo.P)}`;
  }

  // Sin selección: en el diagrama, de VP a VF; en barras o área, la última barra visible
  // (o la meta, cuando la incógnita es el tiempo).
  function leerPorDefecto() {
    if (enDiagrama()) {
      const unidad = Math.abs(modelo.n - 1) < 1e-9 ? datos.singular : datos.plural;
      datos.alLeer(`Hoy ${datos.dinero(modelo.P)} → ${datos.dinero(modelo.VF)} en ${datos.numero(modelo.n)} ${unidad}`);
      return;
    }
    if (modelo.conMeta) {
      datos.alLeer(`Meta ${datos.dinero(modelo.meta)} · se alcanza en n = ${datos.numero(modelo.n)} ${datos.plural}`);
      return;
    }
    datos.alLeer(lecturaDe(modelo.periodos[Math.max(Math.min(estado.visibles, modelo.total), 1) - 1]));
  }

  // Periodos que se pueden mirar y su posición: en el diagrama, todos los enteros de 0 a n
  // (y n si no es entero); en barras o área, las barras visibles.
  function objetivos() {
    if (enDiagrama()) {
      const f = medidasFlujo();
      const lista = [];
      for (let k = 0; k <= modelo.n + 1e-9; k++) lista.push(k);
      if (modelo.n - lista[lista.length - 1] > 1e-9) lista.push(modelo.n);
      return lista.map((k) => ({ k, x: f.x(k) }));
    }
    return modelo.periodos.slice(0, Math.max(1, estado.visibles)).map((k) => ({ k, x: medidas.x(k) }));
  }

  // ----- Guía suave al mirar un periodo -----

  // En cada cuadro la guía recorre parte de lo que le falta hasta su objetivo: se desliza
  // y frena al llegar, sin rebotar, aunque el dedo salte varias barras de una vez.
  function moverGuia() {
    if (idGuia) return;
    let antes = null;
    const paso = (ahora) => {
      const dt = antes === null ? 16 : Math.min(ahora - antes, 50);
      antes = ahora;
      const inmediato = movimientoReducido();
      guia.x += (guiaObjetivo.x - guia.x) * (inmediato ? 1 : 1 - Math.exp(-dt / 70));
      guia.alfa += (guiaObjetivo.alfa - guia.alfa) * (inmediato ? 1 : 1 - Math.exp(-dt / 110));
      const quieta = Math.abs(guiaObjetivo.x - guia.x) < 0.3 && Math.abs(guiaObjetivo.alfa - guia.alfa) < 0.01;
      if (quieta) {
        guia.x = guiaObjetivo.x;
        guia.alfa = guiaObjetivo.alfa;
        if (guia.alfa === 0) guia.k = null;
      }
      pintar();
      idGuia = quieta ? 0 : requestAnimationFrame(paso);
    };
    idGuia = requestAnimationFrame(paso);
  }

  function quitarGuia() {
    cancelAnimationFrame(idGuia);
    idGuia = 0;
    inspeccion = null;
    guia.alfa = guiaObjetivo.alfa = 0;
    guia.k = null;
  }

  // Siempre se ajusta a un periodo: la guía va hacia él y la lectura cambia de inmediato.
  // objetivo: { k, x } de objetivos(), o null para soltar.
  function inspeccionar(objetivo) {
    if (objetivo === null) {
      inspeccion = null;
      guiaObjetivo.alfa = 0;
      leerPorDefecto();
    } else {
      if (guia.alfa < 0.05) guia.x = objetivo.x; // aparece en su sitio, sin cruzar el gráfico
      inspeccion = objetivo.k;
      guia.k = objetivo.k;
      guiaObjetivo.x = objetivo.x;
      guiaObjetivo.alfa = 1;
      datos.alLeer(lecturaDe(objetivo.k));
    }
    moverGuia();
  }

  // ----- Animación -----

  function detenerPulso() {
    clearTimeout(temporizadorPulso);
    if (saltarPulso) {
      const saltar = saltarPulso;
      saltarPulso = null;
      saltar();
    }
    anillo = null;
  }

  // Al terminar de construir o de actualizar: se abre un pulso y aparece la burbuja con el valor.
  function pulsoFinal() {
    detenerPulso();
    if (movimientoReducido()) {
      alfaBurbuja = 1;
      pintar();
      return;
    }
    let latiendo = true;
    const saltar = reproducir(
      (t) => {
        if (destruido) return;
        anillo = t < 1 ? t : null;
        alfaBurbuja = suavizar(Math.min(1, t * 2.2));
        pintar();
        if (t >= 1 && latiendo) {
          latiendo = false;
          saltarPulso = null; // terminó: el gráfico vuelve a responder al dedo
        }
      },
      900,
      () => !enPantalla
    );
    if (latiendo) saltarPulso = saltar;
  }

  // Lleva el gráfico a otro estado: { visibles (barras mostradas), enfoque, notas }.
  function irA(destino, duracion = 650, alTerminar, construyendo = false) {
    if (saltarAnimacion) saltarAnimacion();
    detenerPulso();
    quitarGuia();
    const desde = estado;
    const hasta = {
      visibles: Math.min(destino.visibles ?? modelo.total, modelo.total),
      enfoque: destino.enfoque || "todo",
      notas: crearNotas(destino.notas),
    };
    estado = hasta;
    let animando = true;
    const saltar = reproducir(
      (t) => {
        if (destruido) return;
        vista = calcularVista(desde, hasta, t, construyendo);
        pintar();
        if (t >= 1 && animando) {
          animando = false;
          saltarAnimacion = null;
          leerPorDefecto();
          if (alTerminar) alTerminar();
        }
      },
      duracion,
      () => !enPantalla
    );
    if (animando) saltarAnimacion = saltar;
  }

  // Dibuja el gráfico desde cero. Empieza cuando el gráfico entra en la pantalla.
  function construir() {
    if (saltarAnimacion) saltarAnimacion();
    detenerPulso();
    quitarGuia();
    transicion = null;
    construido = false;
    alfaBurbuja = 0;
    estado = { visibles: 0, enfoque: "todo", notas: null };
    vista = calcularVista(estado, estado, 1);
    if (lienzo && lienzo.width) medir();
    pintar();
    leerPorDefecto();
    pendiente = true;
    if (enPantalla) arrancar();
  }

  function arrancar() {
    pendiente = false;
    const terminar = () => {
      construido = true;
      pulsoFinal();
    };
    if (movimientoReducido()) {
      irA({ visibles: modelo.total, enfoque: "todo" }, 0, terminar);
      canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: "ease-out" });
      return;
    }
    irA({ visibles: modelo.total, enfoque: "todo" }, DURACION_CONSTRUIR, terminar, true);
  }

  // Antes de una actualización forzada: si el gráfico aún no había empezado a construirse, se
  // estaba construyendo o quedó en un paso de "Explícame", pasa directo a su estado completo.
  function completarSinAnimar() {
    if (pendiente) {
      pendiente = false;
      construido = true;
      alfaBurbuja = 1;
    }
    if (saltarAnimacion) saltarAnimacion(); // la construcción salta a su final
    if (estado.enfoque !== "todo" || estado.notas || estado.visibles < modelo.total) {
      estado = { visibles: modelo.total, enfoque: "todo", notas: null };
      vista = calcularVista(estado, estado, 1);
    }
    construido = true;
  }

  // Pasa a un cálculo nuevo sin construir de nuevo: las barras cambian de altura y de sitio,
  // la curva cambia de forma y la escala y los rótulos se ajustan. Si cambia el tiempo, el
  // eje se estira o se encoge y las barras que sobran o faltan salen o entran por la derecha.
  // Devuelve false cuando conviene construir de nuevo: el gráfico no había terminado de
  // construirse, quedó en un paso de "Explícame" o la forma cambia demasiado.
  //
  // forzar: siempre se transforma, aunque cambie mucho ("¿Y si…?" vuelve a tu cálculo).
  // enVivo (el deslizador de "¿Y si…?", fuerza también): llegan muchos cálculos seguidos, así
  // que la transición es corta y frena al final, cada una parte de donde quedó la anterior, los
  // rótulos cambian sin relevo y el pulso espera a que el deslizador se quede quieto.
  function actualizar(nuevosDatos, { enVivo = false, forzar = enVivo } = {}) {
    if (!lienzo || lienzo.width === 0) return false;
    if (forzar) completarSinAnimar();
    if (!construido || pendiente) return false;
    if (saltarAnimacion) saltarAnimacion();
    if (estado.enfoque !== "todo" || estado.notas || estado.visibles < modelo.total) return false;
    const nuevo = modeloDeCrecimiento(nuevosDatos);
    if (nuevo.conMeta !== modelo.conMeta) return false;
    const barras = emparejarBarras(modelo, nuevo);
    const parejas = barras.filter((barra) => barra.antes && barra.despues).length;
    if (!forzar && (parejas < 0.5 * modelo.total || parejas < 0.5 * nuevo.total)) return false;

    detenerPulso();
    quitarGuia();
    const alfaInicial = alfaBurbuja;
    transicion = {
      anterior: modelo,
      datosAnteriores: datos,
      barras,
      mezcla: 0,
      enVivo,
      textoBurbuja: datos.dinero(modelo.saldos[modelo.total - 1]),
      alfaBurbuja: alfaInicial,
    };
    modelo = nuevo;
    datos = nuevosDatos;
    estado = { visibles: modelo.total, enfoque: "todo", notas: null };
    vista = calcularVista(estado, estado, 1);
    alfaBurbuja = 0;
    canvas.setAttribute("aria-label", datos.descripcion || "");
    medir();
    if (enVivo) leerPorDefecto(); // la lectura sigue al deslizador, sin esperar a la transición
    if (movimientoReducido() && !enVivo) canvas.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });

    let animando = true;
    const saltar = reproducir(
      (t) => {
        if (destruido) return;
        transicion.mezcla = enVivo ? suavizar(t) : entradaSalida(t);
        transicion.alfaBurbuja = alfaInicial * (1 - suavizar(Math.min(1, t / 0.2))); // la burbuja anterior se va enseguida
        pintar();
        if (t >= 1 && animando) {
          animando = false;
          saltarAnimacion = null;
          transicion = null;
          medir();
          pintar();
          leerPorDefecto();
          if (enVivo) temporizadorPulso = setTimeout(pulsoFinal, 250);
          else pulsoFinal();
        }
      },
      enVivo ? DURACION_EN_VIVO : DURACION_ACTUALIZAR,
      () => !enPantalla
    );
    if (animando) saltarAnimacion = saltar;
    return true;
  }

  // Cambia de vista (600 ms). De barras a área, las barras se adelgazan y se desvanecen
  // mientras aparecen las bandas bajo la misma curva; entre el diagrama de flujo de caja y el
  // gráfico, uno se funde en el otro. Para ver la vista nueva dibujarse, "Repetir".
  function cambiarTipo(tipo) {
    if (saltarCambioTipo) saltarCambioTipo();
    const flujoDestino = tipo === "flujo" ? 1 : 0;
    const areaDestino = tipo === "area" ? 1 : tipo === "barras" ? 0 : mezclaArea;
    if (flujoDestino === pesoFlujo && areaDestino === mezclaArea) return;
    quitarGuia();
    // Al salir del diagrama, el gráfico de debajo ya está en la forma elegida.
    if (pesoFlujo > 0 && flujoDestino === 0) mezclaArea = areaDestino;
    const desde = { flujo: pesoFlujo, area: mezclaArea };
    let animando = true;
    const saltar = reproducir(
      (t) => {
        if (destruido) return;
        const e = entradaSalida(t);
        pesoFlujo = mezclar(desde.flujo, flujoDestino, e);
        mezclaArea = mezclar(desde.area, areaDestino, e);
        pintar();
        if (t >= 1 && animando) {
          animando = false;
          saltarCambioTipo = null;
          leerPorDefecto();
        }
      },
      600,
      () => !enPantalla
    );
    if (animando) saltarCambioTipo = saltar;
    if (movimientoReducido()) canvas.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
  }

  // ----- Interacción -----

  function masCercano(evento) {
    const x = evento.clientX - canvas.getBoundingClientRect().left;
    let mejor = null;
    for (const objetivo of objetivos()) {
      if (!mejor || Math.abs(objetivo.x - x) < Math.abs(mejor.x - x)) mejor = objetivo;
    }
    return mejor;
  }

  // Mientras el gráfico se construye, se transforma o late el pulso del final, no responde a
  // toques, al mouse ni al teclado: la animación siempre se ve completa y a su velocidad (en
  // el celular, el dedo que pasa por encima al desplazar la página no la corta). Para verla
  // otra vez, "Repetir".
  function estaAnimando() {
    return Boolean(saltarAnimacion || saltarPulso);
  }

  function alPresionar(evento) {
    if (estaAnimando() || !medidas) return;
    detenerPulso(); // el pulso que esperaba al deslizador de "¿Y si…?" ya no hace falta
    arrastrando = true;
    canvas.setPointerCapture?.(evento.pointerId);
    inspeccionar(masCercano(evento));
  }

  function alMover(evento) {
    if (estaAnimando() || !medidas) return;
    if (!arrastrando && evento.pointerType !== "mouse") return;
    const objetivo = masCercano(evento);
    if (objetivo.k !== inspeccion) inspeccionar(objetivo);
  }

  function alSoltar() {
    arrastrando = false;
  }

  function alSalir(evento) {
    if (evento.pointerType === "mouse" && !arrastrando) inspeccionar(null);
  }

  function alTeclear(evento) {
    if (estaAnimando() || !medidas) return;
    const lista = objetivos();
    const encontrado = lista.findIndex((objetivo) => objetivo.k === inspeccion);
    const actual = encontrado >= 0 ? encontrado : lista.length - 1;
    if (evento.key === "ArrowRight") inspeccionar(lista[Math.min(actual + 1, lista.length - 1)]);
    else if (evento.key === "ArrowLeft") inspeccionar(lista[Math.max(actual - 1, 0)]);
    else if (evento.key === "Escape") inspeccionar(null);
    else return;
    evento.preventDefault();
  }

  function alCambiarTema() {
    colores = leerColores(canvas);
    if (lienzo && lienzo.width) medir();
    pintar();
  }

  const observadorTamano = new ResizeObserver(() => {
    lienzo = prepararCanvas(canvas);
    if (lienzo.width === 0) return;
    medir();
    const mirado = guia.k === null ? null : objetivos().find((objetivo) => objetivo.k === guia.k);
    if (mirado) guia.x = guiaObjetivo.x = mirado.x;
    pintar();
  });

  const observadorPantalla = new IntersectionObserver(
    ([entrada]) => {
      enPantalla = entrada.isIntersecting;
      if (enPantalla && pendiente) arrancar();
    },
    { threshold: 0.35 }
  );

  lienzo = prepararCanvas(canvas);
  if (lienzo.width) medir();
  canvas.setAttribute("aria-label", datos.descripcion || "");
  observadorTamano.observe(canvas);
  observadorPantalla.observe(canvas);
  canvas.addEventListener("pointerdown", alPresionar);
  canvas.addEventListener("pointermove", alMover);
  canvas.addEventListener("pointerup", alSoltar);
  canvas.addEventListener("pointercancel", alSoltar);
  canvas.addEventListener("pointerleave", alSalir);
  canvas.addEventListener("keydown", alTeclear);
  document.addEventListener("cambio-tema", alCambiarTema);

  return {
    get total() {
      return modelo.total;
    },

    // Cuántas barras corresponden a los periodos 0..periodo (sirve para "Explícame").
    barrasHasta(periodo) {
      return modelo.periodos.filter((k) => k <= periodo + 1e-9).length;
    },

    construir,
    actualizar,
    cambiarTipo,
    irA,

    destruir() {
      destruido = true;
      if (saltarAnimacion) saltarAnimacion();
      if (saltarCambioTipo) saltarCambioTipo();
      detenerPulso();
      cancelAnimationFrame(idGuia);
      observadorTamano.disconnect();
      observadorPantalla.disconnect();
      canvas.removeEventListener("pointerdown", alPresionar);
      canvas.removeEventListener("pointermove", alMover);
      canvas.removeEventListener("pointerup", alSoltar);
      canvas.removeEventListener("pointercancel", alSoltar);
      canvas.removeEventListener("pointerleave", alSalir);
      canvas.removeEventListener("keydown", alTeclear);
      document.removeEventListener("cambio-tema", alCambiarTema);
    },
  };
}
