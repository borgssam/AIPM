import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_flow():
    print("--- 1. Logging in as pmpm ---")
    login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": "pmpm", "password": "12345678"})
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful! Token acquired.")

    print("\n--- 2. Generating a project schedule ---")
    gen_res = requests.post(f"{BASE_URL}/schedules/generate", json={
        "project_name": "테스트 프로젝트",
        "prd_content": "일정 관리용 명세 기획",
        "spec_content": "칸반 보드에서 담당자 지정 및 변경"
    }, headers=headers)
    if gen_res.status_code != 200:
        print("Schedule generation failed:", gen_res.text)
        return
    gen_data = gen_res.json()
    tickets = gen_data["tickets"]
    print(f"Generated {len(tickets)} tickets successfully.")
    
    if not tickets:
        print("No tickets generated, cannot proceed.")
        return
        
    test_ticket = tickets[0]
    print(f"Selecting first ticket: ID={test_ticket['id']}, Title={test_ticket['title']}, Status={test_ticket['status']}")

    print("\n--- 3. Fetching users to find dev1 ---")
    users_res = requests.get(f"{BASE_URL}/users/", headers=headers)
    if users_res.status_code != 200:
        print("Failed to fetch users:", users_res.text)
        return
    users = users_res.json()
    dev1 = next((u for u in users if u["username"] == "dev1"), None)
    if not dev1:
        print("User 'dev1' not found in database.")
        return
    print(f"Found user 'dev1' with ID={dev1['id']}, Name={dev1['name']}")

    print(f"\n--- 4. Updating ticket {test_ticket['id']} (assignee_id={dev1['id']}, status='IN_PROGRESS') ---")
    update_res = requests.put(f"{BASE_URL}/tickets/{test_ticket['id']}", json={
        "assignee_id": dev1["id"],
        "status": "IN_PROGRESS"
    }, headers=headers)
    if update_res.status_code != 200:
        print("Ticket update failed:", update_res.text)
        return
    
    updated_ticket = update_res.json()
    print("Update Response Status:", update_res.status_code)
    print("Updated Ticket data:")
    print("  - Title:", updated_ticket["title"])
    print("  - Status:", updated_ticket["status"])
    print("  - Assignee ID:", updated_ticket["assignee_id"])
    print("  - Assignee:", updated_ticket.get("assignee"))

    assert updated_ticket["status"] == "IN_PROGRESS", "Status update failed!"
    assert updated_ticket["assignee_id"] == dev1["id"], "Assignee ID update failed!"
    assert updated_ticket["assignee"] is not None, "Assignee relation is not loaded!"
    assert updated_ticket["assignee"]["name"] == "개발자1", "Assignee name mismatch!"
    
    print("\nSuccess: Flow verification PASSED successfully!")

if __name__ == "__main__":
    test_flow()
