import sqlite3
import os

db_path = "work/backend/ai_pm.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name, prd_content, spec_content FROM projects")
        rows = cursor.fetchall()
        print(f"Projects found: {len(rows)}")
        for r in rows:
            print(f"Name: {r[0]}")
            print(f"PRD Content: {r[1][:50] if r[1] else None}...")
            print(f"Spec Content: {r[2][:50] if r[2] else None}...")
            print("-" * 20)
    except Exception as e:
        print(f"Error querying DB: {e}")
    finally:
        conn.close()
else:
    print("DB file not found")
