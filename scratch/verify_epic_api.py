import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:8000/api/v1"

def api_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req_data = None
    if data:
        if isinstance(data, dict) and ("grant_type" in url or "login" in path):
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
        raise Exception(f"Login failed: {res}")

def main():
    print("--- Starting Epic API Verification ---")
    pm_token = get_token("pmpm", "12345678")
    dev_token = get_token("dev1", "12345678")
    
    # Get first project ID
    code, projects = api_request("/projects", "GET", token=pm_token)
    if not projects:
        print("No project found. Run verify_apis.py first to seed a project.")
        return
    project_id = projects[0]["id"]
    print(f"Project ID found: {project_id}")
    
    # 1. Developer tries to create an epic (Expect 403)
    print("\n1. Testing RBAC: Developer tries to create an Epic...")
    epic_payload = {
        "project_id": project_id,
        "title": "개발자 생성 에픽 시도",
        "description": "이 요청은 403 Forbidden이어야 합니다.",
        "start_date": "2026-06-20",
        "due_date": "2026-06-25"
    }
    code, res = api_request("/epics/", "POST", epic_payload, dev_token)
    print(f"Response Code: {code}")
    print(f"Response Body: {res}")
    assert code == 403, f"Expected 403, got {code}"
    print("RBAC check PASSED!")
    
    # 2. PM creates an epic (Expect 200)
    print("\n2. Testing PM Epic Creation...")
    pm_epic_payload = {
        "project_id": project_id,
        "title": "PM 생성 수동 에픽",
        "description": "PM이 수동으로 에픽 일정을 생성했습니다.",
        "start_date": "2026-06-20",
        "due_date": "2026-06-25"
    }
    code, res = api_request("/epics/", "POST", pm_epic_payload, pm_token)
    print(f"Response Code: {code}")
    print(f"Response Body: {res}")
    assert code == 200, f"Expected 200, got {code}"
    epic_id = res["id"]
    print(f"PM Epic Creation PASSED! Created Epic ID: {epic_id}")
    
    # 3. Verify epic list updated
    code, epics = api_request(f"/epics?project_id={project_id}", "GET", token=pm_token)
    print(f"\n3. Get Epics Code: {code}, Found {len(epics)} epics.")
    created_epic = next((e for e in epics if e["id"] == epic_id), None)
    assert created_epic is not None, "Created epic not found in the list!"
    print(f"Found created epic in the list: {created_epic['title']} ({created_epic['start_date']} ~ {created_epic['due_date']})")
    print("\n--- ALL EPIC API TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    main()
