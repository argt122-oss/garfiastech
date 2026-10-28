import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageQuery } from "@/lib/queries";
import { SanitizedHtml } from "@/components/site/SanitizedHtml";

export const Route = createFileRoute("/$slug")({
  loader: async ({ context, params }) => {
    const page = await context.queryClient.ensureQueryData(pageQuery(params.slug));
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Arturo Garfias Tambo` },
          { name: "description", content: loaderData.seo_description || loaderData.title },
          { property: "og:title", content: loaderData.title },
          { property: "og:description", content: loaderData.seo_description || loaderData.title },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "No disponible" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      <p className="font-display text-7xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold">Esta página no existe</h1>
      <Link to="/" className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        Volver al inicio
      </Link>
    </div>
  ),
  component: DynamicPage,
});

function DynamicPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(pageQuery(slug));
  if (!data) return null;
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:py-24">
      <h1 className="text-4xl font-bold md:text-5xl">{data.title}</h1>
      <SanitizedHtml html={data.content} className="prose-content mt-8" />
    </article>
  );
}
