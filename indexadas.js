/* indexadas.js
 * Módulo "Tasas indexadas" (sección 4 de la hoja de clase; docs/03-indexacion.md): una tasa
 * formada por un índice variable más unos puntos fijos.
 *   - DTF + puntos e IBR + puntos: indexación lineal (4.2). Solo se suman tasas de la misma
 *     forma: el índice se lleva primero a la forma de los puntos (por ejemplo, la DTF en
 *     efectiva anual a trimestre anticipado).
 *   - IPC + puntos y UVR + puntos: fórmula combinada (4.1), con los dos en efectiva anual.
 * El índice y los puntos pueden venir en cualquier forma (periódica, nominal o efectiva anual,
 * de cualquier periodo, vencida o anticipada); al elegir el índice se ponen las de costumbre.
 * Después, aparte, la tasa se convierte a efectiva anual y a otra periodicidad.
 * Los valores de los índices los escribe la persona: la app no los consulta en internet.
 */

(() => {
  const formulario = document.getElementById("form-indexadas");
  const marcado = (nombre) => formulario.querySelector(`input[name="${nombre}"]:checked`)?.value;

  const f = prepararFormulario(formulario, { claves: () => new Set([marcado("indice")]) });

  const EA = { tipo: "efectiva", m: 1, modalidad: "vencida" };
  const NTA = { tipo: "nominal", m: 4, modalidad: "anticipada" };
  const NMV = { tipo: "nominal", m: 12, modalidad: "vencida" };

  // Formas de costumbre de cada índice y de sus puntos (se pueden cambiar).
  const FORMAS = {
    DTF: { indice: EA, puntos: NTA },
    IBR: { indice: NMV, puntos: NMV },
    IPC: { indice: EA, puntos: EA },
    UVR: { indice: EA, puntos: EA },
  };

  // Una forma ({ tipo, m, modalidad }) como campos del formulario con ese prefijo.
  function camposDeForma(prefijo, forma) {
    const enPantalla = tipoEnPantalla(forma.tipo, forma.m);
    return { [`${prefijo}-tipo`]: enPantalla.tipo, [`${prefijo}-periodo`]: enPantalla.periodo, [`${prefijo}-modalidad`]: forma.modalidad };
  }

  // Al elegir el índice, el índice y los puntos toman sus formas de costumbre.
  function ponerFormasDe(indice) {
    escribirFormulario(formulario, { ...camposDeForma("indice", FORMAS[indice].indice), ...camposDeForma("puntos", FORMAS[indice].puntos) });
  }

  // Cálculos guardados antes de que el índice tuviera todas las formas ("forma-dtf", "plazo-ibr").
  formulario.adaptarDatos = (datos) => {
    if ("operacion" in datos) {
      const { operacion, sentido, unidades, pesos: enPesos, "valor-uvr": valorUvr, "uvr-inicial": inicial, "uvr-final": final, ...resto } = datos;
      datos = resto;
    }
    if (!("forma-dtf" in datos) && !("plazo-ibr" in datos)) return datos;
    const { "forma-dtf": formaDtf, "plazo-ibr": plazo, ...resto } = datos;
    if (datos.indice === "DTF" && formaDtf) Object.assign(resto, camposDeForma("indice", formaDtf === "TA" ? NTA : EA), camposDeForma("puntos", NTA));
    if (datos.indice === "IBR" && plazo) {
      const forma = { tipo: "nominal", m: Number(plazo), modalidad: "vencida" };
      Object.assign(resto, camposDeForma("indice", forma), camposDeForma("puntos", forma));
    }
    return resto;
  };

  const NOTAS = {
    DTF: "Promedio de las tasas de los CDT a 90 días. Se publica en efectiva anual; en los créditos los puntos se pactan sobre trimestre anticipado. Se indexa sumando (4.2).",
    IBR: "Tasa de referencia del mercado interbancario. Se publica nominal: a 1 mes, mes vencido; a 3 meses, trimestre vencido. Se indexa sumando (4.2).",
    IPC: "Variación de los precios al consumidor en 12 meses (la inflación), en efectiva anual. Se combina con los puntos (4.1).",
    UVR: "Unidad de valor que se ajusta cada día con la inflación. Se usa su variación anual, que se combina con los puntos (4.1).",
  };
  const ETIQUETAS = { DTF: "DTF", IBR: "IBR", IPC: "IPC (variación de 12 meses)", UVR: "Variación anual de la UVR" };
  const EJEMPLOS_INDICE = { DTF: "9,25", IBR: "9,1", IPC: "5,2", UVR: "5" };
  const AYUDAS_PUNTOS = {
    DTF: "En los créditos se pactan sobre trimestre anticipado. Si el ejercicio dice otra forma, cámbiala: la DTF se lleva a esa forma antes de sumar.",
    IBR: "De costumbre, en la misma forma del IBR. Si vienen en otra, cámbiala: el IBR se lleva a esa forma antes de sumar.",
    IPC: "Se combinan en efectiva anual: si los puntos vienen en otra forma, se convierten antes.",
    UVR: "Se combinan en efectiva anual: si los puntos vienen en otra forma, se convierten antes.",
  };

  function actualizarTextos() {
    const indice = marcado("indice");
    formulario.querySelector("[data-nota-indice]").textContent = NOTAS[indice];
    formulario.querySelector("[data-etiqueta-indice]").textContent = ETIQUETAS[indice];
    formulario.querySelector("[data-ayuda-puntos]").textContent = AYUDAS_PUNTOS[indice];
    formulario.elements["valor-indice"].placeholder = EJEMPLOS_INDICE[indice];
  }
  formulario.addEventListener("change", (evento) => {
    if (evento.target.name !== "indice") return;
    actualizarTextos();
    ponerFormasDe(evento.target.value);
  });
  actualizarTextos();
  ponerFormasDe(marcado("indice"));

  // Ejemplos de docs/03: DTF caso B, IBR ejemplo A, IPC + 4 y UVR.
  const EJEMPLOS = {
    DTF: { indice: "DTF", "valor-indice": "9,25", ...camposDeForma("indice", EA), puntos: "3", ...camposDeForma("puntos", NTA), convertir: "12" },
    IBR: { indice: "IBR", "valor-indice": "9,1", ...camposDeForma("indice", { tipo: "nominal", m: 4, modalidad: "vencida" }), puntos: "2,5", ...camposDeForma("puntos", { tipo: "nominal", m: 4, modalidad: "vencida" }), convertir: "12" },
    IPC: { indice: "IPC", "valor-indice": "5,2", puntos: "4", convertir: "12" },
    UVR: { indice: "UVR", "valor-indice": "5", puntos: "7", convertir: "12" },
  };

  const nombreDe = (indice) => (indice === "DTF" ? "la DTF" : indice === "IBR" ? "el IBR" : indice === "IPC" ? "el IPC" : "la UVR");

  // ----- Lectura y validación -----

  function leer() {
    f.limpiarErrores();
    const errores = {};
    const indice = f.marcado("indice");
    const d = { indice, m: Number(formulario.elements.convertir.value) };
    {
      d.valor = f.porcentaje("valor-indice", indice === "UVR" ? "la variación de la UVR" : `el valor de${indice === "DTF" ? " la DTF" : indice === "IBR" ? "l IBR" : "l IPC"}`, errores);
      const lectura = leerNumero(f.texto("puntos"));
      if (lectura.vacio) errores.puntos = "Faltan los puntos (el spread).";
      else if (lectura.error) errores.puntos = lectura.error;
      else if (lectura.valor < 0) errores.puntos = "Los puntos no pueden ser negativos.";
      else d.puntos = lectura.valor / 100;
      d.formaIndice = f.forma("indice");
      d.formaPuntos = f.forma("puntos");
      // Una tasa anticipada por periodo debe ser menor que 100 %.
      const porPeriodo = (valor, forma) => (forma.tipo === "nominal" ? nominalAPeriodica(valor, forma.m) : valor); // Hoja 1.1
      if (d.valor !== undefined && d.formaIndice.modalidad === "anticipada" && porPeriodo(d.valor, d.formaIndice) >= 1) errores["valor-indice"] = "Una tasa anticipada por periodo debe ser menor que 100 %.";
      if (d.puntos !== undefined && d.formaPuntos.modalidad === "anticipada" && porPeriodo(d.puntos, d.formaPuntos) >= 1) errores.puntos = "Una tasa anticipada por periodo debe ser menor que 100 %.";
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
    r.combinada = d.indice === "IPC" || d.indice === "UVR";
    // Convierte una tasa a otra forma; null si ya estaba en esa forma (no hay pasos).
    const llevar = (valor, desde, hacia) => {
      const conversion = convertirTasa({ valor, ...desde }, hacia); // Hojas 1.1 a 1.6, 3.1 y 3.2
      return conversion.pasos.length ? conversion : null;
    };
    if (r.combinada) {
      // La combinada se hace con los dos en efectiva anual.
      r.previa = llevar(d.valor, d.formaIndice, EA);
      r.previaPuntos = llevar(d.puntos, d.formaPuntos, EA);
      r.valorEA = r.previa ? r.previa.valor : d.valor;
      r.puntosEA = r.previaPuntos ? r.previaPuntos.valor : d.puntos;
      r.tasa = { valor: indexacionCombinada(r.valorEA, r.puntosEA), ...EA }; // Hoja 4.1
      r.lineal = r.valorEA + r.puntosEA; // lo que daría sumarlos (para comparar)
    } else {
      // Solo se suman tasas de la misma forma: el índice se lleva a la forma de los puntos.
      r.previa = llevar(d.valor, d.formaIndice, d.formaPuntos);
      r.indiceSumado = r.previa ? r.previa.valor : d.valor;
      r.tasa = { valor: indexacionLineal(r.indiceSumado, d.puntos), ...d.formaPuntos }; // Hoja 4.2
    }
    r.aAnual = convertirTasa(r.tasa, EA);
    r.ea = r.aAnual.valor;
    r.aDestino = d.m !== 1 ? convertirTasa({ valor: r.ea, ...EA }, { tipo: "efectiva", m: d.m, modalidad: "vencida" }) : null; // 1.6
    return r;
  }

  // ----- Presentación -----

  const formaDelIndice = (r) => r.formaIndice;

  function presentar(r) {
    const nombre = r.indice;
    const deIndice = `${porcentaje(r.valor)} ${describirForma(formaDelIndice(r))}`;
    const deTasa = describirForma(r.tasa);
    const anual = r.tasa.tipo === "efectiva" && r.tasa.m === 1;
    const pasos = [
      {
        titulo: "Datos",
        lineas: [`${nombre === "UVR" ? "Variación de la UVR" : nombre}: ${deIndice}`, `Puntos: ${porcentaje(r.puntos)} ${describirForma(r.formaPuntos)}`],
      },
    ];
    if (r.previa) pasos.push({ titulo: r.combinada ? `${nombre === "UVR" ? "La variación de la UVR" : nombre} a efectiva anual` : `${nombre} a la forma de los puntos`, lineas: lineasDeConversion(r.previa) });
    if (r.previaPuntos) pasos.push({ titulo: "Los puntos a efectiva anual", lineas: lineasDeConversion(r.previaPuntos) });
    if (r.combinada) {
      pasos.push({
        titulo: "Fórmula combinada",
        lineas: [
          `${insignia("4.1")}${formula(`${variable("i", "DX")} = (1 + ${variable("i", "1")}) · (1 + ${variable("i", "2")}) − 1`)}`,
          formula(`${variable("i", "DX")} = (1 + ${decimal(r.valorEA)}) · (1 + ${decimal(r.puntosEA)}) − 1 = ${decimal(r.tasa.valor)} = <strong>${porcentaje(r.tasa.valor)}</strong>`),
          `Sumándolos daría ${porcentaje(r.lineal)}: la diferencia, ${porcentaje(r.tasa.valor - r.lineal)}, es el interés del interés (${decimal(r.valorEA)} · ${decimal(r.puntosEA)}).`,
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

    // Cadena: el índice, sus conversiones (y las de los puntos), la suma o combinación y las
    // conversiones posteriores.
    let nodos = [{ tipo: "origen", etiqueta: nombre === "UVR" ? "Variación de la UVR" : nombre, valor: deIndice }];
    if (r.previa) nodos = nodos.concat(nodosDeConversion({}, r.formaIndice, r.previa).slice(1));
    if (r.previaPuntos) nodos = nodos.concat(nodosDeConversion({}, r.formaPuntos, r.previaPuntos).slice(1).map((nodo) => ({ ...nodo, nombre: `Puntos: ${nodo.nombre.charAt(0).toLowerCase()}${nodo.nombre.slice(1)}` })));
    if (r.combinada) {
      nodos.push({
        tipo: "combinada",
        formula: "4.1",
        nombre: `${nombre} combinado con los puntos`,
        a: { texto: nombre === "UVR" ? "UVR" : nombre },
        b: { texto: "pts" },
        expresion: `(1 + ${decimal(r.valorEA)}) · (1 + ${decimal(r.puntosEA)}) − 1`,
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

    const formulas = [...(r.previa?.pasos || []).map((paso) => paso.formula), ...(r.previaPuntos?.pasos || []).map((paso) => paso.formula), r.combinada ? "4.1" : "4.2", ...r.aAnual.pasos.map((paso) => paso.formula), ...(r.aDestino?.pasos || []).map((paso) => paso.formula)];
    const unicas = formulas.filter((formula, k) => formulas.indexOf(formula) === k);
    const extras = [["Efectiva anual", porcentaje(r.ea)]];
    extras.push(r.aDestino ? [mayuscula(r.p.nombreTasa), porcentaje(r.aDestino.valor)] : ["Forma de indexar", r.combinada ? "Combinada (4.1)" : "Suma (4.2)"]);
    let interpretacion;
    if (r.combinada) {
      interpretacion = `Con ${nombre === "UVR" ? "una variación de la UVR" : "un IPC"} de ${porcentaje(r.valorEA)} y ${porcentaje(r.puntosEA)} de puntos, en efectiva anual, la tasa es ${porcentaje(r.tasa.valor)} efectiva anual. Sumando daría ${porcentaje(r.lineal)}: ${formatoDos.format((r.tasa.valor - r.lineal) * 100)} puntos menos.`;
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
      fuente: `Fórmulas ${listaDeFormulas(unicas)}.`,
      resumen: `${nombre} ${deIndice} + ${porcentaje(r.puntos)} puntos`,
      visual: { tipo: "cadena", titulo: "Cómo se arma la tasa", descripcion: `Pasos para indexar ${nombreDe(nombre)}`, datos: { nodos, lectura: interpretacion } },
      explicacion: () => explicar(r, nodos),
    };
  }

  function explicar(r, nodos) {
    const pasos = [];
    const nombre = r.indice;
    const elIndice = nombreDe(nombre);
    let texto;
    if (r.combinada) {
      const base = nombre === "IPC" ? "El IPC es la inflación de los últimos 12 meses." : "La variación de la UVR sigue a la inflación.";
      const convertir = r.previa || r.previaPuntos ? ` Primero se pasa a efectiva anual ${r.previa && r.previaPuntos ? "cada uno" : r.previa ? elIndice : "los puntos"}.` : "";
      texto = `${base} Con los puntos no se suma: se combina, con los dos en efectiva anual.${convertir}`;
    } else if (r.previa) {
      texto = `${mayuscula(elIndice)} viene en ${describirForma(r.formaIndice)} y los puntos en ${describirForma(r.formaPuntos)}. Solo se suman tasas de la misma forma: primero se convierte ${elIndice}.`;
    } else {
      texto = `${mayuscula(elIndice)} y los puntos están en la misma forma, ${describirForma(r.formaPuntos)}: se suman directo.`;
    }
    pasos.push({ texto, vista: { paso: 0 } });
    const deLosPuntos = new Set(r.previaPuntos?.pasos || []);
    nodos.forEach((nodo, k) => {
      if (k === 0 || nodo.tipo === "resultado") return;
      if (nodo.tipo === "paso") {
        const paso = [...(r.previa?.pasos || []), ...(r.previaPuntos?.pasos || []), ...r.aAnual.pasos, ...(r.aDestino?.pasos || [])].find((otro) => expresionConversion(otro) === nodo.expresion);
        pasos.push({ texto: paso ? `${deLosPuntos.has(paso) ? "Los puntos: " : ""}${textoDeConversion(paso)}` : nodo.nombre, vista: { paso: k } });
      } else if (nodo.tipo === "suma") {
        pasos.push({ texto: `Ahora sí se suman: ${porcentaje(r.indiceSumado)} más ${porcentaje(r.puntos)} da ${porcentaje(r.tasa.valor)} ${describirForma(r.tasa)}.`, vista: { paso: k } });
      } else {
        pasos.push({
          texto: `(1 + ${porcentaje(r.valorEA)}) por (1 + ${porcentaje(r.puntosEA)}), menos 1, da ${porcentaje(r.tasa.valor)}. Es más que la suma, ${porcentaje(r.lineal)}: la esquina del cuadro es el interés del interés, ${porcentaje(r.tasa.valor - r.lineal)}.`,
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

  // ----- ¿Y si…?: mover los puntos o el índice -----

  function rangoDePorcentaje(valor) {
    const inicial = sinRuido(valor * 100);
    const maximo = Math.max(inicial * 3, inicial + 5);
    return { inicial, maximo, paso: pasoRedondo(maximo / 200, [0.01, 0.02, 0.05, 0.1, 0.25, 0.5]) };
  }

  const ysi = {
    variables: (r) => (r.puntos > 0 ? ["puntos", "indice"] : ["indice"]),
    nombre: (variable) => (variable === "puntos" ? "Puntos" : "Índice"),
    rango: (variable, r) => rangoDePorcentaje(variable === "puntos" ? r.puntos : r.valor),
    recalcular(o, variable, valor) {
      const r = resolver({ ...o, [variable === "puntos" ? "puntos" : "valor"]: valor / 100 });
      return Number.isFinite(r.ea) ? r : null;
    },
    presentar,
    texto: (variable, valor, r, corto) => (corto ? porcentaje(valor / 100) : `${porcentaje(valor / 100)} ${describirForma(variable === "puntos" ? r.formaPuntos : formaDelIndice(r))}`),
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
      return `La efectiva anual ${cambio}: la suma es lineal, pero al pasar a efectiva anual los intereses se capitalizan dentro del año.`;
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
      if (!Number.isFinite(r.ea)) {
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
      escribirFormulario(formulario, EJEMPLOS[marcado("indice")]);
    },
  });
})();
