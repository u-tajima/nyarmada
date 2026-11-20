export type SlotCategory = 'weapon' | 'thruster' | 'gadget';

export type HullId = 'sneaky' | 'cruiser' | 'titan' | 'saucer';

export type PartId =
  | 'rocket'
  | 'railgun'
  | 'laser'
  | 'drill'
  | 'saw'
  | 'thruster'
  | 'booster'
  | 'retro'
  | 'repulsor'
  | 'tractor'
  | 'shield';

export interface Vec2 {
  x: number;
  y: number;
}

export interface SlotDef {
  id: string;
  category: SlotCategory;
  x: number;
  y: number;
  label: string;
}

export interface HullDef {
  id: HullId;
  name: string;
  subtitle: string;
  description: string;
  hp: number;
  maxEnergy: number;
  density: number;
  frictionAir: number;
  restitution: number;
  /** 敵方向へ回頭するジャイロ追従強度（0なら自由スピン） */
  gyroStrength: number;
  /** 角速度の毎フレーム減衰率（1に近いほど回転が止まらない） */
  angularDamping: number;
  /** ジャイロの最大旋回角速度（rad/frame） */
  turnSpeed: number;
  color: string;
  accentColor: string;
  cockpit: { x: number; y: number; radius: number };
  shapeType: 'polygon' | 'circle';
  /** 時計回りの凸多角形頂点（+xが艦首方向） */
  vertices?: Vec2[];
  radius?: number;
  slots: SlotDef[];
  unlockedByDefault?: boolean;
}

export interface PartDef {
  id: PartId;
  name: string;
  category: SlotCategory;
  energy: number;
  /** 装着スロットに加算される質量（重心が変化する） */
  mass: number;
  hpBonus?: number;
  description: string;
  canFlip: boolean;
  color: string;
  unlockedByDefault?: boolean;

  // 武装パラメータ
  damage?: number;
  /** 発射・発動間隔（秒） */
  cooldown?: number;
  /** チャージ時間（秒、レーザー等） */
  chargeTime?: number;
  /** 弾速（px/frame） */
  projectileSpeed?: number;
  /** 発射時の自艦への反動インパルス */
  recoil?: number;
  /** 命中時の敵艦へのノックバックインパルス */
  knockback?: number;
  /** 射程距離（px） */
  range?: number;

  // 推進パラメータ
  /** 毎フレーム推力 */
  thrust?: number;
  /** バースト持続時間（秒、0なら常時） */
  burstDuration?: number;
  /** バースト再チャージ時間（秒） */
  burstCooldown?: number;

  // ガジェットパラメータ
  shieldHp?: number;
  shieldRegenDelay?: number;
  pulseForce?: number;
}

export interface EquippedSlot {
  partId: PartId;
  /** trueの場合、取付向きを180度反転（背面撃ち・逆噴射） */
  flipped: boolean;
}

export interface ShipBlueprint {
  name: string;
  pilotName: string;
  catColor: string;
  hullId: HullId;
  slots: Record<string, EquippedSlot | null>;
}

export interface EnemyStage {
  stage: number;
  title: string;
  tagline: string;
  rewardText: string;
  unlockHull?: HullId;
  unlockPart?: PartId;
  blueprint: ShipBlueprint;
}

export type CatMood = 'normal' | 'charge' | 'dizzy' | 'happy' | 'ko';
