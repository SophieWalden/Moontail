export const WIDTH = 1920;
export const HEIGHT = 1080;

export const WORLD_WIDTH_IN_TILES = 40;
export const WORLD_HEIGHT_IN_TILES = 38;

export const EMPTY_TILE = 8;

export const TILE_SIZE = 48;

export const WARP_TILES = {
    "clan_19_22": ["hunting_grounds", 20, 1],
    "clan_20_22": ["hunting_grounds", 21, 1],
    "hunting_grounds_20_0": ["clan", 20, 21],
    "hunting_grounds_21_0": ["clan", 21, 21]
}

export const DIALOGUE = {
    "orangebite": ["Welcome to officeclan!", "You should check in with nightclaw, he's next to the fresh-kill pile"],
    "nightclaw": ["Apprentice! You're reporting in as late as a kit of no moons. Remember to report to me first thing in the morning",
                    "Your goal today is to hunt rats, and maybe snakes once you get comfortable enough. Bring them to the plate in front of me and I'll add them to the fresh-kill pile", "You can find the hunting grounds down south, just pounce on those cyan transport tiles"],
    "plate": ["you offer all you can to the fresh-kill pile. Starclan rewards you for your duty"],
    "michaelstar": ["me hungry"],
    "mountainbreath": ["Lousy elders den, best they got is a rag in a half destroyed box", "Say apprentice, why don't you fetch me some Comfrey roots to ease my pain (not implemented yet)"],
    "michaeljackson": ["*rambling to himself about some experience he's trying to setup for the others* hehe!"],
    "chulkpaw": ["you can't catch as many mice as me in the fields! I caught basically 7000 last week"],
    "blueswirl": ["I used to think I was one of the highest rated cluggers in the clan, but just last week I lost to La Lechuza :<"],
    "momo": ["You dont deserve this big toblerone"],
    "divinepaw": ["We need to strength our alliance with nonbinaryjaintorchildclan next gathering"],
    "mondaysnooze": ["dodge this"],
    "longface": ["Click on rats to walk towards them and hunt them down. Then you can finish up your apprentice duty by offering them to the fresh-kill pile", "I cant believe I got stuck with watching the apprentices hunt today :<"],
    "rainsoul": ["Hiii! Once your level 10 you can hunt these snakes with me. They got more meat on them then disgusting rats"]
}

export const NPCs = {
    "clan": {
        "orangebite": [24, 11, false],
        'nightclaw': [6, 12, true],
        "plate": [7, 13, false],
        "michaelstar": [19.6, 4.2, false],
        "mountainbreath": [29.7, 7, false],
        "michaeljackson": [10, 6, false],
        "chulkpaw": [30, 15, true],
        "blueswirl": [7, 17, true],
        "momo": [31, 18, false],
        "divinepaw": [5, 6, false],
        "mondaysnooze": [15, 5, false]
    },
    "hunting_grounds": {
        "longface": [26, 4, true],
        "rainsoul": [15, 25, false]
    }
}