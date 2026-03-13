"""
RIDE RANK — Telegram Bot (финальная версия для Railway)
"""

import asyncio
import logging
import os
import json
import base64

from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import firebase_admin
from firebase_admin import credentials, db as firebase_db

# ══════════════════════════════════════════════════════════════
#  🔧 НАСТРОЙКИ — задаются через Variables в Railway
# ══════════════════════════════════════════════════════════════

BOT_TOKEN        = os.environ.get("BOT_TOKEN",        "")
CHANNEL_ID       = os.environ.get("CHANNEL_ID",       "")
ADMIN_IDS_STR    = os.environ.get("ADMIN_IDS",        "")
FIREBASE_DB_URL  = os.environ.get("FIREBASE_DB_URL",  "https://rider-80de6-default-rtdb.europe-west1.firebasedatabase.app")
FIREBASE_KEY_B64 = os.environ.get("FIREBASE_KEY_B64", "")

ADMIN_CHAT_IDS = [int(x.strip()) for x in ADMIN_IDS_STR.split(",") if x.strip()] if ADMIN_IDS_STR else []

# ══════════════════════════════════════════════════════════════

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(message)s")
logger = logging.getLogger(__name__)

# ── Firebase init ─────────────────────────────────────────────
def init_firebase():
    if FIREBASE_KEY_B64:
        raw = base64.b64decode(FIREBASE_KEY_B64).decode("utf-8")
        key_dict = json.loads(raw)
        # Восстанавливаем переносы строк в private_key которые Railway ломает
        if "private_key" in key_dict:
            key_dict["private_key"] = key_dict["private_key"].replace("\\n", "\n")
        cred = credentials.Certificate(key_dict)
        logger.info("Firebase: ключ из FIREBASE_KEY_B64")
    elif os.path.exists("firebase-key.json"):
        cred = credentials.Certificate("firebase-key.json")
        logger.info("Firebase: ключ из файла")
    else:
        raise RuntimeError("Нет FIREBASE_KEY_B64 и нет firebase-key.json!")
    firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_DB_URL})

init_firebase()

# ── Форматирование ────────────────────────────────────────────
CRITERIA = {
    "driving":     "🏎️ Вождение",
    "music":       "🎵 Музыка",
    "punctuality": "⏰ Пунктуальность",
    "cleanliness": "✨ Чистота",
    "shashki":     "♟️ Шашки",
    "safety":      "🛡️ Безопасность",
    "comfort":     "🛋️ Комфорт",
}

def calc_avg(scores: dict) -> float:
    v = [x for x in scores.values() if isinstance(x, (int, float))]
    return round(sum(v) / len(v), 1) if v else 0.0

def get_title(avg: float) -> str:
    if avg >= 4.5: return "👑 Легенда дороги"
    if avg >= 4.0: return "🔥 Огонь за рулём"
    if avg >= 3.5: return "😎 Нормас"
    if avg >= 3.0: return "🙂 Сойдёт"
    if avg >= 2.0: return "😬 Ну такое..."
    return "💀 Кошмар"

def stars(val) -> str:
    v = min(5, max(0, int(round(float(val)))))
    return "⭐" * v + "☆" * (5 - v)

def fmt_review(review: dict, driver: dict, prefix="🔔 *Новый отзыв!*") -> str:
    scores = review.get("scores", {})
    avg = calc_avg(scores)
    lines = [
        prefix, "",
        f"🚗 *{driver.get('displayName', '?')}* · {driver.get('displayCar', '?')}",
        f"👤 от: *{review.get('reviewer', '?')}*",
    ]
    if review.get("route"):
        lines.append(f"📍 {review['route']}")
    lines.append(f"📅 {review.get('date', '?')}")
    lines.append("")
    for key, label in CRITERIA.items():
        val = scores.get(key, 0)
        lines.append(f"{label}: {stars(val)} {val}/5")
    lines.append(f"\n🏅 *{avg}/5 — {get_title(avg)}*")
    if review.get("comment"):
        lines.append(f"\n💬 _{review['comment']}_")
    return "\n".join(lines)

