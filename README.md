# Cultura Oceánica

Repositorio del sitio **[culturaoceanica.org](https://culturaoceanica.org)**, una plataforma de ciencia y educación marina del Mar Argentino, *by* [Oceanar](https://www.oceanar.org/). Reúne herramientas abiertas para explorar, visualizar y analizar la biodiversidad de los fondos marinos patagónicos. Están pensadas para estudiantes, docentes, buzos, guardaparques y equipos de monitoreo.

El sitio es estático y se publica con GitHub Pages desde la rama `main`.

---

## Herramientas

La portada (`/`) lleva a las cuatro herramientas, agrupadas por verbo: **Explorar** (Guía), **Visualizar** (Rodolitos) y **Analizar** (Fotocuadrantes y Video Transecta). El menú de arriba de cada página enlaza a todas.

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

### Analizar · Fotocuadrantes — [`/fotocuadrantes/`](https://culturaoceanica.org/fotocuadrantes/)

Conteo de piedras y cobertura de roca y arena en fotocuadrantes, en el navegador.

- **Fotos locales:** se abren fotos sueltas o una carpeta (o se arrastran) y **no se suben**. Se analizan de a una, con ◀ ▶ o las flechas.
- **Categorías:** vienen cargadas *Blanca chica*, *Blanca grande*, *Roja* y *Negra* (teclas 1–4), las mismas de Video Transecta; se pueden agregar, renombrar o borrar.
- **Contar:** se elige la categoría y se hace clic sobre cada piedra (círculo de su color, centro transparente). Zoom con la rueda del mouse y desplazamiento arrastrando, para ver de cerca.
- **Densidad:** cada conteo se lleva a ind/m² dividiendo por el área del cuadrante (por defecto 0,0625 m² = 25 × 25 cm; se puede cambiar).
- **Cobertura:** en cada foto se escribe el % de roca y el % de arena; el resto se informa como *otro*. Avisa si suman más de 100.
- **Medir (📏, tecla M):** dos clics marcan una distancia y la dan en cm. La escala sale del área: se asume que la foto es el cuadrante recortado (25 cm de lado por defecto). Si la foto incluye más que el cuadrante, **Calibrar**: se marca algo de largo conocido (p. ej. un lado del marco) y se escribe cuánto mide; esa escala queda solo para esa foto.
- **Seguimiento:** cada foto se marca como analizada (**Enter** pasa a la siguiente); una tabla muestra el estado y los datos de todas.
- **Descargar datos:** un Excel con hojas separadas: **Conteos** (n por categoría y foto), **Densidad** (ind/m²), **Cobertura (%)**, **Medidas** (largo en cm y px, escala usada) y **Puntos** (posición de cada piedra).
- Los datos se guardan solos en el navegador, por nombre de foto, hasta descargarlos; el botón **🗑 Borrar anotaciones** los borra todos (las categorías quedan).
- Un botón abre en otra pestaña el **Quadrat Cropper** ([`/fotocuadrantes/cropper/`](https://culturaoceanica.org/fotocuadrantes/cropper/)), para recortar el cuadrante de las fotos antes de analizarlas.

### Quadrat Cropper — [`/fotocuadrantes/cropper/`](https://culturaoceanica.org/fotocuadrantes/cropper/)

Herramienta para preparar fotocuadrantes de monitoreo bentónico (protocolos MBON Pole to Pole) antes de anotarlos en CoralNet.

- **Detección del marco:** detecta automáticamente el cuadrante de PVC (menta, amarillo, blanco) y recorta la abertura en un cuadrado.
- **Revisión:** permite corregir a mano, excluir fotos y revisar la calidad.
- **Metadata:** carga la metadata con presets (intermareal, submareal, Azores) y exporta el CSV para CoralNet. También escribe la metadata en el EXIF de los recortes.
- **Pestaña Mapa:** muestra las fotos en un mapa satelital. Las que no tienen GPS se pueden ubicar con un clic, cruzándolas con un track GPS por hora, o con las coordenadas del CSV.
- **Privacidad:** todo corre en el navegador; las fotos no se suben a ningún servidor.

La carpeta `fotocuadrantes/cropper/` es **una copia publicada**, no el código fuente (ver [Cómo se actualiza el Quadrat Cropper](#cómo-se-actualiza-el-quadrat-cropper)). La herramienta original es de MBON ([marinebon/quadrat-cropper-js](https://github.com/marinebon/quadrat-cropper-js)); esta versión incluye mejoras hechas en el fork [gonzalobravoargentina/quadrat-cropper-js](https://github.com/gonzalobravoargentina/quadrat-cropper-js) y propuestas al original como pull requests.

### Analizar · Video Transecta — [`/videotransecta/`](https://culturaoceanica.org/videotransecta/)

Conteo de piedras (u otros objetos) en video transectas, en el navegador.

- **Videos locales:** se abren o arrastran desde la computadora y **no se suben**.
- **Categorías:** vienen cargadas *Blanca chica*, *Blanca grande*, *Roja* y *Negra* (teclas 1–4); se pueden agregar, renombrar o borrar.
- **Anotar:** se elige la categoría y se hace clic en el video sobre cada piedra. Queda un círculo del color de la categoría (centro transparente); los puntos pueden ir pegados.
- **Cobertura:** una barra verde/roja muestra qué tramos del video se vieron y cuáles se saltearon; ⏭ lleva al próximo hueco.
- **Navegación:** velocidad de 0,025× a 4× (por debajo de 0,0625× avanza cuadro por cuadro, porque los navegadores no permiten menos), saltos de 2 a 60 s, cuadro a cuadro, deshacer.
- **Reloj de anotación:** arranca con el primer play, se puede pausar y se detiene con «Terminé»; el tiempo sale en el Excel.
- **Borrar anotaciones:** un botón borra todos los puntos, lo visto y los relojes guardados en el navegador (las categorías quedan).
- **Descargar datos:** un Excel (`.xlsx`) con cuatro hojas: **Totales** (total de cada categoría), **Por video** (piedras por video y categoría, con ceros, % del video revisado y tiempo de anotación), **Densidad** (ind/m² = total / área de la transecta, por defecto 1 m × 20 m, editable; una fila por video, una columna por categoría y una fila PROMEDIO al final) y **Puntos** (una fila por piedra: video, tiempo, categoría, posición en píxeles, nota, anotador). El Excel se arma en el navegador, sin librerías.
- Los datos se guardan solos en el navegador hasta descargarlos.
- **Formatos:** MP4/MOV en H.264 funciona en todos los navegadores; H.265/HEVC solo en Safari y en Chrome de Mac.

---

## Estructura del sitio

```
/
├── index.html            → Portada (una sola pantalla: hero con foto y cuatro tarjetas)
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
├── videotransecta/       → Anotador de videos (index.html + app.js, sin librerías)
├── fotocuadrantes/       → Fotocuadrantes: conteo y cobertura en fotos (index.html + app.js)
│   └── cropper/          →   Quadrat Cropper (copia publicada, no editar a mano)
│       ├── index.html, css/, js/, vendor/
│       └── VERSION.txt   →   versión, rama y commit de origen de la copia
├── .github/workflows/
│   └── actualizar-fotocuadrantes.yml → copia el Quadrat Cropper desde su repo
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
  - Quadrat Cropper: Leaflet incluido en `fotocuadrantes/cropper/vendor/` (funciona sin CDN), con Web Workers para procesar miles de fotos.
- **Responsivo:** pensado para celular y escritorio. La portada ocupa una sola pantalla y tiene imagen de fondo para mobile.

---

## Cómo se actualiza el Quadrat Cropper

El código del Quadrat Cropper **no se edita en este repo**. Se desarrolla en el fork [`gonzalobravoargentina/quadrat-cropper-js`](https://github.com/gonzalobravoargentina/quadrat-cropper-js); la rama `culturaoceanica` apunta siempre a la última versión.

Para publicar una versión nueva:

1. Ir a **Actions → "Actualizar fotocuadrantes" → Run workflow**. Por defecto usa el fork y la rama `culturaoceanica`.
2. El workflow copia `index.html`, `css/`, `js/` y `vendor/` a `fotocuadrantes/cropper/` (el anotador de `fotocuadrantes/` no se toca), actualiza `VERSION.txt` y abre un **pull request**.
3. Revisar y **mergear el PR**. GitHub Pages publica la versión nueva.
4. Comprobar la versión que muestra la app (o `fotocuadrantes/cropper/VERSION.txt`). Si se ve la anterior, recargar sin caché (Cmd+Shift+R).

**Configuración, una sola vez:**
- Settings → Actions → General → Workflow permissions: activar **Read and write permissions** y **Allow GitHub Actions to create and approve pull requests**.
- Opcional: en Settings → Secrets and variables → Actions, crear una Variable o un Secret **`ARCGIS_KEY`**. Es una clave de ArcGIS con permiso solo de *Basemaps*, restringida a `https://culturaoceanica.org`. El workflow la escribe en `fotocuadrantes/cropper/js/site-config.js` y da a todos los visitantes el mapa satelital de alta resolución de Esri. La clave **solo** vive en este repo, nunca en el código fuente de la herramienta.

---

## Desarrollo local

```sh
python3 -m http.server 8000
# → http://localhost:8000/            portada
# → http://localhost:8000/guia/
# → http://localhost:8000/rodolitos/
# → http://localhost:8000/fotocuadrantes/
# → http://localhost:8000/fotocuadrantes/cropper/
# → http://localhost:8000/videotransecta/
```

Hace falta un servidor (no alcanza con abrir el `index.html` con doble clic): la guía carga JSON y el Quadrat Cropper usa Web Workers, y ninguno de los dos funciona desde `file://`.

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
- **Quadrat Cropper:** de [MBON / marinebon](https://github.com/marinebon/quadrat-cropper-js). Leaflet (BSD-2) en `fotocuadrantes/cropper/vendor/`.
