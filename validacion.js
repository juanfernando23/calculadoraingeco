/* validacion.js
 * Los cinco ejercicios de validación del proyecto (docs/05-plan-de-validacion.md), dentro de la
 * app. Cada uno está resuelto dos veces:
 *   - a mano (desarrollo independiente): con la tasa en decimal a 8 decimales y los factores a 8,
 *     como se haría con una calculadora científica; los números están escritos aquí, no se
 *     calculan;
 *   - con la calculadora: la columna "Calculadora" se calcula al abrir la pantalla con las mismas
 *     funciones de finanzas.js que usan los módulos, y "Abrir en la calculadora" hace el cálculo
 *     en el módulo, con sus datos.
 * Se acepta como redondeo una diferencia de hasta $ 1 por cada $ 100.000 del resultado en dinero,
 * o de una diezmilésima de punto en las tasas (criterio de docs/05).
 */

const EJERCICIOS_VALIDACION = (() => {
  const EA = { tipo: "efectiva", m: 1, modalidad: "vencida" };
  const periodica = (m) => ({ tipo: "efectiva", m, modalidad: "vencida" });
  const NTA = { tipo: "nominal", m: 4, modalidad: "anticipada" };
  const NTV = { tipo: "nominal", m: 4, modalidad: "vencida" };
  const con = (numero, expresion) => `${insignia(numero)}${formula(expresion)}`;
  const v = variable;
  const sup = (x) => `<sup>${x}</sup>`;

  return [
    {
      numero: "1",
      modulo: "Interés compuesto",
      icono: "i-compuesto",
      enunciado: "Andrea invierte $ 7.850.000 en un CDT que paga 11,30 % nominal anual trimestre vencido. ¿Cuánto tendrá al cabo de 30 meses?",
      datos: [
        ["Valor presente (VP)", "$ 7.850.000", "hoy"],
        ["Tasa", "11,30 % nominal anual", "trimestre vencido (m = 4)"],
        ["Tiempo (n)", "30", "meses"],
      ],
      incognita: "El valor futuro (VF) al final del mes 30.",
      procedimiento: "La tasa se lleva a la unidad del tiempo, mensual (1.1, 1.5 y 1.6), y se aplica el valor futuro (2.1).",
      partes: [
        {
          nombre: "Valor futuro",
          pasos: [
            { titulo: "Tasa periódica trimestral", lineas: [con("1.1", `${v("i", "p")} = ${v("i", "n")} / ${v("m")} = 0,113 / 4 = 0,02825`)] },
            { titulo: "Tasa efectiva anual", lineas: [con("1.5", `${v("i", "ea")} = (1 + 0,02825)${sup(4)} − 1 = 0,11787919`)] },
            { titulo: "Tasa periódica mensual (la unidad del tiempo)", lineas: [con("1.6", `${v("i", "p")} = (1 + 0,11787919)${sup("1/12")} − 1 = 0,00932936`)] },
            {
              titulo: "Valor futuro",
              lineas: [
                con("2.1", `${v("VF")} = ${v("VP")} · (1 + ${v("i")})${sup(v("n"))}`),
                formula(`${v("VF")} = 7.850.000 · (1 + 0,00932936)${sup(30)} = 7.850.000 · 1,32125667 = 10.371.864,86`),
              ],
            },
          ],
          comparaciones: [
            {
              etiqueta: "Valor futuro (VF)",
              tipo: "dinero",
              mano: 10371864.86,
              calcular: () => vfCompuesto(7850000, convertirTasa({ valor: 0.113, tipo: "nominal", m: 4, modalidad: "vencida" }, periodica(12)).valor, 30), // Hoja 1.1, 1.5, 1.6 y 2.1
            },
          ],
          explicacion: "A mano, la tasa mensual se llevó con 8 decimales (0,00932936 en lugar de 0,0093293591…): el desarrollo da 26 centavos más, que desaparecen al redondear al peso.",
          abrir: { campos: { incognita: "F", P: 7850000, tasa: { porcentaje: 11.3, tipo: "nominal", m: 4, modalidad: "vencida" }, n: 30, unidad: 12 } },
        },
      ],
    },
    {
      numero: "2",
      modulo: "Conversión e indexación de tasas",
      icono: "i-indexadas",
      enunciado:
        "Tres créditos están atados a un índice: a) DTF + 3,20 puntos, con la DTF en 9,37 % efectiva anual y los puntos sobre trimestre anticipado; b) IBR a 3 meses + 2,75 puntos, con el IBR en 9,46 % nominal trimestre vencido; c) IPC + 4,10 puntos, con el IPC en 5,18 % efectivo anual. ¿Cuál es la tasa de cada uno? Para comparar, a) y b) en efectiva anual y c) en periódica mensual.",
      datos: [
        ["DTF", "9,37 %", "efectiva anual; puntos: 3,20 sobre trimestre anticipado"],
        ["IBR a 3 meses", "9,46 %", "nominal trimestre vencido; puntos: 2,75"],
        ["IPC (12 meses)", "5,18 %", "efectivo anual; puntos: 4,10"],
      ],
      incognita: "La tasa indexada de cada crédito y su conversión posterior.",
      procedimiento: "DTF e IBR se suman con los puntos (4.2), pero solo en la misma forma: la DTF se pasa antes a trimestre anticipado. El IPC se combina con los puntos (4.1). Después, cada tasa se convierte (1.1, 1.5, 1.6, 3.1 y 3.2).",
      partes: [
        {
          letra: "a",
          nombre: "DTF + 3,20 puntos",
          pasos: [
            {
              titulo: "La DTF a trimestre anticipado, la forma de los puntos",
              lineas: [
                con("1.6", `${v("i", "p")} = (1 + 0,0937)${sup("1/4")} − 1 = 0,02264418`),
                con("3.1", `${v("i", "a")} = 0,02264418 / (1 + 0,02264418) = 0,02214278`),
                con("1.2", `${v("i", "n")} = 0,02214278 · 4 = 0,08857112`),
              ],
            },
            { titulo: "Indexación: se suman los puntos", lineas: [con("4.2", `${v("i")} = 0,08857112 + 0,032 = 0,12057112`), "12,06 % nominal anual trimestre anticipado"] },
            {
              titulo: "Conversión posterior: a efectiva anual",
              lineas: [
                con("1.1", `${v("i", "a")} = 0,12057112 / 4 = 0,03014278`),
                con("3.2", `${v("i", "v")} = 0,03014278 / (1 − 0,03014278) = 0,03107961`),
                con("1.5", `${v("i", "ea")} = (1 + 0,03107961)${sup(4)} − 1 = 0,13023511`),
              ],
            },
          ],
          comparaciones: [
            { etiqueta: "Tasa indexada (nominal trimestre anticipado)", tipo: "tasa", mano: 0.12057112, calcular: () => indexacionLineal(convertirTasa({ valor: 0.0937, ...EA }, NTA).valor, 0.032) },
            {
              etiqueta: "Efectiva anual",
              tipo: "tasa",
              mano: 0.13023511,
              calcular: () => convertirTasa({ valor: indexacionLineal(convertirTasa({ valor: 0.0937, ...EA }, NTA).valor, 0.032), ...NTA }, EA).valor,
            },
          ],
          explicacion: "Coinciden en los dos decimales que se muestran. A mano, cada paso se redondeó a 8 decimales: la diferencia aparece después del octavo decimal de la tasa.",
          abrir: { modulo: "tasas-indexadas", formulario: { indice: "DTF", "valor-indice": "9,37", "forma-dtf": "EA", puntos: "3,2", convertir: "1" } },
        },
        {
          letra: "b",
          nombre: "IBR + 2,75 puntos",
          pasos: [
            { titulo: "Indexación: el IBR y los puntos ya están en la misma forma", lineas: [con("4.2", `${v("i")} = 0,0946 + 0,0275 = 0,1221`), "12,21 % nominal anual trimestre vencido"] },
            {
              titulo: "Conversión posterior: a efectiva anual",
              lineas: [con("1.1", `${v("i", "p")} = 0,1221 / 4 = 0,030525`), con("1.5", `${v("i", "ea")} = (1 + 0,030525)${sup(4)} − 1 = 0,12780529`)],
            },
          ],
          comparaciones: [
            { etiqueta: "Tasa indexada (nominal trimestre vencido)", tipo: "tasa", mano: 0.1221, calcular: () => indexacionLineal(0.0946, 0.0275) },
            { etiqueta: "Efectiva anual", tipo: "tasa", mano: 0.12780529, calcular: () => convertirTasa({ valor: indexacionLineal(0.0946, 0.0275), ...NTV }, EA).valor },
          ],
          explicacion: "La suma es exacta; la efectiva anual coincide hasta el octavo decimal.",
          abrir: { modulo: "tasas-indexadas", formulario: { indice: "IBR", "valor-indice": "9,46", "plazo-ibr": "4", puntos: "2,75", convertir: "1" } },
        },
        {
          letra: "c",
          nombre: "IPC + 4,10 puntos",
          pasos: [
            { titulo: "Indexación combinada: no se suman", lineas: [con("4.1", `${v("i")} = (1 + 0,0518) · (1 + 0,041) − 1 = 0,0949238`), "9,49 % efectiva anual (sumando daría 9,28 %)"] },
            { titulo: "Conversión posterior: a periódica mensual", lineas: [con("1.6", `${v("i", "p")} = (1 + 0,0949238)${sup("1/12")} − 1 = 0,00758569`)] },
          ],
          comparaciones: [
            { etiqueta: "Tasa indexada (efectiva anual)", tipo: "tasa", mano: 0.0949238, calcular: () => indexacionCombinada(0.0518, 0.041) },
            { etiqueta: "Periódica mensual", tipo: "tasa", mano: 0.00758569, calcular: () => convertirTasa({ valor: indexacionCombinada(0.0518, 0.041), ...EA }, periodica(12)).valor },
          ],
          explicacion: "La combinada es exacta; la mensual coincide hasta el octavo decimal.",
          abrir: { modulo: "tasas-indexadas", formulario: { indice: "IPC", "valor-indice": "5,18", puntos: "4,1", convertir: "12" } },
        },
      ],
    },
    {
      numero: "3",
      modulo: "Anualidad vencida",
      icono: "i-vencida",
      enunciado: "Camilo ahorra $ 653.400 al final de cada mes, durante 42 meses, en un fondo que rinde 10,40 % efectivo anual. ¿Cuánto tendrá al final?",
      datos: [
        ["Cuota (A)", "$ 653.400", "al final de cada mes"],
        ["Número de pagos (n)", "42", "meses"],
        ["Tasa", "10,40 %", "efectiva anual"],
      ],
      incognita: "El valor futuro (F) al final del mes 42.",
      procedimiento: "La tasa se lleva al periodo de los pagos, mensual (1.6), y se aplica el valor futuro de una anualidad vencida (5.2).",
      partes: [
        {
          nombre: "Valor futuro",
          pasos: [
            { titulo: "Tasa periódica mensual (la de los pagos)", lineas: [con("1.6", `${v("i", "p")} = (1 + 0,104)${sup("1/12")} − 1 = 0,00827908`)] },
            {
              titulo: "Valor futuro de la anualidad",
              lineas: [
                con("5.2", `${v("F")} = ${v("A")} · [((1 + ${v("i")})${sup(v("n"))} − 1) / ${v("i")}]`),
                formula(`(1 + 0,00827908)${sup(42)} = 1,41381235`),
                formula(`(1,41381235 − 1) / 0,00827908 = 49,98289061`),
                formula(`${v("F")} = 653.400 · 49,98289061 = 32.658.820,72`),
              ],
            },
          ],
          comparaciones: [
            { etiqueta: "Valor futuro (F)", tipo: "dinero", mano: 32658820.72, calcular: () => vfAnualidadVencida(653400, convertirTasa({ valor: 0.104, ...EA }, periodica(12)).valor, 42) }, // Hoja 1.6 y 5.2
          ],
          explicacion: "La diferencia es de redondeo: a mano, la tasa mensual con 8 decimales (0,00827908 en lugar de 0,0082790792…) da 63 centavos más, y al redondear cada valor al peso queda $ 1.",
          abrir: { modulo: "anualidad-vencida", formulario: { incognita: "F", A: "653400", n: "42", tasa: "10,4", "tasa-tipo": "anual", "tasa-periodo": "1", "tasa-modalidad": "vencida", "periodo-pagos": "12" } },
        },
      ],
    },
    {
      numero: "4",
      modulo: "Anualidad anticipada",
      icono: "i-anticipada",
      enunciado: "Un local se arrienda por 2 años con pagos de $ 2.350.000 al inicio de cada mes. Con una tasa de 13,20 % nominal anual semestre vencido, ¿cuánto vale hoy el contrato?",
      datos: [
        ["Cuota (A)", "$ 2.350.000", "al inicio de cada mes"],
        ["Número de pagos (n)", "24", "meses"],
        ["Tasa", "13,20 % nominal anual", "semestre vencido (m = 2)"],
      ],
      incognita: "El valor presente (P) del contrato, hoy.",
      procedimiento: "La tasa se lleva al periodo de los pagos, mensual (1.1, 1.5 y 1.6), y se aplica el valor presente de una anualidad anticipada (6.1).",
      partes: [
        {
          nombre: "Valor presente",
          pasos: [
            { titulo: "Tasa periódica semestral", lineas: [con("1.1", `${v("i", "p")} = 0,132 / 2 = 0,066`)] },
            { titulo: "Tasa efectiva anual", lineas: [con("1.5", `${v("i", "ea")} = (1 + 0,066)${sup(2)} − 1 = 0,136356`)] },
            { titulo: "Tasa periódica mensual (la de los pagos)", lineas: [con("1.6", `${v("i", "p")} = (1 + 0,136356)${sup("1/12")} − 1 = 0,01070916`)] },
            {
              titulo: "Valor presente de la anualidad anticipada",
              lineas: [
                con("6.1", `${v("P")} = ${v("A")} + ${v("A")} · [((1 + ${v("i")})${sup(`${v("n")} − 1`)} − 1) / (${v("i")} · (1 + ${v("i")})${sup(`${v("n")} − 1`)})]`),
                formula(`(1 + 0,01070916)${sup(23)} = 1,27762276`),
                formula(`(1,27762276 − 1) / (0,01070916 · 1,27762276) = 20,29069956`),
                formula(`${v("P")} = 2.350.000 + 2.350.000 · 20,29069956 = 50.033.143,97`),
              ],
            },
          ],
          comparaciones: [
            {
              etiqueta: "Valor presente (P)",
              tipo: "dinero",
              mano: 50033143.97,
              calcular: () => vpAnualidadAnticipada(2350000, convertirTasa({ valor: 0.132, tipo: "nominal", m: 2, modalidad: "vencida" }, periodica(12)).valor, 24), // Hoja 1.1, 1.5, 1.6 y 6.1
            },
          ],
          explicacion: "La diferencia es de redondeo: con la tasa mensual a 8 decimales (0,01070916 en lugar de 0,0107091578…), el desarrollo a mano da 91 centavos menos; al redondear al peso queda $ 1.",
          abrir: { modulo: "anualidad-anticipada", formulario: { incognita: "P", A: "2350000", n: "24", tasa: "13,2", "tasa-tipo": "nominal", "tasa-periodo": "2", "tasa-modalidad": "vencida", "periodo-pagos": "12" } },
        },
      ],
    },
    {
      numero: "5",
      modulo: "Anualidad perpetua",
      icono: "i-perpetua",
      enunciado: "Una fundación quiere entregar una beca de $ 4.200.000 cada semestre, para siempre; la primera, dentro de seis meses. Si el fondo rinde 9,15 % efectivo anual, ¿qué capital necesita hoy?",
      datos: [
        ["Pago (A)", "$ 4.200.000", "cada semestre, para siempre"],
        ["Tasa", "9,15 %", "efectiva anual"],
      ],
      incognita: "El capital requerido hoy (P).",
      procedimiento: "La tasa se lleva al periodo de los pagos, semestral (1.6), y se aplica la perpetuidad: P = A / i (sección 7).",
      partes: [
        {
          nombre: "Capital requerido",
          pasos: [
            { titulo: "Tasa periódica semestral (la de los pagos)", lineas: [con("1.6", `${v("i", "p")} = (1 + 0,0915)${sup("1/2")} − 1 = 0,04474877`)] },
            { titulo: "Capital requerido", lineas: [formula(`${v("P")} = ${v("A")} / ${v("i")} = 4.200.000 / 0,04474877 = 93.857.328,37`)] },
          ],
          comparaciones: [
            { etiqueta: "Capital requerido (P)", tipo: "dinero", mano: 93857328.37, calcular: () => vpPerpetuidad(4200000, convertirTasa({ valor: 0.0915, ...EA }, periodica(2)).valor) }, // Hoja 1.6 y sección 7
          ],
          explicacion:
            "La diferencia es de redondeo y se explica: en una perpetuidad P = A / i, así que un error mínimo en la tasa se agranda. A mano la tasa semestral lleva 8 decimales (0,04474877 en lugar de 0,0447487736…): esa diferencia en el noveno decimal da 7 pesos con 61 centavos más. Con la tasa completa, el cálculo a mano da lo mismo que la calculadora.",
          abrir: { modulo: "anualidad-perpetua", formulario: { incognita: "P", A: "4200000", tasa: "9,15", "tasa-tipo": "anual", "tasa-periodo": "1", "tasa-modalidad": "vencida", "periodo-pagos": "2" } },
        },
      ],
    },
  ];
})();

