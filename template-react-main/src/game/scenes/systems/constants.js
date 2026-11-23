export const WIDTH = 1920;
export const HEIGHT = 1080;

export const WORLD_WIDTH_IN_TILES = 40;
export const WORLD_HEIGHT_IN_TILES = 38;

export const EMPTY_TILE = 8;

export const TILE_SIZE = 48;

export const WARP_TILES = {
    "clan_19_22": ["hunting_grounds", 20, 1],
    "clan_20_22": ["hunting_grounds", 21, 1],
    "clan_0_11": ["field", 28, 15],
    "clan_0_12": ["field", 28, 15],
    "hunting_grounds_20_0": ["clan", 20, 21],
    "hunting_grounds_21_0": ["clan", 21, 21],
    "field_29_14": ["clan", 1, 10],
    "field_29_15": ["clan", 1, 11],
    "clan_5_6": ["medicine_cave", 2, 6],
    "clan_4_6": ["medicine_cave", 1, 6],
    "medicine_cave_2_6": ["clan", 5, 6],
    "medicine_cave_1_6": ["clan", 4, 6],
    "clan_30_14":[ "sleeping_cave", 0, 4],
    "clan_30_15":[ "sleeping_cave", 0, 5],
    "sleeping_cave_0_4":[ "clan", 30, 14],
    "sleeping_cave_0_5":[ "clan", 30, 15],
    "sleeping_cave_0_0": ["starclan", 21, 15],
    "starclan_20_16": ["sleeping_cave", 3, 3],
    "starclan_19_5": ["freaks", 14, 14],
    "starclan_20_5": ["freaks", 15, 14],
    "freaks_14_14": ["starclan", 20, 5],
    "freaks_15_14": ["starclan", 20, 5]

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
    "rainsoul": ["Hiii! Once your level 10 you can hunt these snakes with me. They got more meat on them then disgusting rats"],
    "herb_box": ["You fucking dumbass loser you think you could ever be with a beautiful herb box like me"],
    "fernsong": ["Meow meow apprenctice. Please deposit your herbs from the field in the herb box", "Join me for medicine lessons by stepping into my room on the right at any time"],
    "medical_minigame_start": ["I hate when my pregant wife gets duplicated and then i have to go on the tv news anchor show"],
    "arcade_cabinet": ["aoaoaoaoaoaoaoaaoaoaoaoao"],
    "bottlecat": ["the cluggin heckie im doing in here"],
    "ghost": ["oaoaoaoaoaoa"],
    "wizard": ["best we can make you is bread. That's wolf shit because it too comes in packs"]
}

export const NPCs = {
    "clan": {
        "orangebite": [24, 11, false, 1],
        'nightclaw': [6, 12, true, 1],
        "plate": [7, 13, false, 1],
        "michaelstar": [19.6, 4.2, false, 1],
        "mountainbreath": [29.7, 7, false, 1],
        "michaeljackson": [10, 6, false, 1],
        "chulkpaw": [30, 11, true, 1],
        "blueswirl": [7, 17, true, 1],
        "momo": [31, 18, false, 1],
        "divinepaw": [24, 5, false, 1],
        "mondaysnooze": [15, 5, false, 1]
    },
    "hunting_grounds": {
        "longface": [26, 4, true, 1],
        "rainsoul": [15, 25, false, 1]
    },
    "field": {},
    "medicine_cave":{
        "herb_box": [6, 6, false, 1],
        "fernsong": [2, 2, false, 1],
        "medical_minigame_start": [6, 2, false, 1]
    },
    "freaks": {
        "arcade_cabinet": [27, 1, false, 1],
        "figgy": [8, 6, false, 1],
        "wizard": [19, 4.45, false, 0.5],
        "bottlecat": [21, 6, false, 0.3]
    },
    "starclan": {
        "simon": [3, 3, false, 0.6], 
        "lev": [28, 3, true, 1.5],
        "ghost": [8, 12, false, 0.3],
        "fancy": [28, 12, false, 0.3]
    }
}

