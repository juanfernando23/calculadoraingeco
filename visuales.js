/* visuales.js
 * Cadena de conversión (A3 de docs/09-animaciones.md): los pasos para pasar una tasa de una
 * forma a otra, uno debajo del otro, cada uno con su número de fórmula de la hoja de clase.
 * La usan conversión de tasas y tasas indexadas. Es HTML (se puede leer y copiar), no un dibujo.
 *
 * Tipos de nodo:
 *   origen     la tasa de la que se parte                 { etiqueta, valor }
 *   paso       una conversión                             { formula, nombre, expresion, valor }
 *   suma       indexación lineal (4.2): dos bloques que se juntan
 *              { formula, nombre, partes: [{ texto, valor (decimal), etiqueta }], expresion, valor }
 *   combinada  fórmula combinada (4.1): (1 + i1)(1 + i2), con el "interés del interés" aparte
 *              { formula, nombre, a: { texto, etiqueta }, b: { texto, etiqueta }, cruce, expresion, valor, nota }
 *   resultado  la tasa equivalente                        { etiqueta, valor }
 *
 * Como los gráficos de animaciones.js: construir, actualizar, cambiarTipo, irA y destruir.
 * datos: { nodos, lectura (resumen para la línea de arriba), alLeer(texto), descripcion }
 */

