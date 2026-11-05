# Cultura Oceánica — Design System

**Archivo de referencia:** `/assets/co-theme.css`

Todas las páginas del sitio importan este archivo. Para cambiar cualquier color, tipografía o espaciado de forma global, editá ese archivo y el cambio se propaga automáticamente a todas las páginas.

---

## Cómo usar el sistema en una nueva página

```html
<head>
  <!-- Siempre primero -->
  <link rel="stylesheet" href="/assets/co-theme.css">
  <style>
    /* Remapeá tus variables locales a los tokens: */
    :root {
      --mi-color-principal: var(--co-teal);
      --mi-fondo:           var(--co-navy);
    }
  </style>
</head>
```

---

## Tokens disponibles

### Paleta de colores

| Token | Valor | Uso |
|-------|-------|-----|
| `--co-navy` | `#04090f` | Fondo principal (más oscuro) |
| `--co-navy-mid` | `#071525` | Fondo cards / paneles |
| `--co-navy-light` | `#0c2040` | Superficie elevada |
| `--co-navy-border` | `#1a3050` | Bordes sutiles |
| `--co-teal` | `#00c9d4` | Acento principal, links, highlights |
| `--co-teal-dark` | `#007a85` | Hover / variante oscura del acento |
| `--co-teal-glow` | `rgba(0,201,212,.18)` | Fondos con teal suave |
| `--co-teal-border` | `rgba(0,201,212,.12)` | Bordes con acento |
| `--co-white` | `#f0f8ff` | Texto principal |
| `--co-text-dim` | `#92b8cc` | Texto secundario |
| `--co-muted` | `#5a7a9a` | Texto atenuado / disabled |
| `--co-muted-dark` | `#3a5a7a` | Muy atenuado |
| `--co-warm` | `#f4a261` | Alertas, avisos de conservación |
| `--co-error` | `#f07070` | Errores |

### Tipografía

| Token | Valor | Uso |
|-------|-------|-----|
| `--co-font-display` | `'Barlow Condensed'` | Títulos, labels, chips |
| `--co-font-body` | `'Barlow'` | Cuerpo de texto |
| `--co-font-system` | `system-ui, ...` | Fallback / UI interna |

> Las fuentes se importan automáticamente desde Google Fonts en `co-theme.css`.

### Forma y espaciado

| Token | Valor | Uso |
|-------|-------|-----|
| `--co-radius` | `4px` | Border-radius por defecto |
| `--co-radius-sm` | `2px` | Chips, badges compactos |
| `--co-radius-lg` | `12px` | Cards, modales |
| `--co-pad-x` | `60px` (desktop) / `20px` (mobile) | Padding horizontal de página |

### Z-index scale

| Token | Valor |
|-------|-------|
| `--co-z-base` | `1` |
| `--co-z-dropdown` | `50` |
| `--co-z-sticky` | `100` |
| `--co-z-modal` | `200` |
| `--co-z-toast` | `300` |

---

## Clases utilitarias incluidas

- `.co-eyebrow` — label de sección (mayúsculas, espaciado, línea teal)
- `.co-chip` — botón filtro / chip
- `.co-back` — botón "Volver" tipo pill teal

---

## Páginas del sitio y su estado

| Página | Archivo | Estado |
|--------|---------|--------|
| Guía de Especies | `/guia/index.html` | ✅ Integrado con co-theme |
| Rodolitos 3D | `/rodolitos/index.html` | ✅ Integrado con co-theme |
| Home | `/index.html` | — Pendiente |

---

## Workflow para cambios estéticos

1. Editá `/assets/co-theme.css`
2. Commiteá el cambio con un mensaje descriptivo (ej: `"design: cambiar teal a #00d4c8"`)
3. GitHub Pages despliega automáticamente — el cambio aparece en todas las páginas

---

## Decisiones de diseño

- **Fondo oscuro (#04090f navy):** consistente con la identidad visual submarina
- **Teal (#00c9d4):** color de acento principal, representa el mar sin ser literalmente azul
- **Barlow Condensed:** tipografía display de alta legibilidad, editorial, compacta para mobile
- **Barlow body:** contraparte del display, misma familia, lectura cómoda
- **Warm (#f4a261):** reservado para contenido de conservación / alertas (ODS 14)
