import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
    }

    preload ()
    {
        this.load.setPath('assets');

        this.load.image('bg_tiles', 'tileset.png', {frameWidth: 8, frameHeight: 8});
        this.load.image('bg', 'bg.png')
        this.load.image('particle', 'particle.png');


        this.load.image('grey_north', 'grey_north.png')
        this.load.image('grey_south', 'grey_south.png')
        this.load.image('grey_east', 'grey_east.png')
        this.load.image('grey_west', 'grey_west.png')
        this.load.image('brown_north', 'brown_north.png')
        this.load.image('brown_south', 'brown_south.png')
        this.load.image('brown_east', 'brown_east.png')
        this.load.image('brown_west', 'brown_west.png')
        this.load.image('geji_north', 'geji_north.png')
        this.load.image('geji_south', 'geji_south.png')
        this.load.image('geji_east', 'geji_east.png')
        this.load.image('geji_west', 'geji_west.png')
        this.load.image('luna_north', 'fox_north.png')
        this.load.image('luna_south', 'fox_south.png')
        this.load.image('luna_east', 'fox_east.png')
        this.load.image('luna_west', 'fox_west.png')
        this.load.image('rat_north', 'rat_north.png')
        this.load.image('rat_south', 'rat_south.png')
        this.load.image('rat_east', 'rat_east.png')
        this.load.image('rat_west', 'rat_west.png')

        // NPCs
        this.load.image("orangebite", "yellowfang.png")
        this.load.image('nightclaw', 'nightclaw.png')
        this.load.image("plate", "plate.png")
        this.load.image("michaelstar", "michaelstar.png")
        this.load.image("mountainbreath", "mountainbreath.png")
        this.load.image("michaeljackson", "michaeljackson.png")
        this.load.image("chulkpaw", "chulkpaw.png")
        this.load.image("blueswirl", "blueswirl.png")
        this.load.image("momo", "momo.png")
        this.load.image("divinepaw", "divinepaw.png")
        this.load.image("mondaysnooze", "mondaysnooze.png")
        this.load.image("longface", "longface.png")
        this.load.image("rainsoul", "rainsoul.png")
        this.load.image('herb_box', 'herb_box.png')
        this.load.image('fernsong', 'fernsong.png')
        this.load.image('medical_minigame_start', 'medical_minigame_start.png')
        this.load.image('arcade_cabinet', 'arcade_cabinet.png')
        this.load.image('figgy', 'figgy.png')
        this.load.image('simon', 'simon.png')
        this.load.image('bottlecat', 'bottlecat.png')
        this.load.image('lev', 'lev.png')
        this.load.image('ghost', 'ghost.png')
        this.load.image('fancy', 'fancy.png')
        this.load.image('wizard', 'wizard.png')


        // Items
        this.load.image("rat", "rat.png")
        this.load.image("snake", "snake.png")
        this.load.image('marigold', 'marigold_item.png');
        this.load.image('borage', 'borage_item.png');
        this.load.image('tansy', 'tansy_item.png');
        this.load.image('garlic', 'garlic_item.png');
        this.load.image('snakeroot', 'snakeroot_item.png')

        // UI
        this.load.image('ui_tab_button', 'tab_button_frame.png');
        this.load.image('inventory_icon', 'inventory_icon.png');
        this.load.image('skills_icon', 'skills_icon.png')
        this.load.image('menu_tab', 'menu_tab.png')
        this.load.image('hunting_icon', 'hunting_icon.png')
        this.load.image('religion_icon', 'religion_icon.png')
        this.load.image('harvesting_icon', 'harvesting_icon.png')
        this.load.image('cooking_icon', 'cooking_icon.png')

        // Medical minigame
        this.load.image('mmg_background', 'mmg_background.png')
        this.load.image('mmg_background_2', 'mmg_background_2.png')
        this.load.image('leaf_food', 'leaf_food.png')
        this.load.image('catmint_food', 'catmint.png');
        this.load.image('marigold_food', 'marigold.png');
        this.load.image('borage_food', 'borage.png')
        this.load.image("tansy_food", "tansy_food.png");
        this.load.image('poppy_seeds_food', 'poppy_seeds.png');
        this.load.image('juniper_berries_food', 'juniper_berries.png');
        this.load.image('honey_bottle', 'honey_bottle.png');
        this.load.image('honey_food', 'honey_squirt.png')
        this.load.image('sap_food', 'sap.png')
        this.load.image('sap_bottle', 'sap_bottle.png')
        this.load.image('moss_food', 'moss.png')
        this.load.image('customer1', 'customer_1.png')
        this.load.image('customer2', 'customer_2.png')
        this.load.image('customer3', 'customer_3.png')
        this.load.image('customer4', 'customer_4.png')
        this.load.image('customer5', 'customer_5.png')
        this.load.image('customer6', 'customer_6.png')
        this.load.image('customer7', 'customer_7.png')
    }

    create ()
    {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        this.scene.start(isLocalhost ? 'Game' : 'MainMenu');
    }
}
