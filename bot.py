"""
╔══════════════════════════════════════════════════════════════╗
║  RIDE RANK — Telegram Бот (Firebase only, без Sheets)        ║
║                                                              ║
║  Что делает:                                                 ║
║  • Уведомляет о новых отзывах с кнопками модерации          ║
║  • Удаляет отзывы из Firebase                               ║
║  • Публикует поездки в Telegram-канал                       ║
║  • Банит/разбанивает пользователей                          ║
║  • /stats /reviews /banned                                  ║
╚══════════════════════════════════════════════════════════════╝

Установка:
  pip install python-telegram-bot firebase-admin
"""

import asyncio
import logging
import os

from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import firebase_admin
from firebase_admin import credentials, db as firebase_db

# ══════════════════════════════════════════════════════════════
#  🔧 ЗАМЕНИ НА СВОИ ДАННЫЕ
# ══════════════════════════════════════════════════════════════

BOT_TOKEN         = os.environ.get("BOT_TOKEN",       "8093735282:AAFYqcIowG_oaUfrb824n-YR1zPLf6fNN3M")
CHANNEL_ID        = os.environ.get("CHANNEL_ID",      "@riderrank_feed")
ADMIN_CHAT_IDS    = [int(x) for x in os.environ.get("ADMIN_IDS", "670309466").split(",")]
FIREBASE_DB_URL   = os.environ.get("FIREBASE_DB_URL", "https://rider-80de6-default-rtdb.europe-west1.firebasedatabase.app")
FIREBASE_KEY_FILE = os.environ.get("FIREBASE_KEY_FILE", "firebase-key.json")
FIREBASE_KEY_JSON = os.environ.get("FIREBASE_KEY_JSON", "")  # для Railway

# ══════════════════════════════════════════════════════════════

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(message)s")
logger = logging.getLogger(__name__)

# Firebase — из переменной окружения (Railway) или из файла (локально)
import json
if FIREBASE_KEY_JSON:
    cred = credentials.Certificate(json.loads(FIREBASE_KEY_JSON))
    logger.info("Firebase: ключ из env переменной")
else:
    cred = credentials.Certificate(FIREBASE_KEY_FILE)
    logger.info("Firebase: ключ из файла")
firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_DB_URL})

# ── Форматирование ────────────────────────────────────────────
CRITERIA_LABELS = {
    "driving":     "🏎️ Вождение",
    "music":       "🎵 Музыка",
    "punctuality": "⏰ Пунктуальность",
    "cleanliness": "✨ Чистота авто",
    "shashki":     "♟️ Шашки",
    "safety":      "🛡️ Безопасность",
    "comfort":     "🛋️ Комфорт",
}

def calc_avg(scores: dict) -> float:
    vals = list(scores.values())
    return round(sum(vals) / len(vals), 1) if vals else 0

def get_title(avg: float) -> str:
    if avg >= 4.5: return "👑 Легенда дороги"
    if avg >= 4.0: return "🔥 Огонь за рулём"
    if avg >= 3.5: return "😎 Нормас"
    if avg >= 3.0: return "🙂 Сойдёт"
    if avg >= 2.0: return "😬 Ну такое..."
    return "💀 Кошмар"

def stars(val) -> str:
    v = int(round(float(val)))
    return "⭐" * v + "☆" * (5 - v)

def fmt_review(review: dict, driver: dict, prefix="🔔 *Новый отзыв!*") -> str:
    scores = review.get("scores", {})
    avg = calc_avg(scores)
    lines = [prefix, "",
        f"🚗 *{driver.get('displayName','?')}* · {driver.get('displayCar','?')}",
        f"👤 Оценил: *{review.get('reviewer','?')}*",
    ]
    if review.get("route"):
        lines.append(f"📍 {review['route']}")
    lines.append(f"📅 {review.get('date','?')}")
    lines.append("")
    for key, label in CRITERIA_LABELS.items():
        val = scores.get(key, 0)
        lines.append(f"{label}: {stars(val)} `{val}/5`")
    lines.append(f"\n🏅 *{avg}/5 — {get_title(avg)}*")
    if review.get("comment"):
        lines.append(f"\n💬 _{review['comment']}_")
    return "\n".join(lines)

