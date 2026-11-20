import Matter from 'matter-js';
import { sound } from '../render/audio';
import { ShipBlueprint, Vec2 } from '../types';
import {
  ActiveSlotState,
  createShipInstance,
  getSlotForwardVector,
  ShipInstance,
  shipLocalToWorld,
} from './shipBody';

export const ARENA_WIDTH = 1100;
export const ARENA_HEIGHT = 600;
export const SUDDEN_DEATH_START = 15.0;

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: 0 | 1;
  damage: number;
  knockback: number;
  color: string;
  radius: number;
  isRailgun: boolean;
  distanceTraveled: number;
  maxRange: number;
}

export interface LaserBeamEffect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class BattleArena {
  public engine: Matter.Engine;
  public ships: [ShipInstance, ShipInstance];
  public projectiles: Projectile[] = [];
  public laserBeams: LaserBeamEffect[] = [];
  public shockwaves: ShockwaveRing[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  public elapsed = 0;
  public countdown = 1.3;
  public wallInset = 34;
  public wallInsetY = 28;
  public suddenDeathActive = false;

  public screenShake = 0;
  public hitStopFrames = 0;

  public winner: 0 | 1 | 'draw' | null = null;
  public finishTimer = 0;

  private topWall: Matter.Body;
  private bottomWall: Matter.Body;
  private leftWall: Matter.Body;
  private rightWall: Matter.Body;
  private hazardCooldowns: [number, number] = [0, 0];

  constructor(playerBp: ShipBlueprint, enemyBp: ShipBlueprint) {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
    });

    const leftShip = createShipInstance(0, playerBp, { x: 260, y: ARENA_HEIGHT / 2 });
    const rightShip = createShipInstance(1, enemyBp, { x: ARENA_WIDTH - 260, y: ARENA_HEIGHT / 2 });
    this.ships = [leftShip, rightShip];

