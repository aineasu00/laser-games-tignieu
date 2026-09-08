# Brief agent — Parcours de réservation anniversaire

Document de conception du 8 septembre 2026. Aucun code à produire à ce stade. Aucune mise en production, réservation réelle ou communication client à déclencher. L’objectif est un parcours mobile rapide, rassurant et cohérent avec l’exploitation réelle.

Mise à jour après validation de Cédric : la réalisation de la préversion est désormais autorisée. Le calendrier et les critères de groupe/formule partagent le premier écran ; aucune étape préalable ne masque le calendrier. Le parcours réalisé devient « Votre créneau → Vos coordonnées → Confirmation ». Les sections de conception ci-dessous restent le contexte, avec cette nouvelle priorité d’affichage. La lecture du vrai Google Agenda est maintenant configurée dans la prévisualisation ; les réservations réelles et toutes les écritures restent désactivées jusqu’à la recette finale.

## 1. Objectif et preuves disponibles

Permettre à un parent de choisir une formule et une disponibilité, comprendre le prix et réserver sans compte ni échange obligatoire par e-mail. Garder une demande accompagnée pour les situations qui exigent réellement Cédric.

Les enseignements viennent des échanges de cette conversation et des règles métier disponibles, pas d’une nouvelle lecture exhaustive de Gmail. Ils ne permettent pas de quantifier les abandons ni d’attribuer des ventes perdues à une cause précise.

Enseignements concrets :

- Séparer l’identité du parent de celle de l’enfant : Mélanie est la mère de Léandre, ce ne sont pas deux identités contradictoires.
- Conserver une date et une heure explicites, et un statut unique : proposition, demande en attente ou réservation confirmée.
- Afficher partout la même règle de paiement, pour éviter les contradictions rencontrées dans les e-mails.
- Accepter le nombre approximatif annoncé et ne pas exiger la liste des invités.
- Ne pas faire reconfirmer au parent ce qui est déjà réellement confirmé et inscrit.

## 2. Règles acquises et points à préciser

- Une partie signifie 20 minutes de jeu. Prévoir environ 10 minutes de préparation des joueurs. Les blocs techniques de 30 minutes servent au planning interne.
- Explorateur : 16 € par enfant, une partie, présence totale d’environ 50 minutes.
- Commandant : 20 € par enfant, deux parties, présence totale de 1 h 45 à 2 h. Les passages sont espacés d’environ une heure.
- Nouvelle instruction confirmée par Cédric : le vendredi après l’école, formule anniversaire complète à 15 € au lieu de 20 € par enfant, avec deux parties, goûter, boissons et friandises.
- Aucun anniversaire le jeudi. Exclure ce jour du calendrier anniversaire, même si le site présente des horaires d’ouverture pour d’autres activités.
- Aucun paiement en ligne ni acompte. Règlement sur place après l’anniversaire, le jour de l’événement, selon le nombre d’enfants réellement présents.
- L’âge fêté sert de référence au groupe. Pour un groupe comprenant des moins de 14 ans, un adulte joue avec les enfants et compte dans le matériel.
- Le matériel déclaré dans les règles actuelles est de 13 gilets et 4 pistolets. Vérifier leur disponibilité réelle et leur adéquation aux joueurs ; ne pas traiter les 17 équipements comme toujours interchangeables.
- L’offre du vendredi comprend les mêmes prestations anniversaire que Commandant. Restent à préciser avant publication les heures éligibles, les vacances et les jours fériés. Ne pas inventer de restriction ni étendre le tarif au-delà du vendredi après l’école sans règle définie.
- Ne pas inventer le tarif éventuel des adultes joueurs, une gratuité, une politique d’annulation ou les moyens de paiement acceptés. Les préciser avec Cédric avant finalisation des textes.

Horaires scolaires documentés : mercredi 10 h 30–12 h et 13 h 30–20 h ; vendredi 17 h–22 h. Ce sont des fenêtres d’ouverture, pas des créneaux garantis. Une formule de deux heures doit tenir dans une fenêtre réellement exploitable. Ne pas proposer automatiquement Commandant à 10 h 30 si l’accueil ferme à midi.

## 3. Entrée dans le parcours

Les liens du site, de Google, Facebook et Instagram arrivent au même moteur de réservation. Un lien « vendredi après l’école » préselectionne ce filtre ; il ne promet pas de disponibilité avant vérification.

Promesse proposée : « Son anniversaire au laser game, simplement. »

Sous-titre : « Choisissez votre formule et votre créneau. Vous réglez sur place après l’anniversaire. »

Un bouton principal : « Voir les disponibilités ». Le téléphone reste une aide discrète, accessible tout au long du parcours. Ne pas imposer un appel pour un cas standard.

Afficher une photo réelle représentative de l’accueil/anniversaire, les formules, le lieu et les prestations concrètes. Si des avis sont affichés, utiliser des avis vérifiés et actuels, sans recycler une note ou un nombre ancien non contrôlé. Éviter carrousel, vidéo lourde, pop-up promotionnelle et étapes d’inscription.

