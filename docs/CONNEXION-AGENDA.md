# Connexion du calendrier de réservation à Google Agenda

État du 8 septembre 2026 : connexion Google configurée en `deploy-preview` et `production`. La prévisualisation reste simulée. La production recueille des demandes réelles via Netlify Forms, à confirmer humainement, sans événement ni ligne Sheets automatique. Voir `OUVERTURE-PROGRESSIVE.md`.

## Accès à préparer

1. Dans un projet Google Cloud appartenant à Laser Games, activer Google Calendar API et utiliser un compte de service dédié au site. Éviter un compte personnel ou des droits d’administration inutiles.
2. Dans les paramètres de partage du calendrier `lasergames38@gmail.com`, ajouter l’adresse de ce compte de service avec le droit « Apporter des modifications et voir les détails de tous les événements ». Ce droit prépare la future création des réservations sans lui permettre de gérer le partage. L’agenda n’a pas besoin d’être public.
3. Stocker uniquement côté serveur Netlify l’adresse du compte et sa clé privée sous `GOOGLE_SERVICE_ACCOUNT_EMAIL` et `GOOGLE_PRIVATE_KEY`, disponibles aux Functions dans le contexte de préversion. Ne pas coller de clé dans le chat, le dépôt ou le navigateur du site.
4. Activer `BOOKING_PREVIEW_READ_CALENDAR=true` dans ce même contexte et redéployer la préversion pour appliquer la configuration.
5. Comparer au minimum une journée libre, une journée occupée et une fermeture avec l’agenda professionnel. Vérifier aussi une réservation à deux passages, les changements d’heure et une modification faite manuellement dans Google Agenda.

La bannière passe de « Calendrier fictif » à « Lecture de Google Agenda ». La réservation reste simulée : pas de création d’événement, de ligne Sheets, de paiement ou d’e-mail. Un échec de lecture affiche une indisponibilité et ne remplace jamais Google par des créneaux fictivement libres. Le compte possède un droit d’écriture, mais la fonction de disponibilité demande uniquement le périmètre OAuth `calendar.readonly`.

## Ce qui fonctionne déjà

- Lecture mensuelle avec toutes les pages Google, périmètre en lecture seule et fuseau Europe/Paris.
- Actualisation du calendrier visible toutes les 60 secondes et bouton de rafraîchissement ; relecture au test de réservation. Pas de notification push ni de promesse de synchronisation instantanée à ce stade.
- Disponibilités publiques sans noms, descriptions ou coordonnées ; jeudi exclu et prix mercredi/vendredi calculé par le serveur.
- Horaires de présence et passages séparés, blocages à la journée et horaires traités de manière prudente.

## Avant les réservations réelles

- Valider l’inventaire par type de matériel, les tables et la capacité d’encadrement.
- Vérifier les descriptions des événements historiques, les fermetures, les horaires de vacances/jours fériés et les heures d’application du tarif mercredi/vendredi à 15 €.
- Installer un stockage avec contrôle transactionnel de la capacité et reprise fiable des opérations. Google Agenda seul ne protège pas contre deux confirmations simultanées ; un verrou Blobs non atomique non plus.
- Valider les écritures Google/Sheets et le statut de confirmation, puis ouvrir explicitement les réservations réelles après recette. Configurer séparément les e-mails transactionnels.

Ces conditions restent nécessaires même après une lecture Google réussie. Une clé configurée ne signifie pas que les réservations réelles sont prêtes.
