/**
 * GAME ENGINE & DESIGN LAYER (script.js - Versão Pura Vetorial)
 * 
 * Este arquivo gerencia a lógica, física, fluxos e o editor de cena
 * integrado do Dino Chrome, rodando exclusivamente em modo vetorial procedural.
 */

/**
 * SISTEMA DE ASSETS (Carregamento Desativado - Fallback Vetorial Forçado)
 */
class AssetManager {
  static images = {};
  static total = 0;
  static loaded = 0;
  static onCompleteCallback = null;

  static load(onComplete) {
    this.onCompleteCallback = onComplete;
    const paths = [];

    // Extrai sprites do Player
    for (const key in DesignConfig.player.sprites) {
      paths.push({ key: key, path: DesignConfig.player.sprites[key] });
    }
    // Extrai sprites dos Obstáculos
    for (const key in DesignConfig.obstacles.sprites) {
      paths.push({ key: `obstacle_${key}`, path: DesignConfig.obstacles.sprites[key] });
    }
    // Extrai sprites dos Pássaros
    for (const key in DesignConfig.birds.sprites) {
      paths.push({ key: key, path: DesignConfig.birds.sprites[key] });
    }
    // Projétil
    paths.push({ key: 'projectile', path: DesignConfig.projectiles.sprite });
    // Alvos Bônus
    for (const key in DesignConfig.bonus.sprites) {
      paths.push({ key: key, path: DesignConfig.bonus.sprites[key] });
    }
    // Chão
    paths.push({ key: 'ground', path: DesignConfig.ground.sprite });
    // Nuvens
    DesignConfig.clouds.sprites.forEach((path, idx) => {
      paths.push({ key: `cloud_${idx}`, path: path });
    });
    // Fundo
    for (const key in DesignConfig.background.sprites) {
      paths.push({ key: `background_${key}`, path: DesignConfig.background.sprites[key] });
    }

    this.total = paths.length;
    this.loaded = 0;

    if (this.total === 0) {
      if (onComplete) onComplete();
      return;
    }

    paths.forEach(item => {
      const img = new Image();
      img.src = item.path;
      img.onload = () => {
        // Se a imagem for um placeholder vazio (0 pixels de largura/altura), ignora e usa fallback
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          this.images[item.key] = null;
        } else {
          this.images[item.key] = img;
        }
        this.checkProgress();
      };
      img.onerror = () => {
        this.images[item.key] = null;
        this.checkProgress();
      };
    });
  }

  static checkProgress() {
    this.loaded++;
    if (this.loaded >= this.total) {
      if (this.onCompleteCallback) this.onCompleteCallback();
    }
  }

  static get(key) {
    return this.images[key] || null;
  }

  static reload(key, path) {
    const img = new Image();
    img.src = path;
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        this.images[key] = img;
      }
    };
    img.onerror = () => {
      this.images[key] = null;
    };
  }
}

/**
 * CONFIGURAÇÕES GLOBAIS DA LÓGICA DO JOGO
 */
const Config = {
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 300,
  GROUND_Y: 248,
  
  // Física
  GRAVITY: 0.6,
  JUMP_FORCE: -14.5,
  INITIAL_SPEED: 7,
  MAX_SPEED: 16,
  SPEED_ACCEL: 0.0015,
  
  // Spawn
  SPAWN_DISTANCE_MIN: 300,
  SPAWN_DISTANCE_MAX: 600,
  BIRD_START_SCORE: 500,
  
  BONUS_START_SCORE: 100,
  BONUS_SPAWN_MIN: 400,
  BONUS_SPAWN_MAX: 800,
  BONUS_POINTS: 10,
  
  // Disparos
  SHOOT_KEY_1: 'KeyX',
  SHOOT_KEY_2: 'KeyZ',
  MAX_PROJECTILES: 3,
  PROJECTILE_SPEED: 10,
  
  // Dimensões físicas para Colisão
  PLAYER_WIDTH: 44,
  PLAYER_HEIGHT: 47,
  PLAYER_DUCK_WIDTH: 71,
  PLAYER_DUCK_HEIGHT: 48,
  
  FPS_TARGET: 60
};

// Estados do Jogo
const State = {
  MENU: 'MENU',
  HOW_TO_PLAY: 'HOW_TO_PLAY',
  CREDITS: 'CREDITS',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
  GAME_WIN: 'GAME_WIN',
  SCENE_EDITOR: 'SCENE_EDITOR',
  SCORE_BOARD: 'SCORE_BOARD'
};

/**
 * SISTEMA DE INPUTS
 */
class Input {
  constructor(canvas) {
    this.keys = {};
    this.isJumping = false;
    this.isDucking = false;
    this.mouseX = -1;
    this.mouseY = -1;
    this.touchStartY = 0;
    this.touchStartX = 0;
    this.init(canvas);
  }

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.isJumping = true;
        e.preventDefault();
      }
      if (e.code === 'ArrowDown') {
        this.isDucking = true;
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.isJumping = false;
      }
      if (e.code === 'ArrowDown') {
        this.isDucking = false;
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      // Aplica correção de zoom do editor quando ativo
      const zoom = window._editorZoom || 1;
      this.mouseX = (e.clientX - rect.left) / zoom * (Config.CANVAS_WIDTH / (rect.width / zoom));
      this.mouseY = (e.clientY - rect.top) / zoom * (Config.CANVAS_HEIGHT / (rect.height / zoom));
    });

    canvas.addEventListener('mouseleave', () => {
      this.mouseX = -1;
      this.mouseY = -1;
    });

    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.touchStartY = touch.clientY;
      this.touchStartX = touch.clientX;
      this.isJumping = true;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const diffY = touch.clientY - this.touchStartY;
      if (diffY > 30) {
        this.isDucking = true;
        this.isJumping = false;
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isJumping = false;
      this.isDucking = false;
    }, { passive: true });
  }
}

/**
 * SISTEMA DE AUDIO (Web Audio API)
 */
