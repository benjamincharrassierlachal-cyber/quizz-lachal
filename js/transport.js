/* Le fil entre la console et les telecommandes.

   Deux implementations possibles derriere la meme interface :
     - TransportLocal    : onglets d'un meme navigateur (BroadcastChannel). C'est le simulateur.
     - TransportSupabase : le vrai temps reel, a brancher plus tard.

   La console et la telecommande ne connaissent que l'interface ci-dessous ;
   changer de transport ne demandera aucune modification de leur code.

     creerPartie(cle, nb)       cree une partie neuve et vide tout le reste
     etat() / majEtat(patch)    l'etat courant de la partie (console seule ecrit)
     rejoindre(nom)             inscrit un joueur, renvoie { id, nom }
     moi()                      le joueur de cet onglet, ou null
     joueurs()                  la liste des inscrits
     voter(qi, cases, ms)       enregistre un vote
     votes(qi)                  les votes d'une question
     publierResultats(qi, map)  la console publie ce que chaque telephone doit afficher
     resultat(qi, joueurId)     le resultat d'un joueur pour une question
     sur(evenement, callback)   'etat' | 'joueurs' | 'votes' | 'resultats'
     reinitialiser()            retour a l'accueil, tout est efface
*/
(function (root) {
  'use strict';

  var CLE = 'quizz-lachal-v1';
  var CLE_MOI = 'quizz-lachal-joueur';       // sessionStorage : une identite par onglet
  var CLE_DERNIER = 'quizz-lachal-prenom';   // localStorage : le prenom, pour la partie suivante
  var CLE_JOURNEE = 'quizz-lachal-journee';  // localStorage : l'archive des parties terminees

  function vide() {
    return {
      etat: { phase: 'accueil', questionnaire: null, questionIndex: -1, departA: 0, nbQuestions: 0, partieId: 0 },
      joueurs: [],
      votes: {},      // votes[questionIndex] = [{ joueurId, nom, cases, ms }]
      resultats: {}   // resultats[questionIndex][joueurId] = { etat, points }
    };
  }

  function lire() {
    try {
      var brut = localStorage.getItem(CLE);
      if (!brut) return vide();
      var d = JSON.parse(brut);
      return (d && d.etat) ? d : vide();
    } catch (e) { return vide(); }
  }

  function ecrire(d, evenement) {
    try { localStorage.setItem(CLE, JSON.stringify(d)); } catch (e) {}
    diffuser(evenement);
  }

  var canal = null;
  try { canal = new BroadcastChannel(CLE); } catch (e) { canal = null; }

  var abonnes = { etat: [], joueurs: [], votes: [], resultats: [] };

  function notifier(evenement) {
    var d = lire();
    (abonnes[evenement] || []).forEach(function (cb) {
      try { cb(d); } catch (e) { console.error(e); }
    });
  }

  function diffuser(evenement) {
    notifier(evenement);                              // cet onglet
    if (canal) canal.postMessage({ evenement: evenement });   // les autres
  }

  if (canal) {
    canal.onmessage = function (m) {
      if (m && m.data && m.data.evenement) notifier(m.data.evenement);
    };
  }
  // filet de secours si BroadcastChannel manque (vieux navigateurs)
  window.addEventListener('storage', function (e) {
    if (e.key === CLE) { ['etat', 'joueurs', 'votes', 'resultats'].forEach(notifier); }
  });

  var T = {
    creerPartie: function (cle, nbQuestions) {
      var d = vide();
      d.etat = {
        phase: 'inscription',
        questionnaire: cle,
        questionIndex: -1,
        departA: 0,
        nbQuestions: nbQuestions,
        partieId: Date.now()
      };
      ecrire(d, 'etat');
      ['joueurs', 'votes', 'resultats'].forEach(diffuser);
      return d.etat;
    },

    etat: function () { return lire().etat; },

    majEtat: function (patch) {
      var d = lire();
      Object.keys(patch).forEach(function (k) { d.etat[k] = patch[k]; });
      ecrire(d, 'etat');
      return d.etat;
    },

    rejoindre: function (nom) {
      var d = lire();
      nom = String(nom || '').trim().slice(0, 18);
      if (!nom) return null;
      var existe = d.joueurs.some(function (j) {
        return j.nom.toLowerCase() === nom.toLowerCase();
      });
      if (existe) return { erreur: 'Ce prénom est déjà pris. Ajoute une initiale.' };
      var joueur = { id: 'j' + Date.now() + Math.floor(Math.random() * 1000), nom: nom };
      d.joueurs.push(joueur);
      ecrire(d, 'joueurs');
      try { sessionStorage.setItem(CLE_MOI, JSON.stringify({ id: joueur.id, nom: joueur.nom, partieId: d.etat.partieId })); } catch (e) {}
      try { localStorage.setItem(CLE_DERNIER, joueur.nom); } catch (e) {}
      return joueur;
    },

    moi: function () {
      try {
        var m = JSON.parse(sessionStorage.getItem(CLE_MOI));
        if (!m) return null;
        var d = lire();
        // l'identite ne vaut que pour la partie en cours
        if (m.partieId !== d.etat.partieId) return { ancien: true, nom: m.nom };
        return d.joueurs.some(function (j) { return j.id === m.id; }) ? m : { ancien: true, nom: m.nom };
      } catch (e) { return null; }
    },

    oublierMoi: function () { try { sessionStorage.removeItem(CLE_MOI); } catch (e) {} },

    joueurs: function () { return lire().joueurs; },

    /* Le prenom de la derniere partie jouee sur ce telephone. Survit a la
       fermeture de l'onglet : le matin on tape son prenom, l'apres-midi il
       est deja la. */
    dernierNom: function () {
      try { return localStorage.getItem(CLE_DERNIER) || ''; } catch (e) { return ''; }
    },

    voter: function (qi, cases, ms) {
      var d = lire();
      var moi = T.moi();
      if (!moi || moi.ancien) return false;
      if (d.etat.phase !== 'vote') return false;          // buzzer passe : refus cote transport
      d.votes[qi] = d.votes[qi] || [];
      var deja = d.votes[qi].some(function (v) { return v.joueurId === moi.id; });
      if (deja) return false;                              // un seul vote par question
      d.votes[qi].push({ joueurId: moi.id, nom: moi.nom, cases: cases.slice(), ms: ms });
      ecrire(d, 'votes');
      return true;
    },

    votes: function (qi) { return lire().votes[qi] || []; },

    publierResultats: function (qi, map) {
      var d = lire();
      d.resultats[qi] = map;
      ecrire(d, 'resultats');
    },

    resultat: function (qi, joueurId) {
      var r = lire().resultats[qi];
      return (r && r[joueurId]) || null;
    },

    sur: function (evenement, cb) {
      if (!abonnes[evenement]) abonnes[evenement] = [];
      abonnes[evenement].push(cb);
      return function () {
        abonnes[evenement] = abonnes[evenement].filter(function (f) { return f !== cb; });
      };
    },

    /* ---- L'archive de la journee ----
       Elle vit dans sa PROPRE cle, pour que le retour a l'accueil (qui vide
       la partie en cours) ne l'emporte pas avec lui. C'est elle qui permet
       le classement general du soir. */
    journee: function () {
      try {
        var d = JSON.parse(localStorage.getItem(CLE_JOURNEE));
        return (d && Array.isArray(d.parties)) ? d : { parties: [] };
      } catch (e) { return { parties: [] }; }
    },

    /* Enregistre le classement final d'une partie. Rejouer la meme partie
       remplace son entree au lieu de la dupliquer. */
    archiver: function (partie) {
      if (!partie || !partie.id) return;
      var d = T.journee();
      d.parties = d.parties.filter(function (p) { return p.id !== partie.id; });
      d.parties.push(partie);
      d.parties.sort(function (a, b) { return (a.fini || 0) - (b.fini || 0); });
      try { localStorage.setItem(CLE_JOURNEE, JSON.stringify(d)); } catch (e) {}
    },

    viderJournee: function () {
      try { localStorage.removeItem(CLE_JOURNEE); } catch (e) {}
    },

    reinitialiser: function () {
      ecrire(vide(), 'etat');
      ['joueurs', 'votes', 'resultats'].forEach(diffuser);
    }
  };

  root.Transport = T;
})(typeof globalThis !== 'undefined' ? globalThis : this);
