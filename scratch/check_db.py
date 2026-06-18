import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "work", "backend"))

from database import SessionLocal
import models

db = SessionLocal()
try:
    with open("db_output.txt", "w", encoding="utf-8") as f:
        f.write("=== USERS ===\n")
        users = db.query(models.User).all()
        for u in users:
            f.write(f"ID: {u.id}, Username: {u.username}, Name: {u.name}, Role: {u.role}\n")

        f.write("\n=== TICKETS ===\n")
        tickets = db.query(models.KanbanTicket).all()
        for t in tickets:
            f.write(f"ID: {t.id}, Title: {t.title}, Status: {t.status}, Start: {t.start_date}, Due: {t.due_date}\n")
    print("Successfully wrote db_output.txt")
finally:
    db.close()
