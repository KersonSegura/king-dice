const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;

const prisma = new PrismaClient();

/**
 * Night Scraper Orchestrator
 * Runs multiple scrapers in parallel and monitors progress
 */
class NightScraperOrchestrator {
  constructor() {
    this.scrapers = [];
    this.startTime = new Date();
    this.logFile = `scraping_log_${Date.now()}.txt`;
    this.isRunning = true;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
  
  /**
   * Log message to both console and file
   */
  async log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    
    try {
      await fs.appendFile(this.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }
  
  /**
   * Start a scraper process
   */
  startScraper(scriptPath, args = [], name = 'Unknown') {
    const scraper = {
      name,
      process: null,
      startTime: new Date(),
      status: 'starting',
      successCount: 0,
      failCount: 0
    };
    
    this.log(`🚀 Starting ${name} scraper: ${scriptPath} ${args.join(' ')}`);
    
    scraper.process = spawn('node', [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    // Handle scraper output
    scraper.process.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`[${name}] ${output}`);
        
        // Parse success/fail counts from output
        const successMatch = output.match(/Successfully scraped: (\d+)/);
        const failMatch = output.match(/Failed to scrape: (\d+)/);
        if (successMatch) scraper.successCount = parseInt(successMatch[1]);
        if (failMatch) scraper.failCount = parseInt(failMatch[1]);
      }
    });
    
    scraper.process.stderr.on('data', (data) => {
      this.log(`[${name}] ERROR: ${data.toString().trim()}`);
    });
    
    scraper.process.on('close', (code) => {
      scraper.status = code === 0 ? 'completed' : 'failed';
      this.log(`[${name}] Process exited with code ${code}`);
    });
    
    scraper.process.on('error', (error) => {
      scraper.status = 'error';
      this.log(`[${name}] Process error: ${error.message}`);
    });
    
    this.scrapers.push(scraper);
    return scraper;
  }
  
  /**
   * Get current statistics from database
   */
  async getStats() {
    try {
      const totalGames = await prisma.game.count();
      const gamesWithRules = await prisma.game.count({
        where: { rules: { some: {} } }
      });
      const totalRules = await prisma.gameRule.count();
      
      return {
        totalGames,
        gamesWithRules,
        gamesWithoutRules: totalGames - gamesWithRules,
        totalRules,
        coverage: ((gamesWithRules / totalGames) * 100).toFixed(1)
      };
    } catch (error) {
      this.log(`❌ Error getting stats: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Monitor scrapers and log progress
   */
  async monitorProgress() {
    while (this.isRunning) {
      const stats = await this.getStats();
      const runningTime = Math.floor((new Date() - this.startTime) / 1000 / 60); // minutes
      
      this.log('\n📊 PROGRESS REPORT');
      this.log('='.repeat(30));
      this.log(`⏰ Running time: ${runningTime} minutes`);
      
      if (stats) {
        this.log(`📚 Games with rules: ${stats.gamesWithRules}/${stats.totalGames} (${stats.coverage}%)`);
        this.log(`📋 Total rules: ${stats.totalRules}`);
      }
      
      this.log('\n🤖 Scraper Status:');
      this.scrapers.forEach(scraper => {
        const runtime = Math.floor((new Date() - scraper.startTime) / 1000 / 60);
        this.log(`  ${scraper.name}: ${scraper.status} (${runtime}m) - ✅${scraper.successCount} ❌${scraper.failCount}`);
      });
      
      // Wait 10 minutes before next report
      await new Promise(resolve => setTimeout(resolve, 10 * 60 * 1000));
    }
  }
  
  /**
   * Start all scrapers
   */
  async startAllScrapers() {
    this.log('🌙 NIGHT SCRAPER ORCHESTRATOR STARTING');
    this.log('='.repeat(50));
    this.log('🎯 Goal: Maximum game rules coverage overnight');
    
    // Start UltraBoardGames scraper with comprehensive list
    this.startScraper(
      'scripts/scrape-ultrabg-rules.js',
      ['continuous'],
      'UltraBoardGames'
    );
    
    // Wait 30 seconds before starting next scraper
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Start BGG scraper
    this.startScraper(
      'scripts/scrape-bgg-rules.js',
      ['auto'],
      'BoardGameGeek'
    );
    
    this.log('\n🚀 All scrapers started! Beginning monitoring...');
    
    // Start monitoring
    this.monitorProgress();
  }
  
  /**
   * Restart a failed scraper
   */
  async restartScraper(scraperName) {
    const scraper = this.scrapers.find(s => s.name === scraperName);
    if (!scraper) return;
    
    if (scraper.status === 'failed' || scraper.status === 'error') {
      this.log(`🔄 Restarting ${scraperName} scraper...`);
      
      // Kill the old process if still running
      if (scraper.process && !scraper.process.killed) {
        scraper.process.kill();
      }
      
      // Remove from scrapers list
      const index = this.scrapers.indexOf(scraper);
      this.scrapers.splice(index, 1);
      
      // Restart based on scraper type
      if (scraperName === 'UltraBoardGames') {
        this.startScraper('scripts/scrape-ultrabg-rules.js', ['continuous'], 'UltraBoardGames');
      } else if (scraperName === 'BoardGameGeek') {
        this.startScraper('scripts/scrape-bgg-rules.js', ['auto'], 'BoardGameGeek');
      }
    }
  }
  
  /**
   * Shutdown all scrapers gracefully
   */
  async shutdown() {
    this.log('\n🛑 SHUTTING DOWN ORCHESTRATOR');
    this.isRunning = false;
    
    // Kill all scraper processes
    this.scrapers.forEach(scraper => {
      if (scraper.process && !scraper.process.killed) {
        this.log(`🛑 Stopping ${scraper.name} scraper...`);
        scraper.process.kill('SIGTERM');
      }
    });
    
    // Final stats
    const finalStats = await this.getStats();
    if (finalStats) {
      this.log('\n📊 FINAL STATISTICS');
      this.log(`📚 Games with rules: ${finalStats.gamesWithRules}/${finalStats.totalGames} (${finalStats.coverage}%)`);
      this.log(`📋 Total rules: ${finalStats.totalRules}`);
    }
    
    const totalTime = Math.floor((new Date() - this.startTime) / 1000 / 60);
    this.log(`⏰ Total runtime: ${totalTime} minutes`);
    this.log('🌅 Night scraping session completed!');
    
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run the orchestrator
if (require.main === module) {
  const orchestrator = new NightScraperOrchestrator();
  orchestrator.startAllScrapers().catch(error => {
    console.error('💥 Orchestrator error:', error);
    process.exit(1);
  });
}

module.exports = NightScraperOrchestrator;
