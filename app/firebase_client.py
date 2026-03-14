"""
RIDE RANK — Firebase initialization and data helpers.
"""

import base64
import json
import logging
import os

import firebase_admin
from firebase_admin import credentials, db as fdb

from app.config import FIREBASE_DB_URL, FIREBASE_KEY_B64, FIREBASE_KEY_JSON

logger = logging.getLogger(__name__)


def init() -> None:
    if firebase_admin._apps:
        return

    if FIREBASE_KEY_JSON:
        key_dict = json.loads(FIREBASE_KEY_JSON)
        cred = credentials.Certificate(key_dict)
        logger.info("Firebase: key from FIREBASE_KEY_JSON")
    elif FIREBASE_KEY_B64:
        raw = base64.b64decode(FIREBASE_KEY_B64.strip()).decode("utf-8")
        key_dict = json.loads(raw)
        cred = credentials.Certificate(key_dict)
        logger.info("Firebase: key from FIREBASE_KEY_B64")
    elif os.path.exists("firebase-key.json"):
        cred = credentials.Certificate("firebase-key.json")
        logger.info("Firebase: key from file")
    else:
        raise RuntimeError("No Firebase credentials found")

    firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_DB_URL})


def ref(path: str):
    return fdb.reference(path)


def get_reviews() -> dict:
    return ref("reviews").get() or {}


def get_drivers() -> dict:
    return ref("drivers").get() or {}


def get_banned() -> dict:
    return ref("banned").get() or {}