class Audio {
  constructor() {
    this.ctx = null;
    this.sfxMuted = localStorage.getItem('dino_sfx_muted') === 'true';
    this.musicMuted = localStorage.getItem('dino_music_muted') === 'true';
    this.musicPlaying = false;
    this.music = null;
    this.volume = parseFloat(localStorage.getItem('dino_audio_volume') ?? '0.3');
    this.lastVolume = this.volume > 0 ? this.volume : 0.3;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.music) {
      this.music = new window.Audio('music/music.MP3');
      this.music.loop = true;
      this.music.volume = this.musicMuted ? 0 : this.volume;
    }
  }

  startMusic() {
    this.init();
    if (!this.music) return;
    
    this.music.volume = this.musicMuted ? 0 : this.volume;
    if (this.musicPlaying) return;

    this.music.play().then(() => {
      this.musicPlaying = true;
    }).catch(err => {
      console.log("Autoplay bloqueado ou erro ao tocar música:", err);
    });
  }

  stopMusic() {
    if (this.music) {
      this.music.pause();
    }
    this.musicPlaying = false;
  }

  setVolume(value) {
    this.volume = parseFloat(value);
    localStorage.setItem('dino_audio_volume', this.volume.toString());
    if (this.music && !this.musicMuted) {
      this.music.volume = this.volume;
    }
    if (this.volume > 0) {
      this.lastVolume = this.volume;
    }
  }

  toggleMusicMute() {
    this.musicMuted = !this.musicMuted;
    localStorage.setItem('dino_music_muted', this.musicMuted ? 'true' : 'false');
    if (this.music) {
      this.music.volume = this.musicMuted ? 0 : this.volume;
    }
    return this.musicMuted;
  }

  toggleSfxMute() {
    this.sfxMuted = !this.sfxMuted;
    localStorage.setItem('dino_sfx_muted', this.sfxMuted ? 'true' : 'false');
    return this.sfxMuted;
  }

  playJump() {
    this.init();
    if (!this.ctx || this.sfxMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playScore() {
    this.init();
    if (!this.ctx || this.sfxMuted) return;
    const now = this.ctx.currentTime;
    const playBeep = (freq, startTime, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.setValueAtTime(0.08, startTime + duration - 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    playBeep(880, now, 0.08);
    playBeep(980, now + 0.08, 0.08);
  }

  playShoot() {
    this.init();
    if (!this.ctx || this.sfxMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playBonus() {
    this.init();
    if (!this.ctx || this.sfxMuted) return;
    const now = this.ctx.currentTime;
    const playChime = (freq, start, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.07, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    playChime(523.25, now, 0.12);
    playChime(659.25, now + 0.06, 0.15);
  }

  playGameOver() {
    this.init();
    if (!this.ctx || this.sfxMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.35);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.35);
  }
}

/**
 * PERSONAGEM PRINCIPAL (Player)
 */
class Player {
  constructor() {
    this.x = 50;
    this.width = DesignConfig.player.width || Config.PLAYER_WIDTH;
    this.height = DesignConfig.player.height || Config.PLAYER_HEIGHT;
    this.y = Config.GROUND_Y - this.height;
    this.velocityY = 0;
    this.isJumping = false;
    this.isDucking = false;
    this.state = 'RUNNING';
    
    this.runFrame = 0;
    this.runTimer = 0;
    this.throwFrame = 0;
  }

  update(input, dt) {
    if (this.state === 'DEAD') return;

    if (this.throwFrame > 0) {
      this.throwFrame -= dt;
    }

    if (input.isDucking && !this.isJumping) {
      this.isDucking = true;
      this.width = DesignConfig.player.duckWidth || Config.PLAYER_DUCK_WIDTH;
      this.height = DesignConfig.player.duckHeight || Config.PLAYER_DUCK_HEIGHT;
      this.y = Config.GROUND_Y - this.height;
      this.state = 'DUCKING';
    } else {
      this.isDucking = false;
      this.width = DesignConfig.player.width || Config.PLAYER_WIDTH;
      this.height = DesignConfig.player.height || Config.PLAYER_HEIGHT;
      if (!this.isJumping) {
        this.y = Config.GROUND_Y - this.height;
        this.state = 'RUNNING';
      }
    }

    if (input.isJumping && !this.isJumping) {
      this.velocityY = -(DesignConfig.player.jumpForce || 14.5);
      this.isJumping = true;
      this.state = 'JUMPING';
    }

    if (this.isJumping) {
      let currentGravity = Config.GRAVITY;
      if (!input.isJumping && this.velocityY < 0) {
        currentGravity += 0.8;
      }
      
      if (input.isDucking) {
        currentGravity += 2.0;
      }

      this.velocityY += currentGravity * dt;
      this.y += this.velocityY * dt;

      if (this.y >= Config.GROUND_Y - this.height) {
        this.y = Config.GROUND_Y - this.height;
        this.velocityY = 0;
        this.isJumping = false;
        this.state = this.isDucking ? 'DUCKING' : 'RUNNING';
      }
    }

    if (!this.isJumping && this.state !== 'DEAD') {
      this.runTimer += dt;
      if (this.runTimer >= 6) {
        this.runFrame = (this.runFrame + 1) % 2;
        this.runTimer = 0;
      }
    }
  }

  getHitboxes() {
    if (this.isDucking) {
      return [
        { x: this.x + 32, y: this.y + 2, width: 24, height: 14 },
        { x: this.x, y: this.y + 12, width: 44, height: 16 }
      ];
    } else {
      return [
        { x: this.x + 20, y: this.y, width: 22, height: 16 },
        { x: this.x + 4, y: this.y + 16, width: 30, height: 18 },
        { x: this.x + 10, y: this.y + 34, width: 18, height: 13 }
      ];
    }
  }
}

/**
 * PROJÉTIL (Disparo)
 */
class Projectile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = DesignConfig.projectiles.width || 7;
    this.height = DesignConfig.projectiles.height || 7;
  }

  update(dt) {
    this.x += Config.PROJECTILE_SPEED * dt;
  }

  getHitboxes() {
    return [{ x: this.x, y: this.y, width: this.width, height: this.height }];
  }
}

/**
 * ALVO BÔNUS (Variação de 4 tipos)
 */
class BonusTarget {
  constructor(type) {
    this.type = type || 'bonus_1';
    const bc = DesignConfig.bonus[this.type] || {};
    this.width = bc.width || 16;
    this.height = bc.height || 16;
    this.x = Config.CANVAS_WIDTH;
    
    // Posições verticais variadas (não fixadas todas na mesma altura)
    const heights = [
      Config.GROUND_Y - 30,  // baixo (pode pular por cima ou pegar correndo)
      Config.GROUND_Y - 70,  // médio (pega pulando)
      Config.GROUND_Y - 110, // alto (pega com pulo alto)
      Config.GROUND_Y - 150  // muito alto
    ];
    this.baseY = heights[Math.floor(Math.random() * heights.length)];
    this.y = this.baseY;
    
    this.pulseFrame = 0;
    this.pulseTimer = 0;
    
    // Movimento oscilatório vertical para criar variação de dificuldade (se mexendo)
    this.oscillationTimer = Math.random() * Math.PI * 2;
    const rand = Math.random();
    if (rand < 0.4) {
      this.oscillationAmplitude = 15;
      this.oscillationSpeed = 0.05;
    } else if (rand < 0.8) {
      this.oscillationAmplitude = 30;
      this.oscillationSpeed = 0.09;
    } else {
      this.oscillationAmplitude = 45;
      this.oscillationSpeed = 0.15;
    }
  }

  update(speed, dt) {
    this.x -= speed * dt;
    
    // Atualiza movimento oscilatório vertical
    this.oscillationTimer += this.oscillationSpeed * dt;
    this.y = this.baseY + Math.sin(this.oscillationTimer) * this.oscillationAmplitude;
    
    // Garante que o bônus não saia da tela ou atravesse o chão
    const minY = 10;
    const maxY = Config.GROUND_Y - this.height - 5;
    if (this.y < minY) this.y = minY;
    if (this.y > maxY) this.y = maxY;
    
    this.pulseTimer += dt;
    if (this.pulseTimer >= 8) {
      this.pulseFrame = (this.pulseFrame + 1) % 2;
      this.pulseTimer = 0;
    }
  }

  getHitboxes() {
    return [{ x: this.x, y: this.y, width: this.width, height: this.height }];
  }
}

/**
 * TEXTO FLUTUANTE
 */
class FloatingText {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.alpha = 1.0;
    this.velocityY = -1.2;
  }

  update(dt) {
    this.y += this.velocityY * dt;
    this.alpha -= 0.03 * dt;
  }
}

/**
 * OBSTÁCULO (Mínimo de 4 cactos mapeados)
 */
class Obstacle {
  constructor(type) {
    this.type = type;
    this.x = Config.CANVAS_WIDTH;
    // Lê config individual deste tipo de cacto
    const oc = DesignConfig.obstacles[type] || {};
    // Dimensões padrão por tipo se não houver config salva
    const defaults = {
      obstaculo_1: { width: 17, height: 35 },
      obstaculo_2: { width: 34, height: 35 },
      obstaculo_3: { width: 25, height: 50 },
      obstaculo_4: { width: 75, height: 50 },
      obstaculo_5: { width: 69, height: 80 },
      obstaculo_6: { width: 74, height: 80 },
      obstaculo_7: { width: 107, height: 55 },
      obstaculo_8: { width: 74, height: 75 }
    };
    const def = defaults[type] || { width: 17, height: 35 };
    this.width  = oc.width  || def.width;
    this.height = oc.height || def.height;
    // editorY salvo = posição vertical de spawn
    this.y = (oc.editorY !== undefined) ? oc.editorY : Config.GROUND_Y - this.height;
  }

  update(speed, dt) {
    this.x -= speed * dt;
  }

  getHitboxes() {
    return [
      {
        x: this.x + 2,
        y: this.y + 2,
        width: this.width - 4,
        height: this.height - 2
      }
    ];
  }
}

/**
 * PÁSSARO (Obstáculo Voador)
 */
class Bird {
  constructor(flyHeight) {
    this.x = Config.CANVAS_WIDTH;
    this.width = DesignConfig.birds.width || 46;
    this.height = DesignConfig.birds.height || 32;
    this.flyHeight = flyHeight;
    
    if (flyHeight === 'low') {
      this.y = Config.GROUND_Y - 70; // Voando, mas baixo (requer agachar)
    } else if (flyHeight === 'mid') {
      this.y = Config.GROUND_Y - 95; // Voando, médio (requer agachar ou correr)
    } else {
      this.y = Config.GROUND_Y - 120; // Voando alto (passa se correr, morre se pular)
    }

    this.wingFrame = 0;
    this.wingTimer = 0;
  }

  update(speed, dt) {
    this.x -= speed * dt;
    this.wingTimer += dt;
    if (this.wingTimer >= 10) {
      this.wingFrame = (this.wingFrame + 1) % 2;
      this.wingTimer = 0;
    }
  }

  getHitboxes() {
    const boxes = [
      { x: this.x + 4, y: this.y + 10, width: this.width - 8, height: 12 }
    ];
    
    if (this.wingFrame === 0) {
      boxes.push({ x: this.x + 16, y: this.y, width: 14, height: 10 });
    } else {
      boxes.push({ x: this.x + 16, y: this.y + 22, width: 14, height: 10 });
    }
    
    return boxes;
  }
}

/**
 * NUVENS (Decorações de fundo)
 */
class Cloud {
  constructor() {
    this.x = Config.CANVAS_WIDTH + Math.random() * 200;
    this.y = 10 + Math.random() * 25;
    // Nuvens correndo de forma mais lenta (speedFactor reduzido)
    this.speedFactor = 0.05 + Math.random() * 0.08;
    this.width = DesignConfig.clouds.width || 80;
    this.spriteIndex = Math.floor(Math.random() * DesignConfig.clouds.sprites.length);
  }

  update(speed, dt) {
    this.x -= speed * this.speedFactor * dt;
  }
}

/**
 * CHÃO
 */
class Ground {
  constructor() {
    this.groundX = 0;
    this.details = [];
    for (let i = 0; i < 25; i++) {
      this.details.push({
        x: Math.random() * Config.CANVAS_WIDTH,
        length: 2 + Math.random() * 12,
        yOffset: 2 + Math.random() * 12
      });
    }
  }

  update(speed, dt) {
    this.groundX = (this.groundX - speed * dt) % Config.CANVAS_WIDTH;
  }
}

/**
 * PONTUAÇÃO (Score)
 */
class Score {
  constructor() {
    this.currentScore = 0;
    this.highScore = parseInt(localStorage.getItem('dino_high_score') || '0', 10);
    this.scoreBuffer = 0;
  }

  update(speed, dt, audio) {
    this.scoreBuffer += 0.08 * dt;
    if (this.scoreBuffer >= 1) {
      const addedPoints = Math.floor(this.scoreBuffer);
      this.currentScore += addedPoints;
      this.scoreBuffer %= 1;

      if (this.currentScore > 0 && this.currentScore % 100 === 0) {
        audio.playScore();
      }

      if (this.currentScore > this.highScore) {
        this.highScore = this.currentScore;
        localStorage.setItem('dino_high_score', this.highScore.toString());
      }
    }
  }

  reset() {
    this.currentScore = 0;
    this.scoreBuffer = 0;
  }
}

/**
 * SISTEMA DE COLISÕES
 */
class Collision {
  static check(entityA, entityB) {
    const boxesA = entityA.getHitboxes();
    const boxesB = entityB.getHitboxes();

    for (let i = 0; i < boxesA.length; i++) {
      const boxA = boxesA[i];
      for (let j = 0; j < boxesB.length; j++) {
        const boxB = boxesB[j];

        if (
          boxA.x < boxB.x + boxB.width &&
          boxA.x + boxA.width > boxB.x &&
          boxA.y < boxB.y + boxB.height &&
          boxA.y + boxA.height > boxB.y
        ) {
          return true;
        }
      }
    }
    return false;
  }
}

/**
 * MENU PRINCIPAL E NAVEGAÇÃO DE PÁGINAS
 */
class MainMenu {
  constructor() {
    this.hoveredButton = null;
    this.buttons = {
      menu: [
        { id: 'PLAY', label: 'JOGAR', x: 530, y: 120, w: 140, h: 26 },
        { id: 'HOW_TO_PLAY', label: 'COMO JOGAR', x: 530, y: 155, w: 140, h: 26 },
        { id: 'SCORE', label: 'RECORDES', x: 530, y: 190, w: 140, h: 26 },
        { id: 'CREDITS', label: 'CRÉDITOS', x: 530, y: 225, w: 140, h: 26 }
      ],
      howToPlay: [
        { id: 'BACK', label: 'VOLTAR', x: 530, y: 170, w: 140, h: 26 }
      ],
      credits: [
        { id: 'PORTFOLIO', label: 'VER PORTFÓLIO', x: 530, y: 240, w: 160, h: 26 },
        { id: 'BACK', label: 'VOLTAR', x: 530, y: 240, w: 120, h: 26 }
      ],
      scoreBoard: [
        { id: 'BACK', label: 'VOLTAR', x: 530, y: 195, w: 140, h: 26 }
      ],
      gameOver: [
        { id: 'RETRY', label: 'JOGAR NOVAMENTE', x: 310, y: 180, w: 180, h: 32 },
        { id: 'REGISTER_SCORE', label: 'REGISTRAR SCORE', x: 510, y: 180, w: 180, h: 32 },
        { id: 'MAIN_MENU', label: 'MENU PRINCIPAL', x: 710, y: 180, w: 180, h: 32 }
      ],
      gameWin: [
        { id: 'REGISTER_SCORE', label: 'REGISTRAR SCORE', x: 410, y: 180, w: 180, h: 32 },
        { id: 'MAIN_MENU', label: 'MENU PRINCIPAL', x: 610, y: 180, w: 180, h: 32 }
      ]
    };
  }

  getButtonsForState(state) {
    if (state === State.MENU) return this.buttons.menu;
    if (state === State.HOW_TO_PLAY) return this.buttons.howToPlay;
    if (state === State.CREDITS) return this.buttons.credits;
    if (state === State.SCORE_BOARD) return this.buttons.scoreBoard;
    if (state === State.GAME_OVER) return this.buttons.gameOver;
    if (state === State.GAME_WIN) return this.buttons.gameWin;
    return [];
  }

  getFormattedButtons(state, centerX, isMobile) {
    const rawButtons = this.getButtonsForState(state);
    
    // Se for mobile/tablet (zoom ativo), empilhamos botões de Game Over verticalmente
    if (state === State.GAME_OVER && isMobile) {
      return [
        { id: 'RETRY', label: 'JOGAR NOVAMENTE', x: centerX - 90, y: 125, w: 180, h: 24 },
        { id: 'REGISTER_SCORE', label: 'REGISTRAR SCORE', x: centerX - 90, y: 155, w: 180, h: 24 },
        { id: 'MAIN_MENU', label: 'MENU PRINCIPAL', x: centerX - 90, y: 185, w: 180, h: 24 }
      ];
    }
    
    if (state === State.GAME_OVER) {
      // Layout horizontal padrão para desktop
      return [
        { id: 'RETRY', label: 'JOGAR NOVAMENTE', x: centerX - 290, y: 180, w: 180, h: 32 },
        { id: 'REGISTER_SCORE', label: 'REGISTRAR SCORE', x: centerX - 90, y: 180, w: 180, h: 32 },
        { id: 'MAIN_MENU', label: 'MENU PRINCIPAL', x: centerX + 110, y: 180, w: 180, h: 32 }
      ];
    }

    if (state === State.GAME_WIN && isMobile) {
      return [
        { id: 'REGISTER_SCORE', label: 'REGISTRAR SCORE', x: centerX - 90, y: 140, w: 180, h: 26 },
        { id: 'MAIN_MENU', label: 'MENU PRINCIPAL', x: centerX - 90, y: 175, w: 180, h: 26 }
      ];
    }
    
    if (state === State.GAME_WIN) {
      return [
        { id: 'REGISTER_SCORE', label: 'REGISTRAR SCORE', x: centerX - 190, y: 180, w: 180, h: 32 },
        { id: 'MAIN_MENU', label: 'MENU PRINCIPAL', x: centerX + 10, y: 180, w: 180, h: 32 }
      ];
    }

    if (state === State.CREDITS) {
      // Dois botões lado a lado: total width = 160 + 120 + 20 (gap) = 300
      return [
        { id: 'PORTFOLIO', label: 'VER PORTFÓLIO', x: centerX - 150, y: 240, w: 160, h: 26 },
        { id: 'BACK', label: 'VOLTAR', x: centerX + 30, y: 240, w: 120, h: 26 }
      ];
    }

    // Outros menus: centraliza horizontalmente baseado no viewport
    return rawButtons.map(btn => ({
      ...btn,
      x: centerX - btn.w / 2
    }));
  }

  updateHover(mouseX, mouseY, activeButtons, canvas) {
    this.hoveredButton = null;
    
    for (const btn of activeButtons) {
      if (
        mouseX >= btn.x && mouseX <= btn.x + btn.w &&
        mouseY >= btn.y && mouseY <= btn.y + btn.h
      ) {
        this.hoveredButton = btn.id;
        break;
      }
    }
    
    if (this.hoveredButton) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }
  }

  handleClick(mouseX, mouseY, game, activeButtons) {
    let clickedId = null;

    for (const btn of activeButtons) {
      if (
        mouseX >= btn.x && mouseX <= btn.x + btn.w &&
        mouseY >= btn.y && mouseY <= btn.y + btn.h
      ) {
        clickedId = btn.id;
        break;
      }
    }

    if (clickedId) {
      game.audio.playJump();
      
      if (clickedId === 'PLAY') {
        game.reset();
        game.state = State.PLAYING;
      } else if (clickedId === 'HOW_TO_PLAY') {
        game.state = State.HOW_TO_PLAY;
      } else if (clickedId === 'CREDITS') {
        game.state = State.CREDITS;
      } else if (clickedId === 'SCORE') {
        game.fetchScores();
        game.state = State.SCORE_BOARD;
      } else if (clickedId === 'SCENE_EDITOR') {
        game.toggleSceneEditor();
      } else if (clickedId === 'BACK') {
        game.state = State.MENU;
        game.audio.startMusic();
      } else if (clickedId === 'PORTFOLIO') {
        window.open(game.portfolioUrl || '../../index.html', '_blank');
      }
      
      this.hoveredButton = null;
      game.canvas.style.cursor = 'default';
      return true;
    }
    return false;
  }
}

/**
 * SISTEMA DE ELEMENTOS DE UI
 */
class UI {
  static drawButton(ctx, btn, isHovered, dayModePercent, renderer) {
    const isDay = dayModePercent > 0.5;
    const config = DesignConfig.ui;
    
    let bgColor = isDay ? 'rgba(235, 236, 240, 0.85)' : (config.buttonBg || 'rgba(15, 15, 20, 0.9)');
    let borderColor = isDay ? '#b0b3c0' : (config.borderColor || '#00e5ff');
    let textColor = isDay ? '#424242' : (config.textColor || '#00e5ff');
    
    if (isHovered) {
      bgColor = isDay ? 'rgba(215, 218, 230, 0.95)' : (config.buttonHoverBg || 'rgba(0, 229, 255, 0.15)');
      borderColor = isDay ? '#1976d2' : (config.borderHoverColor || '#00e5ff');
      textColor = isDay ? '#1976d2' : (config.textHoverColor || '#ffffff');
    }
    
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    renderer.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = textColor;
    ctx.font = `800 11px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  }
}

/*****************************************************************************
 * RENDERIZADORES DE SPRITES ESPECÍFICOS (MODO VETORIAL EXCLUSIVO)
 *****************************************************************************/

class PlayerRenderer {
  static draw(ctx, player, dayModePercent, particles, selected, renderer) {
    const config = DesignConfig.player;
    Renderer.drawDustParticles(ctx, particles, dayModePercent);

    let spriteKey = 'jogador_idle';
    if (player.state === 'DEAD') {
      spriteKey = 'jogador_derrotado';
    } else if (player.isDucking) {
      spriteKey = 'jogador_agachando';
    } else if (player.isJumping) {
      spriteKey = 'jogador_pulando';
    } else {
      const animFrame = Math.floor(Date.now() / (1000 / (config.animationSpeed || 5))) % 3;
      spriteKey = `jogador_correndo_${animFrame + 1}`;
    }

    const img = AssetManager.get(spriteKey);
    const deadTilt = player.state === 'DEAD' ? 18 : 0;
    
    let success = false;
    if (img) {
      success = Renderer.drawSprite(ctx, img, player.x, player.y, player.width, player.height, config, deadTilt);
    }

    if (!success) {
      Renderer.drawVectorPlayer(ctx, player, dayModePercent, deadTilt, renderer);
    }

    if (selected) {
      Renderer.drawSelectionHighlight(ctx, player, 'Dino (Jogador)', config);
    }

    if (DesignConfig.DEBUG.showHitboxes) {
      Renderer.drawHitboxes(ctx, player.getHitboxes());
    }
    if (DesignConfig.DEBUG.showPivot) {
      Renderer.drawPivotPoint(ctx, player.x + player.width / 2, player.y + player.height / 2);
    }
    if (DesignConfig.DEBUG.showObjectName) {
      Renderer.drawObjectName(ctx, player.x + player.width / 2, player.y - 6, 'Player');
    }
  }
}

class ObstacleRenderer {
  static draw(ctx, obstacle, dayModePercent, selected, renderer) {
    // Config INDIVIDUAL deste tipo de cacto
    const config = DesignConfig.obstacles[obstacle.type] || {};
    const spriteKey = `obstacle_${obstacle.type}`;
    const img = AssetManager.get(spriteKey);

    let success = false;
    if (img) {
      success = Renderer.drawSprite(ctx, img, obstacle.x, obstacle.y, obstacle.width, obstacle.height, config);
    }

    if (!success) {
      const color = renderer.getObstacleColor(dayModePercent);
      if (obstacle.type === 'obstaculo_1' || obstacle.type === 'obstaculo_5') {
        renderer.drawSingleCactus(obstacle.x, obstacle.y, obstacle.width, obstacle.height, color);
      } else if (obstacle.type === 'obstaculo_2' || obstacle.type === 'obstaculo_6') {
        renderer.drawSingleCactus(obstacle.x, obstacle.y, obstacle.width / 2, obstacle.height, color);
        renderer.drawSingleCactus(obstacle.x + obstacle.width / 2, obstacle.y, obstacle.width / 2, obstacle.height, color);
      } else if (obstacle.type === 'obstaculo_3' || obstacle.type === 'obstaculo_7') {
        renderer.drawSingleCactus(obstacle.x, obstacle.y, obstacle.width, obstacle.height, color);
      } else { // obstaculo_4, obstaculo_8
        const seg = obstacle.width / 3;
        renderer.drawSingleCactus(obstacle.x, obstacle.y, seg, obstacle.height, color);
        renderer.drawSingleCactus(obstacle.x + seg, obstacle.y, seg, obstacle.height, color);
        renderer.drawSingleCactus(obstacle.x + seg * 2, obstacle.y, seg, obstacle.height, color);
      }
    }

    if (selected) {
      Renderer.drawSelectionHighlight(ctx, obstacle, `Cacto (${obstacle.type})`, config);
    }

    if (DesignConfig.DEBUG.showHitboxes) {
      Renderer.drawHitboxes(ctx, obstacle.getHitboxes());
    }
    if (DesignConfig.DEBUG.showPivot) {
      Renderer.drawPivotPoint(ctx, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
    }
    if (DesignConfig.DEBUG.showObjectName) {
      Renderer.drawObjectName(ctx, obstacle.x + obstacle.width / 2, obstacle.y - 6, `Obstacle: ${obstacle.type}`);
    }
  }
}

class BirdRenderer {
  static draw(ctx, bird, dayModePercent, selected, renderer) {
    const config = DesignConfig.birds;
    const spriteKey = bird.wingFrame === 0 ? 'passaro_asa_cima' : 'passaro_asa_baixo';
    const img = AssetManager.get(spriteKey);

    let success = false;
    if (img) {
      success = Renderer.drawSprite(ctx, img, bird.x, bird.y, bird.width, bird.height, config);
    }

    if (!success) {
      renderer.drawBird(bird, dayModePercent);
    }

    if (selected) {
      Renderer.drawSelectionHighlight(ctx, bird, 'Pássaro Voador', config);
    }

    if (DesignConfig.DEBUG.showHitboxes) {
      Renderer.drawHitboxes(ctx, bird.getHitboxes());
    }
    if (DesignConfig.DEBUG.showPivot) {
      Renderer.drawPivotPoint(ctx, bird.x + bird.width / 2, bird.y + bird.height / 2);
    }
    if (DesignConfig.DEBUG.showObjectName) {
      Renderer.drawObjectName(ctx, bird.x + bird.width / 2, bird.y - 6, 'Bird');
    }
  }
}

class ProjectileRenderer {
  static draw(ctx, projectile, dayModePercent, selected, renderer) {
    const config = DesignConfig.projectiles;
    const img = AssetManager.get('projectile');

    let success = false;
    if (img) {
      success = Renderer.drawSprite(ctx, img, projectile.x, projectile.y, projectile.width, projectile.height, config);
    }

    if (!success) {
      renderer.drawProjectile(projectile, dayModePercent);
    }

    if (selected) {
      Renderer.drawSelectionHighlight(ctx, projectile, 'Projétil', config);
    }

    if (DesignConfig.DEBUG.showHitboxes) {
      Renderer.drawHitboxes(ctx, projectile.getHitboxes());
    }
    if (DesignConfig.DEBUG.showPivot) {
      Renderer.drawPivotPoint(ctx, projectile.x + projectile.width / 2, projectile.y + projectile.height / 2);
    }
  }
}

class BonusRenderer {
  static draw(ctx, target, dayModePercent, selected, renderer) {
    // Config INDIVIDUAL deste tipo de bônus
    const config = DesignConfig.bonus[target.type] || {};
    const spriteKey = target.type;
    const img = AssetManager.get(spriteKey);

    let success = false;
    if (img) {
      success = Renderer.drawSprite(ctx, img, target.x, target.y, target.width, target.height, config);
    }

    if (!success) {
      renderer.drawBonusTarget(target, dayModePercent);
    }

    if (selected) {
      Renderer.drawSelectionHighlight(ctx, target, `Bônus (${target.type})`, config);
    }

    if (DesignConfig.DEBUG.showHitboxes) {
      Renderer.drawHitboxes(ctx, target.getHitboxes());
    }
    if (DesignConfig.DEBUG.showPivot) {
      Renderer.drawPivotPoint(ctx, target.x + target.width / 2, target.y + target.height / 2);
    }
    if (DesignConfig.DEBUG.showObjectName) {
      Renderer.drawObjectName(ctx, target.x + target.width / 2, target.y - 6, `Bonus: ${target.type}`);
    }
  }
}

class GroundRenderer {
  static draw(ctx, ground, dayModePercent, renderer) {
    const config = DesignConfig.ground;
    const img = AssetManager.get('ground');

    if (img) {
      ctx.save();
      ctx.globalAlpha = config.opacity !== undefined ? config.opacity : 1.0;

      // offsetY desloca a linha do chão para cima ou para baixo
      const groundY = Config.GROUND_Y + (config.offsetY || 0);
      const visualH = img.height * (config.scale || 1);

      let gx = (ground.groundX || 0) % Config.CANVAS_WIDTH;
      if (gx > 0) gx -= Config.CANVAS_WIDTH;

      ctx.drawImage(img, gx, groundY, Config.CANVAS_WIDTH, visualH);
      ctx.drawImage(img, gx + Config.CANVAS_WIDTH, groundY, Config.CANVAS_WIDTH, visualH);
      ctx.restore();
      return true;
    }

    renderer.drawGround(ground, dayModePercent);
    return false;
  }
}

class CloudRenderer {
  static draw(ctx, cloud, dayModePercent, selected, renderer) {
    const config = DesignConfig.clouds;
    const spriteKey = `cloud_${cloud.spriteIndex}`;
    const img = AssetManager.get(spriteKey);

    let success = false;
    if (img) {
      success = Renderer.drawSprite(ctx, img, cloud.x, cloud.y, cloud.width, config.height || 14, config);
    }

    if (!success) {
      renderer.drawCloud(cloud, dayModePercent);
    }

    if (selected) {
      Renderer.drawSelectionHighlight(ctx, cloud, 'Elemento Cenário', config);
    }

    if (DesignConfig.DEBUG.showPivot) {
      Renderer.drawPivotPoint(ctx, cloud.x + cloud.width / 2, cloud.y + (config.height || 14) / 2);
    }
  }
}

class BackgroundRenderer {
  static draw(ctx, width, height, dayModePercent, renderer, backgroundX = 0) {
    const config = DesignConfig.background;
    const dayImg   = AssetManager.get('background_fundo_dia');
    const nightImg = AssetManager.get('background_fundo_noite');

    if (dayImg || nightImg) {
      ctx.save();
      const scale = config.scale || 2.67;
      const oy = config.offsetY !== undefined ? config.offsetY : -480;
      const h = height * scale;
      const W = h * 3.0; // Mantém a proporção 3:1 original das imagens
      const blendWidth = 150;
      const loopWidth = W;

      const scrollX = backgroundX % loopWidth;

      const drawTiled = (img, key, alpha) => {
        if (!img || alpha <= 0) return;

        // Cria ou recupera o canvas cacheado com o degradê nas duas pontas
        let cache = BackgroundRenderer.cache = BackgroundRenderer.cache || {};
        let cachedCanvas = cache[key];
        if (!cachedCanvas || cachedCanvas.width !== W || cachedCanvas.height !== h) {
          cachedCanvas = BackgroundRenderer.prepareBlendedImage(img, W, h, blendWidth);
          cache[key] = cachedCanvas;
        }

        ctx.globalAlpha = alpha;
        
        // Desenha a primeira cópia
        ctx.drawImage(cachedCanvas, -scrollX, oy, W, h);
        
        // Desenha a segunda cópia logo em seguida
        ctx.drawImage(cachedCanvas, W - scrollX, oy, W, h);
        
        // Se a segunda cópia não cobrir toda a tela
        if (W - scrollX < width) {
          ctx.drawImage(cachedCanvas, 2 * W - scrollX, oy, W, h);
        }
      };

      drawTiled(nightImg, 'night', (1 - dayModePercent) * (config.opacity || 1));
      drawTiled(dayImg,   'day',   dayModePercent       * (config.opacity || 1));

      ctx.restore();
      return true;
    }

    renderer.drawBackground(dayModePercent);
    return false;
  }

  static prepareBlendedImage(img, W, h, blendWidth) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W);
    canvas.height = Math.round(h);
    const ctx = canvas.getContext('2d');
    
    // Desenha a imagem inteira
    ctx.drawImage(img, 0, 0, Math.round(W), Math.round(h));
    
    // Aplica máscara de degradê nas duas extremidades (começo e fim)
    ctx.globalCompositeOperation = 'destination-in';
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(blendWidth / W, 'rgba(0,0,0,1)');
    grad.addColorStop((W - blendWidth) / W, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, h);
    
    return canvas;
  }
}


/**
 * RENDERIZADOR CENTRALIZADOR
 */
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  getVisibleBounds() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return { startX: 0, endX: Config.CANVAS_WIDTH, centerX: Config.CANVAS_WIDTH / 2, width: Config.CANVAS_WIDTH };
    }
    
    const scale = rect.height / Config.CANVAS_HEIGHT;
    const wrapper = this.canvas.parentElement;
    const wrapperRect = wrapper.getBoundingClientRect();
    
    const canvasLeft = rect.left - wrapperRect.left;
    
    const startX = -canvasLeft / scale;
    const visibleWidth = wrapperRect.width / scale;
    const endX = startX + visibleWidth;
    const centerX = startX + visibleWidth / 2;
    
    return {
      startX: Math.max(0, startX),
      endX: Math.min(Config.CANVAS_WIDTH, endX),
      centerX: Math.max(100, Math.min(Config.CANVAS_WIDTH - 100, centerX)),
      width: visibleWidth
    };
  }

  roundRect(x, y, w, h, r) {
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(x, y, w, h, r);
    } else {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x + r, y);
      this.ctx.arcTo(x + w, y, x + w, y + h, r);
      this.ctx.arcTo(x + w, y + h, x, y + h, r);
      this.ctx.arcTo(x, y + h, x, y, r);
      this.ctx.arcTo(x, y, x + w, y, r);
      this.ctx.closePath();
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  interpolateColor(color1, color2, factor) {
    const r = Math.round(color1.r + (color2.r - color1.r) * factor);
    const g = Math.round(color1.g + (color2.g - color1.g) * factor);
    const b = Math.round(color1.b + (color2.b - color1.b) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  colors = {
    dayBg: { r: 245, g: 246, b: 250 },
    nightBg: { r: 15, g: 15, b: 18 },
    dayLine: { r: 83, g: 83, b: 83 },
    nightLine: { r: 220, g: 224, b: 230 },
    dayPlayer: { r: 46, g: 125, b: 50 },
    nightPlayer: { r: 0, g: 230, b: 118 },
    dayObstacle: { r: 211, g: 47, b: 47 },
    nightObstacle: { r: 255, g: 61, b: 0 },
    dayBird: { r: 25, g: 118, b: 210 },
    nightBird: { r: 0, g: 176, b: 255 }
  };

  getBgColor(dayModePercent) {
    return this.interpolateColor(this.colors.nightBg, this.colors.dayBg, dayModePercent);
  }

  getLineColor(dayModePercent) {
    return this.interpolateColor(this.colors.nightLine, this.colors.dayLine, dayModePercent);
  }

  getPlayerColor(dayModePercent) {
    return this.interpolateColor(this.colors.nightPlayer, this.colors.dayPlayer, dayModePercent);
  }

  getObstacleColor(dayModePercent) {
    return this.interpolateColor(this.colors.nightObstacle, this.colors.dayObstacle, dayModePercent);
  }

  getBirdColor(dayModePercent) {
    return this.interpolateColor(this.colors.nightBird, this.colors.dayBird, dayModePercent);
  }

  // --- FALLBACKS VETORIAIS ---

  drawBackground(dayModePercent) {
    this.ctx.fillStyle = this.getBgColor(dayModePercent);
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGround(ground, dayModePercent) {
    const color = this.getLineColor(dayModePercent);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, Config.GROUND_Y);
    this.ctx.lineTo(this.canvas.width, Config.GROUND_Y);
    this.ctx.stroke();

    this.ctx.fillStyle = color;
    ground.details.forEach(detail => {
      let dx = (detail.x + ground.groundX) % this.canvas.width;
      if (dx < 0) dx += this.canvas.width;
      this.ctx.fillRect(dx, Config.GROUND_Y + detail.yOffset, detail.length, 1.5);
    });
  }

  drawCloud(cloud, dayModePercent) {
    const alpha = dayModePercent > 0.5 ? 0.08 : 0.04;
    const color = dayModePercent > 0.5 
      ? `rgba(83, 83, 83, ${alpha})` 
      : `rgba(220, 224, 230, ${alpha * 2})`;
      
    this.ctx.fillStyle = color;
    const cx = cloud.x;
    const cy = cloud.y;

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    this.ctx.arc(cx - 14, cy + 3, 9, 0, Math.PI * 2);
    this.ctx.arc(cx + 14, cy + 2, 9, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.rect(cx - 16, cy + 3, 32, 7);
    this.ctx.fill();
  }

  static drawDustParticles(ctx, particles, dayModePercent) {
    const color = dayModePercent > 0.5 ? 'rgba(83, 83, 83, ' : 'rgba(220, 224, 230, ';
    particles.forEach(p => {
      ctx.fillStyle = `${color}${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawProjectile(projectile, dayModePercent) {
    const isDay = dayModePercent > 0.5;
    this.ctx.fillStyle = isDay ? 'rgba(230, 81, 0, 0.4)' : 'rgba(255, 235, 59, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(projectile.x - 7, projectile.y + 3.5, 3.5, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = isDay ? '#e65100' : '#ffeb3b';
    this.ctx.beginPath();
    this.ctx.arc(projectile.x, projectile.y + 3.5, 3.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawBonusTarget(target, dayModePercent) {
    const isDay = dayModePercent > 0.5;
    
    // Mapeamento de cor único para as 4 variações de bônus
    let neonColor = isDay ? '#d500f9' : '#00e5ff'; // bonus_1 (magenta/cyan)
    if (target.type === 'bonus_2') {
      neonColor = isDay ? '#e91e63' : '#ff4081';   // bonus_2 (rosa)
    } else if (target.type === 'bonus_3') {
      neonColor = isDay ? '#2979ff' : '#00b0ff';   // bonus_3 (azul)
    } else if (target.type === 'bonus_4') {
      neonColor = isDay ? '#ff9100' : '#ffd700';   // bonus_4 (ouro)
    }

    const cx = target.x + target.width / 2;
    const cy = target.y + target.height / 2;
    const outerRadius = target.pulseFrame === 0 ? 8 : 9.5;
    const innerRadius = target.pulseFrame === 0 ? 3 : 4;
    
    this.ctx.strokeStyle = neonColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.fillStyle = neonColor;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  static drawVectorPlayer(ctx, player, dayModePercent, deadTilt, renderer) {
    const color = renderer.getPlayerColor(dayModePercent);
    ctx.fillStyle = color;
    ctx.save();

    if (player.state === 'DEAD') {
      ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
      ctx.rotate(Math.PI / 10);
      ctx.translate(-(player.x + player.width / 2), -(player.y + player.height / 2));
    }

    if (player.isDucking && player.state !== 'DEAD') {
      ctx.beginPath();
      renderer.roundRect(player.x, player.y + 10, player.width - 15, player.height - 10, 6);
      ctx.fill();

      ctx.beginPath();
      renderer.roundRect(player.x + player.width - 24, player.y + 4, 24, 14, 4);
      ctx.fill();

      if (player.throwFrame > 0) {
        ctx.fillStyle = renderer.getBgColor(dayModePercent);
        ctx.beginPath();
        ctx.moveTo(player.x + player.width, player.y + 10);
        ctx.lineTo(player.x + player.width - 6, player.y + 7);
        ctx.lineTo(player.x + player.width - 6, player.y + 13);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = dayModePercent > 0.5 ? '#ffffff' : '#151512';
      ctx.fillRect(player.x + player.width - 10, player.y + 7, 3, 3);

      ctx.fillStyle = color;
      const legY = player.y + player.height;
      if (player.runFrame === 0) {
        ctx.fillRect(player.x + 12, legY - 3, 5, 4);
        ctx.fillRect(player.x + 28, legY - 5, 5, 4);
      } else {
        ctx.fillRect(player.x + 12, legY - 5, 5, 4);
        ctx.fillRect(player.x + 28, legY - 3, 5, 4);
      }
    } else {
      ctx.beginPath();
      renderer.roundRect(player.x + 4, player.y + 14, 30, 22, 6);
      ctx.fill();

      ctx.beginPath();
      renderer.roundRect(player.x + 18, player.y, 22, 16, 4);
      ctx.fill();

      if (player.throwFrame > 0 && player.state !== 'DEAD') {
        ctx.fillStyle = renderer.getBgColor(dayModePercent);
        ctx.beginPath();
        ctx.moveTo(player.x + 40, player.y + 10);
        ctx.lineTo(player.x + 34, player.y + 6);
        ctx.lineTo(player.x + 34, player.y + 14);
        ctx.closePath();
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(player.x + 6, player.y + 18);
      ctx.quadraticCurveTo(player.x - 6, player.y + 24, player.x + 4, player.y + 32);
      ctx.lineTo(player.x + 10, player.y + 32);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = dayModePercent > 0.5 ? '#ffffff' : '#151512';
      if (player.state === 'DEAD') {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1.5;
        const ex = player.x + 30;
        const ey = player.y + 6;
        ctx.beginPath();
        ctx.moveTo(ex - 2, ey - 2);
        ctx.lineTo(ex + 2, ey + 2);
        ctx.moveTo(ex + 2, ey - 2);
        ctx.lineTo(ex - 2, ey + 2);
        ctx.stroke();
      } else {
        ctx.fillRect(player.x + 30, player.y + 4, 3, 3);
      }

      ctx.fillStyle = color;
      const legY = player.y + 34;
      if (player.isJumping || player.state === 'DEAD') {
        ctx.fillRect(player.x + 12, legY, 5, 8);
        ctx.fillRect(player.x + 22, legY, 5, 8);
      } else if (player.state === 'IDLE') {
        ctx.fillRect(player.x + 10, legY, 5, 13);
        ctx.fillRect(player.x + 22, legY, 5, 13);
      } else {
        if (player.runFrame === 0) {
          ctx.fillRect(player.x + 10, legY, 5, 13);
          ctx.fillRect(player.x + 22, legY, 5, 6);
        } else {
          ctx.fillRect(player.x + 10, legY, 5, 6);
          ctx.fillRect(player.x + 22, legY, 5, 13);
        }
      }
    }
    ctx.restore();
  }

  drawSingleCactus(x, y, width, height, color) {
    this.ctx.fillStyle = color;
    const trunkW = Math.max(6, Math.floor(width * 0.35));
    const trunkX = x + (width - trunkW) / 2;
    this.ctx.beginPath();
    this.roundRect(trunkX, y, trunkW, height, trunkW / 2);
    this.ctx.fill();

    const armW = Math.max(4, Math.floor(trunkW * 0.8));
    const armH = Math.floor(height * 0.45);
    const armY = y + Math.floor(height * 0.25);

    this.ctx.beginPath();
    this.roundRect(trunkX - armW * 1.5, armY + armH - armW, armW * 2.2, armW, armW / 2);
    this.roundRect(trunkX - armW * 1.5, armY, armW, armH, armW / 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.roundRect(trunkX + trunkW - armW, armY + armH - armW, armW * 2.2, armW, armW / 2);
    this.ctx.roundRect(trunkX + trunkW + armW * 0.5, armY - 3, armW, armH, armW / 2);
    this.ctx.fill();
  }

  drawBird(bird, dayModePercent) {
    const color = this.getBirdColor(dayModePercent);
    this.ctx.fillStyle = color;

    this.ctx.beginPath();
    this.ctx.ellipse(bird.x + 22, bird.y + 16, 14, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(bird.x + 36, bird.y + 13, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = dayModePercent > 0.5 ? '#d32f2f' : '#ff5252';
    this.ctx.beginPath();
    this.ctx.moveTo(bird.x + 40, bird.y + 11);
    this.ctx.lineTo(bird.x + 46, bird.y + 16);
    this.ctx.lineTo(bird.x + 39, bird.y + 17);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(bird.x + 8, bird.y + 16);
    this.ctx.lineTo(bird.x + 2, bird.y + 12);
    this.ctx.lineTo(bird.x + 4, bird.y + 16);
    this.ctx.lineTo(bird.x + 2, bird.y + 20);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    if (bird.wingFrame === 0) {
      this.ctx.moveTo(bird.x + 20, bird.y + 14);
      this.ctx.lineTo(bird.x + 10, bird.y + 2);
      this.ctx.lineTo(bird.x + 16, bird.y + 2);
      this.ctx.lineTo(bird.x + 24, bird.y + 14);
    } else {
      this.ctx.moveTo(bird.x + 20, bird.y + 18);
      this.ctx.lineTo(bird.x + 12, bird.y + 30);
      this.ctx.lineTo(bird.x + 18, bird.y + 30);
      this.ctx.lineTo(bird.x + 24, bird.y + 18);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawFloatingText(fText, dayModePercent) {
    this.ctx.save();
    this.ctx.globalAlpha = fText.alpha;
    const isDay = dayModePercent > 0.5;
    this.ctx.fillStyle = isDay ? '#2e7d32' : '#00e676';
    this.ctx.font = "800 13px 'Courier New', Courier, monospace";
    this.ctx.textAlign = 'center';
    this.ctx.strokeStyle = isDay ? '#ffffff' : '#151518';
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeText(fText.text, fText.x, fText.y);
    this.ctx.fillText(fText.text, fText.x, fText.y);
    this.ctx.restore();
  }

  drawScore(score, dayModePercent) {
    const isDay = dayModePercent > 0.5;
    const currentStr = String(score.currentScore).padStart(5, '0');
    const highStr = String(score.highScore).padStart(5, '0');
    const text = `HI ${highStr}  ${currentStr}`;

    this.ctx.save();
    
    // Desenha o badge de fundo com alto contraste absoluto
    const paddingX = 16;
    const paddingY = 8;
    this.ctx.font = "900 16px 'Courier New', Courier, monospace";
    const textWidth = this.ctx.measureText(text).width;
    
    const rectW = textWidth + paddingX * 2;
    const rectH = 22 + paddingY * 2;
    const rectX = this.canvas.width - rectW - 20;
    const rectY = 15;
    
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    this.ctx.strokeStyle = isDay ? '#1976d2' : '#00e5ff';
    this.ctx.lineWidth = 2.5;
    
    this.ctx.beginPath();
    this.roundRect(rectX, rectY, rectW, rectH, 8);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Texto em cor ciano brilhante para contraste máximo
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, this.canvas.width - 20 - paddingX, rectY + rectH / 2);
    
    this.ctx.restore();
  }

  drawGameOver(dayModePercent, menu) {
    const isDay = dayModePercent > 0.5;
    // Overlay de fundo: ligeiramente mais escuro no dia e noite para dar bastante destaque aos elementos em primeiro plano
    this.ctx.fillStyle = isDay ? 'rgba(245, 246, 250, 0.7)' : 'rgba(10, 10, 15, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Sombra do título
    this.ctx.fillStyle = '#000000';
    this.ctx.font = "900 24px 'Courier New', Courier, monospace";
    this.ctx.fillText('VOCÊ CONTINUA DESEMPREGADO', this.canvas.width / 2 + 2, this.canvas.height / 2 - 40 + 2);
    
    // Título Principal (cor vermelha vibrante)
    this.ctx.fillStyle = isDay ? '#c62828' : '#ff3d00';
    this.ctx.fillText('VOCÊ CONTINUA DESEMPREGADO', this.canvas.width / 2, this.canvas.height / 2 - 40);

    const buttons = menu.getButtonsForState(State.GAME_OVER);
    buttons.forEach(btn => {
      const isHovered = (menu.hoveredButton === btn.id);
      UI.drawButton(this.ctx, btn, isHovered, dayModePercent, this);
    });

    // Sombra do texto secundário
    this.ctx.fillStyle = '#000000';
    this.ctx.font = "600 10px sans-serif";
    this.ctx.fillText('Pressione ESPAÇO para Jogar Novamente', this.canvas.width / 2 + 1, this.canvas.height / 2 + 85 + 1);

    // Texto secundário principal
    this.ctx.fillStyle = isDay ? '#424242' : '#ffffff';
    this.ctx.fillText('Pressione ESPAÇO para Jogar Novamente', this.canvas.width / 2, this.canvas.height / 2 + 85);
  }

  drawMainMenu(menu, dayModePercent, player) {
    BackgroundRenderer.draw(this.ctx, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT, dayModePercent, this);
    this.ctx.strokeStyle = this.getLineColor(dayModePercent);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, Config.GROUND_Y);
    this.ctx.lineTo(this.canvas.width, Config.GROUND_Y);
    this.ctx.stroke();

    PlayerRenderer.draw(this.ctx, player, dayModePercent, [], false, this);

    // Título centralizado vertical e horizontalmente na área superior da tela
    this.ctx.font = "900 24px 'Courier New', Courier, monospace";
    this.ctx.textAlign = 'center';
    
    // Sombra do título para legibilidade absoluta
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillText('D A S H   D O   E M P R E G O', this.canvas.width / 2 + 2, 72);
    
    // Título principal
    this.ctx.fillStyle = dayModePercent > 0.5 ? '#ffffff' : '#00e5ff';
    this.ctx.fillText('D A S H   D O   E M P R E G O', this.canvas.width / 2, 70);

    const buttons = menu.getButtonsForState(State.MENU);
    buttons.forEach(btn => {
      const isHovered = (menu.hoveredButton === btn.id);
      UI.drawButton(this.ctx, btn, isHovered, dayModePercent, this);
    });
  }

  drawGameOver(dayModePercent, menu, activeButtons = []) {
    const isDay = dayModePercent > 0.5;
    // Overlay de fundo: ligeiramente mais escuro no dia e noite para dar bastante destaque aos elementos em primeiro plano
    this.ctx.fillStyle = isDay ? 'rgba(245, 246, 250, 0.7)' : 'rgba(10, 10, 15, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const bounds = this.getVisibleBounds();
    const centerX = bounds.centerX;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Sombra do título
    this.ctx.fillStyle = '#000000';
    this.ctx.font = "900 24px 'Courier New', Courier, monospace";
    this.ctx.fillText('VOCÊ CONTINUA DESEMPREGADO', centerX + 2, this.canvas.height / 2 - 40 + 2);
    
    // Título Principal (cor vermelha vibrante)
    this.ctx.fillStyle = isDay ? '#c62828' : '#ff3d00';
    this.ctx.fillText('VOCÊ CONTINUA DESEMPREGADO', centerX, this.canvas.height / 2 - 40);

    activeButtons.forEach(btn => {
      const isHovered = (menu.hoveredButton === btn.id);
      UI.drawButton(this.ctx, btn, isHovered, dayModePercent, this);
    });

    // Sombra do texto secundário
    this.ctx.fillStyle = '#000000';
    this.ctx.font = "600 10px sans-serif";
    const textY = activeButtons.length > 0 ? activeButtons[activeButtons.length - 1].y + activeButtons[activeButtons.length - 1].h + 16 : this.canvas.height / 2 + 85;
    this.ctx.fillText('Pressione ESPAÇO para Jogar Novamente', centerX + 1, textY + 1);

    // Texto secundário principal
    this.ctx.fillStyle = isDay ? '#424242' : '#ffffff';
    this.ctx.fillText('Pressione ESPAÇO para Jogar Novamente', centerX, textY);
  }

  drawMainMenu(menu, dayModePercent, player, activeButtons = []) {
    BackgroundRenderer.draw(this.ctx, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT, dayModePercent, this);
    this.ctx.strokeStyle = this.getLineColor(dayModePercent);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, Config.GROUND_Y);
    this.ctx.lineTo(this.canvas.width, Config.GROUND_Y);
    this.ctx.stroke();

    const img = AssetManager.get('jogador_idle');
    if (img) {
      const tempConfig = {
        ...DesignConfig.player,
        scale: (DesignConfig.player.scale || 1.0) * 1.2
      };
      const visualH = 47 * tempConfig.scale;
      const drawY = Config.GROUND_Y - visualH;
      Renderer.drawSprite(this.ctx, img, player.x, drawY, 44, 47, tempConfig, 0);
    } else {
      const tempPlayer = {
        ...player,
        width: 52,
        height: 55,
        y: Config.GROUND_Y - 55,
        state: 'IDLE',
        isJumping: false,
        isDucking: false
      };
      PlayerRenderer.draw(this.ctx, tempPlayer, dayModePercent, [], false, this);
    }

    const bounds = this.getVisibleBounds();
    const centerX = bounds.centerX;

    // Título centralizado vertical e horizontalmente na área superior da tela
    this.ctx.font = "900 24px 'Courier New', Courier, monospace";
    this.ctx.textAlign = 'center';
    
    // Sombra do título para legibilidade absoluta
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillText('D A S H   D O   E M P R E G O', centerX + 2, 72);
    
    // Título principal
    this.ctx.fillStyle = dayModePercent > 0.5 ? '#ffffff' : '#00e5ff';
    this.ctx.fillText('D A S H   D O   E M P R E G O', centerX, 70);

    activeButtons.forEach(btn => {
      const isHovered = (menu.hoveredButton === btn.id);
      UI.drawButton(this.ctx, btn, isHovered, dayModePercent, this);
    });
  }

  drawHowToPlay(menu, dayModePercent, activeButtons = []) {
    BackgroundRenderer.draw(this.ctx, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT, dayModePercent, this);
    const isDay = dayModePercent > 0.5;

    const bounds = this.getVisibleBounds();
    const centerX = bounds.centerX;
    const panelWidth = Math.min(560, bounds.width - 40);

    // Painel de fundo escuro para alto contraste
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
    this.ctx.strokeStyle = isDay ? '#1976d2' : '#00e5ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.roundRect(centerX - panelWidth / 2, 10, panelWidth, 150, 8);
    this.ctx.fill();
    this.ctx.stroke();

    // Título
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.font = "900 18px 'Courier New', Courier, monospace";
    this.ctx.textAlign = 'center';
    this.ctx.fillText('COMO JOGAR', centerX, 28);

    // Texto de ajuda
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.font = "600 11px sans-serif";
    this.ctx.textAlign = 'left';
    
    const lx = centerX - panelWidth / 2 + 30;
    this.ctx.fillText('• Espaço ou Seta ↑ : Pular', lx, 55);
    this.ctx.fillText('• Seta ↓           : Agachar / Cair Rápido no ar', lx, 75);
    this.ctx.fillText('• Tecla X ou Z     : Atirar Currículo (Máx 3 na tela)', lx, 95);
    this.ctx.fillText('• Desvie dos Cactos e Pássaros. Colisões causam Game Over.', lx, 120);
    this.ctx.fillText('• Atire nos Alvos Bônus para obter +10 pontos extras!', lx, 140);

    activeButtons.forEach(btn => {
      const isHovered = (menu.hoveredButton === btn.id);
      UI.drawButton(this.ctx, btn, isHovered, dayModePercent, this);
    });
  }

  drawCredits(menu, dayModePercent, activeButtons = []) {
    BackgroundRenderer.draw(this.ctx, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT, dayModePercent, this);
    const isDay = dayModePercent > 0.5;

    const bounds = this.getVisibleBounds();
    const centerX = bounds.centerX;
    const panelWidth = Math.min(580, bounds.width - 40);
    const panelHeight = 220;

    // Painel de fundo escuro para alto contraste
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    this.ctx.strokeStyle = isDay ? '#1976d2' : '#00e5ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.roundRect(centerX - panelWidth / 2, 8, panelWidth, panelHeight, 10);
    this.ctx.fill();
    this.ctx.stroke();

    // Título
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.font = "900 16px 'Courier New', Courier, monospace";
    this.ctx.textAlign = 'center';
    this.ctx.fillText('PORTFÓLIO & CRÉDITOS', centerX, 26);

    // Linha divisória
    this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - panelWidth / 2 + 20, 34);
    this.ctx.lineTo(centerX + panelWidth / 2 - 20, 34);
    this.ctx.stroke();

    // Nome do desenvolvedor (Destaque Premium)
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.font = "900 12px 'Courier New', Courier, monospace";
    this.ctx.fillText('DESENVOLVEDOR: DANIEL DE JESUS ALVES', centerX, 52);

    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.font = "600 10px sans-serif";
    this.ctx.textAlign = 'center';
    
    // Texto do Projeto
    this.ctx.fillText('Este jogo é um projeto interativo integrado ao meu portfólio profissional.', centerX, 74);
    this.ctx.fillText('Desenvolvido com HTML5, CSS3 e Vanilla JavaScript puro.', centerX, 89);
    
    // IA e Aceleração
    this.ctx.fillStyle = '#ffd700'; // Destaque em dourado
    this.ctx.fillText('Co-criado e finalizado em apenas 2 dias com auxílio de Inteligência Artificial.', centerX, 109);
    
    // Mensagem sobre a importância da IA
    this.ctx.fillStyle = '#a0aec0';
    this.ctx.font = "italic 600 9.5px sans-serif";
    this.ctx.fillText('Aprender a co-criar com IA é uma competência essencial hoje para', centerX, 133);
    this.ctx.fillText('impulsionar a inovação e acelerar o desenvolvimento de aplicações em tempo recorde.', centerX, 147);

    // Instrução final
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.font = "bold 9px sans-serif";
    this.ctx.fillText('Clique no botão abaixo para explorar o meu portfólio completo.', centerX, 172);

    activeButtons.forEach(btn => {
      const isHovered = (menu.hoveredButton === btn.id);
      UI.drawButton(this.ctx, btn, isHovered, dayModePercent, this);
    });
  }

  drawGameWin(dayModePercent, menu, activeButtons = []) {
    const isDay = dayModePercent > 0.5;
    // Overlay de fundo semi-transparente
    this.ctx.fillStyle = isDay ? 'rgba(230, 244, 255, 0.75)' : 'rgba(10, 10, 25, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const bounds = this.getVisibleBounds();
    const centerX = bounds.centerX;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Título Principal (Dourado de vitória)
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = "900 24px 'Courier New', Courier, monospace";
    this.ctx.fillText('PARABÉNS! VOCÊ ESTÁ EMPREGADO!', centerX, this.canvas.height / 2 - 50);

    // Subtítulos
    this.ctx.fillStyle = isDay ? '#333333' : '#ffffff';
    this.ctx.font = "600 12px sans-serif";
    this.ctx.fillText('Você atingiu a pontuação máxima de 2000 pontos!', centerX, this.canvas.height / 2 + 5);
    this.ctx.fillText('Registre o seu nome e avancode para celebrar!', centerX, this.canvas.height / 2 + 25);

    activeButtons.forEach(btn => {
      const isHovered = (menu.hoveredButton === btn.id);
      UI.drawButton(this.ctx, btn, isHovered, dayModePercent, this);
    });
  }

  drawScoreBoard(menu, dayModePercent, scores = [], activeButtons = []) {
    BackgroundRenderer.draw(this.ctx, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT, dayModePercent, this);
    const isDay = dayModePercent > 0.5;

    const bounds = this.getVisibleBounds();
    const centerX = bounds.centerX;
    const panelWidth = Math.min(560, bounds.width - 40);

    // Painel de fundo escuro para alto contraste
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
    this.ctx.strokeStyle = isDay ? '#1976d2' : '#00e5ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.roundRect(centerX - panelWidth / 2, 10, panelWidth, 175, 8);
    this.ctx.fill();
    this.ctx.stroke();

    // Título
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.font = "900 18px 'Courier New', Courier, monospace";
    this.ctx.textAlign = 'center';
    this.ctx.fillText('RECORDES DOS RECRUTADORES', centerX, 28);

    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.font = "600 11px sans-serif";
    
    // Draw columns
    const lx = centerX - panelWidth / 2 + 40;
    const colW = panelWidth - 80;
    this.ctx.textAlign = 'left';
    this.ctx.fillText('POS', lx, 55);
    this.ctx.fillText('NOME', lx + 60, 55);
    this.ctx.textAlign = 'right';
    this.ctx.fillText('PONTOS', lx + colW, 55);

    // Draw line
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(lx, 62);
    this.ctx.lineTo(lx + colW, 62);
    this.ctx.stroke();

    // Show top 5 scores
    const topScores = scores.slice(0, 5);
    if (topScores.length === 0) {
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Nenhum recorde registrado ainda.', centerX, 105);
    } else {
      topScores.forEach((s, idx) => {
        const y = 80 + idx * 20;
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = s.score >= 2000 ? '#ffd700' : '#e2e8f0';
        this.ctx.font = s.score >= 2000 ? "900 11px sans-serif" : "600 11px sans-serif";
        this.ctx.fillText(`${idx + 1}º`, lx, y);
        
        const displayName = (s.score >= 2000 ? '👑 ' : '') + (s.name || 'ANÔNIMO') + (s.avancode ? ` (${s.avancode})` : '');
        this.ctx.fillText(displayName, lx + 60, y);
        
        this.ctx.textAlign = 'right';
        this.ctx.fillText(s.score.toString(), lx + colW, y);
      });
    }

    activeButtons.forEach(btn => {
      const isHovered = (menu.hoveredButton === btn.id);
      UI.drawButton(this.ctx, btn, isHovered, dayModePercent, this);
    });
  }

  // --- ANIMAÇÃO DE SELEÇÃO E GANCHOS DE ARRASTE ---

  static drawSprite(ctx, img, x, y, width, height, config, frameRotation = 0) {
    if (!img) return false;
    ctx.save();
    ctx.globalAlpha = config.opacity !== undefined ? config.opacity : 1.0;

    const visualW = width * config.scale;
    const visualH = height * config.scale;

    const pivotX = x + width / 2;
    const pivotY = y + height / 2;
    ctx.translate(pivotX, pivotY);

    const rad = ((config.rotation || 0) + frameRotation) * Math.PI / 180;
    if (rad !== 0) ctx.rotate(rad);

    const scaleX = config.flipX ? -1 : 1;
    const scaleY = config.flipY ? -1 : 1;
    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY);
    }

    const drawX = -visualW / 2 + (config.offsetX || 0);
    const drawY = -visualH / 2 + (config.offsetY || 0);
    ctx.drawImage(img, drawX, drawY, visualW, visualH);

    ctx.restore();
    return true;
  }

  static drawSelectionHighlight(ctx, entity, label, config) {
    ctx.save();
    
    // 1. Borda de Seleção (tracejado neon)
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(entity.x, entity.y, entity.width, entity.height);
    ctx.setLineDash([]);

    // 2. Ponto de origem (pivot central)
    const px = entity.x + entity.width / 2;
    const py = entity.y + entity.height / 2;
    ctx.fillStyle = '#2979ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Rótulo informativo (Nome, Dimensões e Offsets)
    const scaleVal = config && config.scale !== undefined ? config.scale.toFixed(2) : '1.0';
    const offX = config && config.offsetX !== undefined ? config.offsetX : 0;
    const offY = config && config.offsetY !== undefined ? config.offsetY : 0;
    const txt = `${label.toUpperCase()} (${entity.width.toFixed(0)}x${entity.height.toFixed(0)}) | Escala: ${scaleVal} | Offset: (${offX}, ${offY})`;
    ctx.font = "bold 9px sans-serif";
    ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(txt).width;

    ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
    ctx.fillRect(entity.x, entity.y - 15, tw + 8, 12);

    ctx.fillStyle = '#000';
    ctx.fillText(txt, entity.x + 4, entity.y - 4);

    // 4. Hitbox real
    if (typeof entity.getHitboxes === 'function') {
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 1.2;
      entity.getHitboxes().forEach(box => {
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      });
    }

    ctx.restore();
  }

  static drawResizeHandles(ctx, entity) {
    ctx.save();
    // --- Handles de redimensionamento (cantos, azul ciano) ---
    ctx.fillStyle = '#00e5ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    const size = 6;
    const corners = [
      { x: entity.x, y: entity.y },
      { x: entity.x + entity.width, y: entity.y },
      { x: entity.x, y: entity.y + entity.height },
      { x: entity.x + entity.width, y: entity.y + entity.height }
    ];
    corners.forEach(c => {
      ctx.fillRect(c.x - size / 2, c.y - size / 2, size, size);
      ctx.strokeRect(c.x - size / 2, c.y - size / 2, size, size);
    });

    // --- Handle de offset de imagem (centro, losango laranja) ---
    // Só mostra se o elemento tem config com offsetX/offsetY
    if (entity.config && entity.config.offsetX !== undefined) {
      const config = entity.config;
      const cx = entity.x + entity.width / 2 + (config.offsetX || 0);
      const cy = entity.y + entity.height / 2 + (config.offsetY || 0);
      const r = 7;

      // Linha ligando centro da hitbox ao centro da imagem
      ctx.strokeStyle = 'rgba(255, 152, 0, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(entity.x + entity.width / 2, entity.y + entity.height / 2);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Losango laranja = mover imagem
      ctx.fillStyle = '#ff9800';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ícone de seta (indicativo de mover)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↔', cx, cy);
    }

    ctx.restore();
  }

  static drawHitboxes(ctx, hitboxes) {
    ctx.save();
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.2;
    hitboxes.forEach(box => {
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    });
    ctx.restore();
  }

  static drawPivotPoint(ctx, px, py) {
    ctx.save();
    ctx.fillStyle = '#2979ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  static drawObjectName(ctx, x, y, name) {
    ctx.save();
    ctx.fillStyle = '#ffeb3b';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y);
    ctx.restore();
  }
}

/**
 * ENGINE DO JOGO (Controlador Principal)
 */
class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.canvas.width = Config.CANVAS_WIDTH;
    this.canvas.height = Config.CANVAS_HEIGHT;
    this.portfolioUrl = 'https://portfolio-navy-five-16.vercel.app/';

    // Zoom do editor (1x a 4x)
    this.editorZoom = 1;
    window._editorZoom = 1;

    // Sistemas
    this.input = new Input(this.canvas);
    this.audio = new Audio();
    this.renderer = new Renderer(this.canvas);
    this.mainMenu = new MainMenu();
    
    // Entidades
    this.player = new Player();
    this.ground = new Ground();
    this.score = new Score();
    
    this.obstacles = [];
    this.clouds = [];
    this.particles = [];
    this.projectiles = [];
    this.bonusTargets = [];
    this.floatingTexts = [];
    
    // Configurações do Editor de Cena
    this.selectedEntity = null;
    this.isDragging = false;
    this.isResizing = false;
    this.activeHandle = null;
    this.editorEntities = [];
    
    this.state = State.MENU;
    this.speed = Config.INITIAL_SPEED;
    this.lastTime = 0;
    this.backgroundX = 450;  // Começa mais ou menos no meio da imagem (900px)
    
    this.isDayTime = true;
    this.pendingTransition = false;
    this.transitionActive = false;
    this.pendingTargetDayTime = true;
    this.transitionSourceVal = 1.0;
    this.transitionTargetVal = 1.0;
    this.transitionProgress = 0;
    this.scores = [];
    
    // Configurações do Modal de Registro de Score
    const scoreModal = document.getElementById('score-register-modal');
    const scoreCancelBtn = document.getElementById('score-cancel-btn');
    const scoreSubmitBtn = document.getElementById('score-submit-btn');
    const scoreInputName = document.getElementById('score-player-name');
    
    if (scoreCancelBtn && scoreModal) {
      scoreCancelBtn.addEventListener('click', () => {
        scoreModal.classList.remove('active');
      });
    }
    
    const scoreInputAvancode = document.getElementById('score-player-avancode');
    
    if (scoreCancelBtn && scoreModal) {
      scoreCancelBtn.addEventListener('click', () => {
        scoreModal.classList.remove('active');
      });
    }
    
    if (scoreSubmitBtn && scoreModal && scoreInputName) {
      scoreSubmitBtn.addEventListener('click', () => {
        const name = scoreInputName.value.trim();
        if (!name) {
          alert('Por favor, digite seu nome!');
          return;
        }

        const avancodeVal = scoreInputAvancode ? scoreInputAvancode.value.trim() : '';
        if (this.score.currentScore >= 2000 && !avancodeVal) {
          alert('Por favor, digite seu Avancode para registrar a vitória!');
          return;
        }
        
        fetch('/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: name, 
            score: this.score.currentScore,
            avancode: avancodeVal
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'ok') {
            this.scores = data.scores;
            scoreModal.classList.remove('active');
            scoreInputName.value = '';
            if (scoreInputAvancode) scoreInputAvancode.value = '';
            this.state = State.SCORE_BOARD;
          } else {
            alert('Erro: ' + data.message);
          }
        })
        .catch(err => {
          console.error(err);
          alert('Erro de conexão ao salvar pontuação.');
        });
      });
    }
    
    this.distanceSinceLastSpawn = 0;
    this.nextSpawnDistance = Config.SPAWN_DISTANCE_MIN;
    this.distanceSinceLastBonus = 0;
    this.nextBonusDistance = Config.BONUS_SPAWN_MIN;
    this.lastSpawnedType = null;
    this.consecutiveSpawnCount = 0;

    this.wasShootPressed = false;
    this.dayModePercent = 1.0;

    // Instancia entidades estáticas do editor de cena
    this.initEditorEntities();

    // Eventos Mouse
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) * (Config.CANVAS_WIDTH / rect.width);
      const canvasY = (e.clientY - rect.top) * (Config.CANVAS_HEIGHT / rect.height);
      this.handleClick(canvasX, canvasY);
      e.stopPropagation();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) * (Config.CANVAS_WIDTH / rect.width);
      const canvasY = (e.clientY - rect.top) * (Config.CANVAS_HEIGHT / rect.height);
      if (this.state === State.SCENE_EDITOR) {
        this.handleEditorMouseDown(canvasX, canvasY);
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) * (Config.CANVAS_WIDTH / rect.width);
      const canvasY = (e.clientY - rect.top) * (Config.CANVAS_HEIGHT / rect.height);
      if (this.state === State.SCENE_EDITOR) {
        this.handleEditorMouseMove(canvasX, canvasY);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.state === State.SCENE_EDITOR) {
        this.handleEditorMouseUp();
      }
    });

    // Atalho F3 protegido com senha para alternar editor de cena
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3' || e.code === 'F3') {
        e.preventDefault();
        if (this.state === State.SCENE_EDITOR) {
          this.toggleSceneEditor();
        } else {
          const pass = prompt('DIGITE A SENHA DO PROCESSO SELETIVO (Editor de Cena):');
          if (pass === '8204') {
            this.toggleSceneEditor();
          } else if (pass !== null) {
            alert('SENHA INCORRETA!');
          }
        }
      }
      if (this.state === State.GAME_OVER || this.state === State.GAME_WIN) {
        if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          this.input.isJumping = false;
          this.reset();
          this.audio.playJump();
          this.player.velocityY = -(DesignConfig.player.jumpForce || 14.5);
          this.player.isJumping = true;
          this.player.state = 'JUMPING';
          this.state = State.PLAYING;
        }
      }
    });

    // Touch mobile
    this.canvas.addEventListener('touchstart', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const canvasX = (touch.clientX - rect.left) * (Config.CANVAS_WIDTH / rect.width);
      const canvasY = (touch.clientY - rect.top) * (Config.CANVAS_HEIGHT / rect.height);
      
      if (this.state === State.SCENE_EDITOR) {
        this.handleEditorMouseDown(canvasX, canvasY);
      } else {
        this.handleClick(canvasX, canvasY);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const canvasX = (touch.clientX - rect.left) * (Config.CANVAS_WIDTH / rect.width);
      const canvasY = (touch.clientY - rect.top) * (Config.CANVAS_HEIGHT / rect.height);
      
      if (this.state === State.SCENE_EDITOR) {
        this.handleEditorMouseMove(canvasX, canvasY);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (this.state === State.SCENE_EDITOR) {
        this.handleEditorMouseUp();
      }
    }, { passive: true });
  }

  initEditorEntities() {
    this.editorEntities = [
      { id: 'player', name: 'Personagem (Dino)', x: 60, y: Config.GROUND_Y - (DesignConfig.player.height || Config.PLAYER_HEIGHT), width: DesignConfig.player.width || Config.PLAYER_WIDTH, height: DesignConfig.player.height || Config.PLAYER_HEIGHT, config: DesignConfig.player, active: true, type: 'player' },
      { id: 'ground', name: 'Chão (Ground)', x: 0, y: Config.GROUND_Y, width: Config.CANVAS_WIDTH, height: 12, config: DesignConfig.ground, active: true, type: 'ground' },
      { id: 'background', name: 'Plano de Fundo', x: 0, y: 0, width: Config.CANVAS_WIDTH, height: Config.CANVAS_HEIGHT, config: DesignConfig.background, active: true, type: 'background' },
      { id: 'cloud', name: 'Nuvens', x: 620, y: 35, width: DesignConfig.clouds.width || 46, height: 14, config: DesignConfig.clouds, active: true, type: 'cloud', spriteIndex: 0 },
      
      // Mapeamento dos obstáculos — cada um com seu PRÓPRIO config independente
      { id: 'obstaculo_1', name: 'Obstáculo 1', x: DesignConfig.obstacles.obstaculo_1.editorX, y: DesignConfig.obstacles.obstaculo_1.editorY, width: DesignConfig.obstacles.obstaculo_1.width, height: DesignConfig.obstacles.obstaculo_1.height, config: DesignConfig.obstacles.obstaculo_1, active: true, type: 'obstacle', obstacleType: 'obstaculo_1' },
      { id: 'obstaculo_2', name: 'Obstáculo 2', x: DesignConfig.obstacles.obstaculo_2.editorX, y: DesignConfig.obstacles.obstaculo_2.editorY, width: DesignConfig.obstacles.obstaculo_2.width, height: DesignConfig.obstacles.obstaculo_2.height, config: DesignConfig.obstacles.obstaculo_2, active: true, type: 'obstacle', obstacleType: 'obstaculo_2' },
      { id: 'obstaculo_3', name: 'Obstáculo 3', x: DesignConfig.obstacles.obstaculo_3.editorX, y: DesignConfig.obstacles.obstaculo_3.editorY, width: DesignConfig.obstacles.obstaculo_3.width, height: DesignConfig.obstacles.obstaculo_3.height, config: DesignConfig.obstacles.obstaculo_3, active: true, type: 'obstacle', obstacleType: 'obstaculo_3' },
      { id: 'obstaculo_4', name: 'Obstáculo 4', x: DesignConfig.obstacles.obstaculo_4.editorX, y: DesignConfig.obstacles.obstaculo_4.editorY, width: DesignConfig.obstacles.obstaculo_4.width, height: DesignConfig.obstacles.obstaculo_4.height, config: DesignConfig.obstacles.obstaculo_4, active: true, type: 'obstacle', obstacleType: 'obstaculo_4' },
      { id: 'obstaculo_5', name: 'Obstáculo 5', x: DesignConfig.obstacles.obstaculo_5.editorX, y: DesignConfig.obstacles.obstaculo_5.editorY, width: DesignConfig.obstacles.obstaculo_5.width, height: DesignConfig.obstacles.obstaculo_5.height, config: DesignConfig.obstacles.obstaculo_5, active: true, type: 'obstacle', obstacleType: 'obstaculo_5' },
      { id: 'obstaculo_6', name: 'Obstáculo 6', x: DesignConfig.obstacles.obstaculo_6.editorX, y: DesignConfig.obstacles.obstaculo_6.editorY, width: DesignConfig.obstacles.obstaculo_6.width, height: DesignConfig.obstacles.obstaculo_6.height, config: DesignConfig.obstacles.obstaculo_6, active: true, type: 'obstacle', obstacleType: 'obstaculo_6' },
      { id: 'obstaculo_7', name: 'Obstáculo 7', x: DesignConfig.obstacles.obstaculo_7.editorX, y: DesignConfig.obstacles.obstaculo_7.editorY, width: DesignConfig.obstacles.obstaculo_7.width, height: DesignConfig.obstacles.obstaculo_7.height, config: DesignConfig.obstacles.obstaculo_7, active: true, type: 'obstacle', obstacleType: 'obstaculo_7' },
      { id: 'obstaculo_8', name: 'Obstáculo 8', x: DesignConfig.obstacles.obstaculo_8.editorX, y: DesignConfig.obstacles.obstaculo_8.editorY, width: DesignConfig.obstacles.obstaculo_8.width, height: DesignConfig.obstacles.obstaculo_8.height, config: DesignConfig.obstacles.obstaculo_8, active: true, type: 'obstacle', obstacleType: 'obstaculo_8' },

      { id: 'bird', name: 'Pássaro', x: DesignConfig.birds.editorX, y: DesignConfig.birds.editorY, width: DesignConfig.birds.width, height: DesignConfig.birds.height, config: DesignConfig.birds, active: true, type: 'bird', wingFrame: 0 },
      { id: 'projectile', name: 'Projétil (Tiro)', x: DesignConfig.projectiles.editorX, y: DesignConfig.projectiles.editorY, width: DesignConfig.projectiles.width, height: DesignConfig.projectiles.height, config: DesignConfig.projectiles, active: true, type: 'projectile' },

      // Mapeamento dos 4 bônus — cada um com seu PRÓPRIO config independente
      { id: 'bonus_1', name: 'Alvo Bônus 1', x: DesignConfig.bonus.bonus_1.editorX, y: DesignConfig.bonus.bonus_1.editorY, width: DesignConfig.bonus.bonus_1.width, height: DesignConfig.bonus.bonus_1.height, config: DesignConfig.bonus.bonus_1, active: true, type: 'bonus', bonusType: 'bonus_1', pulseFrame: 0 },
      { id: 'bonus_2', name: 'Alvo Bônus 2', x: DesignConfig.bonus.bonus_2.editorX, y: DesignConfig.bonus.bonus_2.editorY, width: DesignConfig.bonus.bonus_2.width, height: DesignConfig.bonus.bonus_2.height, config: DesignConfig.bonus.bonus_2, active: true, type: 'bonus', bonusType: 'bonus_2', pulseFrame: 0 },
      { id: 'bonus_3', name: 'Alvo Bônus 3', x: DesignConfig.bonus.bonus_3.editorX, y: DesignConfig.bonus.bonus_3.editorY, width: DesignConfig.bonus.bonus_3.width, height: DesignConfig.bonus.bonus_3.height, config: DesignConfig.bonus.bonus_3, active: true, type: 'bonus', bonusType: 'bonus_3', pulseFrame: 0 },
      { id: 'bonus_4', name: 'Alvo Bônus 4', x: DesignConfig.bonus.bonus_4.editorX, y: DesignConfig.bonus.bonus_4.editorY, width: DesignConfig.bonus.bonus_4.width, height: DesignConfig.bonus.bonus_4.height, config: DesignConfig.bonus.bonus_4, active: true, type: 'bonus', bonusType: 'bonus_4', pulseFrame: 0 },
      
      { id: 'ui', name: 'Interface (UI)', x: 670, y: 15, width: 110, height: 20, config: DesignConfig.ui, active: true, type: 'ui' }
    ];
  }

  toggleSceneEditor() {
    if (this.state === State.SCENE_EDITOR) {
      this.state = State.MENU;
      document.body.classList.remove('design-active');
      const p = document.getElementById('scene-editor-panel');
      if (p) p.remove();

      if (DesignConfig.DESIGN_MODE) {
        setupDesignEditor(this);
      }
    } else {
      this.state = State.SCENE_EDITOR;
      this.selectedEntity = null;
      this.isDragging = false;
      this.isResizing = false;

      const dp = document.getElementById('design-panel');
      if (dp) dp.remove();
      const sep = document.getElementById('scene-editor-panel');
      if (sep) sep.remove();

      setupSceneEditorUI(this);
    }
  }

  init() {
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  reset() {
    this.player = new Player();
    this.ground = new Ground();
    this.score.reset();
    
    this.obstacles = [];
    this.clouds = [];
    this.particles = [];
    this.projectiles = [];
    this.bonusTargets = [];
    this.floatingTexts = [];
    this.selectedEntity = null;
    
    this.speed = Config.INITIAL_SPEED;
    this.backgroundX = 450;
    
    this.isDayTime = true;
    this.pendingTransition = false;
    this.transitionActive = false;
    this.pendingTargetDayTime = true;
    this.transitionProgress = 0;
    
    this.distanceSinceLastSpawn = 0;
    this.nextSpawnDistance = Config.SPAWN_DISTANCE_MIN;
    this.distanceSinceLastBonus = 0;
    this.nextBonusDistance = Config.BONUS_SPAWN_MIN;
    this.lastSpawnedType = null;
    this.consecutiveSpawnCount = 0;
    this.wasShootPressed = false;
    this.dayModePercent = 1.0;
    
    this.audio.startMusic();
  }

  handleClick(canvasX, canvasY) {
    if (this.state === State.SCENE_EDITOR) {
      return; 
    }

    const bounds = this.renderer.getVisibleBounds();
    const isMobile = bounds.width < 800;
    const activeButtons = this.mainMenu.getFormattedButtons(this.state, bounds.centerX, isMobile);

    if (this.state === State.GAME_OVER || this.state === State.GAME_WIN) {
      let clickedId = null;
      for (const btn of activeButtons) {
        if (
          canvasX >= btn.x && canvasX <= btn.x + btn.w &&
          canvasY >= btn.y && canvasY <= btn.y + btn.h
        ) {
          clickedId = btn.id;
          break;
        }
      }
      
      if (clickedId === 'RETRY') {
        this.reset();
        this.audio.playJump();
        this.player.velocityY = -(DesignConfig.player.jumpForce || 14.5);
        this.player.isJumping = true;
        this.player.state = 'JUMPING';
        this.state = State.PLAYING;
      } else if (clickedId === 'REGISTER_SCORE') {
        this.openScoreRegisterModal();
      } else if (clickedId === 'MAIN_MENU') {
        this.state = State.MENU;
        this.audio.startMusic();
        this.mainMenu.hoveredButton = null;
        this.canvas.style.cursor = 'default';
      }
      return;
    }

    if (this.state === State.MENU || this.state === State.HOW_TO_PLAY || this.state === State.CREDITS || this.state === State.SCORE_BOARD) {
      if (this.mainMenu.handleClick(canvasX, canvasY, this, activeButtons)) {
        return;
      }
    }

    if (DesignConfig.DESIGN_MODE) {
      let hit = false;
      if (
        canvasX >= this.player.x && canvasX <= this.player.x + this.player.width &&
        canvasY >= this.player.y && canvasY <= this.player.y + this.player.height
      ) {
        this.selectedEntity = this.player;
        hit = true;
      }
      if (!hit) {
        for (const obs of this.obstacles) {
          if (canvasX >= obs.x && canvasX <= obs.x + obs.width && canvasY >= obs.y && canvasY <= obs.y + obs.height) {
            this.selectedEntity = obs;
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (const target of this.bonusTargets) {
          if (canvasX >= target.x && canvasX <= target.x + target.width && canvasY >= target.y && canvasY <= target.y + target.height) {
            this.selectedEntity = target;
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (const proj of this.projectiles) {
          if (canvasX >= proj.x && canvasX <= proj.x + proj.width && canvasY >= proj.y && canvasY <= proj.y + proj.height) {
            this.selectedEntity = proj;
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (const cloud of this.clouds) {
          if (canvasX >= cloud.x && canvasX <= cloud.x + cloud.width && canvasY >= cloud.y && canvasY <= cloud.y + 14) {
            this.selectedEntity = cloud;
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        this.selectedEntity = null;
      } else {
        return;
      }
    }

    if (this.state === State.PLAYING) {
      if (!this.player.isJumping) {
        this.player.velocityY = -(DesignConfig.player.jumpForce || 14.5);
        this.player.isJumping = true;
        this.player.state = 'JUMPING';
      }
    }
  }

  shoot() {
    if (this.projectiles.length >= Config.MAX_PROJECTILES) return;
    const projX = this.player.x + this.player.width - 2;
    const projY = this.player.y + (this.player.isDucking ? -4 : 9);
    this.projectiles.push(new Projectile(projX, projY));
    this.player.throwFrame = 10;
    this.audio.playShoot();
  }

  updateDayNightCycle(dt) {
    const score = this.score.currentScore;
    // Ciclo intercalado de 700 pontos: 500 de Dia, 200 de Noite
    const scoreCycle = score % 700;
    const targetDayTime = (scoreCycle < 500);
    
    if (targetDayTime !== this.isDayTime) {
      if (!this.transitionActive) {
        this.transitionActive = true;
        this.transitionProgress = 0;
        this.transitionSourceVal = this.dayModePercent;
        this.transitionTargetVal = targetDayTime ? 1.0 : 0.0;
        this.isDayTime = targetDayTime;
      }
    }

    if (this.transitionActive) {
      this.transitionProgress += dt * 0.011; // Transição suave ao longo de ~1.5s
      if (this.transitionProgress >= 1.0) {
        this.transitionProgress = 1.0;
        this.dayModePercent = this.transitionTargetVal;
        this.transitionActive = false;
      } else {
        this.dayModePercent = this.transitionSourceVal + (this.transitionTargetVal - this.transitionSourceVal) * this.transitionProgress;
      }
    }
  }

  spawnDustParticle() {
    if (this.player.state === 'RUNNING' || this.player.state === 'DUCKING') {
      this.particles.push({
        x: this.player.x + 8,
        y: Config.GROUND_Y - 1,
        vx: -this.speed * 0.35 - Math.random() * 2,
        vy: -Math.random() * 1.5,
        size: 1.5 + Math.random() * 2.5,
        alpha: 1.0
      });
    }
  }

  /**
   * ARRASTE E REDIMENSIONAMENTO NO EDITOR DE CENA
   */
  handleEditorMouseDown(canvasX, canvasY) {
    this.isDragging = false;
    this.isResizing = false;
    this.isDraggingOffset = false;
    this.activeHandle = null;

    if (this.selectedEntity) {
      const ent = this.selectedEntity;

      // --- Verifica clique no handle de offset de imagem (losango laranja no centro) ---
      if (ent.config && ent.config.offsetX !== undefined) {
        const cx = ent.x + ent.width / 2 + (ent.config.offsetX || 0);
        const cy = ent.y + ent.height / 2 + (ent.config.offsetY || 0);
        const r = 10; // raio de detecção do losango
        if (Math.abs(canvasX - cx) + Math.abs(canvasY - cy) <= r) {
          this.isDraggingOffset = true;
          this.offsetDragStartX = canvasX;
          this.offsetDragStartY = canvasY;
          this.offsetStartX = ent.config.offsetX || 0;
          this.offsetStartY = ent.config.offsetY || 0;
          return;
        }
      }

      // --- Verifica clique nos handles de redimensionamento (cantos) ---
      const size = 7;
      const handles = {
        'top-left':     { x: ent.x - size/2,             y: ent.y - size/2,              w: size, h: size },
        'top-right':    { x: ent.x + ent.width - size/2, y: ent.y - size/2,              w: size, h: size },
        'bottom-left':  { x: ent.x - size/2,             y: ent.y + ent.height - size/2, w: size, h: size },
        'bottom-right': { x: ent.x + ent.width - size/2, y: ent.y + ent.height - size/2, w: size, h: size }
      };

      for (const hName in handles) {
        const hBox = handles[hName];
        if (
          canvasX >= hBox.x && canvasX <= hBox.x + hBox.w &&
          canvasY >= hBox.y && canvasY <= hBox.y + hBox.h
        ) {
          this.isResizing = true;
          this.activeHandle = hName;
          this.resizeStartX = canvasX;
          this.resizeStartY = canvasY;
          this.resizeStartWidth = ent.width;
          this.resizeStartHeight = ent.height;
          this.resizeStartLeft = ent.x;
          this.resizeStartTop = ent.y;
          return;
        }
      }
    }

    const sorted = [...this.editorEntities].sort((a, b) => (b.config.zIndex || 0) - (a.config.zIndex || 0));
    for (const ent of sorted) {
      if (!ent.active) continue;
      if (
        canvasX >= ent.x && canvasX <= ent.x + ent.width &&
        canvasY >= ent.y && canvasY <= ent.y + ent.height
      ) {
        this.selectedEntity = ent;
        this.isDragging = true;
        this.dragOffsetX = canvasX - ent.x;
        this.dragOffsetY = canvasY - ent.y;
        updateEditorSelectionControls(this);
        return;
      }
    }

    this.selectedEntity = null;
    updateEditorSelectionControls(this);
  }

  handleEditorMouseMove(canvasX, canvasY) {
    const ent = this.selectedEntity;
    if (!ent) return;

    if (this.isDraggingOffset && ent.config && ent.config.offsetX !== undefined) {
      // Arrastar apenas o offset visual da imagem, hitbox fica parada
      const dx = canvasX - this.offsetDragStartX;
      const dy = canvasY - this.offsetDragStartY;
      ent.config.offsetX = Math.round(this.offsetStartX + dx);
      ent.config.offsetY = Math.round(this.offsetStartY + dy);
      updateEditorSelectionControls(this);
    } else if (this.isResizing) {
      const dx = canvasX - this.resizeStartX;
      const dy = canvasY - this.resizeStartY;

      if (this.activeHandle === 'bottom-right') {
        ent.width = Math.max(5, this.resizeStartWidth + dx);
        ent.height = Math.max(5, this.resizeStartHeight + dy);
      } else if (this.activeHandle === 'top-left') {
        const newW = Math.max(5, this.resizeStartWidth - dx);
        const newH = Math.max(5, this.resizeStartHeight - dy);
        if (newW > 5) {
          ent.x = this.resizeStartLeft + dx;
          ent.width = newW;
        }
        if (newH > 5) {
          ent.y = this.resizeStartTop + dy;
          ent.height = newH;
        }
      } else if (this.activeHandle === 'top-right') {
        const newW = Math.max(5, this.resizeStartWidth + dx);
        const newH = Math.max(5, this.resizeStartHeight - dy);
        if (newW > 5) ent.width = newW;
        if (newH > 5) {
          ent.y = this.resizeStartTop + dy;
          ent.height = newH;
        }
      } else if (this.activeHandle === 'bottom-left') {
        const newW = Math.max(5, this.resizeStartWidth - dx);
        const newH = Math.max(5, this.resizeStartHeight + dy);
        if (newW > 5) {
          ent.x = this.resizeStartLeft + dx;
          ent.width = newW;
        }
        if (newH > 5) ent.height = newH;
      }
      updateEditorSelectionControls(this);
    } else if (this.isDragging) {
      ent.x = canvasX - this.dragOffsetX;
      ent.y = canvasY - this.dragOffsetY;
      updateEditorSelectionControls(this);
    }
  }

  handleEditorMouseUp() {
    this.isDraggingOffset = false;
    this.isDragging = false;
    this.isResizing = false;
    this.activeHandle = null;
  }

  update(dt) {
    this.updateDayNightCycle(dt);
    this.player.update(this.input, dt);

    const isShootKeyPressed = (this.input.keys[Config.SHOOT_KEY_1] || this.input.keys[Config.SHOOT_KEY_2]);
    if (isShootKeyPressed) {
      if (!this.wasShootPressed) {
        this.shoot();
        this.wasShootPressed = true;
      }
    } else {
      this.wasShootPressed = false;
    }

    this.projectiles.forEach(proj => proj.update(dt));
    this.projectiles = this.projectiles.filter(proj => proj.x < Config.CANVAS_WIDTH);

    if (Math.random() < 0.18 * dt) {
      this.spawnDustParticle();
    }
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= 0.04 * dt;
    });
    this.particles = this.particles.filter(p => p.alpha > 0);

    this.speed = Math.min(this.speed + Config.SPEED_ACCEL * dt, Config.MAX_SPEED);
    
    // Parallax: background desloca-se mais devagar que o chão e rola para a direita (offset cresce)
    const bgScale = DesignConfig.background.scale || 2.67;
    const bgH = Config.CANVAS_HEIGHT * bgScale;
    const bgW = bgH * 3.0; // Mantém a proporção 3:1 original das imagens
    const bgLoopWidth = bgW;

    this.backgroundX += this.speed * 0.018 * dt;
    if (this.backgroundX >= bgLoopWidth) {
      this.backgroundX = this.backgroundX % bgLoopWidth;
    }

    this.ground.update(this.speed, dt);
    
    if (this.isDayTime) {
      if (this.clouds.length < 2 && Math.random() < 0.003 * dt) {
        this.clouds.push(new Cloud());
      }
    } else {
      this.clouds = []; // Limpa as nuvens na hora quando fica de noite
    }
    this.clouds.forEach(cloud => cloud.update(this.speed, dt));
    this.clouds = this.clouds.filter(cloud => cloud.x + cloud.width > -150);

    this.distanceSinceLastSpawn += this.speed * dt;
    // Nunca mais de 2 obstáculos na tela ao mesmo tempo
    if (this.distanceSinceLastSpawn >= this.nextSpawnDistance && this.obstacles.length < 2) {
      this.spawnObstacle();
    }
    this.obstacles.forEach(obs => obs.update(this.speed, dt));
    this.obstacles = this.obstacles.filter(obs => obs.x + obs.width > -20);

    if (this.score.currentScore >= Config.BONUS_START_SCORE) {
      this.distanceSinceLastBonus += this.speed * dt;
      if (this.distanceSinceLastBonus >= this.nextBonusDistance) {
        this.spawnBonusTarget();
      }
    }
    this.bonusTargets.forEach(target => target.update(this.speed, dt));
    this.bonusTargets = this.bonusTargets.filter(target => target.x + target.width > -20);

    this.floatingTexts.forEach(fText => fText.update(dt));
    this.floatingTexts = this.floatingTexts.filter(fText => fText.alpha > 0);

    // Colisão Projétil x Alvo
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      for (let j = this.bonusTargets.length - 1; j >= 0; j--) {
        const target = this.bonusTargets[j];
        if (Collision.check(proj, target)) {
          this.projectiles.splice(i, 1);
          this.bonusTargets.splice(j, 1);
          
          this.audio.playBonus();
          this.score.currentScore += Config.BONUS_POINTS;
          this.floatingTexts.push(new FloatingText(proj.x, proj.y - 5, `+${Config.BONUS_POINTS}`));
          
          if (this.score.currentScore > this.score.highScore) {
            this.score.highScore = this.score.currentScore;
            localStorage.setItem('dino_high_score', this.score.highScore.toString());
          }
          break;
        }
      }
    }

    // Colisão Jogador x Obstáculos
    for (let i = 0; i < this.obstacles.length; i++) {
      const obstacle = this.obstacles[i];
      if (Collision.check(this.player, obstacle)) {
        this.gameOver();
        break;
      }
    }

    this.score.update(this.speed, dt, this.audio);

    if (this.score.currentScore >= 2000) {
      this.score.currentScore = 2000;
      if (this.score.currentScore > this.score.highScore) {
        this.score.highScore = 2000;
        localStorage.setItem('dino_high_score', '2000');
      }
      this.gameWin();
    }
  }

  spawnObstacle() {
    this.distanceSinceLastSpawn = 0;
    const speedFactor = (this.speed - Config.INITIAL_SPEED) / (Config.MAX_SPEED - Config.INITIAL_SPEED);
    const minDist = Config.SPAWN_DISTANCE_MIN + speedFactor * 120;
    const maxDist = Config.SPAWN_DISTANCE_MAX + speedFactor * 80;
    this.nextSpawnDistance = minDist + Math.random() * (maxDist - minDist);

    const canSpawnBird = this.score.currentScore >= Config.BIRD_START_SCORE;

    // Pool extensivo — adicione novos tipos de cacto aqui futuramente
    const cactusPool = [
      'obstaculo_1', 'obstaculo_2', 'obstaculo_3', 'obstaculo_4',
      'obstaculo_5', 'obstaculo_6', 'obstaculo_7', 'obstaculo_8'
    ];

    // Filtra o tipo atual se foi repetido 2x ou mais seguidas
    let availableCactus = cactusPool;
    if (this.consecutiveSpawnCount >= 2 &&
        this.lastSpawnedType &&
        cactusPool.includes(this.lastSpawnedType)) {
      availableCactus = cactusPool.filter(t => t !== this.lastSpawnedType);
    }

    let chosenType;
    if (canSpawnBird && Math.random() < 0.22) {
      const heights = ['low', 'mid', 'high'];
      const randomHeight = heights[Math.floor(Math.random() * heights.length)];
      this.obstacles.push(new Bird(randomHeight));
      chosenType = 'bird';
    } else {
      const selectedType = availableCactus[Math.floor(Math.random() * availableCactus.length)];
      this.obstacles.push(new Obstacle(selectedType));
      chosenType = selectedType;
    }

    // Atualiza rastreamento de repetição
    if (chosenType === this.lastSpawnedType) {
      this.consecutiveSpawnCount++;
    } else {
      this.consecutiveSpawnCount = 1;
    }
    this.lastSpawnedType = chosenType;
  }

  spawnBonusTarget() {
    this.distanceSinceLastBonus = 0;
    this.nextBonusDistance = Config.BONUS_SPAWN_MIN + Math.random() * (Config.BONUS_SPAWN_MAX - Config.BONUS_SPAWN_MIN);
    
    // Spawna aleatoriamente um dos 4 tipos de bônus definidos
    const types = ['bonus_1', 'bonus_2', 'bonus_3', 'bonus_4'];
    const selectedType = types[Math.floor(Math.random() * types.length)];
    this.bonusTargets.push(new BonusTarget(selectedType));
  }

  gameOver() {
    this.state = State.GAME_OVER;
    this.player.state = 'DEAD';
    this.canvas.style.cursor = 'default';
    this.audio.playGameOver();
  }

  gameWin() {
    this.state = State.GAME_WIN;
    this.canvas.style.cursor = 'default';
    this.openScoreRegisterModal();
  }

  openScoreRegisterModal() {
    const scoreModal = document.getElementById('score-register-modal');
    const scoreVal = document.getElementById('register-score-val');
    const scoreMsg = document.getElementById('register-score-msg');
    const avancodeContainer = document.getElementById('avancode-container');
    const modalTitle = scoreModal ? scoreModal.querySelector('.modal-header h3') : null;

    if (scoreModal && scoreVal) {
      scoreVal.textContent = this.score.currentScore;
      scoreModal.classList.add('active');
      
      if (this.score.currentScore >= 2000) {
        if (modalTitle) modalTitle.textContent = "🏆 PARABÉNS! VOCÊ FOI EMPREGADO!";
        if (scoreMsg) {
          scoreMsg.innerHTML = "Você provou seu valor e atingiu a pontuação máxima de <strong style='color: #ffd700; font-size: 18px;'>2000</strong> pontos!";
        }
        if (avancodeContainer) avancodeContainer.style.display = 'block';
      } else {
        if (modalTitle) modalTitle.textContent = "🏆 REGISTRAR RECORDE";
        if (scoreMsg) {
          scoreMsg.innerHTML = "Incrível! Você fez <strong id='register-score-val' style='color: #00e5ff; font-size: 16px;'>" + this.score.currentScore + "</strong> pontos!";
        }
        if (avancodeContainer) avancodeContainer.style.display = 'none';
      }
      
      const scoreInputName = document.getElementById('score-player-name');
      const scoreInputAvancode = document.getElementById('score-player-avancode');
      if (scoreInputName) {
        scoreInputName.value = '';
        setTimeout(() => scoreInputName.focus(), 50);
      }
      if (scoreInputAvancode) {
        scoreInputAvancode.value = '';
      }
    }
  }

  fetchScores() {
    fetch('/scores')
      .then(res => res.json())
      .then(data => {
        this.scores = data;
      })
      .catch(err => {
        console.error('Erro ao buscar recordes:', err);
        this.scores = [];
      });
  }

  /**
   * RENDERIZAÇÃO ESTÁTICA DO EDITOR DE CENA (Modo Congelado)
   */
  drawEditor() {
    this.renderer.clear();
    
    const sorted = [...this.editorEntities].sort((a, b) => (a.config.zIndex || 0) - (b.config.zIndex || 0));
    
    sorted.forEach(ent => {
      if (!ent.active) return;
      
      const selected = (this.selectedEntity === ent);
      const ctx = this.renderer.ctx;
      
      if (ent.type === 'background') {
        BackgroundRenderer.draw(ctx, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT, this.dayModePercent, this.renderer);
      } else if (ent.type === 'ground') {
        GroundRenderer.draw(ctx, { groundX: 0, details: [] }, this.dayModePercent, this.renderer);
      } else if (ent.type === 'cloud') {
        CloudRenderer.draw(ctx, { x: ent.x, y: ent.y, width: ent.width, spriteIndex: ent.spriteIndex }, this.dayModePercent, selected, this.renderer);
      } else if (ent.type === 'obstacle') {
        ObstacleRenderer.draw(ctx, { x: ent.x, y: ent.y, width: ent.width, height: ent.height, type: ent.obstacleType, getHitboxes: () => [{ x: ent.x + 2, y: ent.y + 2, width: ent.width - 4, height: ent.height - 2 }] }, this.dayModePercent, selected, this.renderer);
      } else if (ent.type === 'bird') {
        BirdRenderer.draw(ctx, { x: ent.x, y: ent.y, width: ent.width, height: ent.height, wingFrame: ent.wingFrame, getHitboxes: () => [{ x: ent.x + 4, y: ent.y + 10, width: ent.width - 8, height: 12 }] }, this.dayModePercent, selected, this.renderer);
      } else if (ent.type === 'projectile') {
        ProjectileRenderer.draw(ctx, { x: ent.x, y: ent.y, width: ent.width, height: ent.height, getHitboxes: () => [{ x: ent.x, y: ent.y, width: ent.width, height: ent.height }] }, this.dayModePercent, selected, this.renderer);
      } else if (ent.type === 'bonus') {
        BonusRenderer.draw(ctx, { x: ent.x, y: ent.y, width: ent.width, height: ent.height, type: ent.bonusType, pulseFrame: ent.pulseFrame, getHitboxes: () => [{ x: ent.x, y: ent.y, width: ent.width, height: ent.height }] }, this.dayModePercent, selected, this.renderer);
      } else if (ent.type === 'player') {
        PlayerRenderer.draw(ctx, { x: ent.x, y: ent.y, width: ent.width, height: ent.height, state: 'RUNNING', isDucking: false, isJumping: false, runFrame: 0, throwFrame: 0, getHitboxes: () => [{ x: ent.x + 20, y: ent.y, width: 22, height: 16 }, { x: ent.x + 4, y: ent.y + 16, width: 30, height: 18 }, { x: ent.x + 10, y: ent.y + 34, width: 18, height: 13 }] }, this.dayModePercent, [], selected, this.renderer);
      } else if (ent.type === 'ui') {
        this.renderer.drawScore({ currentScore: 840, highScore: 1250 }, this.dayModePercent);
      }
    });

    if (this.selectedEntity) {
      Renderer.drawResizeHandles(this.renderer.ctx, this.selectedEntity);
    }
  }

  draw() {
    this.renderer.clear();

    const bounds = this.renderer.getVisibleBounds();
    const isMobile = bounds.width < 800;
    const activeButtons = this.mainMenu.getFormattedButtons(this.state, bounds.centerX, isMobile);

    if (this.state === State.MENU) {
      this.renderer.drawMainMenu(this.mainMenu, this.dayModePercent, this.player, activeButtons);
      return;
    }
    if (this.state === State.HOW_TO_PLAY) {
      this.renderer.drawHowToPlay(this.mainMenu, this.dayModePercent, activeButtons);
      return;
    }
    if (this.state === State.CREDITS) {
      this.renderer.drawCredits(this.mainMenu, this.dayModePercent, activeButtons);
      return;
    }
    if (this.state === State.SCORE_BOARD) {
      this.renderer.drawScoreBoard(this.mainMenu, this.dayModePercent, this.scores, activeButtons);
      return;
    }

    // --- PLAYING / GAME OVER ---
    // 1. Fundo (parallax lento)
    BackgroundRenderer.draw(this.renderer.ctx, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT, this.dayModePercent, this.renderer, this.backgroundX);

    // 2. Nuvens
    this.clouds.forEach(cloud => {
      const selected = (this.selectedEntity === cloud);
      CloudRenderer.draw(this.renderer.ctx, cloud, this.dayModePercent, selected, this.renderer);
    });

    // 3. Chão
    GroundRenderer.draw(this.renderer.ctx, this.ground, this.dayModePercent, this.renderer);

    // 4. Projéteis
    this.projectiles.forEach(proj => {
      const selected = (this.selectedEntity === proj);
      ProjectileRenderer.draw(this.renderer.ctx, proj, this.dayModePercent, selected, this.renderer);
    });

    // 5. Alvos Bônus
    this.bonusTargets.forEach(target => {
      const selected = (this.selectedEntity === target);
      BonusRenderer.draw(this.renderer.ctx, target, this.dayModePercent, selected, this.renderer);
    });

    // 6. Obstáculos
    this.obstacles.forEach(obs => {
      const selected = (this.selectedEntity === obs);
      if (obs instanceof Bird) {
        BirdRenderer.draw(this.renderer.ctx, obs, this.dayModePercent, selected, this.renderer);
      } else {
        ObstacleRenderer.draw(this.renderer.ctx, obs, this.dayModePercent, selected, this.renderer);
      }
    });

    // 7. Textos Flutuantes
    this.floatingTexts.forEach(fText => this.renderer.drawFloatingText(fText, this.dayModePercent));

    // 8. Jogador
    const playerSelected = (this.selectedEntity === this.player);
    PlayerRenderer.draw(this.renderer.ctx, this.player, this.dayModePercent, this.particles, playerSelected, this.renderer);

    // 9. Pontuação
    this.renderer.drawScore(this.score, this.dayModePercent);

    // 10. Spawn Debug
    if (DesignConfig.DEBUG.showSpawnArea) {
      this.renderer.ctx.save();
      this.renderer.ctx.strokeStyle = '#ffeb3b';
      this.renderer.ctx.lineWidth = 1;
      this.renderer.ctx.setLineDash([2, 5]);
      this.renderer.ctx.beginPath();
      this.renderer.ctx.moveTo(Config.CANVAS_WIDTH - 20, 0);
      this.renderer.ctx.lineTo(Config.CANVAS_WIDTH - 20, Config.CANVAS_HEIGHT);
      this.renderer.ctx.stroke();
      this.renderer.ctx.fillStyle = '#ffeb3b';
      this.renderer.ctx.font = '8px sans-serif';
      this.renderer.ctx.fillText('ÁREA DE SPAWN', Config.CANVAS_WIDTH - 85, 12);
      this.renderer.ctx.restore();
    }

    if (this.state === State.GAME_OVER) {
      this.renderer.drawGameOver(this.dayModePercent, this.mainMenu, activeButtons);
    } else if (this.state === State.GAME_WIN) {
      this.renderer.drawGameWin(this.dayModePercent, this.mainMenu, activeButtons);
    }
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    let elapsed = timestamp - this.lastTime;
    this.lastTime = timestamp;

    if (elapsed > 100) elapsed = 100;
    const dt = elapsed / (1000 / Config.FPS_TARGET);

    const bounds = this.renderer.getVisibleBounds();
    const isMobile = bounds.width < 800;
    const activeButtons = this.mainMenu.getFormattedButtons(this.state, bounds.centerX, isMobile);

    if (this.state === State.PLAYING) {
      this.update(dt);
      this.draw();
    } else if (this.state === State.MENU) {
      this.ground.update(1.2, dt);
      this.clouds.forEach(cloud => cloud.update(1.2, dt));
      this.player.update(this.input, dt);
      this.mainMenu.updateHover(this.input.mouseX, this.input.mouseY, activeButtons, this.canvas);
      this.draw();
    } else if (this.state === State.HOW_TO_PLAY || this.state === State.CREDITS || this.state === State.SCORE_BOARD) {
      this.mainMenu.updateHover(this.input.mouseX, this.input.mouseY, activeButtons, this.canvas);
      this.draw();
    } else if (this.state === State.GAME_OVER || this.state === State.GAME_WIN) {
      this.mainMenu.updateHover(this.input.mouseX, this.input.mouseY, activeButtons, this.canvas);
      this.draw();
    } else if (this.state === State.SCENE_EDITOR) {
      this.drawEditor();
    }

    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }
}

/*****************************************************************************
 * INJEÇÃO DINÂMICA DO PAINEL LATERAL DO EDITOR VISUAL (DESIGN_MODE)
 *****************************************************************************/

function setupDesignEditor(game) {
  if (!DesignConfig.DESIGN_MODE) return;

  document.body.classList.add('design-active');

  const panel = document.createElement('div');
  panel.id = 'design-panel';

  const createSectionHTML = (title, sectionKey, data, controls, includeFlips = false) => {
    let ctrlHTML = '';
    controls.forEach(ctrl => {
      const val = data[ctrl.key];
      ctrlHTML += `
        <div class="design-control">
          <label>${ctrl.label} (<span id="val-${sectionKey}-${ctrl.key}">${val}</span>)</label>
          <div class="design-control-row">
            <input type="range" 
                   id="range-${sectionKey}-${ctrl.key}" 
                   min="${ctrl.min}" 
                   max="${ctrl.max}" 
                   step="${ctrl.step}" 
                   value="${val}" 
                   data-section="${sectionKey}" 
                   data-key="${ctrl.key}">
            <input type="number" 
                   id="num-${sectionKey}-${ctrl.key}" 
                   min="${ctrl.min}" 
                   max="${ctrl.max}" 
                   step="${ctrl.step}" 
                   value="${val}" 
                   data-section="${sectionKey}" 
                   data-key="${ctrl.key}">
          </div>
        </div>
      `;
    });

    if (includeFlips) {
      ctrlHTML += `
        <label class="design-checkbox-label">
          <input type="checkbox" id="chk-${sectionKey}-flipX" ${data.flipX ? 'checked' : ''} data-section="${sectionKey}" data-key="flipX">
          Espelhar Horizontal (Flip X)
        </label>
        <label class="design-checkbox-label">
          <input type="checkbox" id="chk-${sectionKey}-flipY" ${data.flipY ? 'checked' : ''} data-section="${sectionKey}" data-key="flipY">
          Espelhar Vertical (Flip Y)
        </label>
      `;
    }

    return `
      <div class="design-section">
        <div class="design-section-header">${title} <span>▼</span></div>
        <div class="design-section-content">
          ${ctrlHTML}
        </div>
      </div>
    `;
  };

  panel.innerHTML = `
    <div id="design-panel-header">
      <h2>AJUSTE VISUAL (DESIGN MODE)</h2>
    </div>
    <div class="design-panel-scroll">
      <!-- Depuração -->
      <div class="design-section active">
        <div class="design-section-header">DEPURAÇÃO <span>▼</span></div>
        <div class="design-section-content" style="display: block;">
          <label class="design-checkbox-label">
            <input type="checkbox" id="dbg-hitbox" ${DesignConfig.DEBUG.showHitboxes ? 'checked' : ''}>
            Mostrar Hitboxes
          </label>
          <label class="design-checkbox-label">
            <input type="checkbox" id="dbg-pivot" ${DesignConfig.DEBUG.showPivot ? 'checked' : ''}>
            Mostrar Pivot
          </label>
          <label class="design-checkbox-label">
            <input type="checkbox" id="dbg-name" ${DesignConfig.DEBUG.showObjectName ? 'checked' : ''}>
            Mostrar Nome
          </label>
          <label class="design-checkbox-label">
            <input type="checkbox" id="dbg-spawn" ${DesignConfig.DEBUG.showSpawnArea ? 'checked' : ''}>
            Mostrar Área Spawn
          </label>
        </div>
      </div>

      <!-- Jogador -->
      ${createSectionHTML('PERSONAGEM (Dino)', 'player', DesignConfig.player, [
        { key: 'scale', label: 'Escala', min: 0.2, max: 2.5, step: 0.05 },
        { key: 'offsetX', label: 'Offset X', min: -50, max: 50, step: 1 },
        { key: 'offsetY', label: 'Offset Y', min: -50, max: 50, step: 1 },
        { key: 'rotation', label: 'Rotação (G)', min: -180, max: 180, step: 5 },
        { key: 'opacity', label: 'Opacidade', min: 0.1, max: 1.0, step: 0.05 },
        { key: 'animationSpeed', label: 'Velocidade Corrida', min: 1, max: 15, step: 1 },
        { key: 'duckWidth', label: 'Largura Agachado', min: 20, max: 120, step: 1 },
        { key: 'duckHeight', label: 'Altura Agachado', min: 10, max: 80, step: 1 }
      ], true)}

      <!-- Obstáculos -->
      ${createSectionHTML('OBSTÁCULOS (Cactos)', 'obstacles', DesignConfig.obstacles, [
        { key: 'scale', label: 'Escala', min: 0.2, max: 2.5, step: 0.05 },
        { key: 'offsetX', label: 'Offset X', min: -50, max: 50, step: 1 },
        { key: 'offsetY', label: 'Offset Y', min: -50, max: 50, step: 1 },
        { key: 'rotation', label: 'Rotação (G)', min: -180, max: 180, step: 5 },
        { key: 'opacity', label: 'Opacidade', min: 0.1, max: 1.0, step: 0.05 }
      ], true)}

      <!-- Pássaros -->
      ${createSectionHTML('PÁSSAROS', 'birds', DesignConfig.birds, [
        { key: 'scale', label: 'Escala', min: 0.2, max: 2.5, step: 0.05 },
        { key: 'offsetX', label: 'Offset X', min: -50, max: 50, step: 1 },
        { key: 'offsetY', label: 'Offset Y', min: -50, max: 50, step: 1 },
        { key: 'rotation', label: 'Rotação (G)', min: -180, max: 180, step: 5 },
        { key: 'opacity', label: 'Opacidade', min: 0.1, max: 1.0, step: 0.05 }
      ], true)}

      <!-- Projéteis -->
      ${createSectionHTML('PROJÉTEIS (Tiros)', 'projectiles', DesignConfig.projectiles, [
        { key: 'scale', label: 'Escala', min: 0.2, max: 3.0, step: 0.1 },
        { key: 'offsetX', label: 'Offset X', min: -30, max: 30, step: 1 },
        { key: 'offsetY', label: 'Offset Y', min: -30, max: 30, step: 1 },
        { key: 'rotation', label: 'Rotação (G)', min: -180, max: 180, step: 5 },
        { key: 'opacity', label: 'Opacidade', min: 0.1, max: 1.0, step: 0.05 }
      ], true)}

      <!-- Alvos Bônus -->
      ${createSectionHTML('ALVOS BÔNUS', 'bonus', DesignConfig.bonus, [
        { key: 'scale', label: 'Escala', min: 0.2, max: 2.5, step: 0.05 },
        { key: 'offsetX', label: 'Offset X', min: -50, max: 50, step: 1 },
        { key: 'offsetY', label: 'Offset Y', min: -50, max: 50, step: 1 },
        { key: 'rotation', label: 'Rotação (G)', min: -180, max: 180, step: 5 },
        { key: 'opacity', label: 'Opacidade', min: 0.1, max: 1.0, step: 0.05 }
      ], true)}

      <!-- Chão -->
      ${createSectionHTML('CHÃO (Ground)', 'ground', DesignConfig.ground, [
        { key: 'scale', label: 'Escala Y', min: 0.2, max: 2.5, step: 0.05 },
        { key: 'offsetY', label: 'Offset Y', min: -30, max: 30, step: 1 },
        { key: 'opacity', label: 'Opacidade', min: 0.1, max: 1.0, step: 0.05 }
      ], false)}

      <!-- Nuvens -->
      ${createSectionHTML('ELEMENTOS CENÁRIO', 'clouds', DesignConfig.clouds, [
        { key: 'scale', label: 'Escala', min: 0.2, max: 2.5, step: 0.05 },
        { key: 'offsetX', label: 'Offset X', min: -50, max: 50, step: 1 },
        { key: 'offsetY', label: 'Offset Y', min: -50, max: 50, step: 1 },
        { key: 'opacity', label: 'Opacidade', min: 0.05, max: 1.0, step: 0.05 }
      ], false)}

      <!-- Fundo -->
      ${createSectionHTML('IMAGEM DE FUNDO', 'background', DesignConfig.background, [
        { key: 'scale', label: 'Escala', min: 0.2, max: 2.5, step: 0.05 },
        { key: 'offsetX', label: 'Offset X', min: -100, max: 100, step: 2 },
        { key: 'offsetY', label: 'Offset Y', min: -100, max: 100, step: 2 },
        { key: 'opacity', label: 'Opacidade', min: 0.05, max: 1.0, step: 0.05 }
      ], false)}
    </div>
  `;

  document.body.appendChild(panel);

  const headers = panel.querySelectorAll('.design-section-header');
  headers.forEach(hdr => {
    hdr.addEventListener('click', () => {
      const section = hdr.parentElement;
      const isAlreadyActive = section.classList.contains('active');
      
      panel.querySelectorAll('.design-section').forEach(s => {
        if (s !== section || isAlreadyActive) {
          s.classList.remove('active');
          s.querySelector('.design-section-content').style.display = 'none';
        }
      });

      if (!isAlreadyActive) {
        section.classList.add('active');
        section.querySelector('.design-section-content').style.display = 'block';
      }
    });
  });

  const sliders = panel.querySelectorAll('input[type="range"]');
  const numbers = panel.querySelectorAll('input[type="number"]');
  const checkboxes = panel.querySelectorAll('input[type="checkbox"]');

  const updateProp = (section, key, val) => {
    DesignConfig[section][key] = parseFloat(val);
    const range = panel.querySelector(`#range-${section}-${key}`);
    const num = panel.querySelector(`#num-${section}-${key}`);
    const valText = panel.querySelector(`#val-${section}-${key}`);
    
    if (range) range.value = val;
    if (num) num.value = val;
    if (valText) valText.innerText = parseFloat(val).toFixed(2).replace(/\.00$/, '');
  };

  sliders.forEach(slide => {
    slide.addEventListener('input', (e) => {
      const sec = e.target.dataset.section;
      const key = e.target.dataset.key;
      updateProp(sec, key, e.target.value);
    });
  });

  numbers.forEach(num => {
    num.addEventListener('input', (e) => {
      const sec = e.target.dataset.section;
      const key = e.target.dataset.key;
      updateProp(sec, key, e.target.value);
    });
  });

  checkboxes.forEach(chk => {
    chk.addEventListener('change', (e) => {
      const sec = e.target.dataset.section;
      const key = e.target.dataset.key;
      if (sec && key) {
        DesignConfig[sec][key] = e.target.checked;
      } else {
        const id = e.target.id;
        if (id === 'dbg-hitbox') DesignConfig.DEBUG.showHitboxes = e.target.checked;
        if (id === 'dbg-pivot') DesignConfig.DEBUG.showPivot = e.target.checked;
        if (id === 'dbg-name') DesignConfig.DEBUG.showObjectName = e.target.checked;
        if (id === 'dbg-spawn') DesignConfig.DEBUG.showSpawnArea = e.target.checked;
      }
    });
  });
}

// Funções de Diálogo e Notificação Customizadas (Aesthetics Premium)
function showCustomConfirm(message, onConfirm) {
  const modal = document.getElementById('custom-confirm-modal');
  const msgEl = document.getElementById('custom-confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  
  if (!modal || !msgEl || !okBtn || !cancelBtn) {
    if (confirm(message)) {
      onConfirm();
    }
    return;
  }
  
  msgEl.textContent = message;
  modal.classList.add('active');
  
  const cleanup = () => {
    modal.classList.remove('active');
    okBtn.replaceWith(okBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  };
  
  document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    cleanup();
    onConfirm();
  });
  
  document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
    cleanup();
  });
}

function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:10000; display:flex; flex-direction:column; gap:10px;';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.style.cssText = 'background:rgba(20,20,35,0.92); border:1px solid var(--accent-color); border-radius:6px; color:#fff; padding:12px 20px; font-family:var(--font-family); font-size:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5); backdrop-filter:blur(8px); opacity:0; transform:translateY(20px); transition:all 0.3s ease; display:flex; align-items:center; gap:8px;';
  toast.innerHTML = `<span style="color:var(--accent-color);">✨</span> ${message}`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

const DefaultLayout = {
  player: {
    editorX: 60,
    editorY: 173,
    width: 53,
    height: 75,
    jumpForce: 12,
    duckWidth: 71,
    duckHeight: 48,
    scale: 1.05,
    offsetX: -4,
    offsetY: -3,
    rotation: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    zIndex: 5
  },
  obstacles: {
    obstaculo_1: {
      editorX: 161,
      editorY: 166,
      width: 58,
      height: 85,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 4
    },
    obstaculo_2: {
      editorX: 238,
      editorY: 170,
      width: 78,
      height: 81,
      scale: 1,
      offsetX: 7,
      offsetY: 3,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 4
    },
    obstaculo_3: {
      editorX: 332,
      editorY: 185,
      width: 88,
      height: 67,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 4
    },
    obstaculo_5: {
      editorX: 530,
      editorY: 170,
      width: 69,
      height: 80,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 4
    },
    obstaculo_6: {
      editorX: 630,
      editorY: 170,
      width: 74,
      height: 80,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 4
    },
    obstaculo_7: {
      editorX: 730,
      editorY: 195,
      width: 107,
      height: 55,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 4
    },
    obstaculo_8: {
      editorX: 850,
      editorY: 175,
      width: 74,
      height: 75,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 4
    }
  },
  birds: {
    editorX: 460,
    editorY: 95,
    width: 46,
    height: 32,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    zIndex: 4
  },
  projectiles: {
    editorX: 130,
    editorY: 200,
    width: 32,
    height: 32,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    zIndex: 3
  },
  bonus: {
    bonus_1: {
      editorX: 628,
      editorY: 160,
      width: 34,
      height: 35,
      scale: 1.25,
      offsetX: 2,
      offsetY: -1,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 3
    },
    bonus_2: {
      editorX: 695,
      editorY: 162,
      width: 29,
      height: 29,
      scale: 1.25,
      offsetX: 1,
      offsetY: -1,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 3
    },
    bonus_3: {
      editorX: 750,
      editorY: 161,
      width: 30,
      height: 28,
      scale: 1.25,
      offsetX: -1,
      offsetY: -1,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 3
    },
    bonus_4: {
      editorX: 803,
      editorY: 155,
      width: 34,
      height: 32,
      scale: 1.25,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      zIndex: 3
    }
  },
  ground: {
    editorX: 0,
    editorY: 248,
    width: 1200,
    height: 12,
    scale: 0.5,
    offsetY: -14,
    opacity: 1,
    zIndex: 3
  },
  clouds: {
    editorX: 620,
    editorY: 35,
    width: 80,
    height: 14,
    scale: 1.5,
    offsetX: 0,
    offsetY: 0,
    opacity: 0.85,
    zIndex: 1
  },
  background: {
    editorX: 98,
    editorY: 9,
    width: 1200,
    height: 300,
    scale: 1,
    offsetX: -1,
    offsetY: -21,
    opacity: 0.8,
    zIndex: 0
  },
  ui: {
    editorX: 670,
    editorY: 15,
    width: 110,
    height: 20,
    opacity: 1,
    zIndex: 10
  }
};

function resetDesignConfigToDefault(game) {
  showCustomConfirm("Deseja realmente resetar o layout para as configurações padrão originais?", () => {
    const deepUpdate = (target, source) => {
      for (const key in source) {
        if (source[key] !== null && typeof source[key] === 'object') {
          if (!target[key]) target[key] = {};
          deepUpdate(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };

    deepUpdate(DesignConfig, DefaultLayout);
    
    // Re-inicializa as entidades do editor com a nova configuração padrão
    game.initEditorEntities();
    
    // Desseleciona a entidade ativa para evitar inconsistências nos controles
    game.selectedEntity = null;
    updateEditorSelectionControls(game);
    
    showToast("Layout resetado para as configurações padrão com sucesso!");
  });
}

/*****************************************************************************
 * INJEÇÃO DINÂMICA DA INTERFACE DO EDITOR DE CENA (SCENE EDITOR)
 *****************************************************************************/

function setupSceneEditorUI(game) {
  document.body.classList.add('design-active');
  
  const panel = document.createElement('div');
  panel.id = 'scene-editor-panel';
  
  let listHTML = '';
  game.editorEntities.forEach(ent => {
    listHTML += `
      <div class="object-list-item">
        <label style="flex:1; cursor:pointer;">
          <input type="checkbox" id="vis-${ent.id}" ${ent.active ? 'checked' : ''} data-id="${ent.id}">
          <span
            class="ent-select-btn"
            data-id="${ent.id}"
            style="flex:1; padding:2px 6px; border-radius:3px; cursor:pointer; transition:background 0.15s;"
            title="Clique para selecionar e editar ${ent.name}"
          >${ent.name}</span>
        </label>
      </div>
    `;
  });

  panel.innerHTML = `
    <div id="scene-editor-panel-header">
      <h2>EDITOR DE CENA</h2>
    </div>
    <div class="design-panel-scroll">

      <!-- ZOOM DO CANVAS -->
      <div style="background:rgba(0,229,255,0.06); border:1px solid #1a3a3a; border-radius:6px; padding:8px 10px; margin-bottom:12px;">
        <div style="font-size:9px; color:#00e5ff; font-weight:bold; letter-spacing:1px; margin-bottom:6px;">🔍 ZOOM DO EDITOR</div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button id="zoom-out-btn" style="padding:4px 10px; font-size:14px; background:#1a1a22; color:#00e5ff; border:1px solid #00e5ff; border-radius:4px; cursor:pointer; font-weight:bold;">−</button>
          <div style="flex:1; text-align:center; font-size:12px; font-weight:bold; color:#fff;" id="zoom-label">1.0×</div>
          <button id="zoom-in-btn" style="padding:4px 10px; font-size:14px; background:#1a1a22; color:#00e5ff; border:1px solid #00e5ff; border-radius:4px; cursor:pointer; font-weight:bold;">+</button>
          <button id="zoom-reset-btn" style="padding:4px 8px; font-size:10px; background:#1a1a22; color:#aaa; border:1px solid #444; border-radius:4px; cursor:pointer;">1×</button>
        </div>
        <div style="font-size:9px; color:#666; margin-top:4px; text-align:center;">Ou use Ctrl+Scroll na tela</div>
      </div>

      <h3 style="font-size: 11px; font-weight:800; color:#00e5ff; letter-spacing:1px; margin-bottom:6px;">ELEMENTOS DA CENA</h3>
      <div style="font-size:9px; color:#888; margin-bottom:8px;">☑ = visível | Clique no <span style='color:#00e5ff;'>nome</span> para selecionar e editar</div>
      <div class="object-list-container">
        ${listHTML}
      </div>

      <div id="editor-selection-controls">
        <p style="font-size:11px; color:#aaa; text-align:center; padding: 20px 0; font-family: var(--font-family);">Clique em um elemento da lista ou no Canvas para editar suas propriedades.</p>
      </div>
    </div>
    <div style="padding: 12px; border-top:1px solid #2d2d36; background-color: rgba(35,35,42,0.6);">
      <button id="editor-show-all-btn" class="panel-footer-btn secondary">MOSTRAR TODOS</button>
      <button id="editor-reset-btn" class="panel-footer-btn secondary" style="margin-top:8px;">RESETAR PADRÃO</button>
      <button id="editor-save-btn" class="panel-footer-btn" style="margin-top:8px;">SALVAR CONFIGURAÇÃO</button>
      <button id="editor-back-btn" class="panel-footer-btn secondary" style="margin-top:8px;">VOLTAR AO JOGO</button>
    </div>
  `;

  document.body.appendChild(panel);

  // --- Checkbox de visibilidade ---
  game.editorEntities.forEach(ent => {
    panel.querySelector(`#vis-${ent.id}`).addEventListener('change', (e) => {
      ent.active = e.target.checked;
    });
  });

  // --- Clique no nome = selecionar entidade e rolar painel ---
  panel.querySelectorAll('.ent-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const ent = game.editorEntities.find(e => e.id === id);
      if (ent) {
        game.selectedEntity = ent;
        ent.active = true;
        const chk = panel.querySelector(`#vis-${ent.id}`);
        if (chk) chk.checked = true;
        // Destaca o item selecionado
        panel.querySelectorAll('.ent-select-btn').forEach(b => b.style.background = 'transparent');
        btn.style.background = 'rgba(0,229,255,0.15)';
        btn.style.color = '#00e5ff';
        updateEditorSelectionControls(game);
        // Rola para o painel de controles
        const ctrl = panel.querySelector('#editor-selection-controls');
        if (ctrl) ctrl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    btn.addEventListener('mouseenter', () => {
      if (game.selectedEntity && game.selectedEntity.id === btn.dataset.id) return;
      btn.style.background = 'rgba(255,255,255,0.05)';
    });
    btn.addEventListener('mouseleave', () => {
      if (game.selectedEntity && game.selectedEntity.id === btn.dataset.id) return;
      btn.style.background = 'transparent';
    });
  });

  // --- Funções de Zoom ---
  const applyZoom = (z) => {
    z = Math.min(4, Math.max(0.5, Math.round(z * 4) / 4)); // steps de 0.25
    game.editorZoom = z;
    window._editorZoom = z;
    game.canvas.style.transform = `scale(${z})`;
    game.canvas.style.transformOrigin = 'top left';
    const label = panel.querySelector('#zoom-label');
    if (label) label.textContent = z.toFixed(2) + '×';
  };

  panel.querySelector('#zoom-in-btn').addEventListener('click', () => applyZoom(game.editorZoom + 0.25));
  panel.querySelector('#zoom-out-btn').addEventListener('click', () => applyZoom(game.editorZoom - 0.25));
  panel.querySelector('#zoom-reset-btn').addEventListener('click', () => applyZoom(1));

  // Ctrl+Scroll para zoom
  game.canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      applyZoom(game.editorZoom + (e.deltaY < 0 ? 0.25 : -0.25));
    }
  }, { passive: false });

  panel.querySelector('#editor-show-all-btn').addEventListener('click', () => {
    game.editorEntities.forEach(ent => {
      ent.active = true;
      const chk = panel.querySelector(`#vis-${ent.id}`);
      if (chk) chk.checked = true;
    });
  });

  panel.querySelector('#editor-save-btn').addEventListener('click', () => {
    // Grava posição, tamanho e offset de CADA entidade no seu próprio sub-config
    game.editorEntities.forEach(ent => {
      const c = ent.config; // referência direta ao sub-objeto correto do DesignConfig
      if (!c) return;

      // Sempre grava posição, tamanho e offset visual
      c.editorX  = Math.round(ent.x);
      c.editorY  = Math.round(ent.y);
      c.width    = Math.round(ent.width);
      c.height   = Math.round(ent.height);
      if (c.offsetX !== undefined) c.offsetX = ent.config.offsetX;
      if (c.offsetY !== undefined) c.offsetY = ent.config.offsetY;

      // Campos específicos por tipo
      if (ent.type === 'player') {
        // duckWidth/duckHeight não são editados no editor — mantém o valor atual
      }
    });

    // 1. Grava no localStorage para consistência imediata
    localStorage.setItem('dino_design_config', JSON.stringify(DesignConfig, null, 2));

    // 2. Tenta fazer o POST para salvar diretamente no arquivo design.js no servidor local
    fetch('/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(DesignConfig, null, 2)
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        showToast("Configuração visual salva com sucesso no arquivo design.js!");
      } else {
        showToast("Configuração salva no navegador, mas ocorreu um erro no servidor: " + data.message);
      }
    })
    .catch(err => {
      // Fallback clássico caso o servidor customizado não esteja ativo
      console.warn("Servidor de gravação de arquivos indisponível. Salvo apenas no localStorage.");
      showToast("Configuração salva com sucesso no localStorage!");
    });

    console.log("=== CONFIGURAÇÃO VISUAL SALVA (DUMP) ===");
    console.log(JSON.stringify(DesignConfig, null, 2));
  });

  panel.querySelector('#editor-reset-btn').addEventListener('click', () => {
    resetDesignConfigToDefault(game);
  });

  panel.querySelector('#editor-back-btn').addEventListener('click', () => {
    game.toggleSceneEditor();
  });

  updateEditorSelectionControls(game);
}

function updateEditorSelectionControls(game) {
  const container = document.querySelector('#editor-selection-controls');
  if (!container) return;

  const ent = game.selectedEntity;
  if (!ent) {
    container.innerHTML = `<p style="font-size:11px; color:#aaa; text-align:center; padding: 20px 0; font-family: var(--font-family);">Selecione um elemento no Canvas para editar suas propriedades.</p>`;
    return;
  }

  const config = ent.config;
  
  let html = `
    <h4 style="font-size:11px; color:#00e5ff; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:4px; font-family: var(--font-family);">${ent.name.toUpperCase()}</h4>
  `;

  // === BLOCO ESPECIAL: CHÃO ===
  if (ent.type === 'ground') {
    const gOffY = config.offsetY || 0;
    html += `
    <div style="background:rgba(100,255,100,0.07); border:1px solid #1a4a1a; border-radius:4px; padding:8px 10px; margin-bottom:8px;">
      <div style="font-size:9px; color:#66ff66; font-weight:bold; letter-spacing:1px; margin-bottom:6px;">🟩 POSIÇÃO DO CHÃO</div>
      <div style="font-size:9px; color:#aaa; margin-bottom:8px;">Ajusta a altura em que a linha do chão aparece na tela.<br>Negativo = sobe o chão | Positivo = desce o chão</div>
      <div class="design-control">
        <label>Deslocamento Y do Chão (${gOffY}px)</label>
        <input type="range" id="edit-ground-offsetY" min="-80" max="80" step="1" value="${gOffY}">
      </div>
      <button id="btn-reset-ground" style="margin-top:4px; padding:3px 10px; font-size:9px; background:#0a2a0a; color:#66ff66; border:1px solid #66ff66; border-radius:3px; cursor:pointer; width:100%;">\u21ba Resetar Posição (0)</button>
    </div>

    <!-- OPACIDADE E ESCALA DO CHÃO -->
    <div style="background:rgba(0,229,255,0.06); border:1px solid #1a3a3a; border-radius:4px; padding:6px 8px; margin-bottom:8px;">
      <div style="font-size:9px; color:#00e5ff; font-weight:bold; letter-spacing:1px; margin-bottom:6px;">🎨 VISUAL</div>
      <div class="design-control">
        <label>Escala (${(config.scale||1).toFixed(2)})</label>
        <input type="range" id="edit-ground-scale" min="0.5" max="3.0" step="0.05" value="${config.scale || 1}">
      </div>
      <div class="design-control">
        <label>Opacidade (${(config.opacity||1).toFixed(2)})</label>
        <input type="range" id="edit-ground-opacity" min="0" max="1" step="0.05" value="${config.opacity || 1}">
      </div>
    </div>
    `;
    container.innerHTML = html;

    const sliderOffY = container.querySelector('#edit-ground-offsetY');
    sliderOffY.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      config.offsetY = v;
      DesignConfig.ground.offsetY = v;
      sliderOffY.previousElementSibling.textContent = `Deslocamento Y do Chão (${v}px)`;
    });
    container.querySelector('#btn-reset-ground').addEventListener('click', () => {
      config.offsetY = 0;
      DesignConfig.ground.offsetY = 0;
      updateEditorSelectionControls(game);
    });
    const sliderScale = container.querySelector('#edit-ground-scale');
    sliderScale.addEventListener('input', (e) => {
      config.scale = parseFloat(e.target.value);
    });
    const sliderOp = container.querySelector('#edit-ground-opacity');
    sliderOp.addEventListener('input', (e) => {
      config.opacity = parseFloat(e.target.value);
    });
    return; // Não mostra o painel genérico para o chão
  }

  // === BLOCO ESPECIAL: PLAYER ===
  if (ent.type === 'player') {
    const jumpVal = config.jumpForce || 14.5;
    const duckW = config.duckWidth || 71;
    const duckH = config.duckHeight || 48;
    html += `
    <div style="background:rgba(255,82,82,0.08); border:1px solid #5a1a1a; border-radius:4px; padding:8px 10px; margin-bottom:8px;">
      <div style="font-size:9px; color:#ff5252; font-weight:bold; letter-spacing:1px; margin-bottom:6px; font-family:var(--font-family);">🦖 PROPRIEDADES DO PLAYER</div>
      <div class="design-control">
        <label>Força do Pulo (${jumpVal.toFixed(1)})</label>
        <input type="range" id="edit-player-jumpForce" min="8.0" max="22.0" step="0.5" value="${jumpVal}">
      </div>
      <div class="design-control">
        <label>Largura Agachado (${duckW}px)</label>
        <input type="range" id="edit-player-duckWidth" min="20" max="120" step="1" value="${duckW}">
      </div>
      <div class="design-control">
        <label>Altura Agachado (${duckH}px)</label>
        <input type="range" id="edit-player-duckHeight" min="10" max="80" step="1" value="${duckH}">
      </div>
    </div>
    `;
  }

  // === PAINEL GENÉRICO: TODOS OS OUTROS ELEMENTOS ===
  html += `
    <!-- HITBOX / POSIÇÃO FÍSICA -->
    <div style="background:rgba(0,229,255,0.06); border:1px solid #1a3a3a; border-radius:4px; padding:6px 8px; margin-bottom:8px;">
      <div style="font-size:9px; color:#00e5ff; font-weight:bold; letter-spacing:1px; margin-bottom:6px; font-family:var(--font-family);">\ud83d\udcd0 HITBOX (COLISÃO FÍSICA)</div>
      <div class="design-control">
        <label>Posição X (${ent.x.toFixed(0)})</label>
        <input type="range" id="edit-physX" min="-100" max="1200" step="1" value="${ent.x.toFixed(0)}">
      </div>
      <div class="design-control">
        <label>Posição Y (${ent.y.toFixed(0)})</label>
        <input type="range" id="edit-physY" min="-50" max="350" step="1" value="${ent.y.toFixed(0)}">
      </div>
      <div class="design-control">
        <label>Largura (${ent.width.toFixed(0)}px)</label>
        <input type="range" id="edit-physW" min="5" max="300" step="1" value="${ent.width.toFixed(0)}">
      </div>
      <div class="design-control">
        <label>Altura (${ent.height.toFixed(0)}px)</label>
        <input type="range" id="edit-physH" min="5" max="300" step="1" value="${ent.height.toFixed(0)}">
      </div>
    </div>

    <!-- POSIÇÃO DA IMAGEM DENTRO DA HITBOX -->
    ${config && config.offsetX !== undefined ? `
    <div style="background:rgba(255,152,0,0.09); border:1px solid #5a3a00; border-radius:4px; padding:6px 8px; margin-bottom:8px;">
      <div style="font-size:9px; color:#ff9800; font-weight:bold; letter-spacing:1px; margin-bottom:4px; font-family:var(--font-family);">\ud83d\uddbc\ufe0f POSIÇÃO DA IMAGEM (dentro da hitbox)</div>
      <div style="font-size:9px; color:#aaa; margin-bottom:6px; font-family:var(--font-family);">Arraste o losango <span style='color:#ff9800;'>\u25c6</span> no canvas, ou use os sliders abaixo.<br>A hitbox (azul) não se move \u2014 só a imagem.</div>
      <div class="design-control">
        <label>Offset X da Imagem (${config.offsetX}px)</label>
        <input type="range" id="edit-offsetX" min="-150" max="150" step="1" value="${config.offsetX}">
      </div>
      <div class="design-control">
        <label>Offset Y da Imagem (${config.offsetY}px)</label>
        <input type="range" id="edit-offsetY" min="-150" max="150" step="1" value="${config.offsetY}">
      </div>
      <button id="btn-reset-offset" style="margin-top:4px; padding:3px 10px; font-size:9px; background:#3a2000; color:#ff9800; border:1px solid #ff9800; border-radius:3px; cursor:pointer; font-family:var(--font-family); width:100%;">\u21ba Resetar Offset (0, 0)</button>
    </div>
    ` : ''}
  `;

  if (config) {
    if (config.scale !== undefined) {
      html += `
        <div class="design-control">
          <label>Escala do Sprite (${config.scale.toFixed(2)})</label>
          <input type="range" id="edit-scale" min="0.1" max="3.0" step="0.05" value="${config.scale}">
        </div>
      `;
    }
    // offsetX e offsetY agora estão no bloco de destaque acima — não duplicar aqui
    if (config.rotation !== undefined) {
      html += `
        <div class="design-control">
          <label>Rotação (${config.rotation})</label>
          <input type="range" id="edit-rotation" min="-180" max="180" step="5" value="${config.rotation}">
        </div>
      `;
    }
    if (config.opacity !== undefined) {
      html += `
        <div class="design-control">
          <label>Opacidade (${config.opacity.toFixed(2)})</label>
          <input type="range" id="edit-opacity" min="0.0" max="1.0" step="0.05" value="${config.opacity}">
        </div>
      `;
    }
    if (config.zIndex !== undefined) {
      html += `
        <div class="design-control">
          <label>Z Index (${config.zIndex})</label>
          <input type="range" id="edit-zIndex" min="0" max="15" step="1" value="${config.zIndex}">
        </div>
      `;
    }
    if (config.flipX !== undefined) {
      html += `
        <label class="design-checkbox-label">
          <input type="checkbox" id="edit-flipX" ${config.flipX ? 'checked' : ''}>
          Espelhar Horizontal (Flip X)
        </label>
      `;
    }
    if (config.flipY !== undefined) {
      html += `
        <label class="design-checkbox-label">
          <input type="checkbox" id="edit-flipY" ${config.flipY ? 'checked' : ''}>
          Espelhar Vertical (Flip Y)
        </label>
      `;
    }
  }

  container.innerHTML = html;

  const elPhysX = container.querySelector('#edit-physX');
  elPhysX.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    ent.x = val;
    elPhysX.previousElementSibling.textContent = `Posição X (${val.toFixed(0)})`;
  });
  const elPhysY = container.querySelector('#edit-physY');
  elPhysY.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    ent.y = val;
    elPhysY.previousElementSibling.textContent = `Posição Y (${val.toFixed(0)})`;
  });
  const elPhysW = container.querySelector('#edit-physW');
  elPhysW.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    ent.width = val;
    elPhysW.previousElementSibling.textContent = `Largura (${val.toFixed(0)}px)`;
  });
  const elPhysH = container.querySelector('#edit-physH');
  elPhysH.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    ent.height = val;
    elPhysH.previousElementSibling.textContent = `Altura (${val.toFixed(0)}px)`;
  });

  if (ent.type === 'player') {
    const sliderJump = container.querySelector('#edit-player-jumpForce');
    sliderJump.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      config.jumpForce = v;
      DesignConfig.player.jumpForce = v;
      sliderJump.previousElementSibling.textContent = `Força do Pulo (${v.toFixed(1)})`;
    });

    const sliderDuckW = container.querySelector('#edit-player-duckWidth');
    if (sliderDuckW) {
      sliderDuckW.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        config.duckWidth = v;
        DesignConfig.player.duckWidth = v;
        sliderDuckW.previousElementSibling.textContent = `Largura Agachado (${v}px)`;
      });
    }

    const sliderDuckH = container.querySelector('#edit-player-duckHeight');
    if (sliderDuckH) {
      sliderDuckH.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        config.duckHeight = v;
        DesignConfig.player.duckHeight = v;
        sliderDuckH.previousElementSibling.textContent = `Altura Agachado (${v}px)`;
      });
    }
  }

  if (config) {
    if (config.scale !== undefined) {
      const elScale = container.querySelector('#edit-scale');
      elScale.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        config.scale = val;
        elScale.previousElementSibling.textContent = `Escala do Sprite (${val.toFixed(2)})`;
      });
    }
    if (config.offsetX !== undefined) {
      const elX = container.querySelector('#edit-offsetX');
      const elY = container.querySelector('#edit-offsetY');
      if (elX) {
        elX.addEventListener('input', (e) => {
          config.offsetX = parseInt(e.target.value, 10);
          // Atualiza label em tempo real
          const lbl = elX.previousElementSibling;
          if (lbl) lbl.textContent = `Offset X da Imagem (${config.offsetX}px)`;
        });
      }
      if (elY) {
        elY.addEventListener('input', (e) => {
          config.offsetY = parseInt(e.target.value, 10);
          const lbl = elY.previousElementSibling;
          if (lbl) lbl.textContent = `Offset Y da Imagem (${config.offsetY}px)`;
        });
      }
      const btnReset = container.querySelector('#btn-reset-offset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          config.offsetX = 0;
          config.offsetY = 0;
          updateEditorSelectionControls(game);
        });
      }
    }
    if (config.rotation !== undefined) {
      const elRot = container.querySelector('#edit-rotation');
      elRot.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        config.rotation = val;
        elRot.previousElementSibling.textContent = `Rotação (${val})`;
      });
    }
    if (config.opacity !== undefined) {
      const elOp = container.querySelector('#edit-opacity');
      elOp.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        config.opacity = val;
        elOp.previousElementSibling.textContent = `Opacidade (${val.toFixed(2)})`;
      });
    }
    if (config.zIndex !== undefined) {
      const elZ = container.querySelector('#edit-zIndex');
      elZ.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        config.zIndex = val;
        elZ.previousElementSibling.textContent = `Z Index (${val})`;
      });
    }
    if (config.flipX !== undefined) {
      container.querySelector('#edit-flipX').addEventListener('change', (e) => {
        config.flipX = e.target.checked;
      });
    }
    if (config.flipY !== undefined) {
      container.querySelector('#edit-flipY').addEventListener('change', (e) => {
        config.flipY = e.target.checked;
      });
    }
  }
}

