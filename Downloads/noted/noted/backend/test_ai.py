import requests

def test_api():
    base_url = "http://127.0.0.1:5000/api"
    
    # 1. Provide credentials
    creds = {"name": "Test User", "email": "ai_test3@example.com", "password": "password123"}
    
    # 2. Register (ignore if already registered)
    requests.post(f"{base_url}/auth/register", json=creds)
    
    # 3. Login
    login_res = requests.post(f"{base_url}/auth/login", json=creds)
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
        
    token = login_res.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}
    
    # 4. Create a connection using AI
    conn_data = {
        "name": "Jane Smith",
        "role": "Lead Investor",
        "company": "SeedFund VC",
        "event": "Startup Pitch Day",
        "transcript": "Hi Jane, it was great meeting you. I'm looking for pre-seed funding for my new AI startup. We're also hiring a few developers.",
        "reminder": "2026-04-10"
    }
    
    print("Sending request to create connection...")
    conn_res = requests.post(f"{base_url}/connections", json=conn_data, headers=headers)
    
    print(f"Status: {conn_res.status_code}")
    try:
        data = conn_res.json()
        print("Response:", data)
        print("Tags:", data.get('tags'))
        print("Summary:", data.get('aiSummary'))
        print("Intent:", data.get('intent'))
    except Exception as e:
        print("Failed to decode JSON:", conn_res.text)

if __name__ == "__main__":
    test_api()
