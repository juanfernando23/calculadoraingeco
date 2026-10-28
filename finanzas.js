/* finanzas.js
 * Fórmulas de Ingeniería Económica según la hoja de fórmulas de clase
 * (formulario_de_ingenier_a_econ_mica.tex). Cada función indica su número en la hoja.
 *
 * Reglas de este archivo:
 * - Solo cálculo: no lee ni modifica la página.
 * - Todas las tasas van en decimal (1,5 % = 0.015).
 * - Nada se redondea aquí; el redondeo se hace solo al mostrar.
 */

// ---------- Sección 1 · Tasas nominal, periódica y efectiva ----------

// Hoja 1.1 · De interés nominal a periódico: i_p = i_n / m
function nominalAPeriodica(i_n, m) {
  return i_n / m;
}

// Hoja 1.2 · De interés periódico a nominal: i_n = i_p · m
function periodicaANominal(i_p, m) {
  return i_p * m;
}

// Hoja 1.3 · De interés nominal a efectivo anual: i_ea = (1 + i_n / m)^m - 1
function nominalAEfectiva(i_n, m) {
  return Math.pow(1 + i_n / m, m) - 1;
}

// Hoja 1.4 · De interés efectivo anual a nominal: i_n = [(1 + i_ea)^(1/m) - 1] · m
function efectivaANominal(i_ea, m) {
  return (Math.pow(1 + i_ea, 1 / m) - 1) * m;
}

// Hoja 1.5 · De interés periódico a efectivo anual: i_ea = (1 + i_p)^m - 1
function periodicaAEfectiva(i_p, m) {
  return Math.pow(1 + i_p, m) - 1;
}

// Hoja 1.6 · De interés efectivo anual a periódico: i_p = (1 + i_ea)^(1/m) - 1
function efectivaAPeriodica(i_ea, m) {
  return Math.pow(1 + i_ea, 1 / m) - 1;
}

// ---------- Sección 2 · Interés compuesto ----------

// Hoja 2.1 · Valor futuro: VF = P · (1 + i)^n
function vfCompuesto(P, i, n) {
  return P * Math.pow(1 + i, n);
}

// Hoja 2.2 · Valor presente: P = F / (1 + i)^n
function vpCompuesto(F, i, n) {
  return F / Math.pow(1 + i, n);
}

// Hoja 2.3 · Tasa de interés: i = (raíz n-ésima de F / P) - 1
function tasaCompuesto(P, F, n) {
  return Math.pow(F / P, 1 / n) - 1;
}

// Hoja 2.4 · Tiempo: n = ln(F / P) / ln(1 + i)
function nCompuesto(P, F, i) {
  return Math.log(F / P) / Math.log(1 + i);
}

// ---------- Sección 3 · Tasas vencidas y anticipadas ----------

// Hoja 3.1 · De interés vencido a anticipado: i_a = i_v / (1 + i_v)
function vencidaAAnticipada(i_v) {
  return i_v / (1 + i_v);
}

// Hoja 3.2 · De interés anticipado a vencido: i_v = i_a / (1 - i_a)
// Solo existe si la tasa anticipada por periodo es menor que 100 %.
function anticipadaAVencida(i_a) {
  return i_a < 1 ? i_a / (1 - i_a) : NaN;
}

// ---------- Sección 4 · Interés indexado ----------

// Hoja 4.1 · Fórmula combinada (IPC + puntos): i = (1 + i_1)(1 + i_2) - 1
function indexacionCombinada(i1, i2) {
  return (1 + i1) * (1 + i2) - 1;
}

// Hoja 4.2 · Indexación lineal (DTF o IBR + puntos): i = I_1 + I_2.
// Solo vale si las dos tasas están en la misma forma (periodicidad y modalidad).
function indexacionLineal(I1, I2) {
  return I1 + I2;
}

// UVR (no está en la hoja). Es una unidad, no una tasa: un valor en pesos por cada UVR.
function uvrAPesos(unidades, valorUVR) {
  return unidades * valorUVR;
}

function pesosAUvr(pesos, valorUVR) {
  return pesos / valorUVR;
}

// Variación de la UVR entre dos fechas: UVR final / UVR inicial - 1
function variacionUvr(inicial, final) {
  return final / inicial - 1;
}

