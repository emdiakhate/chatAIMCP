# Guide de Test - Système Multi-LLM

## 🚀 Démarrage Rapide

### Étape 1 : Configuration des API Keys

**IMPORTANT** : Vous devez avoir au moins une clé API configurée pour utiliser le système.

#### Option A : Groq (Recommandé pour débuter - Gratuit et Rapide)

1. Créer un compte sur https://console.groq.com
2. Aller dans "API Keys" dans le menu de gauche
3. Cliquer sur "Create API Key"
4. Copier la clé (commence par `gsk_`)
5. Ajouter dans `backend/.env` :
   ```bash
   GROQ_API_KEY=gsk_votre_cle_ici
   ```

#### Option B : OpenRouter (Optionnel - Accès aux modèles premium)

1. Créer un compte sur https://openrouter.ai
2. Aller dans "Keys"
3. Créer une nouvelle clé
4. Copier la clé (commence par `sk-or-v1-`)
5. Ajouter dans `backend/.env` :
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-votre_cle_ici
   ```

### Étape 2 : Démarrer l'Application

```bash
# Terminal 1 - Backend
cd backend
npm install  # Si première fois
npm run dev

# Terminal 2 - Frontend (nouveau terminal)
npm install  # Si première fois
npm run dev
```

Attendez que les deux serveurs soient démarrés :
- ✅ Backend : http://localhost:3001
- ✅ Frontend : http://localhost:5173 (ou le port affiché)

### Étape 3 : Tests de Base

#### Test 1 : Vérifier l'Intégration UI

1. Ouvrir l'application dans le navigateur
2. Se connecter ou créer un compte
3. Dans le **Sidebar** (à gauche), vérifier que vous voyez :
   - ✅ "Configuration LLM" (avec icône Sparkles ✨)
   - ✅ "Statistiques & Coûts" (avec icône BarChart 📊)
   - ✅ Un séparateur
   - ✅ "Settings"
   - ✅ "Log out"

**Capture d'écran attendue :**
```
┌─────────────────────┐
│  [+] New Chat       │
├─────────────────────┤
│  Conversations...   │
│                     │
├─────────────────────┤
│ ✨ Configuration LLM│
│ 📊 Statistiques     │
│ ─────────────────   │
│ ⚙️  Settings        │
│ 🚪 Log out          │
└─────────────────────┘
```

#### Test 2 : Configuration du Modèle

1. Cliquer sur **"Configuration LLM"**
2. Une modal devrait s'ouvrir
3. Vérifier :
   - ✅ Section "État des Fournisseurs"
     - Groq : "Configuré" (vert) ou "Non configuré" (orange)
     - OpenRouter : selon votre configuration
   - ✅ Section "Modèle par Défaut"
     - Liste des modèles Groq (si configuré)
     - Liste des modèles OpenRouter (si configuré)
   - ✅ Section "Paramètres Avancés"
     - Slider de température
     - Slider de tokens maximum
     - Checkbox de basculement automatique

4. **Action** : Sélectionner "Llama 3.1 70B" (Groq)
5. Cliquer sur **"Enregistrer"**
6. La modal devrait se fermer

**✅ Succès si** : Aucune erreur, la modal se ferme

#### Test 3 : Sélecteur de Modèle dans le Chat

1. Créer une nouvelle conversation (bouton "New Chat")
2. Dans la zone de saisie du chat, en haut :
   - ✅ Vous devez voir un bouton avec :
     - Icône Sparkles ✨
     - Texte : "Llama 3.1 70B" (ou le modèle sélectionné)
     - Flèche vers le bas ▼

3. **Action** : Cliquer sur le bouton de sélection
4. Un dropdown devrait apparaître montrant :
   - ✅ Titre "Groq (Rapide & Économique)"
   - ✅ Liste des modèles Groq avec leurs coûts
   - ✅ (Si OpenRouter configuré) Titre "OpenRouter (Premium)"
   - ✅ (Si OpenRouter configuré) Liste des modèles OpenRouter

5. **Action** : Sélectionner un modèle différent
6. Le bouton devrait afficher le nouveau modèle sélectionné

**✅ Succès si** : Le dropdown s'affiche correctement et la sélection fonctionne

#### Test 4 : Envoi d'un Message

1. Dans la zone de texte, taper : `Bonjour, peux-tu me dire quel modèle tu es ?`
2. Appuyer sur **Entrée** ou cliquer sur le bouton d'envoi
3. **Observer** :
   - ✅ Le message utilisateur apparaît
   - ✅ Un indicateur de chargement apparaît
   - ✅ La réponse du LLM apparaît

4. Vérifier dans les **logs du backend** :
   ```
   [LLM Router] Calling groq/llama-3.1-70b (X messages)
   [LLM Router] Success: XXX tokens, $0.00XXXX
   ```

**✅ Succès si** :
- Le message est envoyé et une réponse arrive
- Pas d'erreur dans la console
- Les logs backend montrent l'appel LLM réussi

#### Test 5 : Vérification du Tracking

1. Après avoir envoyé quelques messages
2. Cliquer sur **"Statistiques & Coûts"** dans le Sidebar
3. Une modal devrait s'ouvrir avec :
   - ✅ 4 cartes en haut :
     - Requêtes totales (nombre > 0)
     - Tokens utilisés (nombre > 0)
     - Coût total ($0.00XXX)
     - Coût moyen/req ($0.00XXX)
   - ✅ Section "Utilisation par Fournisseur"
     - Barre de progression pour Groq (ou OpenRouter)
     - Pourcentage et coût
   - ✅ Tableau "Détails par Modèle"
     - Ligne avec le modèle utilisé
     - Colonnes : Requêtes, Tokens, Coût Total, Coût/Req
   - ✅ Section "Activité Quotidienne"
     - Barres de progression par jour

4. **Action** : Essayer les filtres de période
   - Cliquer sur "24h", "7j", "30j"
   - Les statistiques devraient se mettre à jour

**✅ Succès si** : Les statistiques s'affichent correctement et correspondent à votre utilisation

#### Test 6 : Changement de Modèle par Message

1. Dans le chat, sélectionner un modèle différent (ex: Llama 3.1 8B)
2. Envoyer un message
3. Vérifier les logs backend : le nouveau modèle doit être utilisé
4. Retourner dans "Statistiques & Coûts"
5. Vérifier que le nouveau modèle apparaît dans les stats

**✅ Succès si** : Chaque message peut utiliser un modèle différent

## 🐛 Dépannage

### Problème : "Failed to load models"

**Cause** : Les endpoints backend ne répondent pas

**Solution** :
1. Vérifier que le backend est démarré
2. Ouvrir la console navigateur (F12)
3. Vérifier les erreurs réseau
4. Vérifier que `http://localhost:3001/api/llm/models` répond

