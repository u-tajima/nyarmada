import { EnemyStage, HullId, ShipBlueprint } from '../types';
import { HULL_LIST } from './hulls';
import { PART_LIST } from './parts';

export const TOTAL_CAMPAIGN_STAGES = 10;

export const ENEMY_STAGES: EnemyStage[] = [
  {
    stage: 1,
    title: 'STAGE 1：盾持ちクロスケ防衛隊',
    tagline: '「正面からのロケット弾は光学シールドで防ぐニャ！シールドを貫通できる近接武器なんて持ってないよな？」',
    rewardText: '撃破で奪取：補助「フロントシールド」解放！',
    unlockPart: 'shield',
    blueprint: {
      name: 'イージス・クロウ',
      pilotName: 'クロスケ',
      catColor: '#64748b',
      hullId: 'sneaky',
      slots: {
        w1: { partId: 'rocket', flipped: false },
        t1: { partId: 'thruster', flipped: false },
        t2: { partId: 'thruster', flipped: false },
        g1: { partId: 'shield', flipped: false },
      },
    },
  },
  {
    stage: 2,
    title: 'STAGE 2：後退狙撃手ミケ・バック',
    tagline: '「ドリル突撃艦は逆噴射で距離を引き離して撃ち抜くニャ！さっき奪ったシールドでも張ってみるかニャ？」',
    rewardText: '撃破で奪取：推進「スタビライズ逆噴射」解放！',
    unlockPart: 'retro',
    blueprint: {
      name: 'カイト・シューター',
      pilotName: 'ミケ・バック',
      catColor: '#fbbf24',
      hullId: 'cruiser',
      slots: {
        w1: { partId: 'rocket', flipped: false },
        w2: { partId: 'rocket', flipped: false },
        t1: { partId: 'retro', flipped: false },
        g1: { partId: 'shield', flipped: false },
      },
    },
  },
  {
    stage: 3,
    title: 'STAGE 3：爆速ニトロ突撃団トラ丸',
    tagline: '「ニトロブースターでロケット弾をかわして懐へ飛び込み、シールドごとドリルで抉り抜くニャ！！」',
    rewardText: '撃破で奪取：推進「バーストブースター」解放！',
    unlockPart: 'booster',
    blueprint: {
      name: 'ニトロ・ファング',
      pilotName: 'トラ丸',
      catColor: '#f97316',
      hullId: 'sneaky',
      slots: {
        w1: { partId: 'drill', flipped: false },
        t1: { partId: 'booster', flipped: false },
        t2: { partId: 'retro', flipped: true },
        g1: { partId: 'shield', flipped: false },
      },
    },
  },
  {
    stage: 4,
    title: 'STAGE 4：衝撃波パリィ師ポヨン',
    tagline: '「突撃ドリル艦はリパルサー衝撃波でボヨンと弾き飛ばすニャ！逆噴射で間合いを取れるもんなら取ってみろニャ！」',
    rewardText: '撃破で奪取：補助「リパルサー衝撃波」解放！',
    unlockPart: 'repulsor',
    blueprint: {
      name: 'バウンス・メイジ',
      pilotName: 'ポヨン',
      catColor: '#c084fc',
      hullId: 'cruiser',
      slots: {
        w1: { partId: 'rocket', flipped: false },
        w2: { partId: 'drill', flipped: false },
        t1: { partId: 'thruster', flipped: false },
        g1: { partId: 'repulsor', flipped: false },
      },
    },
  },
  {
    stage: 5,
    title: 'STAGE 5：超電磁スナイパー・シロ',
    tagline: '「2門の超音速レールキャノンで引き撃ち狙撃するニャ！ブースターの高速回避とシールド無しじゃ近づけまい！」',
    rewardText: '撃破で奪取：武装「レールキャノン」解放！',
    unlockPart: 'railgun',
    blueprint: {
      name: 'ダブル・ライトニング',
      pilotName: 'シロ少佐',
      catColor: '#e2e8f0',
      hullId: 'cruiser',
      slots: {
        w1: { partId: 'railgun', flipped: false },
        w2: { partId: 'railgun', flipped: false },
        t1: { partId: 'retro', flipped: false },
        g1: null,
      },
    },
  },
  {
    stage: 6,
    title: 'STAGE 6：回転断頭台ギロチン丸',
    tagline: '「ドリルよりリーチの長い回転丸ノコでブースター突撃！リパルサーで弾もパリィするニャ！」',
    rewardText: '撃破で奪取：武装「オービタル・ソー」解放！',
    unlockPart: 'saw',
    blueprint: {
      name: 'アサルト・ソー',
      pilotName: 'ギロチン丸',
      catColor: '#eab308',
      hullId: 'cruiser',
      slots: {
        w1: { partId: 'saw', flipped: false },
        w2: { partId: 'rocket', flipped: false },
        t1: { partId: 'booster', flipped: false },
        g1: { partId: 'repulsor', flipped: false },
      },
    },
  },
  {
    stage: 7,
    title: 'STAGE 7：磁力処刑人ドン・ゴロリ',
    tagline: '「引き撃ちなんて逃がさんニャ！U字マグネットで引きずり込んで2連丸ノコの餌食にするニャ！」',
    rewardText: '撃破で奪取：補助「トラクタービーム」解放！',
    unlockPart: 'tractor',
    blueprint: {
      name: 'マグネ・クラッシャー',
      pilotName: 'ドン・ゴロリ',
      catColor: '#ef4444',
      hullId: 'cruiser',
      slots: {
        w1: { partId: 'saw', flipped: false },
        w2: { partId: 'saw', flipped: false },
        t1: { partId: 'thruster', flipped: false },
        g1: { partId: 'tractor', flipped: false },
      },
    },
  },
  {
    stage: 8,
    title: 'STAGE 8：円盤狂マタタビ星人',
    tagline: '「360度スピンするUFOにロケット弾は通じないニャ！リパルサーと2連丸ノコで暴れ回るニャ〜！」',
    rewardText: '撃破で奪取：新艦体「UFOソーサー」解放！',
    unlockHull: 'saucer',
    blueprint: {
      name: 'マタタビUFO',
      pilotName: 'ニャリアン',
      catColor: '#d8b4fe',
      hullId: 'saucer',
      slots: {
        w1: { partId: 'saw', flipped: false },
        w2: { partId: 'saw', flipped: false },
        t1: { partId: 'thruster', flipped: false },
        g1: { partId: 'repulsor', flipped: false },
      },
    },
  },
  {
    stage: 9,
    title: 'STAGE 9：閃光プリズム艦長ルミナ',
    tagline: '「シールドを一撃で貫く極太フェーズレーザー！チャージ完了の瞬間をブースターでかわせるかニャ？」',
    rewardText: '撃破で奪取：武装「フェーズレーザー」解放！',
    unlockPart: 'laser',
    blueprint: {
      name: 'プリズム・ノヴァ',
      pilotName: 'ルミナ艦長',
      catColor: '#fda4af',
      hullId: 'cruiser',
      slots: {
        w1: { partId: 'laser', flipped: false },
        w2: { partId: 'rocket', flipped: false },
        t1: { partId: 'retro', flipped: false },
        g1: { partId: 'shield', flipped: false },
      },
    },
  },
  {
    stage: 10,
    title: 'FINAL STAGE：銀河皇帝キング・アングラ',
    tagline: '「超弩級タイタン艦体にレーザー・丸ノコ・衝撃波・シールドを満載した究極要塞！旋回の隙を突け！」',
    rewardText: '完全制覇報酬：超弩級艦体「タイタン・ドレッド」＆ エンドレス杯解放！',
    unlockHull: 'titan',
    blueprint: {
      name: 'キング・アングラ要塞',
      pilotName: 'キング・アングラ',
      catColor: '#38bdf8',
      hullId: 'titan',
      slots: {
        w1: { partId: 'laser', flipped: false },
        w2: { partId: 'saw', flipped: false },
        t1: { partId: 'retro', flipped: false },
        g1: { partId: 'repulsor', flipped: false },
        g2: { partId: 'shield', flipped: false },
      },
    },
  },
];

