import { useRef, useState } from 'react';

import * as Phaser from 'phaser';
import { PhaserGame } from './PhaserGame';

function App ()
{

    document.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });

    return (
        <div id="app">
            <PhaserGame />
        </div>
    )
}

export default App