def fmt_channel(review: dict, driver: dict) -> str:
    scores = review.get("scores", {})
    avg = calc_avg(scores)
    lines = [
        "🚗 *RIDE RANK — Новая поездка*", "",
        f"Водитель: *{driver.get('displayName', '?')}* · {driver.get('displayCar', '?')}",
        f"Оценил: {review.get('reviewer', '?')}",
    ]
    if review.get("route"):
        lines.append(f"📍 {review['route']}")
    lines.append("")
    for key, label in CRITERIA.items():
        lines.append(f"{label}: {stars(scores.get(key, 0))}")
    lines.append(f"\n*Итог: {avg}/5 — {get_title(avg)}*")
    if review.get("comment"):
        lines.append(f"\n_{review['comment']}_")
    return "\n".join(lines)

def make_keyboard(review_id: str, reviewer: str) -> InlineKeyboardMarkup:
    short = reviewer[:15] + "…" if len(reviewer) > 15 else reviewer
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🗑 Удалить", callback_data=f"del_{review_id}"),
            InlineKeyboardButton("📢 В канал", callback_data=f"pub_{review_id}"),
        ],
        [InlineKeyboardButton(f"🚫 Бан: {short}", callback_data=f"ban_{review_id}")],
    ])

# ── Команды ───────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_CHAT_IDS:
        await update.message.reply_text("⛔ Нет доступа")
        return
    await update.message.reply_text(
        "⚡ *RIDE RANK — Панель модератора*\n\n"
        "/stats — статистика\n"
        "/reviews — последние 5 отзывов\n"
        "/banned — заблокированные",
        parse_mode="Markdown"
    )

async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_CHAT_IDS: return
    try:
        reviews = firebase_db.reference("reviews").get() or {}
        drivers = firebase_db.reference("drivers").get() or {}
        banned  = firebase_db.reference("banned").get() or {}
        avgs = [calc_avg(r.get("scores", {})) for r in reviews.values()]
        gavg = round(sum(avgs) / len(avgs), 2) if avgs else 0
        await update.message.reply_text(
            f"📊 *Статистика RIDE RANK*\n\n"
            f"🚗 Поездок: *{len(reviews)}*\n"
            f"👤 Водителей: *{len(drivers)}*\n"
            f"⭐ Средняя: *{gavg}*\n"
            f"🚫 Забанено: *{len(banned)}*",
            parse_mode="Markdown"
        )
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка Firebase: {e}")

