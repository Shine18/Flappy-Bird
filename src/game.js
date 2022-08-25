import * as PIXI from "pixi.js";
import { sound } from "@pixi/sound";

// assets
import BirdMidFlap from "./assets/bird/redbird-midflap.png";
import BirdUpFlap from "./assets/bird/redbird-upflap.png";
import BirdDownFlap from "./assets/bird/redbird-downflap.png";
import BackgroundImage from "./assets/background-day.png";
import BaseImage from "./assets/base.png";
import PipeImage from "./assets/pipe-green.png";

// import WingSound from "./assets/sounds/wing.wav"
// import DieSound from "./assets/sounds/die.wav"
// import HitSound from "./assets/sounds/hit.wav"

function degToRad(deg) {
  return deg * (Math.PI / 180);
}

function isColliding(object1, object2, hitArea = false) {
  const bounds1 = hitArea ? object1.hitArea : object1.getBounds();
  const bounds2 = hitArea ? object2.hitArea : object2.getBounds();

  const x1 = hitArea ? object1.getBounds().x + bounds1.x : bounds1.x,
    y1 = hitArea ? object1.getBounds().y + bounds1.y : bounds1.y,
    x2 = hitArea ? object2.getBounds().x + bounds2.x : bounds2.x,
    y2 = hitArea ? object2.getBounds().y + bounds2.y : bounds2.y;

  return (
    x1 < x2 + bounds2.width &&
    x1 + bounds1.width > x2 &&
    y1 < y2 + bounds2.height &&
    y1 + bounds1.height > y2
  );
}

