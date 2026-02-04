# Configuration CI/CD pour MWTeam

Ce guide explique comment configurer le déploiement automatique de MWTeam depuis GitHub vers Google Cloud Run.

## Option 1: GitHub Actions (Recommandé)

### Prérequis GCP

1. **Activer les APIs nécessaires**

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  iam.googleapis.com \
  secretmanager.googleapis.com
```

1. **Créer les secrets nécessaires**

```bash
# Créer le secret pour DATABASE_URL
echo -n "postgresql://user:pass@host:5432/db" | \
  gcloud secrets create mwteam-database-url --data-file=-

# Créer le secret pour NEXTAUTH_SECRET
openssl rand -base64 32 | \
  gcloud secrets create mwteam-nextauth-secret --data-file=-

# Créer le secret pour NEXTAUTH_URL
echo -n "https://mwteam-xxxx.run.app" | \
  gcloud secrets create mwteam-nextauth-url --data-file=-
```

### Configuration Workload Identity Federation

1. **Créer un pool d'identités et un provider GitHub**

```bash
# Créer le pool
gcloud iam workload-identity-pools create "github" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Créer le provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Actions Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

1. **Créer un service account et donner les permissions**

```bash
# Créer le service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Donner les permissions nécessaires
PROJECT_ID=$(gcloud config get-value project)

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Lier le service account au pool GitHub
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github/attribute.repository/Sekoya88/MWTeam"
```

### Configuration des secrets GitHub

1. **Ajouter les secrets dans GitHub** (Settings → Secrets and variables → Actions):

| Secret | Valeur |
|--------|--------|
| `WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider` |
| `WIF_SERVICE_ACCOUNT` | `github-actions@PROJECT_ID.iam.gserviceaccount.com` |

Pour obtenir le PROJECT_NUMBER:

```bash
gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)'
```

---

## Option 2: Cloud Build via Console GCP

Si vous préférez utiliser Cloud Build directement:

1. Aller sur [Cloud Build](https://console.cloud.google.com/cloud-build/triggers)
2. Cliquer sur "Configurer la compilation continue"
3. Connecter votre compte GitHub et autoriser l'accès au repo `Sekoya88/MWTeam`
4. Sélectionner le fichier `cloudbuild.yaml` existant
5. Configurer les secrets dans Cloud Run

---

## Secrets déjà configurés dans Cloud Run

Le `cloudbuild.yaml` utilise ces secrets qui doivent exister:

- `mwteam-database-url`: URL de connexion PostgreSQL
- `mwteam-nextauth-secret`: Clé secrète NextAuth
- `mwteam-nextauth-url`: URL de l'application déployée

## Test du déploiement

Après configuration:

```bash
git add .
git commit -m "feat: add GitHub Actions CI/CD"
git push origin main
```

Le workflow se déclenche automatiquement et déploie sur Cloud Run.
