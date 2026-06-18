import urllib.request
import urllib.parse
import json
import sqlite3
import os

BASE_URL = "http://localhost:8000/api/v1"

def api_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req_data = None
    if data:
        if isinstance(data, dict) and "grant_type" in url or "login" in path:
            req_data = urllib.parse.urlencode(data).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            req_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
            
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = e.reason
        return e.code, err_body
    except Exception as e:
        return 500, str(e)

def get_token(username, password):
    code, res = api_request("/auth/login", "POST", {"username": username, "password": password})
    if code == 200:
        return res["access_token"]
    else:
        raise Exception(f"Login failed for {username}: {res}")

def main():
    print("--- Starting Backend API Integration Test ---")
    
    # 1. Login
    print("\n1. Logging in users...")
    pm_token = get_token("pmpm", "12345678")
    dev_token = get_token("dev1", "12345678")
    qa_token = get_token("qaqa", "12345678")
    print("Tokens retrieved successfully.")
    
    # 2. Project / Epic creation (via REST API generate, fallback to direct DB if LLM fails)
    print("\n2. Creating project and epics...")
    payload = {
        "project_name": "테스트 프로젝트 API",
        "prd_content": "# 요구명세\n- 사용자 로그인 기능 개발\n- 회원가입 기능 개발",
        "spec_content": "# 기능명세\n- 로그인 API 구현\n- 회원가입 API 구현"
    }
    code, res = api_request("/schedules/generate", "POST", payload, pm_token)
    project_id = None
    epic_id = None
    
    if code == 200:
        print("Schedule generation succeeded via LLM:")
        epics = res["epics"]
        if epics:
            project_id = epics[0]["project_id"]
            epic_id = epics[0]["id"]
            print(f"Project ID: {project_id}, Epic ID: {epic_id}")
    else:
        print(f"Schedule generation API failed/skipped: {res}. Falling back to direct database insertion...")
        # Direct DB seeding fallback
        db_path = "../backend/ai_pm.db"
        if not os.path.exists(db_path):
            db_path = "work/backend/ai_pm.db"
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Insert project
        cursor.execute("INSERT INTO projects (name, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))", ("테스트 프로젝트 API",))
        project_id = cursor.lastrowid
        
        # Insert epic
        cursor.execute("INSERT INTO epics (project_id, title, description, start_date, due_date, created_at, updated_at) VALUES (?, ?, ?, date('now'), date('now', '+7 days'), datetime('now'), datetime('now'))", 
                       (project_id, "테스트 에픽", "설명",))
        epic_id = cursor.lastrowid
        conn.commit()
        conn.close()
        print(f"Direct DB Seeding Success. Project ID: {project_id}, Epic ID: {epic_id}")

    # Verify project list
    code, projects = api_request("/projects", "GET", token=pm_token)
    print(f"Get Projects Code: {code}, Found {len(projects)} projects.")
    
    # Verify epic list
    code, epics = api_request(f"/epics?project_id={project_id}", "GET", token=pm_token)
    print(f"Get Epics Code: {code}, Found {len(epics)} epics.")
    
    # 3. Create ticket with QA options as PM
    print("\n3. Creating ticket with QA checkboxes...")
    ticket_payload = {
        "title": "로그인 기능 구현",
        "description": "FastAPI 백엔드 로그인 API 개발 및 연동",
        "status": "TO_DO",
        "priority": "P1",
        "project_id": project_id,
        "epic_id": epic_id,
        "assignee_id": 2,  # dev1
        "need_functional_qa": True,
        "functional_qa_title": "로그인시 올바른 토큰 반환 검증",
        "need_quality_qa": True,
        "quality_qa_title": "로그인 API 응답 속도 200ms 이하 검증"
    }
    code, ticket = api_request("/tickets/", "POST", ticket_payload, pm_token)
    assert code == 200, f"Failed to create ticket: {ticket}"
    ticket_id = ticket["id"]
    print(f"Ticket created successfully. ID: {ticket_id}")
    print(f"QA Items generated count: {len(ticket['qa_items'])}")
    for item in ticket["qa_items"]:
        print(f"  - QA Item ID: {item['id']}, Category: {item['category']}, Title: {item['title']}, Status: {item['status']}")
        
    # Get QA item IDs
    func_qa_item = next(item for item in ticket["qa_items"] if item["category"] == "FUNCTIONAL")
    qual_qa_item = next(item for item in ticket["qa_items"] if item["category"] == "QUALITY")
    
    # 4. RBAC Assignee Check: Developer dev1 tries to assign ticket to dev2 (User 3)
    print("\n4. Testing assignee RBAC rules...")
    # dev2 is user 3 (since pmpm is 1, dev1 is 2, dev2 is 3)
    code, res = api_request(f"/tickets/{ticket_id}", "PUT", {"assignee_id": 3}, dev_token)
    print(f"Dev assigning to another user Code (expect 403): {code}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    
    # dev1 assigns to self
    code, res = api_request(f"/tickets/{ticket_id}", "PUT", {"assignee_id": 2}, dev_token)
    print(f"Dev assigning to self Code (expect 200): {code}")
    assert code == 200, f"Expected 200, got {code}: {res}"
    
    # 5. Testing status DONE Hard Gate (QA items are UNTESTED, so must fail)
    print("\n5. Testing ticket DONE Hard Gate...")
    code, res = api_request(f"/tickets/{ticket_id}", "PUT", {"status": "DONE"}, dev_token)
    print(f"Moving to DONE with untested QA items Code (expect 400): {code}")
    assert code == 400, f"Expected 400, got {code}: {res}"
    
    # Update status to IN_PROGRESS (should work)
    code, res = api_request(f"/tickets/{ticket_id}", "PUT", {"status": "IN_PROGRESS"}, dev_token)
    print(f"Moving to IN_PROGRESS Code (expect 200): {code}")
    assert code == 200, f"Expected 200, got {code}: {res}"

    # 6. Testing QA testing RBAC rules
    print("\n6. Testing QA testing RBAC rules...")
    # Developer tries to mark QA item as PASS (expect 403)
    code, res = api_request(f"/qa/items/{func_qa_item['id']}", "PATCH", {"status": "PASS"}, dev_token)
    print(f"Developer testing QA item Code (expect 403): {code}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    
    # PM tries to mark QA item as PASS (expect 403)
    code, res = api_request(f"/qa/items/{func_qa_item['id']}", "PATCH", {"status": "PASS"}, pm_token)
    print(f"PM testing QA item Code (expect 403): {code}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    
    # QA marks QA item as PASS (expect 200)
    code, res = api_request(f"/qa/items/{func_qa_item['id']}", "PATCH", {"status": "PASS"}, qa_token)
    print(f"QA testing functional item as PASS Code (expect 200): {code}")
    assert code == 200, f"Expected 200, got {code}: {res}"
    
    # QA marks QA item as FAIL (expect 200)
    code, res = api_request(f"/qa/items/{func_qa_item['id']}", "PATCH", {"status": "FAIL"}, qa_token)
    print(f"QA testing functional item as FAIL Code (expect 200): {code}")
    assert code == 200, f"Expected 200, got {code}: {res}"
    
    # Set it back to PASS
    code, res = api_request(f"/qa/items/{func_qa_item['id']}", "PATCH", {"status": "PASS"}, qa_token)
    code, res = api_request(f"/qa/items/{qual_qa_item['id']}", "PATCH", {"status": "PASS"}, qa_token)
    print(f"QA marked both items as PASS.")

    # 7. Testing QA approval RBAC rules
    print("\n7. Testing QA approval RBAC rules...")
    # QA tries to approve (expect 403)
    code, res = api_request(f"/qa/items/{func_qa_item['id']}", "PATCH", {"status": "APPROVED"}, qa_token)
    print(f"QA approving QA item Code (expect 403): {code}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    
    # PM approves functional item (expect 200)
    code, res = api_request(f"/qa/items/{func_qa_item['id']}", "PATCH", {"status": "APPROVED"}, pm_token)
    print(f"PM approving functional item Code (expect 200): {code}")
    assert code == 200, f"Expected 200, got {code}: {res}"
    
    # Try moving to DONE now (only functional approved, quality still PASS - expect 400)
    code, res = api_request(f"/tickets/{ticket_id}", "PUT", {"status": "DONE"}, dev_token)
    print(f"Moving to DONE with only one approved QA item Code (expect 400): {code}")
    assert code == 400, f"Expected 400, got {code}: {res}"
    
    # PM approves quality item (expect 200)
    code, res = api_request(f"/qa/items/{qual_qa_item['id']}", "PATCH", {"status": "APPROVED"}, pm_token)
    print(f"PM approving quality item Code (expect 200): {code}")
    assert code == 200, f"Expected 200, got {code}: {res}"
    
    # 8. Final Ticket DONE transition (expect 200)
    print("\n8. Final Ticket DONE transition...")
    code, res = api_request(f"/tickets/{ticket_id}", "PUT", {"status": "DONE"}, dev_token)
    print(f"Moving to DONE with all QA items APPROVED Code (expect 200): {code}")
    assert code == 200, f"Expected 200, got {code}: {res}"
    print("Ticket status successfully changed to DONE!")
    
    print("\n--- ALL BACKEND TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    main()
