# 🔧 Guide de Dépannage

## ❌ Erreur: "Access token required"

### Causes possibles:
1. **Vous n'êtes pas connecté** - Le token n'est pas dans localStorage
2. **Le token a expiré** - Vous devez vous reconnecter
3. **Le token n'est pas envoyé** - Problème avec les headers HTTP

### Solutions:

#### 1. Vérifier que vous êtes connecté
- Ouvrez la console du navigateur (F12)
- Tapez: `localStorage.getItem('token')`
- Si cela retourne `null`, vous devez vous reconnecter

#### 2. Se reconnecter
- Allez sur la page de connexion
- Connectez-vous à nouveau avec votre email et mot de passe

#### 3. Vérifier les headers
- Ouvrez l'onglet Network dans les DevTools
- Regardez la requête `POST /api/mcp/connections`
- Vérifiez que le header `Authorization: Bearer <token>` est présent

---

## ❌ Erreur: "database or disk is full"

### Cause:
Votre disque est plein (100% utilisé). SQLite ne peut pas écrire dans la base de données.

### Solutions:

#### 1. Libérer de l'espace disque
```bash
# Vérifier l'espace disque
df -h

# Nettoyer les fichiers temporaires
rm -rf ~/Library/Caches/*
rm -rf /tmp/*

# Nettoyer les logs
rm -rf ~/Library/Logs/*

# Vérifier les gros fichiers
du -sh ~/* | sort -hr | head -10
```

#### 2. Nettoyer les bases de données SQLite
```bash
cd /Users/malick/Documents/GitHub/chatAIMCP/backend

# Vérifier la taille des bases de données
ls -lh database/*.db

# Si nécessaire, supprimer les anciennes bases de données (ATTENTION: perte de données)
# rm database/chatai-mcp.db.backup
```

#### 3. Vérifier les fichiers volumineux
```bash
# Trouver les fichiers les plus volumineux
find ~ -type f -size +100M 2>/dev/null | head -20
```

#### 4. Nettoyer les node_modules (si nécessaire)
```bash
cd /Users/malick/Documents/GitHub/chatAIMCP
rm -rf node_modules backend/node_modules
npm install
cd backend && npm install
```

---

## ❌ Erreur: "Failed to create MCP connection"

### Causes possibles:
1. Disque plein (voir ci-dessus)
2. Token manquant ou invalide (voir ci-dessus)
3. Serveur MCP introuvable
4. Problème de connexion réseau

### Solutions:

#### 1. Vérifier que le serveur backend est démarré
```bash
curl http://localhost:3001/health
```

#### 2. Vérifier les logs du serveur
- Regardez les logs dans le terminal où le serveur backend tourne
- Cherchez les erreurs spécifiques

#### 3. Vérifier l'espace disque
- Voir la section "database or disk is full" ci-dessus

---

## ✅ Vérifications Générales

### 1. Serveurs démarrés
- ✅ Backend: `http://localhost:3001/health` doit retourner `{"status":"ok"}`
- ✅ Frontend: `http://localhost:5173` doit être accessible

### 2. Authentification
- ✅ Token présent dans localStorage
- ✅ Token valide (pas expiré)

### 3. Base de données
- ✅ Fichier `backend/database/chatai.db` existe
- ✅ Espace disque disponible (> 1GB recommandé)

### 4. Variables d'environnement
- ✅ `.env` dans le dossier `backend/`
- ✅ `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` configurés
- ✅ `JWT_SECRET` configuré

---

## 🆘 En cas de problème persistant

1. **Redémarrer les serveurs**
   ```bash
   # Arrêter les serveurs (Ctrl+C)
   # Puis redémarrer:
   cd backend && node src/server-sqlite-mcp.js
   # Dans un autre terminal:
   npm run dev
   ```

2. **Vérifier les logs**
   - Backend: Regardez les logs dans le terminal
   - Frontend: Ouvrez la console du navigateur (F12)

3. **Nettoyer et réinstaller**
   ```bash
   # Supprimer node_modules
   rm -rf node_modules backend/node_modules
   
   # Réinstaller
   npm install
   cd backend && npm install
   ```

4. **Vérifier l'espace disque**
   - Libérez au moins 1-2 GB d'espace
   - Voir la section "database or disk is full" ci-dessus