// ---------- Sección 5 · Anualidades vencidas (pagos al final de cada periodo) ----------

// Hoja 5.1 · Valor presente: P = A · [((1 + i)^n - 1) / (i · (1 + i)^n)]
function vpAnualidadVencida(A, i, n) {
  const f = Math.pow(1 + i, n);
  return A * ((f - 1) / (i * f));
}

// Hoja 5.1 · Cuota desde P: A = P · [(i · (1 + i)^n) / ((1 + i)^n - 1)]
function cuotaDesdeVPVencida(P, i, n) {
  const f = Math.pow(1 + i, n);
  return P * ((i * f) / (f - 1));
}

// Hoja 5.2 · Valor futuro: F = A · [((1 + i)^n - 1) / i]
function vfAnualidadVencida(A, i, n) {
  return A * ((Math.pow(1 + i, n) - 1) / i);
}

// Hoja 5.2 · Cuota desde F: A = F · [i / ((1 + i)^n - 1)]
function cuotaDesdeVFVencida(F, i, n) {
  return F * (i / (Math.pow(1 + i, n) - 1));
}

// Hoja 5.3 · n con VP: n = -ln(1 - VP · i / A) / ln(1 + i)
// Solo existe si A > VP · i (la cuota cubre el interés de cada periodo).
function nDesdeVPVencida(P, A, i) {
  const x = 1 - (P * i) / A;
  return x > 0 ? -Math.log(x) / Math.log(1 + i) : NaN;
}

// Hoja 5.3 · n con VF: n = ln(VF · i / A + 1) / ln(1 + i)
function nDesdeVFVencida(F, A, i) {
  return Math.log((F * i) / A + 1) / Math.log(1 + i);
}

// ---------- Sección 6 · Anualidades anticipadas (pagos al inicio de cada periodo) ----------

// Hoja 6.1 · Valor presente: P = A + A · [((1 + i)^(n-1) - 1) / (i · (1 + i)^(n-1))]
function vpAnualidadAnticipada(A, i, n) {
  const f = Math.pow(1 + i, n - 1);
  return A + A * ((f - 1) / (i * f));
}

// Hoja 6.1 · Cuota desde P: A = P / {1 + [((1 + i)^(n-1) - 1) / (i · (1 + i)^(n-1))]}
function cuotaDesdeVPAnticipada(P, i, n) {
  const f = Math.pow(1 + i, n - 1);
  return P / (1 + (f - 1) / (i * f));
}

// Hoja 6.2 · Valor futuro: F = A · [((1 + i)^(n+1) - (1 + i)) / i]
function vfAnualidadAnticipada(A, i, n) {
  return A * ((Math.pow(1 + i, n + 1) - (1 + i)) / i);
}

// Despeje de la 6.2 · Cuota desde F: A = F · i / [(1 + i)^(n+1) - (1 + i)]
function cuotaDesdeVFAnticipada(F, i, n) {
  return (F * i) / (Math.pow(1 + i, n + 1) - (1 + i));
}

// Hoja 6.3 · n con VP: n = -ln(1 - VP · i / (A · (1 + i))) / ln(1 + i)
// Solo existe si A · (1 + i) > VP · i.
function nDesdeVPAnticipada(P, A, i) {
  const x = 1 - (P * i) / (A * (1 + i));
  return x > 0 ? -Math.log(x) / Math.log(1 + i) : NaN;
}

// Hoja 6.3 · n con VF: n = ln(VF · i / (A · (1 + i)) + 1) / ln(1 + i)
function nDesdeVFAnticipada(F, A, i) {
  return Math.log((F * i) / (A * (1 + i)) + 1) / Math.log(1 + i);
}