export default class Game {
  sprites = {
    pipes: [],
  };
  UI = {}
  textures = {};
  state = {
    score: 0,
    started: false,
    isBirdDropping: false,
    birdHoppingTimeout: undefined,
    gameOver: false,
  };
  MAX_DROP_SPEED = 7;
  GRAVITY = 2;
  PIPES_GAP = 270;
  GAME_DIFFICULTY = 3;
  initPIXI() {
    let width = window.innerWidth,
      height = window.innerHeight - 5;

    const ratio = height / 512;
    width = 288 * ratio;

    width = 288;
    height = 512;

    console.log("width", width);
    console.log("height", height);

    this.app = new PIXI.Application({
      width,
      height,
      transparent: true,
      resolution: window.devicePixelRatio || 1,
    });
    document.body.appendChild(this.app.view);
    this.app.stage.sortableChildren = true;
  }
  loadSounds(){
    sound.add('wing',require("url:./assets/sounds/wing.wav"))
    sound.add('hit',require("url:./assets/sounds/hit.wav"))
    sound.add('die',require("url:./assets/sounds/die.wav"))
    sound.add('swoosh',require("url:./assets/sounds/swoosh.wav"))
    sound.add('point',require("url:./assets/sounds/point.wav"))
  }
  createSprites() {
    //background
    const bgTexture = PIXI.Texture.from(BackgroundImage);
    this.sprites.background = new PIXI.Sprite(bgTexture);
    const baseTexture = PIXI.Texture.from(BaseImage);
    this.sprites.base = new PIXI.Sprite(baseTexture);

    //birds
    this.textures.BIRD_UP_FLAP = PIXI.Texture.from(BirdUpFlap);
    this.textures.BIRD_MID_FLAP = PIXI.Texture.from(BirdMidFlap);
    this.textures.BIRD_DOWN_FLAP = PIXI.Texture.from(BirdDownFlap);
    this.sprites.bird = PIXI.Sprite.from(BirdMidFlap);
    this.sprites.bird.zIndex = 9;
    this.sprites.bird.hitArea = new PIXI.Rectangle(0, 0, 25, 20);
  }
  createUI() {
    const style = new PIXI.TextStyle({
      fontFamily: "Arial",
      fontSize: 12,
      fontStyle: "normal",
      fontWeight: "bold",
      fill: ["#ffffff"], // gradient
      stroke: "#4a1850",
      strokeThickness: 0,
      dropShadow: false,
      dropShadowColor: "#000000",
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 6,
      wordWrap: true,
      wordWrapWidth: 440,
      lineJoin: "round",
    });

    const richText = new PIXI.Text(
      "Score: " + this.state.score,
      style
    );
    richText.x = 15;
    richText.y = 10;
    richText.zIndex = 40

    this.app.stage.addChild(richText)
    this.UI.scoreText = richText

    const playBtnStyle = new PIXI.TextStyle({
      fontFamily: "Arial",
      fontSize: 45,
      fontStyle: "normal",
      fontWeight: "bold",
      background: "#fff000",
      fill: [ "#fff000"], // gradient
      stroke: "#4a1850",
      strokeThickness: 3,
      dropShadow: true,
      dropShadowColor: "#fff",
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 1,
      wordWrap: true,
      wordWrapWidth: 440,
      lineJoin: "round",
    });

    const playBtn = new PIXI.Text(
      "Play",
      playBtnStyle
    );
    playBtn.x = 100;
    playBtn.y = 300;
    playBtn.zIndex = 40
    this.app.stage.addChild(playBtn)
    this.UI.playBtn = playBtn
  }
  updateScoreText() {
    this.UI.scoreText.text = `Score: ${this.state.score}`
  }
  addBackground() {
    const _t = this;
    const { app, sprites } = _t;
    const { stage } = app;

    const backgroundContainer = new PIXI.Container();
    backgroundContainer.addChild(sprites.background);

    backgroundContainer.hitArea = new PIXI.Rectangle(
      0,
      0,
      app.renderer.width,
      app.renderer.height
    );
    backgroundContainer.buttonMode = true;
    backgroundContainer.interactive = true;

    backgroundContainer.on("pointerdown", (event) => {
      _t.onTap();
    });
    // sprites.background.
    sprites.base.anchor.set(0, 0);
    sprites.base.y = 400;
    sprites.base.zIndex = 7;
    sprites.base.width = this.app.screen.width;
    sprites.base.hitArea = new PIXI.Rectangle(
      0,
      0,
      sprites.base.width,
      sprites.base.height
    );
    stage.addChild(backgroundContainer);
    stage.addChild(sprites.base);
  }
  addPipes() {
    const pipesPosition = Math.floor(Math.random() * 100) - 60;
    const topPipe = PIXI.Sprite.from(PipeImage);
    const bottomPipe = PIXI.Sprite.from(PipeImage);
    const { renderer } = this.app;
    const { PIPES_GAP, GAME_DIFFICULTY } = this;

    bottomPipe.anchor.set(0, 1);
    bottomPipe.x = renderer.width;
    bottomPipe.y = renderer.height + PIPES_GAP / 2 + pipesPosition;
    bottomPipe.acceleration = new PIXI.Point(GAME_DIFFICULTY * -0.5, 0);

    bottomPipe.hitArea = new PIXI.Rectangle(0, 0, 50, 320);
    // bottomPipe.hitArea = new PIXI.Rectangle(0, 0, 0,0);

    topPipe.anchor.set(1, 1);
    topPipe.rotation = degToRad(180);
    topPipe.x = renderer.width;
    topPipe.y = -(PIPES_GAP / 2) + pipesPosition;
    topPipe.acceleration = new PIXI.Point(GAME_DIFFICULTY * -0.5, 0);
    topPipe.hitArea = new PIXI.Rectangle(0, -10, 50, 320);
    this.sprites.pipes.push({ topPipe, bottomPipe, scored: false });
    this.app.stage.addChild(topPipe, bottomPipe);
  }
  addBird() {
    const { app } = this;
    const { bird } = this.sprites;
    app.stage.addChild(bird);
    bird.anchor.set(0.5, 0.5);
    bird.x = app.screen.width / 2;
    bird.y = app.screen.height / 2;
    bird.acceleration = new PIXI.Point(0);
  }

  setBirdDirection() {
    const { bird } = this.sprites;
    const { textures } = this;
    if (bird.acceleration.y > 0) {
      bird.texture = textures.BIRD_DOWN_FLAP;
    } else if (bird.acceleration.y < 0) {
      bird.texture = textures.BIRD_UP_FLAP;
    } else {
      bird.texture = textures.BIRD_MID_FLAP;
    }
  }

  onTap() {
    const _t = this;
    const { state } = this;
    const {bird} = this.sprites
    if (state.started && !state.gameOver) {
      // TODO: jump the bird
      console.log("Bird Hop");
      _t.birdHop();
    } else {
      this.state.started = true;
      this.state.gameOver = false
      this.resetScore()
      bird.x = app.screen.width / 2;
      bird.y = app.screen.height / 3;
      this.UI.playBtn.visible = false
    }
  }

