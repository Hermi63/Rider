"""
RIDE RANK — Configuration.
All settings loaded from environment variables.
"""

import os
import sys
import logging

logger = logging.getLogger(__name__)

BOT_TOKEN: str = os.environ.get("BOT_TOKEN", "")
CHANNEL_ID: str = os.environ.get("CHANNEL_ID", "")
ADMIN_IDS_STR: str = os.environ.get("ADMIN_IDS", "")
FIREBASE_DB_URL: str = os.environ.get("FIREBASE_DB_URL", "")
FIREBASE_KEY_B64: str = os.environ.get("FIREBASE_KEY_B64", "")
FIREBASE_KEY_JSON: str = os.environ.get("FIREBASE_KEY_JSON", "")

ADMIN_CHAT_IDS: list[int] = (
    [int(x.strip()) for x in ADMIN_IDS_STR.split(",") if x.strip()]
    if ADMIN_IDS_STR else []
)

REVIEW_POLL_INTERVAL: int = int(os.environ.get("REVIEW_POLL_INTERVAL", "15"))


def validate() -> None:
    """Exit early if required env vars are missing."""
    missing = []
    if not BOT_TOKEN:
        missing.append("BOT_TOKEN")
    if not FIREBASE_DB_URL:
        missing.append("FIREBASE_DB_URL")
    if not FIREBASE_KEY_B64 and not FIREBASE_KEY_JSON and not os.path.exists("firebase-key.json"):
        missing.append("FIREBASE_KEY_B64 or FIREBASE_KEY_JSON (or firebase-key.json file)")
    if missing:
        logger.critical("Missing required env vars: %s", ", ".join(missing))
        sys.exit(1)
    if not ADMIN_CHAT_IDS:
        logger.warning("ADMIN_IDS is empty — no admins will receive notifications")
    if not CHANNEL_ID:
        logger.warning("CHANNEL_ID is empty — channel publishing disabled")
