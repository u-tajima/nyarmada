import { ENEMY_STAGES, generateRandomEnemy, TOTAL_CAMPAIGN_STAGES } from '../data/enemies';
import { HULL_LIST, HULLS } from '../data/hulls';
import { PART_LIST, PARTS } from '../data/parts';
import { ARENA_HEIGHT, ARENA_WIDTH, BattleArena } from '../physics/arena';
import { computeBlueprintStats } from '../physics/shipBody';
import { sound } from '../render/audio';
import {
  renderBattleArena,
  renderGaragePreview,
  renderHullThumbnail,
  renderPartThumbnail,
} from '../render/renderer';
import { EnemyStage, HullId, PartId, ShipBlueprint, SlotCategory, SlotDef } from '../types';

type TabType = 'hulls' | SlotCategory;

const DUMMY_STAGE: EnemyStage = {
  stage: 0,
  title: 'テスト演習：訓練用サンドバッグ艦',
  tagline: '武装を持たない高耐久ターゲット艦。反動ジャンプやレーザー角度の確認に最適！',
  rewardText: 'テスト演習モード',
  blueprint: {
    name: 'ダミー標的艦',
    pilotName: 'ロボニャン',
    catColor: '#94a3b8',
    hullId: 'titan',
    slots: {
      w1: null,
      w2: null,
      t1: null,
      g1: { partId: 'shield', flipped: false },
      g2: null,
    },
  },
};

const STARTER_BLUEPRINT: ShipBlueprint = {
  name: 'スター・タマ号',
  pilotName: 'タマ艦長',
  catColor: '#fbbf24',
  hullId: 'cruiser',
  slots: {
    w1: { partId: 'rocket', flipped: false },
    w2: null,
    t1: { partId: 'thruster', flipped: false },
    g1: null,
  },
};

const PRESET_BUILDS: { label: string; bp: ShipBlueprint }[] = [
  {
    label: '🚀 王道ロケット艦',
    bp: {
      name: 'スター・タマ号',
      pilotName: 'タマ艦長',
      catColor: '#fbbf24',
      hullId: 'cruiser',
      slots: {
        w1: { partId: 'rocket', flipped: false },
        w2: { partId: 'rocket', flipped: false },
        t1: { partId: 'thruster', flipped: false },
        g1: { partId: 'shield', flipped: false },
      },
    },
  },
  {
    label: '🦘 反動ターボ突撃艦',
    bp: {
      name: 'アクロバット・ミケ',
      pilotName: 'ミケ艦長',
      catColor: '#34d399',
      hullId: 'cruiser',
      slots: {
        w1: { partId: 'railgun', flipped: true },
        w2: { partId: 'drill', flipped: false },
        t1: { partId: 'thruster', flipped: false },
        g1: { partId: 'shield', flipped: false },
      },
    },
  },
  {
    label: '🧲 磁力ドリル処刑艦',
    bp: {
      name: 'アイアン・クロー',
      pilotName: 'ボス猫',
      catColor: '#f87171',
      hullId: 'cruiser',
      slots: {
        w1: { partId: 'drill', flipped: false },
        w2: { partId: 'saw', flipped: false },
        t1: { partId: 'thruster', flipped: false },
        g1: { partId: 'tractor', flipped: false },
      },
    },
  },
  {
    label: '🛸 狂乱UFOスピナー',
    bp: {
      name: 'コスモ・ソーサー',
      pilotName: 'ニャリアン',
      catColor: '#c084fc',
      hullId: 'saucer',
      slots: {
        w1: { partId: 'saw', flipped: false },
        w2: { partId: 'railgun', flipped: true },
        t1: { partId: 'booster', flipped: false },
        g1: { partId: 'repulsor', flipped: false },
      },
    },
  },
];

export class GameApp {
  private root: HTMLElement;
  private mode: 'garage' | 'battle' = 'garage';

  private unlockedHulls = new Set<HullId>(
    HULL_LIST.filter((h) => h.unlockedByDefault).map((h) => h.id)
  );
  private unlockedParts = new Set<PartId>(
    PART_LIST.filter((p) => p.unlockedByDefault).map((p) => p.id)
  );
  private sandboxAllUnlocked = false;

  private maxUnlockedStage = 1;
  private selectedStageNum = 1;
  private currentEnemyStage: EnemyStage = ENEMY_STAGES[0];
  private isTestBattle = false;

