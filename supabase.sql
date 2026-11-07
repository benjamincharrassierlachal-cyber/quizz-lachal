-- =====================================================================
--  Le Quizz Lachal — schema a coller dans l'editeur SQL de Supabase.
--  A executer une seule fois, sur un projet neuf.
--
--  Principe : la base ne connait que des VOTES BRUTS. Aucun enonce,
--  aucune proposition, aucune bonne reponse n'y entre jamais — le
--  corrige reste dans questions/*.js, sur le PC de la console. Un
--  curieux qui recupere la cle anon depuis la page telecommande n'y
--  trouvera donc rien d'exploitable.
-- =====================================================================

-- ---------------------------------------------------------------- parties
create table if not exists parties (
  id              bigint primary key,            -- Date.now() cote console
  questionnaire   text        not null,
  titre           text,
  phase           text        not null default 'inscription',
  question_index  int         not null default -1,
  nb_questions    int         not null default 0,
  type_question   text,                          -- 'qcm' ou 'annee'
  format_saisie   text,
  depart_a        timestamptz,                   -- mis par le SERVEUR au GO
  cree_a          timestamptz not null default now()
);

-- ---------------------------------------------------------------- joueurs
create table if not exists joueurs (
  id         text        primary key,
  partie_id  bigint      not null references parties(id) on delete cascade,
  nom        text        not null,
  rejoint_a  timestamptz not null default now()
);

-- Deux « Julien » dans la meme partie : impossible, comme en local.
create unique index if not exists joueurs_prenom_unique
  on joueurs (partie_id, lower(trim(nom)));

-- ---------------------------------------------------------------- votes
create table if not exists votes (
  id         bigserial   primary key,
  partie_id  bigint      not null references parties(id) on delete cascade,
  joueur_id  text        not null,
  question   int         not null,
  cases      text[]      not null default '{}',
  valide_a   timestamptz not null default now(),  -- horodatage SERVEUR
  unique (partie_id, joueur_id, question)         -- un seul vote par question
);

-- IMPORTANT : le temps de reponse se calcule valide_a - parties.depart_a.
-- Les deux viennent de l'horloge du serveur, jamais de celle du telephone :
-- c'est ce qui rend le departage a la rapidite honnete.

-- ---------------------------------------------------------------- resultats
create table if not exists resultats (
  partie_id  bigint not null references parties(id) on delete cascade,
  joueur_id  text   not null,
  question   int    not null,
  etat       text   not null,          -- gagne | partiel | rate | bonus
  points     int    not null default 0,
  ecart      int,                      -- questions a saisie libre
  primary key (partie_id, joueur_id, question)
);

-- ---------------------------------------------------------------- pouls
-- Le plan gratuit met un projet en pause apres 7 jours sans activite.
-- Une ecriture hebdomadaire ici suffit a le tenir eveille.
create table if not exists pouls (
  id serial       primary key,
  vu  timestamptz not null default now()
);

-- =====================================================================
--  Droits. La cle anon est publique (elle est dans la page telecommande),
--  donc on ouvre le minimum : lire et ajouter, jamais modifier ni
--  supprimer un vote deja pose. Personne ne peut reecrire l'histoire.
-- =====================================================================
alter table parties   enable row level security;
alter table joueurs   enable row level security;
alter table votes     enable row level security;
alter table resultats enable row level security;
alter table pouls     enable row level security;

-- parties : la console a besoin de faire avancer les phases
create policy parties_lire     on parties   for select using (true);
create policy parties_creer    on parties   for insert with check (true);
create policy parties_avancer  on parties   for update using (true) with check (true);

-- joueurs : on s'inscrit, on ne se renomme pas
create policy joueurs_lire     on joueurs   for select using (true);
create policy joueurs_creer    on joueurs   for insert with check (true);

-- ... mais le maitre du jeu peut retirer un inscrit depuis la console : un
-- prenom entre deux fois, quelqu'un qui s'est trompe. Uniquement pendant
-- l'inscription : une fois la partie lancee, plus personne ne disparait.
create policy joueurs_retirer  on joueurs   for delete using (
  exists (select 1 from parties p where p.id = joueurs.partie_id and p.phase = 'inscription')
);

-- votes : on vote une fois, point final
create policy votes_lire       on votes     for select using (true);
create policy votes_creer      on votes     for insert with check (true);

-- resultats : la console republie si elle redemarre, donc update autorise
create policy resultats_lire   on resultats for select using (true);
create policy resultats_creer  on resultats for insert with check (true);
create policy resultats_maj    on resultats for update using (true) with check (true);

create policy pouls_lire       on pouls     for select using (true);
create policy pouls_creer      on pouls     for insert with check (true);

-- =====================================================================
--  Temps reel : sans ces lignes, rien ne se propage entre les appareils.
-- =====================================================================
alter publication supabase_realtime add table parties;
alter publication supabase_realtime add table joueurs;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table resultats;
