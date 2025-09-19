import fs from 'fs';
import path from 'path';
import { incrementTagCount } from './tags';

// Add user votes tracking
interface UserVote {
  userId: string;
  voteType: 'up' | 'down';
  timestamp: string;
  weekId: string; // Add week identifier for weekly tracking
}

export interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    title?: string;
  };
  content: string;
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
    title?: string;
  };
  category: string;
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  weeklyLikes: {
    likesReceivedThisWeek: number;
    weekId: string; // Current week identifier
  };
  userVote?: 'up' | 'down' | null;
  userVotes?: UserVote[];
  views: number;
  downloads: number;
  comments: number;
  isModerated: boolean;
  moderationResult?: {
    isAppropriate: boolean;
    flags: string[];
  };
  tags: string[];
  isDraft?: boolean;
  commentsList?: Comment[];
}

export interface GalleryCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  imageCount: number;
}

const dataDir = path.join(process.cwd(), 'data');
const galleryFile = path.join(dataDir, 'gallery.json');

// Helper function to get current week ID (YYYY-WW format)
function getCurrentWeekId(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  const weekId = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  return weekId;
}

// Helper function to check if a week has passed
function hasWeekChanged(oldWeekId: string): boolean {
  return getCurrentWeekId() !== oldWeekId;
}

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize gallery.json if it doesn't exist
if (!fs.existsSync(galleryFile)) {
  const initialData = {
    images: [],
    categories: [
      {
        id: 'dice-throne',
        name: 'Dice Throne',
        description: 'This is where legends roll. Showcase your custom die and claim your place in the Dice Throne.',
        icon: 'ThroneIcon.svg',
        color: 'bg-red-100 text-red-600',
        imageCount: 0
      },
      {
        id: 'the-kings-card',
        name: 'The King\'s Card',
        description: 'Present your relic to the court. Each week, one card ascends to the King\'s side.',
        icon: 'KingsCard.svg',
        color: 'bg-pink-100 text-pink-600',
        imageCount: 0
      },
      {
        id: 'collections',
        name: 'Game Collections',
        description: 'Show off your board game collections',
        icon: 'CollectionIcon.svg',
        color: 'bg-blue-100 text-blue-600',
        imageCount: 0
      },
      {
        id: 'setups',
        name: 'Game Setups',
        description: 'Share your table layouts and game setups before the action begins',
        icon: 'SetupsIcon.svg',
        color: 'bg-green-100 text-green-600',
        imageCount: 0
      },
      {
        id: 'events',
        name: 'Game Events',
        description: 'Board game events and meetups',
        icon: 'EventsIcon.svg',
        color: 'bg-purple-100 text-purple-600',
        imageCount: 0
      }
    ]
  };
  fs.writeFileSync(galleryFile, JSON.stringify(initialData, null, 2));
}

export function getAllImages(includeDrafts: boolean = false): GalleryImage[] {
  try {
    const data = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const images = data.images || [];
    
    if (includeDrafts) {
      return images;
    }
    
    // Filter out drafts by default
    return images.filter((image: GalleryImage) => !image.isDraft);
  } catch (error) {
    console.error('Error reading gallery data:', error);
    return [];
  }
}

export function getImagesByCategory(category: string): GalleryImage[] {
  const images = getAllImages();
  if (category === 'all') {
    return images;
  }
  return images.filter(image => image.category === category);
}

export function getImagesByAuthor(authorId: string): GalleryImage[] {
  const images = getAllImages();
  return images.filter(image => image.author.id === authorId);
}

export function getDraftsByAuthor(authorId: string): GalleryImage[] {
  const images = getAllImages(true); // Include drafts
  return images.filter(image => image.author.id === authorId && image.isDraft);
}

export function getImageById(id: string): GalleryImage | null {
  const images = getAllImages();
  return images.find(image => image.id === id) || null;
}

export interface UploadImageData {
  file: File;
  title: string;
  category: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
    title?: string;
  };
  description?: string;
  tags?: string[];
  isDraft?: boolean;
}

