/* Reglages du jeu. C'est le seul fichier a modifier pour passer en production. */
window.CONFIG = {
  /* Adresse publique de telecommande.html une fois le dossier mis en ligne.
     Tant qu'elle est vide, la console propose d'ouvrir la telecommande
     dans un onglet local (mode simulateur). */
  URL_PUBLIQUE: '',

  /* Le chrono. 30 s = la decision du plan de bataille. */
  DUREE_VOTE_MS: 30000,

  /* Vitesse de la montee des noms au mur, en ms entre deux noms.
     160 ms = environ six noms par seconde. */
  CADENCE_NOMS_MS: 160,

  /* Duree totale maximale de la montee des noms. A 60 joueurs, la cadence
     s'accelere automatiquement pour tenir dans cette enveloppe. */
  MONTEE_MAX_MS: 5500,

  /* Le defilement des longues listes (les 105 maladies).
     DUREE      : le temps total de l'animation.
     LENTES     : combien d'entrees passent lentement au debut, a vitesse
                  constante, le temps de les lire. Le reste s'emballe ensuite.
     PART_LENTE : la part du temps total consacree a cette phase lisible. */
  DEFILEMENT_MS: 4000,
  DEFILEMENT_LENTES: 5,
  DEFILEMENT_PART_LENTE: 0.42,

  /* Le temps reel. Projet « benjamin.charrassier.lachal@gmail.com's Project »,
     region West EU (Irlande). La cle publiable est faite pour vivre dans la
     page du telephone : elle ne donne acces qu'a ce que les regles RLS
     autorisent, c'est-a-dire lire et ajouter des votes. Le corrige, lui,
     n'entre jamais dans la base. */
  SUPABASE_URL: 'https://dglucwqrviuzftagbwbn.supabase.co',
  SUPABASE_CLE: 'sb_publishable_ZBZwBNng-jCbTQCvv4zf2w_ARQdjAtb',

  /* Cadence du sondage de secours, en ms. Le temps reel fait le travail ;
     ceci ne sert qu'a rattraper une websocket coupee ou un telephone qui
     sort de veille. Ne pas descendre sous 1500 : chaque telephone
     interroge la base a cette cadence. */
  CADENCE_SONDAGE_MS: 2500
};
