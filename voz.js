/* voz.js
 * Narración en voz alta del modo "Explícame", con la voz del propio dispositivo (Web Speech
 * API). No necesita internet si el celular tiene una voz en español instalada (casi todos).
 *
 * Antes de leer, los números se pasan a palabras para que todas las voces digan lo mismo:
 * "$ 14.295.028,12" → "catorce millones doscientos noventa y cinco mil veintiocho pesos".
 * Aquí no se calcula nada financiero: solo se lee el texto que ya muestra la app.
 */

// ===================== Números en palabras =====================

const UNIDADES = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

// 1 a 999
function menorQueMil(n) {
  if (n === 100) return "cien";
  const resto = n % 100;
  const partes = n >= 100 ? [CENTENAS[Math.floor(n / 100)]] : [];
  if (resto >= 30) partes.push(DECENAS[Math.floor(resto / 10)] + (resto % 10 ? ` y ${UNIDADES[resto % 10]}` : ""));
  else if (resto > 0) partes.push(UNIDADES[resto]);
  return partes.join(" ");
}

// "uno" se acorta antes de un sustantivo: veintiún mil, treinta y un millones, un peso.
function apocopar(texto) {
  return texto.replace(/veintiuno$/, "veintiún").replace(/(^|\s)uno$/, "$1un");
}

// Enteros de 0 a 999 billones (escala larga, como en Colombia: un billón = un millón de millones).
function enteroEnPalabras(n) {
  if (n === 0) return "cero";
  const grupo = (divisor, singular, plural, conUno) => {
    const cuantos = Math.floor(n / divisor);
    const resto = n % divisor;
    const cabeza = cuantos === 1 ? conUno : `${apocopar(cuantos < 1000 ? menorQueMil(cuantos) : enteroEnPalabras(cuantos))} ${plural}`;
    return resto ? `${cabeza} ${enteroEnPalabras(resto)}` : cabeza;
  };
  if (n >= 1e12) return grupo(1e12, "billón", "billones", "un billón");
  if (n >= 1e6) return grupo(1e6, "millón", "millones", "un millón");
  if (n >= 1000) return grupo(1000, "mil", "mil", "mil");
  return menorQueMil(n);
}

// "14.295.028,12", "1,5" o "24" (como los escribe la app) → palabras. Los decimales de una o
// dos cifras se leen como número (uno coma veinticinco); los más largos, cifra por cifra.
function numeroEnPalabras(texto) {
  const [entero, decimales] = texto.replace(/\./g, "").split(",");
  const palabras = enteroEnPalabras(Number(entero));
  if (!decimales) return palabras;
  const parte = decimales.length <= 2 && decimales[0] !== "0" ? enteroEnPalabras(Number(decimales)) : [...decimales].map((d) => UNIDADES[d]).join(" ");
  return `${palabras} coma ${parte}`;
}

// Pesos redondeados al peso: al oído, los centavos sobran.
function pesosEnPalabras(valor) {
  const entero = Math.round(valor);
  if (entero === 0) return "menos de un peso";
  const de = entero % 1e6 === 0 ? " de" : ""; // "diez millones de pesos"
  return `${apocopar(enteroEnPalabras(entero))}${de} ${entero === 1 ? "peso" : "pesos"}`;
}

const NUMERO = "(\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,(\\d+))?"; // 14.295.028,12 · 1,5 · 24
const LETRAS = { n: "ene", i: "i", P: "pe", F: "efe" };

