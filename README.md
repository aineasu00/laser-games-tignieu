# Laser Games Tignieu

Site vitrine + événementiel du Laser Games Tignieu à Tignieu-Jameyzieu (38230).

## 📁 Structure

```
src/
├── index.html          # Page d'accueil
├── battle-royale.html  # Événement Battle Royale + formulaire d'inscription
└── tableau.html        # Tableau de score local pour le tournoi

docs/
├── AGENTS.md           # Contexte pour les agents IA
└── NOTES.md            # Notes de développement
```

## 🌐 URLs

- Production : https://www.lasergamesarcade.net/
- Domaine secondaire : https://lasergamestignieu.com/

## 🛠️ Stack

- HTML5 / CSS3 / JavaScript vanilla
- Hébergement : Netlify
- Formulaire Battle Royale : Netlify Forms (actuellement)
- Base de données : à définir (besoin de collecter les inscriptions)

## 🚀 Déploiement

Le déploiement est automatique via GitHub → Netlify :

```bash
git push origin main
```

## 📞 Contact

- Téléphone : 07 44 22 78 63
- Adresse : 60 Route de Crémieu, 38230 Tignieu-Jameyzieu

Déploiement continu activé via GitHub → Netlify.

## Demandes anniversaire — ouverture progressive

Le parcours `/reservation-anniversaire.html` affiche le calendrier dès l’entrée. L’âge, l’effectif et la formule le personnalisent sur la même page. Les filtres mercredi/vendredi/week-end, les jours complets et le prix estimé viennent du serveur. Le jeudi est exclu des anniversaires ; Commandant est à 15 € par enfant le mercredi et le vendredi, contre 20 € les autres jours (goûter, boissons et friandises inclus).

Deux Netlify Functions :

- `GET /api/birthday-availability?month=YYYY-MM&formula=commandant&age=8&children=6` lit un mois en une requête Google paginée, puis renvoie uniquement les statuts des jours, heures et devis publics. `date=YYYY-MM-DD` reste disponible pour une seule date. Aucun événement privé n’est retourné au navigateur.
- `POST /api/book-birthday` revérifie le créneau et le prix. En préversion, il renvoie une simulation. En production avec `BOOKING_REQUESTS_ENABLED=true`, il valide une **demande à transmettre**, sans bloquer de place. Le navigateur la dépose ensuite dans le formulaire Netlify `anniversaire` existant ; seuls la réponse HTTP réussie et le reçu attendu déclenchent l’écran de réussite et `generate_lead` (avec consentement). Cédric confirme ensuite selon la procédure habituelle. Aucune écriture automatique Agenda/Sheets ni aucun e-mail de confirmation client à ce stade.

Variables Netlify requises, à enregistrer dans l’interface Netlify et jamais dans Git :

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` ;
- `GOOGLE_PRIVATE_KEY` ;
- `GOOGLE_CALENDAR_ID` (facultatif, valeur par défaut : `lasergames38@gmail.com`) ;
- `GOOGLE_SHEET_ID` (facultatif, le registre anniversaire actuel est utilisé par défaut).

Le compte de service dédié possède sur `lasergames38@gmail.com` le droit de modifier les événements et d’en voir tous les détails, nécessaire à la future création automatique des réservations. Il ne peut ni gérer le partage ni administrer le compte Google. La prévisualisation utilise malgré tout uniquement le périmètre Google Calendar en lecture seule. Pas besoin d’ouvrir publiquement l’agenda, ni de partager le Sheet à ce stade. En local, utiliser `netlify dev`.

Les Deploy Previews utilisent par défaut un calendrier explicitement fictif (dont des journées complètes), sans données clients. La variable `BOOKING_PREVIEW_READ_CALENDAR=true`, avec les deux identifiants Google, active la lecture réelle dans la préversion ; la soumission reste une simulation. Si Google échoue, le serveur renvoie 503 et les jours restent non réservables : il ne revient jamais silencieusement à un agenda vide.

Le navigateur actualise le mois toutes les 60 secondes lorsqu’il est visible et au clic sur « Actualiser ». La validation relit l’agenda. Les notifications push Google ne sont pas encore installées ; ne pas annoncer une synchronisation instantanée.

Configuration restant à terminer : règles de vacances/jours fériés et limites horaires de l’offre mercredi/vendredi, capacité par type d’équipement, tables et encadrement, stockage transactionnel anti-doublon, accès au registre Sheets et reprise des synchronisations partielles. Les anciennes descriptions d’agenda doivent être vérifiées avant ouverture des réservations réelles.

Configuration le 8 septembre 2026 : identifiants Google dans les contextes `deploy-preview` et `production`. `BOOKING_PREVIEW_READ_CALENDAR=true` active la lecture réelle en préversion. `BOOKING_REQUESTS_ENABLED=true` ouvre uniquement les demandes réelles en production. Les deux contextes utilisent OAuth `calendar.readonly`, malgré le droit writer déjà accordé au compte de service.

Le plan de mesure, la recette réelle, les limites et la prochaine étape sont consignés dans [docs/OUVERTURE-PROGRESSIVE.md](docs/OUVERTURE-PROGRESSIVE.md).

Lancer les tests métier sans dépendance externe avec `node --test tests/*.test.mjs`.

Le parcours de parties hors anniversaire `/reservation-classique.html` ajoute un groupe décrit, un e-mail obligatoire et un registre Google Sheets privé pour le suivi et la segmentation. Les inscriptions aux offres sont facultatives et distinctes du contact de réservation. Voir [docs/RESERVATIONS-GROUPES.md](docs/RESERVATIONS-GROUPES.md).
