<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- All site content is read from the database; never hardcode content in components (owner edits everything from /admin).
- Public pages load data via server functions in `src/lib/public.functions.ts` using a publishable client (RLS as anon) so SSR has data.
- Admin pages (`/admin/*`, client-only) use the browser client; RLS `has_role(auth.uid(),'admin')` is the security boundary.
- `/admin/login` and `/admin/setup` use the `admin_.` un-nested filename so they sit outside the admin guard.
- Storage bucket `site-media` is private (workspace blocks public buckets); images are served through `/api/public/media/$`, and stored URLs use that prefix.
- First admin is created only via invitation email to the `ADMIN_EMAIL` secret; public sign-up is disabled.
- Rich text is sanitized with DOMPurify before save and on render.
- tsconfig strict extras (exactOptionalPropertyTypes etc.) are relaxed to keep Supabase-typed code readable.
- Netlify secret scanning exempts only the public URL and publishable-key variable pairs via SECRETS_SCAN_OMIT_KEYS; keep private-key scanning enabled to prevent credential leaks without blocking intentional public bundles.
