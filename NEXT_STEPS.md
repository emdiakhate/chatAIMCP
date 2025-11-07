# 📊 Analyse des Fonctionnalités et Plan d'Action

## ✅ Fonctionnalités Ajoutées depuis Cursor

### 1. **Migration vers OpenRouter API** ✅
- Remplacement complet de Google Gemini par OpenRouter
- Support multi-modèles via OpenRouter (Gemini, Claude, GPT, etc.)
- Fichier `backend/src/utils/openrouter.js` avec helpers complets
- Tool calling fonctionnel avec format OpenAI
- **Impact** : Plus de flexibilité pour choisir différents modèles LLM

### 2. **Base de Données Unifiée** ✅
- Migration vers une seule base SQLite (`chatai.db`)
- Activation des contraintes de clés étrangères (`foreign_keys = ON`)
- Correction du bug "User not found"
- **Impact** : Plus de cohérence et moins d'erreurs

### 3. **Configuration Dynamique Filesystem** ✅
- Interface de configuration (`FilesystemConfigModal.tsx`)
- Support multi-chemins pour filesystem
- Possibilité d'ajouter/supprimer des dossiers autorisés
- Sauvegarde via `config_overrides`
- Bouton "Configurer" dans My Tools
- **Impact** : Utilisateur peut facilement configurer les dossiers accessibles

### 4. **Lazy Loading des Connexions MCP** ✅
- Connexion enregistrée sans créer immédiatement le client MCP
- Évite les erreurs si les packages MCP ne sont pas installés
- Clients créés automatiquement lors de la première utilisation
- **Impact** : Meilleure expérience utilisateur, pas d'erreurs au clic

### 5. **Parsing JSON Amélioré** ✅
- Gestion automatique des champs JSON (config_overrides, credentials, capabilities)
- Support des données déjà parsées ou en string
- Corrections des bugs de parsing dans MessageList
- **Impact** : Moins d'erreurs de parsing, code plus robuste

### 6. **Format de Réponse Chat Amélioré** ✅
- Retour des messages formatés avec sources/toolCalls
- Support de l'affichage des tool calls dans l'interface
- Mise à jour du timestamp des conversations
- **Impact** : Meilleure visibilité des actions des outils

---

## 📈 État Actuel du Système

### ✅ Fonctionnel
- ✅ Authentification (signup/login)
- ✅ Conversations et messages
- ✅ Chat avec OpenRouter
- ✅ Marketplace MCP (5 serveurs affichés)
- ✅ Connexion des outils (lazy loading)
- ✅ Configuration Filesystem avec multi-chemins
- ✅ Tool calling (quand packages MCP installés)

### ⚠️ Limitations Actuelles
- ⚠️ **Filesystem** : Ne lit que du texte brut (.txt, .md, .json, etc.)
- ⚠️ **Pas de support PDF, Word, Excel, Images**
- ⚠️ **Pas d'affichage riche** des fichiers lus (tout en texte)
- ⚠️ **Gmail, Drive, GitHub, Memory** : Pas encore configurés/utilisables
- ⚠️ Pas de prévisualisation des fichiers avant lecture
- ⚠️ Pas de gestion des fichiers volumineux

---

## 🎯 Prochaines Étapes Prioritaires

### 🔥 Priorité 1 : Support Multi-Formats pour Filesystem

#### A. **Support PDF**
**Objectif** : Lire et extraire le texte des fichiers PDF

**Actions** :
1. Installer `pdf-parse` dans le backend
   ```bash
   cd backend && npm install pdf-parse
   ```

2. Créer un middleware de lecture de fichiers
   - Détecter le type de fichier (extension/MIME)
   - Router vers le bon parser (PDF, Word, texte, etc.)

3. Créer un outil MCP `read_file_advanced` qui supporte PDF

4. Mettre à jour le serveur filesystem MCP custom

**Complexité** : Moyenne (2-3h)
**Impact** : Fort - permet de lire la majorité des documents

#### B. **Support Word (.docx)**
**Objectif** : Lire et extraire le texte des fichiers Word

