# 🏃 MWTeam - Application de Suivi d'Entraînement

Application web complète pour le suivi d'entraînement de l'équipe **Middle Distance Running - Équipe Performance**.

## 🚀 Démarrage Rapide avec Docker

### Prérequis
- Docker et Docker Compose installés

### Lancer l'application

```bash
# Lancer tous les services (app + base de données)
docker-compose up -d

# Voir les logs
docker-compose logs -f

# L'application sera accessible sur http://localhost:3000
```

C'est tout ! La base de données PostgreSQL est automatiquement créée et configurée.

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
- ✅ Notes privées (infrastructure prête)

## 🎯 Première Utilisation

1. Lancer l'application : `docker-compose up -d`
2. Aller sur http://localhost:3000
3. Cliquer sur "S'inscrire"
4. Créer un compte (rôle ATHLETE par défaut)
5. Se connecter
6. Commencer à ajouter des séances d'entraînement !

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

1. Créer un compte sur https://neon.tech
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

- `POST /api/auth/register` - Inscription
- `POST /api/auth/[...nextauth]` - Authentification NextAuth
- `GET/POST /api/sessions` - CRUD séances
- `GET/PUT/DELETE /api/sessions/[id]` - Gestion séance
- `GET /api/statistics` - Calculs statistiques
- `GET/POST /api/indicators` - Indicateurs physiologiques
- `GET/POST /api/zones` - Zones de travail
- `GET/POST /api/performances` - Performances
- `GET /api/coach/athletes` - Liste athlètes (coach)

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
| `NEXTAUTH_URL` | URL de l'application | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Clé secrète pour JWT | Générer avec `openssl rand -base64 32` |

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

---

**Développé avec ❤️ pour l'équipe MWTeam**
