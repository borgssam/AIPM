import sys
import os
import json

# work/backend 디렉토리를 파이썬 경로에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "work", "backend"))

import llm_service

prd_english = """
Product Requirement Document (PRD):
1. User Authentication System:
- Users must be able to sign up with their email and password.
- Passwords must be encrypted using bcrypt.
- The system should issue a JWT token upon successful login.
- Access token should expire in 1 hour.
"""

spec_english = """
Functional Specification:
1. Signup Endpoint:
- Method: POST
- Path: /api/v1/auth/signup
- Request Body: { "email": "string", "password": "string", "name": "string", "role": "string" }
- Response: 201 Created on success, 400 Bad Request on validation failure.
- Role option mismatch: The PM role is not defined in spec, only 'admin' and 'user'. (This will clash with PRD setting).
"""

def test():
    print("Starting LLM specification analysis with English input...")
    result = llm_service.analyze_specifications(
        prd_content=prd_english,
        spec_content=spec_english,
        existing_api_spec="GET /api/v1/users/me (Returns user details)",
        existing_db_schema="CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, password_hash TEXT)"
    )
    print("\n[RESULT JSON]")
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    test()
