import * as Phaser from 'phaser';

const WIDTH = 1920;
const HEIGHT = 1080;

const herbs = ['catmint', 'marigold', 'borage'];
const bowls = ['leaf', 'moss'];
const sauces = ['honey', 'sap'];
const toppings = ['poppy', 'juniper', 'tansy'];

export class MedicalMinigame extends Phaser.Scene {
    constructor() {
        super({ key: 'MedicalMinigame' });
    }

    init(data) {
        this._returnTo = data?.returnTo ?? 'Game';
        this.ingredientsUsed = 0;
        this._resultSent = false;

        this.ingredientUnlockDay = {
            leaf: 1,
            catmint: 1,
            marigold: 1,
            poppy: 1,
            moss: 4,
            borage: 2,
            honey: 3,
            sap: 5,
            tansy: 2,
            juniper: 5
        };

        this.sourceIngredients = [];
        this.customers = [null, null, null, null];
        this.orders = [null, null, null, null];
        this.orderBubbles = [null, null, null, null];
        this.customerZones = [null, null, null, null];
        this.food = [[], []];
        this.score_earned_this_day = 0;
        this.quota = 100;
        this.day = 1;
        this.dayEndTimestamp = 0;
        this.dayOver = false;

        this._dragStack = null;
        this._dragFromSlot = null;
        this._stackOffsetY = 14;

        this.ingredientTextureByItem = {
            leaf: 'leaf_food',
            moss: 'moss_food',
            catmint: 'catmint_food',
            marigold: 'marigold_food',
            borage: 'borage_food',
            tansy: 'tansy_food',
            poppy: 'poppy_seeds_food',
            juniper: 'juniper_berries_food',
            honey: 'honey_bottle',
            sap: 'sap_bottle'
        };

        this.customerTextures = [
            'customer1',
            'customer2',
            'customer3',
            'customer4',
            'customer5',
            'customer6',
            'customer7'
        ];

        this.customerSpawnEvent = null;
        this.dayConfig = null;
    }

    create() {
        this.overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x220022, 0.5)
            .setOrigin(0)
            .setInteractive();

        this.input.keyboard.once('keydown-ESC', () => this.finish());
        this.overlay.on('pointerdown', () => {});

        this.add.image(WIDTH / 2, HEIGHT / 2, 'mmg_background_2').setDepth(-100);
        
        this.add.image(WIDTH / 2, HEIGHT / 2, 'mmg_background').setScale(0.3);

        this.dayConfig = this.getDayConfig(this.day);
        this.dayEndTimestamp = Date.now() + this.dayConfig.timeMs;

        this.customerSpawnEvent = this.time.addEvent({
            delay: this.dayConfig.spawnMs,
            callback: this.summon_customer,
            callbackScope: this,
            loop: true
        });

        this.timerText = this.add.text(20, 20, '', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setDepth(100);

        this.scoreText = this.add.text(20, 60, '', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setDepth(100);

        this.dayPopupBg = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 700, 320, 0x000000, 0.75).setDepth(200).setVisible(false);
        this.dayPopupBox = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 680, 300, 0xaaaaaa, 0.95).setDepth(201).setVisible(false);
        this.dayPopupText = this.add.text(WIDTH / 2, HEIGHT / 2 - 40, '', {
            fontFamily: 'monospace',
            fontSize: '40px',
            color: '#000000'
        }).setOrigin(0.5).setDepth(202).setVisible(false);