    const wallOpts: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      restitution: 0.7,
      friction: 0.01,
      label: 'arena_wall',
    };

    this.topWall = Matter.Bodies.rectangle(ARENA_WIDTH / 2, 12, ARENA_WIDTH * 2, 36, wallOpts);
    this.bottomWall = Matter.Bodies.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT - 12,
      ARENA_WIDTH * 2,
      36,
      wallOpts
    );
    this.leftWall = Matter.Bodies.rectangle(
      this.wallInset - 20,
      ARENA_HEIGHT / 2,
      40,
      ARENA_HEIGHT * 2,
      wallOpts
    );
    this.rightWall = Matter.Bodies.rectangle(
      ARENA_WIDTH - this.wallInset + 20,
      ARENA_HEIGHT / 2,
      40,
      ARENA_HEIGHT * 2,
      wallOpts
    );

    Matter.Composite.add(this.engine.world, [
      this.topWall,
      this.bottomWall,
      this.leftWall,
      this.rightWall,
      leftShip.body,
      rightShip.body,
    ]);

    Matter.Events.on(this.engine, 'collisionStart', (ev) => {
      const [s0, s1] = this.ships;
      for (const pair of ev.pairs) {
        const aIsShip = pair.bodyA.parent === s0.body || pair.bodyA.parent === s1.body;
        const bIsShip = pair.bodyB.parent === s0.body || pair.bodyB.parent === s1.body;
        if (aIsShip && bIsShip && pair.bodyA.parent !== pair.bodyB.parent) {
          const dvx = s0.body.velocity.x - s1.body.velocity.x;
          const dvy = s0.body.velocity.y - s1.body.velocity.y;
          const relSpeed = Math.hypot(dvx, dvy);
          if (relSpeed > 4.8 && this.winner === null) {
            const impactX = (s0.body.position.x + s1.body.position.x) * 0.5;
            const impactY = (s0.body.position.y + s1.body.position.y) * 0.5;
            this.spawnSparks(impactX, impactY, '#fde047', 10);
            this.screenShake = Math.max(this.screenShake, Math.min(9, relSpeed * 0.75));
            sound.playHit(relSpeed > 8.5);

            // 高速体当たり時は軽い方も相手を弾いて姿勢を崩せる！
            if (relSpeed > 7.0) {
              s0.gyroStunTimer = Math.max(s0.gyroStunTimer, 0.25);
              s1.gyroStunTimer = Math.max(s1.gyroStunTimer, 0.25);
              const ramDmg = Math.round((relSpeed - 6.0) * 2.5);
              this.applyDamage(s0, ramDmg, { x: impactX, y: impactY - 12 }, '#cbd5e1');
              this.applyDamage(s1, ramDmg, { x: impactX, y: impactY + 12 }, '#cbd5e1');
            }
          }
        }
      }
    });
  }

  public step(): void {
    const dt = 1 / 60;

    this.updateEffects(dt);

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 0.55);
    }

    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - dt);
      return;
    }

    if (this.hitStopFrames > 0) {
      this.hitStopFrames--;
      return;
    }

    if (this.winner !== null) {
      this.finishTimer += dt;
      Matter.Engine.update(this.engine, (1000 / 60) * 0.35);
      return;
    }

    this.elapsed += dt;

    // 15秒経過でサドンデス発動：四方からデスレーザー壁が収縮し100%決着をつける！
    if (this.elapsed >= SUDDEN_DEATH_START) {
      this.suddenDeathActive = true;
      this.wallInset = Math.min(430, this.wallInset + 64 * dt);
      this.wallInsetY = Math.min(210, this.wallInsetY + 32 * dt);
      Matter.Body.setPosition(this.leftWall, {
        x: this.wallInset - 20,
        y: ARENA_HEIGHT / 2,
      });
      Matter.Body.setPosition(this.rightWall, {
        x: ARENA_WIDTH - this.wallInset + 20,
        y: ARENA_HEIGHT / 2,
      });
      Matter.Body.setPosition(this.topWall, {
        x: ARENA_WIDTH / 2,
        y: this.wallInsetY - 18,
      });
      Matter.Body.setPosition(this.bottomWall, {
        x: ARENA_WIDTH / 2,
        y: ARENA_HEIGHT - this.wallInsetY + 18,
      });
    }

    for (let i = 0; i < 2; i++) {
      const ship = this.ships[i];
      const enemy = this.ships[1 - i];
      if (ship.destroyed) continue;

      this.updateShipGyroAndNavigation(ship, enemy, dt);
      this.updateShipParts(ship, enemy, dt);
      this.checkArenaBoundaries(ship, i as 0 | 1, dt);
      this.updateCatMood(ship, dt);
    }

    this.updateProjectiles();
    Matter.Engine.update(this.engine, 1000 / 60);
    this.checkWinCondition();
  }

  /**
   * 360度自動回頭ジャイロ ＆ 回避ストレイフ方向制御
   * - 艦体ごとの旋回速度上限(turnSpeed)で敵艦の方向へ自動で向き直るため、すれ違い後に壁を撃ち続ける膠着が起きない。
   * - 同時に、高速艦が重戦艦の周囲を回る「旋回回避」や、リパルサー・レールガンで「弾いて照準を逸らす」駆け引きが成立する！
   */
  private updateShipGyroAndNavigation(ship: ShipInstance, enemy: ShipInstance, dt: number): void {
    const body = ship.body;

    if (ship.gyroStunTimer > 0) {
      ship.gyroStunTimer = Math.max(0, ship.gyroStunTimer - dt);
    }
    if (ship.hitFlashTimer > 0) {
      ship.hitFlashTimer = Math.max(0, ship.hitFlashTimer - dt);
    }
    if (ship.dizzyTimer > 0) {
      ship.dizzyTimer = Math.max(0, ship.dizzyTimer - dt);
    }

    // ストレイフ（横移動回避）方向の定期切り替え＆壁際での反転
    ship.strafeSwitchTimer -= dt;
    if (ship.strafeSwitchTimer <= 0) {
      ship.strafeSign = ship.strafeSign === 1 ? -1 : 1;
      ship.strafeSwitchTimer = 2.0 + Math.random() * 1.4;
    }

    const dx = enemy.body.position.x - body.position.x;
    const dy = enemy.body.position.y - body.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    const perpX = (-dy / dist) * ship.strafeSign;
    const perpY = (dx / dist) * ship.strafeSign;
    const testX = body.position.x + perpX * 85;
    const testY = body.position.y + perpY * 85;
    if (
      testX < this.wallInset + 70 ||
      testX > ARENA_WIDTH - this.wallInset - 70 ||
      testY < 75 ||
      testY > ARENA_HEIGHT - 75
    ) {
      ship.strafeSign = ship.strafeSign === 1 ? -1 : 1;
      ship.strafeSwitchTimer = 1.6;
    }

    // 1. UFOソーサー（ジャイロ0）は常時軽快にスピンし続ける
    if (ship.hull.gyroStrength <= 0) {
      const spinDir = ship.team === 0 ? 1 : -1;
      let omega = body.angularVelocity * ship.hull.angularDamping;
      if (Math.abs(omega) < 0.095) {
        omega += spinDir * 0.006;
      }
      omega = Math.max(-0.24, Math.min(0.24, omega));
      Matter.Body.setAngularVelocity(body, omega);
    } else if (!enemy.destroyed) {
      // 2. 通常艦：敵艦の方向へ360度スムーズ回頭（ただし強打によるジャイロ麻痺中はスピンする！）
      const hasForwardWeapon = ship.activeSlots.some(
        (s) => s.part.category === 'weapon' && (!s.equipped.flipped || s.part.id === 'saw')
      );
      const hasFlippedWeapon = ship.activeSlots.some(
        (s) => s.part.category === 'weapon' && s.equipped.flipped
      );

      let targetAngle = Math.atan2(dy, dx);
      if (!hasForwardWeapon && hasFlippedWeapon) {
        // 背面武器のみ積んでいる場合は背中を敵に向ける
        targetAngle += Math.PI;
      }

      const angleDiff = Math.atan2(
        Math.sin(targetAngle - body.angle),
        Math.cos(targetAngle - body.angle)
      );

      let maxTurn = ship.hull.turnSpeed * (ship.hasRetroStabilizer ? 1.35 : 1.0);

      // レーザー発射直前(残り0.35秒)は照準がロックされ、素早い横ダッシュで回避できる隙が生まれる！
      const laserLocking = ship.activeSlots.some(
        (s) =>
          s.part.id === 'laser' &&
          s.isCharging &&
          s.chargeTimer > (s.part.chargeTime ?? 2.2) - 0.35
      );
      if (laserLocking) {
        maxTurn *= 0.16;
      }

      const desiredOmega = Math.max(-maxTurn, Math.min(maxTurn, angleDiff * 0.18));
      const stunFactor = ship.gyroStunTimer > 0 ? 0.03 : 1.0;
      const blend = 0.22 * ship.hull.gyroStrength * stunFactor;

      let nextOmega =
        body.angularVelocity * (ship.gyroStunTimer > 0 ? 0.96 : ship.hull.angularDamping);
      nextOmega = nextOmega + (desiredOmega - nextOmega) * blend;
      nextOmega = Math.max(-0.25, Math.min(0.25, nextOmega));
      Matter.Body.setAngularVelocity(body, nextOmega);
    }

    // 3. 外周壁際の緩やかな磁気クッション（壁への引っかかり防止・ノーダメージ）
    const marginY = 82;
    if (body.position.y < marginY) {
      const r = (marginY - body.position.y) / marginY;
      Matter.Body.applyForce(body, body.position, { x: 0, y: 0.005 * r * (body.mass / 10) });
    } else if (body.position.y > ARENA_HEIGHT - marginY) {
      const r = (body.position.y - (ARENA_HEIGHT - marginY)) / marginY;
      Matter.Body.applyForce(body, body.position, { x: 0, y: -0.005 * r * (body.mass / 10) });
    }

    const leftMargin = this.wallInset + 65;
    const rightMargin = ARENA_WIDTH - this.wallInset - 65;
    if (!this.suddenDeathActive) {
      if (body.position.x < leftMargin) {
        const r = (leftMargin - body.position.x) / 65;
        Matter.Body.applyForce(body, body.position, { x: 0.0045 * r * (body.mass / 10), y: 0 });
      } else if (body.position.x > rightMargin) {
        const r = (body.position.x - rightMargin) / 65;
        Matter.Body.applyForce(body, body.position, { x: -0.0045 * r * (body.mass / 10), y: 0 });
      }
    }

    // 速度クランプ
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    const maxSpeed = 16;
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      Matter.Body.setVelocity(body, {
        x: body.velocity.x * scale,
        y: body.velocity.y * scale,
      });
    }

    // 境界安全クランプ
    const clampedX = Math.max(
      this.wallInset + 24,
      Math.min(ARENA_WIDTH - this.wallInset - 24, body.position.x)
    );
    const clampedY = Math.max(
      this.wallInsetY + 20,
      Math.min(ARENA_HEIGHT - this.wallInsetY - 20, body.position.y)
    );
    if (clampedX !== body.position.x || clampedY !== body.position.y) {
      Matter.Body.setPosition(body, { x: clampedX, y: clampedY });
    }
  }

  private updateShipParts(ship: ShipInstance, enemy: ShipInstance, dt: number): void {
    for (const st of ship.activeSlots) {
      st.isThrusting = false;
      st.tractorTargetPoint = null;

      const worldPos = shipLocalToWorld(ship, st.slot.x, st.slot.y);
      const dir = getSlotForwardVector(ship, st.equipped.flipped);

      if (st.part.category === 'thruster') {
        this.handleThruster(ship, enemy, st, worldPos, dir, dt);
      } else if (st.part.category === 'weapon') {
        this.handleWeapon(ship, enemy, st, worldPos, dir, dt);
      } else if (st.part.category === 'gadget') {
        this.handleGadget(ship, enemy, st, worldPos, dir, dt);
      }
    }
  }

  private handleThruster(
    ship: ShipInstance,
    enemy: ShipInstance,
    st: ActiveSlotState,
    worldPos: Vec2,
    dir: Vec2,
    dt: number
  ): void {
    const thrust = st.part.thrust ?? 0;

    const toEnemyX = enemy.body.position.x - ship.body.position.x;
    const toEnemyY = enemy.body.position.y - ship.body.position.y;
    const dist = Math.hypot(toEnemyX, toEnemyY) || 1;
    const enX = toEnemyX / dist;
    const enY = toEnemyY / dist;
    const perpX = -enY * ship.strafeSign;
    const perpY = enX * ship.strafeSign;

    const hasMelee = ship.activeSlots.some(
      (s) => s.part.id === 'drill' || s.part.id === 'saw'
    );

    const applyEngineForce = (power: number, isBurst: boolean) => {
      // 1. UFOソーサー：回転しながら敵へグイグイ迫る
      if (ship.hull.id === 'saucer' && !st.equipped.flipped && power > 0) {
        Matter.Body.applyForce(ship.body, worldPos, {
          x: dir.x * power * 0.28 + enX * power * 0.88 + perpX * power * 0.25,
          y: dir.y * power * 0.28 + enY * power * 0.88 + perpY * power * 0.25,
        });
        return;
      }

      // 2. バーストブースター：敵の射線を大きく横へかわしながら回り込む高速ドッグファイト機動！
      if (isBurst && !st.equipped.flipped && power > 0) {
        if (hasMelee) {
          // 中距離ではカーブで弾を避け、270px以内に入ったら敵艦の芯へ真っ直ぐ突き刺さる！
          const flank = dist > 270 ? 0.32 : 0;
          Matter.Body.applyForce(ship.body, worldPos, {
            x: (dir.x * 0.95 + perpX * flank) * power,
            y: (dir.y * 0.95 + perpY * flank) * power,
          });
        } else {
          // 射撃艦のブースターは弾避け＆裏回りオービットダッシュ！
          const forwardMix = dist > 300 ? 0.65 : 0.22;
          const dodgeMix = 0.85;
          Matter.Body.applyForce(ship.body, worldPos, {
            x: (dir.x * forwardMix + perpX * dodgeMix) * power,
            y: (dir.y * forwardMix + perpY * dodgeMix) * power,
          });
        }
        return;
      }

      // 3. スタビライズ逆噴射（引き撃ち＋壁沿い周回カイト機動）
      if (power < 0 && !st.equipped.flipped) {
        const nearWall =
          ship.body.position.x < this.wallInset + 135 ||
          ship.body.position.x > ARENA_WIDTH - this.wallInset - 135 ||
          ship.body.position.y < 120 ||
          ship.body.position.y > ARENA_HEIGHT - 120;
        const backMix = nearWall ? 0.35 : 0.9;
        const slideMix = nearWall ? 0.95 : 0.4;
        const absP = Math.abs(power);
        Matter.Body.applyForce(ship.body, worldPos, {
          x: (-enX * backMix + perpX * slideMix) * absP,
          y: (-enY * backMix + perpY * slideMix) * absP,
        });
        return;
      }

      // 4. 通常メインスラスター（前進＆旋回用。後退引き撃ちは「逆噴射」パーツ専用の戦術！）
      if (!st.equipped.flipped && power > 0 && !hasMelee) {
        let fwd = 0.92;
        let strafe = 0.28;
        if (dist < 170) {
          fwd = 0.15;
          strafe = 0.55;
        } else if (dist < 260) {
          fwd = 0.45;
          strafe = 0.45;
        }
        Matter.Body.applyForce(ship.body, worldPos, {
          x: (dir.x * fwd + perpX * strafe) * power,
          y: (dir.y * fwd + perpY * strafe) * power,
        });
        return;
      }

      // 近接突撃艦または反転スラスター：フルパワー推進
      Matter.Body.applyForce(ship.body, worldPos, {
        x: dir.x * power,
        y: dir.y * power,
      });
    };

    if (st.part.burstDuration && st.part.burstDuration > 0) {
      if (st.burstTimer > 0) {
        st.burstTimer -= dt;
        st.isThrusting = true;
        applyEngineForce(thrust, true);
        if (Math.random() < 0.85) {
          this.spawnExhaust(worldPos, dir, thrust >= 0 ? -1 : 1, '#f472b6', 5.2);
        }
      } else {
        st.burstCycleTimer -= dt;
        // クールダウン中も巡航用の基本推力(28%)を維持し、停止してカモになるのを防ぐ
        applyEngineForce(thrust * 0.28, false);
        if (st.burstCycleTimer <= 0) {
          st.burstTimer = st.part.burstDuration;
          st.burstCycleTimer = (st.part.burstCooldown ?? 2.7) - st.part.burstDuration;
          sound.playBooster();
        }
      }
    } else {
      st.isThrusting = true;
      applyEngineForce(thrust, false);
      if (Math.random() < 0.55) {
        const exhaustSign = thrust >= 0 ? -1 : 1;
        const pColor = st.part.id === 'retro' ? '#5eead4' : '#fb923c';
        this.spawnExhaust(worldPos, dir, exhaustSign, pColor, 3.2);
      }
    }
  }

  private handleWeapon(
    ship: ShipInstance,
    enemy: ShipInstance,
    st: ActiveSlotState,
    worldPos: Vec2,
    dir: Vec2,
    dt: number
  ): void {
    const part = st.part;

    // 1. オービタル・ソー
    if (part.id === 'saw') {
      const spinDir = ship.team === 0 ? 1 : -1;
      st.sawAngle += 0.2 * spinDir;
      st.cooldownTimer = Math.max(0, st.cooldownTimer - dt);
      const radius = part.range ?? 64;
      const bladeX = worldPos.x + Math.cos(st.sawAngle) * radius;
      const bladeY = worldPos.y + Math.sin(st.sawAngle) * radius;

      if (st.cooldownTimer <= 0 && !enemy.destroyed) {
        if (this.pointHitsShipCircle(enemy, bladeX, bladeY, 16)) {
          st.cooldownTimer = part.cooldown ?? 0.22;
          const tangX = -Math.sin(st.sawAngle) * spinDir;
          const tangY = Math.cos(st.sawAngle) * spinDir;
          const kb = part.knockback ?? 0.045;
          Matter.Body.applyForce(enemy.body, { x: bladeX, y: bladeY }, {
            x: tangX * kb,
            y: tangY * kb,
          });
          this.applyDamage(enemy, part.damage ?? 18, { x: bladeX, y: bladeY }, '#fde047');
          this.spawnSparks(bladeX, bladeY, '#fde047', 8);
          sound.playHit(false);
        }
      }
      return;
    }

    // 2. プラズマドリル
    if (part.id === 'drill') {
      st.cooldownTimer = Math.max(0, st.cooldownTimer - dt);
      if (st.cooldownTimer <= 0 && !enemy.destroyed) {
        const maxDist = part.range ?? 54;
        for (const dist of [22, 38, maxDist]) {
          const tipX = worldPos.x + dir.x * dist;
          const tipY = worldPos.y + dir.y * dist;
          if (this.pointHitsShipCircle(enemy, tipX, tipY, 10)) {
            st.cooldownTimer = part.cooldown ?? 0.12;
            const kb = part.knockback ?? 0.012;
            Matter.Body.applyForce(enemy.body, { x: tipX, y: tipY }, {
              x: dir.x * kb,
              y: dir.y * kb,
            });
            this.applyDamage(enemy, part.damage ?? 9, { x: tipX, y: tipY }, '#fb923c');
            this.spawnSparks(tipX, tipY, '#fb923c', 5);
            sound.playHit(false);
            break;
          }
        }
      }
      return;
    }

    // 3. フェーズレーザー
    if (part.id === 'laser') {
      if (st.isCharging) {
        st.chargeTimer += dt;
        if (st.chargeTimer >= (part.chargeTime ?? 2.2)) {
          st.isCharging = false;
          st.chargeTimer = 0;
          st.cooldownTimer = 0.85;
          this.fireLaserBeam(ship, enemy, st, worldPos, dir);
        }
      } else {
        st.cooldownTimer -= dt;
        if (st.cooldownTimer <= 0) {
          st.isCharging = true;
          st.chargeTimer = 0;
        }
      }
      return;
    }

    // 4. 実弾射撃（ロケット砲・レールキャノン）
    st.cooldownTimer -= dt;
    if (st.cooldownTimer <= 0) {
      // UFOソーサーに前向き射撃武器を積んだ場合、回転中に銃口が敵の方を向いた瞬間に発射する！
      if (ship.hull.id === 'saucer' && !st.equipped.flipped && !enemy.destroyed) {
        const toEx = enemy.body.position.x - worldPos.x;
        const toEy = enemy.body.position.y - worldPos.y;
        const d = Math.hypot(toEx, toEy) || 1;
        const alignDot = (toEx / d) * dir.x + (toEy / d) * dir.y;
        if (alignDot < 0.86 && st.cooldownTimer > -0.75) {
          return;
        }
      }

      st.cooldownTimer = part.cooldown ?? 1.0;
      const muzzleX = worldPos.x + dir.x * 12;
      const muzzleY = worldPos.y + dir.y * 12;
      const speed = part.projectileSpeed ?? 10;
      const isRail = part.id === 'railgun';

      this.projectiles.push({
        x: muzzleX,
        y: muzzleY,
        vx: dir.x * speed + ship.body.velocity.x * 0.18,
        vy: dir.y * speed + ship.body.velocity.y * 0.18,
        team: ship.team,
        damage: part.damage ?? 30,
        knockback: part.knockback ?? 0.06,
        color: part.color,
        radius: isRail ? 6 : 7.5,
        isRailgun: isRail,
        distanceTraveled: 0,
        maxRange: part.range ?? 950,
      });

      const recoil = part.recoil ?? 0.03;
      Matter.Body.applyForce(ship.body, worldPos, {
        x: -dir.x * recoil,
        y: -dir.y * recoil,
      });

      this.spawnSparks(muzzleX, muzzleY, part.color, isRail ? 10 : 5);
      if (isRail) {
        this.screenShake = Math.max(this.screenShake, 5);
        sound.playRailgun();
      } else {
        sound.playRocket();
      }
    }
  }

  private fireLaserBeam(
    ship: ShipInstance,
    enemy: ShipInstance,
    st: ActiveSlotState,
    worldPos: Vec2,
    dir: Vec2
  ): void {
    const part = st.part;
    const muzzleX = worldPos.x + dir.x * 10;
    const muzzleY = worldPos.y + dir.y * 10;
    const maxRange = part.range ?? 1050;
    let endX = muzzleX + dir.x * maxRange;
    let endY = muzzleY + dir.y * maxRange;

    const recoil = part.recoil ?? 0.06;
    Matter.Body.applyForce(ship.body, worldPos, {
      x: -dir.x * recoil,
      y: -dir.y * recoil,
    });

    let remainingDamage = part.damage ?? 115;

    for (let d = 10; d <= maxRange; d += 12) {
      const px = muzzleX + dir.x * d;
      const py = muzzleY + dir.y * d;

      if (
        px < this.wallInset ||
        px > ARENA_WIDTH - this.wallInset ||
        py < 28 ||
        py > ARENA_HEIGHT - 28
      ) {
        endX = px;
        endY = py;
        this.spawnSparks(px, py, '#f43f5e', 8);
        break;
      }

      const hitShield = this.checkShieldIntercept(enemy, px, py, dir);
      if (hitShield) {
        const absorbed = Math.min(hitShield.shieldHp, remainingDamage);
        hitShield.shieldHp -= absorbed;
        remainingDamage -= absorbed;
        this.spawnSparks(px, py, '#22d3ee', 14);
        this.addFloatingText(
          px,
          py - 14,
          hitShield.shieldHp <= 0 ? 'SHIELD BREAK!' : `SHIELD -${absorbed}`,
          '#22d3ee',
          15
        );
        sound.playShieldBlock();
        if (remainingDamage <= 0) {
          endX = px;
          endY = py;
          break;
        }
      }

      if (!enemy.destroyed && Matter.Query.point([enemy.body], { x: px, y: py }).length > 0) {
        endX = px;
        endY = py;
        const kb = part.knockback ?? 0.09;
        Matter.Body.applyForce(enemy.body, { x: px, y: py }, {
          x: dir.x * kb,
          y: dir.y * kb,
        });
        this.applyDamage(enemy, remainingDamage, { x: px, y: py }, '#fb7185', true);
        enemy.dizzyTimer = Math.max(enemy.dizzyTimer, 0.9);
        enemy.gyroStunTimer = Math.max(enemy.gyroStunTimer, 0.35);
        this.spawnSparks(px, py, '#fda4af', 18);
        this.hitStopFrames = 4;
        break;
      }
    }

    this.laserBeams.push({
      x1: muzzleX,
      y1: muzzleY,
      x2: endX,
      y2: endY,
      color: '#f43f5e',
      life: 0.36,
      maxLife: 0.36,
    });
    this.screenShake = Math.max(this.screenShake, 8);
    sound.playLaserFire();
  }

  private handleGadget(
    ship: ShipInstance,
    enemy: ShipInstance,
    st: ActiveSlotState,
    worldPos: Vec2,
    dir: Vec2,
    dt: number
  ): void {
    if (enemy.destroyed) return;

    // 1. リパルサー衝撃波：接近した敵艦や飛来する敵弾をボヨン！と弾き飛ばし、敵の照準も狂わせる！
    if (st.part.id === 'repulsor') {
      st.cooldownTimer = Math.max(0, st.cooldownTimer - dt);
      const range = st.part.range ?? 160;
      const dx = enemy.body.position.x - worldPos.x;
      const dy = enemy.body.position.y - worldPos.y;
      const dist = Math.hypot(dx, dy);

      // 範囲内に敵艦または敵の弾が迫ったら発動！
      const incomingBullet = this.projectiles.some(
        (p) => p.team !== ship.team && Math.hypot(p.x - worldPos.x, p.y - worldPos.y) < range * 0.78
      );

      if (st.cooldownTimer <= 0 && (dist < range || incomingBullet)) {
        st.cooldownTimer = st.part.cooldown ?? 2.3;

        // 敵弾を弾き消す（パリィ効果！）
        let deflectedCount = 0;
        this.projectiles = this.projectiles.filter((p) => {
          if (p.team !== ship.team && Math.hypot(p.x - worldPos.x, p.y - worldPos.y) < range) {
            this.spawnSparks(p.x, p.y, '#c084fc', 7);
            deflectedCount++;
            return false;
          }
          return true;
        });
        if (deflectedCount > 0) {
          this.addFloatingText(worldPos.x, worldPos.y - 24, 'PARRY!', '#e9d5ff', 14);
        }

        // 敵艦が範囲内なら吹き飛ばし＋強制スピンで照準麻痺！
        if (dist < range) {
          const nx = dist > 1 ? dx / dist : 1;
          const ny = dist > 1 ? dy / dist : 0;
          const force = st.part.pulseForce ?? 0.3;

          Matter.Body.applyForce(enemy.body, enemy.body.position, {
            x: nx * force,
            y: ny * force,
          });
          const spinSign = Math.random() < 0.5 ? 1 : -1;
          Matter.Body.setAngularVelocity(
            enemy.body,
            enemy.body.angularVelocity + spinSign * 0.17
          );
          enemy.gyroStunTimer = Math.max(enemy.gyroStunTimer, 0.65);
          enemy.dizzyTimer = Math.max(enemy.dizzyTimer, 0.9);
          this.applyDamage(enemy, st.part.damage ?? 14, enemy.body.position, '#c084fc');
        }

        this.shockwaves.push({
          x: worldPos.x,
          y: worldPos.y,
          maxRadius: range,
          color: '#a855f7',
          life: 0.32,
          maxLife: 0.32,
        });
        sound.playRepulsor();
      }
      return;
    }

    // 2. トラクタービーム
    if (st.part.id === 'tractor') {
      const range = st.part.range ?? 390;
      const dx = enemy.body.position.x - worldPos.x;
      const dy = enemy.body.position.y - worldPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 30 && dist < range) {
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = nx * dir.x + ny * dir.y;
        if (dot > 0.15) {
          st.tractorTargetPoint = { x: enemy.body.position.x, y: enemy.body.position.y };
          const pull = st.part.pulseForce ?? 0.0085;
          Matter.Body.applyForce(enemy.body, enemy.body.position, {
            x: -nx * pull,
            y: -ny * pull,
          });
          Matter.Body.applyForce(ship.body, worldPos, {
            x: nx * pull * 0.35,
            y: ny * pull * 0.35,
          });
        }
      }
    }
  }

  private updateProjectiles(): void {
    const alive: Projectile[] = [];

    for (const p of this.projectiles) {
      const enemy = this.ships[1 - p.team];
      let removed = false;
      const subSteps = 3;

      for (let s = 0; s < subSteps; s++) {
        p.x += p.vx / subSteps;
        p.y += p.vy / subSteps;
        const stepDist = Math.hypot(p.vx, p.vy) / subSteps;
        p.distanceTraveled += stepDist;

        if (
          p.x < this.wallInset ||
          p.x > ARENA_WIDTH - this.wallInset ||
          p.y < 28 ||
          p.y > ARENA_HEIGHT - 28 ||
          p.distanceTraveled > p.maxRange
        ) {
          this.spawnSparks(p.x, p.y, p.color, 4);
          removed = true;
          break;
        }

        const speed = Math.hypot(p.vx, p.vy) || 1;
        const dir = { x: p.vx / speed, y: p.vy / speed };

        const hitShield = this.checkShieldIntercept(enemy, p.x, p.y, dir);
        if (hitShield) {
          hitShield.shieldHp = Math.max(0, hitShield.shieldHp - p.damage);
          this.spawnSparks(p.x, p.y, '#22d3ee', 10);
          this.addFloatingText(
            p.x,
            p.y - 12,
            hitShield.shieldHp <= 0 ? 'SHIELD BREAK!' : 'BLOCK!',
            '#22d3ee',
            13
          );
          sound.playShieldBlock();
          removed = true;
          break;
        }

        if (!enemy.destroyed && this.pointHitsShipCircle(enemy, p.x, p.y, p.radius)) {
          Matter.Body.applyForce(enemy.body, { x: p.x, y: p.y }, {
            x: dir.x * p.knockback,
            y: dir.y * p.knockback,
          });
          this.applyDamage(enemy, p.damage, { x: p.x, y: p.y }, p.color, p.isRailgun);
          if (p.isRailgun) {
            // レールガン直撃時は大きなノックバックと姿勢崩しが発生！
            enemy.gyroStunTimer = Math.max(enemy.gyroStunTimer, 0.42);
            enemy.dizzyTimer = Math.max(enemy.dizzyTimer, 0.75);
            this.hitStopFrames = 3;
            this.screenShake = Math.max(this.screenShake, 6);
          }
          this.spawnSparks(p.x, p.y, p.color, p.isRailgun ? 14 : 8);
          sound.playHit(p.isRailgun);
          removed = true;
          break;
        }
      }

      if (!removed) {
        if (Math.random() < 0.5) {
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: -p.vx * 0.12 + (Math.random() - 0.5),
            vy: -p.vy * 0.12 + (Math.random() - 0.5),
            size: p.isRailgun ? 3.5 : 4,
            color: p.isRailgun ? '#7dd3fc' : '#fca5a5',
            life: 0.16,
            maxLife: 0.16,
          });
        }
        alive.push(p);
      }
    }

    this.projectiles = alive;
  }

  private checkShieldIntercept(
    targetShip: ShipInstance,
    px: number,
    py: number,
    incomingDir: Vec2
  ): ActiveSlotState | null {
    if (targetShip.destroyed) return null;
    for (const st of targetShip.activeSlots) {
      if (st.part.id === 'shield' && st.shieldHp > 0) {
        const shieldOrigin = shipLocalToWorld(targetShip, st.slot.x * 0.35, st.slot.y * 0.35);
        const shieldDir = getSlotForwardVector(targetShip, st.equipped.flipped);
        const dx = px - shieldOrigin.x;
        const dy = py - shieldOrigin.y;
        const dist = Math.hypot(dx, dy);

        if (dist >= 36 && dist <= 78) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          const posDot = nx * shieldDir.x + ny * shieldDir.y;
          const velDot = incomingDir.x * shieldDir.x + incomingDir.y * shieldDir.y;
          if (posDot > 0.32 && velDot < -0.1) {
            return st;
          }
        }
      }
    }
    return null;
  }

  private pointHitsShipCircle(ship: ShipInstance, x: number, y: number, radius: number): boolean {
    const offsets = [
      { x: 0, y: 0 },
      { x: radius, y: 0 },
      { x: -radius, y: 0 },
      { x: 0, y: radius },
      { x: 0, y: -radius },
    ];
    for (const off of offsets) {
      if (Matter.Query.point([ship.body], { x: x + off.x, y: y + off.y }).length > 0) {
        return true;
      }
    }
    return false;
  }

  private checkArenaBoundaries(ship: ShipInstance, idx: 0 | 1, dt: number): void {
    this.hazardCooldowns[idx] = Math.max(0, this.hazardCooldowns[idx] - dt);
    if (!this.suddenDeathActive || this.hazardCooldowns[idx] > 0) return;

    const pos = ship.body.position;
    const bounds = ship.body.bounds;
    const leftLimit = this.wallInset + 10;
    const rightLimit = ARENA_WIDTH - this.wallInset - 10;
    const topLimit = this.wallInsetY + 10;
    const bottomLimit = ARENA_HEIGHT - this.wallInsetY - 10;

    if (
      bounds.min.x <= leftLimit ||
      bounds.max.x >= rightLimit ||
      bounds.min.y <= topLimit ||
      bounds.max.y >= bottomLimit
    ) {
      this.hazardCooldowns[idx] = 0.22;
      const toCenterX = ARENA_WIDTH / 2 - pos.x;
      const toCenterY = ARENA_HEIGHT / 2 - pos.y;
      const cDist = Math.hypot(toCenterX, toCenterY) || 1;
      Matter.Body.applyForce(ship.body, pos, {
        x: (toCenterX / cDist) * 0.16,
        y: (toCenterY / cDist) * 0.16,
      });
      this.applyDamage(ship, 28, { x: pos.x, y: pos.y }, '#f43f5e', true);
      ship.dizzyTimer = Math.max(ship.dizzyTimer, 0.5);
      this.spawnSparks(pos.x, pos.y, '#f43f5e', 12);
      this.screenShake = Math.max(this.screenShake, 5);
      sound.playHit(true);
    }
  }

  private applyDamage(
    ship: ShipInstance,
    amount: number,
    pos: Vec2,
    color: string,
    big = false
  ): void {
    if (ship.destroyed || this.winner !== null) return;
    const dmg = Math.max(1, Math.round(amount));
    ship.hp = Math.max(0, ship.hp - dmg);
    ship.hitFlashTimer = 0.12;

    this.addFloatingText(
      pos.x + (Math.random() - 0.5) * 16,
      pos.y - 10,
      `-${dmg}`,
      color,
      big ? 22 : 16
    );

    if (ship.hp <= 0) {
      ship.destroyed = true;
      ship.mood = 'ko';
      this.spawnShipExplosion(ship);
    }
  }

  private spawnShipExplosion(ship: ShipInstance): void {
    const { x, y } = ship.body.position;
    this.screenShake = 18;
    this.hitStopFrames = 6;
    sound.playExplosion();

    this.shockwaves.push({
      x,
      y,
      maxRadius: 190,
      color: '#fbbf24',
      life: 0.55,
      maxLife: 0.55,
    });

    const colors = ['#ef4444', '#f97316', '#facc15', '#ffffff', ship.hull.color];
    for (let i = 0; i < 55; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 9.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.5 + Math.random() * 0.6,
        maxLife: 1.0,
      });
    }
  }

  private checkWinCondition(): void {
    const [p, e] = this.ships;
    if (p.destroyed && e.destroyed) {
      this.winner = 'draw';
    } else if (e.destroyed) {
      this.winner = 0;
      p.mood = 'happy';
      sound.playWinFanfare();
    } else if (p.destroyed) {
      this.winner = 1;
      e.mood = 'happy';
    }
  }

  private updateCatMood(ship: ShipInstance, _dt: number): void {
    if (ship.destroyed) {
      ship.mood = 'ko';
      return;
    }
    if (this.winner === ship.team) {
      ship.mood = 'happy';
      return;
    }
    if (ship.dizzyTimer > 0 || ship.gyroStunTimer > 0.1) {
      ship.mood = 'dizzy';
      return;
    }
    if (ship.activeSlots.some((s) => s.isCharging)) {
      ship.mood = 'charge';
      return;
    }
    ship.mood = 'normal';
  }

  private updateEffects(dt: number): void {
    this.particles = this.particles.filter((pt) => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vx *= 0.95;
      pt.vy *= 0.95;
      pt.life -= dt;
      return pt.life > 0;
    });

    this.laserBeams = this.laserBeams.filter((b) => {
      b.life -= dt;
      return b.life > 0;
    });

    this.shockwaves = this.shockwaves.filter((sw) => {
      sw.life -= dt;
      return sw.life > 0;
    });

    this.floatingTexts = this.floatingTexts.filter((ft) => {
      ft.y += ft.vy;
      ft.life -= dt;
      return ft.life > 0;
    });
  }

  private spawnSparks(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 5.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 2.5 + Math.random() * 3.5,
        color,
        life: 0.22 + Math.random() * 0.2,
        maxLife: 0.42,
      });
    }
  }

  private spawnExhaust(
    worldPos: Vec2,
    dir: Vec2,
    exhaustSign: 1 | -1,
    color: string,
    speed: number
  ): void {
    const spread = (Math.random() - 0.5) * 0.45;
    const baseAngle = Math.atan2(dir.y * exhaustSign, dir.x * exhaustSign) + spread;
    this.particles.push({
      x: worldPos.x + dir.x * exhaustSign * 12,
      y: worldPos.y + dir.y * exhaustSign * 12,
      vx: Math.cos(baseAngle) * speed,
      vy: Math.sin(baseAngle) * speed,
      size: 4 + Math.random() * 4,
      color,
      life: 0.18 + Math.random() * 0.1,
      maxLife: 0.28,
    });
  }

  private addFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    size = 16
  ): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -1.1,
      text,
      color,
      size,
      life: 0.65,
      maxLife: 0.65,
    });
  }
}
