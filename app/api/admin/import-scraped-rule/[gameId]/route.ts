import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const gameId = parseInt(params.gameId);
    
    // Get the game info first
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { name: true, nameEn: true, nameEs: true }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Try to find scraped HTML file by matching game name
    const scrapedRulesDir = path.join(process.cwd(), 'scraped_rules', 'html');
    
    // Generate possible filenames based on game names
    const possibleNames = [
      game.name,
      game.nameEn,
      game.nameEs
    ].filter(Boolean).map(name => 
      name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim()
    );

    let scrapedContent = '';
    let foundFile = '';

    // Try to find matching HTML file
    try {
      const files = await fs.readdir(scrapedRulesDir);
      
      for (const possibleName of possibleNames) {
        const filename = `${possibleName}.html`;
        if (files.includes(filename)) {
          foundFile = filename;
          scrapedContent = await fs.readFile(
            path.join(scrapedRulesDir, filename), 
            'utf-8'
          );
          break;
        }
      }

      // If no exact match, try partial matches
      if (!scrapedContent) {
        for (const possibleName of possibleNames) {
          const matchingFile = files.find(file => 
            file.toLowerCase().includes(possibleName.toLowerCase()) ||
            possibleName.toLowerCase().includes(file.replace('.html', '').toLowerCase())
          );
          
          if (matchingFile) {
            foundFile = matchingFile;
            scrapedContent = await fs.readFile(
              path.join(scrapedRulesDir, matchingFile), 
              'utf-8'
            );
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error reading scraped rules directory:', error);
    }

    if (!scrapedContent) {
      return NextResponse.json({ 
        error: 'No scraped rules found for this game',
        searchedNames: possibleNames 
      }, { status: 404 });
    }

    // Clean up the HTML content
    let cleanedHtml = scrapedContent;
    
    // Remove common UltraBoardGames artifacts
    cleanedHtml = cleanedHtml.replace(/<div class="post-header[^>]*>.*?<\/div>/g, '');
    cleanedHtml = cleanedHtml.replace(/<div class="post-thumbnail[^>]*>.*?<\/div>/g, '');
    cleanedHtml = cleanedHtml.replace(/class="[^"]*"/g, '');
    cleanedHtml = cleanedHtml.replace(/id="[^"]*"/g, '');
    cleanedHtml = cleanedHtml.replace(/style="[^"]*"/g, '');
    
    // Fix image paths to be relative
    cleanedHtml = cleanedHtml.replace(/src="scraped_rules\/images\//g, 'src="/scraped_rules/images/');
    
    // Extract plain text version
    const textContent = cleanedHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Return the rule data ready for editing
    const ruleData = {
      gameId,
      language: 'es',
      rulesHtml: cleanedHtml,
      rulesText: textContent,
      setupInstructions: '',
      victoryConditions: '',
      source: `Imported from ${foundFile}`
    };

    return NextResponse.json(ruleData);

  } catch (error) {
    console.error('Error importing scraped rule:', error);
    return NextResponse.json({ error: 'Failed to import scraped rule' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

