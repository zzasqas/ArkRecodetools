"""patch 9 個 7 月新角色的右側資料到 rta_2026-07-25.json"""
import json

PATH = r"C:\Users\zzasq\ArkRecodetools\research\data\rta_2026-07-25.json"

patches = {
    "绚烂夏花卡洛琳": {
        "equip":        "速度生命\n全生命",
        "mainStats":    "生命命中速度",
        "substats":     "生命, 命中, 速度",
        "panel":        "生命力: 21000+\n速度: 200+\n命中: 50+",
        "bond":         "初次的悸动",
        "team":         "空\n花刺\n按摩王\n水琴",
        "counter":      "",
        "rtaOrder":     "反核四选或五选",
        "arenaComment": "因为S2没有无视抗性，所以胜率只能保持在85%左右，抵抗就很难受，睡负面不如眩晕。",
    },
    "自信拉娜": {
        "equip":        "抗性免疫\n抗性命中\n速度抗性",
        "mainStats":    "小生命抗性速度",
        "substats":     "生命, 防御, 速度, 抗性, 命中",
        "panel":        "生命: 14000+\n速度: 180+\n抗性: 200+\n命中: 60+",
        "bond":         "盛开的扶桑\n羞涩的请求\n偶像的心声",
        "team":         "水拳\n暗lb",
        "counter":      "",
        "breakthrough": "突破",
        "potential":    "自阵",
        "rtaOrder":     "反核四选或五选",
        "arenaComment": "有自拉条，而且还加强的，又是反核一员大将。",
    },
    "时界巡者AOI": {
        "equip":        "爆伤免疫\n速度免疫\n速度贯穿",
        "mainStats":    "爆伤攻击速度",
        "substats":     "攻击力, 暴击率, 爆伤, 速度",
        "panel":        "攻击: 3100+\n暴击: 50\n爆伤: 320\n速度: 180+",
        "bond":         "热烈的声援\n独处的心愿",
        "team":         "望月\n史哥",
        "counter":      "",
        "breakthrough": "突破",
        "potential":    "自阵",
        "rtaOrder":     "",
        "arenaComment": "闪避的对策卡，带上专属再也不怕闪避角色了。",
    },
    "雪江": {
        "equip":        "速度命中\n全生命",
        "mainStats":    "生命命中速度",
        "substats":     "生命, 命中, 速度",
        "panel":        "生命力: 14000+\n速度: 220+\n命中: 100+",
        "bond":         "初次的悸动",
        "team":         "",
        "counter":      "",
        "rtaOrder":     "反核四选或五选",
        "arenaComment": "目前适合用来打团，在水琴上一队的情况下，光水奶就适合二队，用起来还行。",
    },
    "尤莉": {
        "equip":        "爆伤贯穿\n暴怒贯穿",
        "mainStats":    "爆伤攻击速度",
        "substats":     "攻击力, 暴击率, 爆伤, 速度",
        "panel":        "攻击: 3100\n暴击: 100\n爆伤: 310\n速度: 180",
        "bond":         "狂放的禁果\n真正的主角\n美味的封肉",
        "team":         "魅魔\n望月",
        "counter":      "",
        "breakthrough": "突破",
        "potential":    "自阵",
        "rtaOrder":     "核爆四五选",
        "arenaComment": "RTA核爆必抽角色",
    },
    "米德": {
        "equip":        "生命免疫\n速度生命\n复仇生命",
        "mainStats":    "生命生命生命",
        "substats":     "生命力, 速度, 防御力, 抗性",
        "panel":        "生命力: 26000+\n速度: 150",
        "bond":         "秘密的战略\n贪吃的后果\n挣扎的妥协\n老主顾",
        "team":         "水马\n水琴",
        "counter":      "异变",
        "breakthrough": "突破",
        "potential":    "自阵",
        "rtaOrder":     "",
        "arenaComment": "按摩王纯，优先用这个阁王底名。",
    },
    "爱恋泡影的玳琏": {
        "equip":        "速度命中\n速度暴击\n速度生命",
        "mainStats":    "暴击生命速度",
        "substats":     "生命, 速度, 暴击, 命中",
        "panel":        "生命: 15000\n暴击: 100\n速度: 220\n命中: 100",
        "bond":         "征服与臣服(暴击率85即可)\n私密的报答",
        "team":         "",
        "counter":      "火猫\n水偶",
        "rtaOrder":     "",
        "arenaComment": "防守用来克制非攻击行动的角色，比如奶、拉条，但被火猫克制。非攻对策，露菲娜出之前的下位代，出来之后不用。",
    },
    "水纪": {
        "equip":        "速度命中",
        "mainStats":    "命中速度",
        "substats":     "速度, 命中",
        "panel":        "速度: 250+\n命中: 150",
        "bond":         "迷离的双眼",
        "team":         "花刺\n血卡",
        "counter":      "水琴\n暗lb",
        "rtaOrder":     "",
        "arenaComment": "自从有了兔女郎，水圣诞已经备胎了，公会战可用来防守，具有高贵的夹攻。",
    },
    "芽路": {
        "equip":        "六生命",
        "mainStats":    "生命生命生命",
        "substats":     "生命, 防御, 速度, 抗性",
        "panel":        "防御: 1500\n生命: 18000",
        "bond":         "无人的店面",
        "team":         "",
        "counter":      "",
        "rtaOrder":     "",
        "arenaComment": "暗龙的下位替代，等转职吧，不知道星陨有没有这个机制。",
    },
}

data = json.load(open(PATH, encoding="utf-8"))
patched = 0
for row in data["rows"]:
    p = patches.get(row["name"])
    if p:
        for k, v in p.items():
            if v:  # skip empty strings
                row[k] = v
        patched += 1

json.dump(data, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"Patched {patched}/9 new characters into {PATH}")
