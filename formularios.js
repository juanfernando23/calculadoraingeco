/* formularios.js
 * Piezas comunes de los formularios de los módulos nuevos (conversión de tasas, tasas
 * indexadas y anualidades): leer números y tasas, mostrar errores, mostrar solo los campos que
 * pide la incógnita, la traducción de la tasa y guardar o restaurar lo escrito (historial).
 * Interés compuesto tiene las suyas en app.js. Usa los formatos y leerNumero() de app.js.
 *
 * Marcado que espera (ver index.html):
 *   <div class="campo" data-campo="P"> … <input name="P"> <p class="campo__leido"> <p class="campo__error">
 *   <div class="plegable" data-para="A-P n-P"> se muestra solo si alguna de esas claves está activa
 *   <div data-tasa="tasa"></div> se llena con la plantilla de la tasa (tipo, periodo y modalidad)
 *   <p class="campo__traduccion" data-traduccion="tasa"> la tasa convertida a la unidad de los pagos
 */

// Llena cada <div data-tasa="x"> con los controles de una tasa: tipo (periódica, nominal o
// efectiva anual), periodo y modalidad. Los nombres quedan "x-tipo", "x-periodo" y "x-modalidad".
function insertarControlesDeTasa(form) {
  const plantilla = document.getElementById("plantilla-tasa");
  for (const lugar of form.querySelectorAll("[data-tasa]")) {
    const prefijo = lugar.dataset.tasa;
    const copia = plantilla.content.cloneNode(true);
    for (const control of copia.querySelectorAll("[data-nombre]")) control.name = `${prefijo}-${control.dataset.nombre}`;
    for (const etiqueta of copia.querySelectorAll("[data-id]")) etiqueta.id = `${form.id}-${prefijo}-${etiqueta.dataset.id}`;
    for (const grupo of copia.querySelectorAll("[data-etiquetado]")) grupo.setAttribute("aria-labelledby", `${form.id}-${prefijo}-${grupo.dataset.etiquetado}`);
    const selector = copia.querySelector("select");
    selector.id = `${form.id}-${prefijo}-periodo`;
    copia.querySelector("[data-para-selector]").htmlFor = selector.id;
    lugar.append(copia);
  }
}

// Lo escrito en los campos que se ven (los plegados no cuentan): { nombre: valor }.
function leerFormulario(form) {
  const datos = {};
  for (const control of form.elements) {
    if (!control.name || control.closest("[inert]")) continue;
    if (control.type === "radio") {
      if (control.checked) datos[control.name] = control.value;
    } else if (control.tagName === "SELECT" || control.type === "text") datos[control.name] = control.value;
  }
  return datos;
}

