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
    convertirTasa,
  };
}
