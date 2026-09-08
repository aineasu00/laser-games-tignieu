# Ouverture progressive des demandes anniversaire

Décision de Cédric, 8 septembre 2026 : sortir de la simulation par étapes et observer les difficultés réelles avant d’automatiser la confirmation.

## Phase 1 : demandes réelles, confirmation humaine

- Page publique `/reservation-anniversaire.html`, planning Google réel, relecture au dernier clic.
- Le parent choisit formule/groupe/date/heure, renseigne les coordonnées et accepte le partage et le paiement sur place après l’activité.
- Aucun compte, paiement, acompte ou lien de paiement.
- Dépôt dans le formulaire Netlify `anniversaire` existant : nom, prénom enfant, email, téléphone, date ET heure, effectif, âge, formule, prix estimé, consentements et référence `DEM-…`.
- Notification habituelle vers les adresses professionnelles/pilotage. Deux copies de notification peuvent arriver (envoi direct + transfert) : une seule demande à traiter, identifiée par la référence puis email + date.
- Le registre Sheets reste la source du suivi commercial : rapprocher la demande via la procédure existante, ne pas créer un second registre. La collecte Netlify n’est pas un remplacement du registre.
- Message client : demande reçue, créneau non bloqué, confirmation ultérieure par l’équipe. Aucun événement ni ligne « Confirmée » ajouté par le site.
- Double clic bloqué ; timeout de transmission : réception incertaine, bouton bloqué, vérification par téléphone. Ce garde-fou ne constitue PAS une idempotence serveur globale (rechargement/multi-onglet possibles) : dédupliquer au traitement.
- Le devis des champs Netlify n’est pas une confirmation contractuelle : revérifier le prix et l’agenda avant confirmation, y compris en cas de requête forgée.

## Mesure utile (GA4 G-19KH6R2W65 via la balise Google GTM existante)

Funnel `request_v1` : `booking_open` → `booking_group` → `booking_availability` → `booking_slot_selected` → `booking_contact_view` → `booking_form_start` → `booking_submit` → `generate_lead`.

Diagnostics : `booking_no_slots`, `booking_validation_error` (nom technique du champ, jamais son contenu), `booking_error` (étape/code fixe), `booking_filter`, `booking_help` (aucun créneau, paiement, partage, autre, appel ou demande personnalisée). Les temps de lecture sont regroupés : <2 s, 2–5 s, >5 s.

Pas de noms, emails, téléphones, texte libre, âge exact, date choisie, nombre exact ou référence de demande dans les événements. Liste blanche des noms/valeurs dans `booking-analytics.js`. URL d’événement sans paramètres. Aucune relecture vidéo des sessions, aucun enregistrement de frappe.

Consentement statistiques requis, refus/retrait/expiration bloquants pour ces événements. Les préversions et localhost sont exclus. Les événements précédant l’acceptation ne sont pas rejoués : les mesures représentent uniquement les visiteurs consentants et non toute la clientèle. Le pipeline Google du site peut utiliser le Consent Mode pour ses événements standards ; ne pas assimiler « aucun événement métier » à « aucune requête réseau Google ».

Huit dimensions personnalisées GA4 créées et relues le 8 septembre : `Reservation motif` → `reason`, `Reservation formule` → `formula`, `Reservation etape` → `stage`, `Reservation champ` → `field`, `Reservation filtre jour` → `day_filter`, `Reservation disponibilite` → `result`, `Reservation attente` → `latency`, `Reservation version` → `funnel_version`. Portée événement, valeurs fixes uniquement. Les rapports historiques nécessitent le délai de traitement GA4 ; la réception temps réel est déjà vérifiée. L’exploration personnalisée en entonnoir n’est pas encore enregistrée : suivre la procédure ci-dessous quand l’échantillon aura commencé à se constituer.

### Lire les résultats

Dans GA4, utiliser Exploration → entonnoir fermé avec les étapes ci-dessus, en comptant les utilisateurs/sessions et non les clics. Comparer mobile/ordinateur et source/support. L’actualisation automatique du calendrier peut répéter `booking_availability`, et les retours en arrière peuvent répéter les étapes.

