# File Storage System for Game Rules Images

## Overview

This system handles image storage for game rules efficiently by storing images as files instead of base64 data in the database.

## Benefits

### 🚀 Performance
- **Faster Database Queries**: No large text fields slowing down queries
- **Reduced Memory Usage**: Images loaded only when needed
- **Better Caching**: Browser can cache image files independently

### 💾 Storage Efficiency
- **Smaller Database**: Images stored as files, not in database
- **Faster Backups**: Database backups are much smaller
- **Better Compression**: File system handles image compression better

### 🔧 Maintenance
- **Easy Cleanup**: Orphaned images can be easily identified and removed
- **File Management**: Standard file operations for image management
- **CDN Ready**: Easy to move to CDN for better performance

## How It Works

### 1. Image Upload Process
```
User Pastes Image → Base64 in Editor → Convert to File → Store File Path in DB
```

### 2. Image Display Process
```
Load Rules from DB → File Paths → Serve Images from /uploads/rules-images/
```

### 3. Image Editing Process
```
Load Rules → Convert File Paths to Base64 → Edit in RichTextEditor → Convert Back to Files
```

## File Structure

```
public/
├── uploads/
│   └── rules-images/
│       ├── 1-uuid1.png
│       ├── 1-uuid2.jpg
│       ├── 2-uuid3.png
│       └── ...
```

## Database Storage

Instead of storing base64 data:
```sql
-- OLD (Bad)
rulesText: "![Image](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAGNCAIAAABmD4ImAAAQAElEQVR4Aex9BaBVxdb/mtlxOm4Xl0t3NwgqIGIX2N3d3YWt2IFid6CimIAi3d1wu/N07JiZ/9rnAKKiz/f9v+e999C5vzN77em11syaNbPxPSr+Dvu1BJhge0Ew8WuYXBiYKgQSe4AJe/BL8XBhNWAyqxLTBQsLERNCcCF0BBPM0IWWEAJLMFNYYMKqwUUq4IshhCYExobgCGblMmHFZirmwkoX2AY2HBFW80hjFYQhBA72t2BMWBAYsDoTwhRWD1gDqyKQwKxd4Lue/8MHE9ZYfxNzYQkhHYufw2/K7ar8cwmk0rXSMb7+byORSJgGSkQkk0nOsRurg2AwqKVCOpfzXelW3u/8GGPYAmbquo5xLIYKstrEZjAFczn/o0bSY8CKCOyUc55uLRKLoZQMxhCmJUSx5xVTEJj4x8Ayumlqhr4PmEntfx2/6Aj73QVd5ymYOo4GfxaSpv4L6EZyD7TUwHSmIQxuIExh/gFQYmmg...)"

-- NEW (Good)
rulesText: "![Image](/uploads/rules-images/1-uuid1.png)"
```

## API Endpoints

### POST /api/rules/images
Convert base64 images to file references
```json
{
  "content": "![Image](data:image/png;base64,...)",
  "gameId": 123
}
```

### PUT /api/rules/images
Convert file references back to base64 for editing
```json
{
  "content": "![Image](/uploads/rules-images/1-uuid1.png)"
}
```

### DELETE /api/rules/images
Delete image files
```json
{
  "content": "![Image](/uploads/rules-images/1-uuid1.png)"
}
```

## File Naming Convention

- Format: `{gameId}-{uuid}.{extension}`
- Example: `1-a1b2c3d4-e5f6-7890-abcd-ef1234567890.png`
- Benefits:
  - Easy to identify which game owns the image
  - UUID prevents naming conflicts
  - Extension preserved for proper MIME type handling

## Migration Strategy

1. **Existing Data**: Old base64 images will continue to work
2. **New Images**: Automatically converted to file storage
3. **Gradual Migration**: Can migrate old images over time
4. **Backward Compatibility**: System handles both formats

## Maintenance

### Cleanup Orphaned Images
```bash
# Find images not referenced in database
find public/uploads/rules-images/ -name "*.png" -o -name "*.jpg" | while read file; do
  filename=$(basename "$file")
  if ! grep -r "$filename" data/ > /dev/null; then
    echo "Orphaned: $file"
  fi
done
```

### Backup Strategy
- **Database**: Regular backups (small and fast)
- **Images**: Separate backup of `/public/uploads/` directory
- **Sync**: Keep database and images in sync

## Security Considerations

- **File Validation**: Only image files allowed
- **Size Limits**: 5MB maximum per image
- **Path Sanitization**: Prevent directory traversal attacks
- **Access Control**: Images served through Next.js static file serving

## Performance Monitoring

- **File Count**: Monitor number of images per game
- **Storage Usage**: Track total uploads directory size
- **Load Times**: Monitor image loading performance
- **Database Size**: Compare before/after migration

## Future Enhancements

- **CDN Integration**: Move images to CDN for better performance
- **Image Optimization**: Automatic compression and resizing
- **Thumbnail Generation**: Create thumbnails for faster loading
- **Cloud Storage**: Move to AWS S3 or similar for scalability
