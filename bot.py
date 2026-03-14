"""
RIDE RANK — Telegram Bot entry point.
"""

import asyncio
import logging
import signal

from telegram.ext import Application, CommandHandler, CallbackQueryHandler

from app.config import BOT_TOKEN, ADMIN_CHAT_IDS, validate
from app import firebase_client as fb
from app.handlers import cmd_start, cmd_stats, cmd_reviews, cmd_banned, handle_callback
from app.listener import ReviewListener, run_polling

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    validate()
    fb.init()

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_start))
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("reviews", cmd_reviews))
    app.add_handler(CommandHandler("banned", cmd_banned))
    app.add_handler(CallbackQueryHandler(handle_callback))

    listener = ReviewListener(app.bot)
    shutdown_event = asyncio.Event()

    def _signal_handler():
        logger.info("Shutdown signal received")
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _signal_handler)

    async with app:
        await app.start()
        await app.updater.start_polling(drop_pending_updates=True)
        logger.info("RIDE RANK Bot started")

        for admin_id in ADMIN_CHAT_IDS:
            try:
                await app.bot.send_message(
                    admin_id,
                    "🚀 *RIDE RANK Bot запущен!*",
                    parse_mode="Markdown",
                )
            except Exception as e:
                logger.warning("Greeting not sent to %s: %s", admin_id, e)

        poll_task = asyncio.create_task(run_polling(listener))

        await shutdown_event.wait()

        poll_task.cancel()
        try:
            await poll_task
        except asyncio.CancelledError:
            pass

        await app.updater.stop()
        await app.stop()
        logger.info("RIDE RANK Bot stopped cleanly")


if __name__ == "__main__":
    asyncio.run(main())
