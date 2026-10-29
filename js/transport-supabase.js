/* Le Quizz Lachal — transport Supabase.

   Meme interface que js/transport.js : la console et la telecommande ne
   savent pas lequel des deux elles utilisent.

   Le probleme a resoudre : l'interface est SYNCHRONE (etat(), joueurs(),
   votes() renvoient immediatement) alors que Supabase est asynchrone. La
   solution est un CACHE local tenu a jour en temps reel. Les lectures
   servent le cache ; les ecritures partent vers la base et reviennent par
   l'abonnement, qui rafraichit le cache et previent les abonnes.

   Les horloges : le temps de reponse se calcule entierement cote SERVEUR
   (valide_a - depart_a). Celle du telephone ne sert qu'a animer le compte
   a rebours, jamais a marquer des points. */
(function (root) {
  'use strict';

  var CFG = root.CONFIG || {};
  var CLE_MOI     = 'quizz-lachal-joueur';    // sessionStorage : une identite par onglet
  var CLE_DERNIER = 'quizz-lachal-prenom';    // localStorage : le prenom, d'une partie a l'autre
  var CLE_JOURNEE = 'quizz-lachal-journee';   // localStorage : l'archive de la journee

  var sb = null;
  var canal = null;
  var partieSuivie = null;

  function vide() {
    return {
      etat: { phase: 'accueil', questionnaire: null, questionIndex: -1, departA: 0,
              nbQuestions: 0, partieId: 0, typeQuestion: 'qcm', formatSaisie: '' },
      joueurs: [], votes: {}, resultats: {}
    };
  }
  var cache = vide();

  var abonnes = { etat: [], joueurs: [], votes: [], resultats: [] };
  function prevenir(ev) {
    (abonnes[ev] || []).forEach(function (cb) {
      try { cb(cache); } catch (e) { console.error(e); }
    });
  }

  /* ---------------------------------------------------------------- outils */
  function ms(iso) { return iso ? new Date(iso).getTime() : 0; }

  function versEtat(ligne) {
    if (!ligne) return vide().etat;
    return {
      phase: ligne.phase,
      questionnaire: ligne.questionnaire,
      questionIndex: ligne.question_index,
      departA: ms(ligne.depart_a),
      nbQuestions: ligne.nb_questions,
      partieId: Number(ligne.id),
      typeQuestion: ligne.type_question || 'qcm',
      formatSaisie: ligne.format_saisie || '',
      titre: ligne.titre || ''
    };
  }

  /* Le temps d'un vote : difference de deux horodatages SERVEUR, plafonnee
     a la duree du vote. Un vote arrive avant le GO (impossible en pratique)
     compte zero plutot qu'un nombre negatif. */
  function tempsDuVote(ligne, departA) {
    var t = ms(ligne.valide_a) - departA;
    if (!isFinite(t) || t < 0) t = 0;
    return Math.min(t, CFG.DUREE_VOTE_MS || 30000);
  }

  function rangerVote(ligne) {
    var qi = ligne.question;
    cache.votes[qi] = cache.votes[qi] || [];
    if (cache.votes[qi].some(function (v) { return v.joueurId === ligne.joueur_id; })) return false;
    var j = cache.joueurs.filter(function (x) { return x.id === ligne.joueur_id; })[0];
    cache.votes[qi].push({
      joueurId: ligne.joueur_id,
      nom: (j && j.nom) || ligne.joueur_id,
      cases: ligne.cases || [],
      ms: tempsDuVote(ligne, cache.etat.departA),
      valide_a: ligne.valide_a
    });
    return true;
  }

  function rangerResultat(ligne) {
    cache.resultats[ligne.question] = cache.resultats[ligne.question] || {};
    cache.resultats[ligne.question][ligne.joueur_id] = {
      etat: ligne.etat, points: ligne.points, ecart: ligne.ecart
    };
  }

  /* ------------------------------------------------- chargement d'une partie */
  function chargerPartie(ligne) {
    cache.etat = versEtat(ligne);
    partieSuivie = cache.etat.partieId;
    return Promise.all([
      sb.from('joueurs').select('*').eq('partie_id', partieSuivie).order('rejoint_a'),
      sb.from('votes').select('*').eq('partie_id', partieSuivie),
      sb.from('resultats').select('*').eq('partie_id', partieSuivie)
    ]).then(function (r) {
      cache.joueurs = (r[0].data || []).map(function (j) { return { id: j.id, nom: j.nom }; });
      cache.votes = {};
      (r[1].data || []).forEach(rangerVote);
      Object.keys(cache.votes).forEach(function (qi) {
        cache.votes[qi].sort(function (a, b) { return a.ms - b.ms; });
      });
      cache.resultats = {};
      (r[2].data || []).forEach(rangerResultat);
      brancherCanal(partieSuivie);
      ['etat', 'joueurs', 'votes', 'resultats'].forEach(prevenir);
    });
  }

  function brancherCanal(partieId) {
    if (canal) { sb.removeChannel(canal); canal = null; }
    var f = 'partie_id=eq.' + partieId;
    canal = sb.channel('quizz-' + partieId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties',
                                filter: 'id=eq.' + partieId }, function (m) {
        cache.etat = versEtat(m.new);
        prevenir('etat');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'joueurs', filter: f }, function (m) {
        if (cache.joueurs.some(function (j) { return j.id === m.new.id; })) return;
        cache.joueurs.push({ id: m.new.id, nom: m.new.nom });
        prevenir('joueurs');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes', filter: f }, function (m) {
        if (rangerVote(m.new)) {
          cache.votes[m.new.question].sort(function (a, b) { return a.ms - b.ms; });
          prevenir('votes');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultats', filter: f }, function (m) {
        rangerResultat(m.new);
        prevenir('resultats');
      })
      .subscribe();
  }

  /* La console cree des parties ; tout le monde suit la plus recente. */
  function surveillerNouvellesParties() {
    sb.channel('quizz-parties')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'parties' }, function (m) {
        if (Number(m.new.id) > (partieSuivie || 0)) chargerPartie(m.new);
      })
      .subscribe();
  }

  function dernierePartie() {
    return sb.from('parties').select('*').order('id', { ascending: false }).limit(1)
      .then(function (r) {
        var l = (r.data || [])[0];
        if (l) return chargerPartie(l);
        prevenir('etat');
      });
  }

  /* --------------------------------------------------------------- sondage
     Le temps reel de Supabase est rapide, mais pas infaillible : un wifi
     de salle de reunion qui coupe une websocket, un telephone qui sort de
     veille, et l'appareil n'est plus prevenu de rien — sans le savoir. Un
     sondage lent tourne donc en parallele et rattrape ce qui est passe a
     cote. C'est la ceinture par dessus les bretelles.

     Il est volontairement econome : une seule ligne (la partie la plus
     recente) pour tout le monde, la liste des joueurs pendant la seule
     inscription, et les votes de la question en cours uniquement sur la
     console — elle se reconnait au fait qu'elle est le seul appareil
     abonne aux votes. */
  var minuteurSondage = null;
  /* Une partie qu'on vient d'annuler. L'ecriture « phase = accueil » met
     une fraction de seconde a arriver ; sans ce garde-fou, le sondage peut
     relire la ligne d'avant et nous renvoyer une seconde sur l'ecran
     d'inscription. */
  var partieAnnulee = 0;

  function estConsole() { return (abonnes.votes || []).length > 0; }

  function rattraperJoueurs() {
    sb.from('joueurs').select('*').eq('partie_id', partieSuivie).order('rejoint_a')
      .then(function (r) {
        var neufs = 0;
        (r.data || []).forEach(function (j) {
          if (cache.joueurs.some(function (x) { return x.id === j.id; })) return;
          cache.joueurs.push({ id: j.id, nom: j.nom });
          neufs++;
        });
        if (neufs) prevenir('joueurs');
      }, function () {});
  }

  function rattraperVotes(qi) {
    sb.from('votes').select('*').eq('partie_id', partieSuivie).eq('question', qi)
      .then(function (r) {
        var neufs = 0;
        (r.data || []).forEach(function (v) { if (rangerVote(v)) neufs++; });
        if (neufs) {
          cache.votes[qi].sort(function (a, b) { return a.ms - b.ms; });
          prevenir('votes');
        }
      }, function () {});
  }

  function sonder() {
    if (!sb) return;
    sb.from('parties').select('*').order('id', { ascending: false }).limit(1)
      .then(function (r) {
        var l = (r.data || [])[0];
        if (!l) return;
        var id = Number(l.id);
        /* Plus recente que la notre : une nouvelle partie a commence. */
        if (id > (partieSuivie || 0)) { chargerPartie(l); return; }
        /* Plus ancienne : c'est notre propre insertion qui est encore en
           vol. On ne se laisse surtout pas ramener en arriere. */
        if (id !== partieSuivie) return;
        if (id === partieAnnulee && l.phase !== 'accueil') return;

        var neuf = versEtat(l);
        if (neuf.phase !== cache.etat.phase ||
            neuf.questionIndex !== cache.etat.questionIndex ||
            neuf.departA !== cache.etat.departA) {
          cache.etat = neuf;
          prevenir('etat');
        }
        if (cache.etat.phase === 'inscription') rattraperJoueurs();
        if (estConsole() && cache.etat.questionIndex >= 0) rattraperVotes(cache.etat.questionIndex);
      }, function () {});   /* coupure reseau : on retentera au tour suivant */
  }

  function lancerSondage() {
    if (minuteurSondage) return;
    minuteurSondage = setInterval(sonder, CFG.CADENCE_SONDAGE_MS || 2500);
    /* Un telephone qui revient de veille a pu tout manquer : on rattrape
       sans attendre le prochain tour. */
    if (root.document && root.document.addEventListener) {
      root.document.addEventListener('visibilitychange', function () {
        if (!root.document.hidden) sonder();
      });
    }
  }

  /* ------------------------------------------------------------- interface */
  var T = {
    pret: null,   // promesse resolue quand le cache est charge

    demarrer: function () {
      if (T.pret) return T.pret;
      if (!root.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_CLE) {
        T.pret = Promise.reject(new Error('Supabase n\'est pas configuré (js/config.js).'));
        return T.pret;
      }
      sb = root.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_CLE, {
        realtime: { params: { eventsPerSecond: 20 } }
      });
      surveillerNouvellesParties();
      lancerSondage();
      T.pret = dernierePartie();
      return T.pret;
    },

    creerPartie: function (cle, nbQuestions, titre) {
      var id = Date.now();
      partieAnnulee = 0;
      cache = vide();
      cache.etat = { phase: 'inscription', questionnaire: cle, questionIndex: -1, departA: 0,
                     nbQuestions: nbQuestions, partieId: id, typeQuestion: 'qcm',
                     formatSaisie: '', titre: titre || '' };
      partieSuivie = id;
      ['etat', 'joueurs', 'votes', 'resultats'].forEach(prevenir);
      sb.from('parties').insert({
        id: id, questionnaire: cle, titre: titre || '', phase: 'inscription',
        question_index: -1, nb_questions: nbQuestions
      }).then(function (r) {
        if (r && r.error) {
          console.error('Creation de la partie refusee', r.error);
          alert('La partie n\'a pas pu etre creee sur Supabase :\n\n' + r.error.message +
                '\n\nVerifie la connexion, puis recommence.');
          return;
        }
        brancherCanal(id);
      });
      return cache.etat;
    },

    etat: function () { return cache.etat; },

    majEtat: function (patch) {
      var colonnes = {};
      Object.keys(patch).forEach(function (k) {
        cache.etat[k] = patch[k];
        if (k === 'phase') colonnes.phase = patch[k];
        if (k === 'questionIndex') colonnes.question_index = patch[k];
        if (k === 'nbQuestions') colonnes.nb_questions = patch[k];
        if (k === 'typeQuestion') colonnes.type_question = patch[k];
        if (k === 'formatSaisie') colonnes.format_saisie = patch[k];
      });
      /* Le depart du chrono est pose par l'horloge du SERVEUR : c'est la
         meme que celle qui horodate les votes, donc la soustraction a un
         sens. « now » est une valeur reconnue par Postgres. */
      if (patch.phase === 'vote') colonnes.depart_a = 'now';
      prevenir('etat');
      if (cache.etat.partieId && Object.keys(colonnes).length) {
        sb.from('parties').update(colonnes).eq('id', cache.etat.partieId)
          .select().then(function (r) {
            var l = (r.data || [])[0];
            if (l) { cache.etat = versEtat(l); prevenir('etat'); }
          });
      }
      return cache.etat;
    },

    rejoindre: function (nom) {
      nom = String(nom || '').trim().slice(0, 18);
      if (!nom) return null;
      if (cache.joueurs.some(function (j) { return j.nom.toLowerCase() === nom.toLowerCase(); })) {
        return { erreur: 'Ce prénom est déjà pris. Ajoute une initiale.' };
      }
      var joueur = { id: 'j' + Date.now() + Math.floor(Math.random() * 1000), nom: nom };
      cache.joueurs.push(joueur);
      prevenir('joueurs');
      try { sessionStorage.setItem(CLE_MOI, JSON.stringify({ id: joueur.id, nom: joueur.nom, partieId: cache.etat.partieId })); } catch (e) {}
      try { localStorage.setItem(CLE_DERNIER, joueur.nom); } catch (e) {}
      sb.from('joueurs').insert({ id: joueur.id, partie_id: cache.etat.partieId, nom: nom })
        .then(function (r) {
          if (r.error) {   // prenom pris entre-temps : on se retire proprement
            cache.joueurs = cache.joueurs.filter(function (j) { return j.id !== joueur.id; });
            try { sessionStorage.removeItem(CLE_MOI); } catch (e) {}
            prevenir('joueurs');
          }
        });
      return joueur;
    },

    moi: function () {
      try {
        var m = JSON.parse(sessionStorage.getItem(CLE_MOI));
        if (!m) return null;
        if (m.partieId !== cache.etat.partieId) return { ancien: true, nom: m.nom };
        return cache.joueurs.some(function (j) { return j.id === m.id; }) ? m : { ancien: true, nom: m.nom };
      } catch (e) { return null; }
    },

    oublierMoi: function () { try { sessionStorage.removeItem(CLE_MOI); } catch (e) {} },

    joueurs: function () { return cache.joueurs; },

    dernierNom: function () {
      try { return localStorage.getItem(CLE_DERNIER) || ''; } catch (e) { return ''; }
    },

    /* Le « ms » passe par l'appelant est ignore : c'est le serveur qui
       horodate, sinon il suffirait de reculer l'horloge de son telephone. */
    voter: function (qi, cases) {
      var moi = T.moi();
      if (!moi || moi.ancien) return false;
      if (cache.etat.phase !== 'vote') return false;
      if ((cache.votes[qi] || []).some(function (v) { return v.joueurId === moi.id; })) return false;
      sb.from('votes').insert({
        partie_id: cache.etat.partieId, joueur_id: moi.id,
        question: qi, cases: cases.slice()
      }).then(function () {});
      return true;
    },

    votes: function (qi) { return cache.votes[qi] || []; },

    publierResultats: function (qi, map) {
      cache.resultats[qi] = map;
      prevenir('resultats');
      var lignes = Object.keys(map).map(function (jid) {
        return { partie_id: cache.etat.partieId, joueur_id: jid, question: qi,
                 etat: map[jid].etat, points: map[jid].points,
                 ecart: map[jid].ecart == null ? null : map[jid].ecart };
      });
      if (lignes.length) {
        sb.from('resultats').upsert(lignes, { onConflict: 'partie_id,joueur_id,question' }).then(function () {});
      }
    },

    resultat: function (qi, joueurId) {
      var r = cache.resultats[qi];
      return (r && r[joueurId]) || null;
    },

    sur: function (ev, cb) {
      if (!abonnes[ev]) abonnes[ev] = [];
      abonnes[ev].push(cb);
      return function () { abonnes[ev] = abonnes[ev].filter(function (f) { return f !== cb; }); };
    },

    /* ---- L'archive de la journee : inchangee, elle vit sur le PC console ---- */
    journee: function () {
      try {
        var d = JSON.parse(localStorage.getItem(CLE_JOURNEE));
        return (d && Array.isArray(d.parties)) ? d : { parties: [] };
      } catch (e) { return { parties: [] }; }
    },
    archiver: function (partie) {
      if (!partie || !partie.id) return;
      var d = T.journee();
      d.parties = d.parties.filter(function (p) { return p.id !== partie.id; });
      d.parties.push(partie);
      d.parties.sort(function (a, b) { return (a.fini || 0) - (b.fini || 0); });
      try { localStorage.setItem(CLE_JOURNEE, JSON.stringify(d)); } catch (e) {}
    },
    viderJournee: function () { try { localStorage.removeItem(CLE_JOURNEE); } catch (e) {} },

    /* Annuler. En local il suffisait d'oublier la partie ; ici elle existe
       aussi dans la base, et le sondage la retrouverait aussitot pour nous
       ramener sur l'ecran d'inscription. On la referme donc vraiment : la
       phase repasse a « accueil », ce qui renvoie du meme coup tous les
       telephones a leur ecran de prenom. On garde son identifiant pour ne
       pas la recharger, et la prochaine partie en recevra un plus grand. */
    reinitialiser: function () {
      var id = cache.etat.partieId;
      partieAnnulee = id;
      if (canal) { sb.removeChannel(canal); canal = null; }
      cache = vide();
      partieSuivie = id || null;
      ['etat', 'joueurs', 'votes', 'resultats'].forEach(prevenir);
      if (id) {
        sb.from('parties')
          .update({ phase: 'accueil', question_index: -1 })
          .eq('id', id)
          .then(function (r) {
            if (r && r.error) console.error('Annulation non enregistree', r.error);
          });
      }
    }
  };

  /* On ne prend la main que si Supabase est configure ET charge. Sinon le
     transport local reste en place : le simulateur a onglets continue de
     marcher exactement comme avant. */
  if (CFG.SUPABASE_URL && CFG.SUPABASE_CLE && root.supabase) {
    root.Transport = T;
    root.TRANSPORT_UTILISE = 'supabase';
  } else {
    root.TRANSPORT_UTILISE = 'local';
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
