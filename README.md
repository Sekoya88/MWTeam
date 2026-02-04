# 🏃 MWTeam - Application de Suivi d'Entraînement

Application web complète pour le suivi d'entraînement de l'équipe **Middle Distance Running - Équipe Performance**.

## 🚀 Démarrage Rapide avec Docker

### Prérequis

- Docker et Docker Compose installés

### Lancer l'application

```bash
# 1. Lancer tous les services (app + base de données)
docker-compose up -d

# 2. Voir les logs pour vérifier que tout démarre correctement
docker-compose logs -f app

# 3. L'application sera accessible sur http://localhost:3002
```

**⚠️ Important :**

- La base de données PostgreSQL est automatiquement créée et configurée
- Prisma `db push` s'exécute automatiquement au démarrage pour créer les tables
- Le port externe est **3002** (pas 3000) pour éviter les conflits

### Commandes utiles

```bash
# Arrêter les services
docker-compose down

# Arrêter et supprimer les données (⚠️ attention)
docker-compose down -v

# Rebuild après modification du Dockerfile
docker-compose build
docker-compose up -d

# Accéder à la base de données
docker-compose exec db psql -U mwteam -d mwteam

# Ouvrir Prisma Studio (interface graphique pour la DB)
docker-compose exec app npx prisma studio
```

## 📦 Architecture

```
┌─────────────────────────────────────┐
│  docker-compose.yml                 │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   app        │  │     db      │ │
│  │  (Next.js)   │  │ (PostgreSQL)│ │
│  │  Port 3000   │  │  Port 5432  │ │
│  │ Front+Back   │  │             │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

- **app** : Application Next.js (frontend + backend API routes)
- **db** : Base de données PostgreSQL 15

## 🏗️ Stack Technique

- **Frontend** : Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes (dans le même conteneur)
- **Base de données** : PostgreSQL 15 (Docker) ou Neon (production)
- **ORM** : Prisma
- **Authentification** : NextAuth.js (JWT)
- **Graphiques** : Recharts
- **Validation** : Zod

## 📁 Structure du Projet

```
MWTeam/
├── app/                    # Pages Next.js (App Router)
│   ├── api/               # API Routes (backend)
│   ├── auth/              # Pages d'authentification
│   ├── dashboard/          # Dashboard athlète
│   ├── sessions/          # Gestion des séances
│   ├── statistics/        # Statistiques
│   ├── zones/              # Zones de travail
│   ├── indicators/        # Indicateurs physiologiques
│   ├── performances/       # Performances
│   └── coach/             # Interface coach
├── components/            # Composants React réutilisables
├── lib/                   # Utilitaires (auth, prisma, stats)
├── prisma/                # Schéma Prisma
└── types/                 # Types TypeScript
```

## 🔐 Rôles Utilisateurs

- **ATHLETE** : Accès à ses propres données, saisie de séances, visualisation des stats
- **COACH** : Gestion d'un groupe d'athlètes, analyses agrégées, alertes
- **ADMIN** : Gestion complète (optionnel)

## ✨ Fonctionnalités

### Pour les Athlètes

- ✅ Authentification sécurisée (JWT)
- ✅ Tableau de bord personnalisé avec widgets
- ✅ Saisie complète des séances d'entraînement
  - Type (fractionné, endurance, récupération, etc.)
  - Durée, distance, RPE (1-10)
  - Zones de travail, météo, lieu
  - FC moyenne/max, cadence
  - Notes libres
- ✅ Calcul automatique des statistiques :
  - **CTL** (Chronic Training Load) - 42 jours
  - **ATL** (Acute Training Load) - 7 jours
  - **ACWR** (Acute:Chronic Workload Ratio)
  - **TRIMP** (RPE × durée)
  - Volume hebdomadaire/mensuel
- ✅ Configuration des zones de travail (VMA, seuil, AS10, AS5, AS21, marathon)
- ✅ Indicateurs physiologiques (FC repos, VMA, VO2max, poids, sommeil, fatigue, blessures)
- ✅ Suivi des performances (chronos, tests VMA, records personnels)
- ✅ Graphiques et visualisations (bar charts, pie charts)

### Pour les Coachs

- ✅ Dashboard avec vue d'ensemble de tous les athlètes
- ✅ Statistiques par athlète (CTL, ATL, ACWR)
- ✅ Alertes de surentraînement (ACWR > 1.5)
- ✅ **Gestion des athlètes** : Assigner/désassigner des athlètes à votre équipe
- ✅ **Génération IA de plannings** : Création automatique avec Mistral API
  - Volumes adaptés pour athlètes expérimentés (70-120km)
  - Calcul intelligent selon CTL/ATL/ACWR
  - Validation automatique du volume généré
  - Retry automatique en cas d'erreur 429
- ✅ **Création manuelle rapide** :
  - **50+ templates de séances** pré-définies (JOG, VMA, Seuils, Fractionné, Muscu, Compétitions)
  - **Calcul automatique des zones** : Tapez "JOG 1H" → zones auto-remplies
  - **1 clic pour remplir une journée** complète
  - Indicateur volume total semaine en temps réel
- ✅ **Modification de plannings** : Voir et éditer tous les plannings créés
- ✅ **Publication de plannings** : Envoi automatique aux dashboards des athlètes

### Pour les Admins

- ✅ **Panel administrateur** : Vue complète de tous les utilisateurs
- ✅ **Statistiques globales** : Total utilisateurs, séances, plannings
- ✅ **Gestion des utilisateurs** : Voir et supprimer des comptes
- ✅ Accès à toutes les fonctionnalités coach

## 🎯 Première Utilisation

### Pour un Coach

1. **Lancer l'application** : `docker-compose up -d`
2. **Aller sur** <http://localhost:3002>
3. **S'inscrire** en sélectionnant le rôle **"Coach"** ⚠️
4. **Se connecter**
5. **Aller sur "Mes Athlètes"** pour assigner des athlètes à votre équipe
6. **Générer un planning** :
   - Option 1 : `/coach/plans/generate` → Génération avec IA (Mistral)
   - Option 2 : `/coach/plans/new` → Création manuelle
7. **Publier le planning** pour qu'il soit visible par l'athlète

### Pour un Athlète

1. **S'inscrire** avec le rôle **"Athlète"**
2. **Se connecter**
3. **Voir son planning** sur `/dashboard/planning`
4. **Ajouter des séances** réalisées sur `/sessions/new`

## 🔧 Développement Local (sans Docker)

Si vous préférez développer sans Docker :

### Prérequis

- Node.js 18+
- PostgreSQL installé localement OU compte Neon

### Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec votre DATABASE_URL

# Initialiser la base de données
npx prisma generate
npx prisma db push

# Lancer l'application
npm run dev
```

