import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// pdf-parse est un module CommonJS, on doit l'importer via require
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

import mammoth from 'mammoth';
import xlsx from 'xlsx';

/**
 * Middleware de lecture de fichiers multi-formats
 * Support : PDF, Word (.docx), Excel (.xlsx, .xls), Texte brut
 */

/**
 * Détecte le type de fichier basé sur l'extension
 */
export function detectFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const typeMap = {
    // Documents texte
    '.txt': 'text',
    '.md': 'markdown',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.csv': 'csv',

    // Documents formatés
    '.pdf': 'pdf',
    '.doc': 'word-legacy',
    '.docx': 'word',

    // Tableurs
    '.xls': 'excel-legacy',
    '.xlsx': 'excel',
    '.xlsm': 'excel',

    // Code
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.rb': 'ruby',
    '.sh': 'shell',

    // Web
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',

    // Config
    '.env': 'env',
    '.gitignore': 'gitignore',
    '.config': 'config',
  };

  return typeMap[ext] || 'unknown';
}

/**
 * Parse un fichier PDF
 */
async function parsePDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);

  return {
    content: data.text,
    metadata: {
      pages: data.numpages,
      info: data.info || {},
      version: data.version,
    }
  };
}

/**
 * Parse un fichier Word (.docx)
 */
async function parseWord(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });

  return {
    content: result.value,
    metadata: {
      warnings: result.messages,
    }
  };
}

/**
 * Parse un fichier Excel (.xlsx, .xls)
 */
function parseExcel(filePath) {
  const workbook = xlsx.readFile(filePath);

  // Extraire toutes les feuilles
  const sheets = {};
  const allText = [];

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];

    // Convertir en JSON pour un format structuré
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    sheets[sheetName] = jsonData;

    // Convertir en texte pour le contenu
    const csvData = xlsx.utils.sheet_to_csv(sheet);
    allText.push(`\n=== Sheet: ${sheetName} ===\n${csvData}`);
  });

  return {
    content: allText.join('\n'),
    metadata: {
      sheetCount: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
      sheets: sheets, // Données structurées pour affichage avancé
    }
  };
}

/**
 * Parse un fichier texte brut
 */
function parseText(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  return {
    content,
    metadata: {
      lines: content.split('\n').length,
      encoding: 'utf-8',
    }
  };
}

/**
 * Lit un fichier et retourne son contenu avec métadonnées
 *
 * @param {string} filePath - Chemin absolu du fichier
 * @returns {Promise<Object>} - { content, type, size, metadata }
 */
export async function readFile(filePath) {
  // Vérifier que le fichier existe
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Obtenir les stats du fichier
  const stats = fs.statSync(filePath);

  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${filePath}`);
  }

  // Déterminer le type
  const fileType = detectFileType(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);

  // Informations de base
  const baseInfo = {
    name: fileName,
    path: filePath,
    type: fileType,
    extension: ext,
    size: stats.size,
    sizeHuman: formatFileSize(stats.size),
    modified: stats.mtime,
    created: stats.birthtime,
  };

  try {
    let result;

    // Parser selon le type
    switch (fileType) {
      case 'pdf':
        result = await parsePDF(filePath);
        break;

      case 'word':
        result = await parseWord(filePath);
        break;

      case 'excel':
      case 'excel-legacy':
        result = parseExcel(filePath);
        break;

      case 'text':
      case 'markdown':
      case 'json':
      case 'xml':
      case 'yaml':
      case 'csv':
      case 'javascript':
      case 'typescript':
      case 'python':
      case 'java':
      case 'cpp':
      case 'c':
      case 'go':
      case 'rust':
      case 'php':
      case 'ruby':
      case 'shell':
      case 'html':
      case 'css':
      case 'scss':
      case 'env':
      case 'config':
        result = parseText(filePath);
        break;

      default:
        // Essayer de lire comme texte, sinon retourner info binaire
        try {
          result = parseText(filePath);
        } catch (err) {
          result = {
            content: '[Binary file - cannot display as text]',
            metadata: {
              binary: true,
            }
          };
        }
    }

    return {
      ...baseInfo,
      content: result.content,
      metadata: result.metadata,
      success: true,
    };

  } catch (error) {
    return {
      ...baseInfo,
      content: null,
      error: error.message,
      success: false,
    };
  }
}

/**
 * Formate la taille du fichier en format lisible
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Lit plusieurs fichiers en parallèle
 *
 * @param {string[]} filePaths - Liste des chemins de fichiers
 * @returns {Promise<Object[]>} - Résultats de lecture
 */
export async function readMultipleFiles(filePaths) {
  const promises = filePaths.map(filePath =>
    readFile(filePath).catch(error => ({
      path: filePath,
      error: error.message,
      success: false,
    }))
  );

  return Promise.all(promises);
}

/**
 * Obtient les métadonnées d'un fichier sans lire le contenu
 *
 * @param {string} filePath - Chemin du fichier
 * @returns {Object} - Métadonnées
 */
export function getFileMetadata(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  const fileType = detectFileType(filePath);

  return {
    name: path.basename(filePath),
    path: filePath,
    type: fileType,
    extension: path.extname(filePath),
    size: stats.size,
    sizeHuman: formatFileSize(stats.size),
    modified: stats.mtime,
    created: stats.birthtime,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
  };
}

export default {
  readFile,
  readMultipleFiles,
  getFileMetadata,
  detectFileType,
};
