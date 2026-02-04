# MWTeam — Déploiement et usage

Un seul fichier pour tout : où configurer, DB, connexion, déploiement, RAG.

---

## Où trouver les variables (pas à pas)

**Il n’y a pas d’onglet « Variables et secrets » sur la page du service.** Les variables sont dans l’écran **d’édition**.

1. **Cloud Run** → clique sur le nom du service **mwteam** (tu vois les onglets Observabilité, Révisions, Source, YAML, etc. — pas de « Variables et secrets » ici).
2. **En haut de la page**, clique sur le bouton **« Modifier »** (ou « Modifier et déployer une nouvelle révision »).
3. Un **formulaire** s’ouvre. **Défile vers le bas** jusqu’à la section **« Variables et secrets »** (ou « Variables & Secrets »).
4. Clique sur cette section pour l’ouvrir. **« Ajouter une variable »** → Nom : `DATABASE_URL`, Valeur : ta chaîne PostgreSQL. Idem pour `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
5. En bas du formulaire, clique sur **« Déployer »**.

**Alternative (ligne de commande)** — sans la console :

**Important :** Ne mets **pas** `NEXTAUTH_SECRET` dans cette commande si tu l’as déjà configuré comme **secret** (référence Secret Manager) dans « Secrets exposés en tant que variables d’environnement ». Sinon tu auras l’erreur : *Cannot update environment variable [NEXTAUTH_SECRET] to string literal because it has already been set with a different type.*

Commande à utiliser (uniquement **Variables d’environnement** : `DATABASE_URL` et `NEXTAUTH_URL`) :

```bash
gcloud run services update mwteam --region=europe-west1 \
  --update-env-vars="DATABASE_URL=postgresql://USER:MOT_DE_PASSE@IP_OU_HOST:5432/mwteam?sslmode=disable,NEXTAUTH_URL=https://mwteam-4255107028.europe-west1.run.app"
```

Remplace `USER`, `MOT_DE_PASSE`, `IP_OU_HOST` par tes vraies valeurs (utilisateur PostgreSQL, mot de passe, adresse du serveur DB). Laisse **NEXTAUTH_SECRET** tel quel (déjà défini comme secret).

**Où voir ou changer la clé secrète NEXTAUTH_SECRET :**

- **NEXTAUTH_SECRET** est déjà exposé comme **secret** (section « Secrets exposés en tant que variables d’environnement »). Tu ne dois **pas** le mettre dans « Variables d’environnement » en même temps.
- Pour **voir ou modifier la valeur** de cette clé : **Google Cloud Console** → **Security** → **Secret Manager** (ou [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=mwteam)). Ouvre le secret **NEXTAUTH_SECRET** → onglet **Versions** → tu peux voir la dernière version ou en créer une nouvelle.
- Pour **générer une nouvelle clé** (si tu veux la changer) : en local, `openssl rand -base64 32`. Puis dans Secret Manager, crée une nouvelle version du secret **NEXTAUTH_SECRET** avec cette valeur. Cloud Run utilisera la dernière version.

---

## Où faire quoi (résumé)

| Ce que tu veux | Où aller | Quoi faire |
|----------------|----------|------------|
| **Faire marcher la base de données** | Cloud Run → **mwteam** → bouton **Modifier** → section **Variables et secrets** | Ajouter/modifier **`DATABASE_URL`** (voir ci‑dessous). Puis créer les tables une fois avec `npx prisma db push`. |
| **Faire marcher l’inscription / connexion** | Même endroit | Vérifier **`NEXTAUTH_URL`** = exactement l’URL du site (ex. `https://mwteam-4255107028.europe-west1.run.app`, sans `/` à la fin). Vérifier **`NEXTAUTH_SECRET`** (une clé secrète quelconque). |
| **Voir / modifier les variables** | Cloud Run → **mwteam** → bouton **Modifier** → section **Variables et secrets** | Ajouter les variables, puis **Déployer**. |
| **Voir l’app en ligne** | Navigateur | Ouvrir **https://mwteam-4255107028.europe-west1.run.app** (c’est l’URL de ton service). |

---

## Cloud SQL (fait)

- **Instance** : `mwteam-db` (PostgreSQL 15, région `europe-west1-b`, tier `db-f1-micro`).
- **Base** : `mwteam`. **Utilisateur** : `mwteam`. Mot de passe défini et injecté dans Cloud Run (`DATABASE_URL`).
- **Tables app** : déjà créées (`prisma db push`). **RAG** : extension `pgvector` + table `rag_documents` créées.
- Pour **changer le mot de passe** : `gcloud sql users set-password mwteam --instance=mwteam-db --project=mwteam --password=NOUVEAU_MOT_DE_PASSE` puis mettre à jour la variable `DATABASE_URL` sur Cloud Run.

---

## URL de l'app

**https://mwteam-4255107028.europe-west1.run.app**

(ou l’URL affichée en haut de la page Cloud Run du service mwteam.)

---

## Faire fonctionner la base de données (étape par étape)

### 1. Où configurer la connexion à la DB

- Ouvre **Cloud Run** → clique sur le service **mwteam**. Puis clique sur le bouton **« Modifier »** (en haut). Dans le formulaire, défile jusqu’à **« Variables et secrets »**.
- Ajoute (ou modifie) la variable **`DATABASE_URL`** dans la section Variables et secrets.

### 2. Format de `DATABASE_URL`

Une URL PostgreSQL ressemble à :

