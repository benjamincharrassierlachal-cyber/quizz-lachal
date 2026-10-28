/* QUESTIONNAIRE S2 — transcrit depuis questionnaire.xlsx (2 septembre 2026).
   9 questions ; il en manque 2 que tu ajouteras.

   Champ "propositions" : exactement 4, dans l'ordre A, B, C, D. Chacune est un
   texte, ou une LISTE de lignes — elle s'affiche alors en colonne numerotee,
   pour les questions de classement.

   Champ "explication" : la page affichee entre le vert et le classement.
     titre      un intitule court, en dore
     texte      un paragraphe
     liste      des lignes a puces
     image      un fichier de assets/
     imagePleine  true = l'illustration occupe tout l'ecran, sans panneau de texte
                  (pour une planche dessinee qui porte deja le message)
     defilement   un tableau : la liste defile 4 s, lisible puis de plus en plus vite,
                  et le total tombe a la fin
     defilementMot  le mot affiche sous le total
     aCompleter true = il me manque ta matiere, la page le signale a l'ecran

   Q9 est une question BONUS : non notee, mais les votes s'affichent quand meme.
*/

window.QUESTIONNAIRES = window.QUESTIONNAIRES || {};
window.QUESTIONNAIRES.s2 = {
  titre: 'S2',
  questions: [

    /* ---------------------------------------------------------------- 1 */
    {
      enonce: 'Quel classement de ces technologies de média correspond à l’usage actuel, 1 etant le moins utilisé et 4 le plus ?',
      /* Une proposition peut etre une liste : elle s'affiche alors en colonne
         numerotee, bien plus lisible qu'un classement ecrit sur une ligne. */
      propositions: [
        ['Les DVD', 'La TNT', 'Le satellite', 'Le streaming'],
        ['Le satellite', 'Le streaming', 'DVD et Blu-ray', 'La TNT'],
        ['Le satellite', 'DVD et Blu-ray', 'La TNT', 'Le streaming'],
        ['La TNT', 'Le satellite', 'Le streaming', 'DVD et Blu-ray']
      ],
      bonnes: ['C'],
      explication: {
        image: 'assets/q1-medias.jpg',
        imagePleine: true,
        /* Le titre et la liste restent ici : ils réapparaissent si tu retires imagePleine. */
        titre: 'Du moins au plus utilisé',
        liste: [
          'Le satellite — environ 11 %',
          'DVD et Blu-ray — environ 25 % des foyers équipés, mais bien moins en usage réel',
          'La TNT — environ 37 %',
          'Le streaming — environ 64 %'
        ]
      }
    },

    /* ---------------------------------------------------------------- 2 */
    {
      enonce: 'À l’échelle mondiale, quel secteur reçoit la part la plus importante des investissements ?',
      propositions: [
        'Transition énergétique & énergies renouvelables',
        'Industrie automobile & mobilités de demain',
        'Communications & infrastructures numériques',
        'Santé, secteur pharmaceutique & biotechnologies'
      ],
      bonnes: ['C'],
      explication: {
        image: 'assets/q2-numerique.jpg',
        imagePleine: true,
        titre: 'Le numérique rafle la mise',
        liste: [
          'Communications & infrastructures numériques — environ 346 milliards $',
          'Transition énergétique & énergies renouvelables — environ 270 milliards $',
          'Industrie automobile & mobilités de demain — environ 190 milliards $',
          'Santé, pharmacie & biotechnologies — environ 95 milliards $'
        ]
      }
    },

    /* ---------------------------------------------------------------- 3 */
    {
      enonce: 'Le premier appareil photo numérique portable avait quelle résolution ?',
      propositions: ['2 mégapixels', '0,01 mégapixel', '12 mégapixels', '0,5 mégapixel'],
      bonnes: ['B'],
      explication: {
        titre: '0,01 mégapixel, en 1975',
        texte: 'Le tout premier appareil photo numérique a été inventé en 1975 par l’ingénieur Steven Sasson, chez Kodak. Il pesait 3,6 kg et mettait 23 secondes à enregistrer une image sur cassette.',
        image: 'assets/sasson.jpg'
      }
    },

    /* ---------------------------------------------------------------- 4 */
    {
      enonce: 'Pour quelle raison a-t-on créé le QR code ?',
      propositions: [
        'Pour dématérialiser la carte dans les restaurants',
        'Pour suivre des pièces dans l’industrie',
        'Pour protéger les mots de passe dans la crypto',
        'Pour créer des billets de concert ou de match'
      ],
      bonnes: ['B'],
      explication: {
        titre: 'Né dans une usine Toyota',
        texte: 'Le QR code a été inventé en 1994 par Masahiro Hara, ingénieur chez Denso Wave, pour améliorer la traçabilité des pièces dans les usines Toyota.',
        image: 'assets/qr-industrie.jpg'
      }
    },

    /* ---------------------------------------------------------------- 5 */
    {
      enonce: 'Qu’est-ce qui n’existait pas en 2006 ?',
      /* ATTENTION 2 — dans l'Excel, l'option D etait « Google », marquee juste.
         Or Google existe depuis 1998 : quelqu'un dans la salle le dira. Ton texte
         d'explication parlait en fait de Google CHROME (2008). J'ai donc corrige
         l'option en « Google Chrome », ce qui la rend effectivement juste et
         colle a ton explication. Dis-moi si tu preferais autre chose. */
      propositions: ['La cryptomonnaie', 'Facebook', 'L’iPhone', 'Google Chrome'],
      bonnes: ['A', 'C', 'D'],
      explication: {
        titre: 'Trois sur quatre sont postérieurs à 2006',
        liste: [
          'Facebook — 4 février 2004, lancé par Mark Zuckerberg sous le nom de « Thefacebook » depuis sa chambre à Harvard. Le seul qui existait déjà.',
          'L’iPhone — présenté le 9 janvier 2007 par Steve Jobs, commercialisé le 29 juin 2007.',
          'Google Chrome — annoncé le 1er septembre 2008, première version stable deux mois plus tard.',
          'La cryptomonnaie — 3 janvier 2009, premier bloc du Bitcoin miné par Satoshi Nakamoto. Le livre blanc datait du 31 octobre 2008.'
        ]
      }
    },

    /* ---------------------------------------------------------------- 6 */
    {
      enonce: 'Combien de temps ChatGPT a-t-il mis pour atteindre 100 millions d’utilisateurs ? Sachant que Facebook a mis 4 ans et demi, Instagram 2 ans et demi et TikTok 9 mois.',
      propositions: ['2 mois', '6 mois', '10 mois', 'Il ne les a pas encore atteints'],
      bonnes: ['A'],
      explication: {
        titre: 'Deux mois',
        texte: 'Le délai le plus court jamais observé pour atteindre 100 millions d’utilisateurs — jusqu’à ce que Threads le fasse en deux jours.',
        liste: [
          'Google Translate — 78 mois',
          'Spotify — 55 mois',
          'Instagram — 30 mois',
          'TikTok — 9 mois',
          'ChatGPT — 2 mois'
        ],
        image: 'assets/q6-lemonde.jpg'
      }
    },

    /* ---------------------------------------------------------------- 7 */
    {
      enonce: 'Combien de ruptures technologiques a vécues une personne née en 1957 ?',
      propositions: ['1', '4', '7', '12'],
      bonnes: ['C'],
      explication: {
        image: 'assets/q7-ruptures.jpg',
        imagePleine: true,
        titre: 'Sept ruptures en une vie',
        liste: [
          'À 10 ans — la télévision couleur',
          'À 24 ans — l’ordinateur personnel',
          'À 38 ans — internet',
          'À 43 ans — le téléphone mobile',
          'À 50 ans — le smartphone',
          'À 55 ans — le monde connecté et le cloud',
          'À 65 ans — l’intelligence artificielle'
        ]
      }
    },

    /* ---------------------------------------------------------------- 8 */
    {
      enonce: 'Selon les études en cours, combien de maladies pourrait-on dépister grâce à l’œil dans les années à venir ?',
      propositions: ['Une dizaine', 'Une cinquantaine', 'Une centaine', 'Un millier'],
      bonnes: ['C'],
      explication: {
        titre: '105 maladies recensées',
        texte: 'Le fond de l’œil donne un accès direct aux vaisseaux et aux nerfs, sans ouvrir le corps. La liste s’allonge chaque année.',
        defilement: window.MALADIES_OEIL,
        defilementMot: 'maladies'
      }
    },

    /* ---------------------------------------------------------------- 9 */
    {
      /* Question BONUS : aucun point, aucun temps compte. Mais les votes
         s'affichent normalement au mur, et D reste eteinte : la blague maison
         se voit comme la seule fausse, sans que personne ne perde le lot. */
      nonNotee: true,
      enonce: 'Quelles technologies improbables deviendront courantes d’ici 15 ans ?',
      propositions: [
        'Réparer instantanément une brûlure ou un cartilage grâce à l’impression 3D',
        'Piloter la domotique, écrire ou traduire par la pensée grâce à un implant neural',
        'Un vêtement qui change de couleur ou répare seul ses déchirures',
        'Plus aucun client ne se plaindra de son équipement, parce que tout le monde s’équipera chez nous'
      ],
      bonnes: ['A', 'B', 'C'],
      explication: {
        titre: 'Trois sur quatre, et aucun point en jeu',
        texte: 'Les trois premières sont sérieusement à l’étude dans les laboratoires. La quatrième, on aimerait bien — mais on n’en est pas encore là. Personne ne gagne ni ne perd sur cette question.'
      }
    }

    /* --- deux questions a venir --- */
  ]
};
