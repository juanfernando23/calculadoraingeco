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

  // ----- Tasas indexadas (sección 4 de la hoja; docs/03-indexacion.md) -----
  { grupo: "Tasas indexadas", nombre: "DTF A · 9,25 % TA + 3 puntos (4.2)", tipo: "tasa", esperado: 0.1225, tolerancia: TASA,
    obtenido: () => fin.indexacionLineal(0.0925, 0.03) },
  { grupo: "Tasas indexadas", nombre: "DTF A · 12,25 % NTA a efectiva anual", tipo: "tasa", esperado: 0.132486, tolerancia: TASA,
    obtenido: () => fin.convertirTasa({ valor: 0.1225, tipo: "nominal", m: 4, modalidad: "anticipada" }, { tipo: "efectiva", m: 1, modalidad: "vencida" }).valor },
  { grupo: "Tasas indexadas", nombre: "DTF A · y a efectiva mensual", tipo: "tasa", esperado: 0.010422, tolerancia: TASA,
    obtenido: () => fin.convertirTasa({ valor: 0.1225, tipo: "nominal", m: 4, modalidad: "anticipada" }, { tipo: "efectiva", m: 12, modalidad: "vencida" }).valor },
  { grupo: "Tasas indexadas", nombre: "DTF B · 9,25 % EA a nominal trimestre anticipado", tipo: "tasa", esperado: 0.087497, tolerancia: TASA,
    obtenido: () => fin.convertirTasa({ valor: 0.0925, tipo: "efectiva", m: 1, modalidad: "vencida" }, { tipo: "nominal", m: 4, modalidad: "anticipada" }).valor },
  { grupo: "Tasas indexadas", nombre: "DTF B · + 3 puntos y a efectiva anual", tipo: "tasa", esperado: 0.12666, tolerancia: TASA,
    obtenido: () => {
      const dtfTA = fin.convertirTasa({ valor: 0.0925, tipo: "efectiva", m: 1, modalidad: "vencida" }, { tipo: "nominal", m: 4, modalidad: "anticipada" }).valor;
      return fin.convertirTasa({ valor: fin.indexacionLineal(dtfTA, 0.03), tipo: "nominal", m: 4, modalidad: "anticipada" }, { tipo: "efectiva", m: 1, modalidad: "vencida" }).valor;
    } },
  { grupo: "Tasas indexadas", nombre: "IBR A · 9,10 % NTV + 2,5 puntos a efectiva anual", tipo: "tasa", esperado: 0.121144, tolerancia: TASA,
    obtenido: () => fin.convertirTasa({ valor: fin.indexacionLineal(0.091, 0.025), tipo: "nominal", m: 4, modalidad: "vencida" }, { tipo: "efectiva", m: 1, modalidad: "vencida" }).valor },
  { grupo: "Tasas indexadas", nombre: "IBR B · 9 % NMV + 3 puntos a efectiva anual", tipo: "tasa", esperado: 0.126825, tolerancia: TASA,
    obtenido: () => fin.convertirTasa({ valor: fin.indexacionLineal(0.09, 0.03), tipo: "nominal", m: 12, modalidad: "vencida" }, { tipo: "efectiva", m: 1, modalidad: "vencida" }).valor },
  { grupo: "Tasas indexadas", nombre: "IPC 5,2 % + 4 puntos (4.1)", tipo: "tasa", esperado: 0.09408, tolerancia: TASA,
    obtenido: () => fin.indexacionCombinada(0.052, 0.04) },
  { grupo: "Tasas indexadas", nombre: "UVR · 50.000 UVR a $ 380 en pesos", tipo: "dinero", esperado: 19000000, tolerancia: DINERO,
    obtenido: () => fin.uvrAPesos(50000, 380) },
  { grupo: "Tasas indexadas", nombre: "UVR · $ 19.000.000 a $ 380 en UVR", tipo: "periodos", esperado: 50000, tolerancia: PERIODOS,
    obtenido: () => fin.pesosAUvr(19000000, 380) },
  { grupo: "Tasas indexadas", nombre: "UVR · variación de 370 a 388,5", tipo: "tasa", esperado: 0.05, tolerancia: TASA,
    obtenido: () => fin.variacionUvr(370, 388.5) },
  { grupo: "Tasas indexadas", nombre: "UVR + 7 % con variación de 5 % (como 4.1)", tipo: "tasa", esperado: 0.1235, tolerancia: TASA,
    obtenido: () => fin.indexacionCombinada(0.05, 0.07) },

  // ----- Anualidad vencida (sección 5 de la hoja) -----
  { grupo: "Anualidad vencida", nombre: "4a · Cuota de un préstamo (5.1)", tipo: "dinero", esperado: 687444.55, tolerancia: DINERO,
    obtenido: () => fin.cuotaDesdeVPVencida(20000000, 0.012, 36) },
  { grupo: "Anualidad vencida", nombre: "4a · De vuelta al valor presente (5.1)", tipo: "dinero", esperado: 20000000, tolerancia: DINERO,
    obtenido: () => fin.vpAnualidadVencida(fin.cuotaDesdeVPVencida(20000000, 0.012, 36), 0.012, 36) },
  { grupo: "Anualidad vencida", nombre: "4b · Ahorro: valor futuro (5.2)", tipo: "dinero", esperado: 13171577.56, tolerancia: DINERO,
    obtenido: () => fin.vfAnualidadVencida(500000, 0.008, 24) },
  { grupo: "Anualidad vencida", nombre: "4b · Cuota desde el valor futuro (5.2)", tipo: "dinero", esperado: 500000, tolerancia: DINERO,
    obtenido: () => fin.cuotaDesdeVFVencida(13171577.56, 0.008, 24) },
  { grupo: "Anualidad vencida", nombre: "4b · Número de cuotas desde el valor futuro (5.3)", tipo: "periodos", esperado: 24, tolerancia: PERIODOS,
    obtenido: () => fin.nDesdeVFVencida(13171577.56, 500000, 0.008) },
  { grupo: "Anualidad vencida", nombre: "4c · Número de cuotas, n no entero (5.3)", tipo: "periodos", esperado: 29.9009, tolerancia: PERIODOS,
    obtenido: () => fin.nDesdeVPVencida(20000000, 800000, 0.012) },
  { grupo: "Anualidad vencida", nombre: "4e · Cuota con 15 % EA convertida a mensual (1.6 y 5.1)", tipo: "dinero", esperado: 684115.16, tolerancia: DINERO,
    obtenido: () => fin.cuotaDesdeVPVencida(20000000, fin.efectivaAPeriodica(0.15, 12), 36) },
  { grupo: "Anualidad vencida", nombre: "4f · Tasa por bisección (extra)", tipo: "tasa", esperado: 0.013068, tolerancia: TASA,
    obtenido: () => fin.tasaAnualidad(20000000, 700000, 36, "P", false) },

  // ----- Anualidad anticipada (sección 6 de la hoja) -----
  { grupo: "Anualidad anticipada", nombre: "5a · Valor presente de un arriendo (6.1)", tipo: "dinero", esperado: 17051442.37, tolerancia: DINERO,
    obtenido: () => fin.vpAnualidadAnticipada(1500000, 0.01, 12) },
  { grupo: "Anualidad anticipada", nombre: "5a · Número de pagos desde el valor presente (6.3)", tipo: "periodos", esperado: 12, tolerancia: PERIODOS,
    obtenido: () => fin.nDesdeVPAnticipada(17051442.37, 1500000, 0.01) },
  { grupo: "Anualidad anticipada", nombre: "5b · Cuota anticipada del préstamo (6.1)", tipo: "dinero", esperado: 679293.04, tolerancia: DINERO,
    obtenido: () => fin.cuotaDesdeVPAnticipada(20000000, 0.012, 36) },
  { grupo: "Anualidad anticipada", nombre: "5b · Es la vencida dividida entre 1,012", tipo: "dinero", esperado: 679293.04, tolerancia: DINERO,
    obtenido: () => fin.cuotaDesdeVPVencida(20000000, 0.012, 36) / 1.012 },
  { grupo: "Anualidad anticipada", nombre: "5c · Ahorro anticipado: valor futuro (6.2)", tipo: "dinero", esperado: 13276950.18, tolerancia: DINERO,
    obtenido: () => fin.vfAnualidadAnticipada(500000, 0.008, 24) },
  { grupo: "Anualidad anticipada", nombre: "5c · Cuota desde el valor futuro (despeje de 6.2)", tipo: "dinero", esperado: 500000, tolerancia: DINERO,
    obtenido: () => fin.cuotaDesdeVFAnticipada(13276950.18, 0.008, 24) },
  { grupo: "Anualidad anticipada", nombre: "5c · Número de pagos desde el valor futuro (6.3)", tipo: "periodos", esperado: 24, tolerancia: PERIODOS,
    obtenido: () => fin.nDesdeVFAnticipada(13276950.18, 500000, 0.008) },
  { grupo: "Anualidad anticipada", nombre: "Tasa por bisección (extra)", tipo: "tasa", esperado: 0.012, tolerancia: TASA,
    obtenido: () => fin.tasaAnualidad(20000000, fin.cuotaDesdeVPAnticipada(20000000, 0.012, 36), 36, "P", true) },

  // ----- Anualidad perpetua (sección 7 de la hoja) -----
  { grupo: "Anualidad perpetua", nombre: "6a · Fondo de becas: capital requerido (P = A / i)", tipo: "dinero", esperado: 102440442.41, tolerancia: DINERO,
    obtenido: () => fin.vpPerpetuidad(5000000, fin.efectivaAPeriodica(0.1, 2)) },
  { grupo: "Anualidad perpetua", nombre: "6b · Pago sostenible (A = P · i)", tipo: "dinero", esperado: 2162196.99, tolerancia: DINERO,
    obtenido: () => fin.pagoPerpetuidad(300000000, fin.efectivaAPeriodica(0.09, 12)) },

  // ----- Datos que no tienen sentido: deben dar NaN -----
  { grupo: "Datos inconsistentes", nombre: "4d · Cuota menor que el interés del periodo (5.3)", tipo: "periodos", esperado: NaN,
    obtenido: () => fin.nDesdeVPVencida(20000000, 200000, 0.012) },
  { grupo: "Datos inconsistentes", nombre: "Tasa de anualidad con A · n ≤ P", tipo: "tasa", esperado: NaN,
    obtenido: () => fin.tasaAnualidad(20000000, 500000, 36, "P", false) },
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