// ----- Comparación -----

// El valor que se muestra y la diferencia entre lo que se muestra: el dinero al peso y las
// tasas en porcentaje con 2 decimales, como en el resto de la app.
function compararValidacion(c) {
  const calculada = c.calcular();
  const dinero = c.tipo === "dinero";
  const diferencia = Math.abs(c.mano - calculada);
  const puntos = formatoDos.format(Math.abs(Math.round(c.mano * 1e4) - Math.round(calculada * 1e4)) / 100);
  return {
    mano: dinero ? pesos(c.mano) : porcentaje(c.mano),
    calculadora: dinero ? pesos(calculada) : porcentaje(calculada),
    diferencia: dinero
      ? pesos(Math.abs(Math.round(c.mano) - Math.round(calculada)))
      : `${puntos} puntos`,
    diferenciaCorta: dinero ? null : puntos, // en las tarjetas, "puntos" va en la etiqueta
    // Margen de docs/05: $ 1 por cada $ 100.000 del resultado, o una diezmilésima de punto.
    validado: Number.isFinite(calculada) && (dinero ? diferencia <= Math.max(1, calculada * 1e-5) : diferencia <= 1e-6),
  };
}

// ----- Pantalla -----

const marcaValidado = (validado) =>
  `<span class="marca-validado${validado ? "" : " marca-validado--no"}" role="img" aria-label="${validado ? "Validado" : "No validado"}"><svg class="icono" width="18" height="18" aria-hidden="true"><use href="#${validado ? "i-listo" : "i-alerta"}"/></svg></span>`;

