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

- Téléphone : 06 07 72 81 64
- Adresse : 60 Route de Crémieu, 38230 Tignieu-Jameyzieu

Déploiement continu activé via GitHub → Netlify.

## Réservation anniversaire directe

Le parcours `/reservation-anniversaire.html` interroge deux Netlify Functions :

- `GET /api/birthday-availability` calcule les créneaux par rotations de 30 minutes sans exposer les événements privés ;
- `POST /api/book-birthday` revérifie le planning, crée l’événement dans Google Agenda et ajoute la ligne au registre Google Sheets.

Variables Netlify requises, à enregistrer dans l’interface Netlify et jamais dans Git :

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` ;
- `GOOGLE_PRIVATE_KEY` ;
- `GOOGLE_CALENDAR_ID` (facultatif, valeur par défaut : `lasergames38@gmail.com`) ;
- `GOOGLE_SHEET_ID` (facultatif, le registre anniversaire actuel est utilisé par défaut).

Le compte de service Google doit avoir accès en écriture à l’agenda et au Sheet. En local, utiliser `netlify dev`. Les réservations directes sont limitées aux créneaux vides ou aux événements explicitement marqués `Partage : autorisé` ; les autres cas restent des demandes manuelles.

Les Deploy Previews fonctionnent volontairement en simulation : elles utilisent un store Blobs propre au déploiement et ne créent ni événement Agenda ni ligne Sheets. La variable `BOOKING_PREVIEW_READ_CALENDAR=true` permet uniquement de tester la lecture du planning réel dans une préversion ; les écritures restent bloquées hors production.

Lancer les tests métier sans dépendance externe avec `node --test tests/*.test.mjs`.
