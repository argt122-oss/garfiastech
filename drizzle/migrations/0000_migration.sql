
create type public.app_role as enum ('admin');

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  logo_text text not null default '',
  hero_title text not null default '',
  hero_subtitle text not null default '',
  bio_short text not null default '',
  bio_long text not null default '',
  profile_photo_url text,
  hero_image_url text,
  email text,
  whatsapp text,
  linkedin text,
  github text,
  instagram text,
  seo_title text,
  seo_description text,
  favicon_url text,
  accent_color text not null default '#2563eb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_description text not null default '',
  long_description text,
  url text,
  image_url text,
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.experience (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  company text,
  start_date date,
  end_date date,
  description text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  is_published boolean not null default false,
  show_in_menu boolean not null default false,
  menu_order int not null default 0,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 255),
  message text not null check (char_length(message) between 1 and 5000),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['site_settings','categories','apps','experience','skills','gallery','pages','messages'] loop
    execute format('create trigger trg_%1$s_updated before update on public.%1$s for each row execute function public.set_updated_at()', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admin all %1$s" on public.%1$s for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

grant select on public.site_settings, public.categories, public.skills, public.apps, public.experience, public.gallery, public.pages to anon;
grant insert on public.messages to anon;

create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "public read categories" on public.categories for select to anon, authenticated using (true);
create policy "public read skills" on public.skills for select to anon, authenticated using (true);
create policy "public read apps" on public.apps for select to anon, authenticated using (is_visible);
create policy "public read experience" on public.experience for select to anon, authenticated using (is_visible);
create policy "public read gallery" on public.gallery for select to anon, authenticated using (is_visible);
create policy "public read pages" on public.pages for select to anon, authenticated using (is_published);
create policy "public send message" on public.messages for insert to anon, authenticated with check (is_read = false);

-- storage policies for site-media
create policy "public read site-media" on storage.objects for select using (bucket_id = 'site-media');
create policy "admin insert site-media" on storage.objects for insert to authenticated with check (bucket_id = 'site-media' and public.has_role(auth.uid(),'admin'));
create policy "admin update site-media" on storage.objects for update to authenticated using (bucket_id = 'site-media' and public.has_role(auth.uid(),'admin'));
create policy "admin delete site-media" on storage.objects for delete to authenticated using (bucket_id = 'site-media' and public.has_role(auth.uid(),'admin'));

-- seed
insert into public.site_settings (id, logo_text, hero_title, hero_subtitle, bio_short, bio_long, email, whatsapp, seo_title, seo_description, accent_color)
values (1, 'Arturo Garfias', 'Arturo Garfias Tambo',
'Ingeniero en Mecatrónica enfocado en tecnología, infraestructura cloud, gestión de proyectos y soluciones digitales',
'Soy ingeniero en Mecatrónica con formación en Dirección de Proyectos. Combino experiencia en soporte de TI, coordinación de mantenimiento, revisión de presupuestos y docencia tecnológica. Me interesan la infraestructura cloud, la automatización, el desarrollo de soluciones digitales y el trabajo remoto',
'<p>Soy ingeniero en Mecatrónica con formación en Dirección de Proyectos. Mi trabajo se mueve entre la tecnología, la operación y la gestión: me gusta entender cómo funcionan los sistemas y cómo organizarlos para que sean útiles para las personas.</p><p>He trabajado como docente de educación superior en áreas de tecnología, donde aprendí a explicar conceptos técnicos con claridad y a documentar procesos de forma ordenada.</p><p>También tengo experiencia en soporte de TI y en la coordinación de trabajos de mantenimiento, incluyendo la revisión de bids y presupuestos, lo que me ha dado una mirada práctica sobre costos, plazos y calidad.</p><p>Hoy me enfoco en la infraestructura cloud, la automatización y el desarrollo de soluciones digitales, y estoy abierto a colaborar en proyectos y equipos remotos.</p>',
'ar.gt.12@gmail.com', '+59160841408',
'Arturo Garfias Tambo — Ingeniero en Mecatrónica',
'Portafolio de Arturo Garfias Tambo: tecnología, infraestructura cloud, automatización y gestión de proyectos.', '#2563eb');

insert into public.categories (name, slug, sort_order) values
('Aplicaciones y proyectos digitales','aplicaciones-y-proyectos-digitales',1),
('Tecnología e infraestructura','tecnologia-e-infraestructura',2);

insert into public.experience (role, company, description, sort_order) values
('Docente de educación superior y tecnología', null, 'Borrador editable: completa institución y fechas desde el panel.', 1),
('Soporte de TI y coordinación/revisión de trabajos de mantenimiento y presupuestos', null, 'Borrador editable: completa empresa y fechas desde el panel.', 2);

insert into public.skills (name, sort_order) values
('Soporte de TI',1),('Gestión de proyectos',2),('Infraestructura cloud',3),('Automatización y tecnología',4),('Docencia y documentación técnica',5);

insert into public.apps (name, short_description, category_id, is_featured, is_visible, sort_order, tags)
select 'Proyecto de ejemplo editable '||n, 'Proyecto de ejemplo editable. Reemplaza este texto, agrega la URL y una imagen reales.',
 (select id from public.categories order by sort_order limit 1), true, false, n, array['ejemplo']
from generate_series(1,3) n;
