/* pruebas.js
 * Casos con resultado conocido: los ejemplos resueltos de docs/02-modulos-y-formulas.md.
 * Funciona en el navegador (pruebas.html) y en la terminal:  node pruebas.js
 */

const fin = typeof module !== "undefined" ? require("./finanzas.js") : window;

// Tolerancias: media unidad del último decimal que se muestra.
const DINERO = 0.005; // centavos
const TASA = 0.0000005; // cuarto decimal del porcentaje
const PERIODOS = 0.00005; // cuarto decimal

const nominalMensual24 = { valor: 0.24, tipo: "nominal", m: 12, modalidad: "vencida" };

const casos = [
  // ----- Interés compuesto (sección 2 de la hoja) -----
  { grupo: "Interés compuesto", nombre: "1a · Valor futuro (2.1)", tipo: "dinero", esperado: 14295028.12, tolerancia: DINERO,
    obtenido: () => fin.vfCompuesto(10000000, 0.015, 24) },
  { grupo: "Interés compuesto", nombre: "1b · Valor presente (2.2)", tipo: "dinero", esperado: 17794506.2, tolerancia: DINERO,
    obtenido: () => fin.vpCompuesto(25000000, 0.12, 3) },
  { grupo: "Interés compuesto", nombre: "1c · Tasa (2.3)", tipo: "tasa", esperado: 0.014118, tolerancia: TASA,
    obtenido: () => fin.tasaCompuesto(10000000, 14000000, 24) },
  { grupo: "Interés compuesto", nombre: "1d · Tiempo, n no entero (2.4)", tipo: "periodos", esperado: 27.2332, tolerancia: PERIODOS,
    obtenido: () => fin.nCompuesto(10000000, 15000000, 0.015) },
  { grupo: "Interés compuesto", nombre: "1d · Saldo al final del mes 27", tipo: "dinero", esperado: 14948001.77, tolerancia: DINERO,
    obtenido: () => fin.vfCompuesto(10000000, 0.015, 27) },
  { grupo: "Interés compuesto", nombre: "1d · Saldo al final del mes 28", tipo: "dinero", esperado: 15172221.8, tolerancia: DINERO,
    obtenido: () => fin.vfCompuesto(10000000, 0.015, 28) },
  { grupo: "Interés compuesto", nombre: "1e · 18 % EA a efectiva mensual (1.6)", tipo: "tasa", esperado: 0.013888, tolerancia: TASA,
    obtenido: () => fin.efectivaAPeriodica(0.18, 12) },
  { grupo: "Interés compuesto", nombre: "1e · Valor futuro convirtiendo la tasa", tipo: "dinero", esperado: 15125335.56, tolerancia: DINERO,
    obtenido: () => fin.vfCompuesto(10000000, fin.efectivaAPeriodica(0.18, 12), 30) },
  { grupo: "Interés compuesto", nombre: "1e · Valor futuro convirtiendo el tiempo", tipo: "dinero", esperado: 15125335.56, tolerancia: DINERO,
    obtenido: () => fin.vfCompuesto(10000000, 0.18, 2.5) },

  // ----- Conversión de tasas (secciones 1 y 3 de la hoja) -----
  { grupo: "Conversión de tasas", nombre: "2a · 24 % NMV a mensual (1.1)", tipo: "tasa", esperado: 0.02, tolerancia: TASA,
    obtenido: () => fin.nominalAPeriodica(0.24, 12) },
  { grupo: "Conversión de tasas", nombre: "2a · 24 % NMV a efectiva anual (1.3)", tipo: "tasa", esperado: 0.268242, tolerancia: TASA,
    obtenido: () => fin.nominalAEfectiva(0.24, 12) },
  { grupo: "Conversión de tasas", nombre: "2a · Efectiva anual de vuelta a nominal (1.4)", tipo: "tasa", esperado: 0.24, tolerancia: TASA,
    obtenido: () => fin.efectivaANominal(fin.nominalAEfectiva(0.24, 12), 12) },
  { grupo: "Conversión de tasas", nombre: "2a · Procedimiento general: a efectiva anual", tipo: "tasa", esperado: 0.268242, tolerancia: TASA,
    obtenido: () => fin.convertirTasa(nominalMensual24, { tipo: "efectiva", m: 1, modalidad: "vencida" }).valor },
  { grupo: "Conversión de tasas", nombre: "2a · Procedimiento general: a efectiva trimestral", tipo: "tasa", esperado: 0.061208, tolerancia: TASA,
    obtenido: () => fin.convertirTasa(nominalMensual24, { tipo: "efectiva", m: 4, modalidad: "vencida" }).valor },
  { grupo: "Conversión de tasas", nombre: "2a · Procedimiento general: a nominal trimestre vencido", tipo: "tasa", esperado: 0.244832, tolerancia: TASA,
    obtenido: () => fin.convertirTasa(nominalMensual24, { tipo: "nominal", m: 4, modalidad: "vencida" }).valor },
  { grupo: "Conversión de tasas", nombre: "2a · Procedimiento general: a nominal trimestre anticipado", tipo: "tasa", esperado: 0.230711, tolerancia: TASA,
    obtenido: () => fin.convertirTasa(nominalMensual24, { tipo: "nominal", m: 4, modalidad: "anticipada" }).valor },
  { grupo: "Conversión de tasas", nombre: "2a · Procedimiento general: a efectiva semestral", tipo: "tasa", esperado: 0.126162, tolerancia: TASA,
    obtenido: () => fin.convertirTasa(nominalMensual24, { tipo: "efectiva", m: 2, modalidad: "vencida" }).valor },
  { grupo: "Conversión de tasas", nombre: "2a · Procedimiento general: a nominal semestre vencido", tipo: "tasa", esperado: 0.252325, tolerancia: TASA,
    obtenido: () => fin.convertirTasa(nominalMensual24, { tipo: "nominal", m: 2, modalidad: "vencida" }).valor },
  { grupo: "Conversión de tasas", nombre: "2a · Procedimiento general: a nominal mes anticipado", tipo: "tasa", esperado: 0.235294, tolerancia: TASA,
    obtenido: () => fin.convertirTasa(nominalMensual24, { tipo: "nominal", m: 12, modalidad: "anticipada" }).valor },
  { grupo: "Conversión de tasas", nombre: "2b · 3 % mensual anticipada a vencida (3.2)", tipo: "tasa", esperado: 0.030928, tolerancia: TASA,
    obtenido: () => fin.anticipadaAVencida(0.03) },
  { grupo: "Conversión de tasas", nombre: "2b · De vuelta a anticipada (3.1)", tipo: "tasa", esperado: 0.03, tolerancia: TASA,
    obtenido: () => fin.vencidaAAnticipada(fin.anticipadaAVencida(0.03)) },
  { grupo: "Conversión de tasas", nombre: "2c · 30 % NTA a efectiva anual", tipo: "tasa", esperado: 0.365945, tolerancia: TASA,
    obtenido: () => fin.convertirTasa({ valor: 0.3, tipo: "nominal", m: 4, modalidad: "anticipada" }, { tipo: "efectiva", m: 1, modalidad: "vencida" }).valor },

  // ----- Datos que no tienen sentido: deben dar NaN -----
  { grupo: "Datos inconsistentes", nombre: "Tasa anticipada de 100 % por periodo (3.2)", tipo: "tasa", esperado: NaN,
    obtenido: () => fin.anticipadaAVencida(1) },
  { grupo: "Datos inconsistentes", nombre: "Conversión con tasa anticipada mayor que 100 %", tipo: "tasa", esperado: NaN,
    obtenido: () => fin.convertirTasa({ valor: 1.2, tipo: "efectiva", m: 1, modalidad: "anticipada" }, { tipo: "efectiva", m: 12, modalidad: "vencida" }).valor },
];

function correrPruebas() {
  return casos.map((caso) => {
    const obtenido = caso.obtenido();
    const correcto = Number.isNaN(caso.esperado)
      ? Number.isNaN(obtenido)
      : Math.abs(obtenido - caso.esperado) <= caso.tolerancia;
    return { ...caso, obtenido, correcto };
  });
}

// En la terminal: imprime cada caso y termina con error si alguno falla.
if (typeof module !== "undefined" && require.main === module) {
  const resultados = correrPruebas();
  for (const r of resultados) console.log(r.correcto ? "✓" : "✗", r.nombre, "→", r.obtenido);
  const fallas = resultados.filter((r) => !r.correcto).length;
  console.log(`\n${resultados.length - fallas} de ${resultados.length} pruebas correctas`);
  process.exitCode = fallas ? 1 : 0;
}
