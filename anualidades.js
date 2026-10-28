/* anualidades.js
 * Módulos de anualidades (secciones 5, 6 y 7 de la hoja de clase):
 *   - Anualidad vencida (pagos al final de cada periodo) y anticipada (al inicio): comparten
 *     pantalla y formulario; cambian las fórmulas (5.x o 6.x) y dónde caen los pagos.
 *     Incógnitas: P, F, A, n y la tasa i (extra: por bisección, no está en la hoja).
 *   - Anualidad perpetua: P = A / i (capital requerido) o A = P · i (pago sostenible).
 * La tasa se convierte primero a la efectiva del periodo de pago (requisito e).
 * Diagrama: diagramas.js (flujo de caja con cada pago y lo que vale cada pago).
 */

(() => {
  const EFECTIVA = (m) => ({ tipo: "efectiva", m, modalidad: "vencida" });
  const pagos = (n) => `${cantidadPeriodos(n)} ${esEntero(n) && Math.round(n) === 1 ? "pago" : "pagos"}`;
  const lineasNumeros = (lineas) => ({ titulo: "Con los números", lineas: lineas.map((linea) => formula(linea)) });
  const potencia = (base, exponente) => `${base}<sup>${exponente}</sup>`;

  // ===================== Vencida y anticipada =====================

  const formulario = document.getElementById("form-anualidad");
  const marcado = (nombre) => formulario.querySelector(`input[name="${nombre}"]:checked`)?.value;
  const claves = () => new Set([marcado("incognita"), `${marcado("incognita")}-${marcado("desde")}`]);
  const f = prepararFormulario(formulario, { claves });
  const periodo = () => Number(formulario.elements["periodo-pagos"].value);
  const visible = (nombre) => !formulario.elements[nombre].closest("[inert]");
  let anticipada = false; // lo decide la ruta (#anualidad-vencida o #anualidad-anticipada)

  const traducir = (animar = true) => f.traducir("tasa", periodo(), animar);
  formulario.addEventListener("input", (evento) => evento.target.name === "tasa" && traducir(false));
  formulario.addEventListener("change", () => traducir());
  traducir(false);

  // Ejemplos de docs/02 (4a a 4f y 5a a 5c), todos con tasa periódica mensual y pagos mensuales.
  const tasaMensual = (valor) => ({ tasa: valor, "tasa-tipo": "periodica", "tasa-periodo": "12", "tasa-modalidad": "vencida", "periodo-pagos": "12" });
  const EJEMPLOS = {
    vencida: {
      P: { A: "1500000", n: "12", ...tasaMensual("1") },
      F: { A: "500000", n: "24", ...tasaMensual("0,8") },
      "A-P": { desde: "P", P: "20000000", n: "36", ...tasaMensual("1,2") },
      "A-F": { desde: "F", F: "13171577,56", n: "24", ...tasaMensual("0,8") },
      "n-P": { desde: "P", P: "20000000", A: "800000", ...tasaMensual("1,2") },
      "n-F": { desde: "F", F: "13171577,56", A: "500000", ...tasaMensual("0,8") },
      "i-P": { desde: "P", P: "20000000", A: "700000", n: "36", "periodo-pagos": "12" },
      "i-F": { desde: "F", F: "13171577,56", A: "500000", n: "24", "periodo-pagos": "12" },
    },
    anticipada: {
      P: { A: "1500000", n: "12", ...tasaMensual("1") },
      F: { A: "500000", n: "24", ...tasaMensual("0,8") },
      "A-P": { desde: "P", P: "20000000", n: "36", ...tasaMensual("1,2") },
      "A-F": { desde: "F", F: "13276950,18", n: "24", ...tasaMensual("0,8") },
      "n-P": { desde: "P", P: "17051442,37", A: "1500000", ...tasaMensual("1") },
      "n-F": { desde: "F", F: "13276950,18", A: "500000", ...tasaMensual("0,8") },
      "i-P": { desde: "P", P: "20000000", A: "679293,04", n: "36", "periodo-pagos": "12" },
      "i-F": { desde: "F", F: "13276950,18", A: "500000", n: "24", "periodo-pagos": "12" },
    },
  };

  function cargarEjemplo() {
    const incognita = marcado("incognita");
    const clave = incognita === "P" || incognita === "F" ? incognita : `${incognita}-${marcado("desde")}`;
    f.vaciar();
    escribirFormulario(formulario, EJEMPLOS[anticipada ? "anticipada" : "vencida"][clave]);
    traducir(false);
  }

  // ----- Lectura y validación (catálogo de docs/04) -----

  function leer(esAnticipada) {
    f.limpiarErrores();
    const errores = {};
    const incognita = f.incognita();
    const desde = incognita === "P" || incognita === "F" ? incognita : f.marcado("desde");
    const d = { incognita, desde, m: periodo(), anticipada: esAnticipada };
    if (visible("P")) d.P = f.dinero("P", "el valor presente", errores);
    if (visible("F")) d.F = f.dinero("F", "el valor futuro", errores);
    if (visible("A")) d.A = f.dinero("A", "la cuota", errores);
    if (visible("tasa")) d.tasa = f.tasa("tasa", errores);
    if (visible("n")) d.n = f.positivo("n", "Falta el número de pagos (n).", "El número de pagos debe ser mayor que cero.", errores);
    if (d.n !== undefined && !esEntero(d.n)) errores.n = "El número de pagos debe ser entero: cada pago corresponde a un periodo completo.";
    if (!Object.keys(errores).length) {
      const i = incognita === "i" ? null : convertirTasa(d.tasa, EFECTIVA(d.m)).valor;
      if (incognita === "n" && desde === "P") {
        const cubre = esAnticipada ? d.A * (1 + i) : d.A; // 5.3 y 6.3 solo existen si la cuota cubre el interés
        if (!(cubre > d.P * i)) {
          const interes = esAnticipada ? (d.P * i) / (1 + i) : d.P * i;
          errores.A = `La cuota (${pesos(d.A)}) no alcanza a cubrir el interés de cada periodo (${pesos(interes)}). La deuda nunca se terminaría de pagar.`;
        }
      }
      if (incognita === "i" && desde === "P" && !(d.A * d.n > d.P)) errores.A = "Con estos datos la tasa sería cero o negativa: la suma de las cuotas no supera el valor presente.";
      if (incognita === "i" && desde === "F" && !(d.F > d.A * d.n)) errores.A = "Con estos datos la tasa sería cero o negativa: la suma de las cuotas ya alcanza el valor futuro.";
    }
    if (Object.keys(errores).length) {
      f.mostrarErrores(errores);
      return null;
    }
    return d;
  }

  // ----- Cálculo: solo fórmulas de finanzas.js -----

  function resolver(d) {
    const r = { ...d, p: PERIODICIDADES[d.m], conversion: null };
    if (d.incognita !== "i") {
      r.conversion = convertirTasa(d.tasa, EFECTIVA(d.m));
      r.i = r.conversion.valor;
    }
    const a = d.anticipada;
    switch (d.incognita) {
      case "P":
        r.P = a ? vpAnualidadAnticipada(r.A, r.i, r.n) : vpAnualidadVencida(r.A, r.i, r.n); // 6.1 / 5.1
        break;
      case "F":
        r.F = a ? vfAnualidadAnticipada(r.A, r.i, r.n) : vfAnualidadVencida(r.A, r.i, r.n); // 6.2 / 5.2
        break;
      case "A":
        if (d.desde === "P") r.A = a ? cuotaDesdeVPAnticipada(r.P, r.i, r.n) : cuotaDesdeVPVencida(r.P, r.i, r.n); // 6.1 / 5.1
        else r.A = a ? cuotaDesdeVFAnticipada(r.F, r.i, r.n) : cuotaDesdeVFVencida(r.F, r.i, r.n); // despeje de 6.2 / 5.2
        break;
      case "n":
        if (d.desde === "P") r.n = a ? nDesdeVPAnticipada(r.P, r.A, r.i) : nDesdeVPVencida(r.P, r.A, r.i); // 6.3 / 5.3
        else r.n = a ? nDesdeVFAnticipada(r.F, r.A, r.i) : nDesdeVFVencida(r.F, r.A, r.i); // 6.3 / 5.3
        break;
      default:
        r.i = tasaAnualidad(d.desde === "P" ? r.P : r.F, r.A, r.n, d.desde, a); // extra: bisección
    }
    r.calculado = d.incognita === "i" ? r.i : r[d.incognita];
    return r;
  }

  const valido = (r) => Number.isFinite(r.calculado) && r.calculado > 0 && r.calculado < 1e15 && Number.isFinite(r.i) && r.i > 0 && (r.incognita !== "n" || r.n <= 2000);

  // ----- Fórmulas de la hoja y sustitución con los números -----

  function formulaDe(r) {
    const a = r.anticipada;
    const [P, F, A, i, n] = ["P", "F", "A", "i", "n"].map((letra) => variable(letra));
    const uno = `(1 + ${i})`;
    const anualVP = (exp) => `[(${potencia(uno, exp)} − 1) / (${i} · ${potencia(uno, exp)})]`;
    switch (r.incognita) {
      case "P":
        return a ? { numero: "6.1", html: `${P} = ${A} + ${A} · ${anualVP(`${n}−1`)}` } : { numero: "5.1", html: `${P} = ${A} · ${anualVP(n)}` };
      case "F":
        return a ? { numero: "6.2", html: `${F} = ${A} · [(${potencia(uno, `${n}+1`)} − ${uno}) / ${i}]` } : { numero: "5.2", html: `${F} = ${A} · [(${potencia(uno, n)} − 1) / ${i}]` };
      case "A":
        if (r.desde === "P") return a ? { numero: "6.1", html: `${A} = ${P} / {1 + ${anualVP(`${n}−1`)}}` } : { numero: "5.1", html: `${A} = ${P} · [(${i} · ${potencia(uno, n)}) / (${potencia(uno, n)} − 1)]` };
        return a ? { numero: "6.2 (despeje)", html: `${A} = ${F} · ${i} / [${potencia(uno, `${n}+1`)} − ${uno}]` } : { numero: "5.2", html: `${A} = ${F} · [${i} / (${potencia(uno, n)} − 1)]` };
      case "n":
        if (r.desde === "P") return a ? { numero: "6.3", html: `${n} = −ln(1 − ${variable("VP")} · ${i} / (${A} · ${uno})) / ln${uno}` } : { numero: "5.3", html: `${n} = −ln(1 − ${variable("VP")} · ${i} / ${A}) / ln${uno}` };
        return a ? { numero: "6.3", html: `${n} = ln(${variable("VF")} · ${i} / (${A} · ${uno}) + 1) / ln${uno}` } : { numero: "5.3", html: `${n} = ln(${variable("VF")} · ${i} / ${A} + 1) / ln${uno}` };
      default: {
        const base = formulaDe({ ...r, incognita: r.desde });
        return { numero: "extra", html: base.html, base: base.numero };
      }
    }
  }

  // La fórmula con los números, línea por línea, hasta el resultado.
  function sustitucion(r) {
    const { P, F, A, i, n } = r;
    const b = decimal(1 + i);
    const e = exponente(n);
    const fn = Math.pow(1 + i, n);
    const g = Math.pow(1 + i, n - 1);
    const h = Math.pow(1 + i, n + 1);
    const a = r.anticipada;
    switch (r.incognita) {
      case "P":
        if (a) {
          const factorP = (g - 1) / (i * g);
          return [
            `${variable("P")} = ${cifra(A)} + ${cifra(A)} · [(${potencia(b, exponente(n - 1))} − 1) / (${decimal(i)} · ${potencia(b, exponente(n - 1))})]`,
            `${variable("P")} = ${cifra(A)} + ${cifra(A)} · ${decimal(factorP)}`,
            `${variable("P")} = <strong>${pesos(P)}</strong>`,
          ];
        }
        return [
          `${variable("P")} = ${cifra(A)} · [(${potencia(b, e)} − 1) / (${decimal(i)} · ${potencia(b, e)})]`,
          `${variable("P")} = ${cifra(A)} · [(${decimal(fn)} − 1) / (${decimal(i)} · ${decimal(fn)})]`,
          `${variable("P")} = ${cifra(A)} · ${decimal((fn - 1) / (i * fn))}`,
          `${variable("P")} = <strong>${pesos(P)}</strong>`,
        ];
      case "F":
        if (a) {
          return [
            `${variable("F")} = ${cifra(A)} · [(${potencia(b, exponente(n + 1))} − ${b}) / ${decimal(i)}]`,
            `${variable("F")} = ${cifra(A)} · ${decimal((h - (1 + i)) / i)}`,
            `${variable("F")} = <strong>${pesos(F)}</strong>`,
          ];
        }
        return [
          `${variable("F")} = ${cifra(A)} · [(${potencia(b, e)} − 1) / ${decimal(i)}]`,
          `${variable("F")} = ${cifra(A)} · [(${decimal(fn)} − 1) / ${decimal(i)}]`,
          `${variable("F")} = ${cifra(A)} · ${decimal((fn - 1) / i)}`,
          `${variable("F")} = <strong>${pesos(F)}</strong>`,
        ];
      case "A":
        if (r.desde === "P") {
          if (a) {
            const factorP = (g - 1) / (i * g);
            return [
              `${variable("A")} = ${cifra(P)} / {1 + [(${potencia(b, exponente(n - 1))} − 1) / (${decimal(i)} · ${potencia(b, exponente(n - 1))})]}`,
              `${variable("A")} = ${cifra(P)} / (1 + ${decimal(factorP)})`,
              `${variable("A")} = <strong>${pesos(A)}</strong>`,
            ];
          }
          return [
            `${variable("A")} = ${cifra(P)} · [(${decimal(i)} · ${potencia(b, e)}) / (${potencia(b, e)} − 1)]`,
            `${variable("A")} = ${cifra(P)} · ${decimal((i * fn) / (fn - 1))}`,
            `${variable("A")} = <strong>${pesos(A)}</strong>`,
          ];
        }
        if (a) {
          return [
            `${variable("A")} = ${cifra(F)} · ${decimal(i)} / [${potencia(b, exponente(n + 1))} − ${b}]`,
            `${variable("A")} = ${cifra(F)} · ${decimal(i / (h - (1 + i)))}`,
            `${variable("A")} = <strong>${pesos(A)}</strong>`,
          ];
        }
        return [
          `${variable("A")} = ${cifra(F)} · [${decimal(i)} / (${potencia(b, e)} − 1)]`,
          `${variable("A")} = ${cifra(F)} · ${decimal(i / (fn - 1))}`,
          `${variable("A")} = <strong>${pesos(A)}</strong>`,
        ];
      case "n": {
        const ln = decimal(Math.log(1 + i));
        if (r.desde === "P") {
          const x = a ? 1 - (P * i) / (A * (1 + i)) : 1 - (P * i) / A;
          return [
            a ? `${variable("n")} = −ln(1 − ${cifra(P)} · ${decimal(i)} / (${cifra(A)} · ${b})) / ln(${b})` : `${variable("n")} = −ln(1 − ${cifra(P)} · ${decimal(i)} / ${cifra(A)}) / ln(${b})`,
            `${variable("n")} = −ln(${decimal(x)}) / ${ln}`,
            `${variable("n")} = <strong>${pagos(n)}</strong>`,
          ];
        }
        const x = a ? (F * i) / (A * (1 + i)) + 1 : (F * i) / A + 1;
        return [
          a ? `${variable("n")} = ln(${cifra(F)} · ${decimal(i)} / (${cifra(A)} · ${b}) + 1) / ln(${b})` : `${variable("n")} = ln(${cifra(F)} · ${decimal(i)} / ${cifra(A)} + 1) / ln(${b})`,
          `${variable("n")} = ln(${decimal(x)}) / ${ln}`,
          `${variable("n")} = <strong>${pagos(n)}</strong>`,
        ];
      }
      default: {
        const conTasa = sustitucion({ ...r, incognita: r.desde });
        return [`Con ${variable("i")} = ${decimal(i)}:`, ...conTasa.slice(0, 1), `= ${pesos(r.desde === "P" ? P : F)}, igual al dato: la tasa es <strong>${porcentaje(i)}</strong>`];
      }
    }
  }

  // ----- Presentación -----

  function presentar(calculo) {
    // Con datos redondeados a centavos, n puede dar 23,99999999: si a 4 decimales es entero, es entero.
    const r = calculo.incognita === "n" && Math.abs(calculo.n - Math.round(calculo.n)) < 5e-5 ? { ...calculo, n: Math.round(calculo.n) } : calculo;
    const { P, F, A, i, n, p } = r;
    const a = r.anticipada;
    const cuando = a ? "al inicio" : "al final";
    const nombreModulo = a ? "anualidad-anticipada" : "anualidad-vencida";
    const total = A * n;
    const pasos = [];
    const datos = [];
    if (r.incognita !== "P" && r.desde === "P") datos.push(`Valor presente: ${formula(`${variable("P")} = ${pesos(P)}`)}`);
    if (r.incognita !== "F" && r.desde === "F") datos.push(`Valor futuro: ${formula(`${variable("F")} = ${pesos(F)}`)}`);
    if (r.incognita !== "A") datos.push(`Cuota: ${formula(`${variable("A")} = ${pesos(A)}`)} ${cuando} de cada ${p.singular}`);
    if (r.incognita !== "i") datos.push(`Tasa: ${describirTasa(r.tasa)}`);
    if (r.incognita !== "n") datos.push(`Pagos: ${formula(`${variable("n")} = ${pagos(n)}`)} ${a ? "anticipados" : "vencidos"}, uno cada ${p.singular}`);
    pasos.push({ titulo: "Datos", lineas: datos });
    if (r.incognita !== "i") pasos.push(pasoDeTasa(r.tasa, r.conversion, p));
    const formulaUsada = formulaDe(r);
    if (r.incognita === "i") {
      pasos.push({
        titulo: "Método numérico (no está en la hoja)",
        lineas: [
          `La tasa no tiene despeje. Se usa la fórmula ${insignia(formulaUsada.base)}${formula(formulaUsada.html)}`,
          "y se prueba con tasas cada vez más cercanas (bisección): si el resultado se pasa, la tasa baja; si no alcanza, sube.",
        ],
      });
    } else pasos.push({ titulo: "Fórmula de la hoja de clase", lineas: [`${insignia(formulaUsada.numero)}${formula(formulaUsada.html)}`] });
    pasos.push(lineasNumeros(sustitucion(r)));

    let v;
    switch (r.incognita) {
      case "P":
        v = {
          etiqueta: "Valor presente (P)",
          valor: P,
          formatear: pesos,
          momento: a ? "hoy, el día del primer pago" : "hoy, un periodo antes del primer pago",
          extras: [["Suma de los pagos", pesos(total)], ["Intereses", pesos(total - P)]],
          interpretacion: `${pagos(n)} de ${pesos(A)} ${cuando} de cada ${p.singular}, a ${porcentaje(i)} ${p.nombreTasa}, equivalen hoy a ${pesos(P)}.`,
        };
        break;
      case "F":
        v = {
          etiqueta: "Valor futuro (F)",
          valor: F,
          formatear: pesos,
          momento: a ? `al final del ${p.singular} ${cantidadPeriodos(n)}, un periodo después del último pago` : `al final del ${p.singular} ${cantidadPeriodos(n)}, con el último pago`,
          extras: [["Suma de los pagos", pesos(total)], ["Intereses ganados", pesos(F - total)]],
          interpretacion: `Con ${pagos(n)} de ${pesos(A)} ${cuando} de cada ${p.singular}, a ${porcentaje(i)} ${p.nombreTasa}, al final se reúnen ${pesos(F)}.`,
        };
        break;
      case "A":
        v = {
          etiqueta: "Cuota (A)",
          valor: A,
          formatear: pesos,
          momento: `${cuando} de cada ${p.singular}, ${pagos(n)}`,
          extras:
            r.desde === "P"
              ? [["Total pagado", pesos(total)], ["Intereses", pesos(total - P)]]
              : [["Total aportado", pesos(total)], ["Intereses ganados", pesos(F - total)]],
          interpretacion:
            r.desde === "P"
              ? `Para pagar ${pesos(P)} en ${pagos(n)} ${cuando} de cada ${p.singular}, a ${porcentaje(i)} ${p.nombreTasa}, cada cuota es de ${pesos(A)}.`
              : `Para reunir ${pesos(F)} con ${pagos(n)} ${cuando} de cada ${p.singular}, a ${porcentaje(i)} ${p.nombreTasa}, cada pago es de ${pesos(A)}.`,
        };
        break;
      case "n": {
        const entero = esEntero(n);
        const completos = Math.floor(n + 1e-9);
        v = {
          etiqueta: "Número de pagos (n)",
          valor: n,
          formatear: pagos,
          momento: entero ? `${pagos(n)} de ${pesos(A)}` : `${pagos(completos)} completos y uno final menor`,
          extras: [["Pagos completos", cifra(completos)], ["En años", `${formatoDos.format(n / r.m)} años`]],
          interpretacion: entero
            ? `Con cuotas de ${pesos(A)} ${cuando} de cada ${p.singular} hacen falta ${pagos(n)}.`
            : `Hacen falta ${pagos(n)}: ${pagos(completos)} de ${pesos(A)} y un pago ${completos + 1} menor para terminar.`,
        };
        break;
      }
      default: {
        const anual = periodicaAEfectiva(i, r.m); // Hoja 1.5
        v = {
          etiqueta: "Tasa de interés (i)",
          valor: i,
          formatear: porcentaje,
          tasa: { valor: i, tipo: "efectiva", m: r.m, modalidad: "vencida" }, // para usarla en otro módulo
          momento: r.m !== 1 ? `${p.nombreTasa} · ${porcentaje(anual)} efectiva anual` : "efectiva anual",
          extras: [["Efectiva anual", porcentaje(anual)], ["Cómo se halló", "Bisección (extra)"]],
          interpretacion:
            r.desde === "P"
              ? `Pagar ${pesos(P)} con ${pagos(n)} de ${pesos(A)} ${cuando} de cada ${p.singular} equivale a una tasa de ${porcentaje(i)} ${p.nombreTasa}.`
              : `Reunir ${pesos(F)} con ${pagos(n)} de ${pesos(A)} equivale a ganar ${porcentaje(i)} ${p.nombreTasa}.`,
        };
      }
    }
    if (r.incognita === "n" && !esEntero(n)) pasos.push({ titulo: "Interpretación", lineas: [`${pagos(Math.floor(n))} completos de ${pesos(A)} y un pago final menor.`] });

    const resumenPartes = [];
    if (r.incognita !== "P" && r.desde === "P") resumenPartes.push(`P = ${pesos(P)}`);
    if (r.incognita !== "F" && r.desde === "F") resumenPartes.push(`F = ${pesos(F)}`);
    if (r.incognita !== "A") resumenPartes.push(`A = ${pesos(A)}`);
    if (r.incognita !== "i") resumenPartes.push(describirTasa(r.tasa));
    if (r.incognita !== "n") resumenPartes.push(pagos(n));

    return {
      ...v,
      modulo: nombreModulo,
      calculo: r,
      pasos,
      numeroFormula: formulaUsada.numero === "extra" ? `${formulaUsada.base} (con bisección)` : formulaUsada.numero,
      fuente: formulaUsada.numero === "extra" ? `Fórmula ${formulaUsada.base} de la hoja de clase, resuelta por bisección.` : `Fórmula ${formulaUsada.numero} de la hoja de clase.`,
      resumen: resumenPartes.join(" · "),
      visual: {
        tipo: "pagos",
        descripcion: `Diagrama de flujo de caja: ${v.interpretacion}`,
        datos: {
          modalidad: a ? "anticipada" : "vencida",
          incognita: r.incognita,
          base: r.desde,
          P: r.desde === "P" ? P : null,
          F: r.desde === "F" ? F : null,
          A,
          i,
          n,
          singular: p.singular,
          plural: p.plural,
          tasa: `${porcentaje(i)} ${p.adjetivo}`,
        },
      },
      explicacion: () => explicar(r, formulaUsada),
    };
  }

  // "Explícame": los pagos, el viaje del primero y del último, la suma, la fórmula y el total.
  function explicar(r, formulaUsada) {
    const { P, F, A, i, n, p } = r;
    const a = r.anticipada;
    const ultimoPago = a ? Math.ceil(n - 1e-9) - 1 : Math.ceil(n - 1e-9);
    const primerPago = a ? 0 : 1;
    const pasosDe = (k) => `${cifra(k)} ${k === 1 ? p.singular : p.plural}`;
    const lista = [];
    const deA = r.incognita === "A" ? "La cuota A (la incógnita)" : `Una cuota de ${pesos(A)}`;
    lista.push({
      texto: `${deA} ${a ? "al inicio" : "al final"} de cada ${p.singular}, ${pagos(n)} en total. ${r.desde === "P" ? "Todos juntos equivalen a un solo valor hoy: P." : "Todos juntos se convierten en un solo valor al final: F."}`,
      vista: { enfoque: "pagos" },
    });
    if (r.desde === "P") {
      const hoy1 = vpCompuesto(A, i, primerPago); // Hoja 2.2
      lista.push({
        texto: a
          ? `El primer pago se hace hoy, así que vale completo: ${pesos(hoy1)}. Los demás valen menos hoy: cada ${p.singular} de espera se dividen entre ${decimal(1 + i)}.`
          : `Un pago futuro vale menos hoy: se divide entre ${decimal(1 + i)} por cada ${p.singular} de espera. El primero, a 1 ${p.singular}, hoy vale ${pesos(hoy1)}.`,
        vista: { enfoque: "viaje", arco: "primero", nota: true },
      });
      lista.push({ texto: `El último, a ${pasosDe(ultimoPago)}, hoy vale ${pesos(vpCompuesto(A, i, ultimoPago))}.`, vista: { enfoque: "viaje", arco: "ultimo", nota: true } });
      lista.push({ texto: `La suma de lo que vale hoy cada pago es el valor presente: ${pesos(P)}.`, vista: { enfoque: "grande", arco: "todos" } });
    } else {
      const fin = a ? Math.ceil(n - 1e-9) : Math.ceil(n - 1e-9);
      lista.push({
        texto: `Cada pago gana intereses hasta el final: se multiplica por ${decimal(1 + i)} por cada ${p.singular} que falta. El primero, al final, vale ${pesos(vfCompuesto(A, i, fin - primerPago))}.`,
        vista: { enfoque: "viaje", arco: "primero", nota: true },
      });
      lista.push({
        texto: a ? `El último gana un solo ${p.singular} de interés: vale ${pesos(vfCompuesto(A, i, 1))}.` : `El último llega justo al final: no alcanza a ganar intereses y vale ${pesos(A)}.`,
        vista: { enfoque: "viaje", arco: "ultimo", nota: true },
      });
      lista.push({ texto: `La suma de lo que vale cada pago al final es el valor futuro: ${pesos(F)}.`, vista: { enfoque: "grande", arco: "todos" } });
    }
    if (r.incognita === "i") {
      lista.push({
        texto: `La tasa no tiene despeje en la hoja: se probaron tasas en la fórmula ${formulaUsada.base} (bisección) hasta que dio el valor buscado. Resultado: ${porcentaje(i)} ${p.nombreTasa}.`,
        voz: `La tasa no tiene despeje en la hoja: se probaron tasas en la fórmula ${formulaUsada.base} hasta que dio el valor buscado. Resultado: ${porcentaje(i)} ${p.nombreTasa}.`,
        vista: { enfoque: "todo" },
      });
    } else {
      lista.push({ texto: `Eso es la fórmula ${formulaUsada.numero.replace(" (despeje)", "")} de la hoja de clase:`, formula: formulaUsada.html, vista: { enfoque: "todo" } });
    }
    const total = A * n;
    lista.push({
      texto:
        r.incognita === "n" && !esEntero(n)
          ? `Hacen falta ${pagos(n)}: ${pagos(Math.floor(n))} completos y uno final menor.`
          : r.desde === "P"
            ? `En total se pagan ${pesos(total)}: ${pesos(total - P)} son intereses.`
            : `En total se aportan ${pesos(total)}: ${pesos(F - total)} son intereses ganados.`,
      vista: { enfoque: "todo" },
    });
    return lista;
  }

  // ----- ¿Y si…? -----

  const ysiAnualidad = {
    variables: (r) => ({ P: ["tiempo", "tasa"], F: ["tiempo", "tasa"], A: ["tiempo", "tasa"], n: ["tasa"], i: ["tiempo"] })[r.incognita],
    nombre: (variable) => (variable === "tasa" ? "Tasa" : "Pagos"),
    rango: (variable, r) => (variable === "tasa" ? rangoDeTasa(r.tasa) : rangoDePeriodos(r.n)),
    recalcular(o, variable, valor) {
      const datos = { ...o, P: o.desde === "P" || o.incognita === "P" ? o.P : undefined, F: o.desde === "F" || o.incognita === "F" ? o.F : undefined };
      if (variable === "tasa") datos.tasa = { ...o.tasa, valor: valor / 100 };
      else datos.n = valor;
      const r = resolver(datos);
      return valido(r) ? r : null;
    },
    presentar,
    texto: (variable, valor, r, corto) => (variable === "tasa" ? (corto ? porcentaje(valor / 100) : describirTasa({ ...r.tasa, valor: valor / 100 })) : pagos(valor)),
    capturar: () => ({ tasa: f.texto("tasa"), n: f.texto("n") }),
    restaurar(textos) {
      f.escribir("tasa", textos.tasa);
      f.escribir("n", textos.n);
      traducir(false);
    },
    escribir(variable, valor) {
      f.escribir(variable === "tasa" ? "tasa" : "n", textoDeEntrada(valor));
      traducir(false);
    },
    filas(r, o, variable) {
      const fila =
        variable === "tasa"
          ? { nombre: "Tasa", valor: porcentaje(r.tasa.valor), factor: r.tasa.valor / o.tasa.valor, clase: "" }
          : { nombre: "Pagos", valor: pagos(r.n), factor: r.n / o.n, clase: "" };
      const salidas = {
        P: { nombre: "Valor presente", valor: pesos(r.P), factor: r.P / o.P, clase: "capital" },
        F: { nombre: "Valor futuro", valor: pesos(r.F), factor: r.F / o.F, clase: "interes" },
        A: { nombre: "Cuota", valor: pesos(r.A), factor: r.A / o.A, clase: "capital" },
        n: { nombre: "Pagos necesarios", valor: pagos(r.n), factor: r.n / o.n, clase: "capital" },
        i: { nombre: "Tasa necesaria", valor: porcentaje(r.i), factor: r.i / o.i, clase: "interes" },
      };
      return [fila, salidas[r.incognita]];
    },
    efecto(r, o, variable, sentido, [fila, salida]) {
      const tiempo = variable === "tiempo";
      const comparacion = `(${factor(salida.factor)} contra ${factor(fila.factor)})`;
      if (sentido === 0) {
        if (r.incognita === "F") return `Mueve el control: si ${tiempo ? "duplicas los pagos" : "duplicas la tasa"}, ¿se duplica el valor futuro?`;
        if (r.incognita === "P") return `Mueve el control: si ${tiempo ? "duplicas los pagos" : "duplicas la tasa"}, ¿qué pasa con lo que valen hoy?`;
        return `Mueve el control para ver cómo cambia ${r.incognita === "A" ? "la cuota" : r.incognita === "n" ? "el número de pagos" : "la tasa"}.`;
      }
      const sube = sentido > 0;
      switch (r.incognita) {
        case "P":
          if (tiempo) return sube ? `Más pagos valen más hoy, pero no en proporción ${comparacion}: los pagos lejanos valen cada vez menos hoy.` : `Con menos pagos, el valor presente baja menos que los pagos ${comparacion}: los que se quitan son los más lejanos, que hoy valen poco.`;
          return sube ? `Con una tasa mayor, los mismos pagos valen menos hoy (${factor(salida.factor)}): cada uno se descuenta más.` : `Con una tasa menor, los mismos pagos valen más hoy (${factor(salida.factor)}): se descuentan menos.`;
        case "F":
          if (tiempo) return sube ? `El valor futuro crece más que los pagos ${comparacion}: los primeros pagos ganan intereses durante más tiempo.` : `El valor futuro baja más que los pagos ${comparacion}: se pierde el interés de los pagos que ya no están.`;
          return sube ? `Con una tasa mayor, el ahorro final crece (${factor(salida.factor)}): cada pago gana más intereses.` : `Con una tasa menor, el ahorro final baja (${factor(salida.factor)}): cada pago gana menos intereses.`;
        case "A":
          if (tiempo) {
            if (r.desde === "P") return sube ? `Con más pagos la cuota baja, pero no en la misma proporción ${comparacion}: con más tiempo también se pagan más intereses.` : `Con menos pagos la cuota sube ${comparacion}.`;
            return sube ? `Con más pagos para reunir lo mismo, la cuota baja más que proporcionalmente ${comparacion}: los intereses ayudan más.` : `Con menos pagos, la cuota sube más que proporcionalmente ${comparacion}: los intereses ayudan menos.`;
          }
          if (r.desde === "P") return sube ? `Con una tasa mayor, la cuota sube (${factor(salida.factor)}): cada periodo se pagan más intereses.` : `Con una tasa menor, la cuota baja (${factor(salida.factor)}).`;
          return sube ? `Con una tasa mayor, la cuota baja (${factor(salida.factor)}): los intereses aportan más al ahorro.` : `Con una tasa menor, la cuota sube (${factor(salida.factor)}): los intereses aportan menos.`;
        case "n":
          if (r.desde === "P") return sube ? `Con una tasa mayor hacen falta más pagos (${factor(salida.factor)}): una parte mayor de cada cuota se va en intereses.` : `Con una tasa menor hacen falta menos pagos (${factor(salida.factor)}).`;
          return sube ? `Con una tasa mayor llegas a la meta con menos pagos (${factor(salida.factor)}).` : `Con una tasa menor necesitas más pagos para llegar (${factor(salida.factor)}).`;
        default:
          if (r.desde === "P") return sube ? `Si los mismos pagos duran más, la tasa que cobran es mayor (${factor(salida.factor)}).` : `Con menos pagos para el mismo valor, la tasa es menor (${factor(salida.factor)}).`;
          return sube ? `Con más pagos para reunir lo mismo, basta una tasa menor (${factor(salida.factor)}).` : `Con menos pagos, se necesita una tasa mayor (${factor(salida.factor)}).`;
      }
    },
    nota: (r) => notaDuplica(r.i, r.p),
  };

  // Dos módulos (dos rutas) con el mismo formulario.
  const crearModulo = (esAnticipada) => ({
    id: esAnticipada ? "anualidad-anticipada" : "anualidad-vencida",
    icono: esAnticipada ? "i-anticipada" : "i-vencida",
    formulario,
    calcular() {
      const d = leer(esAnticipada);
      if (!d) return null;
      const r = resolver(d);
      if (!valido(r)) {
        f.mostrarErrorGeneral(r.incognita === "n" ? "Con estos datos el número de pagos no tiene sentido. Revisa la cuota y la tasa." : "El resultado es demasiado grande o no existe. Revisa los datos.");
        return null;
      }
      return presentar(r);
    },
    limpiar() {
      f.vaciar();
      traducir(false);
      ocultarResultado();
    },
    // Al abrir la pantalla: títulos, ícono y transición según sea vencida o anticipada.
    alEntrar() {
      anticipada = esAnticipada;
      const icono = document.getElementById("icono-anualidad");
      const titulo = document.getElementById("titulo-anualidad");
      document.getElementById("icono-anualidad-uso").setAttribute("href", esAnticipada ? "#i-anticipada" : "#i-vencida");
      titulo.textContent = esAnticipada ? "Anualidad anticipada" : "Anualidad vencida";
      document.getElementById("texto-anualidad").textContent = esAnticipada
        ? "Pagos iguales al inicio de cada periodo: el primero, hoy. Fórmulas 6.1 a 6.3."
        : "Pagos iguales al final de cada periodo: el primero, dentro de un periodo. Fórmulas 5.1 a 5.3.";
      icono.style.viewTransitionName = esAnticipada ? "icono-anticipada" : "icono-vencida";
      titulo.style.viewTransitionName = esAnticipada ? "titulo-anticipada" : "titulo-vencida";
      traducir(false);
    },
    ysi: ysiAnualidad,
  });

  const vencida = crearModulo(false);
  const anticipadaModulo = crearModulo(true);
  registrarModulo(vencida);
  registrarModulo(anticipadaModulo);
  const moduloActual = () => (anticipada ? anticipadaModulo : vencida);
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    calcularModulo(moduloActual());
  });
  formulario.querySelector('[data-accion="limpiar"]').addEventListener("click", () => moduloActual().limpiar());
  formulario.querySelector('[data-accion="ejemplo"]').addEventListener("click", () => {
    cargarEjemplo();
    marcarDesactualizado();
  });
  for (const boton of formulario.querySelectorAll(".boton")) boton.addEventListener("pointerdown", ondaAlTocar);

  // ===================== Perpetua =====================

  const formPerpetua = document.getElementById("form-perpetua");
  const fp = prepararFormulario(formPerpetua);
  const periodoPerpetua = () => Number(formPerpetua.elements["periodo-pagos"].value);
  const traducirPerpetua = (animar = true) => fp.traducir("tasa", periodoPerpetua(), animar);
  formPerpetua.addEventListener("input", (evento) => evento.target.name === "tasa" && traducirPerpetua(false));
  formPerpetua.addEventListener("change", () => traducirPerpetua());
  traducirPerpetua(false);

  // Ejemplos 6a y 6b de docs/02.
  const EJEMPLOS_PERPETUA = {
    P: { A: "5000000", tasa: "10", "tasa-tipo": "anual", "tasa-periodo": "1", "tasa-modalidad": "vencida", "periodo-pagos": "2" },
    A: { P: "300000000", tasa: "9", "tasa-tipo": "anual", "tasa-periodo": "1", "tasa-modalidad": "vencida", "periodo-pagos": "12" },
  };

  function leerPerpetua() {
    fp.limpiarErrores();
    const errores = {};
    const incognita = fp.incognita();
    const d = { incognita, m: periodoPerpetua() };
    if (incognita === "P") d.A = fp.dinero("A", "el pago de cada periodo", errores);
    else d.P = fp.dinero("P", "el capital disponible", errores);
    d.tasa = fp.tasa("tasa", errores);
    if (Object.keys(errores).length) {
      fp.mostrarErrores(errores);
      return null;
    }
    return d;
  }

  function resolverPerpetua(d) {
    const r = { ...d, p: PERIODICIDADES[d.m] };
    r.conversion = convertirTasa(d.tasa, EFECTIVA(d.m)); // la tasa debe ser la del periodo de pago
    r.i = r.conversion.valor;
    if (d.incognita === "P") r.P = vpPerpetuidad(r.A, r.i); // P = A / i
    else r.A = pagoPerpetuidad(r.P, r.i); // A = P · i
    r.calculado = r[d.incognita];
    return r;
  }

  function presentarPerpetua(r) {
    const { P, A, i, p } = r;
    const esP = r.incognita === "P";
    const pasos = [
      { titulo: "Datos", lineas: [esP ? `Pago de cada ${p.singular}: ${formula(`${variable("A")} = ${pesos(A)}`)}` : `Capital: ${formula(`${variable("P")} = ${pesos(P)}`)}`, `Tasa: ${describirTasa(r.tasa)}`] },
      pasoDeTasa(r.tasa, r.conversion, p),
      { titulo: "Fórmula de la hoja de clase (sección 7)", lineas: [`${insignia("7")}${formula(esP ? `${variable("P")} = ${variable("A")} / ${variable("i")}` : `${variable("A")} = ${variable("P")} · ${variable("i")}`)}`] },
      lineasNumeros(esP ? [`${variable("P")} = ${cifra(A)} / ${decimal(i)}`, `${variable("P")} = <strong>${pesos(P)}</strong>`] : [`${variable("A")} = ${cifra(P)} · ${decimal(i)}`, `${variable("A")} = <strong>${pesos(A)}</strong>`]),
      { titulo: "Interpretación", lineas: [`Los intereses de cada ${p.singular} (${pesos(P)} · ${porcentaje(i)} = ${pesos(A)}) alcanzan justo para el pago: el capital nunca se gasta.`] },
    ];
    return {
      modulo: "anualidad-perpetua",
      calculo: r,
      etiqueta: esP ? "Capital requerido (P)" : "Pago sostenible (A)",
      valor: esP ? P : A,
      formatear: pesos,
      momento: esP ? `hoy, para pagar ${pesos(A)} cada ${p.singular} sin fin` : `cada ${p.singular}, para siempre`,
      extras: [esP ? ["Pago de cada periodo", pesos(A)] : ["Capital", pesos(P)], ["Tasa del periodo", `${porcentaje(i)} ${p.adjetivo}`]],
      interpretacion: esP
        ? `Con ${pesos(P)} hoy a ${porcentaje(i)} ${p.nombreTasa}, los intereses de cada ${p.singular} pagan ${pesos(A)} sin tocar el capital: se puede pagar para siempre.`
        : `Con ${pesos(P)} a ${porcentaje(i)} ${p.nombreTasa} se pueden retirar ${pesos(A)} cada ${p.singular}, para siempre: es justo el interés de cada periodo.`,
      pasos,
      numeroFormula: "de la sección 7",
      fuente: "Sección 7 de la hoja de clase (anualidades perpetuas).",
      resumen: `${esP ? `A = ${pesos(A)}` : `P = ${pesos(P)}`} · ${describirTasa(r.tasa)} · cada ${p.singular}`,
      visual: {
        tipo: "perpetua",
        descripcion: `Diagrama de flujo de caja de una perpetuidad: ${pesos(A)} cada ${p.singular} para siempre equivalen a ${pesos(P)} hoy.`,
        datos: { modalidad: "perpetua", incognita: r.incognita, base: "P", P, A, i, n: 0, singular: p.singular, plural: p.plural, tasa: `${porcentaje(i)} ${p.adjetivo}` },
      },
      explicacion: () => [
        { texto: `${esP ? `Se quieren pagar ${pesos(A)}` : "Se quiere saber cuánto se puede pagar"} cada ${p.singular}, sin fin, el primero dentro de un ${p.singular}.`, vista: { enfoque: "pagos" } },
        { texto: `Un pago lejano vale casi nada hoy. El primero, a 1 ${p.singular}, hoy vale ${pesos(vpCompuesto(A, i, 1))}.`, vista: { enfoque: "viaje", arco: "primero", nota: true } },
        { texto: `El quinto, a 5 ${p.plural}, hoy vale ${pesos(vpCompuesto(A, i, 5))}. Mientras más lejos, menos vale.`, vista: { enfoque: "viaje", arco: "ultimo", nota: true } },
        { texto: `Por eso infinitos pagos suman un valor finito: ${pesos(P)}. Con más y más pagos la suma se acerca a ese valor, sin pasarlo.`, vista: { enfoque: "grande", arco: "todos" } },
        { texto: "Eso es la fórmula de la sección 7 de la hoja de clase:", formula: esP ? `${variable("P")} = ${variable("A")} / ${variable("i")}` : `${variable("A")} = ${variable("P")} · ${variable("i")}`, vista: { enfoque: "todo" } },
        { texto: `Visto al revés: los intereses de cada ${p.singular}, ${pesos(P)} por ${porcentaje(i)}, dan justo ${pesos(A)}. El pago sale de los intereses y el capital queda intacto.`, vista: { enfoque: "todo" } },
      ],
    };
  }

  const perpetua = {
    id: "anualidad-perpetua",
    icono: "i-perpetua",
    formulario: formPerpetua,
    calcular() {
      const d = leerPerpetua();
      if (!d) return null;
      const r = resolverPerpetua(d);
      if (!Number.isFinite(r.calculado) || r.calculado <= 0 || r.calculado > 1e15) {
        fp.mostrarErrorGeneral("El resultado es demasiado grande o no existe. Revisa la tasa.");
        return null;
      }
      return presentarPerpetua(r);
    },
    limpiar() {
      fp.vaciar();
      traducirPerpetua(false);
      ocultarResultado();
    },
    ysi: {
      variables: () => ["tasa"],
      nombre: () => "Tasa",
      rango: (variable, r) => rangoDeTasa(r.tasa),
      recalcular(o, variable, valor) {
        const r = resolverPerpetua({ ...o, tasa: { ...o.tasa, valor: valor / 100 }, P: o.incognita === "A" ? o.P : undefined, A: o.incognita === "P" ? o.A : undefined });
        return Number.isFinite(r.calculado) && r.calculado > 0 && r.calculado < 1e15 && r.i > 0 ? r : null;
      },
      presentar: presentarPerpetua,
      texto: (variable, valor, r, corto) => (corto ? porcentaje(valor / 100) : describirTasa({ ...r.tasa, valor: valor / 100 })),
      capturar: () => ({ tasa: fp.texto("tasa") }),
      restaurar(textos) {
        fp.escribir("tasa", textos.tasa);
        traducirPerpetua(false);
      },
      escribir(variable, valor) {
        fp.escribir("tasa", textoDeEntrada(valor));
        traducirPerpetua(false);
      },
      filas: (r, o) => [
        { nombre: "Tasa del periodo", valor: porcentaje(r.i), factor: r.i / o.i, clase: "" },
        r.incognita === "P"
          ? { nombre: "Capital requerido", valor: pesos(r.P), factor: r.P / o.P, clase: "capital" }
          : { nombre: "Pago sostenible", valor: pesos(r.A), factor: r.A / o.A, clase: "capital" },
      ],
      efecto(r, o, variable, sentido, [fila, salida]) {
        if (sentido === 0) return r.incognita === "P" ? "Mueve el control: si la tasa se duplica, ¿cuánto capital hace falta?" : "Mueve el control: si la tasa sube, ¿cuánto se puede retirar?";
        if (r.incognita === "P") return `Con la tasa ${factor(fila.factor)}, el capital requerido queda ${factor(salida.factor)}: P = A / i, así que si la tasa se duplica, el capital se reduce a la mitad.`;
        return `Con la tasa ${factor(fila.factor)}, el pago sostenible también queda ${factor(salida.factor)}: A = P · i, va en la misma proporción.`;
      },
      nota: (r) => notaDuplica(r.i, r.p),
    },
  };

  registrarModulo(perpetua);
  conectarAcciones(perpetua, {
    ejemplo() {
      fp.vaciar();
      escribirFormulario(formPerpetua, EJEMPLOS_PERPETUA[fp.incognita()]);
      traducirPerpetua(false);
    },
  });
})();