**Actions** :
1. Installer `mammoth` (convertit .docx en HTML/texte)
   ```bash
   cd backend && npm install mammoth
   ```

2. Ajouter le parser Word au middleware de lecture

3. Tester avec différents documents Word

**Complexité** : Faible (1h)
**Impact** : Moyen - beaucoup d'entreprises utilisent Word

#### C. **Support Excel (.xlsx)**
**Objectif** : Lire les données des fichiers Excel

**Actions** :
1. Installer `xlsx` (lecture Excel)
   ```bash
   cd backend && npm install xlsx
   ```

2. Ajouter le parser Excel
3. Formater les données en tableaux lisibles

**Complexité** : Moyenne (1-2h)
**Impact** : Moyen - utile pour les données tabulaires

#### D. **Support Images (OCR)**
**Objectif** : Extraire le texte des images (PNG, JPG)

**Actions** :
1. Installer Tesseract.js pour OCR
   ```bash
   cd backend && npm install tesseract.js
   ```

2. Ajouter le parser d'images
3. Extraire le texte via OCR

**Complexité** : Élevée (3-4h)
**Impact** : Fort - très utile pour scan de documents

---

### 🔥 Priorité 2 : Affichage Riche des Fichiers

#### A. **Prévisualisation des Fichiers**
**Objectif** : Afficher joliment les fichiers lus dans le chat

**Actions** :
1. Créer un composant `FilePreview.tsx`
   - Support markdown rendu
   - Support code avec syntax highlighting
   - Support tableaux pour Excel
   - Support PDF viewer (avec react-pdf)

2. Intégrer dans `MessageList.tsx`

3. Ajouter des métadonnées aux réponses (taille, type, nombre de pages)

**Complexité** : Moyenne (2-3h)
**Impact** : Fort - meilleure UX

#### B. **Download de Fichiers**
**Objectif** : Permettre de télécharger les fichiers depuis le chat

**Actions** :
1. Ajouter un endpoint `/api/files/download/:path`
2. Ajouter un bouton "Download" dans FilePreview
3. Gérer les permissions et sécurité

**Complexité** : Faible (1h)
**Impact** : Moyen - pratique pour l'utilisateur

---

### 🔥 Priorité 3 : Connexion des Autres MCP

#### A. **Gmail MCP** 📧
**Objectif** : Lire et chercher les emails

**Actions** :
1. Configurer les credentials Google OAuth
   - Créer projet Google Cloud
   - Activer Gmail API
   - Obtenir Client ID / Secret

2. Implémenter le flow OAuth dans le backend

3. Créer un modal de configuration Gmail

4. Tester la recherche et lecture d'emails

**Complexité** : Élevée (4-5h)
**Impact** : Fort - très demandé par les utilisateurs

#### B. **Google Drive MCP** ☁️
**Objectif** : Accéder aux fichiers Google Drive

**Actions** :
1. Utiliser les mêmes credentials OAuth que Gmail
2. Activer Google Drive API
3. Implémenter search_files, read_file, list_files
4. Gérer les permissions Drive

**Complexité** : Moyenne (3h)
**Impact** : Fort - complémentaire à Filesystem

#### C. **Memory MCP** 🧠
**Objectif** : Mémoire persistante pour contexte long terme

**Actions** :
1. Installer le package
   ```bash
   npm install -g @modelcontextprotocol/server-memory
   ```

2. Configurer le serveur memory
3. Tester store/recall/search

**Complexité** : Faible (30min)
**Impact** : Moyen - utile pour conversations longues

#### D. **GitHub MCP** 🐙
**Objectif** : Accéder aux dépôts GitHub

**Actions** :
1. Configurer OAuth GitHub
2. Implémenter search_code, list_repos, etc.
3. Créer le modal de configuration

**Complexité** : Moyenne (3h)
**Impact** : Moyen - utile pour développeurs

---

## 📅 Plan d'Action Détaillé (3 Sprints)

