/* QUESTIONNAIRE S1 — la session du matin, 5 questions.

   Champ "propositions" : exactement 4, dans l'ordre A, B, C, D. Chacune est un
   texte, ou une LISTE de lignes — elle s'affiche alors en colonne numerotee.

   Question a SAISIE LIBRE : mets type: 'annee' au lieu de propositions/bonnes.
     reponse       l'annee attendue (un nombre)
     tolerance     l'ecart encore recompense, en annees
     pointsExact   ce que vaut une reponse pile (2)
     pointsProche  ce que vaut une reponse dans la tolerance (1)
     placeholder   le format montre au joueur (ex. '1999')

   Champ "explication" : la page affichee entre le vert et le classement.
     titre / texte / liste / image / imagePleine / defilement
     aCompleter true = il me manque ta matiere, la page le signale a l'ecran

*/

window.QUESTIONNAIRES = window.QUESTIONNAIRES || {};
window.QUESTIONNAIRES.s1 = {
  titre: 'S1',
  questions: [

    /* ---------------------------------------------------------------- 1 */
    {
      /* Saisie libre : le joueur tape une annee sur son telephone.
         Pile = 2 points, a 3 ans pres = 1 point, au-dela = 0. */
      type: 'annee',
      enonce: 'En quelle année l’Optique Lachal est-elle arrivée à Périgueux ?',
      reponse: 1955,
      tolerance: 3,
      pointsExact: 2,
      pointsProche: 1,
      placeholder: '1999',
      explication: {
        titre: '1955',
        texte: 'Paul Lachal s’installe à Périgueux pour développer son activité d’opticien, après avoir débuté à Saint-Yrieix-la-Perche.',
        image: 'assets/S1-q1-1955.jpg'
      }
    },

    /* ---------------------------------------------------------------- 2 */
    {
      enonce: 'Quel est l’âge moyen des collaborateurs ?',
      propositions: ['30 ans', '36 ans', '40 ans', '46 ans'],
      bonnes: ['C'],
      explication: {
        titre: '39,9 ans, arrondi à 40',
        texte: 'La plus jeune est Margot, à Excideuil. Le doyen de notre belle société n’est autre que François.',
        image: 'assets/S1-q2-Ages.png'
      }
    },

    /* ---------------------------------------------------------------- 3 */
    {
      /* Le singulier de l'enonce est le piege : ils etaient DEUX, et cocher
         les deux rapporte 2 points au lieu d'un seul. */
      enonce: 'Quel est le premier alpiniste à avoir gravi l’Everest ?',
      propositions: ['Paul Lachal', 'Edmund Hillary', 'Tenzing Norgay', 'Christine Janin'],
      bonnes: ['B', 'C'],
      explication: {
        titre: 'Ils étaient deux',
        texte: 'Le 29 mai 1953, Edmund Hillary et le sherpa Tenzing Norgay atteignent le sommet ensemble. Les deux hommes ont toujours refusé de dire lequel avait posé le pied le premier, et l’histoire a surtout retenu le nom du Néo-Zélandais.',
        liste: [
          'Edmund Hillary — apiculteur néo-zélandais, anobli par la reine à son retour.',
          'Tenzing Norgay — sherpa népalais, il en était à sa septième expédition sur l’Everest.',
          'Christine Janin — première Française au sommet, en 1990. Trente-sept ans plus tard.',
          'Paul Lachal — il avait d’autres sommets en tête : deux ans plus tard, il s’installait à Périgueux.'
        ],
        image: 'assets/S1-q3-Everest.jpg'
      }
    },

    /* ---------------------------------------------------------------- 4 */
    {
      enonce: 'Quelle est l’autonomie de la GEN 3 ?',
      propositions: ['5 heures', '8 heures', '9 heures', '12 heures'],
      bonnes: ['C'],
      explication: {
        titre: '9 heures',
        texte: 'Les capacités techniques de la Meta Gen 3 ont légèrement progressé : l’autonomie passe à 9 heures.',
        image: 'assets/S1-q4-Gen3.png'
      }
    },

    /* ---------------------------------------------------------------- 5 */
    {
      enonce: 'Quelle est la seule marque OFG de cette liste ?',
      propositions: ['Ray-Ban', 'Maui Jim', 'Anacolé', 'Etnia'],
      bonnes: ['C'],
      explication: {
        titre: 'OFG : Origine France Garantie',
        texte: 'Anacolé, comme beaucoup de nos fournisseurs, est 100 % Origine France Garantie — fabriquée à la main à Oyonnax.',
        image: 'assets/S1-q5-anacole.jpg'
      }
    }

  ]
};