async def cmd_reviews(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_CHAT_IDS: return
    try:
        reviews = firebase_db.reference("reviews").get() or {}
        drivers = firebase_db.reference("drivers").get() or {}
        if not reviews:
            await update.message.reply_text("Отзывов пока нет")
            return
        sorted_r = sorted(reviews.items(), key=lambda x: x[1].get("timestamp", 0), reverse=True)[:5]
        for rid, rev in sorted_r:
            d = drivers.get(rev.get("driverId", ""), {})
            await update.message.reply_text(
                fmt_review(rev, d, "📋 *Отзыв*"),
                parse_mode="Markdown",
                reply_markup=make_keyboard(rid, rev.get("reviewer", "?"))
            )
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {e}")

async def cmd_banned(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_CHAT_IDS: return
    try:
        banned = firebase_db.reference("banned").get() or {}
        if not banned:
            await update.message.reply_text("Забаненных нет 🎉")
            return
        lines = ["🚫 *Заблокированные:*\n"]
        btns = []
        for key, name in banned.items():
            lines.append(f"• {name}")
            btns.append([InlineKeyboardButton(f"✅ Разбанить {name}", callback_data=f"unban_{key}")])
        await update.message.reply_text(
            "\n".join(lines),
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(btns)
        )
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {e}")

# ── Callback ──────────────────────────────────────────────────

async def handle_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if query.from_user.id not in ADMIN_CHAT_IDS:
        await query.answer("⛔ Нет доступа", show_alert=True)
        return
    data = query.data
    try:
        if data.startswith("del_"):
            rid = data[4:]
            firebase_db.reference(f"reviews/{rid}").delete()
            await query.edit_message_text("✅ Отзыв удалён")

        elif data.startswith("pub_"):
            rid = data[4:]
            reviews = firebase_db.reference("reviews").get() or {}
            drivers = firebase_db.reference("drivers").get() or {}
            rev = reviews.get(rid, {})
            d   = drivers.get(rev.get("driverId", ""), {})
            if rev and CHANNEL_ID:
                await ctx.bot.send_message(chat_id=CHANNEL_ID, text=fmt_channel(rev, d), parse_mode="Markdown")
                await query.edit_message_text("📢 Опубликовано в канал!")
            else:
                await query.answer("Канал не задан или отзыв не найден", show_alert=True)

        elif data.startswith("ban_"):
            rid = data[4:]
            reviews = firebase_db.reference("reviews").get() or {}
            rev = reviews.get(rid, {})
            reviewer = rev.get("reviewer", "")
            if reviewer:
                ban_key = reviewer.lower().replace(" ", "_")
                firebase_db.reference(f"banned/{ban_key}").set(reviewer)
                all_reviews = firebase_db.reference("reviews").get() or {}
                deleted = sum(1 for r in all_reviews.values() if r.get("reviewer","").lower() == reviewer.lower())
                for r_id, r in list(all_reviews.items()):
                    if r.get("reviewer","").lower() == reviewer.lower():
                        firebase_db.reference(f"reviews/{r_id}").delete()
                await query.edit_message_text(f"🚫 {reviewer} заблокирован\nУдалено отзывов: {deleted}")

        elif data.startswith("unban_"):
            key = data[6:]
            banned = firebase_db.reference("banned").get() or {}
            name = banned.get(key, key)
            firebase_db.reference(f"banned/{key}").delete()
            await query.edit_message_text(f"✅ {name} разблокирован")

    except Exception as e:
        logger.error(f"Callback error: {e}")
        try:
            await query.answer(str(e)[:100], show_alert=True)
        except:
            pass

# ── Слушатель новых отзывов ───────────────────────────────────

class ReviewListener:
    def __init__(self, bot: Bot):
        self.bot = bot
        self.known_ids: set = set()
        try:
            existing = firebase_db.reference("reviews").get() or {}
            self.known_ids = set(existing.keys())
            logger.info(f"Загружено {len(self.known_ids)} существующих отзывов")
        except Exception as e:
            logger.error(f"Ошибка инициализации listener: {e}")

    async def check(self):
        try:
            reviews = firebase_db.reference("reviews").get() or {}
            drivers = firebase_db.reference("drivers").get() or {}
            for rid, rev in reviews.items():
                if rid in self.known_ids:
                    continue
                self.known_ids.add(rid)
                driver = drivers.get(rev.get("driverId", ""), {})
                text = fmt_review(rev, driver)
                kbd  = make_keyboard(rid, rev.get("reviewer", "?"))
                for admin_id in ADMIN_CHAT_IDS:
                    try:
                        await self.bot.send_message(
                            chat_id=admin_id,
                            text=text,
                            parse_mode="Markdown",
                            reply_markup=kbd
                        )
                    except Exception as e:
                        logger.error(f"Ошибка уведомления {admin_id}: {e}")
        except Exception as e:
            logger.error(f"Ошибка polling check: {e}")

async def polling_loop(listener: ReviewListener):
    while True:
        await listener.check()
        await asyncio.sleep(15)

# ── Запуск (совместим с python-telegram-bot 21.x) ─────────────

async def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start",   cmd_start))
    app.add_handler(CommandHandler("help",    cmd_start))
    app.add_handler(CommandHandler("stats",   cmd_stats))
    app.add_handler(CommandHandler("reviews", cmd_reviews))
    app.add_handler(CommandHandler("banned",  cmd_banned))
    app.add_handler(CallbackQueryHandler(handle_callback))

    listener = ReviewListener(app.bot)

    async with app:
        await app.start()
        await app.updater.start_polling(drop_pending_updates=True)
        logger.info("🚀 RIDE RANK Bot запущен!")
        for admin_id in ADMIN_CHAT_IDS:
            try:
                await app.bot.send_message(admin_id, "🚀 *RIDE RANK Bot запущен!*", parse_mode="Markdown")
            except Exception as e:
                logger.warning(f"Приветствие не отправлено {admin_id}: {e}")
        await polling_loop(listener)
        await app.updater.stop()
        await app.stop()

if __name__ == "__main__":
    asyncio.run(main())