// Texto de la pantalla → texto para leer en voz alta.
function textoParaVoz(texto) {
  return texto
    .replace(/\s*\((?:P|F|i|n)\)/g, "") // "el valor presente (P)": las palabras ya lo dicen
    .replace(/(fórmulas?)\s+(\d+)\.(\d+)/gi, (_, palabra, a, b) => `${palabra} ${enteroEnPalabras(+a)} punto ${enteroEnPalabras(+b)}`)
    .replace(new RegExp(`\\$\\s?${NUMERO}`, "g"), (_, entero, decimales = "0") => pesosEnPalabras(Number(`${entero.replace(/\./g, "")}.${decimales}`)))
    .replace(new RegExp(`${NUMERO}\\s?%`, "g"), (coincidencia) => `${numeroEnPalabras(coincidencia.replace(/\s?%$/, ""))} por ciento`)
    .replace(/(^|[\s(])([niPF])\s*=\s*/g, (_, antes, letra) => `${antes}${LETRAS[letra]} igual a `)
    .replace(new RegExp(NUMERO, "g"), (coincidencia) => numeroEnPalabras(coincidencia))
    .replace(/\s*=\s*/g, " igual a ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s*→\s*/g, " a ")
    .replace(/\s+/g, " ")
    .trim();
}

// Frases cortas: algunas voces se cortan solas si un enunciado dura más de unos 15 segundos.
function dividirEnFrases(texto) {
  const frases = [];
  for (const frase of texto.match(/[^.!?]+[.!?]*/g) || []) {
    const limpia = frase.trim();
    if (!limpia) continue;
    if (limpia.length <= 160) frases.push(limpia);
    else frases.push(...limpia.replace(/([:;])\s+/g, "$1\n").split("\n"));
  }
  return frases;
}

// ===================== Narrador =====================

function vozDisponible() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function";
}

// Lee textos en voz alta, frase por frase, con la mejor voz en español del dispositivo.
// hablar(texto) devuelve una promesa: "fin" si terminó, "interrumpida" si se detuvo o se
// pidió otro texto, "error" si la voz no funcionó.
function crearNarrador() {
  const sintesis = window.speechSynthesis;
  const enCurso = new Set(); // Chrome puede descartar un enunciado sin referencias antes de que termine
  let enLineaFalla = false; // una voz en línea falló (sin internet): desde ahí, solo las del equipo
  let turno = 0;

  const enEspanol = () => sintesis.getVoices().filter((voz) => /^es([-_]|$)/i.test(voz.lang));
  const enLinea = (voz) => !voz.localService || /natural|online|neural/i.test(voz.name);
  window.addEventListener("online", () => (enLineaFalla = false));

  // Primero el español de Colombia, luego el de Latinoamérica y al final el de España.
  // Con internet se prefieren las voces naturales (en línea); sin internet, las del equipo.
  function puntaje(voz) {
    const idioma = voz.lang.replace("_", "-").toLowerCase();
    let puntos = idioma === "es-co" ? 40 : idioma === "es-es" ? 10 : 30;
    if (enLinea(voz)) puntos += navigator.onLine && !enLineaFalla ? 8 : -25;
    if (voz.default) puntos += 1;
    return puntos;
  }

  function elegirVoz() {
    const opciones = enEspanol();
    opciones.sort((a, b) => puntaje(b) - puntaje(a));
    return opciones[0] || null;
  }

  // Dice una frase. Vigila el final por si el navegador no lo avisa.
  function decir(frase, voz) {
    return new Promise((resolver) => {
      const enunciado = new SpeechSynthesisUtterance(frase);
      enunciado.lang = voz ? voz.lang : "es-CO";
      if (voz) enunciado.voice = voz;
      enunciado.rate = 1;
      enCurso.add(enunciado);
      const inicio = Date.now();
      let empezo = false;
      let quieta = 0;
      let listo = false;
      const terminar = (resultado) => {
        if (listo) return;
        listo = true;
        enCurso.delete(enunciado);
        clearInterval(vigia);
        resolver(resultado);
      };
      const vigia = setInterval(() => {
        if (sintesis.speaking) {
          empezo = true;
          quieta = 0;
        } else if (!empezo) {
          if (Date.now() - inicio > 8000) terminar("error");
        } else if (++quieta >= 3) terminar("fin");
      }, 400);
      enunciado.onstart = () => (empezo = true);
      enunciado.onend = () => terminar("fin");
      enunciado.onerror = (evento) => terminar(evento.error === "interrupted" || evento.error === "canceled" ? "interrumpida" : "error");
      sintesis.speak(enunciado);
    });
  }

  function detener() {
    turno++;
    if (sintesis.speaking || sintesis.pending) sintesis.cancel();
  }

  async function hablar(texto) {
    const hablaba = sintesis.speaking || sintesis.pending;
    detener();
    const mio = turno;
    // Justo después de cancelar, algunos navegadores descartan lo siguiente: se espera un poco.
    // La primera vez se habla de inmediato, dentro del toque (iPhone lo exige).
    if (hablaba) await new Promise((r) => setTimeout(r, 120));
    let voz = elegirVoz();
    const frases = dividirEnFrases(textoParaVoz(texto));
    for (let k = 0; k < frases.length; k++) {
      if (mio !== turno) return "interrumpida";
      const resultado = await decir(frases[k], voz);
      if (mio !== turno) return "interrumpida";
      if (resultado === "interrumpida") return resultado;
      if (resultado === "error") {
        // Una voz en línea sin conexión falla: se repite la frase una vez con una del equipo.
        if (voz && enLinea(voz) && !enLineaFalla) {
          enLineaFalla = true;
          voz = elegirVoz();
          k--;
          continue;
        }
        return "error";
      }
    }
    return "fin";
  }

  // Hay voz en español, o el navegador aún no informa sus voces (entonces se intenta igual).
  // Si solo hay voces en otros idiomas, no se ofrece: leerían el español con acento extraño.
  function tieneVoz() {
    const todas = sintesis.getVoices();
    return todas.length === 0 || enEspanol().length > 0;
  }

  function alCambiarVoces(funcion) {
    sintesis.addEventListener?.("voiceschanged", funcion);
  }

  return { hablar, detener, tieneVoz, alCambiarVoces };
}

// Permite probar la conversión a palabras desde Node.
if (typeof module !== "undefined") {
  module.exports = { textoParaVoz, numeroEnPalabras, pesosEnPalabras, enteroEnPalabras, dividirEnFrases };
}