def fmt_channel_post(review: dict, driver: dict) -> str:
    scores = review.get("scores", {})
    avg = calc_avg(scores)
    lines = ["🚗 *RIDE RANK — Новая поездка*", "",
        f"Водитель: *{driver.get('displayName','?')}* · {driver.get('displayCar','?')}",
        f"Оценил: {review.get('reviewer','?')}",
    ]
    if review.get("route"):
        lines.append(f"📍 {review['route']}")
    lines.append("")
    for key, label in CRITERIA_LABELS.items():
        lines.append(f"{label}: {stars(scores.get(key,0))}")
    lines.append(f"\n*Итог: {avg}/5 — {get_title(avg)}*")
    if review.get("comment"):
        lines.append(f"\n_{review['comment']}_")
    return "\n".join(lines)

def make_keyboard(review_id: str, reviewer: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🗑 Удалить", callback_data=f"del_{review_id}"),
            InlineKeyboardButton("📢 В канал", callback_data=f"pub_{review_id}"),
        ],
        [InlineKeyboardButton(f"🚫 Бан: {reviewer}", callback_data=f"ban_{review_id}")],
    ])

# ── Команды ───────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_CHAT_IDS:
        await update.message.reply_text("⛔ Нет доступа"); return
    await update.message.reply_text(
        "⚡ *RIDE RANK — Панель модератора*\n\n"
        "*/stats* — статистика\n"
        "*/reviews* — последние 5 отзывов\n"
        "*/banned* — заблокированные",
        parse_mode="Markdown"
    )

async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_CHAT_IDS: return
    reviews = firebase_db.reference("reviews").get() or {}
    drivers = firebase_db.reference("drivers").get() or {}
    banned  = firebase_db.reference("banned").get() or {}
    avgs = [calc_avg(r.get("scores",{})) for r in reviews.values()]
    gavg = round(sum(avgs)/len(avgs), 2) if avgs else 0
    await update.message.reply_text(
        f"📊 *Статистика RIDE RANK*\n\n"
        f"🚗 Поездок: *{len(reviews)}*\n"
        f"👤 Водителей: *{len(drivers)}*\n"
        f"⭐ Средняя оценка: *{gavg}*\n"
        f"🚫 Забанено: *{len(banned)}*",
        parse_mode="Markdown"
    )

