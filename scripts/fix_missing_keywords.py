"""
Fix missing keywords - improved version
Handles different JSON formats
"""

import json
import psycopg2
import os
from pathlib import Path

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://similarhub_user:similarhub_pass@db:5432/similarhub_db')

def parse_categorized_keywords(categorized_data):
    """Convert various formats to single dict"""
    if isinstance(categorized_data, dict):
        return categorized_data
    
    if isinstance(categorized_data, list):
        result = {}
        for item in categorized_data:
            if isinstance(item, dict):
                result.update(item)
            elif isinstance(item, str):
                # Skip strings
                continue
        return result
    
    return {}

def find_json_file(results_dir, title):
    """Find JSON file for a show title"""
    # Try exact match first
    title_slug = title.lower().replace(' ', '_').replace("'", '').replace(':', '')
    
    patterns = [
        f"*{title_slug}*.json",
        f"*{title.lower().replace(' ', '_')}*.json",
        f"*{title.lower().replace(' ', '')}*.json"
    ]
    
    for pattern in patterns:
        files = list(results_dir.glob(pattern))
        if files:
            return files[0]
    
    return None

def main():
    conn = psycopg2.connect(DATABASE_URL)
    
    # Find shows with empty keywords (excluding Dexter)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, title 
            FROM media_items 
            WHERE (keywords_json IS NULL OR keywords_json::text = '{}')
              AND title != 'Dexter'
            ORDER BY title
        """)
        empty_shows = cur.fetchall()
    
    print(f"Found {len(empty_shows)} shows with empty keywords (excluding Dexter)\n")
    
    results_dir = Path('/app/results')
    fixed = 0
    skipped = 0
    
    for show_id, title in empty_shows:
        json_file = find_json_file(results_dir, title)
        
        if not json_file:
            print(f"❌ No file: {title}")
            skipped += 1
            continue
        
        print(f"📄 {title}")
        print(f"   File: {json_file.name}")
        
        try:
            with open(json_file) as f:
                data = json.load(f)
            
            # Extract keywords
            llm_outputs = data.get('llm_outputs', {})
            llm_response = None
            
            for provider in llm_outputs.values():
                if 'response' in provider:
                    llm_response = provider['response']
                    break
            
            if not llm_response:
                print(f"   ⚠️  No LLM response\n")
                skipped += 1
                continue
            
            categorized = llm_response.get('categorized_keywords')
            if not categorized:
                print(f"   ⚠️  No categorized_keywords\n")
                skipped += 1
                continue
            
            # Parse keywords (handle different formats)
            keywords = parse_categorized_keywords(categorized)
            
            if not keywords:
                print(f"   ⚠️  Empty keywords after parsing\n")
                skipped += 1
                continue
            
            # Update database
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE media_items SET keywords_json = %s::jsonb WHERE id = %s",
                    (json.dumps(keywords), show_id)
                )
            conn.commit()
            
            print(f"   ✅ Fixed ({len(keywords)} categories)\n")
            fixed += 1
            
        except Exception as e:
            print(f"   ❌ Error: {e}\n")
            skipped += 1
    
    print(f"="*50)
    print(f"✅ Fixed: {fixed}/{len(empty_shows)}")
    print(f"⚠️  Skipped: {skipped}/{len(empty_shows)}")
    conn.close()

if __name__ == "__main__":
    main()
