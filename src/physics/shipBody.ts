import Matter from 'matter-js';
import { HULLS } from '../data/hulls';
import { PARTS } from '../data/parts';
import { CatMood, EquippedSlot, HullDef, PartDef, ShipBlueprint, SlotDef, Vec2 } from '../types';

export interface ActiveSlotState {
  slot: SlotDef;
  equipped: EquippedSlot;
  part: PartDef;
  cooldownTimer: number;
  chargeTimer: number;
  isCharging: boolean;
  burstTimer: number;
  burstCycleTimer: number;
  sawAngle: number;
  shieldHp: number;
  maxShieldHp: number;
  isThrusting: boolean;
  tractorTargetPoint: Vec2 | null;
}

export interface ShipInstance {
  team: 0 | 1;
  blueprint: ShipBlueprint;
  hull: HullDef;
  body: Matter.Body;
  /** デザイン座標系(+x=艦首)における重心位置 */
  comRaw: Vec2;
  maxHp: number;
  hp: number;
  activeSlots: ActiveSlotState[];
  hasRetroStabilizer: boolean;
  mood: CatMood;
  dizzyTimer: number;
  /** リパルサーや強打を受けた際、ジャイロ追尾が一時麻痺して弾き飛ばされるタイマー */
  gyroStunTimer: number;
  hitFlashTimer: number;
  /** 回避機動・旋回ストレイフ方向 (+1 or -1) */
  strafeSign: 1 | -1;
  strafeSwitchTimer: number;
  destroyed: boolean;
}

export interface BlueprintStats {
  totalHp: number;
  usedEnergy: number;
  maxEnergy: number;
  approxDps: number;
  comLocal: Vec2;
  totalMass: number;
}

export function computeBlueprintStats(blueprint: ShipBlueprint): BlueprintStats {
  const hull = HULLS[blueprint.hullId];
  let totalHp = hull.hp;
  let usedEnergy = 0;
  let approxDps = 0;

  const temp = buildMatterShipBody(blueprint, { x: 0, y: 0 }, 0, true);

  for (const slot of hull.slots) {
    const eq = blueprint.slots[slot.id];
    if (!eq) continue;
    const part = PARTS[eq.partId];
    if (!part) continue;
    usedEnergy += part.energy;
    if (part.hpBonus) totalHp += part.hpBonus;
    if (part.category === 'weapon' && part.damage && part.cooldown) {
      approxDps += part.damage / part.cooldown;
    }
  }

  return {
    totalHp,
    usedEnergy,
    maxEnergy: hull.maxEnergy,
    approxDps: Math.round(approxDps),
    comLocal: temp.comRaw,
    totalMass: Math.round(temp.body.mass * 10) / 10,
  };
}

function buildMatterShipBody(
  blueprint: ShipBlueprint,
  spawnPos: Vec2,
  initialAngle: number,
  dryRun = false
): { body: Matter.Body; comRaw: Vec2 } {
  const hull = HULLS[blueprint.hullId];
  const subParts: Matter.Body[] = [];

  if (hull.shapeType === 'circle' && hull.radius) {
    const circle = Matter.Bodies.circle(0, 0, hull.radius, {
      density: hull.density,
    });
    subParts.push(circle);
  } else if (hull.vertices) {
    const rawVerts = hull.vertices.map((v) => ({ x: v.x, y: v.y }));
    const centre = Matter.Vertices.centre(rawVerts);
    const poly = Matter.Bodies.fromVertices(centre.x, centre.y, [rawVerts], {
      density: hull.density,
    });
    subParts.push(poly);
  }

  for (const slot of hull.slots) {
    const eq = blueprint.slots[slot.id];
    if (!eq) continue;
    const part = PARTS[eq.partId];
    if (!part) continue;

    const r = 8;
    const area = Math.PI * r * r;
    const density = part.mass / area;
    const massWeight = Matter.Bodies.circle(slot.x, slot.y, r, { density });
    subParts.push(massWeight);
  }

  const compound = Matter.Body.create({
    parts: subParts,
    frictionAir: hull.frictionAir,
    friction: 0.06,
    restitution: hull.restitution,
    label: dryRun ? 'preview' : `ship_${initialAngle === 0 ? 'left' : 'right'}`,
  });

  const comRaw: Vec2 = {
    x: compound.position.x,
    y: compound.position.y,
  };

  if (!dryRun) {
    Matter.Body.setPosition(compound, spawnPos);
    if (initialAngle !== 0) {
      Matter.Body.setAngle(compound, initialAngle);
    }
  }

  return { body: compound, comRaw };
}

export function createShipInstance(
  team: 0 | 1,
  blueprint: ShipBlueprint,
  spawnPos: Vec2
): ShipInstance {
  const initialAngle = team === 0 ? 0 : Math.PI;
  const hull = HULLS[blueprint.hullId];
  const { body, comRaw } = buildMatterShipBody(blueprint, spawnPos, initialAngle, false);

  let maxHp = hull.hp;
  let hasRetroStabilizer = false;
  const activeSlots: ActiveSlotState[] = [];

  for (const slot of hull.slots) {
    const eq = blueprint.slots[slot.id];
    if (!eq) continue;
    const part = PARTS[eq.partId];
    if (!part) continue;

    if (part.hpBonus) maxHp += part.hpBonus;
    if (part.id === 'retro') hasRetroStabilizer = true;

    activeSlots.push({
      slot,
      equipped: eq,
      part,
      cooldownTimer: part.category === 'weapon' ? 0.35 + Math.random() * 0.2 : 0.6,
      chargeTimer: 0,
      isCharging: false,
      burstTimer: part.burstDuration ?? 0,
      burstCycleTimer: part.burstCooldown ?? 0,
      sawAngle: team === 0 ? 0 : Math.PI,
      shieldHp: part.shieldHp ?? 0,
      maxShieldHp: part.shieldHp ?? 0,
      isThrusting: false,
      tractorTargetPoint: null,
    });
  }

  return {
    team,
    blueprint,
    hull,
    body,
    comRaw,
    maxHp,
    hp: maxHp,
    activeSlots,
    hasRetroStabilizer,
    mood: 'normal',
    dizzyTimer: 0,
    gyroStunTimer: 0,
    hitFlashTimer: 0,
    strafeSign: team === 0 ? -1 : 1,
    strafeSwitchTimer: 2.2 + Math.random() * 1.2,
    destroyed: false,
  };
}

/**
 * 艦体ローカル座標 (lx: 艦首+ / 艦尾-, ly: 上- / 下+) をワールド座標に変換
 */
export function shipLocalToWorld(ship: ShipInstance, lx: number, ly: number): Vec2 {
  const dx = lx - ship.comRaw.x;
  const dy = ly - ship.comRaw.y;
  const cos = Math.cos(ship.body.angle);
  const sin = Math.sin(ship.body.angle);
  return {
    x: ship.body.position.x + dx * cos - dy * sin,
    y: ship.body.position.y + dx * sin + dy * cos,
  };
}

/**
 * スロットのワールド向き単位ベクトルを取得（flipped対応）
 */
export function getSlotForwardVector(ship: ShipInstance, flipped: boolean): Vec2 {
  const dirSign = flipped ? -1 : 1;
  return {
    x: Math.cos(ship.body.angle) * dirSign,
    y: Math.sin(ship.body.angle) * dirSign,
  };
}
