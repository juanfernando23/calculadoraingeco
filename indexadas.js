/* indexadas.js
 * Módulo "Tasas indexadas" (sección 4 de la hoja de clase; docs/03-indexacion.md): una tasa
 * formada por un índice variable más unos puntos fijos.
 *   - DTF + puntos e IBR + puntos: indexación lineal (4.2). Solo se suman tasas de la misma
 *     forma: la DTF en efectiva anual se lleva primero a trimestre anticipado, como los puntos.
 *   - IPC + puntos y UVR + puntos: fórmula combinada (4.1).
 *   - UVR: además, pesos ↔ UVR y la variación entre dos fechas (no está en la hoja).
 * Después, aparte, la tasa se convierte a efectiva anual y a otra periodicidad.
 * Los valores de los índices los escribe la persona: la app no los consulta en internet.
 */

(() => {
  const formulario = document.getElementById("form-indexadas");
  const marcado = (nombre) => formulario.querySelector(`input[name="${nombre}"]:checked`)?.value;

  // Qué campos se ven: el índice y, en la UVR, la operación (y el sentido de la conversión).
  function claves() {
    const indice = marcado("indice");
    const activas = new Set([indice]);
    if (indice === "UVR") {
      const operacion = marcado("operacion");
      activas.add(`UVR-${operacion}`);
      if (operacion === "pesos") activas.add(marcado("sentido"));
    }
    return activas;
  }

  const f = prepararFormulario(formulario, { claves });

  const EA = { tipo: "efectiva", m: 1, modalidad: "vencida" };
  const NTA = { tipo: "nominal", m: 4, modalidad: "anticipada" };

  const NOTAS = {
    DTF: "Promedio de las tasas de los CDT a 90 días. Se publica en efectiva anual; en los créditos los puntos se pactan sobre trimestre anticipado. Se indexa sumando (4.2).",
    IBR: "Tasa de referencia del mercado interbancario. Se publica nominal: a 1 mes, mes vencido; a 3 meses, trimestre vencido. Se indexa sumando (4.2).",
    IPC: "Variación de los precios al consumidor en 12 meses (la inflación), en efectiva anual. Se combina con los puntos (4.1).",
    UVR: "Unidad de valor que se ajusta cada día con la inflación. No es una tasa: es un valor en pesos por cada UVR.",
  };
  const ETIQUETAS = { DTF: "DTF", IBR: "IBR", IPC: "IPC (variación de 12 meses)", UVR: "Variación anual de la UVR" };
  const EJEMPLOS_INDICE = { DTF: "9,25", IBR: "9,1", IPC: "5,2", UVR: "5" };
  const AYUDAS_PUNTOS = {
    DTF: "Sobre trimestre anticipado, como se pactan en los créditos.",
    IBR: "En la misma forma del IBR (nominal vencida).",
    IPC: "En efectiva anual.",
    UVR: "En efectiva anual.",
  };

  function actualizarTextos() {
    const indice = marcado("indice");
    formulario.querySelector("[data-nota-indice]").textContent = NOTAS[indice];
    formulario.querySelector("[data-etiqueta-indice]").textContent = ETIQUETAS[indice];
    formulario.querySelector("[data-ayuda-puntos]").textContent = AYUDAS_PUNTOS[indice];
    formulario.elements["valor-indice"].placeholder = EJEMPLOS_INDICE[indice];
  }
  formulario.addEventListener("change", (evento) => evento.target.name === "indice" && actualizarTextos());
  actualizarTextos();

  // Ejemplos de docs/03: DTF caso B, IBR ejemplo A, IPC + 4 y UVR.
  const EJEMPLOS = {
    DTF: { indice: "DTF", "valor-indice": "9,25", "forma-dtf": "EA", puntos: "3", convertir: "12" },
    IBR: { indice: "IBR", "valor-indice": "9,1", "plazo-ibr": "4", puntos: "2,5", convertir: "12" },
    IPC: { indice: "IPC", "valor-indice": "5,2", puntos: "4", convertir: "12" },
    "UVR-costo": { indice: "UVR", operacion: "costo", "valor-indice": "5", puntos: "7", convertir: "12" },
    "UVR-pesos": { indice: "UVR", operacion: "pesos", sentido: "a-pesos", unidades: "50000", "valor-uvr": "380" },
    "UVR-variacion": { indice: "UVR", operacion: "variacion", "uvr-inicial": "370", "uvr-final": "388,5" },
  };

  const nombreDe = (indice) => (indice === "DTF" ? "la DTF" : indice === "IBR" ? "el IBR" : indice === "IPC" ? "el IPC" : "la UVR");
  const uvr = (x) => `${formatoEntero.format(x)} UVR`;
  const valorUVR = (x) => `$ ${formatoHastaCuatro.format(x)}`; // como se escribió: la UVR se publica con 4 decimales

  // ----- Lectura y validación -----

  function leer() {
    f.limpiarErrores();
    const errores = {};
    const indice = f.marcado("indice");
    const d = { indice, m: Number(formulario.elements.convertir.value) };
    if (indice === "UVR") d.operacion = f.marcado("operacion");
    if (indice !== "UVR" || d.operacion === "costo") {
      d.valor = f.porcentaje("valor-indice", indice === "UVR" ? "la variación de la UVR" : `el valor de${indice === "DTF" ? " la DTF" : indice === "IBR" ? "l IBR" : "l IPC"}`, errores);
      const lectura = leerNumero(f.texto("puntos"));
      if (lectura.vacio) errores.puntos = "Faltan los puntos (el spread).";
      else if (lectura.error) errores.puntos = lectura.error;
      else if (lectura.valor < 0) errores.puntos = "Los puntos no pueden ser negativos.";
      else d.puntos = lectura.valor / 100;
      if (indice === "DTF") d.forma = f.marcado("forma-dtf");
      if (indice === "IBR") d.plazo = Number(f.marcado("plazo-ibr"));
    } else if (d.operacion === "pesos") {
      d.sentido = f.marcado("sentido");
      if (d.sentido === "a-pesos") d.unidades = f.positivo("unidades", "Falta la cantidad de UVR.", "La cantidad de UVR debe ser mayor que cero.", errores);
      else d.pesos = f.dinero("pesos", "el valor en pesos", errores);
      d.valorUVR = f.positivo("valor-uvr", "Falta el valor de la UVR.", "El valor de la UVR debe ser mayor que cero.", errores);
    } else {
      d.inicial = f.positivo("uvr-inicial", "Falta la UVR al inicio.", "El valor de la UVR debe ser mayor que cero.", errores);
      d.final = f.positivo("uvr-final", "Falta la UVR al final.", "El valor de la UVR debe ser mayor que cero.", errores);
    }
    if (Object.keys(errores).length) {
      f.mostrarErrores(errores);
      return null;
    }
    return d;
  }

  // ----- Cálculo (solo fórmulas de finanzas.js) -----

  function resolver(d) {
    const r = { ...d, p: PERIODICIDADES[d.m] };
    if (d.indice === "UVR" && d.operacion === "pesos") {
      r.resultado = d.sentido === "a-pesos" ? uvrAPesos(d.unidades, d.valorUVR) : pesosAUvr(d.pesos, d.valorUVR);
      return r;
    }
    if (d.indice === "UVR" && d.operacion === "variacion") {
      r.resultado = variacionUvr(d.inicial, d.final);
      return r;
    }
    r.combinada = d.indice === "IPC" || d.indice === "UVR";
    if (d.indice === "DTF") {
      // Solo se suman tasas de la misma forma: la DTF en EA se lleva a trimestre anticipado.
      r.previa = d.forma === "EA" ? convertirTasa({ valor: d.valor, ...EA }, NTA) : null; // 1.6, 3.1 y 1.2
      r.indiceSumado = r.previa ? r.previa.valor : d.valor;
      r.tasa = { valor: indexacionLineal(r.indiceSumado, d.puntos), ...NTA }; // Hoja 4.2
    } else if (d.indice === "IBR") {
      r.indiceSumado = d.valor;
      r.tasa = { valor: indexacionLineal(d.valor, d.puntos), tipo: "nominal", m: d.plazo, modalidad: "vencida" }; // Hoja 4.2
    } else {
      r.tasa = { valor: indexacionCombinada(d.valor, d.puntos), ...EA }; // Hoja 4.1
      r.lineal = d.valor + d.puntos; // lo que daría sumarlos (para comparar)
    }
    r.aAnual = convertirTasa(r.tasa, EA);
    r.ea = r.aAnual.valor;
    r.aDestino = d.m !== 1 ? convertirTasa({ valor: r.ea, ...EA }, { tipo: "efectiva", m: d.m, modalidad: "vencida" }) : null; // 1.6
    return r;
  }

  // ----- Presentación -----

  const formaDelIndice = (r) => (r.indice === "DTF" ? (r.forma === "EA" ? EA : NTA) : r.indice === "IBR" ? { tipo: "nominal", m: r.plazo, modalidad: "vencida" } : EA);

  function presentar(r) {
    if (r.resultado !== undefined) return presentarUVR(r);
    const nombre = r.indice;
    const deIndice = `${porcentaje(r.valor)} ${describirForma(formaDelIndice(r))}`;
    const deTasa = describirForma(r.tasa);
    const anual = r.tasa.tipo === "efectiva" && r.tasa.m === 1;
    const pasos = [
      {
        titulo: "Datos",
        lineas: [`${nombre === "UVR" ? "Variación de la UVR" : nombre}: ${deIndice}`, `Puntos: ${porcentaje(r.puntos)}${nombre === "DTF" ? " sobre trimestre anticipado" : ""}`],
      },
    ];
    if (r.previa) pasos.push({ titulo: "La DTF a trimestre anticipado (la forma de los puntos)", lineas: lineasDeConversion(r.previa) });
    if (r.combinada) {
      pasos.push({
        titulo: "Fórmula combinada",
        lineas: [
          `${insignia("4.1")}${formula(`${variable("i", "DX")} = (1 + ${variable("i", "1")}) · (1 + ${variable("i", "2")}) − 1`)}`,
          formula(`${variable("i", "DX")} = (1 + ${decimal(r.valor)}) · (1 + ${decimal(r.puntos)}) − 1 = ${decimal(r.tasa.valor)} = <strong>${porcentaje(r.tasa.valor)}</strong>`),
          `Sumándolos daría ${porcentaje(r.lineal)}: la diferencia, ${porcentaje(r.tasa.valor - r.lineal)}, es el interés del interés (${decimal(r.valor)} · ${decimal(r.puntos)}).`,
        ],
      });
    } else {
      pasos.push({
        titulo: "Indexación lineal",
        lineas: [
          `${insignia("4.2")}${formula(`${variable("i", "DX")} = ${variable("I", "1")} + ${variable("I", "2")}`)}`,
          formula(`${variable("i", "DX")} = ${porcentaje(r.indiceSumado)} + ${porcentaje(r.puntos)} = <strong>${porcentaje(r.tasa.valor)}</strong> ${deTasa}`),
        ],
      });
    }
    if (r.aAnual.pasos.length) pasos.push({ titulo: "A efectiva anual", lineas: lineasDeConversion(r.aAnual) });
    if (r.aDestino) pasos.push({ titulo: `A ${r.p.nombreTasa}`, lineas: lineasDeConversion(r.aDestino) });

    // Cadena: el índice, su conversión (DTF en EA), la suma o combinación y las conversiones.
    let nodos = [{ tipo: "origen", etiqueta: nombre === "UVR" ? "Variación de la UVR" : nombre, valor: deIndice }];
    if (r.previa) nodos = nodos.concat(nodosDeConversion({}, EA, r.previa).slice(1));
    if (r.combinada) {
      nodos.push({
        tipo: "combinada",
        formula: "4.1",
        nombre: `${nombre} combinado con los puntos`,
        a: { texto: nombre === "UVR" ? "UVR" : nombre },
        b: { texto: "pts" },
        expresion: `(1 + ${decimal(r.valor)}) · (1 + ${decimal(r.puntos)}) − 1`,
        valor: `${porcentaje(r.tasa.valor)} ${deTasa}`,
        nota: `Sumando daría ${porcentaje(r.lineal)}: falta el interés del interés, ${porcentaje(r.tasa.valor - r.lineal)}.`,
      });
    } else {
      nodos.push({
        tipo: "suma",
        formula: "4.2",
        nombre: `${nombre} + puntos, en la misma forma`,
        partes: [
          { texto: nombre, valor: r.indiceSumado, etiqueta: porcentaje(r.indiceSumado) },
          { texto: "Puntos", valor: r.puntos, etiqueta: porcentaje(r.puntos) },
        ],
        expresion: `${porcentaje(r.indiceSumado)} + ${porcentaje(r.puntos)}`,
        valor: `${porcentaje(r.tasa.valor)} ${deTasa}`,
      });
    }
    nodos = nodos.concat(nodosDeConversion({}, r.tasa, r.aAnual).slice(1));
    if (r.aDestino) nodos = nodos.concat(nodosDeConversion({}, EA, r.aDestino).slice(1));
    nodos.push({ tipo: "resultado", etiqueta: "Tasa indexada", valor: anual ? `${porcentaje(r.ea)} efectiva anual` : `${porcentaje(r.tasa.valor)} ${deTasa} = ${porcentaje(r.ea)} efectiva anual` });

    const formulas = [...(r.previa?.pasos || []).map((paso) => paso.formula), r.combinada ? "4.1" : "4.2", ...r.aAnual.pasos.map((paso) => paso.formula), ...(r.aDestino?.pasos || []).map((paso) => paso.formula)];
    const unicas = formulas.filter((formula, k) => formulas.indexOf(formula) === k);
    const extras = [["Efectiva anual", porcentaje(r.ea)]];
    extras.push(r.aDestino ? [mayuscula(r.p.nombreTasa), porcentaje(r.aDestino.valor)] : ["Forma de indexar", r.combinada ? "Combinada (4.1)" : "Suma (4.2)"]);
    let interpretacion;
    if (r.combinada) {
      interpretacion = `Con ${nombre === "UVR" ? "una variación de la UVR" : "un IPC"} de ${porcentaje(r.valor)} y ${porcentaje(r.puntos)} de puntos, la tasa es ${porcentaje(r.tasa.valor)} efectiva anual. Sumando daría ${porcentaje(r.lineal)}: ${formatoDos.format((r.tasa.valor - r.lineal) * 100)} puntos menos.`;
    } else {
      interpretacion = `Con ${nombreDe(nombre)} en ${deIndice} y ${porcentaje(r.puntos)} de puntos, la tasa es ${porcentaje(r.tasa.valor)} ${deTasa}, que equivale a ${porcentaje(r.ea)} efectivo anual.`;
    }

    return {
      modulo: "tasas-indexadas",
      calculo: r,
      etiqueta: `Tasa indexada (${nombre} + puntos)`,
      valor: r.tasa.valor,
      formatear: porcentaje,
      tasa: r.tasa, // para usarla en otro módulo
      momento: anual ? "efectiva anual" : `${deTasa} · ${porcentaje(r.ea)} efectiva anual`,
      extras,
      interpretacion,
      pasos,
      numeroFormula: r.combinada ? "4.1" : "4.2",
      fuente: `Fórmulas ${listaDeFormulas(unicas)} de la hoja de clase.`,
      resumen: `${nombre} ${deIndice} + ${porcentaje(r.puntos)} puntos`,
      visual: { tipo: "cadena", titulo: "Cómo se arma la tasa", descripcion: `Pasos para indexar ${nombreDe(nombre)}`, datos: { nodos, lectura: interpretacion } },
      explicacion: () => explicar(r, nodos),
    };
  }

  function explicar(r, nodos) {
    const pasos = [];
    const nombre = r.indice;
    let texto;
    if (nombre === "DTF") {
      texto =
        r.forma === "EA"
          ? `La DTF viene en efectiva anual, pero los puntos se pactan sobre trimestre anticipado. Solo se suman tasas de la misma forma (fórmula 4.2): primero se convierte la DTF.`
          : `La DTF ya viene en trimestre anticipado, la misma forma de los puntos: se pueden sumar directo (fórmula 4.2).`;
    } else if (nombre === "IBR") texto = `El IBR a ${r.plazo === 12 ? "1 mes viene nominal mes vencido" : "3 meses viene nominal trimestre vencido"}, la misma forma de los puntos: se suman directo (fórmula 4.2).`;
    else if (nombre === "IPC") texto = "El IPC es la inflación de los últimos 12 meses, en efectiva anual. Con los puntos no se suma: se combina (fórmula 4.1).";
    else texto = "La variación de la UVR sigue a la inflación. Como el IPC, se combina con los puntos (fórmula 4.1).";
    pasos.push({ texto, vista: { paso: 0 } });
    nodos.forEach((nodo, k) => {
      if (k === 0 || nodo.tipo === "resultado") return;
      if (nodo.tipo === "paso") {
        const paso = [...(r.previa?.pasos || []), ...r.aAnual.pasos, ...(r.aDestino?.pasos || [])].find((otro) => expresionConversion(otro) === nodo.expresion);
        pasos.push({ texto: paso ? textoDeConversion(paso) : nodo.nombre, vista: { paso: k } });
      } else if (nodo.tipo === "suma") {
        pasos.push({ texto: `Ahora sí se suman (fórmula 4.2): ${porcentaje(r.indiceSumado)} más ${porcentaje(r.puntos)} da ${porcentaje(r.tasa.valor)} ${describirForma(r.tasa)}.`, vista: { paso: k } });
      } else {
        pasos.push({
          texto: `(1 + ${porcentaje(r.valor)}) por (1 + ${porcentaje(r.puntos)}), menos 1, da ${porcentaje(r.tasa.valor)} (fórmula 4.1). Es más que la suma, ${porcentaje(r.lineal)}: la esquina del cuadro es el interés del interés, ${porcentaje(r.tasa.valor - r.lineal)}.`,
          vista: { paso: k },
        });
      }
    });
    pasos.push({
      texto: `La tasa indexada es ${porcentaje(r.tasa.valor)} ${describirForma(r.tasa)}. Para compararla con otras, su efectiva anual es ${porcentaje(r.ea)}.`,
      vista: { paso: nodos.length - 1 },
    });
    return pasos;
  }

  // UVR: pesos ↔ UVR y variación (no están en la hoja de clase).
  function presentarUVR(r) {
    let v;
    if (r.operacion === "pesos") {
      const aPesos = r.sentido === "a-pesos";
      const expresion = aPesos ? `${formatoHastaCuatro.format(r.unidades)} · ${formatoHastaCuatro.format(r.valorUVR)}` : `${cifra(r.pesos)} / ${formatoHastaCuatro.format(r.valorUVR)}`;
      v = {
        etiqueta: aPesos ? "Valor en pesos" : "Valor en UVR",
        valor: r.resultado,
        formatear: aPesos ? pesos : uvr,
        momento: `con la UVR a ${valorUVR(r.valorUVR)}`,
        extras: [
          [aPesos ? "Unidades" : "Pesos", aPesos ? uvr(r.unidades) : pesos(r.pesos)],
          ["Valor de la UVR", valorUVR(r.valorUVR)],
        ],
        interpretacion: aPesos
          ? `${uvr(r.unidades)} valen ${pesos(r.resultado)} con la UVR a ${valorUVR(r.valorUVR)}. Si la UVR sube con la inflación, el saldo en pesos también sube.`
          : `${pesos(r.pesos)} equivalen a ${uvr(r.resultado)} con la UVR a ${valorUVR(r.valorUVR)}.`,
        pasos: [
          { titulo: "Datos", lineas: [aPesos ? `Unidades: ${uvr(r.unidades)}` : `Pesos: ${pesos(r.pesos)}`, `Valor de la UVR: ${valorUVR(r.valorUVR)} por UVR`] },
          {
            titulo: "Conversión (la UVR no está en la hoja de clase)",
            lineas: [
              formula(aPesos ? "Pesos = unidades de UVR · valor de la UVR" : "Unidades de UVR = pesos / valor de la UVR"),
              formula(`${expresion} = <strong>${aPesos ? pesos(r.resultado) : uvr(r.resultado)}</strong>`),
            ],
          },
        ],
        resumen: `${aPesos ? uvr(r.unidades) : pesos(r.pesos)} con la UVR a ${valorUVR(r.valorUVR)}`,
        nodos: [
          { tipo: "origen", etiqueta: "Tienes", valor: aPesos ? uvr(r.unidades) : pesos(r.pesos) },
          { tipo: "paso", formula: aPesos ? "×" : "÷", nombre: aPesos ? "UVR a pesos" : "Pesos a UVR", expresion, valor: aPesos ? pesos(r.resultado) : uvr(r.resultado) },
          { tipo: "resultado", etiqueta: "Equivale a", valor: aPesos ? pesos(r.resultado) : uvr(r.resultado) },
        ],
        textos: [
          "La UVR no es una tasa: es una unidad que vale cierta cantidad de pesos cada día.",
          aPesos ? "Para pasar a pesos se multiplica por el valor de la UVR de ese día." : "Para pasar a UVR se divide entre el valor de la UVR de ese día.",
          aPesos ? `Resultado: ${pesos(r.resultado)}.` : `Resultado: ${uvr(r.resultado)}.`,
        ],
      };
    } else {
      v = {
        etiqueta: "Variación de la UVR",
        valor: r.resultado,
        formatear: porcentaje,
        momento: `de ${valorUVR(r.inicial)} a ${valorUVR(r.final)}`,
        extras: [
          ["UVR al inicio", valorUVR(r.inicial)],
          ["UVR al final", valorUVR(r.final)],
        ],
        interpretacion: `La UVR pasó de ${valorUVR(r.inicial)} a ${valorUVR(r.final)}: subió ${porcentaje(r.resultado)}. Un saldo en UVR sube lo mismo en pesos.`,
        pasos: [
          { titulo: "Datos", lineas: [`UVR al inicio: ${valorUVR(r.inicial)}`, `UVR al final: ${valorUVR(r.final)}`] },
          {
            titulo: "Variación (no está en la hoja de clase)",
            lineas: [formula("Variación = UVR final / UVR inicial − 1"), formula(`${formatoHastaCuatro.format(r.final)} / ${formatoHastaCuatro.format(r.inicial)} − 1 = <strong>${porcentaje(r.resultado)}</strong>`)],
          },
        ],
        resumen: `UVR de ${valorUVR(r.inicial)} a ${valorUVR(r.final)}`,
        nodos: [
          { tipo: "origen", etiqueta: "UVR al inicio", valor: valorUVR(r.inicial) },
          { tipo: "paso", formula: "÷", nombre: "Final entre inicial, menos 1", expresion: `${formatoHastaCuatro.format(r.final)} / ${formatoHastaCuatro.format(r.inicial)} − 1`, valor: porcentaje(r.resultado) },
          { tipo: "resultado", etiqueta: "Variación", valor: porcentaje(r.resultado) },
        ],
        textos: [
          "La UVR cambia cada día con la inflación. Para saber cuánto subió entre dos fechas se compara el valor final con el inicial.",
          `${formatoHastaCuatro.format(r.final)} entre ${formatoHastaCuatro.format(r.inicial)}, menos 1, da ${porcentaje(r.resultado)}.`,
          `La UVR subió ${porcentaje(r.resultado)}: un saldo en UVR sube eso mismo en pesos.`,
        ],
      };
    }
    const { nodos, textos, ...resto } = v;
    return {
      ...resto,
      modulo: "tasas-indexadas",
      calculo: r,
      numeroFormula: "UVR",
      fuente: "La UVR no está en la hoja de clase.",
      visual: { tipo: "cadena", titulo: "Cómo se calcula", descripcion: "Pasos con la UVR", datos: { nodos, lectura: v.interpretacion } },
      explicacion: () => textos.map((texto, k) => ({ texto, vista: { paso: k === 0 ? 0 : k === 1 ? 1 : nodos.length - 1 } })),
    };
  }

  // ----- ¿Y si…?: mover los puntos o el índice -----

  function rangoDePorcentaje(valor) {
    const inicial = sinRuido(valor * 100);
    const maximo = Math.max(inicial * 3, inicial + 5);
    return { inicial, maximo, paso: pasoRedondo(maximo / 200, [0.01, 0.02, 0.05, 0.1, 0.25, 0.5]) };
  }

  const ysi = {
    variables: (r) => (r.resultado !== undefined ? [] : r.puntos > 0 ? ["puntos", "indice"] : ["indice"]),
    nombre: (variable) => (variable === "puntos" ? "Puntos" : "Índice"),
    rango: (variable, r) => rangoDePorcentaje(variable === "puntos" ? r.puntos : r.valor),
    recalcular(o, variable, valor) {
      const r = resolver({ ...o, [variable === "puntos" ? "puntos" : "valor"]: valor / 100 });
      return Number.isFinite(r.ea) ? r : null;
    },
    presentar,
    texto: (variable, valor, r, corto) => (corto || variable === "puntos" ? porcentaje(valor / 100) : `${porcentaje(valor / 100)} ${describirForma(formaDelIndice(r))}`),
    capturar: () => ({ puntos: f.texto("puntos"), indice: f.texto("valor-indice") }),
    restaurar(textos) {
      f.escribir("puntos", textos.puntos);
      f.escribir("valor-indice", textos.indice);
    },
    escribir: (variable, valor) => f.escribir(variable === "puntos" ? "puntos" : "valor-indice", textoDeEntrada(valor)),
    filas: (r, o, variable) => [
      variable === "puntos"
        ? { nombre: "Puntos", valor: porcentaje(r.puntos), factor: r.puntos / o.puntos, clase: "" }
        : { nombre: r.indice === "UVR" ? "Variación de la UVR" : r.indice, valor: porcentaje(r.valor), factor: r.valor / o.valor, clase: "" },
      { nombre: "Efectiva anual", valor: porcentaje(r.ea), factor: r.ea / o.ea, clase: "interes" },
    ],
    efecto(r, o, variable, sentido) {
      if (sentido === 0) return `Mueve el control: ¿cuánto cambia la tasa efectiva anual con ${variable === "puntos" ? "más o menos puntos" : `otro valor de ${nombreDe(r.indice)}`}?`;
      const cambio = `${sentido > 0 ? "sube" : "baja"} ${formatoDos.format(Math.abs(r.ea - o.ea) * 100)} puntos`;
      if (r.combinada) return `La efectiva anual ${cambio}: el índice y los puntos se combinan, así que además de sumarse, cada uno gana sobre el otro (el interés del interés).`;
      return `La efectiva anual ${cambio}: la suma es lineal (4.2), pero al pasar a efectiva anual los intereses se capitalizan dentro del año.`;
    },
    nota: (r) => `Tasa indexada: ${porcentaje(r.tasa.valor)} ${describirForma(r.tasa)}.`,
  };

  const modulo = {
    id: "tasas-indexadas",
    icono: "i-indexadas",
    formulario,
    calcular() {
      const d = leer();
      if (!d) return null;
      const r = resolver(d);
      const resultado = r.resultado ?? r.ea;
      if (!Number.isFinite(resultado)) {
        f.mostrarErrorGeneral("Con estos datos la tasa no existe. Revisa los valores.");
        return null;
      }
      return presentar(r);
    },
    limpiar() {
      f.vaciar();
      ocultarResultado();
    },
    ysi,
  };

  registrarModulo(modulo);
  conectarAcciones(modulo, {
    ejemplo() {
      const indice = marcado("indice");
      const clave = indice === "UVR" ? `UVR-${marcado("operacion")}` : indice;
      escribirFormulario(formulario, EJEMPLOS[clave]);
    },
  });
})();