### Avec Neon (Cloud)

1. Créer un compte sur <https://neon.tech>
2. Créer un projet et copier l'URL de connexion
3. Mettre l'URL dans `.env` :

```env
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="générer-une-clé-secrète-aléatoire"
```

## 🚀 Déploiement Production

### Option 1: Vercel + Neon (Recommandé)

1. Push le code sur GitHub
2. Importer le projet sur Vercel
3. Ajouter les variables d'environnement :
   - `DATABASE_URL` (URL Neon)
   - `NEXTAUTH_URL` (URL de votre app)
   - `NEXTAUTH_SECRET` (clé secrète aléatoire)
4. Déployer !

### Option 2: Docker en Production

```bash
# Modifier docker-compose.yml pour la production
# Changer NODE_ENV=production
# Utiliser DATABASE_URL de Neon ou votre propre PostgreSQL

docker-compose up -d --build
```

## 📊 API Endpoints

### Authentification

- `POST /api/auth/register` - Inscription (avec choix de rôle)
- `POST /api/auth/[...nextauth]` - Authentification NextAuth

### Séances (Athlètes)

- `GET/POST /api/sessions` - CRUD séances
- `GET/PUT/DELETE /api/sessions/[id]` - Gestion séance

### Statistiques

- `GET /api/statistics` - Calculs statistiques (CTL, ATL, ACWR)

### Données Athlète

