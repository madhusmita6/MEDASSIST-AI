import chromadb
from app.config import settings
from app.logging import logger

def get_chroma_client():
    """
    Initializes and returns a connection client to ChromaDB container.
    Gracefully logs warnings if client connections fail on initialization.
    """
    try:
        logger.info(f"Connecting to ChromaDB at {settings.CHROMA_HOST}:{settings.CHROMA_PORT}...")
        client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT
        )
        # Verify connection viability
        client.heartbeat()
        logger.info("ChromaDB heartbeat confirmed.")
        return client
    except Exception as e:
        logger.error(f"Failed to connect to ChromaDB: {str(e)}. Initializing transient Ephemeral Client...", exc_info=True)
        # Fallback to in-memory client for testing or isolated environments
        return chromadb.EphemeralClient()

chroma_client = get_chroma_client()