```text
postgresql://UTILISATEUR:MOT_DE_PASSE@HOTE:PORT/NOM_DE_LA_BASE?sslmode=disable
```

- **UTILISATEUR** : l’utilisateur PostgreSQL (ex. `mwteam`).
- **MOT_DE_PASSE** : son mot de passe (sans caractères bizarres qui cassent l’URL, ou encode-les).
- **HOTE** : l’adresse du serveur (ex. l’IP publique de ton instance Cloud SQL, ou l’host d’un service type Neon/Supabase).
- **PORT** : en général `5432` pour PostgreSQL (parfois omis si c’est le défaut).
- **NOM_DE_LA_BASE** : le nom de la base (ex. `mwteam`).

Exemple (à adapter avec tes vraies valeurs) :

```text
postgresql://mwteam:MonMotDePasse123@34.77.93.102:5432/mwteam?sslmode=disable
```

### 3. Si ta DB est sur Cloud SQL (GCP)

- Va dans **SQL** → ton instance (ex. `mwteam-db`) → note l’**IP publique** (ou utilise la connexion privée si tu l’as configurée).
- Vérifie qu’un **utilisateur** et une **base** existent (ex. user `mwteam`, base `mwteam`). Crée-les si besoin dans l’interface Cloud SQL.
- Cloud Run peut joindre Cloud SQL par l’IP publique tant que le pare-feu autorise les connexions (réseau autorisé : `0.0.0.0/0` pour tester, ou les plages IP de Google pour Cloud Run).

### 4. Créer les tables dans la base (une seule fois)

Une fois `DATABASE_URL` correcte dans Cloud Run :

- Soit en **local** (en mettant la même `DATABASE_URL` dans un `.env`) :
  ```bash
  npx prisma db push
  ```
- Soit en **ligne** : connecte-toi à la base (Cloud SQL Studio, `psql`, ou autre) et exécute le contenu de `prisma/schema.prisma` via les migrations Prisma, ou lance `prisma db push` depuis une machine qui a accès à la DB.

Après ça, les tables (User, etc.) existent. L’inscription et la connexion pourront fonctionner.

### 5. Récap « la DB fonctionne »

- `DATABASE_URL` est définie dans **Cloud Run** (onglet Variables et secrets).
- La valeur est correcte (user, mot de passe, host, port, nom de base).
- Les tables ont été créées (`prisma db push` ou migrations).
- Tu peux t’inscrire et te connecter sur **https://mwteam-4255107028.europe-west1.run.app**.

---

## Variables d'environnement (Cloud Run)

| Variable | Exemple | Rôle |
|----------|--------|------|
| `DATABASE_URL` | `postgresql://user:pass@host/db` | Connexion PostgreSQL (obligatoire pour inscription et connexion). |
| `NEXTAUTH_SECRET` | (secret) | Auth NextAuth |
| `NEXTAUTH_URL` | `https://mwteam-4255107028.europe-west1.run.app` | **Exactement** l’URL Cloud Run (sans slash final). Indispensable pour que la connexion fonctionne en ligne. |
| `GOOGLE_CLOUD_PROJECT` ou `GCP_PROJECT` | `mwteam` | Projet GCP |
| `LLM_PROVIDER` | `vertex` | Utiliser Vertex AI (Gemini) |
| `VERTEX_AI_LOCATION` | `europe-west1` | Région Vertex AI |

**Modèle LLM** : par défaut **Gemini 1.5 Flash** (compatible crédits gratuits GCP, rien à activer). Optionnel : `VERTEX_AI_MODEL=gemini-2.0-flash` ou autre ID Gemini.

---

## Rebuild et déploiement

```bash
cd /chemin/vers/MWTeam
gcloud builds submit --tag europe-west1-docker.pkg.dev/mwteam/mwteam-repo/mwteam:latest --region=europe-west1 .
gcloud run deploy mwteam --image=europe-west1-docker.pkg.dev/mwteam/mwteam-repo/mwteam:latest --region=europe-west1
```

Mettre à jour les variables d’env dans la console Cloud Run si besoin.

---

## RAG (Assistant coach)

1. **Créer la table** (une fois) : exécuter le SQL dans `prisma/rag-setup.sql` sur ta base (Cloud SQL, Neon, etc.).
2. **Indexer** : une fois connecté en coach, aller sur **Assistant RAG** et cliquer **Réindexer le corpus** (ou `POST /api/admin/rag/index`).
3. Poser des questions sur les plans/séances/notes depuis la page Assistant RAG.

---

## Base de données (rappel)

- Voir la section **« Faire fonctionner la base de données »** plus haut pour le détail.
- En résumé : **Cloud Run** → **mwteam** → **Variables et secrets** → `DATABASE_URL` = ta chaîne PostgreSQL. Puis `npx prisma db push` une fois pour créer les tables. Pour le RAG, exécuter aussi le SQL dans `prisma/rag-setup.sql` sur la même base.

---

## Compte de service Cloud Run

Le service utilise le compte **4255107028-compute@developer.gserviceaccount.com**. Il sert pour Vertex AI (Gemini), Secret Manager, etc. Pour la base de données, **tu n’as rien à lui donner** si tu utilises une `DATABASE_URL` avec identifiant/mot de passe : la connexion se fait directement à la DB avec ces identifiants.

---

*Pour plus de détails sur les APIs GCP (Cloud Run, Vertex AI, Secret Manager), voir la doc Google Cloud.*
