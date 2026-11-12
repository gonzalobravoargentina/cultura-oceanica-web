# Cultura Oceánica

Repositorio del sitio **[culturaoceanica.org](https://culturaoceanica.org)**, una plataforma de ciencia y educación marina del Mar Argentino, *by* [Oceanar](https://www.oceanar.org/). Reúne herramientas abiertas para explorar, visualizar y analizar la biodiversidad de los fondos marinos patagónicos. Están pensadas para estudiantes, docentes, buzos, guardaparques y equipos de monitoreo.

El sitio es estático y se publica con GitHub Pages desde la rama `main`.

---

## Herramientas

La portada (`/`) lleva a tres herramientas, una por cada verbo: **Explorar**, **Visualizar** y **Analizar**.

### Explorar · Guía de Especies Submarinas — [`/guia/`](https://culturaoceanica.org/guia/)

Fichas interactivas de algas, peces e invertebrados documentados en los fondos del Mar Argentino mediante buceo científico.

- **Fichas por especie:** foto, nombre común y científico, clasificación y descripción.
- **Datos en vivo:**
  - observaciones y fotos de **iNaturalist** (API v1);
  - textos de **Wikipedia** y **Wikispecies**;
  - enlaces a **WoRMS** (taxonomía marina), **FishBase** y **AlgaeBase**.
- **Mapa de observaciones** georreferenciadas (Leaflet; base satelital de Esri).
- **Especies que aparecen juntas:** se calculan a partir de las observaciones y se guardan en `guia/cooccurrence.json`.
- **Descripciones pre-generadas** (`guia/descriptions.json`), para que las fichas carguen rápido sin depender de cada API.

### Visualizar · Rodolitos en 3D (Habitar las Algas) — [`/rodolitos/`](https://culturaoceanica.org/rodolitos/)

Visor 3D de la morfología de los rodolitos fruticosos (algas rojas calcáreas de vida libre que forman fondos de alta biodiversidad).

- **Modelo interpretativo:** está armado a partir de fotografías de campo. No tiene escala física calibrada.
- **Vista de campo:** muestra el entramado de rodolitos sobre el fondo.
- **Motor:** Three.js r128, incluido en `rodolitos/assets/`. No necesita servicios externos; solo la foto del ambiente se carga desde Wikimedia Commons al pulsar su botón.
- **Inserción en otras páginas:** se puede embeber en Wix u otros sitios con un `<iframe>` (ver [`RODOLITOS.md`](RODOLITOS.md)).

### Analizar · Fotocuadrantes (Quadrat Cropper) — [`/fotocuadrantes/`](https://culturaoceanica.org/fotocuadrantes/)

Herramienta para preparar fotocuadrantes de monitoreo bentónico (protocolos MBON Pole to Pole) antes de anotarlos en CoralNet.

- **Detección del marco:** detecta automáticamente el cuadrante de PVC (menta, amarillo, blanco) y recorta la abertura en un cuadrado.
- **Revisión:** permite corregir a mano, excluir fotos y revisar la calidad.
- **Metadata:** carga la metadata con presets (intermareal, submareal, Azores) y exporta el CSV para CoralNet. También escribe la metadata en el EXIF de los recortes.
- **Pestaña Mapa:** muestra las fotos en un mapa satelital. Las que no tienen GPS se pueden ubicar con un clic, cruzándolas con un track GPS por hora, o con las coordenadas del CSV.
- **Privacidad:** todo corre en el navegador; las fotos no se suben a ningún servidor.

Esta carpeta es **una copia publicada**, no el código fuente (ver [Cómo se actualiza Fotocuadrantes](#cómo-se-actualiza-fotocuadrantes)). La herramienta original es de MBON ([marinebon/quadrat-cropper-js](https://github.com/marinebon/quadrat-cropper-js)); esta versión incluye mejoras hechas en el fork [gonzalobravoargentina/quadrat-cropper-js](https://github.com/gonzalobravoargentina/quadrat-cropper-js) y propuestas al original como pull requests.

---

## Estructura del sitio

```
/
├── index.html            → Portada (una sola pantalla: hero con foto y tres tarjetas)
├── assets/               → Recursos compartidos por todo el sitio
│   ├── co-theme.css      →   sistema de diseño (colores, tipografía, espaciado)
│   ├── hero-home.*       →   fotos y video de la portada
│   └── sdg14.png         →   ícono ODS 14 (Vida submarina)
├── guia/                 → Guía de Especies Submarinas
│   ├── index.html        →   la app completa (HTML + CSS + JS en un archivo)
│   ├── descriptions.json →   descripciones pre-generadas
│   └── cooccurrence.json →   co-ocurrencia de especies
├── rodolitos/            → Visor 3D de rodolitos
│   ├── index.html
│   └── assets/           →   app.js, modelo, Three.js, fuente, logo y licencias
├── fotocuadrantes/       → Quadrat Cropper (copia publicada, no editar a mano)
│   ├── index.html, css/, js/, vendor/
│   └── VERSION.txt       →   versión, rama y commit de origen de la copia
├── .github/workflows/
│   └── actualizar-fotocuadrantes.yml → copia la herramienta desde su repo
├── DESIGN.md             → guía del sistema de diseño
├── RODOLITOS.md          → créditos del visor y cómo insertarlo en Wix
└── CNAME                 → dominio culturaoceanica.org
```

**Cada herramienta es autónoma.** Tiene su propio `index.html` y sus recursos dentro de su carpeta; no hay dependencias entre carpetas. Lo único compartido es `assets/` (estilo y portada). Una herramienta nueva se agrega como una carpeta más y una tarjeta en la portada.

---

## Cómo está construido

- **Sitio estático:** HTML, CSS y JavaScript sin framework, sin *build step* y sin servidor propio. Lo que está en `main` es exactamente lo que se publica.
- **Hosting:** GitHub Pages con dominio propio (`CNAME`). Cada push a `main` se publica en uno o dos minutos.
- **Diseño común:** todas las páginas importan `/assets/co-theme.css`. El tema es oscuro submarino, con navy de fondo y acento teal, y usa las fuentes Barlow y Barlow Condensed. Cambiar un token ahí cambia todo el sitio (ver [`DESIGN.md`](DESIGN.md)).
- **Datos en vivo:** la guía consulta APIs públicas desde el navegador del visitante (iNaturalist, Wikipedia/Wikispecies). Los datos pesados o lentos de calcular se guardan pre-generados como JSON en la carpeta de la herramienta.
- **Librerías:**
  - Guía: Leaflet desde CDN (cdnjs).
  - Rodolitos: Three.js incluido.
  - Fotocuadrantes: Leaflet incluido en `vendor/` (funciona sin CDN), con Web Workers para procesar miles de fotos.
- **Responsivo:** pensado para celular y escritorio. La portada ocupa una sola pantalla y tiene imagen de fondo para mobile.

---

## Cómo se actualiza Fotocuadrantes

El código del Quadrat Cropper **no se edita en este repo**. Se desarrolla en el fork [`gonzalobravoargentina/quadrat-cropper-js`](https://github.com/gonzalobravoargentina/quadrat-cropper-js); la rama `culturaoceanica` apunta siempre a la última versión.

Para publicar una versión nueva:

1. Ir a **Actions → "Actualizar fotocuadrantes" → Run workflow**. Por defecto usa el fork y la rama `culturaoceanica`.
2. El workflow copia `index.html`, `css/`, `js/` y `vendor/` a `fotocuadrantes/`, actualiza `VERSION.txt` y abre un **pull request**.
3. Revisar y **mergear el PR**. GitHub Pages publica la versión nueva.
4. Comprobar la versión que muestra la app (o `fotocuadrantes/VERSION.txt`). Si se ve la anterior, recargar sin caché (Cmd+Shift+R).

**Configuración, una sola vez:**
- Settings → Actions → General → Workflow permissions: activar **Read and write permissions** y **Allow GitHub Actions to create and approve pull requests**.
- Opcional: en Settings → Secrets and variables → Actions, crear una Variable o un Secret **`ARCGIS_KEY`**. Es una clave de ArcGIS con permiso solo de *Basemaps*, restringida a `https://culturaoceanica.org`. El workflow la escribe en `fotocuadrantes/js/site-config.js` y da a todos los visitantes el mapa satelital de alta resolución de Esri. La clave **solo** vive en este repo, nunca en el código fuente de la herramienta.

---

## Desarrollo local

```sh
python3 -m http.server 8000
# → http://localhost:8000/            portada
# → http://localhost:8000/guia/
# → http://localhost:8000/rodolitos/
# → http://localhost:8000/fotocuadrantes/
```

Hace falta un servidor (no alcanza con abrir el `index.html` con doble clic): la guía carga JSON y Fotocuadrantes usa Web Workers, y ninguno de los dos funciona desde `file://`.

**Para agregar una herramienta nueva:**
1. Crear la carpeta `nombre/` con su `index.html`.
2. Importar `/assets/co-theme.css`.
3. Sumar la tarjeta en `index.html` de la portada.
4. Hacer push a `main`.

---

## Créditos y licencias

Desarrollado por **Gonzalo Bravo** (IBIOMAR–CONICET / UNPSJB) en el marco de la investigación sobre comunidades submareales e intermareales de la Patagonia argentina y del programa MBON Pole to Pole.

- **Contenido del sitio:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es).
- **Datos de terceros:** iNaturalist, Wikipedia, Wikispecies, WoRMS, FishBase y AlgaeBase conservan sus propias licencias y condiciones de uso.
- **Rodolitos:** créditos y licencias detallados en [`RODOLITOS.md`](RODOLITOS.md). Three.js (MIT), Montserrat (OFL 1.1).
- **Fotocuadrantes:** Quadrat Cropper, de [MBON / marinebon](https://github.com/marinebon/quadrat-cropper-js). Leaflet (BSD-2) en `fotocuadrantes/vendor/`.
