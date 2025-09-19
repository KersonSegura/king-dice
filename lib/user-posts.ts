// Utility functions for getting user posts and content

export interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation?: number;
  };
  category: string;
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  replies: number;
}

export interface GalleryImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
}

/**
 * Get posts by a specific user, with fallback to username matching
 * @param allPosts - Array of all posts
 * @param userId - User ID to match
 * @param username - Username to match as fallback
 * @returns Array of posts by the user
 */
export function getUserPosts(allPosts: Post[], userId: string, username: string): Post[] {
  // Try to match by ID first
  let userPosts = allPosts.filter(post => post.author?.id === userId);
  
  // If no posts found by ID, try username as fallback
  if (userPosts.length === 0) {
    console.log(`🔍 No posts found for user ID ${userId}, trying username match for ${username}...`);
    userPosts = allPosts.filter(post => post.author?.name === username);
  }
  
  return userPosts;
}

/**
 * Get gallery images by a specific user, with fallback to username matching
 * @param allImages - Array of all gallery images
 * @param userId - User ID to match
 * @param username - Username to match as fallback
 * @returns Array of gallery images by the user
 */
export function getUserGalleryImages(allImages: GalleryImage[], userId: string, username: string): GalleryImage[] {
  // Try to match by ID first
  let userImages = allImages.filter(image => image.author?.id === userId);
  
  // If no images found by ID, try username as fallback
  if (userImages.length === 0) {
    console.log(`🔍 No gallery images found for user ID ${userId}, trying username match for ${username}...`);
    userImages = allImages.filter(image => image.author?.name === username);
  }
  
  return userImages;
}

/**
 * Get user's post count with fallback matching
 * @param allPosts - Array of all posts
 * @param userId - User ID to match
 * @param username - Username to match as fallback
 * @returns Number of posts by the user
 */
export function getUserPostCount(allPosts: Post[], userId: string, username: string): number {
  return getUserPosts(allPosts, userId, username).length;
}

/**
 * Get user's gallery image count with fallback matching
 * @param allImages - Array of all gallery images
 * @param userId - User ID to match
 * @param username - Username to match as fallback
 * @returns Number of gallery images by the user
 */
export function getUserGalleryImageCount(allImages: GalleryImage[], userId: string, username: string): number {
  return getUserGalleryImages(allImages, userId, username).length;
}

/**
 * Update user avatar in posts and gallery images
 * This function should be called when a user updates their avatar
 * @param userId - User ID to update
 * @param username - Username to match as fallback
 * @param newAvatar - New avatar URL
 */
export async function updateUserAvatarInContent(userId: string, username: string, newAvatar: string): Promise<void> {
  try {
    // Update posts
    const postsResponse = await fetch('/api/posts');
    if (postsResponse.ok) {
      const postsData = await postsResponse.json();
      const userPosts = getUserPosts(postsData.posts, userId, username);
      
      if (userPosts.length > 0) {
        // Update posts with new avatar
        for (const post of userPosts) {
          await fetch(`/api/posts/${post.id}/update-avatar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: newAvatar })
          });
        }
      }
    }

    // Update gallery images
    const galleryResponse = await fetch('/api/gallery');
    if (galleryResponse.ok) {
      const galleryData = await galleryResponse.json();
      const userImages = getUserGalleryImages(galleryData.images, userId, username);
      
      if (userImages.length > 0) {
        // Update gallery images with new avatar
        for (const image of userImages) {
          await fetch(`/api/gallery/${image.id}/update-avatar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: newAvatar })
          });
        }
      }
    }
  } catch (error) {
    console.error('Error updating user avatar in content:', error);
  }
}