const questions = {
    "Warrior Cats": {
        "What is the name of the deadly road between Thunderclan and Shadowclan?": "thunderpath",
        "What is the name of the third thunderclan medicine cat who goes into medicine due to a car related injury": "cinderpelt",
        "What is the name of the prophecy stone?": "moonstone",
        "What is the name of the rogue who stupidly oneshots the first series villian in one swip for no reason": "scourge",
        "What is the suffix used for leaders": "star",
        "What role assigns patrols and is the leader of the warriors": "sheriff",
        "Bluestar had cross-clan kits with somecat from this clan": "riverclan",
    },
    "cheesemaking": {
        "What from animals stomachs do you add to milk to make it curdle": "rennet",
        "What is the bacteria used for flavor called": "culture",
        "What plant can you use to make a plant-based version of rennet": "thistle",
        "What is someone who sells cheese called?": "cheesemonger",
        "Ricotta is an italian word. What does it mean in english": "recooked",
        "What special step is used to make cheddar": "cheddaring",
        "Which cheese requires mold to be introduced before aging": "brie"
    },
    "Cow Online World": {
        "What is Gelidity's nickname?": "blood dog",
        "When did the coveted Nintedo Woo release?": "November 19, 2006",
        "What book do you get for combat as a rare drop from the elevator": "animal fun facts volume 1",
        "What animal spouts trivia in Fruity Freaks?": "tenrec",
        "What minimum wage employee has knives always available in his moving area": "bus dog",
        "What type of wood makes the loudest piano": "rosewood"
    },
    "Sitcom": {
        "In Zombies 3, where is the map located": "In Addison's DNA",
        "What is the best pokemon theme song?": " The best theme song is black and white",
        "What noise does figgy wiggy waggles toyota mercedes timmy III make": "aoaoaoaoao",
        "What hit canadian animated child show was introduced to the sitcom in season 2": "clugterra",
        "What Cryptid tied for 3/4 place and is a slightly larger version of a normal animal": "loveland frog",
        "what don't you deserve?": "this big toblerone",
        "What was the tagline of season 1": "the greatest story never told",
        "What was the kit that was triple exiled before becoming clan leader in the clangen episode": "stupidkit",
        "What year was hit book The Kid, The Babe, The President, and the Anarchist written about": "1927",
        "What is the name of Calivn Coolidge's pat raccoon": "rebecca",
        "What is wolf shit because it comes in packs": "bread"
    },
    "Tennis": {
        "What is the technical term for a 40-40 score in a game": "deuce",
        "What does love represent in tennis scoring": "zero",
        "What is the term for winning a set with a score of 6-0": "a bagel",
        "Why are Wimbledon tennis balls kept in refrigerated containers?": "to ensure they maintain a consistent bounce",
        "how does a player win a standard tie-break game": "reach seven points and lead by two"   
    },
    "One Piece": {
        "What is the name of the fruit, fed to a gun, that transforms one into a dog": "mutt mutt fruit",
        "Who is the worst character literally just useless why is he there": "usopp",
        "Who is luffys sworn brother": "sabo",
        "What is the name of the first ship used for approximately 300 episode": "going mary",
        "What is Sanjis dream": "to find the all blue",
        "What does Luffy say at the end of every episode preview": "I will be king of the pirates!!",
        "Why was Luffy invulnerable to Eneru": "because he is made of rubber",
        "What is the name of the perverted animal": "pervert camel"
    }
}

export const QUESTIONS = questions;

export const TRIVIA = {
    questionDurationMs: 20000,
    questionsCount: 3,     
    dbPath: 'trivia/current'
}

export const TILE_TO_NAME = {
    17: "Marigold",
    18: "Borage",
    19: "Tansy",
    20: "Garlic",
    21: "Snakeroot",
    386: "rat",
    387: "snake"
}

export const NAME_TO_TILE = {
    "marigold": 17,
    "borage": 18,
    "tansy": 19,
    "garlic": 20,
    "snakeroot": 21,
    'rat': 386,
    "snake": 387
}