  birdHop() {
    const _t = this;
    const state = _t.state;
    const bird = _t.sprites.bird;
    _t.GRAVITY = 0.1;
    bird.acceleration.set(0, -10);
    bird.rotation = degToRad(-30);

    sound.play('wing')
    if (state.birdHoppingTimeout) {
      clearTimeout(_t.state.birdHoppingTimeout);
    }
    _t.state.birdHoppingTimeout = setTimeout(() => {
      _t.GRAVITY = 1;
    }, 50);
  }
  setBirdGravity(delta) {
    const _t = this;
    const bird = _t.sprites.bird;
    const { MAX_DROP_SPEED, GRAVITY } = _t;
    // console.log(bird.acceleration)
    if (bird.acceleration.y >= 6) {
      bird.rotation = degToRad(45);
    }
    if (bird.acceleration.y > 0) {
      if (bird.acceleration.y < MAX_DROP_SPEED) {
        bird.acceleration.set(
          bird.acceleration.x,
          Math.abs(bird.acceleration.y * delta * 1.3)
        );
      }
    } else {
      bird.acceleration.set(0, bird.acceleration.y + delta * GRAVITY);
    }
  }
  dropTheBird() {
    const _t = this;
    _t.sprites.bird.acceleration.set(0, 6);
    _t.state.isBirdDropping = true;
  }
  destroyPipes() {
    const { pipes } = this.sprites;
    for (let pipe of pipes) {
      const {topPipe, bottomPipe} = pipe
      if (topPipe.x <= -100) {
        topPipe.destroy()
        bottomPipe.destroy()
        pipes.shift()
      }
    }
  }
  destroyAllPipes() {
    const { pipes } = this.sprites;
    for (let pipe of pipes) {
      const {topPipe, bottomPipe} = pipe
      topPipe.destroy()
      bottomPipe.destroy()
      pipes.shift()
    }
  }
  resetScore() {
    this.state.score = 0
    this.updateScoreText()
  }
  detectScore() {
    const _t = this
    const {pipes, bird} = _t.sprites

    for( const pipe of pipes) {
      if (!pipe.scored) {
        const {topPipe, bottomPipe} = pipe
        if ( (topPipe.x + topPipe.width) < bird.x) {
          pipe.scored = true
          _t.state.score += 1
          sound.play("point")
          _t.updateScoreText()
        }
      }
    }
  }
  gameLoop(delta) {
    const _t = this;
    const { state } = _t;
    const { bird, pipes, base } = _t.sprites;

    bird.x += bird.acceleration.x * delta;
    bird.y += bird.acceleration.y * delta;

    // console.log(pipes[0])
    if (!state.gameOver) {
      _t.detectScore()
      for (let pipe of pipes) {
        const { topPipe, bottomPipe } = pipe;
        topPipe.x += topPipe.acceleration.x * delta;
        topPipe.y += topPipe.acceleration.y * delta;
        bottomPipe.x += bottomPipe.acceleration.x * delta;
        bottomPipe.y += bottomPipe.acceleration.y * delta;

        if (
          isColliding(bird, topPipe, true) ||
          isColliding(bird, bottomPipe, true) ||
          isColliding(bird, base, true)
        ) {
          _t.state.gameOver = true;
          _t.state.started = false
          _t.UI.playBtn.visible = true
          sound.play("hit")
          bird.acceleration.set(0, 0);
          bird.rotation = degToRad(-45)
          setTimeout(() => {
            _t.dropTheBird();
            sound.play("die")
            this.destroyAllPipes()
          }, 1000);
        }
      }
    }
    console.log("Pipes count: ", pipes.length)

    _t.setBirdDirection();
    _t.destroyPipes();
  }
  startGame() {
    const _t = this;
    _t.addBackground();
    _t.addBird();

    _t.app.ticker.add((delta) => {
      const { state } = _t;
      // console.log("delta" , delta)
      if (state.started && !state.isBirdDropping && !state.gameOver) {
        console.log("Drop the bird");
        _t.dropTheBird();

        // _t.addPipes();
        setInterval(() => {
          if( !state.gameOver) {
            _t.addPipes();
          }
        }, 2000);
      }
      if (state.started && !state.gameOver) {
        _t.setBirdGravity(delta);
      }

      _t.gameLoop(delta);
    });
  }
  constructor() {
    this.initPIXI();
    this.loadSounds()
    this.createSprites();
    this.createUI()
    this.startGame();

    console.log("initializing the game..");
    console.log(this.app);
    window.app = this.app;
  }
}