- `GET/POST /api/indicators` - Indicateurs physiologiques
- `GET/POST /api/zones` - Zones de travail
- `GET/POST /api/performances` - Performances

### Coach

- `GET /api/coach/athletes` - Liste athlètes
- `POST /api/coach/athletes/[id]/assign` - Assigner un athlète
- `POST /api/coach/athletes/[id]/unassign` - Désassigner un athlète

### Plannings

- `GET/POST /api/plans` - Liste/Créer plannings (coach)
- `GET /api/plans/current` - Planning semaine en cours (athlète)
- `GET /api/plans/history` - Historique plannings (athlète)
- `GET/PUT/DELETE /api/plans/[id]` - Voir/Modifier/Supprimer planning
- `POST /api/plans/[id]/publish` - Publier un planning
- `POST /api/plans/generate` - Générer planning avec IA

### Admin

- `GET /api/admin/users` - Liste tous les utilisateurs
- `GET /api/admin/stats` - Statistiques globales
- `DELETE /api/admin/users/[id]` - Supprimer un utilisateur

### Notifications

- `GET/POST /api/notifications` - Gestion notifications

## 🐛 Dépannage

### Le conteneur ne démarre pas

```bash
# Voir les logs
docker-compose logs app

# Vérifier les ports
lsof -i :3000
lsof -i :5432

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Erreur de connexion à la DB

```bash
# Vérifier que la DB est prête
docker-compose ps

# Vérifier les logs de la DB
docker-compose logs db

# Tester la connexion
docker-compose exec app npx prisma db push
```

### Prisma ne fonctionne pas

```bash
# Régénérer le client Prisma
docker-compose exec app npx prisma generate

# Synchroniser le schéma
docker-compose exec app npx prisma db push
```

## 📝 Variables d'Environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | URL de l'application | `http://localhost:3002` |
| `NEXTAUTH_SECRET` | Clé secrète pour JWT | Générer avec `openssl rand -base64 32` |
| `LLM_PROVIDER` | Fournisseur LLM (`vertex` ou `mistral`) | `vertex` |
| `GOOGLE_CLOUD_PROJECT` | ID du projet GCP | `mwteam-prod` |
| `VERTEX_AI_LOCATION` | Région Vertex AI | `europe-west1` |
| `VERTEX_AI_MODEL` | Modèle Gemini | `gemini-1.5-flash` |

## 📚 Commandes Utiles

```bash
# Développement
npm run dev

# Build production
npm run build
npm start

# Base de données
npx prisma studio          # Interface graphique
npx prisma db push         # Synchroniser le schéma
npx prisma generate        # Régénérer le client

# Docker
docker-compose up -d       # Lancer
docker-compose down        # Arrêter
docker-compose logs -f     # Voir les logs
```

## 🎨 Design

L'application utilise un design minimaliste noir et blanc, cohérent avec l'identité MWT (Middle Distance Running - Équipe Performance).

**Améliorations récentes** :

- ✅ Animations hover (effet lift sur les cards)
- ✅ Transitions fluides
- ✅ Gradients modernes
- ✅ Ombres douces
- ✅ Meilleure hiérarchie visuelle

## 🤖 Génération IA de Plannings

L'application utilise **GCP Vertex AI (Gemini 1.5 Flash)** pour générer automatiquement des plannings personnalisés.

**Fonctionnalités** :

- Génération basée sur les stats de l'athlète (CTL, ATL, ACWR)
- Prise en compte de l'historique des plannings
- Personnalisation selon objectifs et contraintes
- Format structuré (7 jours, zones, volumes)
- Calcul des distances basé sur les seuils personnalisés (VMA, SV1, SV2)

**Configuration GCP** :

```bash
# Activer les APIs
gcloud services enable aiplatform.googleapis.com

# Se connecter (développement local)
gcloud auth application-default login

# Configurer les variables
export GOOGLE_CLOUD_PROJECT=votre-projet
export LLM_PROVIDER=vertex
```

**Coût** : Compatible avec les crédits gratuits GCP ($300)

---

**Développé avec ❤️ pour l'équipe MWTeam**
