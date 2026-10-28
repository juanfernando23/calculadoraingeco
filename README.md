# Calculadora Financiera

Proyecto de aula de Ingeniería Económica. Calculadora web pensada para el celular: cada resultado muestra la fórmula de la hoja de clase que se usó, el procedimiento con los números y un gráfico.

**Abrir la app:** https://juanfernando23.github.io/calculadoraingeco/

## Qué hace

Los seis módulos de la hoja de clase, cada uno con la fórmula usada, el procedimiento con los números y un gráfico animado:

- **Interés compuesto:** valor futuro, valor presente, tasa o tiempo (2.1 a 2.4), con la tasa convertida a la unidad del tiempo.
- **Conversión de tasas:** periódica, nominal o efectiva anual, vencida o anticipada, de cualquier forma a cualquier otra, pasando por la efectiva anual (1.1 a 1.6, 3.1 y 3.2), en una cadena paso a paso.
- **Tasas indexadas:** DTF e IBR más puntos (suma, 4.2), IPC y UVR más puntos (combinada, 4.1), y la UVR en pesos.
- **Anualidad vencida y anticipada:** P, F, cuota, número de pagos o tasa (5.1 a 6.3), con el diagrama de flujo de cada pago.
- **Anualidad perpetua:** capital requerido (P = A / i) o pago sostenible (A = P · i), con la suma de pagos que converge.

En todos: **Explícame** (paso a paso, también en voz alta), **¿Y si…?** (mueve un dato y mira el resultado cambiar en vivo), **historial** de cálculos y **app instalable** que funciona sin internet. Una tasa calculada se lleva a otro módulo con **Usar esta tasa**.

**Validación:** en Acerca de → Validación están los cinco ejercicios del proyecto, resueltos a mano y con la calculadora, con su matriz de comprobación.

## Cómo usarla

- **Celular:** abre el enlace. Para instalarla, en Android toca "Instalar"; en iPhone, Compartir → Agregar a inicio.
- **Computador:** el mismo enlace, o `index.html` con doble clic (así funciona todo menos la instalación).

## Pruebas de cálculo

`pruebas.html` muestra cada caso con ✓ o ✗. En la terminal: `node pruebas.js`.
