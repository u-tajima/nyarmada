import{ENEMY_STAGES as b,generateRandomEnemy as x,TOTAL_CAMPAIGN_STAGES as B}from"../data/enemies.js";import{HULL_LIST as $,HULLS as g}from"../data/hulls.js";import{PART_LIST as S,PARTS as f}from"../data/parts.js";import{ARENA_HEIGHT as H,ARENA_WIDTH as C,BattleArena as L}from"../physics/arena.js";import{computeBlueprintStats as w}from"../physics/shipBody.js";import{sound as r}from"../render/audio.js";import{renderBattleArena as A,renderGaragePreview as P,renderHullThumbnail as M,renderPartThumbnail as U}from"../render/renderer.js";const q={stage:0,title:"\u30C6\u30B9\u30C8\u6F14\u7FD2\uFF1A\u8A13\u7DF4\u7528\u30B5\u30F3\u30C9\u30D0\u30C3\u30B0\u8266",tagline:"\u6B66\u88C5\u3092\u6301\u305F\u306A\u3044\u9AD8\u8010\u4E45\u30BF\u30FC\u30B2\u30C3\u30C8\u8266\u3002\u53CD\u52D5\u30B8\u30E3\u30F3\u30D7\u3084\u30EC\u30FC\u30B6\u30FC\u89D2\u5EA6\u306E\u78BA\u8A8D\u306B\u6700\u9069\uFF01",rewardText:"\u30C6\u30B9\u30C8\u6F14\u7FD2\u30E2\u30FC\u30C9",blueprint:{name:"\u30C0\u30DF\u30FC\u6A19\u7684\u8266",pilotName:"\u30ED\u30DC\u30CB\u30E3\u30F3",catColor:"#94a3b8",hullId:"titan",slots:{w1:null,w2:null,t1:null,g1:{partId:"shield",flipped:!1},g2:null}}},N={name:"\u30B9\u30BF\u30FC\u30FB\u30BF\u30DE\u53F7",pilotName:"\u30BF\u30DE\u8266\u9577",catColor:"#fbbf24",hullId:"cruiser",slots:{w1:{partId:"rocket",flipped:!1},w2:null,t1:{partId:"thruster",flipped:!1},g1:null}},I=[{label:"\u{1F680} \u738B\u9053\u30ED\u30B1\u30C3\u30C8\u8266",bp:{name:"\u30B9\u30BF\u30FC\u30FB\u30BF\u30DE\u53F7",pilotName:"\u30BF\u30DE\u8266\u9577",catColor:"#fbbf24",hullId:"cruiser",slots:{w1:{partId:"rocket",flipped:!1},w2:{partId:"rocket",flipped:!1},t1:{partId:"thruster",flipped:!1},g1:{partId:"shield",flipped:!1}}}},{label:"\u{1F998} \u53CD\u52D5\u30BF\u30FC\u30DC\u7A81\u6483\u8266",bp:{name:"\u30A2\u30AF\u30ED\u30D0\u30C3\u30C8\u30FB\u30DF\u30B1",pilotName:"\u30DF\u30B1\u8266\u9577",catColor:"#34d399",hullId:"cruiser",slots:{w1:{partId:"railgun",flipped:!0},w2:{partId:"drill",flipped:!1},t1:{partId:"thruster",flipped:!1},g1:{partId:"shield",flipped:!1}}}},{label:"\u{1F9F2} \u78C1\u529B\u30C9\u30EA\u30EB\u51E6\u5211\u8266",bp:{name:"\u30A2\u30A4\u30A2\u30F3\u30FB\u30AF\u30ED\u30FC",pilotName:"\u30DC\u30B9\u732B",catColor:"#f87171",hullId:"cruiser",slots:{w1:{partId:"drill",flipped:!1},w2:{partId:"saw",flipped:!1},t1:{partId:"thruster",flipped:!1},g1:{partId:"tractor",flipped:!1}}}},{label:"\u{1F6F8} \u72C2\u4E71UFO\u30B9\u30D4\u30CA\u30FC",bp:{name:"\u30B3\u30B9\u30E2\u30FB\u30BD\u30FC\u30B5\u30FC",pilotName:"\u30CB\u30E3\u30EA\u30A2\u30F3",catColor:"#c084fc",hullId:"saucer",slots:{w1:{partId:"saw",flipped:!1},w2:{partId:"railgun",flipped:!0},t1:{partId:"booster",flipped:!1},g1:{partId:"repulsor",flipped:!1}}}}];class Z{root;mode="garage";unlockedHulls=new Set($.filter(t=>t.unlockedByDefault).map(t=>t.id));unlockedParts=new Set(S.filter(t=>t.unlockedByDefault).map(t=>t.id));sandboxAllUnlocked=!1;maxUnlockedStage=1;selectedStageNum=1;currentEnemyStage=b[0];isTestBattle=!1;playerBp=structuredClone(N);selectedSlotId="w2";activeTab="weapon";toastMessage=null;arena=null;battleSpeed=1;resultShown=!1;lastUnlockText=null;previewCanvas=null;battleCanvas=null;previewSlotAreas=[];animTime=0;constructor(t){this.root=t;const e=()=>{r.unlock(),window.removeEventListener("pointerdown",e)};window.addEventListener("pointerdown",e),document.addEventListener("fullscreenchange",()=>{const s=document.getElementById("btn-fullscreen");s&&(s.textContent=document.fullscreenElement?"\u{1F5D7} \u5168\u753B\u9762\u89E3\u9664":"\u26F6 \u5168\u753B\u9762",s.classList.toggle("active",!!document.fullscreenElement))}),this.render(),requestAnimationFrame(s=>this.loop(s))}isHullUnlocked(t){return this.sandboxAllUnlocked||this.unlockedHulls.has(t)}isPartUnlocked(t){return this.sandboxAllUnlocked||this.unlockedParts.has(t)}async toggleFullscreen(){const t=document.documentElement,e=document,s=!!(document.fullscreenElement||e.webkitFullscreenElement);if(!!!(t.requestFullscreen||t.webkitRequestFullscreen)){this.toastMessage="\u{1F4F1} \u3053\u306E\u7AEF\u672B\u306E\u30D6\u30E9\u30A6\u30B6\u306F\u5168\u753B\u9762API\u975E\u5BFE\u5FDC\u3067\u3059\u3002\u5171\u6709\u30E1\u30CB\u30E5\u30FC\u304B\u3089\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3057\u3066\u958B\u304F\u3068\u30A2\u30C9\u30EC\u30B9\u30D0\u30FC\u7121\u3057\u3067\u904A\u3079\u307E\u3059\uFF01",this.render();return}try{s?document.exitFullscreen?await document.exitFullscreen():await e.webkitExitFullscreen?.():(t.requestFullscreen?await t.requestFullscreen({navigationUI:"hide"}):await t.webkitRequestFullscreen?.(),await screen.orientation.lock?.("landscape").catch(()=>{}))}catch{this.toastMessage="\u{1F4F1} \u5168\u753B\u9762\u306B\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30D6\u30E9\u30A6\u30B6\u306E\u30E1\u30CB\u30E5\u30FC\u304B\u3089\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3059\u308B\u3068\u30A2\u30C9\u30EC\u30B9\u30D0\u30FC\u7121\u3057\u3067\u8D77\u52D5\u3067\u304D\u307E\u3059\uFF01"}this.render()}tryAutoFullscreenOnMobile(){if(!window.matchMedia?.("(pointer: coarse)").matches||document.fullscreenElement)return;const e=document.documentElement;e.requestFullscreen?e.requestFullscreen({navigationUI:"hide"}).catch(()=>{}):e.webkitRequestFullscreen&&e.webkitRequestFullscreen().catch(()=>{})}isPresetUnlocked(t){if(!this.isHullUnlocked(t.hullId))return!1;for(const e of Object.values(t.slots))if(e&&!this.isPartUnlocked(e.partId))return!1;return!0}loop(t){if(this.animTime=t*.001,this.mode==="garage"&&this.previewCanvas){const e=this.previewCanvas.getContext("2d");if(e){const s=w(this.playerBp),l=P(e,this.previewCanvas.width,this.previewCanvas.height,this.playerBp,s.comLocal,this.selectedSlotId,this.animTime);this.previewSlotAreas=l.slotHitAreas}}else if(this.mode==="battle"&&this.arena&&this.battleCanvas){const e=this.arena.winner===null?this.battleSpeed:1;for(let l=0;l<e;l++)this.arena.step();const s=this.battleCanvas.getContext("2d");s&&A(s,this.arena),this.arena.winner!==null&&!this.resultShown&&this.arena.finishTimer>.32&&(this.resultShown=!0,this.handleBattleEnd(),this.renderBattleResultOverlay())}requestAnimationFrame(e=>this.loop(e))}handleBattleEnd(){if(!(!this.arena||this.isTestBattle)&&this.arena.winner===0){this.lastUnlockText=null;const t=this.currentEnemyStage;t.unlockPart&&!this.unlockedParts.has(t.unlockPart)&&(this.unlockedParts.add(t.unlockPart),this.lastUnlockText=`\u{1F381} \u6575\u306E\u5207\u308A\u672D\u300C${f[t.unlockPart].name}\u300D\u3092\u596A\u53D6\u3057\u3066\u30A2\u30F3\u30ED\u30C3\u30AF\uFF01`),t.unlockHull&&!this.unlockedHulls.has(t.unlockHull)&&(this.unlockedHulls.add(t.unlockHull),this.lastUnlockText=`\u{1F6F8} \u6575\u306E\u65B0\u8266\u4F53\u300C${g[t.unlockHull].name}\u300D\u3092\u596A\u53D6\u3057\u3066\u30A2\u30F3\u30ED\u30C3\u30AF\uFF01`),this.selectedStageNum>=this.maxUnlockedStage&&(this.maxUnlockedStage=this.selectedStageNum+1)}}selectHull(t){if(!this.isHullUnlocked(t))return;r.playClick();const e=g[t],s={},l=Object.values(this.playerBp.slots).filter(Boolean);let o=0;for(const c of e.slots){const d=l.findIndex(h=>{const a=f[h.partId];return a.category===c.category&&o+a.energy<=e.maxEnergy});if(d>=0){const h=l.splice(d,1)[0];s[c.id]=h,o+=f[h.partId].energy}else s[c.id]=null}this.playerBp.hullId=t,this.playerBp.slots=s,this.selectedSlotId=e.slots[0]?.id??null,this.toastMessage=null,this.render()}equipPart(t){if(!this.isPartUnlocked(t))return;const e=f[t],s=g[this.playerBp.hullId];let l=s.slots.find(a=>a.id===this.selectedSlotId&&a.category===e.category);if(l||(l=s.slots.find(a=>a.category===e.category&&!this.playerBp.slots[a.id])??s.slots.find(a=>a.category===e.category)),!l){this.toastMessage="\u26A0\uFE0F \u3053\u306E\u8266\u4F53\u306B\u306F\u5BFE\u5FDC\u3059\u308B\u30B9\u30ED\u30C3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093\uFF01",this.render();return}const o=w(this.playerBp),c=this.playerBp.slots[l.id],d=c?f[c.partId].energy:0,h=o.usedEnergy-d+e.energy;if(h>s.maxEnergy){this.toastMessage=`\u26A1 \u96FB\u529B\u30AA\u30FC\u30D0\u30FC\uFF01\uFF08\u5FC5\u8981: ${h} / \u4E0A\u9650: ${s.maxEnergy}\uFF09\u4ED6\u306E\u30D1\u30FC\u30C4\u3092\u5916\u3059\u304B\u8EFD\u3044\u30D1\u30FC\u30C4\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002`,this.render();return}r.playClick(),this.playerBp.slots[l.id]={partId:t,flipped:!1},this.selectedSlotId=l.id,this.toastMessage=null,this.render()}startBattle(t){r.unlock(),r.playClick(),this.tryAutoFullscreenOnMobile(),this.isTestBattle=t,this.resultShown=!1,this.lastUnlockText=null,t?this.currentEnemyStage=q:this.selectedStageNum<=b.length?this.currentEnemyStage=b[this.selectedStageNum-1]:this.currentEnemyStage=x(this.selectedStageNum),this.arena=new L(this.playerBp,this.currentEnemyStage.blueprint),this.mode="battle",this.render()}render(){const t=`
      <header class="top-bar">
        <div class="brand">
          <h1>\u{1F43E} NYARMADA</h1>
          <span>\u7121\u91CD\u529B\u30AF\u30E9\u30D5\u30C8\uFF06\u30AA\u30FC\u30C8\u7269\u7406\u30D0\u30C8\u30EB</span>
        </div>
        <div class="header-actions">
          <button id="btn-fullscreen" class="btn-chip ${document.fullscreenElement?"active":""}">
            ${document.fullscreenElement?"\u{1F5D7} \u5168\u753B\u9762\u89E3\u9664":"\u26F6 \u5168\u753B\u9762"}
          </button>
          <button id="btn-sandbox" class="btn-chip ${this.sandboxAllUnlocked?"active":""}">
            ${this.sandboxAllUnlocked?'\u{1F513} <span class="label-long">\u5168\u30D1\u30FC\u30C4</span>\u89E3\u653E\u4E2D':'\u{1F512} <span class="label-long">\u5168\u30D1\u30FC\u30C4\u89E3\u653E\uFF08</span>\u30B5\u30F3\u30C9\u30DC\u30C3\u30AF\u30B9<span class="label-long">\uFF09</span>'}
          </button>
          <button id="btn-mute" class="btn-chip ${r.muted?"":"active"}">
            ${r.muted?"\u{1F507} \u30B5\u30A6\u30F3\u30C9 OFF":"\u{1F50A} \u30B5\u30A6\u30F3\u30C9 ON"}
          </button>
        </div>
      </header>
    `;if(this.mode==="garage"){const e=[".panel-build",".panel-catalog",".catalog-list"],s=e.map(o=>this.root.querySelector(o)?.scrollTop??0),l=document.body.dataset.mode==="garage";document.body.dataset.mode="garage",this.root.innerHTML=t+this.buildGarageHtml(),l&&e.forEach((o,c)=>{const d=this.root.querySelector(o);d&&(d.scrollTop=s[c])}),this.bindGarageEvents()}else document.body.dataset.mode="battle",this.root.innerHTML=t+this.buildBattleHtml(),this.bindBattleEvents();document.getElementById("btn-sandbox")?.addEventListener("click",()=>{this.sandboxAllUnlocked=!this.sandboxAllUnlocked,r.playClick(),this.render()}),document.getElementById("btn-fullscreen")?.addEventListener("click",()=>{r.playClick(),this.toggleFullscreen()}),document.getElementById("btn-mute")?.addEventListener("click",()=>{r.muted=!r.muted,r.muted||r.playClick(),this.render()})}buildGarageHtml(){const t=g[this.playerBp.hullId],e=w(this.playerBp),s=this.selectedStageNum<=b.length?b[this.selectedStageNum-1]:null,l=s??{stage:this.selectedStageNum,title:`ENDLESS CUP \u7B2C${this.selectedStageNum-B}\u6226`,tagline:"\u5168\u30D1\u30FC\u30C4\u89E3\u7981\u30FB\u30E9\u30F3\u30C0\u30E0\u7DE8\u6210\u306E\u672A\u77E5\u306A\u308B\u5B87\u5B99\u30CD\u30B3\u8266\u968A\u3068\u9023\u6226\uFF01",rewardText:"\u30A8\u30F3\u30C9\u30EC\u30B9\u9023\u52DD\u30C1\u30E3\u30EC\u30F3\u30B8"};let o="";if(s){const a=s.blueprint,i=g[a.hullId],n=s.unlockHull===i.id,u=!this.unlockedHulls.has(i.id),v=new Map;for(const p of Object.values(a.slots)){if(!p)continue;const m=`${p.partId}:${p.flipped?1:0}`,E=v.get(m);E?E.count++:v.set(m,{partId:p.partId,flipped:p.flipped,count:1})}const y=Array.from(v.values()).map(p=>{const m=f[p.partId],E=s.unlockPart===m.id,k=!this.unlockedParts.has(m.id),T=E?`<span class="intel-badge ${k?"new":"owned"}">${k?"\u2728\u672A\u6240\u6301\u30FB\u596A\u53D6":"\u2705\u596A\u53D6\u6E08"}</span>`:"";return`
            <div class="intel-chip ${E&&k?"new-target":""}">
              <canvas class="intel-thumb" width="40" height="26" data-thumb-part="${m.id}" data-thumb-flipped="${p.flipped?"1":"0"}"></canvas>
              <span>${m.name}${p.flipped?"(\u5F8C\u5411)":""}${p.count>1?` \xD7${p.count}`:""}</span>
              ${T}
            </div>
          `}).join("");o=`
        <div class="enemy-intel-box">
          <div class="intel-label">\u{1F50D} \u6575\u8266\u306E\u88C5\u5099\u69CB\u6210\uFF08\u672A\u6240\u6301\u30D1\u30FC\u30C4\u3078\u306E\u5BFE\u7B56\u3092\u7D44\u3082\u3046\uFF01\uFF09\uFF1A</div>
          <div class="intel-chips">
            <div class="intel-chip ${n&&u?"new-target":""}">
              <canvas class="intel-thumb" width="40" height="26" data-thumb-hull="${i.id}"></canvas>
              <span>${i.name}</span>
              ${n?`<span class="intel-badge ${u?"new":"owned"}">${u?"\u2728\u65B0\u8266\u4F53\u30FB\u596A\u53D6":"\u2705\u596A\u53D6\u6E08"}</span>`:""}
            </div>
            ${y}
          </div>
        </div>
      `}const c=t.slots.map(a=>{const i=this.playerBp.slots[a.id],n=i?f[i.partId]:null,u=a.category==="weapon"?"cat-weapon":a.category==="thruster"?"cat-thruster":"cat-gadget",v=a.category==="weapon"?"\u6B66\u88C5":a.category==="thruster"?"\u63A8\u9032":"\u88DC\u52A9";return`
          <div class="slot-row ${this.selectedSlotId===a.id?"selected":""}" data-slot-id="${a.id}">
            <div class="slot-left">
              <span class="cat-badge ${u}">${v}</span>
              ${n?`<canvas class="slot-thumb" width="54" height="36" data-thumb-part="${n.id}" data-thumb-flipped="${i?.flipped?"1":"0"}"></canvas>`:""}
              <div>
                <div style="font-size:0.84rem;font-weight:800;">
                  ${a.label}\uFF1A${n?n.name:'<span style="color:#64748b;">\u672A\u88C5\u7740\uFF08\u7A7A\u304D\uFF09</span>'}
                </div>
                ${n?`<div style="font-size:0.72rem;color:#94a3b8;">\u26A1${n.energy} / \u5411\u304D: ${i?.flipped?"\u25C0 \u5F8C\u308D\u5411\u304D\uFF08\u53CD\u52D5\u9006\u8EE2\uFF09":"\u524D\u5411\u304D \u25B6"}</div>`:""}
              </div>
            </div>
            <div class="slot-actions">
              ${n&&n.canFlip?`<button class="btn-mini ${i?.flipped?"flipped":""}" data-flip-slot="${a.id}">\u21C4 \u53CD\u8EE2</button>`:""}
              ${n?`<button class="btn-mini" data-clear-slot="${a.id}">\u2715 \u5916\u3059</button>`:""}
            </div>
          </div>
        `}).join("");let d="";this.activeTab==="hulls"?d=$.map(a=>{const i=this.isHullUnlocked(a.id),n=a.id===this.playerBp.hullId,u=b.find(y=>y.unlockHull===a.id),v=u?`\u{1F512} STAGE ${u.stage} \u30DC\u30B9\u300C${u.blueprint.pilotName}\u300D\u6483\u7834\u3067\u596A\u53D6\u30FB\u89E3\u653E\uFF01`:"\u{1F512} \u30EA\u30FC\u30B0\u6226\u3092\u52DD\u3061\u629C\u304F\u3068\u30A2\u30F3\u30ED\u30C3\u30AF";return`
          <div class="item-card ${n?"active-hull":""} ${i?"":"locked"}">
            <div class="item-left">
              <canvas class="thumb-box" width="74" height="50" data-thumb-hull="${a.id}"></canvas>
              <div class="item-info">
                <h4>
                  ${a.name}
                  <span class="energy-pill">\u2764\uFE0F${a.hp} / \u26A1${a.maxEnergy}</span>
                </h4>
                <p>${i?a.description:v}</p>
              </div>
            </div>
            <button class="btn-equip" data-select-hull="${a.id}" ${!i||n?"disabled":""}>
              ${n?"\u4F7F\u7528\u4E2D":i?"\u4E57\u308A\u63DB\u3048":"\u{1F512} \u672A\u89E3\u653E"}
            </button>
          </div>
        `}).join(""):d=S.filter(i=>i.category===this.activeTab).map(i=>{const n=this.isPartUnlocked(i.id),u=b.find(y=>y.unlockPart===i.id),v=u?`\u{1F512} STAGE ${u.stage} \u30DC\u30B9\u300C${u.blueprint.pilotName}\u300D\u304C\u88C5\u5099\u4E2D\uFF08\u6483\u7834\u3067\u596A\u53D6\uFF01\uFF09`:"\u{1F512} \u30EA\u30FC\u30B0\u6226\u30AF\u30EA\u30A2\u5831\u916C\u3067\u30A2\u30F3\u30ED\u30C3\u30AF";return`
            <div class="item-card ${n?"":"locked"}">
              <div class="item-left">
                <canvas class="thumb-box" width="74" height="50" data-thumb-part="${i.id}"></canvas>
                <div class="item-info">
                  <h4>
                    ${i.name}
                    <span class="energy-pill">\u26A1\u96FB\u529B ${i.energy}</span>
                    ${i.damage?`<span class="energy-pill" style="color:#fca5a5;">\u{1F4A5}\u5A01\u529B ${i.damage}</span>`:""}
                  </h4>
                  <p>${n?i.description:v}</p>
                </div>
              </div>
              <button class="btn-equip" data-equip-part="${i.id}" ${n?"":"disabled"}>
                ${n?"\u88C5\u7740\u3059\u308B":"\u{1F512} \u672A\u89E3\u653E"}
              </button>
            </div>
          `}).join("");const h=I.map((a,i)=>{const n=this.isPresetUnlocked(a.bp);return`<button class="btn-mini" data-preset-idx="${i}" ${n?"":"disabled"} title="${n?"\u30B5\u30F3\u30D7\u30EB\u8A2D\u8A08\u3092\u8AAD\u307F\u8FBC\u3080":"\u5FC5\u8981\u30D1\u30FC\u30C4\u3092\u596A\u53D6\u3059\u308B\u304B\u3001\u53F3\u4E0A\u306E\u30B5\u30F3\u30C9\u30DC\u30C3\u30AF\u30B9ON\u3067\u4F7F\u7528\u53EF\u80FD"}">${n?a.label:`\u{1F512} ${a.label}`}</button>`}).join("");return`
      <div class="garage-grid">
        <!-- \u5DE6\u30AB\u30E9\u30E0\uFF1A\u8266\u4F53\u30D7\u30EC\u30D3\u30E5\u30FC\uFF06\u30B9\u30ED\u30C3\u30C8 -->
        <section class="panel panel-build">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <div>
              <strong style="font-size:1.05rem;">\u{1F6E0}\uFE0F ${t.name}</strong>
              <span style="font-size:0.78rem;color:#94a3b8;margin-left:6px;">${t.subtitle}</span>
            </div>
            <div class="preset-row" style="display:flex;gap:5px;flex-wrap:wrap;">
              ${h}
            </div>
          </div>

          <div class="preview-wrap">
            <canvas id="garage-preview-canvas" class="preview-canvas" width="560" height="270"></canvas>
          </div>

          <div class="stats-strip">
            <div class="stat-box">
              <div class="stat-label">\u7DCF\u8010\u4E45 (HP)</div>
              <div class="stat-value" style="color:#4ade80;">\u2764\uFE0F ${e.totalHp}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">\u4F7F\u7528\u96FB\u529B (Energy)</div>
              <div class="stat-value ${e.usedEnergy===e.maxEnergy?"energy-full":"energy-ok"}">\u26A1 ${e.usedEnergy} / ${e.maxEnergy}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">\u63A8\u5B9A\u706B\u529B (DPS)</div>
              <div class="stat-value" style="color:#fb7185;">\u{1F4A5} ${e.approxDps}/s</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">\u7DCF\u8CEA\u91CF / \u30B8\u30E3\u30A4\u30ED</div>
              <div class="stat-value" style="color:#cbd5e1;">\u2696\uFE0F ${e.totalMass}</div>
            </div>
          </div>

          <div class="section-title">
            <span>\u{1F527} \u30B9\u30ED\u30C3\u30C8\u69CB\u6210\uFF08\u30AF\u30EA\u30C3\u30AF\u3067\u9078\u629E\u30FB\u5411\u304D\u53CD\u8EE2\uFF09</span>
          </div>
          <div class="slot-list">
            ${c}
          </div>
          ${this.toastMessage?`<div class="toast-msg">${this.toastMessage}</div>`:""}
        </section>

        <!-- \u53F3\u30AB\u30E9\u30E0\uFF1A\u30D1\u30FC\u30C4\u30AB\u30BF\u30ED\u30B0\uFF06\u51FA\u6483\u30D1\u30CD\u30EB -->
        <section class="panel panel-catalog">
          <div>
            <div class="tabs">
              <button class="tab-btn ${this.activeTab==="weapon"?"active":""}" data-tab="weapon">\u{1F52B} \u6B66\u88C5 (5)</button>
              <button class="tab-btn ${this.activeTab==="thruster"?"active":""}" data-tab="thruster">\u{1F525} \u63A8\u9032 (3)</button>
              <button class="tab-btn ${this.activeTab==="gadget"?"active":""}" data-tab="gadget">\u{1F9F2} \u88DC\u52A9 (3)</button>
              <button class="tab-btn ${this.activeTab==="hulls"?"active":""}" data-tab="hulls">\u{1F6F8} \u8266\u4F53 (4)</button>
            </div>

            <div class="catalog-list">
              ${d}
            </div>
          </div>

          <div class="stage-card">
            <div class="stage-nav">
              <button id="btn-prev-stage" class="btn-mini" ${this.selectedStageNum<=1?"disabled":""}>\u25C0 \u524D\u3078</button>
              <div class="stage-title">${l.title}</div>
              <button id="btn-next-stage" class="btn-mini" ${this.selectedStageNum>=this.maxUnlockedStage&&!this.sandboxAllUnlocked?"disabled":""}>\u6B21\u3078 \u25B6</button>
            </div>
            <div class="stage-tagline">${l.tagline}</div>
            ${o}
            <div class="stage-reward">\u{1F3C6} ${l.rewardText}</div>
            <div class="launch-buttons">
              <button id="btn-test-battle" class="btn-test">\u{1F9EA} \u30C6\u30B9\u30C8\u6F14\u7FD2</button>
              <button id="btn-start-battle" class="btn-battle">\u2694\uFE0F \u30A2\u30EA\u30FC\u30CA\u51FA\u6483\uFF01</button>
            </div>
          </div>
        </section>
      </div>
    `}bindGarageEvents(){this.previewCanvas=document.getElementById("garage-preview-canvas"),document.querySelectorAll("[data-thumb-part]").forEach(t=>{const e=t.dataset.thumbPart,s=t.dataset.thumbFlipped==="1";U(t,e,s)}),document.querySelectorAll("[data-thumb-hull]").forEach(t=>{const e=t.dataset.thumbHull;M(t,e)}),this.previewCanvas?.addEventListener("click",t=>{if(!this.previewCanvas)return;const e=this.previewCanvas.getBoundingClientRect(),s=this.previewCanvas.width/e.width,l=this.previewCanvas.height/e.height,o=(t.clientX-e.left)*s,c=(t.clientY-e.top)*l;for(const d of this.previewSlotAreas)if(Math.hypot(o-d.sx,c-d.sy)<=d.r){r.playClick(),this.selectedSlotId=d.slot.id,this.activeTab=d.slot.category,this.toastMessage=null,this.render();break}}),document.querySelectorAll("[data-slot-id]").forEach(t=>{t.addEventListener("click",e=>{if(e.target.closest("button"))return;const l=t.dataset.slotId,c=g[this.playerBp.hullId].slots.find(d=>d.id===l);c&&(r.playClick(),this.selectedSlotId=l,this.activeTab=c.category,this.toastMessage=null,this.render())})}),document.querySelectorAll("[data-flip-slot]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const s=t.dataset.flipSlot,l=this.playerBp.slots[s];l&&(r.playClick(),l.flipped=!l.flipped,this.render())})}),document.querySelectorAll("[data-clear-slot]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const s=t.dataset.clearSlot;r.playClick(),this.playerBp.slots[s]=null,this.toastMessage=null,this.render()})}),document.querySelectorAll("[data-tab]").forEach(t=>{t.addEventListener("click",()=>{r.playClick(),this.activeTab=t.dataset.tab,this.render()})}),document.querySelectorAll("[data-select-hull]").forEach(t=>{t.addEventListener("click",()=>{this.selectHull(t.dataset.selectHull)})}),document.querySelectorAll("[data-equip-part]").forEach(t=>{t.addEventListener("click",()=>{this.equipPart(t.dataset.equipPart)})}),document.querySelectorAll("[data-preset-idx]").forEach(t=>{t.addEventListener("click",()=>{const e=Number(t.dataset.presetIdx),s=I[e];!s||!this.isPresetUnlocked(s.bp)||(r.playClick(),this.playerBp=structuredClone(s.bp),this.selectedSlotId=g[this.playerBp.hullId].slots[0]?.id??null,this.toastMessage=`\u2728 \u30B5\u30F3\u30D7\u30EB\u69CB\u6210\u300C${s.label}\u300D\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F\uFF01`,this.render())})}),document.getElementById("btn-prev-stage")?.addEventListener("click",()=>{this.selectedStageNum>1&&(r.playClick(),this.selectedStageNum--,this.render())}),document.getElementById("btn-next-stage")?.addEventListener("click",()=>{r.playClick(),this.selectedStageNum++,this.render()}),document.getElementById("btn-test-battle")?.addEventListener("click",()=>{this.startBattle(!0)}),document.getElementById("btn-start-battle")?.addEventListener("click",()=>{this.startBattle(!1)})}buildBattleHtml(){return`
      <section class="battle-wrapper" id="battle-wrapper">
        <canvas
          id="battle-canvas"
          class="battle-canvas"
          width="${C}"
          height="${H}"
        ></canvas>

        <div class="battle-controls">
          <div style="font-weight:800;color:#fde047;">
            ${this.currentEnemyStage.title}
          </div>
          <div style="display:flex;gap:8px;">
            <button id="btn-speed" class="btn-chip ${this.battleSpeed===2?"active":""}">
              \u23E9 \u901F\u5EA6: ${this.battleSpeed}x
            </button>
            <button id="btn-retry" class="btn-chip">\u{1F504} \u518D\u6226\u30EA\u30C8\u30E9\u30A4</button>
            <button id="btn-back-garage" class="btn-chip" style="border-color:#38bdf8;color:#7dd3fc;">
              \u{1F527} \u30AC\u30EC\u30FC\u30B8\u3078\u623B\u308B
            </button>
          </div>
        </div>
      </section>
    `}bindBattleEvents(){this.battleCanvas=document.getElementById("battle-canvas"),document.getElementById("btn-speed")?.addEventListener("click",()=>{r.playClick(),this.battleSpeed=this.battleSpeed===1?2:1;const t=document.getElementById("btn-speed");t&&(t.textContent=`\u23E9 \u901F\u5EA6: ${this.battleSpeed}x`,t.classList.toggle("active",this.battleSpeed===2))}),document.getElementById("btn-retry")?.addEventListener("click",()=>{this.startBattle(this.isTestBattle)}),document.getElementById("btn-back-garage")?.addEventListener("click",()=>{r.playClick(),this.mode="garage",this.arena=null,this.render()})}renderBattleResultOverlay(){const t=document.getElementById("battle-wrapper");if(!t||!this.arena)return;const e=this.arena.winner===0,s=this.arena.winner==="draw",l=e?"\u{1F389} VICTORY!! \u{1F389}":s?"\u{1F4A5} DOUBLE KO!! \u{1F4A5}":"\u{1F63F} DEFEAT...",o=e?"#facc15":s?"#38bdf8":"#f43f5e",c=e?`${this.currentEnemyStage.blueprint.pilotName}\u306E\u8266\u3092\u6483\u6C88\u3057\u305F\u30CB\u30E3\uFF01`:s?"\u76F8\u6253\u3061\uFF01\u30D1\u30FC\u30C4\u914D\u7F6E\u3092\u5C11\u3057\u5909\u3048\u308C\u3070\u52DD\u3066\u308B\u304B\u3082\u30CB\u30E3\uFF01":"\u91CD\u5FC3\u3084\u30B9\u30E9\u30B9\u30BF\u30FC\u30FB\u30B7\u30FC\u30EB\u30C9\u306E\u76F8\u6027\u3092\u898B\u76F4\u3057\u3066\u30EA\u30D9\u30F3\u30B8\u3057\u3088\u3046\uFF01",d=document.createElement("div");d.className="result-overlay",d.innerHTML=`
      <div class="result-box">
        <h2 style="color:${o};">${l}</h2>
        <p style="color:#cbd5e1;font-size:0.9rem;">${c}</p>
        ${this.lastUnlockText?`<div class="unlock-banner">${this.lastUnlockText}</div>`:""}
        <div class="result-actions">
          <button id="res-garage" class="btn-chip" style="padding:10px 16px;">\u{1F527} \u30AC\u30EC\u30FC\u30B8\u3067\u6539\u9020</button>
          <button id="res-retry" class="btn-chip" style="padding:10px 16px;">\u{1F504} \u3082\u3046\u4E00\u5EA6\u6226\u3046</button>
          ${e&&!this.isTestBattle?'<button id="res-next" class="btn-battle" style="padding:10px 18px;font-size:0.9rem;">\u23ED\uFE0F \u6B21\u306E\u30B9\u30C6\u30FC\u30B8\u3078\uFF01</button>':""}
        </div>
      </div>
    `,t.appendChild(d),document.getElementById("res-garage")?.addEventListener("click",()=>{r.playClick(),this.mode="garage",this.arena=null,e&&!this.isTestBattle&&(this.selectedStageNum=this.maxUnlockedStage),this.render()}),document.getElementById("res-retry")?.addEventListener("click",()=>{this.startBattle(this.isTestBattle)}),document.getElementById("res-next")?.addEventListener("click",()=>{this.selectedStageNum++,this.startBattle(!1)})}}export{Z as GameApp};