- Beaucoup d’ouvertures sans groupe : compréhension ou effort initial.
- Groupe sans disponibilités : erreur technique, attente longue, aucun créneau ou effectif hors périmètre.
- Créneau choisi sans formulaire commencé : informations/prix/partage à clarifier.
- Soumissions sans réussite : erreurs de validation/réception à examiner.
- Demandes Netlify sans confirmation commerciale : suivi humain, pas seulement ergonomie.

Ne pas appeler chaque sortie « bug » : un parent peut comparer, revenir plus tard ou téléphoner. Croiser les événements avec les demandes Netlify, puis les statuts du registre, sans exporter les coordonnées dans GA4. `generate_lead` est une demande transmise, jamais une réservation confirmée ou une vente.

Première décision après un échantillon utile (par exemple 20 parcours consentants, sans valeur statistique garantie) : corriger le principal obstacle observé. Pas de pourcentages de succès inventés le jour du lancement.

## Recette du 8 septembre

- Tests automatisés métier, Google readonly, erreurs fermées, confidentialité des paramètres, formulaire/retour statique.
- Navigateur : 360 px et 1280 px sans débordement horizontal DOM ; essai complet préversion réussi, 18 septembre 17 h, Commandant 6 enfants → 90 €.
- Recette production `DEM-665EAD8AFD11` : une collecte Netlify n°45 et notifications Gmail reçues. Parent explicitement `TEST TECHNIQUE NE PAS RESERVER`. Ne créer ni ligne client active ni événement pour cette recette, ne pas relancer ce faux client.
- Défaut trouvé : action historique Netlify retournait l’ancienne page, entraînant un faux message « réception incertaine » malgré la collecte réussie. Action corrigée vers `/demande-recue`, protégée par test automatique.
- Retest corrigé `DEM-88E067B4142C` : écran « Merci, nous avons votre demande » et notifications Gmail vérifiés. Deux demandes techniques au total, distinctes et explicitement identifiées ; les ignorer toutes les deux au suivi commercial. Soumises avec statistiques refusées, donc aucune fausse conversion `generate_lead`.
- Tag Assistant connecté au domaine public : `booking_open`, `booking_group`, `booking_availability` visibles sous « Hits envoyés » vers G-19KH6R2W65. Après refus, les nouvelles interactions métier ne remontent pas ; après acceptation elles remontent. Aucun nouveau conteneur ou tag dupliqué ajouté.
- Réception également vérifiée dans GA4 → Aperçu en temps réel : `booking_open`, `booking_group`, `booking_availability`. Ces premières données incluent la recette de navigation ; ne pas les présenter comme de vraies performances commerciales. `generate_lead` volontairement non émis lors des deux soumissions techniques (consentement refusé).
- Clé de compte de service renouvelée avec accord explicite ; nouvelle clé stockée dans Netlify en préversion et production, ancienne clé supprimée dans Google Cloud, fichier JSON temporaire effacé du poste. Aucun secret dans Git.

## Phase 2 (non activée)

Confirmer directement seulement après validation du stock transactionnel/concurrence, inventaire par type d’équipement, tables, encadrement, horaires vacances/fériés, reprise des écritures Agenda/Sheets et mails transactionnels. Tester le dernier équipement demandé simultanément par deux familles, les modifications manuelles Agenda et les erreurs partielles. Pas de faux verrou Blobs non atomique.

## Repli

Mettre `BOOKING_REQUESTS_ENABLED=false` puis redéployer pour suspendre les soumissions API ; téléphone et formulaire classique restent disponibles. En panne Google, le calendrier reste indisponible, jamais fictivement vide. Le formulaire classique est un circuit de demande humaine, pas une écriture agenda.

Les anciens déploiements conservent leur environnement figé : pour revenir à un ancien code, le redéployer avec la clé courante plutôt que republier un vieux déploiement utilisant une clé révoquée.