### Problème : "Groq API key not configured"

**Cause** : La clé API n'est pas dans .env ou le backend n'a pas été redémarré

**Solution** :
1. Vérifier que `GROQ_API_KEY=...` est dans `backend/.env`
2. **Redémarrer le backend** (Ctrl+C puis `npm run dev`)
3. Vérifier les logs au démarrage du backend

### Problème : "No models available"

**Cause** : Aucune clé API configurée

**Solution** :
1. Configurer au moins une clé API (Groq recommandé)
2. Redémarrer le backend
3. Recharger la page frontend

### Problème : Messages n'arrivent pas

**Causes possibles** :
1. Clé API invalide
2. Quota dépassé
3. Erreur réseau

**Solution** :
1. Vérifier les logs backend pour l'erreur exacte
2. Vérifier la clé API sur le site du fournisseur
3. Vérifier les quotas/crédits

### Problème : Statistiques ne s'affichent pas

**Cause** : Table `llm_usage_stats` n'existe pas

**Solution** :
1. Arrêter le backend
2. Supprimer `backend/database/chatai.db`
3. Redémarrer le backend (la DB sera recréée avec toutes les tables)

## ✅ Checklist de Validation Complète

- [ ] Backend démarre sans erreur
- [ ] Frontend démarre sans erreur
- [ ] Au moins une API key configurée
- [ ] Boutons LLM visibles dans le Sidebar
- [ ] Modal "Configuration LLM" s'ouvre
- [ ] État des fournisseurs correct (Configuré/Non configuré)
- [ ] Liste des modèles s'affiche
- [ ] Sauvegarde des préférences fonctionne
- [ ] Sélecteur de modèle visible dans le chat
- [ ] Dropdown de modèles s'affiche
- [ ] Sélection d'un modèle fonctionne
- [ ] Envoi de message fonctionne
- [ ] Réponse du LLM arrive
- [ ] Logs backend montrent l'appel réussi
- [ ] Modal "Statistiques & Coûts" s'ouvre
- [ ] Statistiques s'affichent (requêtes, tokens, coûts)
- [ ] Répartition par fournisseur visible
- [ ] Tableau par modèle visible
- [ ] Activité quotidienne visible
- [ ] Filtres de période fonctionnent
- [ ] Changement de modèle par message fonctionne

## 📊 Données de Test Attendues

Après avoir envoyé **5 messages** avec Llama 3.1 70B :

**Statistiques approximatives :**
- Requêtes : ~5
- Tokens : ~2000-5000 (selon la longueur)
- Coût total : ~$0.001-$0.003
- Coût moyen : ~$0.0002-$0.0006/requête

**Modèles dans le dashboard :**
- Llama 3.1 70B (groq) : 5 requêtes

## 🎯 Test de Bout en Bout Complet

**Scénario** : Utiliser différents modèles pour différentes tâches

1. **Tâche simple** :
   - Sélectionner "Llama 3.1 8B"
   - Message : "Quelle est la capitale de la France ?"
   - Vérifier : Réponse rapide et correcte

2. **Tâche de code** :
   - Sélectionner "Llama 3.1 70B"
   - Message : "Écris une fonction Python pour calculer Fibonacci"
   - Vérifier : Code correct et bien expliqué

3. **Tâche complexe** (si OpenRouter configuré) :
   - Sélectionner "Claude 3.5 Sonnet"
   - Message : "Explique la théorie de la relativité en détail"
   - Vérifier : Réponse détaillée et précise

4. **Vérifier les coûts** :
   - Ouvrir "Statistiques & Coûts"
   - Vérifier que les 3 modèles apparaissent
   - Vérifier que les coûts sont cohérents :
     - 8B < 70B < Claude Sonnet

**✅ Succès si** : Tous les modèles fonctionnent et les coûts sont trackés correctement

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifier les logs backend
2. Vérifier la console navigateur (F12)
3. Vérifier que toutes les étapes de configuration sont faites
4. Consulter `docs/LLM_FEATURES.md` pour plus de détails

---

**Bonne chance pour les tests ! 🚀**