// Lo contrario: escribe los datos y avisa de los cambios, para que el formulario se acomode
// (incógnita y opciones primero: deciden qué campos se ven).
function escribirFormulario(form, datosGuardados) {
  const datos = { ...datosGuardados };
  // El tipo de cada tasa, como se ve en pantalla (también los guardados antes de los tres tipos).
  for (const lugar of form.querySelectorAll("[data-tasa]")) {
    const tipo = `${lugar.dataset.tasa}-tipo`;
    const periodo = `${lugar.dataset.tasa}-periodo`;
    if (datos[tipo] === undefined) continue;
    const enPantalla = tipoEnPantalla(datos[tipo], datos[periodo] ?? form.elements[periodo].value);
    datos[tipo] = enPantalla.tipo;
    datos[periodo] = enPantalla.periodo;
  }
  const radios = Object.keys(datos).filter((nombre) => form.querySelector(`input[type="radio"][name="${nombre}"]`));
  const orden = [
    ...radios.filter((nombre) => nombre === "incognita"),
    ...radios.filter((nombre) => nombre !== "incognita"),
    ...Object.keys(datos).filter((nombre) => !radios.includes(nombre)),
  ];
  for (const nombre of orden) {
    const valor = datos[nombre];
    const radio = form.querySelector(`input[type="radio"][name="${nombre}"][value="${valor}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      continue;
    }
    const control = form.elements[nombre];
    if (!control || control instanceof RadioNodeList) continue;
    control.value = valor;
    control.dispatchEvent(new Event(control.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  }
}

// Prepara un formulario de módulo. claves(): las claves activas (por defecto, la incógnita)
// que deciden qué campos se ven (data-para).
function prepararFormulario(form, { claves } = {}) {
  insertarControlesDeTasa(form);
  const radio = (nombre) => form.querySelector(`input[name="${nombre}"]:checked`);
  const campo = (nombre) => form.querySelector(`[data-campo="${nombre}"]`);
  const entrada = (nombre) => form.elements[nombre];
  const errorGeneral = form.querySelector(".error-general");

  const api = {
    form,
    marcado: (nombre) => radio(nombre)?.value,
    incognita: () => radio("incognita")?.value,
    texto: (nombre) => entrada(nombre).value,

    marcar(nombre, valor) {
      const opcion = form.querySelector(`input[name="${nombre}"][value="${valor}"]`);
      opcion.checked = true;
      opcion.dispatchEvent(new Event("change", { bubbles: true }));
    },

    escribir(nombre, texto) {
      entrada(nombre).value = texto;
      api.actualizarLeido(nombre);
    },

    // Solo los campos que pide la incógnita (requisito b). Los ocultos no se pueden enfocar.
    actualizarCampos() {
      const activas = claves ? claves() : new Set([api.incognita()]);
      for (const plegable of form.querySelectorAll(".plegable[data-para]")) {
        const visible = plegable.dataset.para.split(" ").some((clave) => activas.has(clave));
        plegable.classList.toggle("plegable--cerrado", !visible);
        plegable.querySelector(".plegable__interior").inert = !visible;
        if (!visible) for (const caja of plegable.querySelectorAll("[data-campo]")) api.limpiarError(caja.dataset.campo);
      }
    },

    // "Se leyó como $ 1.500.000,5" debajo de los campos de dinero: lo escrito, sin redondear.
    actualizarLeido(nombre) {
      const salida = campo(nombre)?.querySelector(".campo__leido");
      if (!salida) return;
      const lectura = leerNumero(entrada(nombre).value);
      const estabaVacio = salida.textContent === "";
      salida.classList.remove("campo__leido--aviso");
      if (lectura.vacio || lectura.error) {
        salida.textContent = "";
        return;
      }
      const formato = salida.dataset.formato === "uvr" ? (x) => `${formatoHastaCuatro.format(x)} UVR` : pesosLeidos; // como se escribió
      salida.textContent = `Se leyó como ${formato(lectura.valor)}`;
      if (lectura.ambiguo) {
        salida.textContent += `. Si querías ${formato(lectura.valor * 1000)}, escríbelo sin punto.`;
        salida.classList.add("campo__leido--aviso");
      }
      if (estabaVacio) fundir(salida);
    },

    // La forma de una tasa: { tipo, m, modalidad }.
    forma: (prefijo) => formaElegida(api.marcado(`${prefijo}-tipo`), entrada(`${prefijo}-periodo`).value, api.marcado(`${prefijo}-modalidad`)),

    // El periodo de cada tasa sigue a su tipo (fijo en "Anual" con la efectiva anual).
    actualizarPeriodosDeTasa() {
      for (const lugar of form.querySelectorAll("[data-tasa]")) {
        ajustarPeriodoDeTasa(lugar.querySelector("select"), lugar.querySelector("[data-para-selector]"), api.marcado(`${lugar.dataset.tasa}-tipo`));
      }
    },

    // Muestra en vivo a qué tasa del periodo m (periódica o efectiva anual) equivale la tasa escrita (requisito e).
    traducir(prefijo, m, animar = true) {
      const salida = form.querySelector(`[data-traduccion="${prefijo}"] span`);
      if (!salida) return;
      const p = PERIODICIDADES[m];
      const lectura = leerNumero(entrada(prefijo).value);
      let texto;
      if (lectura.vacio || lectura.error || lectura.valor <= 0) texto = `Se convertirá a tasa ${p.nombreTasa}, la de los pagos.`;
      else {
        const tasa = { valor: lectura.valor / 100, ...api.forma(prefijo) };
        const conversion = convertirTasa(tasa, { tipo: "efectiva", m, modalidad: "vencida" });
        if (!Number.isFinite(conversion.valor)) texto = "Una tasa anticipada por periodo debe ser menor que 100 %.";
        else if (conversion.pasos.length === 0) texto = `${describirTasa(tasa)}: ya está en el periodo de los pagos.`;
        else texto = `${describirTasa(tasa)} = ${porcentaje(conversion.valor)} ${p.nombreTasa}`;
      }
      if (texto === salida.textContent) return;
      salida.textContent = texto;
      if (animar) fundir(salida.parentElement);
    },

    // ----- Lectura y validación (catálogo de docs/04-requisitos-de-la-app.md) -----

    // Un número positivo: dinero, número de pagos, valor de la UVR…
    positivo(nombre, faltante, cero, errores) {
      const lectura = leerNumero(entrada(nombre).value);
      if (lectura.vacio) errores[nombre] = faltante;
      else if (lectura.error) errores[nombre] = lectura.error;
      else if (lectura.valor <= 0) errores[nombre] = cero;
      else return lectura.valor;
    },

    dinero: (nombre, descripcion, errores) =>
      api.positivo(nombre, `Falta ${descripcion} (${nombre}).`, `${mayuscula(descripcion)} debe ser mayor que cero.`, errores),

    // Un porcentaje que puede ser cero (puntos) o positivo; en decimal.
    porcentaje(nombre, descripcion, errores, { permiteCero = false } = {}) {
      const lectura = leerNumero(entrada(nombre).value);
      if (lectura.vacio) errores[nombre] = `Falta ${descripcion}.`;
      else if (lectura.error) errores[nombre] = lectura.error;
      else if (lectura.valor < 0 || (!permiteCero && lectura.valor === 0)) errores[nombre] = `${mayuscula(descripcion)} debe ser mayor que 0 %.`;
      else return lectura.valor / 100;
    },

    // Una tasa con su forma: { valor (decimal), tipo, m, modalidad }.
    tasa(prefijo, errores) {
      const lectura = leerNumero(entrada(prefijo).value);
      if (lectura.vacio) errores[prefijo] = "Falta la tasa de interés.";
      else if (lectura.error) errores[prefijo] = lectura.error;
      else if (lectura.valor <= 0) errores[prefijo] = "La tasa debe ser mayor que 0 %.";
      else {
        const tasa = { valor: lectura.valor / 100, ...api.forma(prefijo) };
        const porPeriodo = tasa.tipo === "nominal" ? nominalAPeriodica(tasa.valor, tasa.m) : tasa.valor; // Hoja 1.1
        if (tasa.modalidad === "anticipada" && porPeriodo >= 1) errores[prefijo] = "Una tasa anticipada por periodo debe ser menor que 100 %.";
        else return tasa;
      }
    },

    limpiarError(nombre) {
      const caja = campo(nombre);
      if (!caja) return;
      caja.classList.remove("campo--error");
      caja.querySelector(".campo__error").textContent = "";
      entrada(nombre)?.removeAttribute?.("aria-invalid");
    },

    limpiarErrores() {
      for (const caja of form.querySelectorAll("[data-campo]")) api.limpiarError(caja.dataset.campo);
      if (errorGeneral) errorGeneral.hidden = true;
    },

    mostrarErrores(errores) {
      let primero = null;
      for (const [nombre, mensaje] of Object.entries(errores)) {
        const caja = campo(nombre);
        caja.classList.add("campo--error");
        const salida = caja.querySelector(".campo__error");
        salida.innerHTML = '<svg class="icono" width="16" height="16" aria-hidden="true"><use href="#i-alerta"/></svg><span></span>';
        salida.querySelector("span").textContent = mensaje;
        entrada(nombre).setAttribute("aria-invalid", "true");
        sacudir(caja);
        primero ??= nombre;
      }
      vibrar([14, 60, 14]);
      entrada(primero).focus();
    },

    mostrarErrorGeneral(mensaje) {
      errorGeneral.textContent = mensaje;
      errorGeneral.hidden = false;
      vibrar([14, 60, 14]);
    },

    // Deja vacíos los campos de texto (las opciones se quedan como están).
    vaciar() {
      for (const control of form.elements) if (control.type === "text") control.value = "";
      api.limpiarErrores();
      for (const caja of form.querySelectorAll("[data-campo]")) api.actualizarLeido(caja.dataset.campo);
    },
  };

  // Cada campo que se corrige pierde su error; los de dinero muestran cómo se leyeron.
  form.addEventListener("input", (evento) => {
    const nombre = evento.target.name;
    if (!nombre) return;
    api.limpiarError(nombre);
    api.actualizarLeido(nombre);
    marcarDesactualizado();
  });
  form.addEventListener("change", (evento) => {
    marcarDesactualizado();
    if (evento.target.type === "radio") api.actualizarCampos();
    api.actualizarPeriodosDeTasa();
  });
  prepararSegmentados(form);
  api.actualizarCampos();
  api.actualizarPeriodosDeTasa();
  return api;
}

// Botones de los formularios de los módulos: Calcular, Limpiar y Cargar un ejemplo.
function conectarAcciones(modulo, { ejemplo }) {
  const { formulario } = modulo;
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    calcularModulo(modulo);
  });
  formulario.querySelector('[data-accion="limpiar"]').addEventListener("click", () => modulo.limpiar());
  formulario.querySelector('[data-accion="ejemplo"]').addEventListener("click", () => {
    ejemplo();
    marcarDesactualizado();
  });
  for (const boton of formulario.querySelectorAll(".boton")) boton.addEventListener("pointerdown", ondaAlTocar);
}

// Una línea de "¿Cómo se calculó?" por cada conversión de la tasa, con su número de fórmula.
function lineasDeConversion(conversion) {
  return conversion.pasos.map((paso) => `${insignia(paso.formula)}${NOMBRES_CONVERSION[paso.formula]}: ${formula(expresionConversion(paso))}`);
}

// Paso "Tasa periódica …" (o "Tasa efectiva anual") del procedimiento: convierte la tasa a la unidad de los pagos.
function pasoDeTasa(tasa, conversion, p) {
  const titulo = `Tasa ${p.nombreTasa}`;
  const final = formula(`${variable("i")} = ${decimal(conversion.valor)}`);
  if (!conversion.pasos.length) return { titulo, lineas: [`La tasa ya está en el periodo de los pagos; se usa tal cual: ${final}`] };
  return { titulo, lineas: [...lineasDeConversion(conversion), `Tasa para el cálculo: ${final} (${porcentaje(conversion.valor)} ${p.nombreTasa})`] };
}

// ----- Cadenas de conversión (conversión de tasas y tasas indexadas) -----

// Nombre de una forma de tasa, sin el valor: "nominal anual trimestre anticipado".
function describirForma(forma) {
  return describirTasa({ ...forma, valor: 0 }).replace(/^0,00\s%\s/, ""); // el espacio antes de % es de no separación
}

// "1.1, 1.5 y 1.6"
function listaDeFormulas(lista) {
  return lista.length > 1 ? `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}` : lista[0] || "";
}

// La forma de la tasa después de cada paso del procedimiento general.
function formaDespuesDe(forma, paso) {
  switch (paso.formula) {
    case "1.1": return { ...forma, tipo: "efectiva" };
    case "3.2": return { ...forma, modalidad: "vencida" };
    case "1.5": return { tipo: "efectiva", m: 1, modalidad: "vencida" };
    case "1.6": return { tipo: "efectiva", m: paso.m, modalidad: "vencida" };
    case "3.1": return { ...forma, modalidad: "anticipada" };
    case "1.2": return { ...forma, tipo: "nominal", m: paso.m };
    default: return forma;
  }
}

// Nodos de la cadena (visuales.js): el de partida y uno por cada paso de la conversión.
function nodosDeConversion(inicio, forma, conversion) {
  const nodos = [inicio];
  let actual = { tipo: forma.tipo, m: forma.m, modalidad: forma.modalidad };
  for (const paso of conversion.pasos) {
    actual = formaDespuesDe(actual, paso);
    nodos.push({
      tipo: "paso",
      formula: paso.formula,
      nombre: NOMBRES_CONVERSION[paso.formula],
      expresion: expresionConversion(paso),
      valor: `${porcentaje(paso.valor)} ${describirForma(actual)}`,
    });
  }
  return nodos;
}

// Lo que dice "Explícame" de cada paso de una conversión.
function textoDeConversion(paso) {
  const p = PERIODICIDADES[paso.m];
  const e = porcentaje(paso.entrada);
  const r = porcentaje(paso.valor);
  switch (paso.formula) {
    case "1.1":
      return `Una tasa nominal se reparte entre los ${paso.m} periodos del año: ${e} entre ${paso.m} da ${r} ${p.nombreTasa}.`;
    case "3.2":
      return `Una tasa anticipada se pasa a vencida: ${e} entre (1 menos ${e}) da ${r}. Es mayor, porque el interés anticipado se cobra al inicio.`;
    case "1.5":
      return `Con la tasa de cada ${p.singular} se capitaliza todo el año: (1 + ${e}) elevado a ${paso.m}, menos 1, da ${r} efectiva anual. Es más que ${paso.m} veces la tasa, porque los intereses también ganan intereses.`;
    case "1.6":
      return `De la efectiva anual se saca la tasa de cada ${p.singular}: (1 + ${e}) elevado a 1/${paso.m}, menos 1, da ${r} ${p.nombreTasa}.`;
    case "3.1":
      return `Para expresarla anticipada: ${e} entre (1 + ${e}) da ${r}. Es menor, porque se cobra un periodo antes.`;
    default:
      return `Como nominal anual se multiplica por los ${paso.m} periodos: ${e} por ${paso.m} da ${r}.`;
  }
}
