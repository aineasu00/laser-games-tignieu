# Réservations de parties hors anniversaire

Parcours public : `/reservation-classique.html`. Groupe, effectifs par tarif, âges minimum/maximum des enfants, 1–3 parties, planning puis contact avec e-mail obligatoire. Les moins de 14 ans doivent être accompagnés dans l’arène par un adulte compté parmi les joueurs.

Toutes les demandes nécessitent une confirmation humaine. Elles ne bloquent pas de matériel. Aucun événement Agenda, confirmation au client ou paiement en ligne n’est créé automatiquement. Le client peut demander une organisation sur mesure pour un grand groupe ou un autre horaire pendant l’ouverture.

## Horaires et disponibilité

`src/opening-hours.js` fournit les horaires aux deux parcours. Hors vacances, jeudi/vendredi 17–22h ; mercredi/dimanche 10h30–12h et 13h30–20h ; samedi 10h30–12h et 13h30–22h. Lundi et mardi fermés.

Pendant les vacances zone A, mardi–dimanche 10h30–20h en continu, lundi fermé. Les anniversaires restent exclus mardi et jeudi. Toussaint 2026 : 17 octobre–1er novembre inclus. Les autres périodes 2026–2027 documentées sont issues de https://www.education.gouv.fr/calendrier-scolaire-toutes-les-dates-des-cours-et-des-vacances-100148 ; mettre à jour la configuration avant chaque nouvelle année scolaire. Les fermetures ponctuelles inscrites à l’agenda priment sur ces horaires.

Le partage utilise les rotations documentées, les équipements, l’âge et l’accord de l’événement existant. Un événement non documenté bloque toute sa présence. Les coordonnées et descriptions privées ne quittent pas le serveur. Chaque partie occupe un bloc de 30 minutes (20 de jeu + préparation). Les parties consécutives sont espacées de 30 minutes ; des passages espacés d’une heure sont aussi proposés pour rejoindre des rotations déjà inscrites. Pas de table ni de goûter anniversaire dans ce parcours. Un créneau libre ne garantit pas la privatisation.

## Registre clients

Google Sheet privé **Clients et réservations hors anniversaire — Laser Games Tignieu**, dans le dossier ChatGPT du propriétaire. Le compte de service dispose du droit writer uniquement sur ce fichier. Aucun accès public au registre et aucun identifiant de Sheet ni secret dans les assets du navigateur.

Variables Netlify : `GOOGLE_SESSION_SHEET_ID` et `SESSION_REQUESTS_ENABLED=true` en production, en plus des identifiants Google existants. `GET /api/session-availability` vérifie aussi l’accès au registre et ses en-têtes. Une erreur Calendar/Sheets renvoie 503 et ne simule jamais des disponibilités libres.

`POST /api/book-session` valide le groupe et les coordonnées, recalcule le tarif et revérifie l’agenda, enregistre dans Sheets avec `RAW`, puis transmet au formulaire Netlify `reservation-classique`. Le reçu dédié est vérifié avant réussite. Les notifications de ce formulaire sont destinées à lasergames38@gmail.com et fortescedric@gmail.com, comme pour les anniversaires. Le mode préversion ne collecte rien et n’envoie pas de notification.

Onglets :

- **Demandes** : historique, référence, contact, groupe/segment, effectifs/âges, date/horaire/rotations, devis, statut, consentement aux offres, notification et révision de conservation. `montant_realise_eur` et `joueurs_reels` restent vides jusqu’à la prestation.
- **Contacts** : dernière demande par e-mail, sans doublons ; le dernier choix concernant les offres prévaut.
- **Listes email** : seulement les contacts ayant coché la case facultative. Filtrer `segment` avant un export pour une campagne. Aucun outil de campagne ni envoi commercial automatique n’est activé.
- **Analyse** : demandes, confirmations, prestations réalisées, recettes et participants réels.
- **Mode emploi** : validation, données Agenda, retrait des offres et conservation.

Les noms et dates de naissance des enfants ne sont pas collectés. Les données analytiques de fréquentation ne contiennent aucune coordonnée, valeur libre ni référence personnelle. Les événements réutilisent le module existant avec `booking_kind=session` et respectent le consentement analytics.

## Exploitation et limites

Après recontrôle, confirmer au client, créer l’événement et documenter **Rotations**, **Équipements prévus**, **Âge de référence** et **Partage**. Passer la demande à Confirmée et renseigner l’identifiant Agenda. Pour les âges hétérogènes, décrire le groupe et contrôler sa compatibilité manuellement.

Une même soumission reprend sa référence lors d’une erreur de notification. Les lignes déjà reçues sont recherchées avant ajout. Cela évite les doublons de reprises séquentielles ; **Sheets ne fournit pas de transaction atomique** : deux requêtes simultanées identiques peuvent encore créer deux lignes. Dédupliquer par référence avant une analyse ; une confirmation humaine reste indispensable. Après un délai réseau incertain, vérifier la référence dans le registre avant d’envoyer à nouveau une notification.

Les vues et recherches sont prévues pour les 10 000 premières lignes. Étendre les bornes et migrer le stockage avant d’atteindre cette limite. Une modification de l’ordre ou du nom des en-têtes bloque le parcours jusqu’à correction, pour éviter un mauvais classement des données.

La révision de conservation et les désinscriptions restent manuelles. AG fournit la date à réviser à trois ans ; tenir compte du dernier contact et des obligations de prestation. Aucune tâche planifiée n’est créée. Avant un envoi commercial, traiter les retraits reçus. Le consentement explicite, sa date et sa version sont conservés ; la case est décochée par défaut et n’est pas nécessaire à la réservation.

Recette : tests métier et panne/reprise, TypeScript, parcours complet en simulation à 360 et 1280 px ; vérification des formules natives avec trois lignes techniques ensuite effacées ; contrôle du service Calendar/Sheets de production après déploiement. Aucun e-mail client envoyé pendant la recette.
