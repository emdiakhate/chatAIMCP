import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Créer le répertoire d'upload s'il n'existe pas
const UPLOAD_DIR = '/tmp/chatai-uploads';

async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Générer un nom unique avec timestamp et nom original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Limite à 50MB
  },
  fileFilter: (req, file, cb) => {
    // Accepter tous les types de fichiers
    cb(null, true);
  }
});

/**
 * POST /api/files/upload
 * Upload un ou plusieurs fichiers
 */
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.json({
      success: true,
      files: uploadedFiles,
      uploadDir: UPLOAD_DIR,
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload des fichiers' });
  }
});

/**
 * GET /api/files/list
 * Liste les fichiers uploadés
 */
router.get('/list', async (req, res) => {
  try {
    await ensureUploadDir();
    const files = await fs.readdir(UPLOAD_DIR);

    const fileDetails = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(UPLOAD_DIR, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      })
    );

    res.json({
      success: true,
      files: fileDetails,
      uploadDir: UPLOAD_DIR,
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Erreur lors de la liste des fichiers' });
  }
});

/**
 * DELETE /api/files/:filename
 * Supprime un fichier uploadé
 */
router.delete('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Vérifier que le fichier est bien dans le répertoire d'upload (sécurité)
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);

    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await fs.unlink(filePath);

    res.json({
      success: true,
      message: 'Fichier supprimé avec succès',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
  }
});

/**
 * POST /api/files/cleanup
 * Nettoie les fichiers plus anciens que X heures
 */
router.post('/cleanup', async (req, res) => {
  try {
    const maxAgeHours = req.body.maxAgeHours || 24; // Par défaut 24h
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    await ensureUploadDir();
    const files = await fs.readdir(UPLOAD_DIR);

    let deletedCount = 0;
    for (const filename of files) {
      const filePath = path.join(UPLOAD_DIR, filename);
      const stats = await fs.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    res.json({
      success: true,
      deletedCount,
      message: `${deletedCount} fichier(s) supprimé(s)`,
    });
  } catch (error) {
    console.error('Error cleaning up files:', error);
    res.status(500).json({ error: 'Erreur lors du nettoyage des fichiers' });
  }
});

export default router;
