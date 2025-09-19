import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'rules-images');

// Ensure upload directory exists
export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// Save base64 image to file and return the file path
export function saveImageFromBase64(base64Data: string, gameId: number): string {
  ensureUploadDir();
  
  // Extract image type and data
  const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image data');
  }
  
  const imageType = matches[1];
  const imageData = matches[2];
  
  // Generate unique filename
  const filename = `${gameId}-${uuidv4()}.${imageType}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  
  // Save file
  fs.writeFileSync(filePath, imageData, 'base64');
  
  // Return public URL path
  return `/uploads/rules-images/${filename}`;
}

// Delete image file
export function deleteImageFile(imagePath: string): void {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
}

// Extract image paths from content
export function extractImagePaths(content: string): string[] {
  const imageMatches = content.match(/!\[([^\]]*)\]\(\/uploads\/rules-images\/[^)]+\)/g);
  if (!imageMatches) return [];
  
  return imageMatches.map(match => {
    const pathMatch = match.match(/\(\/uploads\/rules-images\/[^)]+\)/);
    return pathMatch ? pathMatch[0].slice(1, -1) : '';
  }).filter(Boolean);
}

// Convert base64 images to file references
export function convertBase64ToFileReferences(content: string, gameId: number): string {
  const base64Matches = content.match(/!\[([^\]]*)\]\(data:image\/[^)]+\)/g);
  if (!base64Matches) return content;
  
  let result = content;
  
  base64Matches.forEach(match => {
    const altMatch = match.match(/!\[([^\]]*)\]/);
    const srcMatch = match.match(/\(data:image\/[^)]+\)/);
    
    if (altMatch && srcMatch) {
      const alt = altMatch[1];
      const base64Data = srcMatch[0].slice(1, -1);
      
      try {
        const filePath = saveImageFromBase64(base64Data, gameId);
        const newMarkdown = `![${alt}](${filePath})`;
        result = result.replace(match, newMarkdown);
      } catch (error) {
        console.error('Error converting base64 to file:', error);
      }
    }
  });
  
  return result;
}

// Convert file references back to base64 for editing
export function convertFileReferencesToBase64(content: string): string {
  const fileMatches = content.match(/!\[([^\]]*)\]\(\/uploads\/rules-images\/[^)]+\)/g);
  if (!fileMatches) return content;
  
  let result = content;
  
  fileMatches.forEach(match => {
    const altMatch = match.match(/!\[([^\]]*)\]/);
    const pathMatch = match.match(/\(\/uploads\/rules-images\/[^)]+\)/);
    
    if (altMatch && pathMatch) {
      const alt = altMatch[1];
      const filePath = pathMatch[0].slice(1, -1);
      const fullPath = path.join(process.cwd(), 'public', filePath);
      
      try {
        if (fs.existsSync(fullPath)) {
          const imageData = fs.readFileSync(fullPath, 'base64');
          const imageType = path.extname(filePath).slice(1);
          const base64Data = `data:image/${imageType};base64,${imageData}`;
          const newMarkdown = `![${alt}](${base64Data})`;
          result = result.replace(match, newMarkdown);
        }
      } catch (error) {
        console.error('Error converting file to base64:', error);
      }
    }
  });
  
  return result;
}
