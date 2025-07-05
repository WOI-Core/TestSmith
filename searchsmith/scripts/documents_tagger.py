# scripts/documents_setup.py
import sys
import os
from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser

# This is a common pattern to make the search_smith package importable
# when running scripts from the 'scripts' directory.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Import from your new, modularized package
from search_smith import config, get_huggingface_llm, load_prompt_template, create_langchain_json  # noqa: E402

def main():
    """
    Main function to run the document tagging process.
    """
    # Load environment variables from .env file (for HF_TOKEN)
    load_dotenv()

    print("🚀 Starting document setup...")

    # 1. Initialize the Language Model from the handler
    llm = get_huggingface_llm(
        model_name=config.HF_MODEL_NAME
    )
    # 2. Load the prompt template from the handler
    prompt_template = load_prompt_template(
        prompt_file_path=config.PROMPT_FILE_PATH
    )

    # 3. Create the LangChain Chain (LCEL)
    chain = prompt_template | llm | StrOutputParser()

    # 4. Process solution files to create a JSON file for the vector database.
    # This now only uses the solutions directory as input for tagging.
    create_langchain_json(
        solutions_dir=config.SOLUTIONS_DIR,
        output_path=config.DOCUMENTS_JSON_PATH,
        chain=chain,
        file_limit=None  # Set a number to limit files for testing, e.g., 10
    )

if __name__ == "__main__":
    main()
