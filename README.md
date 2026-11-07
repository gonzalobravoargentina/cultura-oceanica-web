# Cultura Oceánica

Repositorio del sitio **[culturaoceanica.org](https://culturaoceanica.org)**, publicado con GitHub Pages. Plataforma de ciencia y educación marina del Mar Argentino.

## Estructura

```
/
├── guia/          → Guía de Especies Submarinas (culturaoceanica.org/guia/)
├── rodolitos/     → Visor de Rodolitos          (culturaoceanica.org/rodolitos/)
├── assets/        → Recursos compartidos (tokens de diseño, íconos)
└── CNAME          → Configuración de dominio
```

Cada herramienta es autónoma: tiene su propio `index.html` y recursos. No hay dependencias entre carpetas.

## Herramientas

**Guía de Especies Submarinas** — fichas interactivas de algas, peces e invertebrados documentados en fondos del Mar Argentino mediante buceo científico. Datos en tiempo real desde iNaturalist, Wikipedia, WoRMS, FishBase y AlgaeBase. Incluye mapa de observaciones georreferenciadas (Leaflet + iNat API).

**Visor de Rodolitos** — explorador de comunidades de rodolitos con análisis de fotocuadrantes y monitoreo de largo plazo basado en protocolos MBON.

## Características técnicas

- Sitio estático (HTML + CSS + JS vanilla), sin framework ni build step
- Deploy automático vía GitHub Pages desde `main`
- Datos cargados en tiempo real desde APIs públicas (iNaturalist v1, Wikipedia, WoRMS)
- Diseño responsivo con sistema de tokens CSS compartido (`assets/co-theme.css`)

## Desarrollo local

```sh
python3 -m http.server 8000
# → http://localhost:8000/guia/
# → http://localhost:8000/rodolitos/
```

## Créditos

Desarrollado por **Gonzalo Bravo** (IBIOMAR–CONICET / UNPSJB) en el marco de investigación sobre comunidades submareales de la Patagonia argentina. Contenido bajo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es).