// Extra (no está en la hoja) · Tasa de una anualidad, por bisección: no hay despeje.
// El valor presente baja cuando la tasa sube y el futuro sube, así que se parte el intervalo
// a la mitad hasta encerrar la tasa. desde: "P" o "F". Devuelve NaN si la tasa sería cero o
// negativa: la suma de las cuotas (A · n) debe superar a P, o ser menor que F.
function tasaAnualidad(valor, A, n, desde, anticipada) {
  const conTasa = (i) => {
    if (desde === "P") return anticipada ? vpAnualidadAnticipada(A, i, n) : vpAnualidadVencida(A, i, n);
    return anticipada ? vfAnualidadAnticipada(A, i, n) : vfAnualidadVencida(A, i, n);
  };
  const sube = desde === "F";
  if (sube ? !(valor > A * n) : !(valor < A * n)) return NaN;
  let bajo = 1e-12;
  let alto = 1;
  for (let k = 0; k < 60 && (sube ? conTasa(alto) < valor : conTasa(alto) > valor); k++) alto *= 2;
  for (let k = 0; k < 200; k++) {
    const medio = (bajo + alto) / 2;
    if (sube ? conTasa(medio) < valor : conTasa(medio) > valor) bajo = medio;
    else alto = medio;
  }
  return (bajo + alto) / 2;
}

// ---------- Sección 7 · Anualidades perpetuas (pagos que no terminan) ----------

// Valor presente (capital requerido): P = A / i
function vpPerpetuidad(A, i) {
  return A / i;
}

// Cuota perpetua (pago sostenible): A = P · i
function pagoPerpetuidad(P, i) {
  return P * i;
}

// ---------- Procedimiento general de conversión ----------
//
// Lleva una tasa de cualquier forma a cualquier otra pasando por la efectiva anual,
// en este orden y solo con los pasos que hagan falta: 1.1 → 3.2 → 1.5 → 1.6 → 3.1 → 1.2
//
// origen:  { valor, tipo: "efectiva" | "nominal", m, modalidad: "vencida" | "anticipada" }
// destino: { tipo, m, modalidad }
// m = periodos por año (12 mensual, 6 bimestral, 4 trimestral, 3 cuatrimestral, 2 semestral, 1 anual).
//
// Devuelve { valor, pasos }. Cada paso es { formula, entrada, valor, m }, para poder
// mostrar el procedimiento con su número de fórmula.
function convertirTasa(origen, destino) {
  const pasos = [];
  let i = origen.valor;
  let m = origen.m;

  function paso(formula, nuevoValor, mDelPaso) {
    pasos.push({ formula, entrada: i, valor: nuevoValor, m: mDelPaso });
    i = nuevoValor;
  }

  if (origen.tipo === "nominal" && m !== 1) {
    paso("1.1", nominalAPeriodica(i, m), m);
  }
  if (origen.modalidad === "anticipada") {
    paso("3.2", anticipadaAVencida(i), m);
  }
  if (m !== destino.m) {
    if (m !== 1) paso("1.5", periodicaAEfectiva(i, m), m);
    if (destino.m !== 1) paso("1.6", efectivaAPeriodica(i, destino.m), destino.m);
    m = destino.m;
  }
  if (destino.modalidad === "anticipada") {
    paso("3.1", vencidaAAnticipada(i), m);
  }
  if (destino.tipo === "nominal" && m !== 1) {
    paso("1.2", periodicaANominal(i, m), m);
  }
  return { valor: i, pasos };
}

// Permite usar estas funciones desde Node para correr las pruebas en la terminal.
if (typeof module !== "undefined") {
  module.exports = {
    nominalAPeriodica,
    periodicaANominal,
    nominalAEfectiva,
    efectivaANominal,
    periodicaAEfectiva,
    efectivaAPeriodica,
    vfCompuesto,
    vpCompuesto,
    tasaCompuesto,
    nCompuesto,
    vencidaAAnticipada,
    anticipadaAVencida,
    indexacionCombinada,
    indexacionLineal,
    uvrAPesos,
    pesosAUvr,
    variacionUvr,
    vpAnualidadVencida,
    cuotaDesdeVPVencida,
    vfAnualidadVencida,
    cuotaDesdeVFVencida,
    nDesdeVPVencida,
    nDesdeVFVencida,
    vpAnualidadAnticipada,
    cuotaDesdeVPAnticipada,
    vfAnualidadAnticipada,
    cuotaDesdeVFAnticipada,
    nDesdeVPAnticipada,
    nDesdeVFAnticipada,
    tasaAnualidad,
    vpPerpetuidad,
    pagoPerpetuidad,
    convertirTasa,
  };
}
