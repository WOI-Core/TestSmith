import os
import requests
import time
from dotenv import load_dotenv

# --- Configuration ---
# Load environment variables from the .env file in the project root
# The script will look for the .env file in the parent directory.
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# GitHub repository details
GITHUB_USER = "WOI-Core"
GITHUB_REPO = "woi-grader-archive"
START_PATH = "Camp2"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN") # Read the token from the environment

# Local directories relative to the script's location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
PROBLEMS_DIR = os.path.join(PROJECT_ROOT, "databases", "problems")
SOLUTIONS_DIR = os.path.join(PROJECT_ROOT, "databases", "solutions")
# --- End of Configuration ---

def download_file(url, headers, local_path):
    """Downloads a file from a URL and saves it to a local path."""
    try:
        # Use the same headers for downloading raw files
        response = requests.get(url, headers=headers, stream=True)
        response.raise_for_status()

        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"  -> Successfully saved as {os.path.basename(local_path)}")

    except requests.exceptions.RequestException as e:
        print(f"  -> ERROR downloading {url}: {e}")

def traverse_repo(repo_path, headers):
    """Recursively traverses a GitHub repository path, downloading and sorting files."""
    api_url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{repo_path}"

    try:
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()

        # You can optionally check the rate limit status
        if 'X-RateLimit-Remaining' in response.headers:
            print(f"(API Rate Limit Remaining: {response.headers['X-RateLimit-Remaining']})")

    except requests.exceptions.HTTPError as e:
        print(f"ERROR: Failed to fetch {api_url}. Status: {e.response.status_code}. Check your token and permissions.")
        return
    except requests.exceptions.RequestException as e:
        print(f"ERROR: A network error occurred: {e}")
        return

    contents = response.json()
    if not isinstance(contents, list):
        contents = [contents]

    for item in contents:
        if item['type'] == 'dir':
            print(f"Scanning directory: {item['path']}...")
            traverse_repo(item['path'], headers)

        elif item['type'] == 'file':
            file_name = item['name']
            unique_name = item['path'].replace('/', '_')
            unique_name = unique_name.split("_")[-1]

            if file_name.endswith('.pdf'):
                print(f"Found PDF: {item['path']}")
                local_path = os.path.join(PROBLEMS_DIR, unique_name)
                download_file(item['download_url'], headers, local_path)

            elif file_name.endswith('.cpp'):
                print(f"Found C++ Solution: {item['path']}")
                unique_name_txt = unique_name.rsplit('.', 1)[0] + '.txt'
                local_path = os.path.join(SOLUTIONS_DIR, unique_name_txt)
                download_file(item['download_url'], headers, local_path)

def main():
    """Main function to set up and start the download."""
    print("Starting authenticated download process...")

    if not GITHUB_TOKEN:
        print("ERROR: GITHUB_TOKEN not found.")
        print("Please ensure you have a .env file in the project root with your GitHub Personal Access Token.")
        return

    # Set up the headers for all API requests
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}"
    }

    os.makedirs(PROBLEMS_DIR, exist_ok=True)
    os.makedirs(SOLUTIONS_DIR, exist_ok=True)

    print("-" * 50)
    traverse_repo(START_PATH, headers)
    print("-" * 50)
    print("Process finished.")

if __name__ == "__main__":
    main()
