# Amazon Associates Setup Guide

This guide explains how to set up and use Amazon Associates links in the Shop page.

## Amazon Associates Requirements

1. **Disclosure**: The shop page includes the required disclosure: "As an Amazon Associate, I earn from qualifying purchases."
2. **Link Format**: All links use the proper Amazon Associates format: `https://www.amazon.com/dp/ASIN?tag=YOUR_TAG`
3. **Link Attributes**: All links include:
   - `target="_blank"` - Opens in new tab
   - `rel="noopener noreferrer sponsored"` - Required for affiliate links

## Setup Instructions

### 1. Get Your Amazon Associates Tag

1. Sign up for [Amazon Associates](https://affiliate-program.amazon.com/)
2. Once approved, you'll receive a tracking ID (tag) like `kingdice-20`
3. Update the `AMAZON_TAG` constant in `data/board-games.ts`

### 2. Find Product ASINs

1. Go to any product page on Amazon
2. The ASIN is in the product URL or product details
3. Example: `https://www.amazon.com/dp/B000W7JWUA` - ASIN is `B000W7JWUA`

### 3. Add Board Games

Edit `data/board-games.ts` and add your board games:

```typescript
{
  id: 'unique-id',
  name: 'Game Name',
  description: 'Game description',
  imageUrl: '/games/game-name.jpg', // Add images to public/games/
  amazonUrl: createAmazonLink('ASIN_HERE'), // Use the helper function
  price: '$49.99',
  rating: 4.8,
  players: '2-4',
  playTime: '60 min',
  category: 'Strategy',
  ageRange: '10+'
}
```

### 4. Add Product Images

1. Create a `public/games/` directory
2. Add product images (recommended: 400x400px or larger)
3. Use descriptive filenames matching the `imageUrl` in your data

## Amazon Associates Guidelines

- ✅ Always include the disclosure statement
- ✅ Use proper link format with your tag
- ✅ Links must open in new tabs
- ✅ Include `rel="sponsored"` attribute
- ✅ Don't modify Amazon product information
- ✅ Don't make false claims about products
- ❌ Don't use shortened URLs
- ❌ Don't hide the disclosure
- ❌ Don't claim products are "on sale" unless Amazon shows it

## Testing

1. Test all links to ensure they work
2. Verify your tag is in the URL
3. Check that links open in new tabs
4. Confirm disclosure is visible

## Resources

- [Amazon Associates Operating Agreement](https://affiliate-program.amazon.com/help/operating/agreement)
- [Link Requirements](https://affiliate-program.amazon.com/help/node/topic/GP38VX3X4XZ8N6C)
- [Disclosure Requirements](https://affiliate-program.amazon.com/help/node/topic/GP38VX3X4XZ8N6C)