  private playerBp: ShipBlueprint = structuredClone(STARTER_BLUEPRINT);
  private selectedSlotId: string | null = 'w2';
  private activeTab: TabType = 'weapon';
  private toastMessage: string | null = null;

  // Battle state
  private arena: BattleArena | null = null;
  private battleSpeed: 1 | 2 = 1;
  private resultShown = false;
  private lastUnlockText: string | null = null;

  // Animation loop
  private previewCanvas: HTMLCanvasElement | null = null;
  private battleCanvas: HTMLCanvasElement | null = null;
  private previewSlotAreas: { slot: SlotDef; sx: number; sy: number; r: number }[] = [];
  private animTime = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    // スマホではユーザー操作後でないと音が鳴らないため、最初のタッチでオーディオを起こす
    const unlockAudio = () => {
      sound.unlock();
      window.removeEventListener('pointerdown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('fullscreenchange', () => {
      // バトル中の再描画はキャンバスを作り直してしまうのでボタン表示のみ更新
      const btn = document.getElementById('btn-fullscreen');
      if (btn) {
        btn.textContent = document.fullscreenElement ? '🗗 全画面解除' : '⛶ 全画面';
        btn.classList.toggle('active', !!document.fullscreenElement);
      }
    });
    this.render();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  private isHullUnlocked(id: HullId): boolean {
    return this.sandboxAllUnlocked || this.unlockedHulls.has(id);
  }

  private isPartUnlocked(id: PartId): boolean {
    return this.sandboxAllUnlocked || this.unlockedParts.has(id);
  }

