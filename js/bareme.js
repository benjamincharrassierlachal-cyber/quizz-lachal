/* Le Quizz Lachal — moteur de score et de classement.
   Script classique (pas de module) : fonctionne en file:// comme en https://.
   Aucune dependance. Toute la regle du jeu tient ici. */
(function (root) {
  'use strict';

  var DUREE_MAX_MS = 30000;   // le buzzer
  var LETTRES = ['A', 'B', 'C', 'D'];

  /* Regle arretee :
       - une seule case fausse cochee  -> 0 point
       - sinon                          -> 1 point par bonne case cochee
     La clause "trop de cases" est inutile : pour cocher plus de cases qu'il n'y a
     de bonnes reponses, il faut forcement en cocher une fausse. */
  /* Une proposition est soit un texte, soit une liste de lignes
     (pour les questions de classement, plus lisibles en colonne). */
  function propositionValide(p) {
    if (Array.isArray(p)) {
      return p.length > 0 && p.every(function (x) { return String(x || '').trim(); });
    }
    return !!String(p || '').trim();
  }

  function texteProposition(p) {
    return Array.isArray(p) ? p.join(' · ') : String(p == null ? '' : p);
  }

  function noter(cochees, bonnes) {
    if (!Array.isArray(cochees) || cochees.length === 0) return 0;
    for (var i = 0; i < cochees.length; i++) {
      if (bonnes.indexOf(cochees[i]) === -1) return 0;
    }
    return cochees.length;
  }

  /* Sans-faute = toutes les bonnes cases, aucune fausse. Seul cas qui declenche
     les confettis et la vibration. */
  function sansFaute(cochees, bonnes) {
    return noter(cochees, bonnes) === bonnes.length && bonnes.length > 0;
  }

  /* Question a saisie libre : on tape une annee.
       pile                  -> pointsExact (2 par defaut)
       a tolerance pres      -> pointsProche (1 par defaut)
       au-dela               -> 0
     Une saisie vide ou illisible vaut zero, sans planter. */
  function ecartAnnee(saisie, q) {
    var n = parseInt(String(saisie == null ? '' : saisie).trim(), 10);
    if (!isFinite(n)) return null;
    return Math.abs(n - q.reponse);
  }

  function etatAnnee(saisie, q) {
    var ecart = ecartAnnee(saisie, q);
    if (ecart === null) return { etat: 'rate', points: 0, ecart: null };
    if (ecart === 0) return { etat: 'gagne', points: q.pointsExact || 2, ecart: 0 };
    if (ecart <= (q.tolerance || 0)) return { etat: 'partiel', points: q.pointsProche || 1, ecart: ecart };
    return { etat: 'rate', points: 0, ecart: ecart };
  }

  /* Le point d'entree unique : donne l'etat d'un joueur pour une question,
     quel que soit son type. Tout le reste du jeu passe par ici. */
  function etatPourQuestion(q, cases) {
    if (!q) return { etat: 'rate', points: 0 };
    if (q.nonNotee) return { etat: 'bonus', points: 0 };
    if (q.type === 'annee') return etatAnnee((cases || [])[0], q);
    return etatJoueur(cases || [], q.bonnes);
  }

  /* Ce que vaut une question au maximum. */
  function pointsMax(q) {
    if (q.nonNotee) return 0;
    if (q.type === 'annee') return q.pointsExact || 2;
    return q.bonnes.length;
  }

  /* Les trois etats de l'ecran telephone apres la revelation. */
  function etatJoueur(cochees, bonnes, nonNotee) {
    /* Question bonus : personne ne marque, personne ne perd. */
    if (nonNotee) return { etat: 'bonus', points: 0 };
    var pts = noter(cochees, bonnes);
    if (pts === 0) return { etat: 'rate', points: 0 };
    if (sansFaute(cochees, bonnes)) return { etat: 'gagne', points: pts };
    return { etat: 'partiel', points: pts };
  }

  /* Temps retenu pour une question. Une non-reponse coute le maximum. */
  function tempsReponse(msDepuisGo) {
    if (typeof msDepuisGo !== 'number' || !isFinite(msDepuisGo)) return DUREE_MAX_MS;
    return Math.max(0, Math.min(DUREE_MAX_MS, msDepuisGo));
  }

  /* Classement d'une partie.
     joueurs : [{ id, nom, reponses: [{ cochees, ms }] }]
     corrige : [{ bonnes: ['A','C'] }]
     Ordre : points decroissants, puis temps cumule croissant,
             puis meilleur temps sur une seule question croissant. */
  function classer(joueurs, corrige) {
    var lignes = joueurs.map(function (j) {
      var points = 0, cumul = 0, meilleur = Infinity, notees = 0;
      for (var q = 0; q < corrige.length; q++) {
        /* Une question bonus ne compte ni en points ni en temps :
           elle ne doit pas peser sur l'attribution du lot. */
        if (corrige[q].nonNotee) continue;
        var rep = (j.reponses && j.reponses[q]) || {};
        var t = tempsReponse(rep.ms);
        points += etatPourQuestion(corrige[q], casesDe(rep)).points;
        cumul += t;
        notees++;
        if (t < meilleur) meilleur = t;
      }
      return {
        id: j.id,
        nom: j.nom,
        points: points,
        cumulMs: cumul,
        nbNotees: notees,
        meilleurMs: meilleur === Infinity ? DUREE_MAX_MS : meilleur
      };
    });

    lignes.sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      if (a.cumulMs !== b.cumulMs) return a.cumulMs - b.cumulMs;
      if (a.meilleurMs !== b.meilleurMs) return a.meilleurMs - b.meilleurMs;
      return a.nom.localeCompare(b.nom, 'fr');
    });

    // rang, avec ex aequo honnetes (memes points, meme cumul, meme meilleur temps)
    var rang = 0, precedent = null;
    lignes.forEach(function (l, i) {
      var cle = l.points + '|' + l.cumulMs + '|' + l.meilleurMs;
      if (cle !== precedent) { rang = i + 1; precedent = cle; }
      l.rang = rang;
    });
    return lignes;
  }

  /* Le classement de la journee : on additionne les parties deja jouees.

     Les joueurs sont rapproches par leur PRENOM, a la casse et aux espaces
     pres. C'est le seul lien possible entre le matin et le soir, puisque
     chaque partie cree de nouvelles identites.

     Le departage ne peut pas se faire au temps CUMULE : quelqu'un qui n'a
     joue qu'une session aurait un cumul deux fois plus petit, donc un
     avantage imerite. On departage donc au temps MOYEN par question. */
  function classerJournee(parties) {
    var par = {};
    (parties || []).forEach(function (p) {
      (p.classement || []).forEach(function (l) {
        var cle = String(l.nom || '').trim().toLowerCase();
        if (!cle) return;
        if (!par[cle]) {
          par[cle] = { nom: l.nom, points: 0, cumulMs: 0, nbNotees: 0,
                       meilleurMs: DUREE_MAX_MS, sessions: 0, detail: [] };
        }
        var e = par[cle];
        e.points += l.points || 0;
        e.cumulMs += l.cumulMs || 0;
        e.nbNotees += l.nbNotees || 0;
        e.meilleurMs = Math.min(e.meilleurMs, l.meilleurMs == null ? DUREE_MAX_MS : l.meilleurMs);
        e.sessions += 1;
        e.detail.push({ titre: p.titre || '?', points: l.points || 0 });
      });
    });

    var lignes = Object.keys(par).map(function (k) {
      var e = par[k];
      e.moyenneMs = e.nbNotees ? Math.round(e.cumulMs / e.nbNotees) : DUREE_MAX_MS;
      return e;
    });

    lignes.sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      if (a.moyenneMs !== b.moyenneMs) return a.moyenneMs - b.moyenneMs;
      if (a.meilleurMs !== b.meilleurMs) return a.meilleurMs - b.meilleurMs;
      return a.nom.localeCompare(b.nom, 'fr');
    });

    var rang = 0, precedent = null;
    lignes.forEach(function (l, i) {
      var cle = l.points + '|' + l.moyenneMs + '|' + l.meilleurMs;
      if (cle !== precedent) { rang = i + 1; precedent = cle; }
      l.rang = rang;
    });
    return lignes;
  }

  /* Ordre de la montee des noms au mur : du plus rapide au plus lent.
     Ceux qui n'ont rien coche ne montent pas, ils sont comptes a part. */
  function casesDe(v) { return (v && (v.cases || v.cochees)) || []; }

  function ordreRevelation(votes) {
    var montent = votes.filter(function (v) { return casesDe(v).length > 0; });
    var absents = votes.length - montent.length;
    montent.sort(function (a, b) { return tempsReponse(a.ms) - tempsReponse(b.ms); });
    return { montent: montent, sansReponse: absents };
  }

  /* Verifie un fichier de questionnaire avant de lancer une partie.
     Mieux vaut une erreur ici qu'une question cassee devant 40 personnes. */
  function verifierQuestionnaire(q) {
    var erreurs = [];
    if (!q || !Array.isArray(q.questions) || q.questions.length === 0) {
      return ['Le questionnaire ne contient aucune question.'];
    }
    q.questions.forEach(function (item, i) {
      var n = i + 1;
      if (!item.enonce || !String(item.enonce).trim()) erreurs.push('Q' + n + ' : enonce vide.');

      if (item.type === 'annee') {
        if (typeof item.reponse !== 'number' || !isFinite(item.reponse)) {
          erreurs.push('Q' + n + ' : il faut une reponse numerique (l annee attendue).');
        }
        if (item.propositions) erreurs.push('Q' + n + ' : une question a saisie libre n a pas de propositions.');
        if (item.bonnes) erreurs.push('Q' + n + ' : une question a saisie libre n a pas de lettres bonnes.');
        if (item.tolerance != null && (typeof item.tolerance !== 'number' || item.tolerance < 0)) {
          erreurs.push('Q' + n + ' : la tolerance doit etre un nombre positif.');
        }
        return;
      }

      if (!Array.isArray(item.propositions) || item.propositions.length !== 4) {
        erreurs.push('Q' + n + ' : il faut exactement 4 propositions.');
      } else if (item.propositions.some(function (p) { return !propositionValide(p); })) {
        erreurs.push('Q' + n + ' : une proposition est vide.');
      }
      if (!Array.isArray(item.bonnes) || item.bonnes.length === 0) {
        erreurs.push('Q' + n + ' : aucune bonne reponse indiquee.');
      } else {
        var plafond = item.nonNotee ? 4 : 3;
        if (item.bonnes.length > plafond) {
          erreurs.push('Q' + n + ' : ' + plafond + ' bonnes reponses au maximum' +
                       (item.nonNotee ? ' (question bonus).' : '.'));
        }
        item.bonnes.forEach(function (b) {
          if (LETTRES.indexOf(b) === -1) erreurs.push('Q' + n + ' : lettre inconnue "' + b + '".');
        });
        var vues = {};
        item.bonnes.forEach(function (b) {
          if (vues[b]) erreurs.push('Q' + n + ' : la lettre ' + b + ' est repetee.');
          vues[b] = true;
        });
      }
    });
    return erreurs;
  }

  root.QL = root.QL || {};
  root.QL.DUREE_MAX_MS = DUREE_MAX_MS;
  root.QL.LETTRES = LETTRES;
  root.QL.etatAnnee = etatAnnee;
  root.QL.etatPourQuestion = etatPourQuestion;
  root.QL.pointsMax = pointsMax;
  root.QL.propositionValide = propositionValide;
  root.QL.texteProposition = texteProposition;
  root.QL.noter = noter;
  root.QL.sansFaute = sansFaute;
  root.QL.etatJoueur = etatJoueur;
  root.QL.tempsReponse = tempsReponse;
  root.QL.classer = classer;
  root.QL.classerJournee = classerJournee;
  root.QL.casesDe = casesDe;
  root.QL.ordreRevelation = ordreRevelation;
  root.QL.verifierQuestionnaire = verifierQuestionnaire;
})(typeof globalThis !== 'undefined' ? globalThis : this);