## 4. Parcours principal — trois étapes

### Étape 1 : Votre anniversaire

Deux cartes de formule comparables : prix par enfant, nombre de parties de 20 minutes, durée totale de présence et inclusions. Aucune formule payante imposée discrètement. Un choix fait depuis une page de formule est conservé.

Deux champs de dimensionnement :

- « Quel âge fête votre enfant ? »
- « Environ combien d’enfants ? » — aide : « Votre enfant est compris dans ce nombre. Une estimation suffit. »

Ne pas demander de date de naissance complète ni les prénoms de tous les invités. Si le groupe contient des âges très différents, permettre de le signaler avec un champ conditionnel. Un écart important peut orienter vers une organisation accompagnée.

Afficher près de l’effectif, lorsqu’applicable : « Un adulte accompagne les enfants pendant les parties. » Compter cet adulte automatiquement. Prévoir une option secondaire pour les adultes joueurs supplémentaires, distincts des parents qui restent dans l’accueil.

Le total estimé se met à jour immédiatement. Exemple pour six enfants, hors éventuel supplément restant à définir : Commandant au tarif habituel, 120 € ; même formule complète au tarif vendredi, 90 €, soit 30 € d’économie. Appliquer automatiquement ce tarif en choisissant une date et une heure éligibles.

Bouton : « Choisir la date et l’heure ».

### Étape 2 : Votre créneau

Afficher les prochaines dates réservable sous forme de liste lisible, avec un calendrier mensuel disponible pour une date précise. Filtres : « Toutes les dates », « Mercredi », « Vendredi après l’école », « Week-end ».

Une carte comprend : date complète, heure d’arrivée, heure de fin approximative, formule, prix par enfant et total estimé. Éviter les chiffres de semaine, codes de rotation et détails de stock qui ne servent pas la décision du parent.

Le mercredi est un choix de premier niveau, sans remise inventée. Le vendredi dispose d’un repère « Après l’école · 2 parties à 15 € » sur les horaires éligibles. Appliquer le prix automatiquement, sans code promotionnel.

Le vendredi est un tarif de Commandant, pas une troisième formule redondante. Comme Commandant à 15 € devient moins chère qu’Explorateur à 16 €, montrer les prix réels et suggérer les deux parties, tout en conservant le choix court de 50 minutes pour les parents pressés. Ne pas modifier automatiquement la formule choisie ni inventer une baisse du prix Explorateur. Le parent doit voir le gain et la différence de durée avant de changer.

Si le parent choisit Commandant le samedi, conserver son choix. Montrer une seule alternative pertinente : « Également disponible vendredi après l’école : la même formule anniversaire à 15 € par enfant ». Pour six enfants, préciser « 30 € d’économie ». Cette comparaison concerne Commandant à 20 € uniquement. Depuis Explorateur à 16 €, annoncer explicitement le changement vers deux parties et une présence plus longue ; l’écart serait de 6 € pour six enfants, sans présenter les formules comme identiques. Proposer uniquement des disponibilités vérifiées. Ne pas utiliser de fausse urgence.

Si le créneau demandé est complet : proposer les heures voisines, puis les dates proches compatibles, dont mercredi/vendredi. Préserver formule, effectif et toutes les saisies. Si aucune alternative ne convient, proposer une demande personnalisée préremplie.

Partager les parties doit être expliqué avant validation : « Les parties peuvent être partagées avec un petit groupe d’âge compatible. Le goûter de votre anniversaire reste organisé pour votre groupe. » Ne promettre une salle privée ou une privatisation de l’arène que si elle est réellement incluse.

Recueillir l’accord explicite au partage. Si la famille refuse, conserver ses données et proposer une étude avec Cédric ; ne pas présenter de privatisation gratuite ou garantie.

Bouton : « Continuer avec ce créneau ». Retour et changement de formule doivent conserver les informations, puis recalculer capacité et tarif.

### Étape 3 : Coordonnées et réservation

Champs : nom du parent, prénom de l’enfant, e-mail, téléphone. Expliquer simplement que le téléphone sert à joindre le parent pour l’organisation. Aucun compte, mot de passe, adresse postale ou champ « confirmer l’e-mail ».

Le navigateur peut compléter les coordonnées. Claviers adaptés sur mobile, erreurs précises près du champ et aucune perte de saisie. Les informations complémentaires restent facultatives et discrètes.

Récapitulatif modifiable : parent et enfant séparés, date complète, arrivée, fin approximative, effectif estimé, adultes joueurs, formule et prestations, prix unitaire, total estimé, paiement et partage accepté.

Texte de paiement unique : « Aucun paiement aujourd’hui. Vous réglez sur place après l’anniversaire, selon le nombre d’enfants réellement présents. »

Bouton final : « Confirmer la réservation ». Ne pas employer « Payer », « Acheter » ou une formule ambiguë telle que « Valider » sans préciser son effet.

Pour une demande nécessitant l’équipe, utiliser un autre bouton : « Envoyer ma demande ». Son résultat doit rester clairement distinct d’une confirmation.

## 5. Résultat et suivi du parent

