"""
RIDE RANK — New review polling listener.
"""

import asyncio
import logging

from telegram import Bot

from app.config import ADMIN_CHAT_IDS, REVIEW_POLL_INTERVAL
from app import firebase_client as fb
from app.formatting import fmt_review
from app.handlers import make_keyboard

logger = logging.getLogger(__name__)


class ReviewListener:
    def __init__(self, bot: Bot):
        self.bot = bot
        self.known_ids: set[str] = set()
        try:
            existing = fb.get_reviews()
            self.known_ids = set(existing.keys())
            logger.info("Loaded %d existing reviews", len(self.known_ids))
        except Exception as e:
            logger.error("Error initializing listener: %s", e)

    async def check(self) -> None:
        try:
            reviews = fb.get_reviews()
            drivers = fb.get_drivers()
            for rid, rev in reviews.items():
                if rid in self.known_ids:
                    continue
                self.known_ids.add(rid)
                driver = drivers.get(rev.get("driverId", ""), {})
                text = fmt_review(rev, driver)
                kbd = make_keyboard(rid, rev.get("reviewer", "?"))
                for admin_id in ADMIN_CHAT_IDS:
                    try:
                        await self.bot.send_message(
                            chat_id=admin_id,
                            text=text,
                            parse_mode="Markdown",
                            reply_markup=kbd,
                        )
                    except Exception as e:
                        logger.error("Notification error for %s: %s", admin_id, e)
        except Exception as e:
            logger.error("Polling check error: %s", e)


async def run_polling(listener: ReviewListener) -> None:
    while True:
        await listener.check()
        await asyncio.sleep(REVIEW_POLL_INTERVAL)
