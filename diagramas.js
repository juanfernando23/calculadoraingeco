/* diagramas.js
 * Diagrama de los pagos de una anualidad y de una perpetuidad (A1, A2 y A6 de
 * docs/09-animaciones.md), en canvas:
 *   - flujo: la línea de tiempo con cada pago A, el valor presente (P) o futuro (F) y el
 *     "viaje" de cada pago hasta esa fecha: descontado a hoy o capitalizado hasta el final.
 *   - valor (anualidades): cuánto vale cada pago en esa fecha, con su parte de intereses.
 *   - suma (perpetua): cómo la suma de infinitos pagos se acerca a P = A / i sin pasarlo.
 * Aquí no se calcula nada financiero nuevo: lo que vale un pago en otra fecha sale de
 * finanzas.js (Hoja 2.1 y 2.2), igual que P, F, A, n e i (secciones 5, 6 y 7).
 *
 * datos: {
 *   modalidad      "vencida" | "anticipada" | "perpetua"
 *   incognita      "P" | "F" | "A" | "n" | "i"
 *   base           "P" | "F": el valor que reemplaza a los pagos (perpetua: "P")
 *   P, F, A, i, n  ya calculados (n: número de pagos; en la perpetua no se usa)
 *   singular, plural, tasa ("1,20 % mensual")
 *   vista, dinero, dineroCompacto, numero, porcentaje, descripcion, alLeer
 * }
 * Como los demás gráficos: construir, actualizar, cambiarTipo, irA y destruir.
 */

// Qué se ve en cada enfoque de "Explícame" (0 a 1).
const ENFOQUES_PAGOS = {
  todo: { pagos: 1, grande: 1, arcos: 1 },
  pagos: { pagos: 1, grande: 0.25, arcos: 0 },
  grande: { pagos: 0.35, grande: 1, arcos: 0.3 },
  viaje: { pagos: 1, grande: 0.6, arcos: 1 },
};

// Tramos de la construcción (0 a 1): eje, la flecha grande (P o F), los pagos, el viaje de
// cada pago y, al final, la incógnita que pasa de "?" a su valor.
const FASES_PAGOS = { eje: [0, 0.16], grande: [0.12, 0.3], pagos: [0.22, 0.52], arcos: [0.5, 0.84], resolver: [0.88, 1] };

