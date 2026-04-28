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

        // Items
        this.load.image("rat", "rat.png")
        this.load.image("snake", "snake.png")

        // UI
        this.load.image('ui_tab_button', 'tab_button_frame.png');
        this.load.image('inventory_icon', 'inventory_icon.png');
        this.load.image('skills_icon', 'skills_icon.png')
        this.load.image('menu_tab', 'menu_tab.png')
        this.load.image('hunting_icon', 'hunting_icon.png')
        this.load.image('religion_icon', 'religion_icon.png')
    }

    create ()
    {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        this.scene.start(isLocalhost ? 'Game' : 'MainMenu');
    }
}