async def cmd_reviews(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_CHAT_IDS: return
    reviews = firebase_db.reference("reviews").get() or {}
    drivers = firebase_db.reference("drivers").get() or {}
    if not reviews:
        await update.message.reply_text("Отзывов пока нет"); return
    sorted_r = sorted(reviews.items(), key=lambda x: x[1].get("timestamp",0), reverse=True)[:5]
    for rid, rev in sorted_r:
        d = drivers.get(rev.get("driverId",""), {})
        await update.message.reply_text(
            fmt_review(rev, d, "📋 *Отзыв*"),
            parse_mode="Markdown",
            reply_markup=make_keyboard(rid, rev.get("reviewer","?"))
        )

async def cmd_banned(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_CHAT_IDS: return
    banned = firebase_db.reference("banned").get() or {}
    if not banned:
        await update.message.reply_text("Забаненных нет 🎉"); return
    lines = ["🚫 *Заблокированные:*\n"]
    btns = []
    for key, name in banned.items():
        lines.append(f"• {name}")
        btns.append([InlineKeyboardButton(f"✅ Разбанить {name}", callback_data=f"unban_{key}")])
    await update.message.reply_text(
        "\n".join(lines), parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(btns) if btns else None
    )

# ── Callback кнопки ───────────────────────────────────────────

async def handle_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if query.from_user.id not in ADMIN_CHAT_IDS:
        await query.answer("⛔ Нет доступа", show_alert=True); return

    data = query.data
    reviews = firebase_db.reference("reviews").get() or {}
    drivers = firebase_db.reference("drivers").get() or {}

    if data.startswith("del_"):
        rid = data[4:]
        firebase_db.reference(f"reviews/{rid}").delete()
        await query.edit_message_text(
            query.message.text + "\n\n✅ *Отзыв удалён*",
            parse_mode="Markdown"
        )

    elif data.startswith("pub_"):
        rid = data[4:]
        rev = reviews.get(rid, {})
        d   = drivers.get(rev.get("driverId",""), {})
        if rev:
            try:
                await ctx.bot.send_message(
                    chat_id=CHANNEL_ID,
                    text=fmt_channel_post(rev, d),
                    parse_mode="Markdown"
                )
                await query.edit_message_text(
                    query.message.text + "\n\n📢 *Опубликовано в канал!*",
                    parse_mode="Markdown"
                )
            except Exception as e:
                await query.answer(f"Ошибка: {e}", show_alert=True)

    elif data.startswith("ban_"):
        rid = data[4:]
        rev = reviews.get(rid, {})
        reviewer = rev.get("reviewer", "")
        if reviewer:
            ban_key = reviewer.lower().replace(" ", "_")
            firebase_db.reference(f"banned/{ban_key}").set(reviewer)
            all_reviews = firebase_db.reference("reviews").get() or {}
            deleted = 0
            for r_id, r in all_reviews.items():
                if r.get("reviewer","").lower() == reviewer.lower():
                    firebase_db.reference(f"reviews/{r_id}").delete()
                    deleted += 1
            await query.edit_message_text(
                f"🚫 *{reviewer} заблокирован*\nУдалено отзывов: {deleted}",
                parse_mode="Markdown"
            )

    elif data.startswith("unban_"):
        key = data[6:]
        banned = firebase_db.reference("banned").get() or {}
        name = banned.get(key, key)
        firebase_db.reference(f"banned/{key}").delete()
        await query.edit_message_text(f"✅ *{name} разблокирован*", parse_mode="Markdown")

# ── Слушатель новых отзывов ───────────────────────────────────

class ReviewListener:
    def __init__(self, bot: Bot):
        self.bot = bot
        existing = firebase_db.reference("reviews").get() or {}
        self.known_ids = set(existing.keys())
        logger.info(f"Загружено {len(self.known_ids)} существующих отзывов")

    async def check(self):
        reviews = firebase_db.reference("reviews").get() or {}
        drivers = firebase_db.reference("drivers").get() or {}
        for rid, rev in reviews.items():
            if rid in self.known_ids:
                continue
            self.known_ids.add(rid)
            driver = drivers.get(rev.get("driverId",""), {})
            text = fmt_review(rev, driver)
            kbd  = make_keyboard(rid, rev.get("reviewer","?"))
            for admin_id in ADMIN_CHAT_IDS:
                try:
                    await self.bot.send_message(
                        chat_id=admin_id,
                        text=text,
                        parse_mode="Markdown",
                        reply_markup=kbd
                    )
                except Exception as e:
                    logger.error(f"Ошибка уведомления: {e}")

async def polling_loop(listener: ReviewListener):
    while True:
        try:
            await listener.check()
        except Exception as e:
            logger.error(f"Ошибка polling: {e}")
        await asyncio.sleep(10)

# ── Запуск ────────────────────────────────────────────────────

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start",   cmd_start))
    app.add_handler(CommandHandler("help",    cmd_start))
    app.add_handler(CommandHandler("stats",   cmd_stats))
    app.add_handler(CommandHandler("reviews", cmd_reviews))
    app.add_handler(CommandHandler("banned",  cmd_banned))
    app.add_handler(CallbackQueryHandler(handle_callback))

    async def on_startup(app):
        listener = ReviewListener(app.bot)
        asyncio.create_task(polling_loop(listener))
        logger.info("🚀 RIDE RANK Bot запущен!")
        for admin_id in ADMIN_CHAT_IDS:
            try:
                await app.bot.send_message(
                    admin_id,
                    "🚀 *RIDE RANK Bot запущен и готов к работе!*",
                    parse_mode="Markdown"
                )
            except Exception as e:
                logger.warning(f"Не удалось отправить приветствие: {e}")

    app.post_init = on_startup
    app.run_polling(drop_pending_updates=True, close_loop=False)

if __name__ == "__main__":
    main()