// Inicializa Assets e roda o jogo
window.addEventListener('DOMContentLoaded', () => {
  // Configuração do Tema Claro / Escuro (Dashboard)
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    const themeIcon = themeToggleBtn.querySelector('.theme-icon');
    const savedTheme = localStorage.getItem('dino-portfolio-theme') || 'dark';
    const isLight = savedTheme === 'light';
    
    document.body.classList.toggle('light-theme', isLight);
    if (themeIcon) {
      themeIcon.textContent = isLight ? '☀️' : '🌙';
    }
    
    themeToggleBtn.addEventListener('click', () => {
      const activeLight = document.body.classList.toggle('light-theme');
      localStorage.setItem('dino-portfolio-theme', activeLight ? 'light' : 'dark');
      if (themeIcon) {
        themeIcon.textContent = activeLight ? '☀️' : '🌙';
      }
    });
  }

  AssetManager.load(() => {
    const game = new Game('gameCanvas');
    window.game = game;
    
    // Configuração do Slider e Botões de Som
    const sfxToggleBtn = document.getElementById('sfx-toggle');
    const musicToggleBtn = document.getElementById('music-toggle');
    const volumeSlider = document.getElementById('volume-slider');
    
    const updateAudioUI = () => {
      // Atualiza botão SFX
      if (sfxToggleBtn) {
        const sfxIcon = sfxToggleBtn.querySelector('.sfx-icon');
        if (game.audio.sfxMuted) {
          sfxToggleBtn.classList.add('muted');
          if (sfxIcon) sfxIcon.textContent = '🔇';
          sfxToggleBtn.title = "Efeitos do Jogo (SFX): Mutados";
        } else {
          sfxToggleBtn.classList.remove('muted');
          if (sfxIcon) sfxIcon.textContent = '🔊';
          sfxToggleBtn.title = "Efeitos do Jogo (SFX): Ativados";
        }
      }
      
      // Atualiza botão Música
      if (musicToggleBtn) {
        const musicIcon = musicToggleBtn.querySelector('.music-icon');
        if (game.audio.musicMuted) {
          musicToggleBtn.classList.add('muted');
          if (musicIcon) musicIcon.textContent = '❌';
          musicToggleBtn.title = "Música de Fundo: Mutada";
        } else {
          musicToggleBtn.classList.remove('muted');
          if (musicIcon) musicIcon.textContent = '🎵';
          musicToggleBtn.title = "Música de Fundo: Ativada";
        }
      }

      // Atualiza Slider
      if (volumeSlider) {
        volumeSlider.value = game.audio.volume;
        if (game.audio.musicMuted) {
          volumeSlider.style.opacity = '0.3';
          volumeSlider.disabled = true;
        } else {
          volumeSlider.style.opacity = '1.0';
          volumeSlider.disabled = false;
        }
      }
    };

    if (volumeSlider) {
      const savedVolume = localStorage.getItem('dino_audio_volume');
      const startVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.3;
      game.audio.setVolume(startVolume);
      
      volumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        game.audio.setVolume(vol);
        updateAudioUI();
      });
    }

    if (sfxToggleBtn) {
      sfxToggleBtn.addEventListener('click', () => {
        game.audio.toggleSfxMute();
        updateAudioUI();
      });
    }

    if (musicToggleBtn) {
      musicToggleBtn.addEventListener('click', () => {
        game.audio.toggleMusicMute();
        updateAudioUI();
      });
    }

    updateAudioUI();

    // Configuração dos Botões Virtuais Mobile (Toque e Clique)
    const btnMobileJump = document.getElementById('btn-mobile-jump');
    const btnMobileShoot = document.getElementById('btn-mobile-shoot');

    if (btnMobileJump) {
      const handleJumpStart = (e) => {
        e.preventDefault();
        game.input.isJumping = true; // Habilita pulo alto progressivo ao segurar!
        
        if (game.state === State.PLAYING) {
          if (!game.player.isJumping) {
            game.player.velocityY = -(DesignConfig.player.jumpForce || 14.5);
            game.player.isJumping = true;
            game.player.state = 'JUMPING';
            game.audio.playJump();
          }
        } else if (game.state === State.GAME_OVER || game.state === State.GAME_WIN) {
          game.reset();
          game.state = State.PLAYING;
        } else if (game.state === State.MENU) {
          game.reset();
          game.state = State.PLAYING;
        } else if (game.state === State.HOW_TO_PLAY || game.state === State.CREDITS || game.state === State.SCORE_BOARD) {
          game.state = State.MENU;
        }
      };

      const handleJumpEnd = (e) => {
        e.preventDefault();
        game.input.isJumping = false; // Interrompe pulo alto ao soltar
      };

      btnMobileJump.addEventListener('touchstart', handleJumpStart, { passive: false });
      btnMobileJump.addEventListener('touchend', handleJumpEnd, { passive: false });
      btnMobileJump.addEventListener('mousedown', handleJumpStart);
      btnMobileJump.addEventListener('mouseup', handleJumpEnd);
      btnMobileJump.addEventListener('mouseleave', handleJumpEnd);
    }

    if (btnMobileShoot) {
      const handleShoot = (e) => {
        e.preventDefault();
        if (game.state === State.PLAYING) {
          game.shoot();
        }
      };

      btnMobileShoot.addEventListener('touchstart', handleShoot, { passive: false });
      btnMobileShoot.addEventListener('mousedown', handleShoot);
    }

    game.init();

    // Tenta iniciar a música imediatamente (se o navegador permitir autoplay)
    try {
      game.audio.startMusic();
    } catch (e) {
      console.log("Autoplay bloqueado pelo navegador, aguardando interação.");
    }

    // Inicia a música com qualquer interação do usuário (fallback obrigatório)
    const startMusicOnGesture = () => {
      game.audio.startMusic();
      window.removeEventListener('click', startMusicOnGesture);
      window.removeEventListener('keydown', startMusicOnGesture);
      window.removeEventListener('touchstart', startMusicOnGesture);
    };
    window.addEventListener('click', startMusicOnGesture);
    window.addEventListener('keydown', startMusicOnGesture);
    window.addEventListener('touchstart', startMusicOnGesture);

    // Monta design mode por padrão se ativo
    setupDesignEditor(game);
  });
});
