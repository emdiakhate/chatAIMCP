import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware pour gérer les erreurs de validation
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation error',
      details: errors.array(),
    });
  }
  next();
};

/**
 * Validation pour l'authentification
 */
export const validateAuth = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
  handleValidationErrors,
];

/**
 * Validation pour l'envoi de messages
 */
export const validateMessage = [
  body('content')
    .notEmpty()
    .withMessage('Le contenu ne peut pas être vide')
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Le message ne peut pas dépasser 10000 caractères')
    .escape(), // Nettoyer les caractères HTML
  param('conversationId')
    .isInt()
    .withMessage('ID de conversation invalide'),
  handleValidationErrors,
];

/**
 * Validation pour la création de conversation
 */
export const validateConversation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Le titre ne peut pas dépasser 200 caractères')
    .escape(),
  handleValidationErrors,
];

/**
 * Validation pour la mise à jour de conversation
 */
export const validateConversationUpdate = [
  param('id')
    .isInt()
    .withMessage('ID de conversation invalide'),
  body('title')
    .notEmpty()
    .withMessage('Le titre ne peut pas être vide')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Le titre ne peut pas dépasser 200 caractères')
    .escape(),
  handleValidationErrors,
];

/**
 * Validation pour la suppression
 */
export const validateId = [
  param('id')
    .isInt()
    .withMessage('ID invalide'),
  handleValidationErrors,
];

/**
 * Validation pour les paramètres de pagination
 */
export const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit doit être entre 1 et 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset doit être positif'),
  handleValidationErrors,
];

/**
 * Validation pour les connexions MCP
 */
export const validateMCPConnection = [
  body('serverId')
    .isInt()
    .withMessage('Server ID invalide'),
  body('credentials')
    .optional()
    .isObject()
    .withMessage('Credentials doit être un objet'),
  handleValidationErrors,
];

/**
 * Validation pour l'upload de fichiers
 */
export const validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier fourni' });
  }

  // Vérifier la taille totale (max 50MB total)
  const totalSize = req.files.reduce((acc, file) => acc + file.size, 0);
  if (totalSize > 50 * 1024 * 1024) {
    return res.status(400).json({
      error: 'La taille totale des fichiers dépasse 50MB',
    });
  }

  // Vérifier les types de fichiers autorisés
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  const invalidFiles = req.files.filter(
    (file) => !allowedMimeTypes.includes(file.mimetype)
  );

  if (invalidFiles.length > 0) {
    return res.status(400).json({
      error: 'Type de fichier non autorisé',
      invalidFiles: invalidFiles.map((f) => f.originalname),
    });
  }

  next();
};

/**
 * Sanitizer pour nettoyer les inputs utilisateur
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Nettoyer les caractères dangereux
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Supprimer les scripts
    .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
    .replace(/javascript:/gi, '') // Supprimer javascript:
    .replace(/on\w+\s*=/gi, '') // Supprimer les event handlers
    .trim();
};
