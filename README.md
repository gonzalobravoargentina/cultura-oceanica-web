# Cultura Oceánica · Herramientas web

Repositorio del sitio **culturaoceanica.org**, publicado con GitHub Pages. Cada funcionalidad ocupa una carpeta independiente y conserva su código, sus datos y sus recursos dentro de ella.

| Funcionalidad | Carpeta | Dirección pública |
| --- | --- | --- |
| Guía de especies | `guia/` | https://culturaoceanica.org/guia/ |
| Explorador de rodolitos | `rodolitos/` | https://culturaoceanica.org/rodolitos/ |

## Trabajar de forma independiente

- Para modificar la guía, trabajar dentro de `guia/`.
- Para modificar el visor, trabajar dentro de `rodolitos/`.
- Cada herramienta conserva sus propios recursos. No introducir dependencias entre las carpetas para cambios particulares de una herramienta.
- Usar rutas relativas dentro de cada carpeta, para que la herramienta funcione bajo su propia dirección.
- Cada tarea puede trabajarse en una rama independiente y revisarse por separado antes de incorporarla a `main`.
- Las bibliotecas o procesos de construcción futuros pueden tener su propia configuración dentro de la carpeta de la herramienta que los necesite.

## Qué es compartido

GitHub Pages publica la raíz de la rama `main`. La incorporación de un cambio a esa rama vuelve a publicar el sitio completo, aunque solamente cambien los archivos de una herramienta.

El archivo `CNAME` configura el dominio del sitio completo. Una nueva herramienta se agrega como carpeta; no necesita otro dominio ni cambios en `CNAME`. Cualquier configuración general de publicación debe revisarse considerando todas las herramientas.

Antes de publicar, comprobar la funcionalidad modificada. Después de publicar, comprobar su dirección pública y que las demás herramientas sigan abriendo correctamente.

## Agregar otra herramienta

Crear una carpeta con un nombre breve, por ejemplo `nueva-herramienta/`, que contenga su propio `index.html` y recursos. Su dirección será `https://culturaoceanica.org/nueva-herramienta/`. Registrar la nueva herramienta en la tabla anterior.

## Desarrollo local

Desde la raíz del repositorio, se puede usar un servidor de archivos estáticos:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000/guia/` o `http://localhost:8000/rodolitos/`.

## Créditos

Los créditos y las licencias de cada herramienta deben conservarse dentro de su carpeta o en su documentación específica. Ver [RODOLITOS.md](RODOLITOS.md) para el visor de rodolitos.