function crearCadena(contenedor, datosIniciales) {
  let datos = datosIniciales;
  let animaciones = []; // las de la construcción en curso, para poder saltarlas
  let destruido = false;

  const escapar = (texto) => String(texto).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  function marcador(nodo) {
    if (nodo.tipo === "origen" || nodo.tipo === "resultado") return '<span class="cadena__marca" aria-hidden="true"></span>';
    return `<span class="cadena__marca cadena__marca--formula" aria-hidden="true">${escapar(nodo.formula)}</span>`;
  }

  // Bloques de la suma: el índice y los puntos, con largo proporcional a su valor.
  function bloquesDeSuma(nodo) {
    const total = nodo.partes.reduce((suma, parte) => suma + parte.valor, 0) || 1;
    return `<div class="cadena__suma" aria-hidden="true">
      <div class="cadena__barra">${nodo.partes
        .map((parte, k) => `<span class="cadena__bloque cadena__bloque--${k}" style="--parte: ${parte.valor / total}"></span>`)
        .join("")}</div>
      <div class="cadena__partes">${nodo.partes
        .map((parte, k) => `<span class="cadena__parte cadena__parte--${k}">${escapar(parte.texto)} <strong>${escapar(parte.etiqueta)}</strong></span>`)
        .join('<span class="cadena__mas">+</span>')}</div>
    </div>`;
  }

  // Cuadro de la fórmula combinada: (1 + a)(1 + b) = 1 + a + b + a·b. Las franjas no van a
  // escala (serían casi invisibles): lo que importa es que aparece la esquina a·b.
  function cuadroCombinado(nodo) {
    return `<div class="cadena__cuadro" aria-hidden="true">
      <span class="cadena__celda cadena__celda--uno">1</span>
      <span class="cadena__celda cadena__celda--b">${escapar(nodo.b.texto)}</span>
      <span class="cadena__celda cadena__celda--a">${escapar(nodo.a.texto)}</span>
      <span class="cadena__celda cadena__celda--cruce">${escapar(nodo.a.texto)}·${escapar(nodo.b.texto)}</span>
    </div>`;
  }

  function cuerpo(nodo) {
    if (nodo.tipo === "origen" || nodo.tipo === "resultado") {
      return `<p class="cadena__etiqueta">${escapar(nodo.etiqueta)}</p><p class="cadena__valor" data-valor>${escapar(nodo.valor)}</p>`;
    }
    const extra = nodo.tipo === "suma" ? bloquesDeSuma(nodo) : nodo.tipo === "combinada" ? cuadroCombinado(nodo) : "";
    return `<p class="cadena__nombre">${escapar(nodo.nombre)}</p>
      ${extra}
      <p class="cadena__expresion formula" data-expresion>${nodo.expresion}</p>
      <p class="cadena__valor" data-valor>= ${escapar(nodo.valor)}</p>
      ${nodo.nota ? `<p class="cadena__nota" data-nota>${escapar(nodo.nota)}</p>` : ""}`;
  }

  function pintar() {
    contenedor.innerHTML = `<ol class="cadena" aria-label="${escapar(datos.descripcion || "Pasos de la conversión")}">${datos.nodos
      .map((nodo, k) => `<li class="cadena__nodo cadena__nodo--${nodo.tipo}" data-indice="${k}">${marcador(nodo)}<div class="cadena__cuerpo">${cuerpo(nodo)}</div></li>`)
      .join("")}</ol>`;
  }

  const nodosDOM = () => [...contenedor.querySelectorAll(".cadena__nodo")];

  function detener() {
    for (const animacion of animaciones) animacion.finish?.();
    animaciones = [];
  }

  // Los pasos aparecen uno tras otro, como si la tasa bajara por la cadena: la línea crece
  // hasta el paso, la marca aparece con un rebote leve y el texto entra desde la izquierda.
  function construir() {
    detener();
    pintar();
    datos.alLeer?.(datos.lectura);
    const nodos = nodosDOM();
    if (movimientoReducido()) {
      animaciones = [contenedor.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: "ease-out" })];
      return;
    }
    const intervalo = Math.min(520, 3200 / nodos.length);
    const entrar = "cubic-bezier(0.16, 1, 0.3, 1)";
    nodos.forEach((nodo, k) => {
      const inicio = 120 + k * intervalo;
      const lista = [
        // La línea hacia el siguiente paso crece justo después de que este aparece.
        nodo.animate([{ "--linea": 0 }, { "--linea": 1 }], { duration: intervalo * 0.9, delay: inicio + 180, easing: "linear", fill: "both" }),
        nodo.querySelector(".cadena__marca").animate(
          [{ transform: "scale(0.4)", opacity: 0 }, { transform: "scale(1.08)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }],
          { duration: 420, delay: inicio, easing: entrar, fill: "both" }
        ),
        nodo.querySelector(".cadena__cuerpo").animate([{ transform: "translateX(-12px)", opacity: 0 }, { transform: "none", opacity: 1 }], {
          duration: 520,
          delay: inicio + 60,
          easing: entrar,
          fill: "both",
        }),
      ];
      // La suma: el bloque de los puntos llega y se pega al del índice.
      const bloque = nodo.querySelector(".cadena__bloque--1");
      if (bloque) lista.push(bloque.animate([{ transform: "translateX(40px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 600, delay: inicio + 260, easing: entrar, fill: "both" }));
      // La combinada: las franjas aparecen y al final la esquina del interés del interés.
      nodo.querySelectorAll(".cadena__celda").forEach((celda, c) => {
        lista.push(celda.animate([{ transform: "scale(0.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, delay: inicio + 200 + c * 160, easing: entrar, fill: "both" }));
      });
      animaciones.push(...lista);
    });
    // Al final, el resultado se ilumina una vez.
    const ultimo = nodos[nodos.length - 1];
    animaciones.push(
      ultimo.animate([{ boxShadow: "0 0 0 0 var(--primario-suave)" }, { boxShadow: "0 0 0 10px transparent" }], {
        duration: 900,
        delay: 120 + nodos.length * intervalo + 200,
        easing: "ease-out",
      })
    );
  }

  // Mismos pasos con otros números (recalcular o "¿Y si…?"): se cambian los textos en su sitio.
  // Si cambia la cantidad o el tipo de pasos, hay que construir de nuevo (devuelve false).
  function actualizar(nuevos, { enVivo = false } = {}) {
    const mismos = nuevos.nodos.length === datos.nodos.length && nuevos.nodos.every((nodo, k) => nodo.tipo === datos.nodos[k].tipo && nodo.formula === datos.nodos[k].formula);
    if (!mismos || destruido) return false;
    detener();
    datos = nuevos;
    nodosDOM().forEach((elemento, k) => {
      const nodo = datos.nodos[k];
      const cambiar = (selector, html) => {
        const destino = elemento.querySelector(selector);
        if (!destino || destino.innerHTML === html) return;
        destino.innerHTML = html;
        if (!enVivo && !movimientoReducido()) destino.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
      };
      cambiar("[data-valor]", escapar(nodo.tipo === "origen" || nodo.tipo === "resultado" ? nodo.valor : `= ${nodo.valor}`));
      if (nodo.expresion) cambiar("[data-expresion]", nodo.expresion);
      if (nodo.nota) cambiar("[data-nota]", escapar(nodo.nota));
      if (nodo.tipo === "suma") {
        const total = nodo.partes.reduce((suma, parte) => suma + parte.valor, 0) || 1;
        elemento.querySelectorAll(".cadena__bloque").forEach((bloque, p) => bloque.style.setProperty("--parte", nodo.partes[p].valor / total));
        elemento.querySelectorAll(".cadena__parte strong").forEach((etiqueta, p) => (etiqueta.textContent = nodo.partes[p].etiqueta));
      }
    });
    datos.alLeer?.(datos.lectura);
    return true;
  }

  // "Explícame": resalta un paso (los demás se atenúan) o todos ({ paso: "todos" }).
  function irA(vista) {
    detener();
    const elegido = vista?.paso ?? "todos";
    for (const elemento of nodosDOM()) {
      const k = Number(elemento.dataset.indice);
      elemento.classList.toggle("cadena__nodo--atenuado", elegido !== "todos" && k !== elegido);
      elemento.classList.toggle("cadena__nodo--resaltado", k === elegido);
    }
  }

  return {
    construir,
    actualizar,
    irA,
    cambiarTipo() {},
    destruir() {
      destruido = true;
      detener();
      contenedor.innerHTML = "";
    },
  };
}
