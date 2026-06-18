import urllib.request
import json

try:
    with urllib.request.urlopen("http://localhost:8000/health") as response:
        html = response.read().decode('utf-8')
        data = json.loads(html)
        print("Backend is running:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error accessing backend: {e}")
