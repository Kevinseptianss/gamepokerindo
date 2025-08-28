import Phaser from "phaser";
import { PokerGame, GAME_PHASES, ACTIONS } from "../poker/PokerGame.js";
import { AI_PERSONALITIES } from "../poker/AIPlayer.js";
import { HandEvaluator } from "../poker/HandEvaluator.js"; // Import the evaluator

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.pokerGame = null;
    this.playerTexts = [];
    this.actionButtons = [];
    this.aiCardGroups = [];
    this.actionDisplays = [];
    this.chipDisplays = {};

    // UI Elements
    this.phaseText = null;
    this.potText = null;
    this.winnerText = null;
    this.playerCardsGroup = null;
    this.communityCardsGroup = null;
    this.handRankText = null; // NEW: Text for player's current hand rank

    // Raise UI
    this.raiseSlider = null;
    this.raiseAmountText = null;

    // Global card size (increased for sharper rendering on larger canvas)
    this.cardWidth = 70; // increased from 56
    this.cardHeight = 90; // increased from 78

    this.aiPlayers = [
      null, // Human player
      AI_PERSONALITIES.TIGHT_AGGRESSIVE,
      AI_PERSONALITIES.LOOSE_PASSIVE,
      AI_PERSONALITIES.LOOSE_AGGRESSIVE,
    ];
    // Dev/testing: when true the human player will be auto-played so the game can run to completion
    this.autoPlay = false;
  }

  preload() {
    this.loadCardImages();
  }

  create() {
    const { width, height } = this.cameras.main;
    this.createPokerTable(width, height);
    this.pokerGame = new PokerGame(4);
    this.pokerGame.initGame();
    this.createUI();
    this.createActionButtons();
    this.createRaiseSlider();
    this.updateGameDisplay();
    if (this.pokerGame.activePlayerIndex !== 0) {
      this.time.delayedCall(1500, () => this.handleAITurns());
    }
  }

  createPokerTable(width, height) {
    // use custom table background image if available
    const bg = this.add
      .image(width / 2, height / 2, "table")
      .setOrigin(0.5)
      .setDepth(0);
    // scale the table image to cover the canvas while preserving aspect
    try {
      bg.setDisplaySize(width, height);
    } catch (e) {
      // fallback to solid color if image not available
      this.add
        .rectangle(width / 2, height / 2, width, height, 0x0d4d3c)
        .setDepth(0);
    }
    const tableGraphics = this.add.graphics();
    // (center overlay removed - show only background image)
  }

  // Load card PNGs from a local assets folder instead of generating textures at runtime.
  // You placed the repo images into the project's `public/cards/` folder — use that path here.
  // Filenames follow the repo pattern: e.g. `2_of_clubs.png`, `jack_of_clubs.png`, `ace_of_spades.png`, and `back.png`.
  loadCardImages() {
    const basePath = "cards/"; // relative to index.html / public/
    // load the table background placed in public/table.png
    this.load.image("table", "table.png");
    // Detect high-DPI and choose the appropriate back image (back@2x.png exists in the folder)
    const isHiDPI =
      typeof window !== "undefined" &&
      window.devicePixelRatio &&
      window.devicePixelRatio > 1;
    this.cardBackScaleFactor = isHiDPI ? 0.5 : 1; // when loading @2x image we must scale it down by 0.5 to match layout
    const backFile = isHiDPI ? "back@2x.png" : "back.png";
    this.load.image("card-back", `${basePath}${backFile}`);

    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const ranks = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
      "A",
    ];

    // Helper to map rank code to filename word
    const rankToWord = (rank) => {
      if (rank === "J") return "jack";
      if (rank === "Q") return "queen";
      if (rank === "K") return "king";
      if (rank === "A") return "ace";
      return rank; // numbers stay the same (e.g., '2', '10')
    };

    // Load each card image with the key `card-{suit}-{rank}` so the rest of the code continues
    // to use `card-${card.suit}-${card.rank}` while filenames follow the repo pattern
    // e.g. `ace_of_spades.png`, `jack_of_clubs.png`, `2_of_clubs.png`.
    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        const key = `card-${suit}-${rank}`;
        const rankWord = rankToWord(rank);
        const filename = `${rankWord}_of_${suit}.png`;
        this.load.image(key, basePath + filename);
      });
    });
  }

  // Create a container with a rounded background + card image on top.
  // Returns the container. The inner image can be retrieved with `getCardImage`.
  // signature: createCardContainer(x, y, textureKey, scale = 1, w = this.cardWidth, h = this.cardHeight)
  createCardContainer(
    x,
    y,
    textureKey,
    scale = 1,
    w = this.cardWidth,
    h = this.cardHeight
  ) {
    const container = this.add.container(x, y);

    const width = w;
    const height = h;

    // Background rectangle (rounded) behind the card image
    const bg = this.add.graphics();
    const radius = Math.max(6, Math.min(width, height) * 0.08);
    const fillColor = 0xffffff;
    const borderColor = 0xcccccc;
    bg.fillStyle(fillColor, 1).fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      radius
    );
    bg.lineStyle(2, borderColor, 1).strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      radius
    );

    // Card image centered on container; use setDisplaySize so it fits the bg
    const img = this.add.image(0, 0, textureKey).setOrigin(0.5);
    // If the texture is a high-DPI "@2x" back image we loaded earlier, apply the scene's
    // cardBackScaleFactor so the visual size stays correct while using the higher-resolution asset.
    // Size the inner image slightly smaller than the background so the rounded border
    // remains visible and images don't appear to overflow the card container.
    const innerScale = 0.92; // percent of container size used for the inner image
    img.setDisplaySize(width * innerScale, height * innerScale);

    container.add([bg, img]);

    // Store dimensions and img scale on container for later reference
    container.cardWidth = width;
    container.cardHeight = height;
    // store both the requested base scale (how caller intended) and the effectiveScale
    // effectiveScale may include a back@2x downscale; baseScale is the original scale param
    container.baseScale = scale;
    // image drawn at this inner scale relative to container size
    container.imgScale = innerScale;

    return container;
  }

  // Given a container or image, return the inner image GameObject (or the object itself if image)
  getCardImage(obj) {
    if (!obj) return null;
    if (obj.texture) return obj; // it's already an Image
    if (obj.list && obj.list.length) {
      for (let i = 0; i < obj.list.length; i++) {
        const child = obj.list[i];
        if (child && child.texture) return child;
      }
    }
    return null;
  }

  createUI() {
    const { width, height } = this.cameras.main;
    // Scale UI sizes by the game's renderer resolution so they draw sharply on HiDPI displays
    const res = this.game.renderer ? this.game.renderer.resolution || 1 : 1;
    const scaleFactor = Math.max(1.5, Math.round(res * 1.2)); // ensure minimum 1.5x scaling for readability
    this._uiScale = scaleFactor; // keep for button sizing later
    console.log(
      `UI scaling: renderer resolution=${res}, scaleFactor=${scaleFactor}`
    );
    this.phaseText = this.add
      .text(width / 2, 30, "", {
        fontSize: `${18 * scaleFactor}px`,
        fontFamily: "Arial",
        fill: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.potText = this.add
      .text(width / 2, height * 0.38, "", {
        fontSize: `${16 * scaleFactor}px`,
        fontFamily: "Arial",
        fill: "#ffd700",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.winnerText = this.add
      .text(width / 2, height / 2, "", {
        fontSize: `${24 * scaleFactor}px`,
        fontFamily: "Arial",
        fill: "#ffeb3b",
        fontStyle: "bold",
        align: "center",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 20 * scaleFactor, y: 10 * scaleFactor },
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    // NEW: Initialize the hand rank text (scaled)
    this.handRankText = this.add
      .text(width / 2, height - 200 - 8 * (this._uiScale || 1), "", {
        fontSize: `${16 * scaleFactor}px`,
        fontFamily: "Arial",
        fill: "#fff",
        fontStyle: "italic",
      })
      .setOrigin(0.5);
    this.communityCardsGroup = this.add.group();
    this.playerCardsGroup = this.add.group();
    this.createPlayerDisplays();
  }

  createPlayerDisplays() {
    const { width, height } = this.cameras.main;
    // Compute responsive positions using camera size and UI scale
    const leftX = Math.max(60 * (this._uiScale || 1), width * 0.08);
    const rightX = Math.min(width - leftX, width * 0.92);
    const topY = Math.max(60 * (this._uiScale || 1), height * 0.08);
    const bottomY = Math.max(height - 140 * (this._uiScale || 1), height * 0.7);

    const positions = [
      { x: width / 2, y: bottomY - 35 * (this._uiScale || 1) }, // Player info box (bottom center)
      { x: leftX, y: height * 0.38 }, // AI left
      { x: width / 2, y: topY }, // AI top
      { x: rightX, y: height * 0.38 }, // AI right
    ];

    this.playerTexts = this.pokerGame.players.map((player, i) => {
      if (i > 0) this.aiCardGroups[i] = this.add.group();
      const chipFont = `${Math.max(
        10,
        Math.round(12 * (this._uiScale || 1))
      )}px`;
      const nameFont = `${Math.max(
        12,
        Math.round(14 * (this._uiScale || 1))
      )}px`;
      this.chipDisplays[i] = this.add
        .text(positions[i].x, positions[i].y + 18 * (this._uiScale || 1), "", {
          fontSize: chipFont,
          fill: "#fff",
          fontStyle: "bold",
          backgroundColor: "rgba(0,0,0,0.4)",
          padding: { x: 5 * (this._uiScale || 1), y: 2 * (this._uiScale || 1) },
        })
        .setOrigin(0.5)
        .setDepth(5);
      return this.add
        .text(positions[i].x, positions[i].y, "", {
          fontSize: nameFont,
          fill: "#fff",
          align: "center",
          backgroundColor: "rgba(0,0,0,0.4)",
          padding: { x: 8 * (this._uiScale || 1), y: 4 * (this._uiScale || 1) },
        })
        .setOrigin(0.5);
    });
  }

  createRaiseSlider() {
    const { width } = this.cameras.main;
    const sliderX = width / 2,
      sliderWidth = 150;
    // create at y=0, positionControls will place them correctly
    const track = this.add
      .rectangle(sliderX, 0, sliderWidth, 10, 0x000000, 0.5)
      .setOrigin(0.5)
      .setDepth(60);
    const handle = this.add
      .circle(sliderX - sliderWidth / 2, 0, 8, 0xffffff)
      .setInteractive({ draggable: true })
      .setDepth(61);
    this.raiseAmountText = this.add
      .text(sliderX, -25, "", {
        fontSize: "14px",
        fill: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(62);

    // Use the track's current position/width when dragging so layout changes won't break the math
    handle.on("drag", (p, dragX) => {
      const tx = track.x;
      const tw = track.width;
      handle.x = Phaser.Math.Clamp(dragX, tx - tw / 2, tx + tw / 2);
      const percentage = (handle.x - (tx - tw / 2)) / tw;
      const player = this.pokerGame.players[0];
      const minRaise = this.pokerGame.getMinRaise();
      const maxRaise = player.chips + player.currentBet;
      const raiseAmount = Math.floor(
        minRaise + percentage * (maxRaise - minRaise)
      );
      this.raiseSlider.value = Phaser.Math.Clamp(
        raiseAmount,
        minRaise,
        maxRaise
      );
      this.raiseAmountText.setText(`Raise to $${this.raiseSlider.value}`);
    });

    this.raiseSlider = {
      track,
      handle,
      value: 0,
      setVisible: (v) => {
        track.setVisible(v);
        handle.setVisible(v);
        this.raiseAmountText.setVisible(v);
        this.positionControls();
      },
    };
    this.raiseSlider.setVisible(false);
    // position after creation
    this.positionControls();
  }

  createActionButtons() {
    const { width, height } = this.cameras.main;
    // buttons will be positioned by positionControls(). Use scaled sizes so shapes and text are crisp.
    const actions = [
      { action: ACTIONS.FOLD, text: "FOLD", color: 0xd32f2f },
      { action: ACTIONS.CALL, text: "CALL", color: 0x388e3c },
      { action: ACTIONS.RAISE, text: "RAISE", color: 0xf57c00 },
      { action: ACTIONS.CHECK, text: "CHECK", color: 0x1976d2 },
      { action: ACTIONS.BET, text: "BET", color: 0xf57c00 },
    ];
    const btnW = 50 * (this._uiScale || 1);
    const btnH = 30 * (this._uiScale || 1);
    const fontSize = `${12 * (this._uiScale || 1)}px`;
    this.actionButtons = actions.map((actionData) => {
      const button = this.add
        .rectangle(0, 0, btnW, btnH, actionData.color)
        .setStrokeStyle(2 * (this._uiScale || 1), 0xffffff, 0.7)
        .setInteractive({ useHandCursor: true })
        .setDepth(70);
      const text = this.add
        .text(0, 0, actionData.text, {
          fontSize,
          fill: "#fff",
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(71);
      button.on("pointerover", () => button.setAlpha(0.8));
      button.on("pointerout", () => button.setAlpha(1));
      button.on("pointerdown", () =>
        this.tweens.add({
          targets: [button, text],
          scale: 0.9,
          duration: 100,
          yoyo: true,
          onComplete: () => this.handlePlayerAction(actionData.action),
        })
      );
      return { ...actionData, button, text, originalText: actionData.text };
    });
    // position after creation
    this.positionControls();
  }

  // Position raise slider and action buttons to avoid overlapping cards.
  positionControls() {
    if (!this.cameras || !this.actionButtons) return;
    const { width, height } = this.cameras.main;
    // Compute player card top position dynamically using card height and UI scale
    const playerCardsY = height - this.cardHeight * 1.2; // matches updatePlayerCards
    // compute bottom of player's card area
    const cardBottom = playerCardsY + (this.cardHeight * 0.9) / 2;

    // sliderY: place below player's cards with a larger margin so it won't overlap
    const sliderMargin = 24 * (this._uiScale || 1); // margin between card bottom and slider (scaled)
    let sliderY = cardBottom + sliderMargin;

    // allow slider to go closer to the bottom of the view but keep a small safe margin
    const maxSliderY = height - 60;
    sliderY = Math.min(sliderY, maxSliderY);

    // buttonsY: place below slider with a moderate gap so buttons sit closer to the slider
    const buttonsY = sliderY + 36;

    // update slider elements
    if (this.raiseSlider && this.raiseSlider.track) {
      const track = this.raiseSlider.track;
      const handle = this.raiseSlider.handle;
      // center track horizontally
      track.x = width / 2;
      track.y = sliderY;
      // ensure handle stays on the track when repositioning
      const left = track.x - track.width / 2;
      const right = track.x + track.width / 2;
      handle.y = sliderY;
      handle.x = Phaser.Math.Clamp(handle.x || left, left, right);
      this.raiseAmountText.x = track.x;
      // move the amount label a bit higher above the track but keep it close to the slider
      this.raiseAmountText.y = sliderY - 20;
    }

    // layout visible buttons horizontally centered at buttonsY
    const visibleButtons = this.actionButtons.filter((b) => b.button.visible);
    const spacing = Math.max(56 * (this._uiScale || 1), this.cardWidth * 0.9); // spacing scaled with UI
    const totalWidth = (visibleButtons.length - 1) * spacing;
    const startX = width / 2 - totalWidth / 2;
    visibleButtons.forEach((btn, i) => {
      const x = startX + i * spacing;
      btn.button.x = x;
      btn.button.y = buttonsY;
      btn.text.x = x;
      btn.text.y = buttonsY;
    });
  }

  handlePlayerAction(action) {
    if (this.pokerGame.activePlayerIndex !== 0) return;
    let amount = 0;
    if (action === ACTIONS.RAISE || action === ACTIONS.BET) {
      amount = this.raiseSlider.value;
    } else if (action === ACTIONS.CALL) {
      amount = this.pokerGame.getCallAmount();
    }
    this.animateBet(0, amount);
    this.pokerGame.playerAction(action, amount);
    this.updateGameDisplay();
    if (
      this.pokerGame.phase !== GAME_PHASES.SHOWDOWN &&
      this.pokerGame.phase !== GAME_PHASES.GAME_OVER
    ) {
      this.time.delayedCall(500, () => this.handleAITurns());
    }
  }

  handleAITurns() {
    console.log(
      `handleAITurns called - Active player: ${this.pokerGame.activePlayerIndex}, Phase: ${this.pokerGame.phase}`
    );
    // Diagnostics: log the boolean checks to catch unexpected truthiness
    console.log("diagnostics:", {
      activeIs0: this.pokerGame.activePlayerIndex === 0,
      phase: this.pokerGame.phase,
      phaseIsShowdown: this.pokerGame.phase === GAME_PHASES.SHOWDOWN,
      phaseIsGameOver: this.pokerGame.phase === GAME_PHASES.GAME_OVER,
    });

    if (
      this.pokerGame.activePlayerIndex === 0 ||
      this.pokerGame.phase === GAME_PHASES.SHOWDOWN ||
      this.pokerGame.phase === GAME_PHASES.GAME_OVER
    ) {
      // If it's the human player's turn and autoPlay is enabled, perform a default action
      if (
        this.pokerGame.activePlayerIndex === 0 &&
        this.autoPlay &&
        this.pokerGame.phase !== GAME_PHASES.SHOWDOWN &&
        this.pokerGame.phase !== GAME_PHASES.GAME_OVER
      ) {
        const available = this.pokerGame.getPlayerActions();
        // Prefer CALL, then CHECK, then RAISE (minRaise), else FOLD
        let actionToDo = null;
        let amount = 0;
        if (available.includes(ACTIONS.CALL)) {
          actionToDo = ACTIONS.CALL;
        } else if (available.includes(ACTIONS.CHECK)) {
          actionToDo = ACTIONS.CHECK;
        } else if (
          available.includes(ACTIONS.RAISE) ||
          available.includes(ACTIONS.BET)
        ) {
          actionToDo = available.includes(ACTIONS.RAISE)
            ? ACTIONS.RAISE
            : ACTIONS.BET;
          amount = this.pokerGame.getMinRaise();
        } else if (available.includes(ACTIONS.FOLD)) {
          actionToDo = ACTIONS.FOLD;
        }
        if (actionToDo) {
          console.log(
            `Auto-playing for player 0: ${actionToDo} ${amount || ""}`
          );
          this.time.delayedCall(300, () => {
            this.pokerGame.playerAction(actionToDo, amount);
            this.updateGameDisplay();
            this.time.delayedCall(300, () => this.handleAITurns());
          });
          return;
        }
      }
      console.log(
        "Ending AI turns - either human player turn or showdown phase"
      );
      this.updateGameDisplay();
      return;
    }

    const index = this.pokerGame.activePlayerIndex;
    const player = this.pokerGame.getCurrentPlayer();

    if (!player || !player.canAct()) {
      console.log(
        `Player ${index} cannot act - folded: ${player?.isFolded}, allIn: ${player?.isAllIn}`
      );
      this.pokerGame.advanceToNextPlayer();
      this.time.delayedCall(500, () => this.handleAITurns());
      return;
    }

    console.log(
      `AI Player ${index} making decision - Chips: ${
        player.chips
      }, Current bet: ${player.currentBet}, Can act: ${player.canAct()}`
    );

    const gameState = {
      currentBet: this.pokerGame.currentBet,
      pot: this.pokerGame.pot,
      phase: this.pokerGame.phase,
      holeCards: player.holeCards,
      communityCards: this.pokerGame.communityCards,
      availableActions: this.pokerGame.getPlayerActions(),
    };

    console.log(
      `Game state: currentBet=${gameState.currentBet}, pot=${
        gameState.pot
      }, availableActions=${gameState.availableActions.join(",")}`
    );

    const decision = this.aiPlayers[index].makeDecision(gameState, player);
    console.log(`AI ${index} decision:`, decision);

    this.showAIAction(index, decision.action, decision.amount);
    this.time.delayedCall(800, () => {
      if (decision.action === ACTIONS.CALL)
        decision.amount = this.pokerGame.getCallAmount();
      this.animateBet(index, decision.amount);
      this.pokerGame.playerAction(decision.action, decision.amount || 0);
      this.updateGameDisplay();
      this.time.delayedCall(1200, () => this.handleAITurns());
    });
  }

  showAIAction(playerIndex, action, amount) {
    const playerText = this.playerTexts[playerIndex];
    let actionText = action.charAt(0).toUpperCase() + action.slice(1);
    if (
      (action === ACTIONS.RAISE ||
        action === ACTIONS.CALL ||
        action === ACTIONS.BET) &&
      amount > 0
    )
      actionText += ` $${amount}`;
    const display = this.add
      .text(playerText.x, playerText.y + 45, actionText, {
        fontSize: "12px",
        fill: "#0f0",
        fontStyle: "bold",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: display,
      alpha: 0,
      y: "+=10",
      duration: 2000,
      ease: "Power2",
      onComplete: () => display.destroy(),
    });
  }

  animateBet(playerIndex, amount) {
    if (amount <= 0) return;
    const { width, height } = this.cameras.main;
    const playerDisplay = this.playerTexts[playerIndex];
    const chip = this.add
      .text(playerDisplay.x, playerDisplay.y, `$${amount}`, {
        fontSize: "14px",
        fill: "#ffd700",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: chip,
      x: width / 2,
      y: height * 0.4,
      alpha: 0.5,
      duration: 500,
      ease: "Cubic.easeIn",
      onComplete: () => chip.destroy(),
    });
  }

  startNewHand() {
    this.winnerText.setVisible(false);
    this.aiCardGroups.forEach((g) => g.clear(true, true));
    this.playerCardsGroup.clear(true, true);
    this.communityCardsGroup.clear(true, true);
    this.pokerGame.startNewHand();
    this.updateGameDisplay();
    if (this.pokerGame.activePlayerIndex !== 0) {
      this.time.delayedCall(1000, () => this.handleAITurns());
    }
  }

  updateGameDisplay() {
    if (!this.pokerGame || !this.pokerGame.players) return;
    this.phaseText.setText(this.getPhaseDisplayText());
    this.potText.setText(`Pot: $${this.pokerGame.pot}`);
    this.playerTexts.forEach((text, index) => {
      const player = this.pokerGame.players[index];
      if (!text || !player) return;
      const isActive =
        index === this.pokerGame.activePlayerIndex &&
        this.pokerGame.phase !== GAME_PHASES.SHOWDOWN &&
        this.pokerGame.phase !== GAME_PHASES.GAME_OVER;
      text.setText(`${player.isDealer ? "(D) " : ""}${player.name}`);
      this.chipDisplays[index].setText(`$${player.chips}`);
      text.setAlpha(player.isFolded ? 0.5 : 1);
      this.chipDisplays[index].setAlpha(player.isFolded ? 0.5 : 1);
      if (isActive) {
        text.setFill("#ffff00");
        this.tweens.add({
          targets: text,
          scale: 1.1,
          duration: 300,
          yoyo: true,
          repeat: -1,
        });
      } else {
        text.setFill("#ffffff");
        this.tweens.killTweensOf(text);
        text.setScale(1);
      }
    });
    this.updateCommunityCards();
    this.updatePlayerCards();
    this.updateActionButtons();
    this.updateHandRankText(); // NEW: Update the hand rank text
    if (this.pokerGame.phase === GAME_PHASES.SHOWDOWN) {
      this.revealAllCards();
      this.displayWinner();
      this.time.delayedCall(6000, () => this.startNewHand());
    }
  }

  // NEW: Function to update the player's hand rank display
  updateHandRankText() {
    const player = this.pokerGame.players[0];
    if (
      !player ||
      !player.holeCards ||
      player.holeCards.length < 2 ||
      this.pokerGame.phase === GAME_PHASES.SHOWDOWN ||
      this.pokerGame.phase === GAME_PHASES.GAME_OVER
    ) {
      this.handRankText.setText("").setVisible(false);
      return;
    }

    const hand = HandEvaluator.evaluateHand(
      player.holeCards,
      this.pokerGame.communityCards
    );
    this.handRankText.setText(`${hand.name}`).setVisible(true);
  }

  revealAllCards() {
    const { width, height } = this.cameras.main;
    const positions = [
      null,
      { x: 70, y: height * 0.4 + 60 },
      { x: width / 2, y: 65 + 60 },
      { x: width - 70, y: height * 0.4 + 60 },
    ];
    this.pokerGame.players.forEach((player, index) => {
      if (
        index > 0 &&
        !player.isFolded &&
        this.aiCardGroups[index] &&
        this.aiCardGroups[index].countActive() === 0
      ) {
        player.holeCards.forEach((card, cardIndex) => {
          const x = positions[index].x - 20 + cardIndex * 40,
            y = positions[index].y;
          const container = this.createCardContainer(
            x,
            y,
            `card-${card.suit}-${card.rank}`,
            0.5,
            70,
            98
          );
          this.aiCardGroups[index].add(container);
        });
      }
    });
  }

  displayWinner() {
    const { winnerInfo } = this.pokerGame;
    if (!winnerInfo || !winnerInfo.winners || winnerInfo.winners.length === 0)
      return;
    const winner = winnerInfo.winners[0];
    const winnerName = winner.index === 0 ? "You" : `AI ${winner.index}`;
    const winnerText = `${winnerName} wins $${Math.floor(
      winner.amountWon
    )}\nwith a ${winner.hand.name}`;
    this.winnerText.setText(winnerText).setVisible(true);
    const allWinningCards = new Set(
      winner.hand.cards.map((c) => `${c.rank}-${c.suit}`)
    );
    // Tint inner images of containerized cards (or the image itself) for winning cards
    this.communityCardsGroup.children.each((c) => {
      const img = this.getCardImage(c);
      if (!img || !img.texture) return;
      const cardKey = img.texture.key.replace("card-", "").replace(/-/g, "-");
      if (allWinningCards.has(cardKey)) img.setTint(0xffff00);
      else img.clearTint();
    });

    this.playerCardsGroup.children.each((c) => {
      const img = this.getCardImage(c);
      if (!img || !img.texture) return;
      const cardKey = img.texture.key.replace("card-", "").replace(/-/g, "-");
      if (allWinningCards.has(cardKey)) img.setTint(0xffff00);
      else img.clearTint();
    });
  }

  updateCommunityCards() {
    if (!this.pokerGame || !this.pokerGame.communityCards) return;
    const { width, height } = this.cameras.main;
    const cardScale = 0.85 * (this._uiScale || 1);
    const cardSpacing = Math.max(
      -20 * (this._uiScale || 1),
      this.cardWidth * 0.9
    );
    const finalCardCount = 5;
    const layoutWidth = (finalCardCount - 1) * cardSpacing;
    const fixedStartX = width / 2 - layoutWidth / 2;
    const deckX = width / 2,
      deckY = height / 2 - 100 * (this._uiScale || 1);
    const y = height * 0.48;
    this.pokerGame.communityCards.forEach((card, index) => {
      // Check existing community cards by inspecting the inner image of containers (safe for containerized cards)
      const already = this.communityCardsGroup.children.entries.some((s) => {
        const img = this.getCardImage(s);
        return (
          img &&
          img.texture &&
          img.texture.key === `card-${card.suit}-${card.rank}`
        );
      });
      if (already) return;
      const x = fixedStartX + index * cardSpacing;
      const container = this.createCardContainer(
        deckX,
        deckY,
        "card-back",
        cardScale
      );
      this.communityCardsGroup.add(container);
      this.tweens.add({
        targets: container,
        x,
        y,
        duration: 500,
        ease: "Cubic.easeOut",
        delay: 100 * index,
        onComplete: () => {
          const img = this.getCardImage(container);
          if (img) {
            img.setTexture(`card-${card.suit}-${card.rank}`);
            // respect inner scale so face doesn't cover the border
            img.setDisplaySize(
              container.cardWidth * (container.imgScale || 1),
              container.cardHeight * (container.imgScale || 1)
            );
          }
        },
      });
    });
  }

  updatePlayerCards() {
    if (
      !this.pokerGame ||
      !this.pokerGame.players[0] ||
      this.playerCardsGroup.countActive() > 0
    )
      return;

    const player = this.pokerGame.players[0];
    if (!player.holeCards || player.holeCards.length !== 2) return;

    const { width, height } = this.cameras.main;
    const uiScale = this._uiScale || 1;
    const cardScale = 0.95 * uiScale; // slightly larger if desired
    const deckX = width / 2;
    const deckY = height / 2 - 100 * uiScale;

    // Card spacing: smaller value => cards closer (can overlap)
    const visibleCount = player.holeCards.length;
    const cardSpacing = Math.max(this.cardWidth * 0.12 * uiScale, 12 * uiScale); // <- tune this
    const startX = width / 2 - ((visibleCount - 1) * cardSpacing) / 2;
    const playerCardsY = height - this.cardHeight * 1.05 * uiScale; // adjust vertical position if needed

    player.holeCards.forEach((card, index) => {
      const x = startX + index * cardSpacing;
      const y = playerCardsY;

      const container = this.createCardContainer(
        deckX,
        deckY,
        "card-back",
        cardScale
      );
      this.playerCardsGroup.add(container);

      this.tweens.add({
        targets: container,
        x,
        y,
        duration: 400,
        ease: "Cubic.easeOut",
        delay: 120 * index,
        onComplete: () => {
          const img = this.getCardImage(container);
          if (img) {
            img.setTexture(`card-${card.suit}-${card.rank}`);
            img.setDisplaySize(container.cardWidth, container.cardHeight);
          }
        },
      });
    });
  }

  updateActionButtons() {
    if (!this.pokerGame || !this.actionButtons) return;
    const isPlayerTurn = this.pokerGame.activePlayerIndex === 0;
    const isShowdown =
      this.pokerGame.phase === GAME_PHASES.SHOWDOWN ||
      this.pokerGame.phase === GAME_PHASES.GAME_OVER;
    const availableActions = isPlayerTurn
      ? this.pokerGame.getPlayerActions()
      : [];

    let visibleButtons = [];
    this.actionButtons.forEach((buttonData) => {
      const isVisible =
        isPlayerTurn &&
        availableActions.includes(buttonData.action) &&
        !isShowdown;
      buttonData.button.setVisible(isVisible);
      buttonData.text.setVisible(isVisible);
      if (isVisible) visibleButtons.push(buttonData);
      if (isVisible && buttonData.action === ACTIONS.CALL) {
        buttonData.text.setText(`CALL\n$${this.pokerGame.getCallAmount()}`);
      } else {
        buttonData.text.setText(buttonData.originalText);
      }
    });

    // Layout is handled by positionControls() to avoid overlaps; just call it now.
    this.positionControls();

    const canRaise =
      availableActions.includes(ACTIONS.RAISE) ||
      availableActions.includes(ACTIONS.BET);
    this.raiseSlider.setVisible(isPlayerTurn && canRaise && !isShowdown);
    if (isPlayerTurn && canRaise) {
      const player = this.pokerGame.players[0];
      const minRaise = this.pokerGame.getMinRaise();
      const maxRaise = player.chips + player.currentBet;
      this.raiseSlider.value = minRaise;
      this.raiseAmountText.setText(`Bet/Raise to $${minRaise}`);
      this.raiseSlider.handle.x =
        this.raiseSlider.track.x - this.raiseSlider.track.width / 2;
    }
  }

  getPhaseDisplayText() {
    const phaseMap = {
      [GAME_PHASES.PREFLOP]: "Pre-Flop Betting",
      [GAME_PHASES.FLOP]: "The Flop",
      [GAME_PHASES.TURN]: "The Turn",
      [GAME_PHASES.RIVER]: "The River",
      [GAME_PHASES.SHOWDOWN]: "Showdown!",
      [GAME_PHASES.DEALING]: "Dealing...",
    };
    return phaseMap[this.pokerGame.phase] || "";
  }
}
