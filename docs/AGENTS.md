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
- **Horaires d'été** : 10h – 20h, tous les jours
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
