/* conversion.js
 * Módulo "Conversión de tasas" (secciones 1 y 3 de la hoja de clase): lleva una tasa de
 * cualquier forma a cualquier otra con el procedimiento general de convertirTasa (finanzas.js),
 * pasando por la efectiva anual, y muestra cada paso con su número de fórmula en una cadena
 * animada (visuales.js).
 */

(() => {
  const formulario = document.getElementById("form-conversion");
  const f = prepararFormulario(formulario);
  formulario.querySelector('input[name="destino-tipo"][value="anual"]').checked = true; // por defecto, a efectiva anual: la que sirve para comparar
  f.actualizarPeriodosDeTasa();
  prepararSegmentados(formulario);

  // Ejemplo 2a de docs/02: 24 % nominal mes vencido a nominal trimestre anticipado.
  const EJEMPLO = {
    tasa: "24",
    "tasa-tipo": "nominal",
    "tasa-periodo": "12",
    "tasa-modalidad": "vencida",
    "destino-tipo": "nominal",
    "destino-periodo": "4",
    "destino-modalidad": "anticipada",
  };

  // Formas que se muestran en "Equivalencias".
  const EQUIVALENCIAS = [
    { tipo: "efectiva", m: 12, modalidad: "vencida" },
    { tipo: "efectiva", m: 4, modalidad: "vencida" },
    { tipo: "efectiva", m: 2, modalidad: "vencida" },
    { tipo: "efectiva", m: 1, modalidad: "vencida" },
    { tipo: "nominal", m: 12, modalidad: "vencida" },
    { tipo: "nominal", m: 12, modalidad: "anticipada" },
    { tipo: "nominal", m: 4, modalidad: "vencida" },
    { tipo: "nominal", m: 4, modalidad: "anticipada" },
    { tipo: "nominal", m: 2, modalidad: "vencida" },
  ];

  const efectivaAnual = (tasa) => convertirTasa(tasa, { tipo: "efectiva", m: 1, modalidad: "vencida" }).valor;

  // De nominal a efectiva anual (o al revés), los dos pasos del procedimiento general son la
  // fórmula directa de la hoja: 1.1 y 1.5 hacen la 1.3; 1.6 y 1.2, la 1.4.
  function formulaDirecta({ origen, conversion }) {
    const [primero, segundo] = conversion.pasos;
    const lista = conversion.pasos.map((paso) => paso.formula).join(" ");
    const e = decimal(origen.valor);
    if (lista === "1.1 1.5") {
      const m = primero.m;
      return {
        numero: "1.3",
        linea: `${insignia("1.3")}Nominal → efectiva anual, en un solo paso: ${formula(`${variable("i", "ea")} = (1 + ${variable("i", "n")} / ${variable("m")})<sup>${variable("m")}</sup> − 1 = (1 + ${e} / ${m})<sup>${m}</sup> − 1 = ${decimal(nominalAEfectiva(origen.valor, m))}`)}`,
      };
    }
    if (lista === "1.6 1.2") {
      const m = segundo.m;
      return {
        numero: "1.4",
        linea: `${insignia("1.4")}Efectiva anual → nominal, en un solo paso: ${formula(`${variable("i", "n")} = [(1 + ${variable("i", "ea")})<sup>1/${variable("m")}</sup> − 1] · ${variable("m")} = [(1 + ${e})<sup>1/${m}</sup> − 1] · ${m} = ${decimal(efectivaANominal(origen.valor, m))}`)}`,
      };
    }
    return null;
  }

  function resolver({ origen, destino }) {
    const conversion = convertirTasa(origen, destino); // Hojas 1.1 a 1.6, 3.1 y 3.2
    return { origen, destino, conversion, valor: conversion.valor, ea: efectivaAnual(origen) };
  }

  function presentar(r) {
    const { origen, destino, conversion, valor, ea } = r;
    const deOrigen = describirTasa(origen);
    const deDestino = describirForma(destino);
    const formulas = conversion.pasos.map((paso) => paso.formula);
    const directa = formulaDirecta(r);
    const pasos = [{ titulo: "Datos", lineas: [`Tasa que tienes: ${deOrigen}`, `Forma buscada: ${deDestino}`] }];
    if (formulas.length) {
      pasos.push({
        titulo: "Procedimiento general",
        lineas: [
          "Se pasa por la efectiva anual, solo con los pasos que hacen falta: 1.1 → 3.2 → 1.5 → 1.6 → 3.1 → 1.2.",
          ...lineasDeConversion(conversion),
          ...(directa ? [directa.linea] : []),
        ],
      });
    } else pasos.push({ titulo: "Conversión", lineas: ["La tasa ya está en la forma buscada: no hay nada que convertir."] });
    pasos.push({ titulo: "Resultado", lineas: [formula(`${variable("i")} = <strong>${porcentaje(valor)}</strong> ${deDestino}`)] });
    pasos.push({
      titulo: "Equivalencias",
      lineas: EQUIVALENCIAS.map((forma) => `${mayuscula(describirForma(forma))}: ${porcentaje(convertirTasa(origen, forma).valor)}`),
    });

    const nodos = nodosDeConversion({ tipo: "origen", etiqueta: "Tienes", valor: deOrigen }, origen, conversion);
    nodos.push({ tipo: "resultado", etiqueta: "Equivale a", valor: `${porcentaje(valor)} ${deDestino}` });

    return {
      modulo: "conversion-tasas",
      calculo: r,
      etiqueta: "Tasa equivalente",
      valor,
      formatear: porcentaje,
      tasa: { valor, ...destino }, // para usarla en otro módulo
      momento: deDestino,
      extras: [
        ["Tasa que tienes", deOrigen],
        ["Efectiva anual de las dos", porcentaje(ea)],
      ],
      interpretacion: formulas.length
        ? `${mayuscula(deOrigen)} equivale a ${porcentaje(valor)} ${deDestino}: las dos dan el mismo rendimiento en un año, ${porcentaje(ea)} efectivo anual.`
        : `La tasa ya está en esa forma: ${deOrigen}.`,
      pasos,
      numeroFormula: formulas.join(", ") || "—",
      fuente: formulas.length
        ? `${formulas.length > 1 ? "Fórmulas" : "Fórmula"} ${listaDeFormulas(formulas)}${directa ? ` (juntas, la ${directa.numero})` : ""}.`
        : "Sin conversión: la tasa ya estaba en esa forma.",
      resumen: `${deOrigen} → ${deDestino}`,
      visual: {
        tipo: "cadena",
        titulo: "Cadena de conversión",
        descripcion: `Pasos para convertir ${deOrigen} a ${deDestino}`,
        datos: { nodos, lectura: `${mayuscula(deOrigen)} = ${porcentaje(valor)} ${deDestino}` },
      },
      explicacion: () => explicar(r, nodos),
    };
  }

  // "Explícame": un paso por cada nodo de la cadena.
  function explicar(r, nodos) {
    const { origen, conversion, valor, ea } = r;
    const pasos = [
      {
        texto: `Tienes ${describirTasa(origen)}. Para llevarla a otra forma se usa un solo camino: pasar por la efectiva anual.`,
        vista: { paso: 0 },
      },
    ];
    conversion.pasos.forEach((paso, k) => pasos.push({ texto: textoDeConversion(paso), vista: { paso: k + 1 } }));
    const directa = formulaDirecta(r);
    pasos.push({
      texto: `Resultado: ${porcentaje(valor)} ${describirForma(r.destino)}.${directa ? ` Los dos pasos se pueden hacer en uno solo, ${directa.numero === "1.3" ? "de nominal a efectiva anual" : "de efectiva anual a nominal"}.` : ""} Todas las tasas de la cadena son equivalentes: dan ${porcentaje(ea)} efectivo anual.`,
      vista: { paso: nodos.length - 1 },
    });
    return pasos;
  }

  function leer() {
    f.limpiarErrores();
    const errores = {};
    const origen = f.tasa("tasa", errores);
    if (Object.keys(errores).length) {
      f.mostrarErrores(errores);
      return null;
    }
    return { origen, destino: f.forma("destino") };
  }

  const modulo = {
    id: "conversion-tasas",
    icono: "i-conversion",
    formulario,
    calcular() {
      const datos = leer();
      if (!datos) return null;
      const r = resolver(datos);
      if (!Number.isFinite(r.valor)) {
        f.mostrarErrorGeneral("Con esa tasa anticipada la conversión no existe. Revisa los datos.");
        return null;
      }
      return presentar(r);
    },
    limpiar() {
      f.vaciar();
      ocultarResultado();
    },
    ysi: {
      variables: () => ["tasa"],
      nombre: () => "Tasa que tienes",
      rango: (variable, r) => rangoDeTasa(r.origen),
      recalcular(o, variable, valor) {
        const r = resolver({ origen: { ...o.origen, valor: valor / 100 }, destino: o.destino });
        return Number.isFinite(r.valor) && Number.isFinite(r.ea) ? r : null;
      },
      presentar,
      texto: (variable, valor, r, corto) => (corto ? porcentaje(valor / 100) : describirTasa({ ...r.origen, valor: valor / 100 })),
      capturar: () => ({ tasa: f.texto("tasa") }),
      restaurar: (textos) => f.escribir("tasa", textos.tasa),
      escribir: (variable, valor) => f.escribir("tasa", textoDeEntrada(valor)),
      filas: (r, o) => [
        { nombre: "Tasa que tienes", valor: porcentaje(r.origen.valor), factor: r.origen.valor / o.origen.valor, clase: "" },
        { nombre: "Efectiva anual", valor: porcentaje(r.ea), factor: r.ea / o.ea, clase: "interes" },
      ],
      efecto(r, o, variable, sentido, [fila, anual]) {
        if (sentido === 0) return "Mueve el control: si la tasa se duplica, ¿se duplica la efectiva anual?";
        const comparacion = `(${factor(anual.factor)} contra ${factor(fila.factor)})`;
        if (Math.abs(anual.factor - fila.factor) < 0.005) return `La efectiva anual cambia en la misma proporción ${comparacion}: la tasa ya es anual y vencida.`;
        return sentido > 0
          ? `La efectiva anual crece más que la tasa ${comparacion}: dentro del año, los intereses de cada periodo también ganan intereses.`
          : `La efectiva anual baja más que la tasa ${comparacion}: dentro del año hay menos interés sobre interés.`;
      },
      nota: (r) => `Equivale a ${porcentaje(r.valor)} ${describirForma(r.destino)}.`,
    },
  };

  registrarModulo(modulo);
  conectarAcciones(modulo, { ejemplo: () => escribirFormulario(formulario, EJEMPLO) });
})();
