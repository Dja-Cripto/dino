/**
 * CONFIGURAÇÃO VISUAL DO JOGO (design.js)
 * 
 * Este arquivo controla exclusivamente a aparência, escalas, offsets e imagens do jogo.
 * Nenhuma regra lógica ou física do jogo deve ser declarada aqui.
 */
const SavedDesignConfig = localStorage.getItem('dino_design_config');
let parsedConfig = null;
if (SavedDesignConfig) {
  try {
    const temp = JSON.parse(SavedDesignConfig);
    if (temp.player && temp.player.sprites && temp.player.sprites.jogador_idle) {
      parsedConfig = temp;
    } else {
      localStorage.removeItem('dino_design_config');
    }
  } catch (e) {
    localStorage.removeItem('dino_design_config');
  }
}
const DesignConfig = parsedConfig || {
  "DESIGN_MODE": false,
  "DEBUG": {
    "showHitboxes": false,
    "showPivot": false,
    "showObjectName": false,
    "showSpawnArea": false
  },
  "player": {
    "editorX": 60,
    "editorY": 173,
    "width": 53,
    "height": 75,
    "jumpForce": 12,
    "duckWidth": 59,
    "duckHeight": 50,
    "sprites": {
      "jogador_idle": "assets/player/jogador_idle.png",
      "jogador_correndo_1": "assets/player/jogador_correndo_1.png",
      "jogador_correndo_2": "assets/player/jogador_correndo_2.png",
      "jogador_correndo_3": "assets/player/jogador_correndo_3.png",
      "jogador_agachando": "assets/player/jogador_agachando.png",
      "jogador_pulando": "assets/player/jogador_pulando.png",
      "jogador_derrotado": "assets/player/jogador_derrotado.png"
    },
    "scale": 1.05,
    "offsetX": -4,
    "offsetY": -3,
    "rotation": 0,
    "flipX": false,
    "flipY": false,
    "opacity": 1,
    "zIndex": 5,
    "animationSpeed": 5
  },
  "obstacles": {
    "sprites": {
      "obstaculo_1": "assets/obstacles/obstaculo_1.png",
      "obstaculo_2": "assets/obstacles/obstaculo_2.png",
      "obstaculo_3": "assets/obstacles/obstaculo_3.png",
      "obstaculo_4": "assets/obstacles/obstaculo_4.png",
      "obstaculo_5": "assets/obstacles/obstaculo_5.png",
      "obstaculo_6": "assets/obstacles/obstaculo_6.png",
      "obstaculo_7": "assets/obstacles/obstaculo_7.png",
      "obstaculo_8": "assets/obstacles/obstaculo_8.png"
    },
    "obstaculo_1": {
      "editorX": 161,
      "editorY": 166,
      "width": 58,
      "height": 85,
      "scale": 1,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 4
    },
    "obstaculo_2": {
      "editorX": 238,
      "editorY": 170,
      "width": 78,
      "height": 81,
      "scale": 1,
      "offsetX": 7,
      "offsetY": 3,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 4
    },
    "obstaculo_3": {
      "editorX": 332,
      "editorY": 185,
      "width": 88,
      "height": 67,
      "scale": 1,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 4
    },
    "obstaculo_4": {
      "editorX": 432,
      "editorY": 181,
      "width": 103,
      "height": 74,
      "scale": 1,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 4
    },
    "obstaculo_5": {
      "editorX": 530,
      "editorY": 170,
      "width": 69,
      "height": 80,
      "scale": 1,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 4
    },
    "obstaculo_6": {
      "editorX": 630,
      "editorY": 170,
      "width": 74,
      "height": 80,
      "scale": 1,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 4
    },
    "obstaculo_7": {
      "editorX": 730,
      "editorY": 195,
      "width": 107,
      "height": 55,
      "scale": 1,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 4
    },
    "obstaculo_8": {
      "editorX": 850,
      "editorY": 175,
      "width": 74,
      "height": 75,
      "scale": 1,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 4
    }
  },
  "birds": {
    "editorX": 460,
    "editorY": 95,
    "width": 84,
    "height": 49,
    "sprites": {
      "passaro_asa_cima": "assets/birds/passaro_asa_cima.png",
      "passaro_asa_baixo": "assets/birds/passaro_asa_baixo.png"
    },
    "scale": 1,
    "offsetX": -1,
    "offsetY": -5,
    "rotation": 0,
    "flipX": false,
    "flipY": false,
    "opacity": 1,
    "zIndex": 4
  },
  "projectiles": {
    "editorX": 130,
    "editorY": 200,
    "width": 32,
    "height": 32,
    "sprite": "assets/projectiles/projetil.png",
    "scale": 1,
    "offsetX": 0,
    "offsetY": 0,
    "rotation": 0,
    "flipX": false,
    "flipY": false,
    "opacity": 1,
    "zIndex": 3
  },
  "bonus": {
    "sprites": {
      "bonus_1": "assets/bonus/bonus_1.png",
      "bonus_2": "assets/bonus/bonus_2.png",
      "bonus_3": "assets/bonus/bonus_3.png",
      "bonus_4": "assets/bonus/bonus_4.png"
    },
    "bonus_1": {
      "editorX": 628,
      "editorY": 160,
      "width": 34,
      "height": 35,
      "scale": 1.25,
      "offsetX": 2,
      "offsetY": -1,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 3
    },
    "bonus_2": {
      "editorX": 695,
      "editorY": 162,
      "width": 29,
      "height": 29,
      "scale": 1.25,
      "offsetX": 1,
      "offsetY": -1,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 3
    },
    "bonus_3": {
      "editorX": 750,
      "editorY": 161,
      "width": 30,
      "height": 28,
      "scale": 1.25,
      "offsetX": -1,
      "offsetY": -1,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 3
    },
    "bonus_4": {
      "editorX": 803,
      "editorY": 155,
      "width": 34,
      "height": 32,
      "scale": 1.25,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "flipX": false,
      "flipY": false,
      "opacity": 1,
      "zIndex": 3
    }
  },
  "ground": {
    "sprite": "assets/ground/chao.png",
    "editorY": 248,
    "scale": 0.5,
    "offsetY": -14,
    "opacity": 1,
    "zIndex": 3,
    "editorX": 0,
    "width": 1200,
    "height": 12
  },
  "clouds": {
    "editorX": 620,
    "editorY": 35,
    "width": 80,
    "height": 14,
    "sprites": [
      "assets/clouds/nuvem_1.png",
      "assets/clouds/nuvem_2.png",
      "assets/clouds/nuvem_3.png",
      "assets/clouds/nuvem_4.png"
    ],
    "scale": 1.5,
    "offsetX": 0,
    "offsetY": 0,
    "opacity": 0.85,
    "zIndex": 1
  },
  "background": {
    "sprites": {
      "fundo_dia": "assets/background/fundo_dia.png",
      "fundo_noite": "assets/background/fundo_noite.png"
    },
    "scale": 3,
    "offsetX": -1,
    "offsetY": -480,
    "opacity": 1,
    "zIndex": 0,
    "editorX": 0,
    "editorY": 0,
    "width": 1200,
    "height": 300
  },
  "ui": {
    "opacity": 1,
    "zIndex": 10,
    "editorX": 670,
    "editorY": 15,
    "width": 110,
    "height": 20
  }
};
