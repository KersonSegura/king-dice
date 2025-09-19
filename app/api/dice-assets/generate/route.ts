import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { diceConfig } = await request.json();
    
    if (!diceConfig) {
      return NextResponse.json(
        { error: 'Missing diceConfig' },
        { status: 400 }
      );
    }
    
    // Generate the composite SVG for crisp avatar display at any size
    const compositeSvg = await generateCompositeSvg(diceConfig);
    
    // Save the generated SVG
    const timestamp = Date.now();
    const filename = `dice-${timestamp}.svg`;
    const outputPath = path.join(process.cwd(), 'public', 'generated', filename);
    
    // Ensure the generated directory exists
    const generatedDir = path.dirname(outputPath);
    await fs.mkdir(generatedDir, { recursive: true });
    
    // Write the SVG file
    await fs.writeFile(outputPath, compositeSvg);
    
    const publicUrl = `/generated/${filename}`;
    
    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      filename
    });
    
  } catch (error) {
    console.error('❌ Error generating composite dice image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateCompositeSvg(diceConfig: any): Promise<string> {
  const { background, dice, pattern, accessories, hat, item, companion } = diceConfig;
  
  // Helper function to load SVG content and make IDs unique
  const loadSvgContent = async (svgPath: string, layerPrefix: string): Promise<string> => {
    if (!svgPath) return '';
    
    try {
      // Convert SVG path to file path, handling URL encoding
      const relativePath = svgPath.replace('/dice/', '');
      // Decode URL-encoded path components
      const decodedPath = decodeURIComponent(relativePath);
      const fullPath = path.join(process.cwd(), 'public', 'dice', decodedPath);
      
      // Load the SVG file
      const svgContent = await fs.readFile(fullPath, 'utf-8');
      
      // Extract the content between <svg> tags (remove the outer svg wrapper)
      const svgMatch = svgContent.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
      if (svgMatch && svgMatch[1]) {
        let content = svgMatch[1].trim();
        
        // Make all IDs unique by adding layer prefix
        content = content.replace(/id="([^"]+)"/g, `id="${layerPrefix}-$1"`);
        content = content.replace(/url\(#([^)]+)\)/g, `url(#${layerPrefix}-$1)`);
        content = content.replace(/xlink:href="#([^"]+)"/g, `xlink:href="#${layerPrefix}-$1"`);
        
        // Make CSS classes unique by adding layer prefix
        content = content.replace(/\.cls-(\d+)/g, `.${layerPrefix}-cls-$1`);
        content = content.replace(/class="cls-(\d+)"/g, `class="${layerPrefix}-cls-$1"`);
        
        return content;
      }
      
      return '';
    } catch (error) {
      console.error(`Error loading SVG ${svgPath}:`, error);
      return '';
    }
  };
  
  // Load all SVG layers and collect defs
  const layers = [];
  const allDefs = new Set<string>();
  
  if (background) {
    const content = await loadSvgContent(background, 'bg');
    if (content) {
      // Extract defs from this layer and make CSS classes unique
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        // Make CSS classes unique in defs
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.bg-cls-$1`);
        allDefs.add(defsContent);
      }
      // Remove defs from content and add the rest
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="bg-Backgrounds">${contentWithoutDefs}</g>`);
    }
  }
  
  if (dice) {
    const content = await loadSvgContent(dice, 'dice');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.dice-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="dice-Dice">${contentWithoutDefs}</g>`);
    }
  }
  
  if (pattern) {
    const content = await loadSvgContent(pattern, 'pattern');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.pattern-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="pattern-Pattern">${contentWithoutDefs}</g>`);
    }
  }
  
  if (accessories) {
    const content = await loadSvgContent(accessories, 'acc');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.acc-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="acc-Accessories">${contentWithoutDefs}</g>`);
    }
  }
  
  if (hat) {
    const content = await loadSvgContent(hat, 'hat');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.hat-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="hat-Hat">${contentWithoutDefs}</g>`);
    }
  }
  
  if (item) {
    const content = await loadSvgContent(item, 'item');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.item-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="item-Item">${contentWithoutDefs}</g>`);
    }
  }
  
  if (companion) {
    const content = await loadSvgContent(companion, 'comp');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.comp-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="comp-Companion">${contentWithoutDefs}</g>`);
    }
  }
  
  // Create composite SVG with all defs
  const defsSection = allDefs.size > 0 ? `<defs>\n    ${Array.from(allDefs).join('\n    ')}\n  </defs>` : '';
  
  const compositeSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${defsSection}
  ${layers.join('\n  ')}
</svg>`;
  
  return compositeSvg;
}


