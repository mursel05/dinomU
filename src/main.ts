import { Application, Assets, Sprite } from "pixi.js";
import { Enemy } from "./types/enemy";
import { Health } from "./types/health";

const INITIAL_HEALTH = 3;
const MAX_HEALTH = 3;
const DIFFICULTY_SCORE_THRESHOLD = 10;
const FLASH_THRESHOLD = 2000;

(async () => {
  const app = new Application();
  const heroTexture = await Assets.load("/assets/hero.png");
  const enemyTexture = await Assets.load("/assets/enemy.png");
  const healthTexture = await Assets.load("/assets/heart.png");
  let gameStarted = false;
  let gameStopped = false;
  let score = 0;
  let highScore = localStorage.getItem("highScore")
    ? parseInt(localStorage.getItem("highScore")!)
    : 0;
  let enemyInterval: number;
  let healthInterval: number;
  let health = INITIAL_HEALTH;
  const difficultyConfig = {
    enemySpeed: 2,
    heroSpeed: 5,
    spawnEnemyRate: 2000,
    spawnHealthRate: 7000,
    enemyExpireTime: 10000,
    healthExpireTime: 10000,
  };
  let difficultiness = 1;
  let pauseStartTime = 0;
  const pixiContainer = document.getElementById("pixi-container")!;
  const highScoreElement = document.getElementById("high-score")!;
  const scoreElement = document.getElementById("score")!;
  const scoreboard = document.getElementById("scoreboard")!;
  const hearts = Array.from(
    { length: MAX_HEALTH },
    (_, i) => document.getElementById(`heart${i + 1}`)!,
  );
  const gameStartModal = document.getElementById("game-start-modal")!;
  const gameOverModal = document.getElementById("game-over-modal")!;
  const pauseModal = document.getElementById("pause-modal")!;

  await app.init({ background: "#2b5829", resizeTo: window });
  pixiContainer.appendChild(app.canvas);
  const hero = new Sprite(heroTexture);
  hero.anchor.set(0.5);
  app.stage.addChild(hero);
  hero.position.set(app.screen.width / 2, app.screen.height / 2);
  highScoreElement.textContent = highScore.toString();

  let enemies: Enemy[] = [];
  function spawnEnemy() {
    if (!gameStarted || gameStopped) return;
    const enemyEntity = new Sprite(enemyTexture);
    enemyEntity.anchor.set(0.5);
    const border = Math.floor(Math.random() * 4);
    let x, y;
    switch (border) {
      case 0:
        x = Math.random() * app.screen.width;
        y = 0;
        break;
      case 1:
        x = app.screen.width;
        y = Math.random() * app.screen.height;
        break;
      case 2:
        x = Math.random() * app.screen.width;
        y = app.screen.height;
        break;
      case 3:
        x = 0;
        y = Math.random() * app.screen.height;
        break;
    }
    enemyEntity.position.set(x, y);
    app.stage.addChild(enemyEntity);
    enemies.push({
      enemyEntity,
      expire: new Date(Date.now() + difficultyConfig.enemyExpireTime),
    });
    score++;
    scoreElement.textContent = score.toString();
  }

  let healthPacks: Health[] = [];
  function spawnHealth() {
    if (!gameStarted || gameStopped) return;
    const healthPack = new Sprite(healthTexture);
    healthPack.anchor.set(0.5);
    let x, y;
    let attempts = 0;
    const maxAttempts = 100;
    do {
      x =
        Math.random() * (app.screen.width - healthPack.width) +
        healthPack.width / 2;
      y =
        Math.random() * (app.screen.height - healthPack.height) +
        healthPack.height / 2;
      attempts++;
    } while (
      attempts < maxAttempts &&
      y < scoreboard.offsetHeight + healthPack.height / 2 &&
      x < scoreboard.offsetWidth + healthPack.width / 2
    );
    healthPack.position.set(x, y);
    app.stage.addChild(healthPack);
    healthPacks.push({
      healthPack,
      expire: new Date(Date.now() + difficultyConfig.healthExpireTime),
    });
  }

  function lostGame() {
    gameStarted = false;
    gameOverModal.classList.remove("hidden");
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore.toString());
    }
    clearInterval(enemyInterval);
    clearInterval(healthInterval);
  }

  function startGame() {
    hero.position.set(app.screen.width / 2, app.screen.height / 2);
    gameStarted = true;
    enemies.forEach((enemy) => {
      app.stage.removeChild(enemy.enemyEntity);
      enemy.enemyEntity.destroy();
    });
    enemies.length = 0;
    healthPacks.forEach((pack) => {
      app.stage.removeChild(pack.healthPack);
      pack.healthPack.destroy();
    });
    healthPacks.length = 0;
    score = 0;
    scoreElement.textContent = score.toString();
    highScoreElement.textContent = highScore.toString();
    gameOverModal.classList.add("hidden");
    gameStartModal.classList.add("hidden");
    health = INITIAL_HEALTH;
    for (let i = 1; i <= INITIAL_HEALTH; i++) {
      hearts[i - 1].classList.remove("hidden");
    }
    enemyInterval = setInterval(spawnEnemy, difficultyConfig.spawnEnemyRate);
    healthInterval = setInterval(spawnHealth, difficultyConfig.spawnHealthRate);
  }

  function increaseDifficulty() {
    difficultyConfig.enemySpeed += 0.5;
    difficultyConfig.heroSpeed += 0.5;
    difficultyConfig.enemyExpireTime = Math.min(
      30000,
      difficultyConfig.enemyExpireTime + 1000,
    );
    difficultyConfig.healthExpireTime = Math.max(
      5000,
      difficultyConfig.healthExpireTime - 1000,
    );
    difficultyConfig.spawnEnemyRate = Math.max(
      500,
      difficultyConfig.spawnEnemyRate - 200,
    );
    difficultyConfig.spawnHealthRate = Math.min(
      30000,
      difficultyConfig.spawnHealthRate + 1000,
    );
    clearInterval(enemyInterval);
    clearInterval(healthInterval);
    enemyInterval = setInterval(spawnEnemy, difficultyConfig.spawnEnemyRate);
    healthInterval = setInterval(spawnHealth, difficultyConfig.spawnHealthRate);
    difficultiness++;
  }

  const keys: Record<string, boolean> = {};
  window.addEventListener("keydown", (event) => {
    keys[event.key] = true;
  });
  window.addEventListener("keyup", (event) => {
    keys[event.key] = false;
  });
  function updateHeroMovement() {
    const prevX = hero.x;
    const prevY = hero.y;
    if (keys["ArrowUp"]) hero.y -= difficultyConfig.heroSpeed;
    if (keys["ArrowDown"]) hero.y += difficultyConfig.heroSpeed;
    if (keys["ArrowLeft"]) hero.x -= difficultyConfig.heroSpeed;
    if (keys["ArrowRight"]) hero.x += difficultyConfig.heroSpeed;
    const inScoreboardZone = hero.y < scoreboard.offsetHeight + hero.height / 2;
    const underScoreboardHorizontally =
      hero.x < scoreboard.offsetWidth + hero.width / 2;
    if (inScoreboardZone && underScoreboardHorizontally) {
      const wasInZoneY = prevY < scoreboard.offsetHeight + hero.height / 2;
      const wasUnderX = prevX < scoreboard.offsetWidth + hero.width / 2;
      if (!wasInZoneY) {
        hero.y = prevY;
      } else if (!wasUnderX) {
        hero.x = prevX;
      } else {
        hero.x = prevX;
        hero.y = prevY;
      }
    }
    hero.x = Math.max(
      hero.width / 2,
      Math.min(app.screen.width - hero.width / 2, hero.x),
    );
    hero.y = Math.max(
      hero.height / 2,
      Math.min(app.screen.height - hero.height / 2, hero.y),
    );
  }

  function updateEnemies() {
    enemies = enemies.filter((enemy) => {
      const now = new Date();
      if (now > enemy.expire) {
        enemy.enemyEntity.destroy();
        app.stage.removeChild(enemy.enemyEntity);
        enemy.enemyEntity.destroy();
        return false;
      } else {
        const timeLeft = enemy.expire.getTime() - now.getTime();
        if (timeLeft < FLASH_THRESHOLD) {
          const alpha = Math.floor(timeLeft / 300) % 2 === 0 ? 1 : 0.5;
          enemy.enemyEntity.alpha = alpha;
        }
      }
      const dx = hero.x - enemy.enemyEntity.x;
      const dy = hero.y - enemy.enemyEntity.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        enemy.enemyEntity.x += (dx / distance) * difficultyConfig.enemySpeed;
        enemy.enemyEntity.y += (dy / distance) * difficultyConfig.enemySpeed;
      }
      return checkCollisions(distance, enemy);
    });
  }

  function updateHealthPacks() {
    healthPacks = healthPacks.filter((pack) => {
      const now = new Date();
      if (now > pack.expire) {
        app.stage.removeChild(pack.healthPack);
        pack.healthPack.destroy();
        return false;
      } else {
        const timeLeft = pack.expire.getTime() - now.getTime();
        if (timeLeft < FLASH_THRESHOLD) {
          const alpha = Math.floor(timeLeft / 300) % 2 === 0 ? 1 : 0.5;
          pack.healthPack.alpha = alpha;
        }
      }
      if (
        Math.abs(hero.x - pack.healthPack.x) <
          (hero.width + pack.healthPack.width) / 2 &&
        Math.abs(hero.y - pack.healthPack.y) <
          (hero.height + pack.healthPack.height) / 2
      ) {
        health = Math.min(MAX_HEALTH, health + 1);
        for (let i = 1; i <= health; i++) {
          hearts[i - 1].classList.remove("hidden");
        }
        pack.healthPack.destroy();
        return false;
      }
      return true;
    });
  }

  function checkCollisions(distance: number, enemy: Enemy) {
    const heroRadius = hero.width * 0.5;
    const enemyRadius = enemy.enemyEntity.width * 0.5;

    if (distance < heroRadius + enemyRadius) {
      health--;
      hearts[health].classList.add("hidden");
      enemy.enemyEntity.destroy();
      if (health <= 0) {
        lostGame();
      }
      return false;
    }
    return true;
  }

  app.ticker.add(() => {
    if (!gameStarted || gameStopped) return;
    if (
      score > 0 &&
      score % (DIFFICULTY_SCORE_THRESHOLD * difficultiness) === 0
    ) {
      increaseDifficulty();
    }
    updateHeroMovement();
    updateEnemies();
    updateHealthPacks();
  });

  gameStartModal.addEventListener("click", () => {
    startGame();
  });

  gameOverModal.addEventListener("click", () => {
    startGame();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (!gameStarted) {
        startGame();
      }
    } else if (event.key === "Escape") {
      if (gameStarted && !gameStopped) {
        gameStopped = true;
        pauseStartTime = Date.now();
        pauseModal.classList.remove("hidden");
      } else if (gameStarted && gameStopped) {
        gameStopped = false;
        const pauseDuration = Date.now() - pauseStartTime;
        enemies.forEach((enemy) => {
          enemy.expire = new Date(enemy.expire.getTime() + pauseDuration);
        });
        healthPacks.forEach((pack) => {
          pack.expire = new Date(pack.expire.getTime() + pauseDuration);
        });
        pauseModal.classList.add("hidden");
      }
    }
  });
})();
