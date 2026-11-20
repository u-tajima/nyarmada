import { HULLS } from '../data/hulls';
import { PARTS } from '../data/parts';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BattleArena,
  SUDDEN_DEATH_START,
} from '../physics/arena';
import {
  ActiveSlotState,
  getSlotForwardVector,
  ShipInstance,
  shipLocalToWorld,
} from '../physics/shipBody';
import { CatMood, HullDef, HullId, PartId, ShipBlueprint, SlotDef, Vec2 } from '../types';

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  color: string;
}

const STARS: Star[] = Array.from({ length: 85 }, () => ({
  x: Math.random() * ARENA_WIDTH,
  y: Math.random() * ARENA_HEIGHT,
  r: 0.8 + Math.random() * 2.2,
  alpha: 0.35 + Math.random() * 0.65,
  color: ['#ffffff', '#bae6fd', '#fde68a', '#e9d5ff'][Math.floor(Math.random() * 4)],
}));

export function renderBattleArena(ctx: CanvasRenderingContext2D, arena: BattleArena): void {
  ctx.save();

  if (arena.screenShake > 0) {
    const sx = (Math.random() - 0.5) * arena.screenShake * 1.6;
    const sy = (Math.random() - 0.5) * arena.screenShake * 1.6;
    ctx.translate(sx, sy);
  }

  // 1. 宇宙背景グラデーション＋星々
  const bgGrad = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#131c38');
  bgGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < ARENA_WIDTH; x += 55) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < ARENA_HEIGHT; y += 55) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_WIDTH, y);
    ctx.stroke();
  }

  for (const s of STARS) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 背景の土星モチーフ
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#818cf8';
  ctx.beginPath();
  ctx.arc(830, 145, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c7d2fe';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(830, 145, 92, 20, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 2. 四方バリア壁 / サドンデス4面収縮レーザー壁
  drawArenaBounds(ctx, arena.wallInset, arena.wallInsetY, arena.suddenDeathActive, arena.elapsed);

  // 4. トラクタービーム＆レーザー照準線（下層）
  for (const ship of arena.ships) {
    if (ship.destroyed) continue;
    drawShipUnderlayEffects(ctx, ship, arena.elapsed);
  }

  // 5. 両艦体と装備パーツの描画
  for (const ship of arena.ships) {
    if (ship.destroyed) continue;
    drawBattleShip(ctx, ship, arena.elapsed);
  }

  // 6. 衝撃波・ビーム・飛翔体・パーティクル
  for (const sw of arena.shockwaves) {
    const progress = 1 - sw.life / sw.maxLife;
    ctx.save();
    ctx.globalAlpha = sw.life / sw.maxLife;
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 6 * (sw.life / sw.maxLife);
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.maxRadius * progress, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const beam of arena.laserBeams) {
    const alpha = beam.life / beam.maxLife;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 34 * alpha;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 16 * alpha;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6 * alpha;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.restore();
  }

  for (const p of arena.projectiles) {
    ctx.save();
    const angle = Math.atan2(p.vy, p.vx);
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    if (p.isRailgun) {
      // 電磁徹甲弾（鋭い青白い槍状弾＋プラズマリング）
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-2, 0, 3, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // コミカルな赤白ロケット弾（尾翼＋噴射炎つき）
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(-18 - Math.random() * 5, 0);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();

      // 尾翼
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -5);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-11, 10);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ボディ（白＋赤弾頭）
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-10, -5.5, 16, 11, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(4, -5.5);
      ctx.quadraticCurveTo(14, -4, 15, 0);
      ctx.quadraticCurveTo(14, 4, 4, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const pt of arena.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 7. ダメージポップアップ
  for (const ft of arena.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
    ctx.font = `900 ${ft.size}px "M PLUS Rounded 1c", sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  // 8. 上部バトルHUD
  drawBattleHud(ctx, arena);

  // 9. カウントダウン
  if (arena.countdown > 0) {
    const num = Math.ceil(arena.countdown * 2);
    const label = num >= 3 ? 'READY...' : num === 2 ? 'SET...' : 'CRASH GO!!';
    ctx.save();
    ctx.font = '900 58px "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 10;
    ctx.strokeText(label, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    ctx.fillStyle = '#facc15';
    ctx.fillText(label, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    ctx.restore();
  }

  ctx.restore();
}

function drawArenaBounds(
  ctx: CanvasRenderingContext2D,
  insetX: number,
  insetY: number,
  suddenDeath: boolean,
  t: number
): void {
  ctx.save();
  if (suddenDeath) {
    ctx.fillStyle = 'rgba(244, 63, 94, 0.24)';
    ctx.fillRect(0, 0, insetX, ARENA_HEIGHT);
    ctx.fillRect(ARENA_WIDTH - insetX, 0, insetX, ARENA_HEIGHT);
    ctx.fillRect(insetX, 0, ARENA_WIDTH - insetX * 2, insetY);
    ctx.fillRect(insetX, ARENA_HEIGHT - insetY, ARENA_WIDTH - insetX * 2, insetY);

    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 4 + Math.sin(t * 20) * 1.8;
    ctx.strokeRect(insetX, insetY, ARENA_WIDTH - insetX * 2, ARENA_HEIGHT - insetY * 2);
  } else {
    ctx.fillStyle = 'rgba(14, 165, 233, 0.08)';
    ctx.fillRect(0, 0, insetX, ARENA_HEIGHT);
    ctx.fillRect(ARENA_WIDTH - insetX, 0, insetX, ARENA_HEIGHT);
    ctx.fillRect(insetX, 0, ARENA_WIDTH - insetX * 2, insetY);
    ctx.fillRect(insetX, ARENA_HEIGHT - insetY, ARENA_WIDTH - insetX * 2, insetY);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(insetX, insetY, ARENA_WIDTH - insetX * 2, ARENA_HEIGHT - insetY * 2);
  }
  ctx.restore();
}

function drawShipUnderlayEffects(
  ctx: CanvasRenderingContext2D,
  ship: ShipInstance,
  t: number
): void {
  for (const st of ship.activeSlots) {
    const worldPos = shipLocalToWorld(ship, st.slot.x, st.slot.y);
    const dir = getSlotForwardVector(ship, st.equipped.flipped);

    if (st.part.id === 'laser' && st.isCharging) {
      const progress = Math.min(1, st.chargeTimer / (st.part.chargeTime ?? 2.2));
      ctx.save();
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.22 + progress * 0.55})`;
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2 + progress * 2;
      ctx.beginPath();
      ctx.moveTo(worldPos.x, worldPos.y);
      ctx.lineTo(worldPos.x + dir.x * 950, worldPos.y + dir.y * 950);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.arc(
        worldPos.x + dir.x * 22,
        worldPos.y + dir.y * 22,
        4 + progress * 10 + Math.sin(t * 30) * 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    if (st.part.id === 'tractor' && st.tractorTargetPoint) {
      const target = st.tractorTargetPoint;
      ctx.save();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const bx = worldPos.x + (target.x - worldPos.x) * u;
        const by =
          worldPos.y +
          (target.y - worldPos.y) * u +
          Math.sin(u * Math.PI * 6 - t * 18) * 6;
        if (i === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * 艦体ローカル空間（原点=デザイン中心、+x=艦首方向）での船体デザイン描画
 */
function drawHullLocal(
  ctx: CanvasRenderingContext2D,
  hull: HullDef,
  flash: boolean,
  t: number
): void {
  ctx.save();
  ctx.fillStyle = flash ? '#ffffff' : hull.color;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';

  if (hull.shapeType === 'circle' && hull.radius) {
    // UFOソーサー：円盤ボディ＋周囲に回転ライトドット
    ctx.beginPath();
    ctx.arc(0, 0, hull.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!flash) {
      ctx.strokeStyle = hull.accentColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, hull.radius - 12, 0, Math.PI * 2);
      ctx.stroke();

      const lights = 8;
      for (let i = 0; i < lights; i++) {
        const a = (i * Math.PI * 2) / lights;
        const lx = Math.cos(a) * (hull.radius - 6);
        const ly = Math.sin(a) * (hull.radius - 6);
        const pulse = Math.sin(t * 8 + i) > 0;
        ctx.fillStyle = pulse ? '#fde047' : '#e9d5ff';
        ctx.beginPath();
        ctx.arc(lx, ly, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (hull.vertices) {
    ctx.beginPath();
    hull.vertices.forEach((v, idx) => {
      if (idx === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!flash) {
      // 艦体ごとの特徴がひと目で分かるシンプル装飾
      if (hull.id === 'sneaky') {
        // くさび先端の金属ラムプレート＋スピードライン
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(32, -5);
        ctx.lineTo(56, 8);
        ctx.lineTo(42, 22);
        ctx.lineTo(28, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = hull.accentColor;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-36, 12);
        ctx.lineTo(18, 12);
        ctx.stroke();
      } else if (hull.id === 'titan') {
        // 重装甲プレート分割線＋上下バンパー＋リベット
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-36, -54, 52, 16);
        ctx.fillRect(-36, 38, 52, 16);

        ctx.strokeStyle = hull.accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-36, 0);
        ctx.lineTo(34, 0);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        for (const ry of [-46, 46]) {
          for (const rx of [-28, -12, 4]) {
            ctx.beginPath();
            ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // クラシック・クルーザー：王道の白いストライプ＆艦首ノーズコーン
        ctx.fillStyle = hull.accentColor;
        ctx.beginPath();
        ctx.moveTo(42, -14);
        ctx.lineTo(62, -6);
        ctx.lineTo(62, 12);
        ctx.lineTo(42, 18);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = hull.accentColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-42, 4);
        ctx.lineTo(28, 4);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawBattleShip(ctx: CanvasRenderingContext2D, ship: ShipInstance, t: number): void {
  const hull = ship.hull;
  const origin = shipLocalToWorld(ship, 0, 0);

  // 1. 船体描画（360度スムーズ回転）
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(ship.body.angle);
  drawHullLocal(ctx, hull, ship.hitFlashTimer > 0, t);
  ctx.restore();

  // 2. コックピット＆ネコ艦長の描画（通常時はジャイロ座席で頭が上を向き、目が回った時は船体と一緒に回転！）
  const cp = shipLocalToWorld(ship, hull.cockpit.x, hull.cockpit.y);
  const lookFacing: 1 | -1 = Math.cos(ship.body.angle) >= 0 ? 1 : -1;
  const catRoll =
    ship.mood === 'dizzy' || ship.mood === 'ko'
      ? ship.body.angle
      : Math.sin(ship.body.angle) * 0.22 * lookFacing;
  drawCatCockpit(
    ctx,
    cp.x,
    cp.y,
    hull.cockpit.radius,
    catRoll,
    lookFacing,
    ship.blueprint.catColor,
    ship.mood
  );

  // 3. 装備パーツの描画
  for (const st of ship.activeSlots) {
    const wp = shipLocalToWorld(ship, st.slot.x, st.slot.y);
    const dir = getSlotForwardVector(ship, st.equipped.flipped);
    const angle = Math.atan2(dir.y, dir.x);
    drawPartGraphic(ctx, st.part.id, wp.x, wp.y, angle, st, t, false);

    // フロントシールドの大型エネルギーバリア弧（バトル実寸）
    if (st.part.id === 'shield' && st.shieldHp > 0) {
      const shieldOrigin = shipLocalToWorld(ship, st.slot.x * 0.35, st.slot.y * 0.35);
      const ratio = st.shieldHp / st.maxShieldHp;
      ctx.save();
      ctx.strokeStyle = '#67e8f9';
      ctx.globalAlpha = 0.25 + ratio * 0.4;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(shieldOrigin.x, shieldOrigin.y, 64, angle - 1.12, angle + 1.12);
      ctx.stroke();

      ctx.strokeStyle = '#22d3ee';
      ctx.globalAlpha = 0.55 + ratio * 0.45;
      ctx.lineWidth = 4;
      ctx.setLineDash(ratio < 0.4 ? [8, 5] : []);
      ctx.beginPath();
      ctx.arc(shieldOrigin.x, shieldOrigin.y, 64, angle - 1.12, angle + 1.12);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawCatCockpit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  facing: 1 | -1,
  catColor: string,
  mood: CatMood
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(facing, 1);

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = catColor;
  ctx.beginPath();
  ctx.moveTo(-9, -3);
  ctx.lineTo(-11, -13);
  ctx.lineTo(-2, -8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(9, -3);
  ctx.lineTo(11, -13);
  ctx.lineTo(2, -8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 2, radius * 0.62, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.lineWidth = 2;

  if (mood === 'dizzy' || mood === 'ko') {
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-2, 2);
    ctx.lineTo(-6, 4);
    ctx.moveTo(6, 0);
    ctx.lineTo(2, 2);
    ctx.lineTo(6, 4);
    ctx.stroke();
  } else if (mood === 'happy') {
    ctx.beginPath();
    ctx.arc(-4, 2, 2.5, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(4, 2, 2.5, Math.PI, 0);
    ctx.stroke();
  } else if (mood === 'charge') {
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-1, 2);
    ctx.moveTo(6, 0);
    ctx.lineTo(1, 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-3.5, 1.5, 2, 0, Math.PI * 2);
    ctx.arc(4.5, 1.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 3, -2.3, -1.1);
  ctx.stroke();

  ctx.restore();
}

/**
 * パーツ単体グラフィック描画
 * シンプルな図形構成を保ちつつ、一目で「何をする部品で・どっちに作用するか」が分かるシルエット設計
 */
export function drawPartGraphic(
  ctx: CanvasRenderingContext2D,
  partId: string,
  x: number,
  y: number,
  angle: number,
  activeState?: ActiveSlotState,
  t = 0,
  isPreview = false,
  compactArm = false
): void {
  const part = PARTS[partId as PartId];
  if (!part) return;

  // 1. オービタル・ソー：中心モーター軸 ＋ アーム ＋ 大径ギザギザ丸ノコ刃
  if (partId === 'saw') {
    const sawAngle = activeState ? activeState.sawAngle : compactArm ? -0.35 : t * 3.2;
    const radius = compactArm ? 22 : part.range ?? 64;
    const bx = x + Math.cos(sawAngle) * radius;
    const by = y + Math.sin(sawAngle) * radius;

    ctx.save();
    // 回転軌道の薄いガイドリング（プレビュー時）
    if (isPreview && !compactArm) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 連結ツインアーム
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(bx, by);
    ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // 根元ローターハブ
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    // 丸ノコ刃（外周シルバー刃＋中心イエローディスク）
    ctx.translate(bx, by);
    ctx.rotate(t * 20);
    const outerR = compactArm ? 14 : 18;
    const innerR = compactArm ? 9 : 11.5;
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const teeth = 10;
    for (let i = 0; i < teeth * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / teeth + (i % 2 === 0 ? 0.12 : 0);
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(0, 0, compactArm ? 6 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';

  switch (partId) {
    // 2. ロケット砲：ランチャー筒から「赤いミサイル弾頭」が覗くデザイン
    case 'rocket': {
      // 次弾装填スライド（発射直後は引っ込み、リロードとともに顔を出す）
      const reloadRatio = activeState
        ? 1 - Math.min(1, activeState.cooldownTimer / (part.cooldown ?? 0.95))
        : 1;
      const tipOffset = -8 + reloadRatio * 10;

      // 先端から覗く赤白ロケット弾頭
      if (reloadRatio > 0.2) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(10 + tipOffset, -6);
        ctx.quadraticCurveTo(21 + tipOffset, -4, 23 + tipOffset, 0);
        ctx.quadraticCurveTo(21 + tipOffset, 4, 10 + tipOffset, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(8 + tipOffset, -5, 3, 10);
      }

      // 後部排気ダクト
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-15, -6, 6, 12, 2);
      ctx.fill();
      ctx.stroke();

      // ランチャー本体筒（ガンメタル＋赤帯）
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(-11, -9, 25, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-3, -7.5, 6, 15);

      // 砲口リム
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(11, -9.5, 4, 19);
      ctx.strokeRect(11, -9.5, 4, 19);
      break;
    }

    // 3. レールキャノン：上下2本の平行電磁レール＋コイル＋青白い電撃スパーク
    case 'railgun': {
      // 後部リコイルダンパー塊
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-15, -9, 14, 18, 3);
      ctx.fill();
      ctx.stroke();

      // 中央エネルギーコア
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-10, -4, 18, 8);

      // 上下2本の平行ロングレール（フォーク形状）
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-3, -9.5, 35, 5.5, 2);
      ctx.roundRect(-3, 4, 35, 5.5, 2);
      ctx.fill();
      ctx.stroke();

      // 電磁加速リング（3本）
      ctx.fillStyle = '#bae6fd';
      for (const rx of [4, 13, 22]) {
        ctx.fillRect(rx, -10.5, 3, 4);
        ctx.fillRect(rx, 6.5, 3, 4);
      }

      // レール間のバチバチ電撃アーク
      const ready = !activeState || activeState.cooldownTimer < 0.5;
      if (ready) {
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(10, -3);
        ctx.lineTo(16, (Math.sin(t * 40) > 0 ? 1 : -1) * 2.5);
        ctx.lineTo(23, (Math.cos(t * 35) > 0 ? -1 : 1) * 2.5);
        ctx.lineTo(30, 0);
        ctx.stroke();
      }
      break;
    }

    // 4. フェーズレーザー：パラボラ集光皿 ＋ クリスタルプリズム球
    case 'laser': {
      // 基部ハウジング
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.roundRect(-12, -7, 14, 14, 4);
      ctx.fill();
      ctx.stroke();

      // パラボラ集光アンテナ皿（前向きに開いたお椀型）
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(2, 0, 13, -1.25, 1.25);
      ctx.lineTo(5, 7);
      ctx.arc(4, 0, 8, 1.0, -1.0, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 焦点アーム
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(6, -6);
      ctx.lineTo(19, 0);
      ctx.lineTo(6, 6);
      ctx.stroke();

      // 先端フォーカスレンズ球
      const charging = activeState?.isCharging ?? false;
      ctx.fillStyle = charging ? '#ffffff' : '#fb7185';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(19, 0, charging ? 6.5 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    // 5. プラズマドリル：黄色ハザード基部 ＋ 回転スパイラル円錐刃
    case 'drill': {
      const len = compactArm ? 34 : 50;
      const wobble = Math.sin(t * 50) * 1.1;

      // 黄色×黒の重機マウント台座
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-9, -11, 15, 22, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-5, -9, 3, 18);
      ctx.fillRect(1, -9, 3, 18);

      // 円錐ドリル刃本体
      const drillGrad = ctx.createLinearGradient(6, 0, len, 0);
      drillGrad.addColorStop(0, '#ea580c');
      drillGrad.addColorStop(0.7, '#fb923c');
      drillGrad.addColorStop(1, '#fef08a');
      ctx.fillStyle = drillGrad;
      ctx.beginPath();
      ctx.moveTo(6, -11 + wobble);
      ctx.lineTo(len, 0);
      ctx.lineTo(6, 11 - wobble);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 回転して見える斜めスパイラル溝
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(6, -10);
      ctx.lineTo(len, 0);
      ctx.lineTo(6, 10);
      ctx.closePath();
      ctx.clip();

      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 3;
      const phase = ((t * 42) % 12);
      for (let sx = -4 + phase; sx < len; sx += 12) {
        ctx.beginPath();
        ctx.moveTo(sx, -13);
        ctx.lineTo(sx + 8, 13);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    // 6. メインスラスター：王道ベル型ロケットノズル ＋ オレンジ噴射炎
    case 'thruster': {
      const showFlame = isPreview || (activeState?.isThrusting ?? false);
      if (showFlame) {
        const flicker = Math.sin(t * 38) * 3;
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(-15, -7);
        ctx.lineTo(-29 - flicker, 0);
        ctx.lineTo(-15, 7);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(-15, -3.5);
        ctx.lineTo(-22 - flicker * 0.5, 0);
        ctx.lineTo(-15, 3.5);
        ctx.closePath();
        ctx.fill();
      }

      // ベル型ロケットノズル（左 -x へ広がり、右 +x へ推進することが一目瞭然）
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(8, -6);
      ctx.lineTo(-4, -7);
      ctx.lineTo(-16, -12);
      ctx.lineTo(-16, 12);
      ctx.lineTo(-4, 7);
      ctx.lineTo(8, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // オレンジの耐熱バンド
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(-5, -6.5, 6, 13);
      ctx.strokeRect(-5, -6.5, 6, 13);
      break;
    }

    // 7. バーストブースター：2連ニトロボンベ ＋ ⚡マーク ＋ 大口径アフターバーナー
    case 'booster': {
      const firing = activeState ? activeState.isThrusting : isPreview;
      if (firing) {
        const len = activeState?.isThrusting ? 38 + Math.sin(t * 50) * 6 : 26 + Math.sin(t * 25) * 3;
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.moveTo(-16, -9);
        ctx.lineTo(-len, 0);
        ctx.lineTo(-16, 9);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-16, -4);
        ctx.lineTo(-len * 0.68, 0);
        ctx.lineTo(-16, 4);
        ctx.closePath();
        ctx.fill();
      }

      // 後部大口径ノズル
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(-18, -12);
      ctx.lineTo(-18, 12);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ツイン高圧ニトロボトル（マゼンタピンク）
      ctx.fillStyle = '#db2777';
      ctx.beginPath();
      ctx.roundRect(-10, -10.5, 22, 9.5, 4);
      ctx.roundRect(-10, 1, 22, 9.5, 4);
      ctx.fill();
      ctx.stroke();

      // 白ベルト＆チャージインジケータ
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(-1, -9.5, 4, 7.5);
      ctx.fillRect(-1, 2, 4, 7.5);

      if (activeState && !activeState.isThrusting) {
        // 次回噴射までのチャージゲージ表示
        const totalWait = (part.burstCooldown ?? 3.6) - (part.burstDuration ?? 1.1);
        const ratio = Math.max(0, Math.min(1, 1 - activeState.burstCycleTimer / totalWait));
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-8, -1.5, 18 * ratio, 3);
      }
      break;
    }

    // 8. スタビライズ逆噴射：ジャイロリング ＋ 前方2股ブレーキノズル（前へ噴射して後ろへ下がる！）
    case 'retro': {
      const showJet = isPreview || (activeState?.isThrusting ?? false);
      if (showJet) {
        const jLen = 24 + Math.sin(t * 35) * 2.5;
        ctx.fillStyle = '#5eead4';
        // 上下斜め前方へ逆噴射ガス！
        ctx.beginPath();
        ctx.moveTo(13, -7);
        ctx.lineTo(jLen, -13);
        ctx.lineTo(13, -3);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(13, 3);
        ctx.lineTo(jLen, 13);
        ctx.lineTo(13, 7);
        ctx.closePath();
        ctx.fill();
      }

      // 前向きブレーキホーン（2股ノズル）
      ctx.fillStyle = '#0f766e';
      ctx.beginPath();
      ctx.moveTo(4, -5);
      ctx.lineTo(14, -10);
      ctx.lineTo(14, -3);
      ctx.lineTo(6, -1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(4, 5);
      ctx.lineTo(14, 10);
      ctx.lineTo(14, 3);
      ctx.lineTo(6, 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 中央ジャイロスタビライザー円盤
      ctx.fillStyle = '#2dd4bf';
      ctx.beginPath();
      ctx.arc(-1, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-1, 0, 6, 2.5, t * 4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    // 9. フロントシールド：六角エミッター皿 ＋ 盾シルエット＆ミニバリア弧
    case 'shield': {
      // プレビュー・カタログ時はミニエネルギー盾を表示して「守る向き」を明確化
      if (isPreview) {
        ctx.save();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(4, 0, 22, -1.05, 1.05);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(4, 0, 22, -1.0, 1.0);
        ctx.stroke();
        ctx.restore();
      }

      // 盾型の装甲プロジェクター本体
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.moveTo(-7, -9);
      ctx.lineTo(5, -12);
      ctx.lineTo(12, 0);
      ctx.lineTo(5, 12);
      ctx.lineTo(-7, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 発光シアンコア
      const alive = !activeState || activeState.shieldHp > 0;
      ctx.fillStyle = alive ? '#67e8f9' : '#475569';
      ctx.beginPath();
      ctx.moveTo(-2, -5);
      ctx.lineTo(5, -6);
      ctx.lineTo(8, 0);
      ctx.lineTo(5, 6);
      ctx.lineTo(-2, 5);
      ctx.closePath();
      ctx.fill();
      break;
    }

    // 10. リパルサー衝撃波：紫の重力コア ＋ 四方へ広がる衝撃波リング記号 ))
    case 'repulsor': {
      const pulse = (t * 2.4) % 1;
      // 外向き波紋アーク（四方へ弾き飛ばす機能がひと目で分かる）
      ctx.save();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      const waveR = 13 + pulse * 5;
      ctx.globalAlpha = 1 - pulse * 0.65;
      for (let q = 0; q < 4; q++) {
        const baseA = (q * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, waveR, baseA - 0.42, baseA + 0.42);
        ctx.stroke();
      }
      ctx.restore();

      // 八角形バンパーボディ
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 中心スプリングリング
      ctx.fillStyle = '#f3e8ff';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // 11. トラクタービーム：誰が見ても「引き寄せ」と分かるU字型マグネット（赤白極チップ＋緑吸引波）
    case 'tractor': {
      // U字マグネット本体（エメラルド＆ガンメタル）
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(-1, 0, 11, Math.PI * 0.5, Math.PI * 1.5);
      ctx.lineTo(13, -11);
      ctx.lineTo(13, -5);
      ctx.lineTo(-1, -5);
      ctx.arc(-1, 0, 5, Math.PI * 1.5, Math.PI * 0.5, true);
      ctx.lineTo(13, 5);
      ctx.lineTo(13, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 磁石先端の赤＆青（白ライン付き）極チップ
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(8, -11, 6, 6);
      ctx.strokeRect(8, -11, 6, 6);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(8, 5, 6, 6);
      ctx.strokeRect(8, 5, 6, 6);

      // 内向きに吸い込む磁力シェブロン波
      const pullShift = ((t * 18) % 8);
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(22 - pullShift, 0, 6, -0.8, 0.8);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawBattleHud(ctx: CanvasRenderingContext2D, arena: BattleArena): void {
  const [p, e] = arena.ships;

  drawHpBar(
    ctx,
    38,
    40,
    340,
    24,
    p.hp,
    p.maxHp,
    '#3b82f6',
    `🐱 ${p.blueprint.name}`,
    false
  );

  drawHpBar(
    ctx,
    ARENA_WIDTH - 38 - 340,
    40,
    340,
    24,
    e.hp,
    e.maxHp,
    '#ef4444',
    `${e.blueprint.name} 😼`,
    true
  );

  ctx.save();
  ctx.textAlign = 'center';
  const remainToSD = Math.max(0, SUDDEN_DEATH_START - arena.elapsed);
  if (arena.suddenDeathActive) {
    ctx.font = '900 18px "M PLUS Rounded 1c", sans-serif';
    ctx.fillStyle = '#fb7185';
    ctx.fillText('⚠️ SUDDEN DEATH：レーザー壁収縮中！ ⚠️', ARENA_WIDTH / 2, 56);
  } else {
    ctx.font = '800 16px "M PLUS Rounded 1c", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`壁収縮まで ${remainToSD.toFixed(1)}s`, ARENA_WIDTH / 2, 56);
  }
  ctx.restore();
}

function drawHpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hp: number,
  maxHp: number,
  color: string,
  label: string,
  alignRight: boolean
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const fillW = Math.max(0, (w - 6) * ratio);
  ctx.fillStyle = color;
  if (fillW > 0) {
    const fx = alignRight ? x + w - 3 - fillW : x + 3;
    ctx.beginPath();
    ctx.roundRect(fx, y + 3, fillW, h - 6, 5);
    ctx.fill();
  }

  ctx.font = '800 14px "M PLUS Rounded 1c", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = alignRight ? 'right' : 'left';
  ctx.fillText(label, alignRight ? x + w - 4 : x + 4, y - 6);

  ctx.textAlign = 'center';
  ctx.font = '900 13px "M PLUS Rounded 1c", sans-serif';
  ctx.fillText(`${hp} / ${maxHp}`, x + w / 2, y + h - 6);
  ctx.restore();
}

/**
 * ガレージ画面用の艦体プレビュー＆スロット＆重心(CoM)描画
 */
export function renderGaragePreview(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blueprint: ShipBlueprint,
  comLocal: Vec2,
  selectedSlotId: string | null,
  t: number
): { slotHitAreas: { slot: SlotDef; sx: number; sy: number; r: number }[] } {
  const hull = HULLS[blueprint.hullId];
  const scale = 1.65;
  const cx = width * 0.48;
  const cy = height * 0.52;

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < width; gx += 32) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += 32) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  ctx.save();
  ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.font = '800 13px "M PLUS Rounded 1c", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('敵艦方向（前方） ▶▶', width - 16, 26);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // 艦体描画
  drawHullLocal(ctx, hull, false, t);

  // コックピット
  drawCatCockpit(
    ctx,
    hull.cockpit.x,
    hull.cockpit.y,
    hull.cockpit.radius,
    0,
    1,
    blueprint.catColor,
    'normal'
  );

  // スロット台座（パーツの絵を隠さないように、パーツの下層に描画！）
  const slotHitAreas: { slot: SlotDef; sx: number; sy: number; r: number }[] = [];

  for (const slot of hull.slots) {
    const eq = blueprint.slots[slot.id];
    const isSelected = slot.id === selectedSlotId;
    const slotColor =
      slot.category === 'weapon'
        ? '#f87171'
        : slot.category === 'thruster'
        ? '#fb923c'
        : '#38bdf8';

    // 1. 下層ソケットリング
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = isSelected ? '#facc15' : slotColor;
    ctx.lineWidth = isSelected ? 2.5 : 1.8;
    if (!eq) ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 2. 装着パーツ本体（上層にくっきり描画）
    if (eq) {
      const angle = eq.flipped ? Math.PI : 0;
      drawPartGraphic(ctx, eq.partId, slot.x, slot.y, angle, undefined, t, true, false);
    }

    // 3. 選択中スロットのみ外周ターゲットリングを表示（パーツ中心は隠さない）
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, 19 + Math.sin(t * 7) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    slotHitAreas.push({
      slot,
      sx: cx + slot.x * scale,
      sy: cy + slot.y * scale,
      r: 20 * scale,
    });
  }

  // 重心 (Center of Mass) マーカー表示
  ctx.save();
  ctx.translate(comLocal.x, comLocal.y);
  ctx.strokeStyle = '#facc15';
  ctx.fillStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(9, 0);
  ctx.moveTo(0, -9);
  ctx.lineTo(0, 9);
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#facc15';
  ctx.font = '700 12px "M PLUS Rounded 1c", sans-serif';
  ctx.fillText('⊕ 黄色マーク ＝ 現在の重心 (CoM)', 14, height - 14);
  ctx.restore();

  return { slotHitAreas };
}

/**
 * ガレージのパーツ一覧・スロット一覧用のミニサムネイル描画
 */
export function renderPartThumbnail(
  canvas: HTMLCanvasElement,
  partId: PartId,
  flipped = false
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  // パーツごとの長さに合わせて見やすい中心位置・倍率に調整
  let ox = w * 0.48;
  const oy = h * 0.5;
  let s = 1.05;

  if (partId === 'drill') {
    ox = w * 0.3;
    s = 0.95;
  } else if (partId === 'railgun') {
    ox = w * 0.38;
    s = 0.95;
  } else if (partId === 'thruster' || partId === 'booster') {
    ox = w * 0.64;
    s = 0.95;
  } else if (partId === 'retro' || partId === 'shield' || partId === 'tractor') {
    ox = w * 0.42;
  } else if (partId === 'saw') {
    ox = w * 0.34;
    s = 0.95;
  }

  if (flipped) {
    ox = w - ox;
  }

  ctx.translate(ox, oy);
  ctx.scale(s, s);
  drawPartGraphic(ctx, partId, 0, 0, flipped ? Math.PI : 0, undefined, 0.35, true, true);
  ctx.restore();
}

/**
 * ガレージの艦体一覧用のミニサムネイル描画
 */
export function renderHullThumbnail(canvas: HTMLCanvasElement, hullId: HullId): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const hull = HULLS[hullId];
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.5, h * 0.5);
  const s = hullId === 'titan' ? 0.34 : 0.46;
  ctx.scale(s, s);
  drawHullLocal(ctx, hull, false, 0);
  ctx.restore();
}