### 🚀 Sprint 1 : Support Multi-Formats (Semaine 1)
**Objectif** : Filesystem peut lire PDF, Word, Excel

| Tâche | Estimation | Priorité |
|-------|------------|----------|
| Installer pdf-parse, mammoth, xlsx | 15min | P0 |
| Créer middleware de lecture multi-format | 2h | P0 |
| Parser PDF | 1h | P0 |
| Parser Word (.docx) | 1h | P0 |
| Parser Excel (.xlsx) | 1h | P1 |
| Tests et corrections | 1h | P0 |
| **Total** | **~6h** | |

**Livrable** : Filesystem MCP lit PDF, Word, Excel

---

### 🚀 Sprint 2 : Affichage Riche (Semaine 2)
**Objectif** : Belle présentation des fichiers dans le chat

| Tâche | Estimation | Priorité |
|-------|------------|----------|
| Créer composant FilePreview | 2h | P0 |
| Support markdown rendu | 1h | P0 |
| Support code syntax highlighting | 1h | P1 |
| Support tableaux Excel | 1h | P1 |
| Bouton download | 1h | P1 |
| Tests et polish | 1h | P0 |
| **Total** | **~7h** | |

**Livrable** : Fichiers affichés joliment avec métadonnées

---

### 🚀 Sprint 3 : Autres MCP (Semaine 3)
**Objectif** : Gmail et Memory fonctionnels

| Tâche | Estimation | Priorité |
|-------|------------|----------|
| Configuration Google OAuth (Gmail + Drive) | 2h | P0 |
| Implémenter flow OAuth backend | 2h | P0 |
| Modal configuration Gmail | 1h | P0 |
| Tests Gmail (search, read) | 1h | P0 |
| Installation Memory MCP | 15min | P1 |
| Tests Memory (store, recall) | 30min | P1 |
| **Total** | **~7h** | |

**Livrable** : Gmail et Memory connectés et fonctionnels

---

## 🎁 Fonctionnalités Bonus (Si Temps)

### Bonus 1 : **Recherche Avancée Filesystem**
- Recherche par contenu (grep-like)
- Filtres par extension, date, taille
- Pagination des résultats

### Bonus 2 : **Batch Operations**
- Lire plusieurs fichiers à la fois
- Comparer des documents
- Générer des résumés de dossiers

### Bonus 3 : **Images & OCR**
- Support PNG, JPG, WEBP
- OCR avec Tesseract
- Extraction de texte des images

### Bonus 4 : **GitHub Advanced**
- Créer des issues
- Commenter des PR
- Chercher dans le code

---

## 📊 Métriques de Succès

### Sprint 1 ✅
- [ ] Filesystem lit des PDFs sans erreur
- [ ] Filesystem lit des .docx sans erreur
- [ ] Filesystem lit des .xlsx et retourne des tableaux
- [ ] Tests manuels sur 10+ fichiers différents

### Sprint 2 ✅
- [ ] Fichiers PDF affichés avec métadonnées
- [ ] Markdown rendu correctement
- [ ] Code avec syntax highlighting
- [ ] Bouton download fonctionne

### Sprint 3 ✅
- [ ] Gmail connecté avec OAuth
- [ ] Recherche d'emails fonctionne
- [ ] Lecture d'emails avec contenu HTML
- [ ] Memory store/recall fonctionne

---

## 🚦 Quelle Est la Prochaine Action ?

**Je vous recommande de commencer par Sprint 1 : Support Multi-Formats**

### Action Immédiate (Maintenant) :
1. **Installer les dépendances**
   ```bash
   cd backend
   npm install pdf-parse mammoth xlsx
   ```

2. **Je crée le middleware de lecture multi-format**
   - Nouveau fichier : `backend/src/utils/file-reader.js`
   - Détection automatique du type de fichier
   - Parsers pour PDF, Word, Excel

3. **Je modifie le serveur filesystem MCP**
   - Utiliser le nouveau file-reader
   - Retourner le contenu avec métadonnées

Voulez-vous que je commence par **Sprint 1 : Support Multi-Formats** ? 🚀
