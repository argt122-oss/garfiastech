# Portafolio Arturo Garfias Tambo + panel /admin

Sitio personal en español, minimalista, con todo el contenido leído de la base de datos y editable desde /admin. Se construye en 4 etapas, verificando cada una.

## Etapa 1 — Base de datos y seguridad (Lovable Cloud)
- Tablas: site_settings (fila única, incluye accent_color y logo_text), categories, apps, experience, skills, gallery, pages, messages, user_roles (enum admin). Todas con created_at/updated_at y trigger de actualización.
- GRANTs + RLS en todo. Función has_role SECURITY DEFINER.
  - Anónimos: leen site_settings, categories, skills; apps/experience/gallery solo visibles; pages solo publicadas; messages solo INSERT.
  - Admin: lectura y escritura total.
- Bucket público "site-media" (5 MB, jpg/png/webp/svg/gif), escritura/borrado solo admin.
- Datos iniciales: perfil, bio corta y larga (redactada solo con los datos dados), 2 categorías, 2 experiencias sin empresa/fechas confirmadas (marcadas como borrador), 5 habilidades, 3 apps "Proyecto de ejemplo editable" ocultas, imágenes placeholder neutras. Redes vacías salvo WhatsApp y correo.

## Etapa 2 — Login y admin
- /admin/login (correo + contraseña, "olvidé mi contraseña") y /reset-password. Sin pantalla de registro.
- /admin/setup: solo funciona si no existe admin y el correo coincide con el secreto ADMIN_EMAIL (ar.gt.12@gmail.com); lo crea en el servidor y asigna rol admin. Después se desactiva sola. Ningún otro correo recibe rol.
- Rutas /admin/* protegidas: sin rol admin se redirige al login.
- Secciones: Inicio (resumen), Apps, Categorías, Páginas, Sobre mí (bio, fotos, experiencia, habilidades, galería), Ajustes (hero, redes, SEO, favicon, color de acento, logo/nombre), Mensajes.
- Añadir app pegando el link: una función del servidor obtiene título, descripción e imagen (Open Graph/Twitter → captura thum.io → placeholder), con timeout 8 s, redirecciones, bloqueo de IPs privadas, límite de tamaño y aviso de duplicado. Si falla, se completa a mano.
- Subida de imágenes: validación, recorte 16:9 para apps, compresión a 1600 px, barra de progreso, borrado del archivo al eliminar.
- Arrastrar y soltar para ordenar; toasts, confirmaciones, aviso de cambios sin guardar, autoguardado de borradores de páginas.
- Eliminar categoría: elegir a dónde mover sus apps o dejarlas sin categoría.

## Etapa 3 — Sitio público
- Navegación fija con menú móvil, páginas extra automáticas, sin enlace a /admin. Modo claro/oscuro con selector.
- / (hero, apps destacadas, mini sobre mí, contacto), /sobre-mi (bio, línea de tiempo, chips, galería con lightbox), /apps (pestañas por categoría con ?cat=slug, tarjetas 16:9 que abren en pestaña nueva), /contacto (formulario con honeypot), /$slug páginas dinámicas con 404 elegante.
- SEO por página desde la base de datos, carga diferida, esqueletos y mensajes de error.
- Dirección visual: tipografía sobria (no Inter genérica, p. ej. Manrope/Sora), mucho espacio, acento azul configurable.

## Etapa 4 — Pruebas
Verificar las pruebas listadas (RLS como visitante, apps ocultas, nueva categoría → pestaña, añadir app por link, URL inválida, página en menú, móvil 375 px y modo oscuro) y entregar la lista de pasos manuales.

## Detalles técnicos
- Se usan funciones del servidor de TanStack Start en lugar de Edge Functions (el stack no las usa); misma lógica y protecciones.
- HTML de páginas sanitizado con DOMPurify; editor Tiptap con imágenes y YouTube.
- Validación con zod en cliente y servidor (URLs http/https, slugs, slugs reservados).
- Color de acento aplicado como variable CSS desde site_settings.
- Clave de servicio solo en el servidor.