La confirmation apparaît uniquement après enregistrement durable et validation de la capacité. Exemple : « L’anniversaire de Mathis est réservé ! », suivi de sa date, de l’heure, d’une référence et du récapitulatif.

Montrer d’abord le statut, puis les informations pratiques : arrivée, durée, adresse/itinéraire, paiement sur place, adulte accompagnateur, prestations incluses et consignes validées sur le gâteau. Ne pas ajouter un appel obligatoire pour reconfirmer.

Prévoir ensuite un bouton « Ajouter à mon calendrier » et un lien sécurisé « Gérer ma réservation », sans création de compte. Ce lien permet les corrections simples et une demande de changement. Une hausse d’effectif ou un changement d’horaire doit revérifier la capacité avant confirmation ; ne jamais promettre des ajouts illimités.

Le futur e-mail transactionnel reprend exactement ce récapitulatif. Son statut d’envoi est séparé du statut de réservation : si l’e-mail échoue mais que la réservation existe, afficher la référence et permettre une nouvelle délivrance sans recréer l’anniversaire. Ne jamais affirmer « E-mail envoyé » sans preuve.

Prévoir un rappel pratique avant l’événement selon une politique à définir, avec un lien pour actualiser l’effectif. Une réservation confirmée ne dépend pas d’une réponse à ce rappel. Une demande ou proposition restée sans réponse appartient à un suivi commercial distinct. Ne pas transformer les abandons de formulaire en relances marketing automatiques.

Tout envoi automatique évoqué ici est une fonction future à configurer et valider, pas une instruction d’envoyer des messages maintenant.

## 6. Garanties techniques au service de ce parcours

- Google Agenda porte le planning opérationnel ; le registre Sheets reste la source de vérité commerciale. Les deux sont reliés par une référence de réservation stable.
- Rapprocher les demandes existantes avec l’e-mail et la date souhaitée, puis gérer les corrections avec cette référence stable. Un changement de date ne doit pas créer un second client ou un doublon de réservation.
- Calculer la capacité sur chaque passage et vérifier aussi tables, accueil et encadrement sur la présence totale. Un anniversaire 14 h–16 h n’occupe pas l’arène sans interruption ; une formule à deux parties nécessite néanmoins deux passages sûrs.
- Les saisies libres historiques de l’agenda, blocages, fermetures et informations ambiguës doivent empêcher une confirmation risquée jusqu’à clarification. Ne pas supposer qu’un âge inconnu est compatible.
- Les réservations de petits groupes complémentaires utilisent le même stock de passages, avec leurs règles d’âge et d’accompagnement. Elles ont une entrée de vente distincte et n’incluent pas automatiquement le goûter anniversaire.
- Contrôler prix et conditions du vendredi côté serveur au dernier clic. Afficher tout changement et laisser le parent l’accepter avant réservation.
- Empêcher réellement deux clients de consommer la même capacité simultanément. Un simple contrôle suivi d’une écriture, ou un verrou non atomique, ne suffit pas.
- Rendre les doubles clics, retours réseau et nouvelles tentatives sans effet de doublon. Le bouton attend pendant l’enregistrement, puis permet de retrouver le résultat existant.
- En cas de synchronisation partielle, conserver une référence et une trace durable pour reprise interne. Si l’état de réservation est incertain, afficher « Vérification en cours » ; ne pas inviter le parent à refaire une réservation.
- Afficher uniquement des disponibilités anonymes. Ne pas exposer noms d’enfants, intitulés d’agenda ou coordonnées.
- Garder le site léger, lisible sur mobile, utilisable au clavier et avec des messages d’erreur accessibles. Recalculer seulement ce qui a changé et conserver les saisies pendant la session.

## 7. Livraison attendue de l’agent de conception

Avant développement, livrer les trois écrans avec leurs textes exacts, la confirmation, les états complet/erreur/demande, et le tableau des conditions de l’offre vendredi. Montrer aussi un exemple mobile pour six enfants de huit ans. Vérifier explicitement l’absence du jeudi dans le parcours anniversaire, y compris par un lien direct ou lors d’une modification de réservation.

Évaluer les étapes consultées, les dates sans disponibilité, les abandons, les erreurs et les réservations réellement confirmées, puis la part mercredi/vendredi. Ne pas transmettre de noms, e-mails ou téléphones aux outils d’audience. Une simulation ne compte pas comme vente. Respecter le choix de consentement pour les mesures d’audience.

Critères de réussite : le parent voit la disponibilité et le coût avant ses coordonnées ; chaque information est demandée une seule fois ; prix et prestations restent cohérents jusqu’au récapitulatif ; le statut final est sans ambiguïté ; l’équipe n’a plus à reconstituer un cas standard dans plusieurs e-mails.

Référence de conception : les recherches de Baymard sur la réduction des champs et la réservation/commande sans compte appuient ces principes généraux. Elles ne démontrent pas un gain chiffré propre à Laser Games Tignieu.

- https://baymard.com/blog/checkout-flow-average-form-fields
- https://baymard.com/blog/make-guest-checkout-prominent
