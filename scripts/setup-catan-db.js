const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function setupCatanDatabase() {
  try {
    console.log('🚀 Setting up Catan nominations database...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/create_catan_nominations_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
        await sql`${sql.raw(statement)}`;
      }
    }
    
    console.log('✅ Catan nominations database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupCatanDatabase();
}

module.exports = { setupCatanDatabase };
