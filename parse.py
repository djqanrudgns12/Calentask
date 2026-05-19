import json

try:
    with open('C:/Users/rudgn/.gemini/antigravity/brain/8f53b3bc-00e7-4ea5-8e39-094710926eeb/.system_generated/steps/613/output.txt', encoding='utf-8') as f:
        data = json.load(f)
    for p in data.get('projects', []):
        print(f"{p.get('name')}: {p.get('title')}")
except Exception as e:
    print(f"Error: {e}")