        this.dayPopupButton = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 90, 220, 70, 0x669966)
            .setDepth(202)
            .setVisible(false)
            .setInteractive({ useHandCursor: true });

        this.dayPopupButtonText = this.add.text(WIDTH / 2, HEIGHT / 2 + 90, 'Continue', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#000000'
        }).setOrigin(0.5).setDepth(203).setVisible(false);

        this.dayPopupButton.on('pointerdown', () => {
            if (this.score_earned_this_day >= this.quota) this.nextDay();
            else this.finish();
        });

        this.left_food_space = this.add.rectangle(WIDTH / 2 - 75, HEIGHT * 3 / 4 + 150, 180, 220, 0x222222).setDepth(1).setAlpha(0);
        this.right_food_space = this.add.rectangle(WIDTH / 2 + 120, HEIGHT * 3 / 4 + 150, 180, 220, 0x222222).setDepth(1).setAlpha(0);

        this.left_food_zone = this.add.zone(this.left_food_space.x, this.left_food_space.y, this.left_food_space.width, this.left_food_space.height)
            .setRectangleDropZone(this.left_food_space.width, this.left_food_space.height)
            .setData('slot', 'left');

        this.right_food_zone = this.add.zone(this.right_food_space.x, this.right_food_space.y, this.right_food_space.width, this.right_food_space.height)
            .setRectangleDropZone(this.right_food_space.width, this.right_food_space.height)
            .setData('slot', 'right');

    const points = [
        WIDTH - 195, HEIGHT * 3 / 4 - 60, 
        WIDTH - 30, HEIGHT * 3 / 4 + 70, 
        WIDTH - 40, HEIGHT * 3 / 4 + 250, 
        WIDTH - 195, HEIGHT * 3 / 4 + 100
    ];

    this.trash_zone = this.add.zone(0, 0) 
        .setOrigin(0, 0)
        .setData('slot', 'trash');

    this.trash_zone.setInteractive(
        new Phaser.Geom.Polygon(points), 
        Phaser.Geom.Polygon.Contains
    );

    this.trash_zone.input.dropZone = true;

        this.ingredients = [];

        const createIngredientAt = (x, y, item) => {
            const textureKey = this.ingredientTextureByItem[item] || item;
            const obj = this.add.image(x, y, textureKey).setDepth(5);

            if (item === 'honey' || item === 'sap') obj.setDisplaySize(40, 80);
            else obj.setDisplaySize(160, 80);

            obj.setData('source', true);
            obj.setData('item', item);
            obj._orig = { x, y };
            obj._placed = false;
            obj._slot = null;
            obj._stackIndex = null;

            obj.setInteractive({ useHandCursor: true });
            this.input.setDraggable(obj);

            this.ingredients.push(obj);
            this.sourceIngredients.push(obj);
            return obj;
        };

        createIngredientAt(370, HEIGHT * 3 / 4 - 70, 'leaf');
        createIngredientAt(200, HEIGHT * 3 / 4 + 40, 'moss');
        createIngredientAt(380, HEIGHT * 3 / 4 + 150, 'catmint');
        createIngredientAt(555, HEIGHT * 3 / 4 + 150, 'marigold');
        createIngredientAt(730, HEIGHT * 3 / 4 + 150, 'borage');
        createIngredientAt(1270,  HEIGHT * 3 / 4 + 150, 'tansy');
        createIngredientAt(1452,HEIGHT * 3 / 4 + 150, 'poppy');
        createIngredientAt(1625, HEIGHT * 3 / 4 + 150, 'juniper');
        createIngredientAt(1365, HEIGHT * 3 / 4 - 25, 'honey');
        createIngredientAt(1315, HEIGHT * 3 / 4 - 25, 'sap');

        this.refreshUnlockedIngredients();

        const renderStack = (slotIndex) => {
            const slotRect = slotIndex === 0 ? this.left_food_space : this.right_food_space;
            const stack = this.food[slotIndex];

            for (let i = 0; i < stack.length; i++) {
                const it = stack[i];
                it._stackIndex = i;
                it._slot = slotIndex === 0 ? 'left' : 'right';
                it._placed = true;
                it.x = slotRect.x;
                it.y = slotRect.y - i * this._stackOffsetY;
                it.setDepth(5 + i);
            }
        };

        const pickupStackFromSlot = (slotIndex) => {
            const stack = this.food[slotIndex];
            if (!stack || stack.length === 0) return null;
            this.food[slotIndex] = [];
            return stack;
        };

        const placeStackOnSlot = (slotIndex, stack) => {
            if (!stack || stack.length === 0) return;
            this.food[slotIndex] = this.food[slotIndex].concat(stack);
            renderStack(slotIndex);
            for (const it of stack) {
                it._placed = true;
                it._slot = slotIndex === 0 ? 'left' : 'right';
            }
        };

        this.input.on('dragstart', (pointer, obj) => {
            if (obj._placed && obj._slot) {
                const slotIndex = obj._slot === 'left' ? 0 : 1;
                const stack = pickupStackFromSlot(slotIndex);
                if (stack) {
                    this._dragStack = stack;
                    this._dragFromSlot = slotIndex;
                    for (let i = 0; i < stack.length; i++) {
                        const it = stack[i];
                        it._dragOffset = {
                            x: it.x - pointer.x,
                            y: it.y - pointer.y
                        };
                        it.setDepth(60 + i);
                    }
                }
                return;
            }

            obj.setDepth(60);
            obj._dragOffset = { x: obj.x - pointer.x, y: obj.y - pointer.y };
        });

        this.input.on('drag', (pointer, obj, dragX, dragY) => {
            if (this._dragStack) {
                for (const it of this._dragStack) {
                    const off = it._dragOffset || { x: 0, y: 0 };
                    it.x = pointer.x + off.x;
                    it.y = pointer.y + off.y;
                }
                return;
            }

            obj.x = dragX;
            obj.y = dragY;
        });

        this.input.on('drop', (pointer, obj, dropZone) => {
            const hitCustomerIndex = this.customers.findIndex(c => c && c.getBounds && c.getBounds().contains(pointer.x, pointer.y));

            if (hitCustomerIndex >= 0) {
                if (this._dragStack) {
                    const stack = this._dragStack;
                    this._dragStack.forEach((item) => item.destroy());
                    this._dragStack = null;
                    this._dragFromSlot = null;
                    this.handleCustomerDelivery?.(stack, hitCustomerIndex);
                    return;
                }

                if (obj._slot === 'left' || obj._slot === 'right') {
                    const slotIndex = obj._slot === 'left' ? 0 : 1;
                    const stack = pickupStackFromSlot(slotIndex) || [];
                    this.handleCustomerDelivery?.(stack, hitCustomerIndex);
                    return;
                }

                this.handleCustomerDelivery?.([obj], hitCustomerIndex);
                return;
            }

            const slot = dropZone?.getData('slot');

            if (this._dragStack) {
                const stack = this._dragStack;
                this._dragStack = null;
                const fromSlot = this._dragFromSlot;
                this._dragFromSlot = null;

                if (slot === 'trash') {
                    for (const it of stack) it.destroy();
                    return;
                }

                if (slot === 'left' || slot === 'right') {
                    const targetIndex = slot === 'left' ? 0 : 1;
                    placeStackOnSlot(targetIndex, stack);
                    return;
                }

                placeStackOnSlot(fromSlot, stack);
                return;
            }

            if (!dropZone) {
                if (!obj._placed) {
                    obj.x = obj._orig.x;
                    obj.y = obj._orig.y;
                } else if (obj._slot === 'left') {
                    obj.x = this.left_food_space.x;
                    obj.y = this.left_food_space.y;
                } else if (obj._slot === 'right') {
                    obj.x = this.right_food_space.x;
                    obj.y = this.right_food_space.y;
                }
                return;
            }

            if (slot === 'trash') {
                if (obj._slot === 'left') this.food[0] = this.food[0].filter(i => i !== obj);
                if (obj._slot === 'right') this.food[1] = this.food[1].filter(i => i !== obj);
                obj.destroy();
                return;
            }

            const targetIdx = slot === 'left' ? 0 : 1;

            if (obj._slot === 'left') this.food[0] = this.food[0].filter(i => i !== obj);
            if (obj._slot === 'right') this.food[1] = this.food[1].filter(i => i !== obj);

            if (obj.getData('source')) {
                createIngredientAt(obj._orig.x, obj._orig.y, obj.getData('item'));
            }

            const item = obj.getData('item');
            if (item === 'honey') {
                obj.setTexture('honey_food');
                obj.setDisplaySize(160, 80);
            }
            if (item === 'sap') {
                obj.setTexture('sap_food');
                obj.setDisplaySize(160, 80);
            }

            this.food[targetIdx].push(obj);
            renderStack(targetIdx);
        });

        this.input.on('dragend', (pointer, obj, dropped) => {
            if (this._dragStack) {
                const stack = this._dragStack;
                const from = this._dragFromSlot;
                this._dragStack = null;
                this._dragFromSlot = null;
                placeStackOnSlot(from, stack);
                return;
            }

            if (!dropped) {
                if (!obj._placed) {
                    obj.x = obj._orig.x;
                    obj.y = obj._orig.y;
                } else if (obj._slot === 'left') {
                    obj.x = this.left_food_space.x;
                    obj.y = this.left_food_space.y;
                } else if (obj._slot === 'right') {
                    obj.x = this.right_food_space.x;
                    obj.y = this.right_food_space.y;
                }
            } else {
                if (obj._slot === 'left') renderStack(0);
                if (obj._slot === 'right') renderStack(1);
            }
        });

        this.summon_customer();
    }

    
    emitResults() {
        if (this._resultSent) return;
        this._resultSent = true;

        this.scene.get('UIScene')?.events.emit('medical-minigame-complete', {
            ingredientsUsed: this.ingredientsUsed,
            score: this.score_earned_this_day,
            quota: this.quota,
            day: this.day
        });
    }

    getDayConfig(day) {
        const configs = {
            1: { timeMs: 25000, quota: 60, spawnMs: 4200, bowls: ['leaf'], herbs: ['catmint', 'marigold'], toppings: ['poppy'], sauces: [] },
            2: { timeMs: 25000, quota: 100, spawnMs: 3900, bowls: ['leaf'], herbs: ['catmint', 'marigold', 'borage'], toppings: ['poppy', 'tansy'], sauces: [] },
            3: { timeMs: 27500, quota: 140, spawnMs: 3600, bowls: ['leaf'], herbs: ['catmint', 'marigold', 'borage'], toppings: ['poppy', 'tansy'], sauces: ['honey'] },
            4: { timeMs: 30000, quota: 170, spawnMs: 3300, bowls: ['leaf', 'moss'], herbs: ['catmint', 'marigold', 'borage'], toppings: ['poppy', 'tansy'], sauces: ['honey'] },
            5: { timeMs: 45000, quota: 200, spawnMs: 3000, bowls: ['leaf', 'moss'], herbs: ['catmint', 'marigold', 'borage'], toppings: ['poppy', 'juniper', 'tansy'], sauces: ['honey', 'sap'] }
        };

        let config = configs[day] || configs[5];
        if (day > 5) config.quota += 30 * (day - 5);
        return config;
    }

    finish() {
        this.emitResults();

        const gameScene = this.scene.get('Game');
        const uiScene = this.scene.get('UIScene');

        if (gameScene?.input) gameScene.input.enabled = true;
        if (uiScene?.input) uiScene.input.enabled = true;

        this.scene.stop();
    }

    summon_customer() {
        if (!this.customers.some(customer => customer == null)) return;

        const possibleCustomerSlots = this.customers
            .map((customer, index) => customer == null ? index : null)
            .filter(customer => customer != null);

        const newCustomerSlot = possibleCustomerSlots[Math.floor(Math.random() * possibleCustomerSlots.length)];
        const customerKey = this.customerTextures[Math.floor(Math.random() * this.customerTextures.length)];

        this.customers[newCustomerSlot] = this.add.image(newCustomerSlot > 1 ? 2100 : -180, 200, customerKey);
        this.customers[newCustomerSlot].setScale(0.75);

        this.tweens.add({
            targets: this.customers[newCustomerSlot],
            duration: 2000,
            x: newCustomerSlot * 300 + 575,
            y: 530,
            ease: 'Power1',
            onComplete: () => {
                this.customers[newCustomerSlot].setDepth(3);
                this.orders[newCustomerSlot] = this.generate_order();
                this.showOrderBubble(newCustomerSlot);

                const bounds = this.customers[newCustomerSlot].getBounds();
                const cz = this.add.zone(bounds.centerX, bounds.centerY, bounds.width, bounds.height)
                    .setRectangleDropZone(bounds.width, bounds.height)
                    .setData('customerIndex', newCustomerSlot)
                    .setDepth(3);

                this.customerZones[newCustomerSlot] = cz;
            }
        });
    }

    showOrderBubble(customerIndex) {
        const customer = this.customers[customerIndex];
        const order = this.orders[customerIndex];
        if (!customer || !order) return;

        this.orderBubbles[customerIndex]?.destroy();

        const bubbleHeight = order.length * 48 + 18;
        const bubble = this.add.container(
            customer.x,
            customer.y - (customer.height / 2) - (bubbleHeight / 2) - 50
        ).setDepth(10);

        const bg = this.add.rectangle(0, 0, 110, bubbleHeight, 0xaaaaaa, 0.9)
            .setStrokeStyle(2, 0x000000);

        bubble.add(bg);

        order.forEach((item, index) => {
            let key = this.ingredientTextureByItem[item] || item;
            if (item === 'honey') key = 'honey_food';
            if (item === 'sap') key = 'sap_food';

            const img = this.add.image(0, -((order.length - 1) * 24) + index * 48, key);
            img.setDisplaySize(108, 54);
            bubble.add(img);
        });

        this.orderBubbles[customerIndex] = bubble;
    }

    generate_order() {
        const recipe = this.getRecipeConfig(this.day);
        const pool = {
            bowls: ['leaf', 'moss'].filter(i => this.day >= (this.ingredientUnlockDay[i] ?? 1)),
            herbs: ['catmint', 'marigold', 'borage'].filter(i => this.day >= (this.ingredientUnlockDay[i] ?? 1)),
            toppings: ['poppy', 'juniper', 'tansy'].filter(i => this.day >= (this.ingredientUnlockDay[i] ?? 1)),
            sauces: ['honey', 'sap'].filter(i => this.day >= (this.ingredientUnlockDay[i] ?? 1))
        };

        const pick = arr => arr[Math.floor(Math.random() * arr.length)];
        const order = [];

        for (let i = 0; i < recipe.bowls && pool.bowls.length; i++) order.push(pick(pool.bowls));
        for (let i = 0; i < recipe.herbs && pool.herbs.length; i++) order.push(pick(pool.herbs));
        for (let i = 0; i < recipe.toppings && pool.toppings.length; i++) order.push(pick(pool.toppings));
        if (pool.sauces.length && Math.random() < recipe.sauceChance) order.push(pick(pool.sauces));

        return order.reverse();
    }

    refreshHud() {
        const remaining = Math.max(0, Math.ceil((this.dayEndTimestamp - Date.now()) / 1000));
        this.timerText.setText(`Time: ${remaining}`);
        this.scoreText.setText(`Score: ${this.score_earned_this_day} / ${this.quota}`);
    }

    nextDay() {
        this.day += 1;
        this.score_earned_this_day = 0;
        this.dayOver = false;

        this.dayConfig = this.getDayConfig(this.day);
        this.quota = this.dayConfig.quota;
        this.dayEndTimestamp = Date.now() + this.dayConfig.timeMs;

        this.remove_customers();

        this.customerSpawnEvent?.remove(false);
        this.customerSpawnEvent = this.time.addEvent({
            delay: this.dayConfig.spawnMs,
            callback: this.summon_customer,
            callbackScope: this,
            loop: true
        });

        this.refreshUnlockedIngredients();

        this.dayPopupBg.setVisible(false);
        this.dayPopupBox.setVisible(false);
        this.dayPopupText.setVisible(false);
        this.dayPopupButton.setVisible(false);
        this.dayPopupButtonText.setVisible(false);
    }

    remove_customers(){
        this.customers.forEach((customer) => {
            if (customer != null) {
                this.tweens.killTweensOf(customer);
                customer.destroy();
            }
        })

        this.orderBubbles.forEach((bubble) => {
            if (bubble != null) {
                bubble.destroy();
            }
        })

        this.customerZones.forEach((zone) => {
            if (zone != null) {
                zone.destroy();
            }
        })

        this.customers = [null, null, null, null];
        this.orders = [null, null, null, null];
        this.orderBubbles = [null, null, null, null];
        this.customerZones = [null, null, null, null];
    }

    showDayEndPopup() {
        if (this.dayOver) return;
        this.dayOver = true;

        const survived = this.score_earned_this_day >= this.quota;
        this.dayPopupBg.setVisible(true);
        this.dayPopupBox.setVisible(true);
        this.dayPopupText.setText(survived ? "You've survived" : 'You die');
        this.dayPopupText.setVisible(true);
        this.dayPopupButton.setVisible(true);
        this.dayPopupButtonText.setVisible(true);
        this.dayPopupButtonText.setText(survived ? 'Continue' : 'die')
    }

    handleCustomerDelivery(order, customerIndex) {
        const usedCount = order.length;
        order = order.map((ingredient) => ingredient.texture.key.substring(0, ingredient.texture.key.indexOf('_')));
        const customerOrder = this.orders[customerIndex];
        let fulfilled = true;

        if (order.length !== customerOrder.length) fulfilled = false;
        else {
            order = order.reverse();
            for (let i = 0; i < order.length; i++) {
                if (order[i] !== customerOrder[i]) fulfilled = false;
            }
        }

        if (fulfilled) {
            this.score_earned_this_day += 15 + (order.length * 10);
            this.refreshHud();
            this.ingredientsUsed += usedCount;
        }


        const bubble = this.orderBubbles[customerIndex];
        const bg = bubble.getAt(0); 
        const targetColorHex = fulfilled ? 0x449944 : 0x994444;
        const startColor = Phaser.Display.Color.ValueToColor(bg.fillColor);
        const endColor = Phaser.Display.Color.ValueToColor(targetColorHex);

        this.tweens.addCounter({
            from: 0,
            to: 100,
            duration: 1000,
            onUpdate: (tween) => {
                const step = tween.getValue();
                const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                    startColor, endColor, 100, step
                );

                bg.setFillStyle(
                    Phaser.Display.Color.GetColor(color.r, color.g, color.b)
                );
            }
        });

        const customer = this.customers[customerIndex];
        customer.setDepth(1);

        this.time.delayedCall(1000, () => {
            this.tweens.add({
                targets: customer,
                x: customerIndex < 2 ? -200 : 2180,
                y: 450,
                duration: 3000,
                ease: 'Power1',
                onComplete: () => {
                    this.customers[customerIndex].destroy();
                    this.customers[customerIndex] = null;
                }
            });
            this.tweens.add({
                targets: this.orderBubbles[customerIndex],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    this.orderBubbles[customerIndex]?.destroy();
                    this.orderBubbles[customerIndex] = null;
                }
            })
        });
    }

    refreshUnlockedIngredients() {
        for (const ing of this.sourceIngredients) {
            const unlockDay = this.ingredientUnlockDay[ing.getData('item')] ?? 1;
            const visible = this.day >= unlockDay;
            ing.setVisible(visible);
            ing.setActive(visible);
            if (ing.input) ing.input.enabled = visible;
        }
    }

    getRecipeConfig(day) {
        const configs = {
            1: { bowls: 1, herbs: 1, toppings: 1, sauceChance: 0 },
            2: { bowls: 1, herbs: 1, toppings: 1, sauceChance: 0 },
            3: { bowls: 1, herbs: 2, toppings: 1, sauceChance: 0.25 },
            4: { bowls: 1, herbs: 2, toppings: 1, sauceChance: 0.5 },
            5: { bowls: 1, herbs: 2, toppings: 1, sauceChance: 0.5 }
        };

        return configs[day] || configs[5];
    }

    update() {
        if (this.dayOver) return;

        this.refreshHud();

        if (Date.now() >= this.dayEndTimestamp) {
            this.showDayEndPopup();
        }
    }
}