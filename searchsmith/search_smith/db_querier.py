# search_smith/db_querier.py
import os
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from . import config
from dotenv import load_dotenv

def get_retriever():
    """
    Loads the Vector Store and returns a retriever.
    """

    load_dotenv()

    HF_TOKEN = os.environ['HF_TOKEN']

    if not os.path.exists(config.VECTOR_STORE_PATH):
        print(f"❌ Database not found at '{config.VECTOR_STORE_PATH}'")
        print("Please run 'create_database.py' first.")
        return None

    print("Loading Vector Store and Embedding Model...")
    try:
        # Use the model name from your config file
        model = config.EMBEDDING_MODEL_NAME

        embeddings = HuggingFaceEndpointEmbeddings(
            model=model,
            task="feature-extraction",
            huggingfacehub_api_token= HF_TOKEN,
        )

        vector_store = Chroma(
            persist_directory=str(config.VECTOR_STORE_PATH),
            embedding_function=embeddings
        )
        retriever = vector_store.as_retriever(search_kwargs=config.SEARCH_KWARGS)
        print("✅ Successfully loaded.")
        return retriever
    except Exception as e:
        print(f"❌ Error loading Vector Store: {e}")
        return None

def recommend_problems(retriever, query: str):
    """
    Takes a retriever and a query, then prints recommended problems.
    """
    print(f"\n🔎 Searching for: '{query}'")
    relevant_docs = retriever.invoke(query)

    if not relevant_docs:
        print("No matching problems found.")
        return

    print(f"\n✨ Found {len(relevant_docs)} recommended problems:\n")
    for i, doc in enumerate(relevant_docs):
        problem_name = doc.metadata.get('problem_name', 'N/A')
        tags = doc.metadata.get('tags', 'N/A')
        full_content = doc.page_content
        display_content = full_content.split("\n---\n", 1)[1] if "\n---\n" in full_content else full_content

        print(f"--- Result {i+1}: {problem_name} ---")
        print(f"  Tags: {tags}")
        print(f"  Content: {display_content[:200]}...") # Display a snippet
        print("-" * (len(problem_name) + 14))

def recommend_problems_api(retriever, query: str):
    """
    Takes a retriever and a query, then returns a list of recommended problem names.
    """
    print(f"\n🔎 Searching for: '{query}'")
    relevant_docs = retriever.invoke(query)

    if not relevant_docs:
        return []

    recommended_problems = []
    for doc in relevant_docs:
        problem_name = doc.metadata.get('problem_name', 'N/A')
        recommended_problems.append(problem_name)

    return recommended_problems
