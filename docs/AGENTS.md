# AGENTS.md — Laser Games Tignieu

## 🎯 Objectif du projet

Créer et maintenir le site web professionnel du Laser Games Tignieu.
Le site doit générer des réservations par téléphone, des inscriptions à l'événement Battle Royale, et améliorer le référencement local.

## 🏢 Contexte métier

- **Nom** : Laser Games Tignieu
- **Adresse** : 60 Route de Crémieu, 38230 Tignieu-Jameyzieu
- **Téléphone** : 06 07 72 81 64
- **Activité** : Laser game familial, arcade rétro, billard, fléchettes, anniversaires
- **Surface** : 400 m² de labyrinthe sur 3 ambiances
- **Horaires hors vacances scolaires** : lundi et mardi fermés ; mercredi 10h30–12h et 13h30–20h ; jeudi et vendredi 17h–22h ; samedi 10h30–12h et 13h30–22h ; dimanche 10h30–12h et 13h30–20h
- **Note Google** : 4,8/5 (346 avis)
- **Concurrence locale** : activités à Tignieu, Lyon à 30 min

## 🛠️ Stack technique

- **Frontend** : HTML5 sémantique, CSS3 (variables CSS), JavaScript vanilla
- **Typographie** : Google Fonts (Chakra Petch, Manrope)
- **Hébergement** : Netlify
- **Formulaires** : Netlify Forms (transition vers backend à prévoir)
- **Médias** : fichiers hébergés sur Cloudfront (liens directs)

## 📄 Pages

| Fichier | Rôle | Priorité |
|---------|------|----------|
| `index.html` | Page d'accueil, SEO local, tarifs, FAQ | Haute |
| `battle-royale.html` | Landing événement, inscription tournoi | Haute |
| `tableau.html` | Outil interne de gestion des scores | Moyenne |

## 🔐 Accès et comptes

- **Netlify** : compte du propriétaire, site lié au repo GitHub
- **GitHub** : repo `laser-games-tignieu` (à créer)
- **Nom de domaine** : géré par Netlify ou un registrar externe

## ⚠️ Règles de modification

- Garder le site léger et rapide (pages statiques prioritaires)
- Ne pas ajouter de framework lourd sans justification
- Maintenir le SEO local (schema.org, meta tags, canonical)
- Préserver le design actuel (thème "vaisseau spatial / jungle alien")
- Toujours tester le responsive mobile avant de pousser

## 🚀 Prochaines étapes possibles

1. Connecter le repo GitHub à Netlify (déploiement continu)
2. Remplacer Netlify Forms par une vraie base de données (Supabase, Airtable)
3. Ajouter une page /admin pour consulter les inscriptions Battle Royale
4. Créer une page de réservation en ligne
5. Optimiser les images et les Core Web Vitals

## 📅 Architecture réservation anniversaire

- Frontend statique : `src/reservation-anniversaire.html`, CSS et JavaScript vanilla associés.
- Backend : Netlify Functions sous `netlify/functions/` ; aucun secret Google dans le navigateur.
- Disponibilité : capacité de 17 équipements calculée par blocs de 30 minutes. Explorateur occupe un bloc et dure environ 50 minutes ; Commandant occupe deux blocs espacés d’une heure et dure 1 h 45 à 2 h.
- Autorité opérationnelle : Google Agenda `lasergames38@gmail.com`. Suivi commercial : registre Google Sheets anniversaire.
- La réservation directe exige l’accord sur le partage éventuel avec un groupe d’âge compatible et confirme uniquement un créneau encore sûr après revérification serveur.
- Aucun paiement en ligne ni acompte : règlement sur place après l’anniversaire selon le nombre d’enfants présents.

### État de la préversion au 8 septembre 2026

- Calendrier en première étape, groupe et formule dans le même écran ; coordonnées ensuite.
- Mercredi proposé. Aucun anniversaire le jeudi. Commandant complète à 15 € par enfant le vendredi après l’école, contre 20 € au tarif habituel ; Explorateur reste à 16 €.
- Présenter 20 minutes de jeu + environ 10 minutes de préparation, jamais 30 minutes de jeu.
- Disponibilités mensuelles calculées par le serveur. Google peut être lu depuis la préversion avec un compte de service et `BOOKING_PREVIEW_READ_CALENDAR=true`.
- Le mode fictif est clairement signalé. Une panne Google ne doit pas ouvrir artificiellement tous les créneaux.
- Phase 1 de production : demandes réelles via le formulaire Netlify `anniversaire` existant, avec heure/date et référence. Confirmation humaine uniquement ; aucun événement ou statut confirmé écrit automatiquement. Préversion toujours simulée, sans collecte ni conversion. Voir `OUVERTURE-PROGRESSIVE.md`.
- Il reste à valider la gestion transactionnelle des places, le matériel par type, l’accueil et la synchronisation commerciale avant d’activer des écritures réelles. Ne jamais utiliser un verrou Blobs non atomique comme garantie anti-surréservation.