const RANDOM_NAMES = [
  'コスモ・タマ',
  'ネビュラ・チャトラ',
  'キャプテン・モフ',
  'ブラック・肉球団',
  'アストロ・サバトラ',
  'すいせいノルウェージャン',
];

const CAT_COLORS = ['#fbbf24', '#f97316', '#38bdf8', '#c084fc', '#4ade80', '#f43f5e', '#e2e8f0'];

export function generateRandomEnemy(level: number): EnemyStage {
  const hull = HULL_LIST[Math.floor(Math.random() * HULL_LIST.length)];
  const slots: ShipBlueprint['slots'] = {};
  let remainingEnergy = hull.maxEnergy;

  const sortedSlots = [...hull.slots].sort((a, b) => {
    const order = { weapon: 0, thruster: 1, gadget: 2 };
    return order[a.category] - order[b.category];
  });

  for (const slot of sortedSlots) {
    const candidates = PART_LIST.filter(
      (p) => p.category === slot.category && p.energy <= remainingEnergy
    );
    if (candidates.length > 0 && Math.random() < 0.9) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const flipped =
        picked.canFlip && picked.id === 'railgun' && slot.category === 'weapon'
          ? Math.random() < 0.2
          : false;
      slots[slot.id] = { partId: picked.id, flipped };
      remainingEnergy -= picked.energy;
    } else {
      slots[slot.id] = null;
    }
  }

  const weaponSlots = hull.slots.filter((s) => s.category === 'weapon');
  const hasWeapon = weaponSlots.some((s) => slots[s.id] !== null);
  if (!hasWeapon && weaponSlots.length > 0) {
    slots[weaponSlots[0].id] = { partId: 'rocket', flipped: false };
  }

  const pilot = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

  return {
    stage: level,
    title: `ENDLESS CUP 第${level - TOTAL_CAMPAIGN_STAGES}戦：${pilot}`,
    tagline: '「全パーツ解禁・ランダム設計のライバル艦との無差別級バトルだニャ！」',
    rewardText: 'エンドレス連勝記録を更新しよう！',
    blueprint: {
      name: `${pilot}専用${hull.name.split('・')[0]}`,
      pilotName: pilot,
      catColor: CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)],
      hullId: hull.id as HullId,
      slots,
    },
  };
}
