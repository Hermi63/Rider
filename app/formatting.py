"""
RIDE RANK — Message formatting.
"""

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
    vals = [x for x in scores.values() if isinstance(x, (int, float))]
    return round(sum(vals) / len(vals), 1) if vals else 0.0


def get_title(avg: float) -> str:
    if avg >= 4.5:
        return "👑 Легенда дороги"
    if avg >= 4.0:
        return "🔥 Огонь за рулём"
    if avg >= 3.5:
        return "😎 Нормас"
    if avg >= 3.0:
        return "🙂 Сойдёт"
    if avg >= 2.0:
        return "😬 Ну такое..."
    return "💀 Кошмар"


def stars(val) -> str:
    v = min(5, max(0, int(round(float(val)))))
    return "⭐" * v + "☆" * (5 - v)


def fmt_review(review: dict, driver: dict, prefix: str = "🔔 *Новый отзыв!*") -> str:
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