function crearDiagramaPagos(canvas, datosIniciales) {
  let datos = datosIniciales;
  let modelo = modeloDePagos(datos);
  let vista = datos.vista || "flujo";
  let lienzo = null;
  let colores = leerColores(canvas);
  let avance = 0; // de la construcción; 1 = completo
  let construido = false;
  let enfoque = { ...ENFOQUES_PAGOS.todo, arco: null, nota: false };
  let transicion = null; // { foto (lienzo anterior), barras anteriores, mezcla, enVivo }
  let cambioVista = null; // { foto, mezcla }
  let saltarCambio = null;
  // Vistas que ya se dibujaron con este cálculo. Las demás se estrenan: se dibujan desde cero,
  // como al calcular, mientras se desvanece una foto de la anterior (salida).
  const vistas = new Set();
  let salida = null;
  let anillo = null;
  const guia = { k: null, alfa: 0, x: 0 };
  let saltarAnimacion = null;
  let saltarPulso = null;
  let temporizadorPulso = 0;
  let enPantalla = false;
  let pendiente = false;
  let destruido = false;

  // ----- Modelo: pagos, eje y valores -----

  function modeloDePagos(d) {
    const perpetua = d.modalidad === "perpetua";
    const anticipada = d.modalidad === "anticipada";
    const N = perpetua ? 5 : Math.max(1, Math.ceil(d.n - 1e-9)); // pagos (el último, menor si n no es entero)
    const fraccion = !perpetua && !esEntero(d.n);
    const fin = perpetua ? 5 : N; // último periodo del eje
    const eje = perpetua ? { marcas: [0, 1, 2, 3, 4, 5].map((k) => ({ k, u: k })), conCorte: true, uFin: 7, n: 5 } : ejeDelFlujo(fin);
    const pagos = [];
    for (let j = 0; j < N; j++) pagos.push(anticipada ? j : j + 1);
    // Lo que vale el pago del periodo p en la fecha de la base: hoy (Hoja 2.2) o al final (Hoja 2.1).
    const valorDe = (p) => (d.base === "F" ? vfCompuesto(d.A, d.i, fin - p) : vpCompuesto(d.A, d.i, p));
    const visibles = pagos.filter((p) => eje.marcas.some((marca) => marca.k === p));
    // Vista "valor": una barra por pago completo (agrupadas si son muchas).
    const completos = fraccion ? pagos.slice(0, -1) : pagos;
    const salto = Math.max(1, Math.ceil(completos.length / MAX_BARRAS));
    const barras = completos.filter((p, j) => j % salto === 0 || j === completos.length - 1).map((p) => {
      const valor = valorDe(p);
      return d.base === "F" ? { p, capital: d.A, interes: valor - d.A, valor } : { p, capital: valor, interes: d.A - valor, valor };
    });
    // Vista "suma" (perpetua): fracción de P que cubren los primeros k pagos, hasta el 99 %.
    const kMax = perpetua ? Math.min(1200, Math.max(10, Math.ceil(Math.log(100) / Math.log(1 + d.i)))) : 0;
    return { perpetua, anticipada, N, fraccion, fin, eje, pagos, visibles, valorDe, barras, kMax };
  }

  const nombrePeriodo = () => datos.singular.charAt(0).toUpperCase() + datos.singular.slice(1);
  const unidadDe = (n) => (Math.abs(n - 1) < 1e-9 ? datos.singular : datos.plural);

  // Fracción de P que cubren los primeros k pagos de la perpetuidad: VP de k pagos (Hoja 5.1)
  // entre P = A / i.
  const cubierto = (k, d = datos) => (k <= 0 ? 0 : vpAnualidadVencida(d.A, d.i, k) / vpPerpetuidad(d.A, d.i));

  // ----- Ayudas de dibujo -----

  function flecha(ctx, x, y0, y1, color, alfa, discontinua = false, grosor = 2.5) {
    if (alfa <= 0.01 || Math.abs(y1 - y0) < 1) return;
    const sentido = Math.sign(y1 - y0);
    const punta = Math.min(9, Math.abs(y1 - y0) * 0.6);
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = grosor;
    ctx.lineCap = "round";
    ctx.setLineDash(discontinua ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1 - sentido * punta * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x - 5, y1 - sentido * punta);
    ctx.lineTo(x + 5, y1 - sentido * punta);
    ctx.closePath();
    ctx.fill();
  }

  function punto(ctx, x, y, alfa) {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 12);
    halo.addColorStop(0, conAlfa(colores.interes, 0.45));
    halo.addColorStop(1, conAlfa(colores.interes, 0));
    ctx.globalAlpha = alfa;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colores.interes;
    ctx.strokeStyle = colores.superficie;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function burbuja(ctx, texto, x, base, alfa, fondo = colores.textoFuerte, colorTexto = colores.superficie) {
    if (alfa <= 0.01) return;
    ctx.font = `600 11.5px ${colores.fuente}`;
    const ancho = ctx.measureText(texto).width + 16;
    const alto = 22;
    const izquierda = Math.min(Math.max(x - ancho / 2, 2), lienzo.width - ancho - 2);
    const arriba = Math.max(2, base - alto);
    ctx.globalAlpha = alfa;
    ctx.fillStyle = fondo;
    rectanguloRedondeado(ctx, izquierda, arriba, ancho, alto, 11);
    ctx.fill();
    ctx.fillStyle = colorTexto;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, izquierda + ancho / 2, arriba + alto / 2 + 0.5);
  }

  // Texto que pasa de "?" a su valor: el anterior sube y se va; el nuevo entra desde abajo.
  function relevo(ctx, viejo, nuevo, s, dibujar) {
    if (viejo === nuevo || s >= 1) return dibujar(nuevo, 1, 0);
    if (s < 0.5) dibujar(viejo, 1 - 2 * s, -8 * s);
    else dibujar(nuevo, 2 * s - 1, 8 * (1 - s));
  }

  // Texto con un halo del color del fondo, para que se lea aunque pase una línea por detrás.
  function escribir(ctx, texto, x, y, { alinear = "left", peso = 600, tamano = 12, color = colores.textoFuerte, alfa = 1 } = {}) {
    if (alfa <= 0.01) return;
    ctx.globalAlpha = alfa;
    ctx.font = `${peso} ${tamano}px ${colores.fuente}`;
    ctx.textAlign = alinear;
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = colores.superficie;
    ctx.strokeText(texto, x, y);
    ctx.fillStyle = color;
    ctx.fillText(texto, x, y);
  }

  const fase = (rango) => (avance >= 1 ? 1 : tramo(avance, rango));

  // ----- Vista "flujo" -----

  function medidasFlujo() {
    const { width, height } = lienzo;
    const izquierda = 26;
    const derecha = width - 30;
    const xEn = (k) => izquierda + (unidadEnEje(modelo.eje, k) / modelo.eje.uFin) * (derecha - izquierda);
    if (modelo.perpetua) {
      const largoPago = 40;
      const yEje = 30 + largoPago + 6;
      return { izquierda, derecha, xEn, yEje, largoPago, largoGrande: Math.max(40, height - 44 - yEje), abajo: height - 8 };
    }
    const largoPago = 36;
    const yEje = Math.min(height - 54 - largoPago, 150);
    return { izquierda, derecha, xEn, yEje, largoPago, largoGrande: yEje - 34, abajo: height - 8 };
  }

  // Arco del viaje de un pago: de su periodo hasta la base (P al inicio o F al final).
  function arcoDe(f, p) {
    const xBase = datos.base === "F" ? f.xEn(modelo.fin) - 6 : f.xEn(0) + 6;
    const xPago = f.xEn(p);
    const arriba = !modelo.perpetua; // en la perpetua los pagos suben, así que el viaje va por debajo
    const y = arriba ? f.yEje - 4 : f.yEje + 4;
    const alto = Math.min(arriba ? f.largoGrande * 0.82 : f.largoGrande * 0.7, 20 + Math.abs(xPago - xBase) * 0.42);
    return { desde: { x: xPago, y }, hacia: { x: xBase, y }, control: { x: (xPago + xBase) / 2, y: arriba ? y - 2 * alto : y + 2 * alto } };
  }

  const enArco = (a, t) => {
    const u = 1 - t;
    return { x: u * u * a.desde.x + 2 * u * t * a.control.x + t * t * a.hacia.x, y: u * u * a.desde.y + 2 * u * t * a.control.y + t * t * a.hacia.y };
  };

  function dibujarArco(ctx, a, alcance, alfa, grosor = 1.8) {
    if (alcance <= 0.001 || alfa <= 0.01) return;
    const extremo = enArco(a, alcance);
    const control = { x: mezclar(a.desde.x, a.control.x, alcance), y: mezclar(a.desde.y, a.control.y, alcance) };
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = colores.interes;
    ctx.lineWidth = grosor;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.desde.x, a.desde.y);
    ctx.quadraticCurveTo(control.x, control.y, extremo.x, extremo.y);
    ctx.stroke();
    if (alcance >= 0.999) {
      const angulo = Math.atan2(a.hacia.y - a.control.y, a.hacia.x - a.control.x);
      ctx.fillStyle = colores.interes;
      ctx.beginPath();
      ctx.moveTo(a.hacia.x, a.hacia.y);
      ctx.lineTo(a.hacia.x - 8 * Math.cos(angulo - 0.45), a.hacia.y - 8 * Math.sin(angulo - 0.45));
      ctx.lineTo(a.hacia.x - 8 * Math.cos(angulo + 0.45), a.hacia.y - 8 * Math.sin(angulo + 0.45));
      ctx.closePath();
      ctx.fill();
    } else punto(ctx, extremo.x, extremo.y, alfa);
  }

  // Lo que dice una burbuja sobre un pago: cuánto vale en la fecha de la base.
  function textoDelPago(p) {
    const valor = datos.dinero(modelo.valorDe(p));
    return datos.base === "F" ? `Pago del ${datos.singular} ${datos.numero(p)}: al final vale ${valor}` : `Pago del ${datos.singular} ${datos.numero(p)}: hoy vale ${valor}`;
  }

  function dibujarFlujo(ctx, alfaVista) {
    const f = medidasFlujo();
    const d = datos;
    const { yEje } = f;
    const atenuar = mezclar(1, 0.45, guia.alfa);
    const avEje = entradaSalida(fase(FASES_PAGOS.eje));
    const avGrande = fase(FASES_PAGOS.grande);
    const avPagos = fase(FASES_PAGOS.pagos);
    const avArcos = fase(FASES_PAGOS.arcos);
    const resuelta = fase(FASES_PAGOS.resolver);
    const oculta = (letra) => d.incognita === letra && resuelta < 0.5;

    // Eje del tiempo con su punta (en la perpetua sigue hasta el infinito).
    const inicioEje = f.izquierda - 14;
    const finEje = lienzo.width - 6;
    ctx.globalAlpha = alfaVista;
    ctx.strokeStyle = colores.meta;
    ctx.fillStyle = colores.meta;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(inicioEje, yEje);
    ctx.lineTo(mezclar(inicioEje, finEje, avEje), yEje);
    ctx.stroke();
    if (avEje > 0.98) {
      ctx.beginPath();
      ctx.moveTo(finEje + 2, yEje);
      ctx.lineTo(finEje - 7, yEje - 4.5);
      ctx.lineTo(finEje - 7, yEje + 4.5);
      ctx.closePath();
      ctx.fill();
    }

    // Marcas y números de los periodos (aparecen cuando el eje pasa por ellas).
    const ultima = modelo.eje.marcas[modelo.eje.marcas.length - 1];
    for (const marca of modelo.eje.marcas) {
      const x = f.xEn(marca.k);
      const alfa = alfaVista * Math.min(Math.max((avEje * (finEje - inicioEje) - (x - inicioEje)) / 30, 0), 1);
      if (alfa <= 0.01) continue;
      ctx.globalAlpha = alfa;
      ctx.strokeStyle = colores.meta;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, yEje - 4);
      ctx.lineTo(x, yEje + 4);
      ctx.stroke();
      const esFinal = marca === ultima && !modelo.perpetua;
      const texto = datos.numero(marca.k);
      const dibujar = (t, a, dy) => escribir(ctx, t, Math.min(x, lienzo.width - 10), f.abajo + dy, { alinear: "center", peso: esFinal ? 600 : 500, tamano: 11, color: esFinal ? colores.textoFuerte : colores.texto, alfa: alfa * a });
      if (esFinal && d.incognita === "n") relevo(ctx, "?", texto, resuelta, dibujar);
      else dibujar(texto, 1, 0);
    }
    const alfaCorte = alfaVista * Math.min(Math.max(avEje * 2 - 1, 0), 1);
    if (modelo.eje.conCorte && !modelo.perpetua) escribir(ctx, "…", f.izquierda + (4 / modelo.eje.uFin) * (f.derecha - f.izquierda), f.abajo, { alinear: "center", peso: 500, tamano: 11, color: colores.texto, alfa: alfaCorte });
    if (modelo.perpetua) {
      escribir(ctx, "…", f.izquierda + (6 / 7) * (f.derecha - f.izquierda), yEje - 10, { alinear: "center", peso: 700, tamano: 14, color: colores.linea, alfa: alfaCorte * enfoque.pagos });
      escribir(ctx, "∞", finEje - 4, f.abajo, { alinear: "right", peso: 600, tamano: 13, color: colores.textoFuerte, alfa: alfaCorte });
    }

    // El viaje de cada pago hasta la base, uno tras otro (descontado o capitalizado).
    const visibles = modelo.visibles;
    const enLaBase = (p) => p === (datos.base === "F" ? modelo.fin : 0); // ese pago no viaja: ya está en la fecha de la base
    visibles.forEach((p, j) => {
      if (enLaBase(p)) return;
      const local = avanceEscalonado(avArcos, j, visibles.length, 0.55);
      let alfa = 0.6 * enfoque.arcos;
      if (enfoque.arco === "primero") alfa = j === 0 ? 1 : 0.1;
      if (enfoque.arco === "ultimo") alfa = j === visibles.length - 1 ? 1 : 0.1;
      if (guia.k !== null) alfa *= 0.3;
      dibujarArco(ctx, arcoDe(f, p), entradaSalida(local), alfaVista * alfa * atenuar);
    });

    // Pagos: flechas iguales (bajan en la anualidad: sale dinero; suben en la perpetua: entra).
    const sentido = modelo.perpetua ? -1 : 1;
    const colorPagos = modelo.perpetua ? colores.linea : colores.capital;
    const discontinuaA = d.incognita === "A" ? 1 - resuelta : 0;
    visibles.forEach((p, j) => {
      const local = avanceEscalonado(avPagos, j, visibles.length, 0.5);
      if (local <= 0) return;
      const menor = modelo.fraccion && p === modelo.pagos[modelo.pagos.length - 1];
      const largo = f.largoPago * (menor ? 0.55 : 1) * (avance >= 1 ? 1 : resorte(Math.min(local * 1.1, 1)));
      const x = f.xEn(p) + (p === 0 && !modelo.perpetua ? 4 : 0); // junto a P, sin encimarse
      const alfa = alfaVista * enfoque.pagos * atenuar;
      flecha(ctx, x, yEje, yEje + sentido * largo, colorPagos, alfa * (1 - discontinuaA));
      flecha(ctx, x, yEje, yEje + sentido * largo, colorPagos, alfa * discontinuaA, true);
    });

    // Flecha grande: P al inicio (o F al final) en la anualidad; P al inicio, hacia abajo, en la perpetua.
    const enF = d.base === "F";
    const xGrande = enF ? f.xEn(modelo.fin) : f.xEn(0);
    const largoGrande = f.largoGrande * (avance >= 1 ? 1 : resorte(Math.min(avGrande * 1.15, 1))) * (avGrande > 0 ? 1 : 0);
    const yPunta = modelo.perpetua ? yEje + largoGrande : yEje - largoGrande;
    const colorGrande = modelo.perpetua ? colores.capital : colores.linea;
    const discontinuaG = d.incognita === d.base ? 1 - resuelta : 0;
    const alfaGrande = alfaVista * enfoque.grande * atenuar;
    flecha(ctx, xGrande, yEje, yPunta, colorGrande, alfaGrande * (1 - discontinuaG));
    flecha(ctx, xGrande, yEje, yPunta, colorGrande, alfaGrande * discontinuaG, true);

    // Rótulos: la flecha grande, la cuota A, la tasa y el número de pagos.
    const letra = d.base;
    const valorGrande = letra === "F" ? d.F : d.P;
    const textoGrande = `${letra} = ${d.dinero(valorGrande)}`;
    const yGrande = modelo.perpetua ? yPunta - 4 : yPunta + 4;
    relevo(ctx, `${letra} = ?`, textoGrande, d.incognita === letra ? resuelta : 1, (t, a, dy) =>
      escribir(ctx, t, enF ? xGrande - 9 : xGrande + 9, yGrande + 8 + dy, { alinear: enF ? "right" : "left", alfa: alfaGrande * a * tramo(avGrande, [0.5, 1]) })
    );
    const primero = visibles[0];
    const xA = Math.max(4, f.xEn(primero) + (modelo.perpetua ? 8 : -6));
    const yA = modelo.perpetua ? yEje - f.largoPago - 8 : yEje + f.largoPago + 15;
    relevo(ctx, "A = ?", `A = ${d.dinero(d.A)}${modelo.perpetua ? " cada " + d.singular : ""}`, d.incognita === "A" ? resuelta : 1, (t, a, dy) =>
      escribir(ctx, t, xA, yA + dy, { alfa: alfaVista * enfoque.pagos * atenuar * a * tramo(avPagos, [0.3, 0.8]) })
    );
    const alfaDatos = alfaVista * atenuar * tramo(avEje, [0.5, 1]);
    const xDatos = enF ? 6 : lienzo.width - 6;
    const alinearDatos = enF ? "left" : "right";
    const yTasa = modelo.perpetua ? yEje + 22 : 15; // en la perpetua, bajo el eje a la derecha (arriba está A)
    relevo(ctx, "i = ?", `i = ${d.tasa}`, d.incognita === "i" ? resuelta : 1, (t, a, dy) =>
      escribir(ctx, t, xDatos, yTasa + dy, { alinear: alinearDatos, peso: d.incognita === "i" ? 600 : 500, tamano: 11.5, color: d.incognita === "i" ? colores.interes : colores.meta, alfa: alfaDatos * a })
    );
    if (!modelo.perpetua) {
      const textoN = `n = ${d.numero(d.n)} ${unidadDe(d.n)}`;
      relevo(ctx, "n = ?", textoN, d.incognita === "n" ? resuelta : 1, (t, a, dy) =>
        escribir(ctx, t, xDatos, 31 + dy, { alinear: alinearDatos, peso: d.incognita === "n" ? 600 : 500, tamano: 11.5, color: d.incognita === "n" ? colores.linea : colores.meta, alfa: alfaDatos * a })
      );
    }

    // Nota de "Explícame" sobre un arco: cuánto vale ese pago en la fecha de la base.
    if (enfoque.nota && enfoque.arco && enfoque.arco !== "todos" && visibles.length) {
      const p = enfoque.arco === "primero" ? visibles[0] : visibles[visibles.length - 1];
      const a = arcoDe(f, p);
      const cima = enArco(a, 0.5);
      burbuja(ctx, `${datos.base === "F" ? "Al final" : "Hoy"} vale ${d.dinero(modelo.valorDe(p))}`, cima.x, modelo.perpetua ? cima.y + 26 : cima.y - 6, alfaVista * enfoque.notaAlfa);
    }

    // Mirar un pago con el dedo: su viaje se resalta y dice cuánto vale en esa fecha.
    if (guia.k !== null && guia.alfa > 0.01) {
      const a = arcoDe(f, guia.k);
      if (!enLaBase(guia.k)) dibujarArco(ctx, a, 1, alfaVista * guia.alfa, 2.4);
      flecha(ctx, f.xEn(guia.k), yEje, yEje + sentido * f.largoPago, colorPagos, alfaVista * guia.alfa, false, 3);
      const cima = enLaBase(guia.k) ? { x: f.xEn(guia.k) + 30, y: yEje - 30 } : enArco(a, 0.5);
      burbuja(ctx, `${datos.base === "F" ? "Al final" : "Hoy"}: ${d.dinero(modelo.valorDe(guia.k))}`, cima.x, modelo.perpetua ? cima.y + 26 : cima.y - 6, alfaVista * guia.alfa);
    }

    // Pulso en la incógnita al terminar.
    if (anillo !== null) {
      const centro =
        d.incognita === d.base ? { x: xGrande, y: yPunta } : d.incognita === "A" ? { x: f.xEn(primero), y: yEje + sentido * f.largoPago } : { x: enF ? 40 : lienzo.width - 40, y: d.incognita === "n" ? 27 : 11 };
      ctx.globalAlpha = 0.5 * (1 - anillo) * alfaVista;
      ctx.strokeStyle = colores.capital;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centro.x, centro.y, 5 + 18 * suavizar(anillo), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ----- Vista "valor": cuánto vale cada pago en la fecha de la base -----

  function medidasBarras(barras) {
    const { ctx, width, height } = lienzo;
    const maximo = Math.max(...barras.map((barra) => barra.capital + barra.interes)) * 1.14 || 1;
    const paso = pasoDeGuia(maximo);
    const guias = [];
    for (let k = 1; k * paso < maximo * 0.97; k++) guias.push(k * paso);
    ctx.font = `500 10.5px ${colores.fuente}`;
    const izquierda = Math.ceil(Math.max(0, ...guias.map((valor) => ctx.measureText(datos.dineroCompacto(valor)).width))) + 12;
    const derecha = width - 6;
    const arriba = 30;
    const abajo = height - 24;
    const n = barras.length;
    const ancho = Math.max(3, Math.min(22, ((derecha - izquierda) / Math.max(n, 1)) * 0.62));
    const x = (j) => izquierda + ancho / 2 + (n > 1 ? (j * (derecha - izquierda - ancho)) / (n - 1) : (derecha - izquierda - ancho) / 2);
    return { izquierda, derecha, arriba, abajo, ancho, x, y: (valor) => abajo - (valor / maximo) * (abajo - arriba), guias, maximo };
  }

  function dibujarValor(ctx, alfaVista) {
    const barras = modelo.barras;
    const m = medidasBarras(barras);
    // Líneas guía
    ctx.lineWidth = 1;
    ctx.font = `500 10.5px ${colores.fuente}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const valor of m.guias) {
      const y = Math.round(m.y(valor)) + 0.5;
      ctx.globalAlpha = alfaVista * Math.min(avance * 6, 1);
      ctx.strokeStyle = colores.borde;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(m.izquierda, y);
      ctx.lineTo(m.derecha, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colores.texto;
      ctx.fillText(datos.dineroCompacto(valor), m.izquierda - 8, y);
    }
    // Barras: capital abajo y, encima, la parte de intereses (2 px de aire entre las dos).
    const anteriores = transicion?.barras;
    const s = transicion ? transicion.mezcla : 1;
    const avBarras = entradaSalida(Math.max(0, (avance - 0.1) / 0.9));
    barras.forEach((barra, j) => {
      const crecer = avance >= 1 ? 1 : resorte(avanceEscalonado(avBarras, j, barras.length, 0.6));
      if (crecer <= 0) return;
      const viejo = anteriores?.[j];
      const capital = (viejo ? mezclar(viejo.capital, barra.capital, s) : barra.capital) * crecer;
      const interes = (viejo ? mezclar(viejo.interes, barra.interes, s) : barra.interes) * crecer;
      const x = m.x(j) - m.ancho / 2;
      const resaltar = guia.k === null ? 1 : guia.k === j ? 1 : 0.35;
      let alfa = alfaVista * resaltar * (viejo || !transicion ? 1 : s);
      if (enfoque.arco === "primero") alfa *= j === 0 ? 1 : 0.3;
      if (enfoque.arco === "ultimo") alfa *= j === barras.length - 1 ? 1 : 0.3;
      const yCapital = m.y(capital);
      ctx.globalAlpha = alfa * Math.max(enfoque.pagos, 0.35);
      ctx.fillStyle = colores.capital;
      rellenarBarra(ctx, x, yCapital, m.ancho, m.abajo - yCapital, interes > 0.5 ? 0 : Math.min(4, m.ancho / 2));
      const altoInteres = yCapital - m.y(capital + interes);
      if (altoInteres > 0.5) {
        ctx.globalAlpha = alfa * Math.max(enfoque.arcos, 0.35);
        ctx.fillStyle = colores.interes;
        rellenarBarra(ctx, x, m.y(capital + interes), m.ancho, Math.max(0, altoInteres - (altoInteres > 4 ? 2 : 0)), Math.min(4, m.ancho / 2));
      }
    });
    // Base y rótulos del eje
    ctx.globalAlpha = alfaVista;
    ctx.strokeStyle = colores.borde;
    ctx.beginPath();
    ctx.moveTo(m.izquierda, Math.round(m.abajo) + 0.5);
    ctx.lineTo(m.derecha, Math.round(m.abajo) + 0.5);
    ctx.stroke();
    const primero = barras[0];
    const ultimo = barras[barras.length - 1];
    escribir(ctx, `Pago del ${datos.singular} ${datos.numero(primero.p)}`, m.izquierda, m.abajo + 17, { peso: 500, tamano: 11, color: colores.texto, alfa: alfaVista });
    if (barras.length > 1) escribir(ctx, `${datos.singular} ${datos.numero(ultimo.p)}`, m.derecha, m.abajo + 17, { alinear: "right", peso: 500, tamano: 11, color: colores.texto, alfa: alfaVista });
    // Lo que se ve, arriba: hoy (o al final) cada pago vale distinto.
    const titulo = datos.base === "F" ? "Lo que vale cada pago al final" : "Lo que vale hoy cada pago";
    escribir(ctx, titulo, m.izquierda, 15, { peso: 500, tamano: 11.5, color: colores.meta, alfa: alfaVista * Math.min(avance * 4, 1) });
    if (guia.k !== null && guia.alfa > 0.01) {
      const barra = barras[guia.k];
      burbuja(ctx, datos.dinero(barra.valor), m.x(guia.k), m.y(barra.capital + barra.interes) - 8, alfaVista * guia.alfa);
    }
    if (anillo !== null && barras.length) {
      const j = datos.base === "F" ? 0 : barras.length - 1;
      ctx.globalAlpha = 0.5 * (1 - anillo) * alfaVista;
      ctx.strokeStyle = colores.capital;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x(j), m.y(barras[j].capital + barras[j].interes), 5 + 16 * suavizar(anillo), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ----- Vista "suma" (perpetua): la suma de los pagos se acerca a P sin pasarlo -----

  function medidasSuma() {
    const { width, height } = lienzo;
    const izquierda = 34;
    const derecha = width - 10;
    const arriba = 34;
    const abajo = height - 24;
    return {
      izquierda,
      derecha,
      arriba,
      abajo,
      x: (k) => izquierda + (k / modelo.kMax) * (derecha - izquierda),
      y: (fraccion) => abajo - (fraccion / 1.08) * (abajo - arriba),
    };
  }

  function dibujarSuma(ctx, alfaVista) {
    const m = medidasSuma();
    const avCurva = entradaSalida(Math.max(0, (avance - 0.15) / 0.85));
    const kHasta = avance >= 1 ? modelo.kMax : avCurva * modelo.kMax;
    // P: la línea a la que se acerca la suma (100 %).
    const yP = m.y(1);
    ctx.globalAlpha = alfaVista * Math.min(avance * 5, 1);
    ctx.strokeStyle = colores.meta;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(m.izquierda, yP);
    ctx.lineTo(m.derecha, yP);
    ctx.stroke();
    ctx.setLineDash([]);
    escribir(ctx, `P = ${datos.dinero(datos.P)} (${datos.porcentaje(1)})`, m.izquierda, yP - 8, { peso: 600, tamano: 11.5, color: colores.meta, alfa: alfaVista * Math.min(avance * 5, 1) });
    // Escala: 0 % y 50 %
    ctx.font = `500 10.5px ${colores.fuente}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colores.texto;
    ctx.globalAlpha = alfaVista;
    ctx.fillText("50 %", m.izquierda - 6, m.y(0.5));
    ctx.fillText("0", m.izquierda - 6, m.abajo);
    ctx.strokeStyle = colores.borde;
    ctx.beginPath();
    ctx.moveTo(m.izquierda, Math.round(m.abajo) + 0.5);
    ctx.lineTo(m.derecha, Math.round(m.abajo) + 0.5);
    ctx.stroke();

    // Curva de lo cubierto con los primeros k pagos, con área debajo.
    const puntos = [];
    const pasos = Math.min(modelo.kMax, 160);
    for (let j = 0; j <= pasos; j++) {
      const k = (j / pasos) * modelo.kMax;
      if (k > kHasta + 1e-9) break;
      const anterior = transicion?.datosAnteriores;
      const valor = anterior ? mezclar(cubierto(k, anterior), cubierto(k), transicion.mezcla) : cubierto(k);
      puntos.push({ x: m.x(k), y: m.y(valor) });
    }
    if (puntos.length > 1) {
      const degradado = ctx.createLinearGradient(0, m.arriba, 0, m.abajo);
      degradado.addColorStop(0, conAlfa(colores.capital, 0.3));
      degradado.addColorStop(1, conAlfa(colores.capital, 0.04));
      ctx.globalAlpha = alfaVista * Math.max(enfoque.pagos, 0.4);
      ctx.fillStyle = degradado;
      ctx.beginPath();
      ctx.moveTo(puntos[0].x, m.abajo);
      for (const p of puntos) ctx.lineTo(p.x, p.y);
      ctx.lineTo(puntos[puntos.length - 1].x, m.abajo);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alfaVista;
      ctx.strokeStyle = colores.linea;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      puntos.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      if (avance < 1) punto(ctx, puntos[puntos.length - 1].x, puntos[puntos.length - 1].y, alfaVista);
    }
    // Hitos: con cuántos pagos se cubre el 50 %, el 90 % y el 99 % de P.
    const hitos = [0.5, 0.9, 0.99].map((meta) => ({ meta, k: Math.ceil(Math.log(1 / (1 - meta)) / Math.log(1 + datos.i)) })); // de 1 - (1 + i)^-k = meta
    hitos.forEach(({ meta, k }, j) => {
      if (k > modelo.kMax || k > kHasta) return;
      const x = m.x(k);
      const y = m.y(cubierto(k));
      ctx.globalAlpha = alfaVista * 0.8;
      ctx.strokeStyle = colores.borde;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, m.abajo);
      ctx.stroke();
      ctx.setLineDash([]);
      punto(ctx, x, y, alfaVista * (enfoque.arco === null || enfoque.arco === "todos" ? 1 : enfoque.arco === "primero" ? (j === 0 ? 1 : 0.3) : j === 2 ? 1 : 0.3));
      // 50 %: a la derecha del punto; 90 %: debajo; 99 %: encima, junto al borde.
      const lugar = [
        { x: x + 10, y: y + 4, alinear: "left" },
        { x: x + 6, y: y + 20, alinear: "left" },
        { x: Math.min(x, lienzo.width - 6), y: y - 12, alinear: "right" },
      ][j];
      escribir(ctx, `${datos.porcentaje(meta)}: ${datos.numero(k)} pagos`, lugar.x, lugar.y, {
        alinear: lugar.alinear,
        peso: 600,
        tamano: 10.5,
        color: colores.textoFuerte,
        alfa: alfaVista,
      });
    });
    escribir(ctx, "Pagos sumados", m.derecha, m.abajo + 17, { alinear: "right", peso: 500, tamano: 11, color: colores.texto, alfa: alfaVista });
    if (guia.k !== null && guia.alfa > 0.01) {
      const k = guia.k;
      const x = m.x(k);
      const y = m.y(cubierto(k));
      ctx.globalAlpha = alfaVista * guia.alfa * 0.7;
      ctx.strokeStyle = colores.texto;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, y);
      ctx.lineTo(Math.round(x) + 0.5, m.abajo);
      ctx.stroke();
      ctx.setLineDash([]);
      punto(ctx, x, y, alfaVista * guia.alfa);
      burbuja(ctx, `${datos.numero(k)} pagos: ${datos.porcentaje(cubierto(k))}`, x, y - 12, alfaVista * guia.alfa);
    }
  }

  // ----- Pintar -----

  function pintarVista(ctx, cual, alfa) {
    if (cual === "valor" && !modelo.perpetua && modelo.barras.length) dibujarValor(ctx, alfa);
    else if (cual === "suma" && modelo.perpetua) dibujarSuma(ctx, alfa);
    else dibujarFlujo(ctx, alfa);
  }

  function pintar() {
    if (!lienzo || lienzo.width === 0) return;
    const { ctx, width, height } = lienzo;
    ctx.clearRect(0, 0, width, height);
    // Al estrenar una vista, la anterior se desvanece al comenzar la construcción.
    const avanceSalida = salida && avance < 1 ? (avance * DURACION_CONSTRUIR) / DURACION_ESTRENO : 1;
    if (avanceSalida < 1) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1 - suavizar(avanceSalida);
      ctx.drawImage(salida, 0, 0);
      ctx.restore();
    }
    // Fundidos (cambio de vista o de cálculo en el diagrama): la imagen anterior se va.
    const foto = cambioVista || (transicion && vista !== "valor" ? transicion : null);
    if (foto) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1 - foto.mezcla;
      ctx.drawImage(foto.foto, 0, 0);
      ctx.restore();
    }
    pintarVista(ctx, vista, foto ? foto.mezcla : 1);
    ctx.globalAlpha = 1;
  }

  function fotografiar() {
    const copia = document.createElement("canvas");
    copia.width = canvas.width;
    copia.height = canvas.height;
    copia.getContext("2d").drawImage(canvas, 0, 0);
    return copia;
  }

  // ----- Lectura -----

  function leerPorDefecto() {
    const d = datos;
    if (vista === "suma" && modelo.perpetua) {
      d.alLeer(`Mientras más pagos se suman, más se acercan a P = ${d.dinero(d.P)}, sin pasarlo`);
      return;
    }
    if (modelo.perpetua) {
      d.alLeer(`${d.dinero(d.A)} cada ${d.singular}, para siempre, equivalen hoy a ${d.dinero(d.P)}`);
      return;
    }
    const pagos = `${d.numero(d.n)} ${d.n === 1 ? "pago" : "pagos"} de ${d.dinero(d.A)}`;
    d.alLeer(d.base === "F" ? `${mayusculaInicial(pagos)} se convierten en ${d.dinero(d.F)} al final` : `${mayusculaInicial(pagos)} equivalen hoy a ${d.dinero(d.P)}`);
  }

  const mayusculaInicial = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

  function leer(k) {
    if (vista === "suma" && modelo.perpetua) {
      datos.alLeer(`Con ${datos.numero(k)} pagos: ${datos.dinero(vpAnualidadVencida(datos.A, datos.i, k))}, el ${datos.porcentaje(cubierto(k))} de P`); // Hoja 5.1
      return;
    }
    if (vista === "valor" && !modelo.perpetua) {
      const barra = modelo.barras[k];
      datos.alLeer(`${nombrePeriodo()} ${datos.numero(barra.p)} · ${datos.base === "F" ? "al final vale" : "hoy vale"} ${datos.dinero(barra.valor)} · intereses ${datos.dinero(barra.interes)}`);
      return;
    }
    datos.alLeer(textoDelPago(k));
  }

  // Lo que se puede mirar con el dedo y dónde está: pagos (flujo), barras (valor) o pagos sumados (suma).
  function objetivos() {
    if (vista === "suma" && modelo.perpetua) {
      const m = medidasSuma();
      const lista = [];
      const salto = Math.max(1, Math.round(modelo.kMax / 80));
      for (let k = 1; k <= modelo.kMax; k += salto) lista.push({ k, x: m.x(k) });
      return lista;
    }
    if (vista === "valor" && !modelo.perpetua) {
      const m = medidasBarras(modelo.barras);
      return modelo.barras.map((barra, j) => ({ k: j, x: m.x(j) }));
    }
    const f = medidasFlujo();
    const lista = modelo.perpetua ? modelo.visibles : modelo.pagos.filter((p) => !(modelo.fraccion && p === modelo.pagos[modelo.pagos.length - 1]));
    return lista.map((p) => ({ k: p, x: f.xEn(p) }));
  }

  // ----- Animación -----

  function detenerPulso() {
    clearTimeout(temporizadorPulso);
    if (saltarPulso) {
      const saltar = saltarPulso;
      saltarPulso = null;
      saltar();
    }
    anillo = null;
  }

  function pulsoFinal() {
    detenerPulso();
    if (movimientoReducido()) return pintar();
    let latiendo = true;
    const saltar = reproducir(
      (t) => {
        if (destruido) return;
        anillo = t < 1 ? t : null;
        pintar();
        if (t >= 1 && latiendo) {
          latiendo = false;
          saltarPulso = null;
        }
      },
      900,
      () => !enPantalla
    );
    if (latiendo) saltarPulso = saltar;
  }

  function construir() {
    if (saltarAnimacion) saltarAnimacion();
    detenerPulso();
    transicion = null;
    salida = null;
    guia.k = null;
    guia.alfa = 0;
    construido = false;
    avance = 0;
    vistas.clear();
    vistas.add(vista);
    pintar();
    leerPorDefecto();
    pendiente = true;
    if (enPantalla) arrancar();
  }

  function arrancar() {
    pendiente = false;
    let animando = true;
    const saltar = reproducir(
      (t) => {
        if (destruido) return;
        avance = t;
        pintar();
        if (t >= 1 && animando) {
          animando = false;
          saltarAnimacion = null;
          construido = true;
          salida = null;
          leerPorDefecto();
          pulsoFinal();
        }
      },
      DURACION_CONSTRUIR,
      () => !enPantalla
    );
    if (animando) saltarAnimacion = saltar;
    if (movimientoReducido()) canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: "ease-out" });
  }

  // Otro cálculo con la misma forma (recalcular o "¿Y si…?"): en "valor" las barras cambian de
  // altura; en el diagrama y en "suma", la imagen anterior se funde con la nueva. Devuelve false
  // si cambió la forma (otra base o modalidad): conviene construir de nuevo.
  function actualizar(nuevos, { enVivo = false, forzar = enVivo } = {}) {
    if (!lienzo || lienzo.width === 0) return false;
    if (nuevos.base !== datos.base || nuevos.modalidad !== datos.modalidad || nuevos.incognita !== datos.incognita) return false;
    if (forzar && (pendiente || saltarAnimacion)) {
      pendiente = false;
      if (saltarAnimacion) saltarAnimacion();
      avance = 1;
      construido = true;
    }
    if (!construido) return false;
    if (saltarAnimacion) saltarAnimacion();
    detenerPulso();
    guia.k = null;
    guia.alfa = 0;
    const anteriores = modelo.barras;
    transicion = { foto: fotografiar(), barras: anteriores, datosAnteriores: datos, mezcla: 0, enVivo };
    datos = nuevos;
    modelo = modeloDePagos(datos);
    // Un cálculo nuevo se estrena en la otra vista; "¿Y si…?" (forzar) no cuenta como nuevo.
    if (!forzar) vistas.clear();
    vistas.add(vista);
    canvas.setAttribute("aria-label", datos.descripcion || "");
    if (enVivo) leerPorDefecto();
    let animando = true;
    const saltar = reproducir(
      (t) => {
        if (destruido) return;
        transicion.mezcla = enVivo ? suavizar(t) : entradaSalida(t);
        pintar();
        if (t >= 1 && animando) {
          animando = false;
          saltarAnimacion = null;
          transicion = null;
          pintar();
          leerPorDefecto();
          if (enVivo) temporizadorPulso = setTimeout(pulsoFinal, 250);
          else pulsoFinal();
        }
      },
      enVivo ? DURACION_EN_VIVO : DURACION_ACTUALIZAR,
      () => !enPantalla
    );
    if (animando) saltarAnimacion = saltar;
    return true;
  }

  // Una vista se estrena si el diagrama está completo y quieto: no a medio construir, ni
  // cambiando de cálculo, ni en un paso de "Explícame".
  function puedeEstrenar() {
    const completo = enfoque.pagos >= 0.999 && enfoque.grande >= 0.999 && enfoque.arcos >= 0.999 && !enfoque.arco && !enfoque.nota;
    return construido && !pendiente && !saltarAnimacion && !transicion && completo && !movimientoReducido() && Boolean(lienzo?.width);
  }

  // Cambia de vista. La primera vez que se ve con este cálculo, se estrena: se dibuja desde
  // cero, con la misma construcción que al calcular, mientras la anterior se desvanece
  // (DURACION_ESTRENO). Después, una se funde en la otra (600 ms).
  function cambiarTipo(nueva) {
    if (nueva === vista) return;
    if (saltarCambio) saltarCambio();
    const estrenar = !vistas.has(nueva) && puedeEstrenar();
    vistas.add(nueva);
    detenerPulso();
    guia.k = null;
    guia.alfa = 0;
    if (estrenar) {
      pintar(); // la foto, sin guía ni pulso
      salida = fotografiar();
      vista = nueva;
      avance = 0;
      leerPorDefecto();
      arrancar();
      return;
    }
    const cambio = { foto: fotografiar(), mezcla: 0 };
    cambioVista = cambio;
    vista = nueva;
    let animando = true;
    const saltar = reproducir(
      (t) => {
        if (destruido) return;
        cambio.mezcla = entradaSalida(t);
        pintar();
        if (t >= 1 && animando) {
          animando = false;
          saltarCambio = null;
          if (cambioVista === cambio) cambioVista = null;
          pintar();
          leerPorDefecto();
        }
      },
      600,
      () => !enPantalla
    );
    if (animando) saltarCambio = saltar;
  }

  // "Explícame": { enfoque: "todo" | "pagos" | "grande" | "viaje", arco: null | "primero" | "ultimo" | "todos", nota }
  function irA(destino, duracion = 650) {
    if (saltarAnimacion) saltarAnimacion();
    detenerPulso();
    guia.k = null;
    guia.alfa = 0;
    const desde = { ...enfoque };
    const hacia = { ...ENFOQUES_PAGOS[destino.enfoque || "todo"], arco: destino.arco || null, nota: Boolean(destino.nota) };
    enfoque = { ...hacia, notaAlfa: 0 };
    reproducir(
      (t) => {
        if (destruido) return;
        const s = suavizar(t);
        enfoque.pagos = mezclar(desde.pagos, hacia.pagos, s);
        enfoque.grande = mezclar(desde.grande, hacia.grande, s);
        enfoque.arcos = mezclar(desde.arcos, hacia.arcos, s);
        enfoque.notaAlfa = s;
        pintar();
        if (t >= 1) leerPorDefecto();
      },
      duracion,
      () => !enPantalla
    );
  }

  // ----- Interacción: el dedo, el mouse o las flechas del teclado eligen un pago -----

  const estaAnimando = () => Boolean(saltarAnimacion || saltarPulso || cambioVista);

  function elegir(objetivo) {
    if (!objetivo) {
      guia.k = null;
      guia.alfa = 0;
      leerPorDefecto();
    } else {
      guia.k = objetivo.k;
      guia.alfa = 1;
      leer(objetivo.k);
    }
    pintar();
  }

  function masCercano(evento) {
    const x = evento.clientX - canvas.getBoundingClientRect().left;
    let mejor = null;
    for (const objetivo of objetivos()) if (!mejor || Math.abs(objetivo.x - x) < Math.abs(mejor.x - x)) mejor = objetivo;
    return mejor;
  }

  let arrastrando = false;
  function alPresionar(evento) {
    if (estaAnimando() || !lienzo) return;
    arrastrando = true;
    canvas.setPointerCapture?.(evento.pointerId);
    elegir(masCercano(evento));
  }
  function alMover(evento) {
    if (estaAnimando() || !lienzo || (!arrastrando && evento.pointerType !== "mouse")) return;
    const objetivo = masCercano(evento);
    if (objetivo && objetivo.k !== guia.k) elegir(objetivo);
  }
  const alSoltar = () => (arrastrando = false);
  const alSalir = (evento) => evento.pointerType === "mouse" && !arrastrando && elegir(null);
  function alTeclear(evento) {
    if (estaAnimando() || !lienzo) return;
    const lista = objetivos();
    const actual = Math.max(0, lista.findIndex((objetivo) => objetivo.k === guia.k));
    if (evento.key === "ArrowRight") elegir(lista[Math.min(actual + (guia.k === null ? 0 : 1), lista.length - 1)]);
    else if (evento.key === "ArrowLeft") elegir(lista[Math.max(actual - 1, 0)]);
    else if (evento.key === "Escape") elegir(null);
    else return;
    evento.preventDefault();
  }

  function alCambiarTema() {
    colores = leerColores(canvas);
    pintar();
  }

  const observadorTamano = new ResizeObserver(() => {
    lienzo = prepararCanvas(canvas);
    salida = null; // la foto quedó de otro tamaño
    pintar();
  });
  const observadorPantalla = new IntersectionObserver(
    ([entrada]) => {
      enPantalla = entrada.isIntersecting;
      if (enPantalla && pendiente) arrancar();
    },
    { threshold: 0.35 }
  );

  lienzo = prepararCanvas(canvas);
  canvas.setAttribute("aria-label", datos.descripcion || "");
  observadorTamano.observe(canvas);
  observadorPantalla.observe(canvas);
  canvas.addEventListener("pointerdown", alPresionar);
  canvas.addEventListener("pointermove", alMover);
  canvas.addEventListener("pointerup", alSoltar);
  canvas.addEventListener("pointercancel", alSoltar);
  canvas.addEventListener("pointerleave", alSalir);
  canvas.addEventListener("keydown", alTeclear);
  document.addEventListener("cambio-tema", alCambiarTema);

  return {
    construir,
    actualizar,
    cambiarTipo,
    irA,
    destruir() {
      destruido = true;
      if (saltarAnimacion) saltarAnimacion();
      if (saltarCambio) saltarCambio();
      detenerPulso();
      observadorTamano.disconnect();
      observadorPantalla.disconnect();
      canvas.removeEventListener("pointerdown", alPresionar);
      canvas.removeEventListener("pointermove", alMover);
      canvas.removeEventListener("pointerup", alSoltar);
      canvas.removeEventListener("pointercancel", alSoltar);
      canvas.removeEventListener("pointerleave", alSalir);
      canvas.removeEventListener("keydown", alTeclear);
      document.removeEventListener("cambio-tema", alCambiarTema);
    },
  };
}