  /** 全画面切替（対応端末では横向きに画面を固定する） */
  private async toggleFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (o: string) => Promise<void>;
        };
        await orientation.lock?.('landscape').catch(() => undefined);
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // iOS Safari などFullscreen API非対応環境では何もしない（ホーム画面追加で全画面化）
    }
    this.render();
  }

  private isPresetUnlocked(bp: ShipBlueprint): boolean {
    if (!this.isHullUnlocked(bp.hullId)) return false;
    for (const eq of Object.values(bp.slots)) {
      if (eq && !this.isPartUnlocked(eq.partId)) return false;
    }
    return true;
  }

  private loop(ts: number): void {
    this.animTime = ts * 0.001;

    if (this.mode === 'garage' && this.previewCanvas) {
      const ctx = this.previewCanvas.getContext('2d');
      if (ctx) {
        const stats = computeBlueprintStats(this.playerBp);
        const res = renderGaragePreview(
          ctx,
          this.previewCanvas.width,
          this.previewCanvas.height,
          this.playerBp,
          stats.comLocal,
          this.selectedSlotId,
          this.animTime
        );
        this.previewSlotAreas = res.slotHitAreas;
      }
    } else if (this.mode === 'battle' && this.arena && this.battleCanvas) {
      const steps = this.arena.winner === null ? this.battleSpeed : 1;
      for (let i = 0; i < steps; i++) {
        this.arena.step();
      }
      const ctx = this.battleCanvas.getContext('2d');
      if (ctx) {
        renderBattleArena(ctx, this.arena);
      }

      if (this.arena.winner !== null && !this.resultShown && this.arena.finishTimer > 0.32) {
        this.resultShown = true;
        this.handleBattleEnd();
        this.renderBattleResultOverlay();
      }
    }

    requestAnimationFrame((nextTs) => this.loop(nextTs));
  }

  private handleBattleEnd(): void {
    if (!this.arena || this.isTestBattle) return;
    if (this.arena.winner === 0) {
      this.lastUnlockText = null;
      const st = this.currentEnemyStage;

      if (st.unlockPart && !this.unlockedParts.has(st.unlockPart)) {
        this.unlockedParts.add(st.unlockPart);
        this.lastUnlockText = `🎁 敵の切り札「${PARTS[st.unlockPart].name}」を奪取してアンロック！`;
      }
      if (st.unlockHull && !this.unlockedHulls.has(st.unlockHull)) {
        this.unlockedHulls.add(st.unlockHull);
        this.lastUnlockText = `🛸 敵の新艦体「${HULLS[st.unlockHull].name}」を奪取してアンロック！`;
      }

      if (this.selectedStageNum >= this.maxUnlockedStage) {
        this.maxUnlockedStage = this.selectedStageNum + 1;
      }
    }
  }

  private selectHull(hullId: HullId): void {
    if (!this.isHullUnlocked(hullId)) return;
    sound.playClick();
    const newHull = HULLS[hullId];
    const nextSlots: ShipBlueprint['slots'] = {};

    // 旧艦体で付けていたパーツを可能な範囲で同じカテゴリのスロットへ引き継ぐ
    const oldEquipped = Object.values(this.playerBp.slots).filter(Boolean) as {
      partId: PartId;
      flipped: boolean;
    }[];
    let usedEnergy = 0;

    for (const s of newHull.slots) {
      const matchIdx = oldEquipped.findIndex((eq) => {
        const p = PARTS[eq.partId];
        return p.category === s.category && usedEnergy + p.energy <= newHull.maxEnergy;
      });
      if (matchIdx >= 0) {
        const picked = oldEquipped.splice(matchIdx, 1)[0];
        nextSlots[s.id] = picked;
        usedEnergy += PARTS[picked.partId].energy;
      } else {
        nextSlots[s.id] = null;
      }
    }

    this.playerBp.hullId = hullId;
    this.playerBp.slots = nextSlots;
    this.selectedSlotId = newHull.slots[0]?.id ?? null;
    this.toastMessage = null;
    this.render();
  }

  private equipPart(partId: PartId): void {
    if (!this.isPartUnlocked(partId)) return;
    const part = PARTS[partId];
    const hull = HULLS[this.playerBp.hullId];

    // 選択中スロットが同カテゴリならそこへ、違えば空きまたは同カテゴリスロットを探す
    let targetSlot = hull.slots.find(
      (s) => s.id === this.selectedSlotId && s.category === part.category
    );
    if (!targetSlot) {
      targetSlot =
        hull.slots.find((s) => s.category === part.category && !this.playerBp.slots[s.id]) ??
        hull.slots.find((s) => s.category === part.category);
    }

    if (!targetSlot) {
      this.toastMessage = `⚠️ この艦体には対応するスロットがありません！`;
      this.render();
      return;
    }

    // 電力上限チェック（入れ替え元の電力は差し引く）
    const currentStats = computeBlueprintStats(this.playerBp);
    const prevEq = this.playerBp.slots[targetSlot.id];
    const prevEnergy = prevEq ? PARTS[prevEq.partId].energy : 0;
    const nextEnergy = currentStats.usedEnergy - prevEnergy + part.energy;

    if (nextEnergy > hull.maxEnergy) {
      this.toastMessage = `⚡ 電力オーバー！（必要: ${nextEnergy} / 上限: ${hull.maxEnergy}）他のパーツを外すか軽いパーツを選んでください。`;
      this.render();
      return;
    }

    sound.playClick();
    this.playerBp.slots[targetSlot.id] = { partId, flipped: false };
    this.selectedSlotId = targetSlot.id;
    this.toastMessage = null;
    this.render();
  }

  private startBattle(testMode: boolean): void {
    sound.unlock();
    sound.playClick();
    this.isTestBattle = testMode;
    this.resultShown = false;
    this.lastUnlockText = null;

    if (testMode) {
      this.currentEnemyStage = DUMMY_STAGE;
    } else if (this.selectedStageNum <= ENEMY_STAGES.length) {
      this.currentEnemyStage = ENEMY_STAGES[this.selectedStageNum - 1];
    } else {
      this.currentEnemyStage = generateRandomEnemy(this.selectedStageNum);
    }

    this.arena = new BattleArena(this.playerBp, this.currentEnemyStage.blueprint);
    this.mode = 'battle';
    this.render();
  }

  public render(): void {
    const headerHtml = `
      <header class="top-bar">
        <div class="brand">
          <h1>🐾 NYARMADA</h1>
          <span>無重力クラフト＆オート物理バトル</span>
        </div>
        <div class="header-actions">
          <button id="btn-fullscreen" class="btn-chip ${document.fullscreenElement ? 'active' : ''}">
            ${document.fullscreenElement ? '🗗 全画面解除' : '⛶ 全画面'}
          </button>
          <button id="btn-sandbox" class="btn-chip ${this.sandboxAllUnlocked ? 'active' : ''}">
            ${
              this.sandboxAllUnlocked
                ? '🔓 <span class="label-long">全パーツ</span>解放中'
                : '🔒 <span class="label-long">全パーツ解放（</span>サンドボックス<span class="label-long">）</span>'
            }
          </button>
          <button id="btn-mute" class="btn-chip ${!sound.muted ? 'active' : ''}">
            ${sound.muted ? '🔇 サウンド OFF' : '🔊 サウンド ON'}
          </button>
        </div>
      </header>
    `;

    if (this.mode === 'garage') {
      // 再描画でスクロール位置が先頭に戻らないよう保存・復元する（スマホ操作向け）
      const scrollSelectors = ['.panel-build', '.panel-catalog', '.catalog-list'];
      const savedScroll = scrollSelectors.map(
        (sel) => this.root.querySelector<HTMLElement>(sel)?.scrollTop ?? 0
      );
      const wasGarage = document.body.dataset.mode === 'garage';
      document.body.dataset.mode = 'garage';
      this.root.innerHTML = headerHtml + this.buildGarageHtml();
      if (wasGarage) {
        scrollSelectors.forEach((sel, i) => {
          const el = this.root.querySelector<HTMLElement>(sel);
          if (el) el.scrollTop = savedScroll[i];
        });
      }
      this.bindGarageEvents();
    } else {
      document.body.dataset.mode = 'battle';
      this.root.innerHTML = headerHtml + this.buildBattleHtml();
      this.bindBattleEvents();
    }

    document.getElementById('btn-sandbox')?.addEventListener('click', () => {
      this.sandboxAllUnlocked = !this.sandboxAllUnlocked;
      sound.playClick();
      this.render();
    });

    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
      sound.playClick();
      void this.toggleFullscreen();
    });

    document.getElementById('btn-mute')?.addEventListener('click', () => {
      sound.muted = !sound.muted;
      if (!sound.muted) sound.playClick();
      this.render();
    });
  }

  private buildGarageHtml(): string {
    const hull = HULLS[this.playerBp.hullId];
    const stats = computeBlueprintStats(this.playerBp);

    const campaignStage =
      this.selectedStageNum <= ENEMY_STAGES.length
        ? ENEMY_STAGES[this.selectedStageNum - 1]
        : null;

    const stageObj = campaignStage ?? {
      stage: this.selectedStageNum,
      title: `ENDLESS CUP 第${this.selectedStageNum - TOTAL_CAMPAIGN_STAGES}戦`,
      tagline: '全パーツ解禁・ランダム編成の未知なる宇宙ネコ艦隊と連戦！',
      rewardText: 'エンドレス連勝チャレンジ',
    };

    let enemyIntelHtml = '';
    if (campaignStage) {
      const eBp = campaignStage.blueprint;
      const eHull = HULLS[eBp.hullId];
      const hullIsTarget = campaignStage.unlockHull === eHull.id;
      const hullNotOwned = !this.unlockedHulls.has(eHull.id);

      const equippedCounts = new Map<string, { partId: PartId; flipped: boolean; count: number }>();
      for (const eq of Object.values(eBp.slots)) {
        if (!eq) continue;
        const key = `${eq.partId}:${eq.flipped ? 1 : 0}`;
        const prev = equippedCounts.get(key);
        if (prev) prev.count++;
        else equippedCounts.set(key, { partId: eq.partId, flipped: eq.flipped, count: 1 });
      }

      const partChipsHtml = Array.from(equippedCounts.values())
        .map((item) => {
          const p = PARTS[item.partId];
          const isTarget = campaignStage.unlockPart === p.id;
          const notOwned = !this.unlockedParts.has(p.id);
          const badge = isTarget
            ? `<span class="intel-badge ${notOwned ? 'new' : 'owned'}">${
                notOwned ? '✨未所持・奪取' : '✅奪取済'
              }</span>`
            : '';
          return `
            <div class="intel-chip ${isTarget && notOwned ? 'new-target' : ''}">
              <canvas class="intel-thumb" width="40" height="26" data-thumb-part="${
                p.id
              }" data-thumb-flipped="${item.flipped ? '1' : '0'}"></canvas>
              <span>${p.name}${item.flipped ? '(後向)' : ''}${
            item.count > 1 ? ` ×${item.count}` : ''
          }</span>
              ${badge}
            </div>
          `;
        })
        .join('');

      enemyIntelHtml = `
        <div class="enemy-intel-box">
          <div class="intel-label">🔍 敵艦の装備構成（未所持パーツへの対策を組もう！）：</div>
          <div class="intel-chips">
            <div class="intel-chip ${hullIsTarget && hullNotOwned ? 'new-target' : ''}">
              <canvas class="intel-thumb" width="40" height="26" data-thumb-hull="${
                eHull.id
              }"></canvas>
              <span>${eHull.name}</span>
              ${
                hullIsTarget
                  ? `<span class="intel-badge ${hullNotOwned ? 'new' : 'owned'}">${
                      hullNotOwned ? '✨新艦体・奪取' : '✅奪取済'
                    }</span>`
                  : ''
              }
            </div>
            ${partChipsHtml}
          </div>
        </div>
      `;
    }

    const slotsHtml = hull.slots
      .map((s) => {
        const eq = this.playerBp.slots[s.id];
        const part = eq ? PARTS[eq.partId] : null;
        const catClass =
          s.category === 'weapon'
            ? 'cat-weapon'
            : s.category === 'thruster'
            ? 'cat-thruster'
            : 'cat-gadget';
        const catLabel =
          s.category === 'weapon' ? '武装' : s.category === 'thruster' ? '推進' : '補助';

        return `
          <div class="slot-row ${this.selectedSlotId === s.id ? 'selected' : ''}" data-slot-id="${s.id}">
            <div class="slot-left">
              <span class="cat-badge ${catClass}">${catLabel}</span>
              ${
                part
                  ? `<canvas class="slot-thumb" width="54" height="36" data-thumb-part="${
                      part.id
                    }" data-thumb-flipped="${eq?.flipped ? '1' : '0'}"></canvas>`
                  : ''
              }
              <div>
                <div style="font-size:0.84rem;font-weight:800;">
                  ${s.label}：${part ? part.name : '<span style="color:#64748b;">未装着（空き）</span>'}
                </div>
                ${
                  part
                    ? `<div style="font-size:0.72rem;color:#94a3b8;">⚡${part.energy} / 向き: ${
                        eq?.flipped ? '◀ 後ろ向き（反動逆転）' : '前向き ▶'
                      }</div>`
                    : ''
                }
              </div>
            </div>
            <div class="slot-actions">
              ${
                part && part.canFlip
                  ? `<button class="btn-mini ${eq?.flipped ? 'flipped' : ''}" data-flip-slot="${
                      s.id
                    }">⇄ 反転</button>`
                  : ''
              }
              ${
                part
                  ? `<button class="btn-mini" data-clear-slot="${s.id}">✕ 外す</button>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');

    let catalogHtml = '';
    if (this.activeTab === 'hulls') {
      catalogHtml = HULL_LIST.map((h) => {
        const unlocked = this.isHullUnlocked(h.id);
        const isCurrent = h.id === this.playerBp.hullId;
        const unlockStage = ENEMY_STAGES.find((s) => s.unlockHull === h.id);
        const lockText = unlockStage
          ? `🔒 STAGE ${unlockStage.stage} ボス「${unlockStage.blueprint.pilotName}」撃破で奪取・解放！`
          : '🔒 リーグ戦を勝ち抜くとアンロック';
        return `
          <div class="item-card ${isCurrent ? 'active-hull' : ''} ${!unlocked ? 'locked' : ''}">
            <div class="item-left">
              <canvas class="thumb-box" width="74" height="50" data-thumb-hull="${h.id}"></canvas>
              <div class="item-info">
                <h4>
                  ${h.name}
                  <span class="energy-pill">❤️${h.hp} / ⚡${h.maxEnergy}</span>
                </h4>
                <p>${unlocked ? h.description : lockText}</p>
              </div>
            </div>
            <button class="btn-equip" data-select-hull="${h.id}" ${
          !unlocked || isCurrent ? 'disabled' : ''
        }>
              ${isCurrent ? '使用中' : unlocked ? '乗り換え' : '🔒 未解放'}
            </button>
          </div>
        `;
      }).join('');
    } else {
      const filteredParts = PART_LIST.filter((p) => p.category === this.activeTab);
      catalogHtml = filteredParts
        .map((p) => {
          const unlocked = this.isPartUnlocked(p.id);
          const unlockStage = ENEMY_STAGES.find((s) => s.unlockPart === p.id);
          const lockText = unlockStage
            ? `🔒 STAGE ${unlockStage.stage} ボス「${unlockStage.blueprint.pilotName}」が装備中（撃破で奪取！）`
            : '🔒 リーグ戦クリア報酬でアンロック';
          return `
            <div class="item-card ${!unlocked ? 'locked' : ''}">
              <div class="item-left">
                <canvas class="thumb-box" width="74" height="50" data-thumb-part="${p.id}"></canvas>
                <div class="item-info">
                  <h4>
                    ${p.name}
                    <span class="energy-pill">⚡電力 ${p.energy}</span>
                    ${p.damage ? `<span class="energy-pill" style="color:#fca5a5;">💥威力 ${p.damage}</span>` : ''}
                  </h4>
                  <p>${unlocked ? p.description : lockText}</p>
                </div>
              </div>
              <button class="btn-equip" data-equip-part="${p.id}" ${!unlocked ? 'disabled' : ''}>
                ${unlocked ? '装着する' : '🔒 未解放'}
              </button>
            </div>
          `;
        })
        .join('');
    }

    const presetsHtml = PRESET_BUILDS.map((pr, idx) => {
      const canUse = this.isPresetUnlocked(pr.bp);
      return `<button class="btn-mini" data-preset-idx="${idx}" ${
        !canUse ? 'disabled' : ''
      } title="${
        canUse
          ? 'サンプル設計を読み込む'
          : '必要パーツを奪取するか、右上のサンドボックスONで使用可能'
      }">${canUse ? pr.label : `🔒 ${pr.label}`}</button>`;
    }).join('');

    return `
      <div class="garage-grid">
        <!-- 左カラム：艦体プレビュー＆スロット -->
        <section class="panel panel-build">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <div>
              <strong style="font-size:1.05rem;">🛠️ ${hull.name}</strong>
              <span style="font-size:0.78rem;color:#94a3b8;margin-left:6px;">${hull.subtitle}</span>
            </div>
            <div class="preset-row" style="display:flex;gap:5px;flex-wrap:wrap;">
              ${presetsHtml}
            </div>
          </div>

          <div class="preview-wrap">
            <canvas id="garage-preview-canvas" class="preview-canvas" width="560" height="270"></canvas>
          </div>

          <div class="stats-strip">
            <div class="stat-box">
              <div class="stat-label">総耐久 (HP)</div>
              <div class="stat-value" style="color:#4ade80;">❤️ ${stats.totalHp}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">使用電力 (Energy)</div>
              <div class="stat-value ${
                stats.usedEnergy === stats.maxEnergy ? 'energy-full' : 'energy-ok'
              }">⚡ ${stats.usedEnergy} / ${stats.maxEnergy}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">推定火力 (DPS)</div>
              <div class="stat-value" style="color:#fb7185;">💥 ${stats.approxDps}/s</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">総質量 / ジャイロ</div>
              <div class="stat-value" style="color:#cbd5e1;">⚖️ ${stats.totalMass}</div>
            </div>
          </div>

          <div class="section-title">
            <span>🔧 スロット構成（クリックで選択・向き反転）</span>
          </div>
          <div class="slot-list">
            ${slotsHtml}
          </div>
          ${this.toastMessage ? `<div class="toast-msg">${this.toastMessage}</div>` : ''}
        </section>

        <!-- 右カラム：パーツカタログ＆出撃パネル -->
        <section class="panel panel-catalog">
          <div>
            <div class="tabs">
              <button class="tab-btn ${this.activeTab === 'weapon' ? 'active' : ''}" data-tab="weapon">🔫 武装 (5)</button>
              <button class="tab-btn ${this.activeTab === 'thruster' ? 'active' : ''}" data-tab="thruster">🔥 推進 (3)</button>
              <button class="tab-btn ${this.activeTab === 'gadget' ? 'active' : ''}" data-tab="gadget">🧲 補助 (3)</button>
              <button class="tab-btn ${this.activeTab === 'hulls' ? 'active' : ''}" data-tab="hulls">🛸 艦体 (4)</button>
            </div>

            <div class="catalog-list">
              ${catalogHtml}
            </div>
          </div>

          <div class="stage-card">
            <div class="stage-nav">
              <button id="btn-prev-stage" class="btn-mini" ${
                this.selectedStageNum <= 1 ? 'disabled' : ''
              }>◀ 前へ</button>
              <div class="stage-title">${stageObj.title}</div>
              <button id="btn-next-stage" class="btn-mini" ${
                this.selectedStageNum >= this.maxUnlockedStage && !this.sandboxAllUnlocked
                  ? 'disabled'
                  : ''
              }>次へ ▶</button>
            </div>
            <div class="stage-tagline">${stageObj.tagline}</div>
            ${enemyIntelHtml}
            <div class="stage-reward">🏆 ${stageObj.rewardText}</div>
            <div class="launch-buttons">
              <button id="btn-test-battle" class="btn-test">🧪 テスト演習</button>
              <button id="btn-start-battle" class="btn-battle">⚔️ アリーナ出撃！</button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  private bindGarageEvents(): void {
    this.previewCanvas = document.getElementById(
      'garage-preview-canvas'
    ) as HTMLCanvasElement | null;

    // パーツ＆艦体ミニサムネイルの描画
    document.querySelectorAll<HTMLCanvasElement>('[data-thumb-part]').forEach((cv) => {
      const pid = cv.dataset.thumbPart as PartId;
      const flipped = cv.dataset.thumbFlipped === '1';
      renderPartThumbnail(cv, pid, flipped);
    });
    document.querySelectorAll<HTMLCanvasElement>('[data-thumb-hull]').forEach((cv) => {
      const hid = cv.dataset.thumbHull as HullId;
      renderHullThumbnail(cv, hid);
    });

    // キャンバス上のスロット直接クリック
    this.previewCanvas?.addEventListener('click', (ev) => {
      if (!this.previewCanvas) return;
      const rect = this.previewCanvas.getBoundingClientRect();
      const scaleX = this.previewCanvas.width / rect.width;
      const scaleY = this.previewCanvas.height / rect.height;
      const mx = (ev.clientX - rect.left) * scaleX;
      const my = (ev.clientY - rect.top) * scaleY;

      for (const area of this.previewSlotAreas) {
        if (Math.hypot(mx - area.sx, my - area.sy) <= area.r) {
          sound.playClick();
          this.selectedSlotId = area.slot.id;
          this.activeTab = area.slot.category;
          this.toastMessage = null;
          this.render();
          break;
        }
      }
    });

    // スロット行クリック
    document.querySelectorAll<HTMLElement>('[data-slot-id]').forEach((row) => {
      row.addEventListener('click', (ev) => {
        const target = ev.target as HTMLElement;
        if (target.closest('button')) return;
        const slotId = row.dataset.slotId!;
        const hull = HULLS[this.playerBp.hullId];
        const slot = hull.slots.find((s) => s.id === slotId);
        if (slot) {
          sound.playClick();
          this.selectedSlotId = slotId;
          this.activeTab = slot.category;
          this.toastMessage = null;
          this.render();
        }
      });
    });

    // 向き反転ボタン
    document.querySelectorAll<HTMLButtonElement>('[data-flip-slot]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const slotId = btn.dataset.flipSlot!;
        const eq = this.playerBp.slots[slotId];
        if (eq) {
          sound.playClick();
          eq.flipped = !eq.flipped;
          this.render();
        }
      });
    });

    // パーツ取り外しボタン
    document.querySelectorAll<HTMLButtonElement>('[data-clear-slot]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const slotId = btn.dataset.clearSlot!;
        sound.playClick();
        this.playerBp.slots[slotId] = null;
        this.toastMessage = null;
        this.render();
      });
    });

    // タブ切替
    document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.activeTab = btn.dataset.tab as TabType;
        this.render();
      });
    });

    // 艦体乗り換え
    document.querySelectorAll<HTMLButtonElement>('[data-select-hull]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectHull(btn.dataset.selectHull as HullId);
      });
    });

    // パーツ装着
    document.querySelectorAll<HTMLButtonElement>('[data-equip-part]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.equipPart(btn.dataset.equipPart as PartId);
      });
    });

    // サンプルプリセット読込（解放済みパーツで構成されたもの、またはサンドボックスON時のみ有効）
    document.querySelectorAll<HTMLButtonElement>('[data-preset-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.presetIdx);
        const preset = PRESET_BUILDS[idx];
        if (!preset || !this.isPresetUnlocked(preset.bp)) return;
        sound.playClick();

        this.playerBp = structuredClone(preset.bp);
        this.selectedSlotId = HULLS[this.playerBp.hullId].slots[0]?.id ?? null;
        this.toastMessage = `✨ サンプル構成「${preset.label}」を読み込みました！`;
        this.render();
      });
    });

    // ステージ選択・出撃
    document.getElementById('btn-prev-stage')?.addEventListener('click', () => {
      if (this.selectedStageNum > 1) {
        sound.playClick();
        this.selectedStageNum--;
        this.render();
      }
    });

    document.getElementById('btn-next-stage')?.addEventListener('click', () => {
      sound.playClick();
      this.selectedStageNum++;
      this.render();
    });

    document.getElementById('btn-test-battle')?.addEventListener('click', () => {
      this.startBattle(true);
    });

    document.getElementById('btn-start-battle')?.addEventListener('click', () => {
      this.startBattle(false);
    });
  }

  private buildBattleHtml(): string {
    return `
      <section class="battle-wrapper" id="battle-wrapper">
        <canvas
          id="battle-canvas"
          class="battle-canvas"
          width="${ARENA_WIDTH}"
          height="${ARENA_HEIGHT}"
        ></canvas>

        <div class="battle-controls">
          <div style="font-weight:800;color:#fde047;">
            ${this.currentEnemyStage.title}
          </div>
          <div style="display:flex;gap:8px;">
            <button id="btn-speed" class="btn-chip ${this.battleSpeed === 2 ? 'active' : ''}">
              ⏩ 速度: ${this.battleSpeed}x
            </button>
            <button id="btn-retry" class="btn-chip">🔄 再戦リトライ</button>
            <button id="btn-back-garage" class="btn-chip" style="border-color:#38bdf8;color:#7dd3fc;">
              🔧 ガレージへ戻る
            </button>
          </div>
        </div>
      </section>
    `;
  }

  private bindBattleEvents(): void {
    this.battleCanvas = document.getElementById('battle-canvas') as HTMLCanvasElement | null;

    document.getElementById('btn-speed')?.addEventListener('click', () => {
      sound.playClick();
      this.battleSpeed = this.battleSpeed === 1 ? 2 : 1;
      const speedBtn = document.getElementById('btn-speed');
      if (speedBtn) {
        speedBtn.textContent = `⏩ 速度: ${this.battleSpeed}x`;
        speedBtn.classList.toggle('active', this.battleSpeed === 2);
      }
    });

    document.getElementById('btn-retry')?.addEventListener('click', () => {
      this.startBattle(this.isTestBattle);
    });

    document.getElementById('btn-back-garage')?.addEventListener('click', () => {
      sound.playClick();
      this.mode = 'garage';
      this.arena = null;
      this.render();
    });
  }

  private renderBattleResultOverlay(): void {
    const wrapper = document.getElementById('battle-wrapper');
    if (!wrapper || !this.arena) return;

    const win = this.arena.winner === 0;
    const draw = this.arena.winner === 'draw';

    const title = win ? '🎉 VICTORY!! 🎉' : draw ? '💥 DOUBLE KO!! 💥' : '😿 DEFEAT...';
    const titleColor = win ? '#facc15' : draw ? '#38bdf8' : '#f43f5e';
    const sub = win
      ? `${this.currentEnemyStage.blueprint.pilotName}の艦を撃沈したニャ！`
      : draw
      ? '相打ち！パーツ配置を少し変えれば勝てるかもニャ！'
      : '重心やスラスター・シールドの相性を見直してリベンジしよう！';

    const overlay = document.createElement('div');
    overlay.className = 'result-overlay';
    overlay.innerHTML = `
      <div class="result-box">
        <h2 style="color:${titleColor};">${title}</h2>
        <p style="color:#cbd5e1;font-size:0.9rem;">${sub}</p>
        ${this.lastUnlockText ? `<div class="unlock-banner">${this.lastUnlockText}</div>` : ''}
        <div class="result-actions">
          <button id="res-garage" class="btn-chip" style="padding:10px 16px;">🔧 ガレージで改造</button>
          <button id="res-retry" class="btn-chip" style="padding:10px 16px;">🔄 もう一度戦う</button>
          ${
            win && !this.isTestBattle
              ? `<button id="res-next" class="btn-battle" style="padding:10px 18px;font-size:0.9rem;">⏭️ 次のステージへ！</button>`
              : ''
          }
        </div>
      </div>
    `;

    wrapper.appendChild(overlay);

    document.getElementById('res-garage')?.addEventListener('click', () => {
      sound.playClick();
      this.mode = 'garage';
      this.arena = null;
      if (win && !this.isTestBattle) {
        this.selectedStageNum = this.maxUnlockedStage;
      }
      this.render();
    });

    document.getElementById('res-retry')?.addEventListener('click', () => {
      this.startBattle(this.isTestBattle);
    });

    document.getElementById('res-next')?.addEventListener('click', () => {
      this.selectedStageNum++;
      this.startBattle(false);
    });
  }
}
