-- =========================================================
-- UPDATE 1.1
--
-- Draai dit in één keer in de Supabase SQL Editor, VOORDAT
-- je de nieuwe index.html en de map admin uploadt.
--
-- Het beheerdersaccount staat al ingevuld bij stap 1.
-- =========================================================


-- ---------------------------------------------------------
-- 1. BEHEERDERS
--
-- Wie in deze tabel staat, is beheerder. De controle zit in
-- de database zelf, niet in de website. Wie de /admin-pagina
-- vindt maar hier niet in staat, krijgt niets te zien, ook
-- niet via de API.
-- ---------------------------------------------------------

create table if not exists public.admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "eigen beheerrecht lezen" on public.admins;
create policy "eigen beheerrecht lezen" on public.admins
    for select to authenticated
    using (auth.uid() = user_id);

-- security definer: de functie mag in admins kijken, ook al
-- mag de gebruiker zelf alleen zijn eigen rij zien.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.admins where user_id = auth.uid()
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Beheerder: het account waarmee je op de site inlogt
insert into public.admins (user_id)
select id from auth.users where email = 'thijnvdbogaard09@gmail.com'
on conflict do nothing;


-- ---------------------------------------------------------
-- 2. UPDATEMELDINGEN
-- ---------------------------------------------------------

create table if not exists public.app_updates (
    id bigint generated always as identity primary key,
    version text not null unique,
    title text,
    notes text not null,
    published boolean not null default false,
    created_at timestamptz not null default now()
);

alter table public.app_updates enable row level security;

drop policy if exists "updates lezen" on public.app_updates;
create policy "updates lezen" on public.app_updates
    for select to authenticated
    using (published or public.is_admin());

drop policy if exists "updates toevoegen" on public.app_updates;
create policy "updates toevoegen" on public.app_updates
    for insert to authenticated
    with check (public.is_admin());

drop policy if exists "updates wijzigen" on public.app_updates;
create policy "updates wijzigen" on public.app_updates
    for update to authenticated
    using (public.is_admin())
    with check (public.is_admin());

drop policy if exists "updates verwijderen" on public.app_updates;
create policy "updates verwijderen" on public.app_updates
    for delete to authenticated
    using (public.is_admin());


-- ---------------------------------------------------------
-- 3. ONTHOUDEN WELKE VERSIE IEMAND AL GEZIEN HEEFT
-- ---------------------------------------------------------

alter table public.user_settings
    add column if not exists last_seen_version text;


-- ---------------------------------------------------------
-- 4. SUGGESTIES AFSCHERMEN
--
-- Alle bestaande regels op deze tabel gaan eraf en worden
-- opnieuw gezet. Iedereen mag een suggestie insturen en zijn
-- eigen suggesties zien. Alleen een beheerder ziet alles en
-- mag verwijderen.
-- ---------------------------------------------------------

do $$
declare
    rule record;
begin
    for rule in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = 'suggestions'
    loop
        execute format(
            'drop policy %I on public.suggestions',
            rule.policyname
        );
    end loop;
end $$;

alter table public.suggestions enable row level security;

create policy "suggestie insturen" on public.suggestions
    for insert to authenticated
    with check (auth.uid() = user_id);

create policy "suggesties lezen" on public.suggestions
    for select to authenticated
    using (auth.uid() = user_id or public.is_admin());

create policy "suggesties verwijderen" on public.suggestions
    for delete to authenticated
    using (public.is_admin());


-- ---------------------------------------------------------
-- 5. EERSTE MELDING: VERSIE 1.1
--
-- Staat meteen gepubliceerd. Wil je de tekst eerst nog
-- aanpassen, zet published dan op false en publiceer hem
-- daarna vanuit /admin.
-- ---------------------------------------------------------

insert into public.app_updates (version, title, notes, published)
values (
    '1.1',
    'Meer grip op je planning',
    $notes$- Huiswerk, deadlines en doelen pas je nu aan met het potloodje. Verwijderen doe je daar ook, zodat je niet meer per ongeluk iets weggooit.
- Snelkoppelingen toevoegen en verwijderen doe je via de knop Bewerken.
- Koppel je Somtoday-rooster, dan staan je lessen automatisch in je agenda.
- De agenda heeft nu een maand-, week- en dagweergave.
- Kies zelf je weekdoel voor de studietimer en vanaf welk cijfer iets voldoende is.
- Nieuwe accentkleuren, en licht of donker wordt nu bij je account onthouden.
- Verberg blokken die je niet gebruikt en sorteer je lijsten zoals jij wilt.
- Taken in je to-do lijst hebben nu een prioriteit en een datum.
- Bovenin vind je een klok, je instellingen en uitleg over de app op je telefoon.$notes$,
    true
)
on conflict (version) do nothing;
