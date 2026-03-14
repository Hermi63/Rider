"""
RIDE RANK — Telegram command and callback handlers.
"""

import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from app.config import ADMIN_CHAT_IDS, CHANNEL_ID
from app import firebase_client as fb
from app.formatting import calc_avg, fmt_review, fmt_channel

logger = logging.getLogger(__name__)


def _is_admin(user_id: int) -> bool:
    return user_id in ADMIN_CHAT_IDS


def make_keyboard(review_id: str, reviewer: str) -> InlineKeyboardMarkup:
    short = reviewer[:15] + "…" if len(reviewer) > 15 else reviewer
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🗑 Удалить", callback_data=f"del_{review_id}"),
            InlineKeyboardButton("📢 В канал", callback_data=f"pub_{review_id}"),
        ],
        [InlineKeyboardButton(f"🚫 Бан: {short}", callback_data=f"ban_{review_id}")],
    ])


# ── Commands ────────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _is_admin(update.effective_user.id):
        await update.message.reply_text("⛔ Нет доступа")
        return
    await update.message.reply_text(
        "⚡ *RIDE RANK — Панель модератора*\n\n"
        "/stats — статистика\n"
        "/reviews — последние 5 отзывов\n"
        "/banned — заблокированные",
        parse_mode="Markdown",
    )


async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _is_admin(update.effective_user.id):
        return
    try:
        reviews = fb.get_reviews()
        drivers = fb.get_drivers()
        banned = fb.get_banned()
        avgs = [calc_avg(r.get("scores", {})) for r in reviews.values()]
        gavg = round(sum(avgs) / len(avgs), 2) if avgs else 0
        await update.message.reply_text(
            f"📊 *Статистика RIDE RANK*\n\n"
            f"🚗 Поездок: *{len(reviews)}*\n"
            f"👤 Водителей: *{len(drivers)}*\n"
            f"⭐ Средняя: *{gavg}*\n"
            f"🚫 Забанено: *{len(banned)}*",
            parse_mode="Markdown",
        )
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка Firebase: {e}")


async def cmd_reviews(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _is_admin(update.effective_user.id):
        return
    try:
        reviews = fb.get_reviews()
        drivers = fb.get_drivers()
        if not reviews:
            await update.message.reply_text("Отзывов пока нет")
            return
        sorted_r = sorted(
            reviews.items(),
            key=lambda x: x[1].get("timestamp", 0),
            reverse=True,
        )[:5]
        for rid, rev in sorted_r:
            d = drivers.get(rev.get("driverId", ""), {})
            await update.message.reply_text(
                fmt_review(rev, d, "📋 *Отзыв*"),
                parse_mode="Markdown",
                reply_markup=make_keyboard(rid, rev.get("reviewer", "?")),
            )
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {e}")


async def cmd_banned(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _is_admin(update.effective_user.id):
        return
    try:
        banned = fb.get_banned()
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
            reply_markup=InlineKeyboardMarkup(btns),
        )
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {e}")


# ── Callbacks ───────────────────────────────────────────────────

async def handle_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not _is_admin(query.from_user.id):
        await query.answer("⛔ Нет доступа", show_alert=True)
        return
    await query.answer()
    data = query.data

    try:
        if data.startswith("del_"):
            rid = data[4:]
            fb.ref(f"reviews/{rid}").delete()
            await query.edit_message_text("✅ Отзыв удалён")

        elif data.startswith("pub_"):
            rid = data[4:]
            reviews = fb.get_reviews()
            drivers = fb.get_drivers()
            rev = reviews.get(rid, {})
            d = drivers.get(rev.get("driverId", ""), {})
            if rev and CHANNEL_ID:
                await ctx.bot.send_message(
                    chat_id=CHANNEL_ID,
                    text=fmt_channel(rev, d),
                    parse_mode="Markdown",
                )
                await query.edit_message_text("📢 Опубликовано в канал!")
            else:
                await query.answer("Канал не задан или отзыв не найден", show_alert=True)

        elif data.startswith("ban_"):
            rid = data[4:]
            reviews = fb.get_reviews()
            rev = reviews.get(rid, {})
            reviewer = rev.get("reviewer", "")
            if reviewer:
                ban_key = reviewer.lower().replace(" ", "_")
                fb.ref(f"banned/{ban_key}").set(reviewer)
                all_reviews = fb.get_reviews()
                deleted = 0
                for r_id, r in list(all_reviews.items()):
                    if r.get("reviewer", "").lower() == reviewer.lower():
                        fb.ref(f"reviews/{r_id}").delete()
                        deleted += 1
                await query.edit_message_text(f"🚫 {reviewer} заблокирован\nУдалено отзывов: {deleted}")

        elif data.startswith("unban_"):
            key = data[6:]
            banned = fb.get_banned()
            name = banned.get(key, key)
            fb.ref(f"banned/{key}").delete()
            await query.edit_message_text(f"✅ {name} разблокирован")

    except Exception as e:
        logger.error("Callback error: %s", e)
        try:
            await query.answer(str(e)[:100], show_alert=True)
        except Exception:
            pass