export async function uploadImage(data: UploadImageData): Promise<GalleryImage> {
  // Save the uploaded file to the public directory
  const timestamp = Date.now();
  const fileExtension = data.file.name.split('.').pop() || 'svg';
  const filename = `gallery-${timestamp}.${fileExtension}`;
  
  // Create gallery directory if it doesn't exist
  const galleryDir = path.join(process.cwd(), 'public', 'gallery');
  if (!fs.existsSync(galleryDir)) {
    fs.mkdirSync(galleryDir, { recursive: true });
  }
  
  const outputPath = path.join(galleryDir, filename);
  
  // Convert file to buffer and save
  const buffer = Buffer.from(await data.file.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  
  // Create public URLs
  const imageUrl = `/gallery/${filename}`;
  const thumbnailUrl = imageUrl; // For SVG files, we can use the same URL
  
  const imageData = {
    title: data.title,
    description: data.description || '',
    imageUrl,
    thumbnailUrl,
    author: data.author,
    category: data.category,
    tags: data.tags || []
  };
  
  return createImage(imageData);
}

export function createImage(imageData: Omit<GalleryImage, 'id' | 'createdAt' | 'votes' | 'weeklyLikes' | 'views' | 'downloads' | 'comments' | 'isModerated'>): GalleryImage {
  try {
    const data = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const images = data.images || [];
    
    const newImage: GalleryImage = {
      ...imageData,
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      votes: {
        upvotes: 0,
        downvotes: 0
      },
      weeklyLikes: {
        likesReceivedThisWeek: 0,
        weekId: getCurrentWeekId()
      },
      views: 0,
      downloads: 0,
      comments: 0,
      isModerated: false,
      isDraft: imageData.isDraft || false
    };
    
    images.push(newImage);
    
    // Update category image counts
    const categories = data.categories || [];
    const category = categories.find((cat: GalleryCategory) => cat.id === newImage.category);
    if (category) {
      category.imageCount = getImagesByCategory(category.id).length;
    }
    
    data.images = images;
    data.categories = categories;
    
    fs.writeFileSync(galleryFile, JSON.stringify(data, null, 2));
    
    // Increment tag counts
    if (newImage.tags && newImage.tags.length > 0) {
      incrementTagCount(newImage.tags);
    }
    
    return newImage;
  } catch (error) {
    console.error('Error creating image:', error);
    throw new Error('Failed to create image');
  }
}

export function updateImageVote(imageId: string, voteType: 'up' | 'down' | null, userId: string): GalleryImage | null {
  try {
    console.log('updateImageVote called with:', { imageId, voteType, userId });
    
    const data = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const images = data.images || [];
    
    console.log('Total images in gallery:', images.length);
    
    const imageIndex = images.findIndex((img: GalleryImage) => img.id === imageId);
    console.log('Image index found:', imageIndex);
    
    if (imageIndex === -1) {
      console.log('Image not found in gallery');
      return null;
    }
    
    const image = images[imageIndex];
    const currentWeekId = getCurrentWeekId();
    
    // Initialize weeklyLikes if it doesn't exist (for older images)
    if (!image.weeklyLikes) {
      image.weeklyLikes = {
        likesReceivedThisWeek: 0,
        weekId: currentWeekId
      };
    }
    
    // Reset weekly likes if week has changed
    if (hasWeekChanged(image.weeklyLikes.weekId)) {
      image.weeklyLikes = {
        likesReceivedThisWeek: 0,
        weekId: currentWeekId
      };
    }
    
    // Get current user vote for this week
    const currentUserVote = image.userVotes?.find(vote => 
      vote.userId === userId && vote.weekId === currentWeekId
    );
    const currentVoteType = currentUserVote?.voteType || null;
    
    console.log('Current vote type:', currentVoteType);
    console.log('New vote type:', voteType);
    console.log('Current week ID:', currentWeekId);
    
    // Calculate vote changes
    let totalUpvoteChange = 0;
    let totalDownvoteChange = 0;
    let weeklyLikesChange = 0;
    let newVoteType: 'up' | 'down' | null = voteType;
    
    if (currentVoteType === voteType) {
      // Remove vote (clicking same button)
      console.log('Removing existing vote');
      newVoteType = null;
      if (voteType === 'up') {
        totalUpvoteChange = -1;
        weeklyLikesChange = -1; // Remove a like received this week
      } else if (voteType === 'down') {
        totalDownvoteChange = -1;
        // No change to weekly likes for downvotes
      }
    } else {
      // Add new vote or change vote
      console.log('Adding new vote or changing vote');
      if (voteType === 'up') {
        totalUpvoteChange = 1;
        weeklyLikesChange = 1; // Add a like received this week
      } else if (voteType === 'down') {
        totalDownvoteChange = 1;
        // No change to weekly likes for downvotes
      }
      
      // Remove previous vote if exists
      if (currentVoteType === 'up') {
        totalUpvoteChange -= 1;
        weeklyLikesChange -= 1; // Remove a like received this week
      } else if (currentVoteType === 'down') {
        totalDownvoteChange -= 1;
        // No change to weekly likes for downvotes
      }
    }
    
    console.log('Vote changes:', { totalUpvoteChange, totalDownvoteChange, weeklyLikesChange, newVoteType });

    // Update user votes array
    const updatedUserVotes = image.userVotes ? [...image.userVotes] : [];
    
    if (newVoteType === null) {
      // Remove user's vote for this week
      const voteIndex = updatedUserVotes.findIndex(vote => 
        vote.userId === userId && vote.weekId === currentWeekId
      );
      if (voteIndex !== -1) {
        updatedUserVotes.splice(voteIndex, 1);
      }
    } else {
      // Add or update user's vote for this week
      const existingVoteIndex = updatedUserVotes.findIndex(vote => 
        vote.userId === userId && vote.weekId === currentWeekId
      );
      const newVote: UserVote = {
        userId,
        voteType: newVoteType,
        timestamp: new Date().toISOString(),
        weekId: currentWeekId
      };
      
      if (existingVoteIndex !== -1) {
        updatedUserVotes[existingVoteIndex] = newVote;
      } else {
        updatedUserVotes.push(newVote);
      }
    }

    const updatedImage: GalleryImage = {
      ...image,
      userVote: newVoteType,
      votes: {
        upvotes: Math.max(0, image.votes.upvotes + totalUpvoteChange),
        downvotes: Math.max(0, image.votes.downvotes + totalDownvoteChange)
      },
      weeklyLikes: {
        likesReceivedThisWeek: Math.max(0, image.weeklyLikes.likesReceivedThisWeek + weeklyLikesChange),
        weekId: currentWeekId
      },
      userVotes: updatedUserVotes
    };

    images[imageIndex] = updatedImage;
    data.images = images;
    fs.writeFileSync(galleryFile, JSON.stringify(data, null, 2));
    
    return updatedImage;
  } catch (error) {
    console.error('Error updating image vote:', error);
    return null;
  }
}

// Helper function to get user's vote for an image (current week)
export function getUserVote(imageId: string, userId: string): 'up' | 'down' | null {
  try {
    const data = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const images = data.images || [];
    const image = images.find((img: GalleryImage) => img.id === imageId);
    
    if (!image || !image.userVotes) {
      return null;
    }
    
    const currentWeekId = getCurrentWeekId();
    const userVote = image.userVotes.find(vote => 
      vote.userId === userId && vote.weekId === currentWeekId
    );
    
    return userVote ? userVote.voteType : null;
  } catch (error) {
    console.error('Error getting user vote:', error);
    return null;
  }
}

export function incrementImageViews(imageId: string): void {
  try {
    const data = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const images = data.images || [];
    
    const imageIndex = images.findIndex((img: GalleryImage) => img.id === imageId);
    if (imageIndex !== -1) {
      images[imageIndex].views += 1;
      data.images = images;
      fs.writeFileSync(galleryFile, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error incrementing image views:', error);
  }
}

export function getAllCategories(): GalleryCategory[] {
  try {
    const data = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const categories = data.categories || [];
    const images = data.images || [];
    
    // Recalculate image counts for each category
    categories.forEach((category: GalleryCategory) => {
      category.imageCount = images.filter((image: GalleryImage) => 
        image.category === category.id && !image.isDraft
      ).length;
    });
    
    return categories;
  } catch (error) {
    console.error('Error reading gallery categories:', error);
    return [];
  }
}

export function getCategoryById(id: string): GalleryCategory | null {
  const categories = getAllCategories();
  return categories.find(category => category.id === id) || null;
}

export function publishDraft(imageId: string): GalleryImage | null {
  try {
    const data = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const images = data.images || [];
    
    const imageIndex = images.findIndex((img: GalleryImage) => img.id === imageId);
    if (imageIndex === -1) {
      return null;
    }
    
    const image = images[imageIndex];
    
    // Check if it's a draft
    if (!image.isDraft) {
      return null; // Already published
    }
    
    // Publish the draft
    image.isDraft = false;
    
    data.images = images;
    fs.writeFileSync(galleryFile, JSON.stringify(data, null, 2));
    
    // Update category image counts
    updateCategoryImageCounts();
    
    return image;
  } catch (error) {
    console.error('Error publishing draft:', error);
    return null;
  }
}

export function updateCategoryImageCounts(): void {
  try {
    const data = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const categories = getAllCategories(); // This now recalculates counts
    
    data.categories = categories;
    fs.writeFileSync(galleryFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error updating category image counts:', error);
  }
}

// Function to get the featured image based on weekly likes received
export function getFeaturedImage(): GalleryImage | null {
  try {
    const images = getAllImages();
    if (images.length === 0) return null;
    
    const currentWeekId = getCurrentWeekId();
    
    // Filter images that have weekly likes for the current week
    const imagesWithWeeklyLikes = images.filter(image => {
      if (!image.weeklyLikes) return false;
      return image.weeklyLikes.weekId === currentWeekId;
    });
    
    if (imagesWithWeeklyLikes.length === 0) {
      // If no images have weekly likes for this week, return the most recent image
      return images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }
    
    // Find the image with the highest weekly likes received
    const featuredImage = imagesWithWeeklyLikes.reduce((prev, current) => {
      const prevWeeklyLikes = prev.weeklyLikes?.likesReceivedThisWeek || 0;
      const currentWeeklyLikes = current.weeklyLikes?.likesReceivedThisWeek || 0;
      
      if (currentWeeklyLikes > prevWeeklyLikes) {
        return current;
      } else if (currentWeeklyLikes === prevWeeklyLikes) {
        // If tied, use the most recent one
        return new Date(current.createdAt) > new Date(prev.createdAt) ? current : prev;
      }
      return prev;
    });
    
    return featuredImage;
  } catch (error) {
    console.error('Error getting featured image:', error);
    return null;
  }
}

// Function to get featured image IDs for the current week
export function getFeaturedImageIds(): Set<string> {
  try {
    const featuredImage = getFeaturedImage();
    return featuredImage ? new Set([featuredImage.id]) : new Set();
  } catch (error) {
    console.error('Error getting featured image IDs:', error);
    return new Set();
  }
} 