const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;

const prisma = new PrismaClient();

/**
 * Rules Expansion Strategy
 * Comprehensive plan to maximize game rules coverage
 */
class RulesExpansionStrategy {
  constructor() {
    this.strategies = [];
    this.priorityGames = [];
    this.sources = [];
  }

  /**
   * Analyze current coverage and identify gaps
   */
  async analyzeCurrentCoverage() {
    console.log('📊 ANALYZING CURRENT RULES COVERAGE');
    console.log('='.repeat(50));

    const totalGames = await prisma.game.count();
    const gamesWithRules = await prisma.game.count({
      where: { rules: { some: {} } }
    });
    const gamesWithImages = await prisma.game.count({
      where: { image: { not: null } }
    });
    const totalRules = await prisma.gameRule.count();

    const coverage = ((gamesWithRules / totalGames) * 100).toFixed(1);
    const imageCoverage = ((gamesWithImages / totalGames) * 100).toFixed(1);

    console.log(`📚 Total games in database: ${totalGames}`);
    console.log(`📋 Games with rules: ${gamesWithRules} (${coverage}%)`);
    console.log(`🖼️ Games with images: ${gamesWithImages} (${imageCoverage}%)`);
    console.log(`📖 Total rule entries: ${totalRules}`);
    console.log(`🎯 Games needing rules: ${totalGames - gamesWithRules}`);

    return {
      totalGames,
      gamesWithRules,
      gamesWithoutRules: totalGames - gamesWithRules,
      coverage: parseFloat(coverage),
      imageCoverage: parseFloat(imageCoverage),
      totalRules
    };
  }

  /**
   * Identify high-priority games for rule scraping
   */
  async identifyPriorityGames() {
    console.log('\n🎯 IDENTIFYING HIGH-PRIORITY GAMES');
    console.log('='.repeat(50));

    // Get popular games without rules (by user rating and votes)
    const popularGames = await prisma.game.findMany({
      where: {
        rules: { none: {} },
        OR: [
          { userRating: { gte: 7.0 } },
          { userVotes: { gte: 100 } },
          { bggId: { not: null } }
        ]
      },
      orderBy: [
        { userRating: 'desc' },
        { userVotes: 'desc' },
        { yearRelease: 'desc' }
      ],
      take: 100,
      select: {
        id: true,
        name: true,
        nameEn: true,
        nameEs: true,
        userRating: true,
        userVotes: true,
        yearRelease: true,
        bggId: true
      }
    });

    console.log(`🔥 Found ${popularGames.length} high-priority games without rules:`);
    popularGames.slice(0, 10).forEach((game, i) => {
      console.log(`  ${i + 1}. ${game.name || game.nameEn} (Rating: ${game.userRating}, Users: ${game.userVotes})`);
    });

    this.priorityGames = popularGames;
    return popularGames;
  }

  /**
   * Define expansion strategies
   */
  defineExpansionStrategies() {
    console.log('\n🚀 RULES EXPANSION STRATEGIES');
    console.log('='.repeat(50));

    this.strategies = [
      {
        name: 'UltraBoardGames Enhanced',
        description: 'Expand UBG scraping with more game variants and better matching',
        priority: 1,
        estimatedGames: 200,
        implementation: 'Improve game name matching, add more game slugs, handle variants'
      },
      {
        name: 'BoardGameGeek Files',
        description: 'Download PDF rules and reference sheets from BGG',
        priority: 2,
        estimatedGames: 150,
        implementation: 'Parse BGG file sections, download PDFs, extract text content'
      },
      {
        name: 'BGG Game Pages',
        description: 'Scrape rules summaries from BGG game description pages',
        priority: 3,
        estimatedGames: 500,
        implementation: 'Parse BGG game pages for rules sections and summaries'
      },
      {
        name: 'Wikipedia Rules',
        description: 'Extract rules from Wikipedia game articles',
        priority: 4,
        estimatedGames: 100,
        implementation: 'Search Wikipedia, extract rules sections, clean content'
      },
      {
        name: 'Publisher Websites',
        description: 'Scrape rules from official publisher websites',
        priority: 5,
        estimatedGames: 300,
        implementation: 'Identify publishers, scrape official rule PDFs and pages'
      },
      {
        name: 'YouTube Rules Videos',
        description: 'Extract rules from "How to Play" YouTube videos',
        priority: 6,
        estimatedGames: 200,
        implementation: 'Use YouTube API, transcript extraction, rules summarization'
      },
      {
        name: 'Community Contributions',
        description: 'Allow users to submit and curate game rules',
        priority: 7,
        estimatedGames: 1000,
        implementation: 'Build submission system, moderation tools, user ratings'
      }
    ];

    this.strategies.forEach((strategy, i) => {
      console.log(`${i + 1}. ${strategy.name}`);
      console.log(`   📝 ${strategy.description}`);
      console.log(`   🎯 Est. games: ${strategy.estimatedGames}`);
      console.log(`   ⚙️ ${strategy.implementation}\n`);
    });

    return this.strategies;
  }

