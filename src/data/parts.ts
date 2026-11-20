import { PartDef, PartId } from '../types';

export const PARTS: Record<PartId, PartDef> = {
  // ===== 武装 (Weapons) =====
  rocket: {
    id: 'rocket',
    name: 'ロケット砲',
    category: 'weapon',
    energy: 4,
    mass: 1.8,
    description: '直進する爆発ロケット弾を発射。命中時に程よいノックバックを与える堅実な主砲。',
    canFlip: true,
    color: '#ef4444',
    damage: 32,
    cooldown: 0.95,
    projectileSpeed: 9.5,
    recoil: 0.035,
    knockback: 0.075,
    range: 900,
    unlockedByDefault: true,
  },

  railgun: {
    id: 'railgun',
    name: 'レールキャノン',
    category: 'weapon',
    energy: 6,
    mass: 3.2,
    description:
      '超音速徹甲弾を撃ち出す電磁砲。発射反動が凄まじく、軽い艦や後ろ向き装着なら自艦が吹っ飛ぶ！',
    canFlip: true,
    color: '#38bdf8',
    damage: 70,
    cooldown: 2.0,
    projectileSpeed: 18.5,
    recoil: 0.26,
    knockback: 0.22,
    range: 1100,
    unlockedByDefault: false,
  },

  laser: {
    id: 'laser',
    name: 'フェーズレーザー',
    category: 'weapon',
    energy: 7,
    mass: 2.8,
    description:
      '2.2秒チャージ後に極太ビームを瞬間照射するロマン砲！発射の瞬間に姿勢が傾いていると宇宙の彼方へ外れる。',
    canFlip: true,
    color: '#f43f5e',
    damage: 115,
    cooldown: 2.6,
    chargeTime: 2.2,
    recoil: 0.06,
    knockback: 0.09,
    range: 1050,
    unlockedByDefault: false,
  },

  drill: {
    id: 'drill',
    name: 'プラズマドリル',
    category: 'weapon',
    energy: 4,
    mass: 2.6,
    description:
      '超高温で回転する突撃用ドリル。敵艦に押し当て続けるとゴリゴリHPを削り取る。シールドも貫通！',
    canFlip: true,
    color: '#f97316',
    damage: 11,
    cooldown: 0.12,
    knockback: 0.008,
    range: 62,
    unlockedByDefault: true,
  },

  saw: {
    id: 'saw',
    name: 'オービタル・ソー',
    category: 'weapon',
    energy: 5,
    mass: 2.4,
    description:
      'アームの先端で360度グルグル回転する宇宙丸ノコ。長いリーチと強烈な弾き飛ばしでドリル艦すら寄せ付けない！',
    canFlip: false,
    color: '#eab308',
    damage: 34,
    cooldown: 0.16,
    knockback: 0.105,
    range: 70,
    unlockedByDefault: false,
  },

  // ===== 推進 (Thrusters) =====
  thruster: {
    id: 'thruster',
    name: 'メインスラスター',
    category: 'thruster',
    energy: 2,
    mass: 1.2,
    description:
      '安定した推力で敵艦へ前進する基本エンジン。上下の高さズレもゆるやかに補正して正面衝突へ持ち込む。',
    canFlip: true,
    color: '#fb923c',
    thrust: 0.0068,
    burstDuration: 0,
    unlockedByDefault: true,
  },

  booster: {
    id: 'booster',
    name: 'バーストブースター',
    category: 'thruster',
    energy: 3,
    mass: 1.6,
    description:
      '開幕と2.7秒ごとに1.2秒間だけ猛烈に噴射！敵の弾を横へかわしつつ一気に懐や背後へ飛び込む！',
    canFlip: true,
    color: '#ec4899',
    thrust: 0.025,
    burstDuration: 1.2,
    burstCooldown: 2.7,
    unlockedByDefault: false,
  },

  retro: {
    id: 'retro',
    name: 'スタビライズ逆噴射',
    category: 'thruster',
    energy: 1,
    mass: 0.9,
    description:
      '省電力の逆噴射＆姿勢制御バーニア。後ろへ下がって間合いを取りつつ回転ブレを抑え、射撃の命中率を高める。',
    canFlip: true,
    color: '#2dd4bf',
    thrust: -0.0062,
    burstDuration: 0,
    unlockedByDefault: false,
  },

  // ===== 補助ガジェット (Gadgets) =====
  shield: {
    id: 'shield',
    name: 'フロントシールド',
    category: 'gadget',
    energy: 3,
    mass: 1.5,
    hpBonus: 20,
    description:
      '前方からのロケット弾やレーザーを合計185ダメージまで防ぐ光学盾。ただし近接武器や背後からの攻撃は防げない！',
    canFlip: true,
    color: '#06b6d4',
    shieldHp: 185,
    unlockedByDefault: false,
  },

  repulsor: {
    id: 'repulsor',
    name: 'リパルサー衝撃波',
    category: 'gadget',
    energy: 3,
    mass: 1.4,
    description:
      '接近した敵艦や敵弾を2.3秒ごとにボヨン！と弾き飛ばしてスピンさせる斥力装置。',
    canFlip: false,
    color: '#8b5cf6',
    damage: 14,
    cooldown: 3.0,
    pulseForce: 0.28,
    range: 155,
    unlockedByDefault: false,
  },

  tractor: {
    id: 'tractor',
    name: 'トラクタービーム',
    category: 'gadget',
    energy: 3,
    mass: 1.6,
    description:
      '前方の敵艦を磁力ビームでグイグイ引き寄せる悪魔のアンカー。ドリルや回転ノコとのコンボが強烈！',
    canFlip: true,
    color: '#22c55e',
    pulseForce: 0.0068,
    range: 380,
    unlockedByDefault: false,
  },
};

export const PART_LIST: PartDef[] = Object.values(PARTS);
