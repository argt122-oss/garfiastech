import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Suspense, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { themeInitScript } from "@/components/site/ThemeToggle";
import { shellQuery } from "@/lib/queries";
import { safeHex } from "@/lib/validation";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-7xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-xl font-semibold">Página no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">La página que buscas no existe o ya no está publicada.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">No se pudo cargar la página</h1>
        <p className="mt-2 text-sm text-muted-foreground">Revisa tu conexión e inténtalo de nuevo.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
          <a href="/" className="rounded-full border border-input px-5 py-2 text-sm font-medium">
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ context }) => {
    try {
      return await context.queryClient.ensureQueryData(shellQuery);
    } catch {
      return null;
    }
  },
  head: ({ loaderData }) => {
    const s = loaderData?.settings;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: s?.seo_title || "Arturo Garfias Tambo" },
        { name: "description", content: s?.seo_description || "Portafolio personal" },
        { property: "og:title", content: s?.seo_title || "Arturo Garfias Tambo" },
        { property: "og:description", content: s?.seo_description || "Portafolio personal" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap" },
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: s?.favicon_url || "/favicon.ico" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const data = Route.useLoaderData();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = !pathname.startsWith("/admin") && pathname !== "/reset-password";
  const accent = safeHex(data?.settings?.accent_color);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <style>{`:root{--accent-hex:${accent};}`}</style>
      {isPublic && data ? (
        <div className="flex min-h-screen flex-col">
          <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
            Saltar al contenido
          </a>
          <Suspense>
            <SiteHeader />
          </Suspense>
          <main id="contenido" className="flex-1">
            <Outlet />
          </main>
          <Suspense>
            <SiteFooter />
          </Suspense>
        </div>
      ) : (
        <Outlet />
      )}
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
