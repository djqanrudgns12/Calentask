import json
import sys

def parse_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        screens = data.get('screens', [])
        for screen in screens:
            name = screen.get('name')
            title = screen.get('title')
            # The preview image URL might be somewhere in the object, maybe 'previewUrl' or 'screenshotUri'
            preview = screen.get('screenshotUri') or screen.get('previewUrl') or screen.get('thumbnailUri')
            if not preview and 'urls' in screen:
                preview = screen['urls'].get('preview')
            print(f"Name: {name}, Title: {title}, Image: {preview}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parse_file(r"C:\Users\rudgn\.gemini\antigravity-ide\brain\0557db56-f9b1-4c94-8170-fa11bfdf23e6\.system_generated\steps\147\output.txt")