  /**
   * Identify additional rule sources
   */
  identifyRuleSources() {
    console.log('\n📚 ADDITIONAL RULE SOURCES');
    console.log('='.repeat(50));

    this.sources = [
      {
        name: 'UltraBoardGames',
        url: 'https://ultraboardgames.com',
        status: 'Active',
        coverage: '156 games scraped',
        quality: 'High - formatted HTML with images'
      },
      {
        name: 'BoardGameGeek',
        url: 'https://boardgamegeek.com',
        status: 'Partial',
        coverage: 'BGG IDs available for most games',
        quality: 'Varies - PDFs and user content'
      },
      {
        name: 'Rules of Play',
        url: 'https://www.rulesofplay.co.uk',
        status: 'Potential',
        coverage: 'UK-focused game rules',
        quality: 'Good - clean rule summaries'
      },
      {
        name: 'Dice Tower Reviews',
        url: 'https://www.dicetower.com',
        status: 'Potential',
        coverage: 'Popular game reviews with rules',
        quality: 'Medium - video transcripts'
      },
      {
        name: 'Publisher Sites',
        url: 'Various',
        status: 'Manual',
        coverage: 'Official rules for specific publishers',
        quality: 'High - authoritative sources'
      },
      {
        name: 'Reddit r/boardgames',
        url: 'https://reddit.com/r/boardgames',
        status: 'Community',
        coverage: 'User-generated rule summaries',
        quality: 'Variable - needs moderation'
      }
    ];

    this.sources.forEach(source => {
      console.log(`📖 ${source.name}`);
      console.log(`   🌐 ${source.url}`);
      console.log(`   📊 Status: ${source.status}`);
      console.log(`   📈 Coverage: ${source.coverage}`);
      console.log(`   ⭐ Quality: ${source.quality}\n`);
    });

    return this.sources;
  }

  /**
   * Generate action plan
   */
  generateActionPlan() {
    console.log('\n📋 IMMEDIATE ACTION PLAN');
    console.log('='.repeat(50));

    const actions = [
      {
        action: 'Fix and restart scrapers',
        priority: 'URGENT',
        timeframe: 'Now',
        description: 'Fix syntax errors in BGG and orchestrator scripts'
      },
      {
        action: 'Expand UltraBoardGames coverage',
        priority: 'HIGH',
        timeframe: '1-2 days',
        description: 'Add more game slugs, improve name matching, handle variants'
      },
      {
        action: 'Implement BGG PDF scraper',
        priority: 'HIGH',
        timeframe: '2-3 days',
        description: 'Download and parse rule PDFs from BGG file sections'
      },
      {
        action: 'Create BGG page scraper',
        priority: 'MEDIUM',
        timeframe: '3-5 days',
        description: 'Extract rules from BGG game description pages'
      },
      {
        action: 'Build publisher scraper',
        priority: 'MEDIUM',
        timeframe: '1 week',
        description: 'Identify major publishers and scrape their rule PDFs'
      },
      {
        action: 'Implement community system',
        priority: 'LOW',
        timeframe: '2-3 weeks',
        description: 'Allow user rule submissions with moderation'
      }
    ];

    actions.forEach((action, i) => {
      console.log(`${i + 1}. ${action.action}`);
      console.log(`   🚨 Priority: ${action.priority}`);
      console.log(`   ⏰ Timeframe: ${action.timeframe}`);
      console.log(`   📝 ${action.description}\n`);
    });

    return actions;
  }

  /**
   * Run complete analysis
   */
  async runCompleteAnalysis() {
    const coverage = await this.analyzeCurrentCoverage();
    const priorityGames = await this.identifyPriorityGames();
    const strategies = this.defineExpansionStrategies();
    const sources = this.identifyRuleSources();
    const actionPlan = this.generateActionPlan();

    console.log('\n🎯 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Current coverage: ${coverage.coverage}% (${coverage.gamesWithRules}/${coverage.totalGames})`);
    console.log(`Priority games identified: ${priorityGames.length}`);
    console.log(`Expansion strategies: ${strategies.length}`);
    console.log(`Rule sources: ${sources.length}`);
    console.log(`Action items: ${actionPlan.length}`);

    const potentialGames = strategies.reduce((sum, s) => sum + s.estimatedGames, 0);
    const projectedCoverage = ((coverage.gamesWithRules + potentialGames) / coverage.totalGames * 100).toFixed(1);
    
    console.log(`\n📈 PROJECTION:`);
    console.log(`Potential additional games: ${potentialGames}`);
    console.log(`Projected coverage: ${projectedCoverage}%`);

    return {
      coverage,
      priorityGames,
      strategies,
      sources,
      actionPlan,
      projection: {
        potentialGames,
        projectedCoverage: parseFloat(projectedCoverage)
      }
    };
  }
}

// Run the analysis
if (require.main === module) {
  const strategy = new RulesExpansionStrategy();
  strategy.runCompleteAnalysis()
    .then(() => {
      console.log('\n✅ Analysis complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = RulesExpansionStrategy;