function pintarValidacion() {
  const filas = [];
  const tarjetas = EJERCICIOS_VALIDACION.map((ejercicio) => {
    const partes = ejercicio.partes.map((parte, k) => {
      const comparaciones = parte.comparaciones.map((c) => ({ ...c, ...compararValidacion(c) }));
      const principal = comparaciones[0];
      filas.push({ numero: `${ejercicio.numero}${parte.letra || ""}`, nombre: parte.letra ? parte.nombre : `${ejercicio.modulo} · ${parte.nombre}`, ...principal, ancla: `validacion-${ejercicio.numero}` });
      const validada = comparaciones.every((c) => c.validado);
      return `
        ${parte.letra ? `<h3 class="validacion__parte">${parte.letra}) ${parte.nombre}</h3>` : ""}
        <details class="desarrollo">
          <summary>Desarrollo independiente (a mano)</summary>
          <ol class="pasos">${parte.pasos
            .map(
              (paso, j) => `<li class="paso"><span class="paso__numero">${j + 1}</span><div><p class="paso__titulo">${paso.titulo}</p>${paso.lineas.map((linea) => `<p class="paso__linea">${linea}</p>`).join("")}</div></li>`
            )
            .join("")}</ol>
        </details>
        <dl class="comparacion-validacion">${comparaciones
          .map(
            (c) => `<div class="comparacion-validacion__fila">
              <dt>${c.etiqueta}</dt>
              <dd><span>A mano</span><strong>${c.mano}</strong></dd>
              <dd><span>Calculadora</span><strong>${c.calculadora}</strong></dd>
              <dd><span>Diferencia${c.diferenciaCorta ? " (puntos)" : ""}</span><strong class="con-marca">${c.diferenciaCorta ?? c.diferencia}${marcaValidado(c.validado)}</strong></dd>
            </div>`
          )
          .join("")}</dl>
        <p class="validacion__veredicto${validada ? "" : " validacion__veredicto--no"}"><strong>${validada ? "Validado." : "Revisar."}</strong> ${parte.explicacion}</p>
        <button class="boton boton--chico" type="button" data-abrir="${ejercicio.numero}-${k}">
          <svg class="icono" width="18" height="18" aria-hidden="true"><use href="#${ejercicio.icono}"/></svg>
          Abrir en la calculadora
        </button>`;
    });
    return `<article class="tarjeta texto validacion" id="validacion-${ejercicio.numero}">
      <p class="antetitulo">Validación ${ejercicio.numero}</p>
      <h2>${ejercicio.modulo}</h2>
      <p>${ejercicio.enunciado}</p>
      <dl class="validacion__datos">${ejercicio.datos.map(([dato, valor, unidad]) => `<div><dt>${dato}</dt><dd><strong>${valor}</strong> ${unidad}</dd></div>`).join("")}</dl>
      <p><strong>Incógnita:</strong> ${ejercicio.incognita}</p>
      <p><strong>Procedimiento:</strong> ${ejercicio.procedimiento}</p>
      ${partes.join("")}
    </article>`;
  });

  $("validacion-matriz").innerHTML = filas
    .map(
      (fila, k) => `<li class="matriz__fila" style="--i: ${k}">
        <div class="matriz__cabeza">
          <a class="matriz__numero" href="#${fila.ancla}" data-ir="${fila.ancla}" aria-label="Ver el ejercicio ${fila.numero}">${fila.numero}</a>
          <p class="matriz__nombre">${fila.nombre}</p>
          ${marcaValidado(fila.validado)}
        </div>
        <dl class="matriz__valores">
          <div><dt>A mano</dt><dd>${fila.mano}</dd></div>
          <div><dt>Calculadora</dt><dd>${fila.calculadora}</dd></div>
          <div><dt>Diferencia</dt><dd>${fila.diferencia}</dd></div>
        </dl>
      </li>`
    )
    .join("");
  const validadas = filas.filter((fila) => fila.validado).length;
  $("validacion-resumen").textContent = `${validadas} de ${filas.length} comparaciones validadas: los resultados a mano y los de la calculadora coinciden, salvo diferencias de redondeo explicadas.`;
  $("validacion-ejercicios").innerHTML = tarjetas.join("");
  reiniciarAnimacion($("validacion-matriz"), "matriz--entrando");
}

// Los números de la matriz llevan a su ejercicio sin cambiar la ruta (el # de la pantalla).
document.getElementById("pantalla-validacion").addEventListener("click", (evento) => {
  const ir = evento.target.closest("[data-ir]");
  if (ir) {
    evento.preventDefault();
    $(ir.dataset.ir).scrollIntoView({ behavior: movimientoReducido() ? "auto" : "smooth", block: "start" });
    return;
  }
  const boton = evento.target.closest("[data-abrir]");
  if (!boton) return;
  const [numero, parte] = boton.dataset.abrir.split("-");
  const ejercicio = EJERCICIOS_VALIDACION.find((otro) => otro.numero === numero);
  abrirCalculo(ejercicio.partes[Number(parte)].abrir);
});
