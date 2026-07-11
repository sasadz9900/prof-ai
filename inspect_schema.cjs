const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}\\s*=\\s*"?([^"\\n\\r]+)`));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

async function inspectColumns() {
  // Try HEAD request to get column info
  const tables = ['profiles', 'sessions'];
  
  for (const table of tables) {
    console.log(`\n=== ${table} columns ===`);
    
    // Insert a dummy to see what columns exist via error messages
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    // Try to detect columns by requesting them individually
    const commonCols = [
      'id', 'user_id', 'full_name', 'grade_level', 'math_average', 'track_id',
      'created_at', 'updated_at', 'email', 'name', 'title', 'description',
      'subject_id', 'lesson_id', 'status', 'order_index', 'is_core',
      'session_id', 'data', 'type', 'topic', 'content'
    ];
    
    const existingCols = [];
    for (const col of commonCols) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${col}&limit=0`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });
      if (r.ok) {
        existingCols.push(col);
      }
    }
    console.log(`  Detected columns: ${existingCols.join(', ')}`);
  }
}

inspectColumns().catch(console.error);
