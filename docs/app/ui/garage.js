import{ENEMY_STAGES as v,generateRandomEnemy as B,TOTAL_CAMPAIGN_STAGES as g}from"../data/enemies.js";import{HULL_LIST as S,HULLS as y}from"../data/hulls.js";import{PART_LIST as f,PARTS as b}from"../data/parts.js";import{ARENA_HEIGHT as C,ARENA_WIDTH as L,BattleArena as x}from"../physics/arena.js";import{computeBlueprintStats as w}from"../physics/shipBody.js";import{sound as d}from"../render/audio.js";import{renderBattleArena as M,renderEnemyPreview as P,renderGaragePreview as A,renderHullThumbnail as I,renderPartThumbnail as H}from"../render/renderer.js";const U={stage:0,title:"\u30C6\u30B9\u30C8\u6F14\u7FD2",tagline:"\u6B66\u88C5\u306A\u3057\u306E\u30BF\u30FC\u30B2\u30C3\u30C8\u8266",rewardText:"\u30C6\u30B9\u30C8\u6F14\u7FD2",blueprint:{name:"\u30C0\u30DF\u30FC\u6A19\u7684\u8266",pilotName:"\u30ED\u30DC\u30CB\u30E3\u30F3",catColor:"#94a3b8",hullId:"titan",slots:{w1:null,w2:null,t1:null,g1:{partId:"shield",flipped:!1},g2:null}}},q={name:"\u30B9\u30BF\u30FC\u30FB\u30BF\u30DE\u53F7",pilotName:"\u30BF\u30DE\u8266\u9577",catColor:"#fbbf24",hullId:"cruiser",slots:{w1:{partId:"rocket",flipped:!1},w2:null,t1:{partId:"thruster",flipped:!1},g1:null}};class Q{root;mode="garage";unlockedHulls=new Set(S.filter(t=>t.unlockedByDefault).map(t=>t.id));unlockedParts=new Set(f.filter(t=>t.unlockedByDefault).map(t=>t.id));sandboxAllUnlocked=!1;maxUnlockedStage=1;selectedStageNum=1;currentEnemyStage=v[0];isTestBattle=!1;playerBp=structuredClone(q);selectedSlotId="w2";activeTab="weapon";inspected={kind:"part",id:"rocket"};stageInspected=null;toastMessage=null;arena=null;battleSpeed=1;resultShown=!1;lastUnlockText=null;previewCanvas=null;enemyPreviewCanvas=null;battleCanvas=null;previewSlotAreas=[];animTime=0;constructor(t){this.root=t;const e=()=>{d.unlock(),window.removeEventListener("pointerdown",e)};window.addEventListener("pointerdown",e),document.addEventListener("fullscreenchange",()=>{const s=document.getElementById("btn-fullscreen");s&&(s.textContent=document.fullscreenElement?"\u{1F5D7}":"\u26F6",s.classList.toggle("active",!!document.fullscreenElement))}),this.render(),requestAnimationFrame(s=>this.loop(s))}isHullUnlocked(t){return this.sandboxAllUnlocked||this.unlockedHulls.has(t)}isPartUnlocked(t){return this.sandboxAllUnlocked||this.unlockedParts.has(t)}async toggleFullscreen(){const t=document.documentElement,e=document,s=!!(document.fullscreenElement||e.webkitFullscreenElement);if(!!!(t.requestFullscreen||t.webkitRequestFullscreen)){this.toastMessage="\u{1F4F1} \u5171\u6709\u30E1\u30CB\u30E5\u30FC\u2192\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3067\u5168\u753B\u9762\u8868\u793A\u3067\u304D\u307E\u3059",this.render();return}try{s?document.exitFullscreen?await document.exitFullscreen():await e.webkitExitFullscreen?.():(t.requestFullscreen?await t.requestFullscreen({navigationUI:"hide"}):await t.webkitRequestFullscreen?.(),await screen.orientation?.lock?.("landscape").catch(()=>{}))}catch{this.toastMessage="\u{1F4F1} \u30D6\u30E9\u30A6\u30B6\u30E1\u30CB\u30E5\u30FC\u2192\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3067\u5168\u753B\u9762\u5316\u3067\u304D\u307E\u3059"}this.render()}tryAutoFullscreenOnMobile(){if(!window.matchMedia?.("(pointer: coarse)").matches||document.fullscreenElement)return;const e=document.documentElement;e.requestFullscreen?e.requestFullscreen({navigationUI:"hide"}).catch(()=>{}):e.webkitRequestFullscreen&&Promise.resolve(e.webkitRequestFullscreen()).catch(()=>{})}loop(t){if(this.animTime=t*.001,this.mode==="garage"&&this.previewCanvas){const e=this.previewCanvas.getContext("2d");if(e){const s=w(this.playerBp),a=A(e,this.previewCanvas.width,this.previewCanvas.height,this.playerBp,s.comLocal,this.selectedSlotId,this.animTime);this.previewSlotAreas=a.slotHitAreas}}else if(this.mode==="stages"&&this.enemyPreviewCanvas){const e=this.selectedStageNum<=v.length?v[this.selectedStageNum-1]:null,s=this.enemyPreviewCanvas.getContext("2d");s&&e&&P(s,this.enemyPreviewCanvas.width,this.enemyPreviewCanvas.height,e.blueprint,this.animTime)}else if(this.mode==="battle"&&this.arena&&this.battleCanvas){const e=this.arena.winner===null?this.battleSpeed:1;for(let a=0;a<e;a++)this.arena.step();const s=this.battleCanvas.getContext("2d");s&&M(s,this.arena),this.arena.winner!==null&&!this.resultShown&&this.arena.finishTimer>.32&&(this.resultShown=!0,this.handleBattleEnd(),this.renderBattleResultOverlay())}requestAnimationFrame(e=>this.loop(e))}handleBattleEnd(){if(!(!this.arena||this.isTestBattle)&&this.arena.winner===0){this.lastUnlockText=null;const t=this.currentEnemyStage;t.unlockPart&&!this.unlockedParts.has(t.unlockPart)&&(this.unlockedParts.add(t.unlockPart),this.lastUnlockText=`\u{1F381} \u300C${b[t.unlockPart].name}\u300D\u3092\u7372\u5F97\uFF01`),t.unlockHull&&!this.unlockedHulls.has(t.unlockHull)&&(this.unlockedHulls.add(t.unlockHull),this.lastUnlockText=`\u{1F6F8} \u65B0\u8266\u4F53\u300C${y[t.unlockHull].name}\u300D\u3092\u7372\u5F97\uFF01`),this.selectedStageNum>=this.maxUnlockedStage&&(this.maxUnlockedStage=this.selectedStageNum+1)}}selectHull(t){if(!this.isHullUnlocked(t))return;d.playClick();const e=y[t],s={},a=Object.values(this.playerBp.slots).filter(Boolean);let o=0;for(const n of e.slots){const u=a.findIndex(l=>{if(!l)return!1;const r=b[l.partId];return r.category===n.category&&o+r.energy<=e.maxEnergy});if(u>=0){const l=a.splice(u,1)[0];s[n.id]=l,o+=b[l.partId].energy}else s[n.id]=null}this.playerBp.hullId=t,this.playerBp.slots=s,this.selectedSlotId=e.slots[0]?.id??null,this.toastMessage=null,this.render()}equipPart(t){if(!this.isPartUnlocked(t))return;const e=b[t],s=y[this.playerBp.hullId];let a=s.slots.find(r=>r.id===this.selectedSlotId&&r.category===e.category);if(a||(a=s.slots.find(r=>r.category===e.category&&!this.playerBp.slots[r.id])??s.slots.find(r=>r.category===e.category)),!a){this.toastMessage="\u26A0\uFE0F \u5BFE\u5FDC\u30B9\u30ED\u30C3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093",this.render();return}const o=w(this.playerBp),n=this.playerBp.slots[a.id],u=n?b[n.partId].energy:0,l=o.usedEnergy-u+e.energy;if(l>s.maxEnergy){this.toastMessage=`\u26A1 \u96FB\u529B\u30AA\u30FC\u30D0\u30FC (${l}/${s.maxEnergy})`,this.render();return}d.playClick(),this.playerBp.slots[a.id]={partId:t,flipped:!1},this.selectedSlotId=a.id,this.toastMessage=null,this.render()}startBattle(t){d.unlock(),d.playClick(),this.tryAutoFullscreenOnMobile(),this.isTestBattle=t,this.resultShown=!1,this.lastUnlockText=null,t?this.currentEnemyStage=U:this.selectedStageNum<=v.length?this.currentEnemyStage=v[this.selectedStageNum-1]:this.currentEnemyStage=B(this.selectedStageNum),this.arena=new x(this.playerBp,this.currentEnemyStage.blueprint),this.mode="battle",this.render()}render(){const t=`
      <header class="top-bar">
        <div class="brand">
          <h1>\u{1F43E} NYARMADA</h1>
        </div>
        <div class="nav-switch">
          <button id="nav-garage" class="nav-btn ${this.mode==="garage"?"active":""}">\u{1F527} \u30AC\u30EC\u30FC\u30B8</button>
          <button id="nav-stages" class="nav-btn ${this.mode==="stages"?"active":""}">\u{1F5FA}\uFE0F \u30B9\u30C6\u30FC\u30B8</button>
        </div>
        <div class="header-actions">
          <button id="btn-fullscreen" class="btn-chip ${document.fullscreenElement?"active":""}" title="\u5168\u753B\u9762\u5207\u66FF">
            ${document.fullscreenElement?"\u{1F5D7}":"\u26F6"}
          </button>
          <button id="btn-sandbox" class="btn-chip ${this.sandboxAllUnlocked?"active":""}" title="\u5168\u30D1\u30FC\u30C4\u89E3\u653E">
            ${this.sandboxAllUnlocked?"\u{1F513} \u5168\u89E3\u653E":"\u{1F512} \u5168\u89E3\u653E"}
          </button>
          <button id="btn-mute" class="btn-chip ${d.muted?"":"active"}" title="\u30B5\u30A6\u30F3\u30C9">
            ${d.muted?"\u{1F507}":"\u{1F50A}"}
          </button>
        </div>
      </header>
    `,e=document.body.dataset.mode,s=[".panel-build",".panel-catalog",".catalog-grid",".panel-stage-list",".stage-grid"],a=s.map(o=>this.root.querySelector(o)?.scrollTop??0);document.body.dataset.mode=this.mode,this.mode==="garage"?(this.root.innerHTML=t+this.buildGarageHtml(),this.bindGarageEvents()):this.mode==="stages"?(this.root.innerHTML=t+this.buildStagesHtml(),this.bindStagesEvents()):(this.root.innerHTML=t+this.buildBattleHtml(),this.bindBattleEvents()),e===this.mode&&s.forEach((o,n)=>{const u=this.root.querySelector(o);u&&(u.scrollTop=a[n])}),document.getElementById("nav-garage")?.addEventListener("click",()=>{this.mode!=="garage"&&(d.playClick(),this.mode="garage",this.render())}),document.getElementById("nav-stages")?.addEventListener("click",()=>{this.mode!=="stages"&&(d.playClick(),this.mode="stages",this.stageInspected=null,this.render())}),document.getElementById("btn-sandbox")?.addEventListener("click",()=>{this.sandboxAllUnlocked=!this.sandboxAllUnlocked,d.playClick(),this.render()}),document.getElementById("btn-fullscreen")?.addEventListener("click",()=>{d.playClick(),this.toggleFullscreen()}),document.getElementById("btn-mute")?.addEventListener("click",()=>{d.muted=!d.muted,d.muted||d.playClick(),this.render()})}buildInspectorHtml(t,e,s){if(!t)return`<div class="inspector-box empty">${s}</div>`;if(t.kind==="hull"){const l=y[t.id],r=this.isHullUnlocked(l.id),i=l.id===this.playerBp.hullId;return`
        <div class="inspector-box">
          <div class="inspector-main">
            <div class="inspector-head">
              <strong>${l.name}</strong>
              <span class="energy-pill">\u2764\uFE0F${l.hp} \u26A1${l.maxEnergy}</span>
            </div>
            <p>${l.description}</p>
          </div>
          ${e&&r?`<button class="btn-equip" data-select-hull="${l.id}" ${i?"disabled":""}>${i?"\u4F7F\u7528\u4E2D":"\u4E57\u308A\u63DB\u3048"}</button>`:r?"":'<span class="intel-badge new">\u672A\u6240\u6301</span>'}
        </div>
      `}const a=b[t.id],o=this.isPartUnlocked(a.id),n=a.damage?`\u{1F4A5}${a.pelletCount?`${a.damage}\xD7${a.pelletCount}`:a.damage}`:a.shieldHp?`\u{1F6E1}\uFE0F${a.shieldHp}`:a.healPerSec?`\u{1F49A}+${a.healPerSec}/s`:a.cooldownBoost?`\u26A1+${Math.round(a.cooldownBoost*100)}%`:"",u=a.activeAbility?" \u{1F446}1\u56DE\u767A\u52D5":"";return`
      <div class="inspector-box">
        <div class="inspector-main">
          <div class="inspector-head">
            <strong>${a.name}</strong>
            <span class="energy-pill">\u26A1${a.energy}${n?` ${n}`:""}${u}</span>
          </div>
          <p>${a.description}</p>
        </div>
        ${e&&o?`<button class="btn-equip" data-equip-part="${a.id}">\u88C5\u7740</button>`:o?"":'<span class="intel-badge new">\u672A\u6240\u6301</span>'}
      </div>
    `}buildGarageHtml(){const t=y[this.playerBp.hullId],e=w(this.playerBp),s=t.slots.map(i=>{const c=this.playerBp.slots[i.id],p=c?b[c.partId]:null,k=i.category==="weapon"?"cat-weapon":i.category==="thruster"?"cat-thruster":"cat-gadget",$=i.category==="weapon"?"\u{1F52B}":i.category==="thruster"?"\u{1F525}":"\u{1F9F2}";return`
          <div class="slot-row ${this.selectedSlotId===i.id?"selected":""}" data-slot-id="${i.id}">
            <div class="slot-left">
              <span class="cat-badge ${k}">${$}</span>
              ${p?`<canvas class="slot-thumb" width="44" height="30" data-thumb-part="${p.id}" data-thumb-flipped="${c?.flipped?"1":"0"}"></canvas>`:""}
              <span class="slot-name">${p?p.name:'<span class="slot-empty">\u7A7A\u304D</span>'}</span>
              ${p?`<span class="slot-e">\u26A1${p.energy}</span>`:""}
            </div>
            <div class="slot-actions">
              ${p&&p.canFlip?`<button class="btn-mini ${c?.flipped?"flipped":""}" data-flip-slot="${i.id}" title="\u5411\u304D\u53CD\u8EE2">\u21C4</button>`:""}
              ${p?`<button class="btn-mini" data-clear-slot="${i.id}" title="\u5916\u3059">\u2715</button>`:""}
            </div>
          </div>
        `}).join(""),a=f.filter(i=>i.category==="weapon"&&this.isPartUnlocked(i.id)).length,o=f.filter(i=>i.category==="thruster"&&this.isPartUnlocked(i.id)).length,n=f.filter(i=>i.category==="gadget"&&this.isPartUnlocked(i.id)).length,u=S.filter(i=>this.isHullUnlocked(i.id)).length;let l="";if(this.activeTab==="hulls")l=S.filter(c=>this.isHullUnlocked(c.id)).map(c=>{const p=c.id===this.playerBp.hullId,k=this.inspected?.kind==="hull"&&this.inspected.id===c.id;return`
            <button class="tile-card ${p?"active-hull":""} ${k?"selected":""}" data-tile-hull="${c.id}">
              <canvas class="tile-thumb" width="64" height="42" data-thumb-hull="${c.id}"></canvas>
              <div class="tile-name">${c.name}</div>
              <div class="tile-meta">\u2764\uFE0F${c.hp} \u26A1${c.maxEnergy}</div>
            </button>
          `}).join("");else{const i=f.filter(c=>c.category===this.activeTab&&this.isPartUnlocked(c.id));i.length===0?l='<div class="catalog-empty">\u672A\u6240\u6301\uFF08\u6575\u3092\u5012\u3057\u3066\u7372\u5F97\uFF01\uFF09</div>':l=i.map(c=>`
              <button class="tile-card ${this.inspected?.kind==="part"&&this.inspected.id===c.id?"selected":""}" data-tile-part="${c.id}">
                <canvas class="tile-thumb" width="64" height="42" data-thumb-part="${c.id}"></canvas>
                <div class="tile-name">${c.name}</div>
                <div class="tile-meta">\u26A1${c.energy}${c.activeAbility?" \u{1F446}":""}</div>
              </button>
            `).join("")}const r=this.selectedStageNum<=g?`S${this.selectedStageNum}`:`\u221E${this.selectedStageNum-g}`;return`
      <div class="garage-grid">
        <section class="panel panel-build">
          <div class="build-head">
            <strong>${t.name}</strong>
            <div class="stats-inline">
              <span style="color:#4ade80;">\u2764\uFE0F${e.totalHp}</span>
              <span class="${e.usedEnergy===e.maxEnergy?"energy-full":"energy-ok"}">\u26A1${e.usedEnergy}/${e.maxEnergy}</span>
              <span style="color:#fb7185;">\u{1F4A5}${e.approxDps}</span>
              <span style="color:#cbd5e1;">\u2696\uFE0F${e.totalMass}</span>
            </div>
          </div>

          <div class="preview-wrap">
            <canvas id="garage-preview-canvas" class="preview-canvas" width="560" height="250"></canvas>
          </div>

          <div class="slot-list">
            ${s}
          </div>
          ${this.toastMessage?`<div class="toast-msg">${this.toastMessage}</div>`:""}
        </section>

        <section class="panel panel-catalog">
          <div class="catalog-top">
            <div class="tabs">
              <button class="tab-btn ${this.activeTab==="weapon"?"active":""}" data-tab="weapon">\u{1F52B}${a}</button>
              <button class="tab-btn ${this.activeTab==="thruster"?"active":""}" data-tab="thruster">\u{1F525}${o}</button>
              <button class="tab-btn ${this.activeTab==="gadget"?"active":""}" data-tab="gadget">\u{1F9F2}${n}</button>
              <button class="tab-btn ${this.activeTab==="hulls"?"active":""}" data-tab="hulls">\u{1F6F8}${u}</button>
            </div>

            <div class="catalog-grid">
              ${l}
            </div>

            ${this.buildInspectorHtml(this.inspected,!0,"\u30D1\u30FC\u30C4\u3092\u9078\u3076\u3068\u8AAC\u660E\u3092\u8868\u793A")}
          </div>

          <div class="garage-footer">
            <button id="btn-test-battle" class="btn-test">\u{1F9EA} \u6F14\u7FD2</button>
            <button id="btn-go-stages" class="btn-stage-link">\u{1F5FA}\uFE0F \u30B9\u30C6\u30FC\u30B8</button>
            <button id="btn-quick-battle" class="btn-battle">\u2694\uFE0F ${r} \u51FA\u6483</button>
          </div>
        </section>
      </div>
    `}buildStagesHtml(){const t=this.sandboxAllUnlocked?g:Math.min(g,this.maxUnlockedStage),e=this.sandboxAllUnlocked||this.maxUnlockedStage>g,s=v.slice(0,t).map(l=>{const r=this.selectedStageNum===l.stage,i=l.stage<this.maxUnlockedStage,c=l.unlockPart&&!this.unlockedParts.has(l.unlockPart)||l.unlockHull&&!this.unlockedHulls.has(l.unlockHull),p=l.isChallenge?'<span class="stage-dot challenge">\u2694\uFE0F</span>':c?'<span class="stage-dot reward">\u{1F381}</span>':i?'<span class="stage-dot cleared">\u2713</span>':"";return`
          <button class="stage-tile ${r?"selected":""} ${l.isChallenge?"is-challenge":""} ${i?"cleared":""}" data-pick-stage="${l.stage}">
            <div class="stage-tile-top">
              <span class="stage-num">S${l.stage}</span>
              ${p}
            </div>
            <div class="stage-pilot">${l.blueprint.pilotName}</div>
          </button>
        `}).join(""),a=Math.max(g+1,this.maxUnlockedStage),o=e?`
        <button class="stage-tile endless ${this.selectedStageNum>g?"selected":""}" data-pick-stage="${a}">
          <div class="stage-tile-top">
            <span class="stage-num">\u267E\uFE0F</span>
            <span class="stage-dot reward">\u221E</span>
          </div>
          <div class="stage-pilot">ENDLESS</div>
        </button>
      `:"",n=this.selectedStageNum<=v.length?v[this.selectedStageNum-1]:null;let u="";if(n){const l=n.blueprint,r=y[l.hullId],i=n.unlockHull===r.id&&!this.unlockedHulls.has(r.id),c=new Map;for(const h of Object.values(l.slots)){if(!h)continue;const m=`${h.partId}:${h.flipped?1:0}`,E=c.get(m);E?E.count++:c.set(m,{partId:h.partId,flipped:h.flipped,count:1})}const p=Array.from(c.values()).map(h=>{const m=b[h.partId],E=n.unlockPart===m.id&&!this.unlockedParts.has(m.id),T=this.stageInspected?.kind==="part"&&this.stageInspected.id===m.id;return`
            <button class="intel-chip ${E?"new-target":""} ${T?"active":""}" data-stage-inspect-part="${m.id}" title="${m.name}">
              <canvas class="intel-thumb" width="36" height="24" data-thumb-part="${m.id}" data-thumb-flipped="${h.flipped?"1":"0"}"></canvas>
              ${h.count>1?`<span class="intel-count">\xD7${h.count}</span>`:""}
              ${E?'<span class="intel-badge new">NEW</span>':""}
            </button>
          `}).join(""),k=this.stageInspected?.kind==="hull"&&this.stageInspected.id===r.id,$=n.isChallenge?'<span class="stage-type-pill challenge">\u2694\uFE0F \u5F37\u6575\u30C1\u30E3\u30EC\u30F3\u30B8</span>':'<span class="stage-type-pill unlock">\u{1F381} \u65B0\u88C5\u5099\u89E3\u653E</span>';u=`
        <div class="stage-detail-head">
          <strong>${n.title}</strong>
          ${$}
        </div>
        <div class="preview-wrap enemy-preview-wrap">
          <canvas id="enemy-preview-canvas" class="preview-canvas" width="520" height="210"></canvas>
        </div>
        <div class="intel-chips">
          <button class="intel-chip ${i?"new-target":""} ${k?"active":""}" data-stage-inspect-hull="${r.id}" title="${r.name}">
            <canvas class="intel-thumb" width="36" height="24" data-thumb-hull="${r.id}"></canvas>
            ${i?'<span class="intel-badge new">NEW</span>':""}
          </button>
          ${p}
        </div>
        ${this.buildInspectorHtml(this.stageInspected,!1,`\u5831\u916C\uFF1A${n.rewardText}\uFF08\u30A2\u30A4\u30B3\u30F3\u9078\u629E\u3067\u8A73\u7D30\uFF09`)}
      `}else u=`
        <div class="stage-detail-head">
          <strong>\u267E\uFE0F ENDLESS #${this.selectedStageNum-g}</strong>
          <span class="stage-type-pill unlock">\u30E9\u30F3\u30C0\u30E0\u6226</span>
        </div>
        <div class="inspector-box empty">\u5168\u30D1\u30FC\u30C4\u89E3\u7981\u30FB\u30E9\u30F3\u30C0\u30E0\u7DE8\u6210\u306E\u6575\u3068\u9023\u6226\uFF01</div>
      `;return`
      <div class="garage-grid stages-grid">
        <section class="panel panel-stage-list">
          <div class="build-head">
            <strong>\u30B9\u30C6\u30FC\u30B8\u9078\u629E</strong>
            <span class="energy-pill">${Math.min(this.maxUnlockedStage-1,g)} / ${g} \u30AF\u30EA\u30A2</span>
          </div>
          <div class="stage-grid">
            ${s}
            ${o}
          </div>
        </section>

        <section class="panel panel-stage-detail">
          <div class="stage-detail-top">
            ${u}
          </div>
          <div class="launch-buttons">
            <button id="btn-stage-to-garage" class="btn-test">\u{1F527} \u7DE8\u6210\u3059\u308B</button>
            <button id="btn-stage-battle" class="btn-battle">\u2694\uFE0F \u51FA\u6483\uFF01</button>
          </div>
        </section>
      </div>
    `}bindGarageEvents(){this.previewCanvas=document.getElementById("garage-preview-canvas"),document.querySelectorAll("[data-thumb-part]").forEach(t=>{const e=t.dataset.thumbPart,s=t.dataset.thumbFlipped==="1";H(t,e,s)}),document.querySelectorAll("[data-thumb-hull]").forEach(t=>{const e=t.dataset.thumbHull;I(t,e)}),this.previewCanvas?.addEventListener("click",t=>{if(!this.previewCanvas)return;const e=this.previewCanvas.getBoundingClientRect(),s=this.previewCanvas.width/e.width,a=this.previewCanvas.height/e.height,o=(t.clientX-e.left)*s,n=(t.clientY-e.top)*a;for(const u of this.previewSlotAreas)if(Math.hypot(o-u.sx,n-u.sy)<=u.r){d.playClick(),this.selectedSlotId=u.slot.id,this.activeTab=u.slot.category;const l=this.playerBp.slots[u.slot.id];l&&(this.inspected={kind:"part",id:l.partId}),this.toastMessage=null,this.render();break}}),document.querySelectorAll("[data-slot-id]").forEach(t=>{t.addEventListener("click",e=>{if(e.target.closest("button"))return;const s=t.dataset.slotId,o=y[this.playerBp.hullId].slots.find(n=>n.id===s);if(o){d.playClick(),this.selectedSlotId=s,this.activeTab=o.category;const n=this.playerBp.slots[s];n&&(this.inspected={kind:"part",id:n.partId}),this.toastMessage=null,this.render()}})}),document.querySelectorAll("[data-flip-slot]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const s=t.dataset.flipSlot,a=this.playerBp.slots[s];a&&(d.playClick(),a.flipped=!a.flipped,this.render())})}),document.querySelectorAll("[data-clear-slot]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const s=t.dataset.clearSlot;d.playClick(),this.playerBp.slots[s]=null,this.toastMessage=null,this.render()})}),document.querySelectorAll("[data-tab]").forEach(t=>{t.addEventListener("click",()=>{if(d.playClick(),this.activeTab=t.dataset.tab,this.activeTab==="hulls")this.inspected={kind:"hull",id:this.playerBp.hullId};else{const e=f.find(s=>s.category===this.activeTab&&this.isPartUnlocked(s.id));this.inspected=e?{kind:"part",id:e.id}:null}this.render()})}),document.querySelectorAll("[data-tile-part]").forEach(t=>{t.addEventListener("click",()=>{const e=t.dataset.tilePart;this.inspected?.kind==="part"&&this.inspected.id===e?this.equipPart(e):(d.playClick(),this.inspected={kind:"part",id:e},this.toastMessage=null,this.render())})}),document.querySelectorAll("[data-tile-hull]").forEach(t=>{t.addEventListener("click",()=>{const e=t.dataset.tileHull;this.inspected?.kind==="hull"&&this.inspected.id===e?this.selectHull(e):(d.playClick(),this.inspected={kind:"hull",id:e},this.toastMessage=null,this.render())})}),document.querySelectorAll("[data-select-hull]").forEach(t=>{t.addEventListener("click",()=>{this.selectHull(t.dataset.selectHull)})}),document.querySelectorAll("[data-equip-part]").forEach(t=>{t.addEventListener("click",()=>{this.equipPart(t.dataset.equipPart)})}),document.getElementById("btn-test-battle")?.addEventListener("click",()=>{this.startBattle(!0)}),document.getElementById("btn-go-stages")?.addEventListener("click",()=>{d.playClick(),this.mode="stages",this.stageInspected=null,this.render()}),document.getElementById("btn-quick-battle")?.addEventListener("click",()=>{this.startBattle(!1)})}bindStagesEvents(){this.enemyPreviewCanvas=document.getElementById("enemy-preview-canvas"),document.querySelectorAll("[data-thumb-part]").forEach(t=>{const e=t.dataset.thumbPart,s=t.dataset.thumbFlipped==="1";H(t,e,s)}),document.querySelectorAll("[data-thumb-hull]").forEach(t=>{const e=t.dataset.thumbHull;I(t,e)}),document.querySelectorAll("[data-pick-stage]").forEach(t=>{t.addEventListener("click",()=>{d.playClick(),this.selectedStageNum=Number(t.dataset.pickStage),this.stageInspected=null,this.render()})}),document.querySelectorAll("[data-stage-inspect-part]").forEach(t=>{t.addEventListener("click",()=>{d.playClick(),this.stageInspected={kind:"part",id:t.dataset.stageInspectPart},this.render()})}),document.querySelectorAll("[data-stage-inspect-hull]").forEach(t=>{t.addEventListener("click",()=>{d.playClick(),this.stageInspected={kind:"hull",id:t.dataset.stageInspectHull},this.render()})}),document.getElementById("btn-stage-to-garage")?.addEventListener("click",()=>{d.playClick(),this.mode="garage",this.render()}),document.getElementById("btn-stage-battle")?.addEventListener("click",()=>{this.startBattle(!1)})}buildBattleHtml(){const t=(this.arena?.ships[0].activeSlots??[]).filter(e=>!!e.part.activeAbility).map(e=>{const s=e.part.activeLabel??e.part.name;return`<button class="btn-tactical ${e.activeUsed?"used":""}" data-trigger-slot="${e.slot.id}" ${e.activeUsed?"disabled":""}>${e.activeUsed?"\u4F7F\u7528\u6E08":s}</button>`}).join("");return`
      <section class="battle-wrapper" id="battle-wrapper">
        <canvas
          id="battle-canvas"
          class="battle-canvas"
          width="${L}"
          height="${C}"
        ></canvas>

        <div class="battle-controls">
          <div style="font-weight:800;color:#fde047;">
            ${this.currentEnemyStage.title}
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${t}
            <button id="btn-speed" class="btn-chip ${this.battleSpeed===2?"active":""}">
              \u23E9 ${this.battleSpeed}x
            </button>
            <button id="btn-retry" class="btn-chip">\u{1F504} \u518D\u6226</button>
            <button id="btn-back-garage" class="btn-chip" style="border-color:#38bdf8;color:#7dd3fc;">
              \u{1F527} \u623B\u308B
            </button>
          </div>
        </div>
      </section>
    `}bindBattleEvents(){this.battleCanvas=document.getElementById("battle-canvas"),document.querySelectorAll("[data-trigger-slot]").forEach(t=>{t.addEventListener("click",()=>{if(!this.arena)return;const e=t.dataset.triggerSlot;this.arena.triggerPlayerSlotAbility(e)&&(t.disabled=!0,t.classList.add("used"),t.textContent="\u4F7F\u7528\u6E08")})}),document.getElementById("btn-speed")?.addEventListener("click",()=>{d.playClick(),this.battleSpeed=this.battleSpeed===1?2:1;const t=document.getElementById("btn-speed");t&&(t.textContent=`\u23E9 ${this.battleSpeed}x`,t.classList.toggle("active",this.battleSpeed===2))}),document.getElementById("btn-retry")?.addEventListener("click",()=>{this.startBattle(this.isTestBattle)}),document.getElementById("btn-back-garage")?.addEventListener("click",()=>{d.playClick(),this.mode="garage",this.arena=null,this.render()})}renderBattleResultOverlay(){const t=document.getElementById("battle-wrapper");if(!t||!this.arena)return;const e=this.arena.winner===0,s=this.arena.winner==="draw",a=e?"\u{1F389} VICTORY!":s?"\u{1F4A5} DRAW":"\u{1F63F} DEFEAT",o=e?"#facc15":s?"#38bdf8":"#f43f5e",n=document.createElement("div");n.className="result-overlay",n.innerHTML=`
      <div class="result-box">
        <h2 style="color:${o};">${a}</h2>
        ${this.lastUnlockText?`<div class="unlock-banner">${this.lastUnlockText}</div>`:""}
        <div class="result-actions">
          <button id="res-garage" class="btn-chip" style="padding:10px 14px;">\u{1F527} \u30AC\u30EC\u30FC\u30B8</button>
          <button id="res-stages" class="btn-chip" style="padding:10px 14px;">\u{1F5FA}\uFE0F \u30B9\u30C6\u30FC\u30B8</button>
          <button id="res-retry" class="btn-chip" style="padding:10px 14px;">\u{1F504} \u518D\u6226</button>
          ${e&&!this.isTestBattle?'<button id="res-next" class="btn-battle" style="padding:10px 16px;font-size:0.9rem;">\u23ED\uFE0F \u6B21\u3078</button>':""}
        </div>
      </div>
    `,t.appendChild(n),document.getElementById("res-garage")?.addEventListener("click",()=>{d.playClick(),this.mode="garage",this.arena=null,e&&!this.isTestBattle&&(this.selectedStageNum=this.maxUnlockedStage),this.render()}),document.getElementById("res-stages")?.addEventListener("click",()=>{d.playClick(),this.mode="stages",this.arena=null,this.stageInspected=null,e&&!this.isTestBattle&&(this.selectedStageNum=this.maxUnlockedStage),this.render()}),document.getElementById("res-retry")?.addEventListener("click",()=>{this.startBattle(this.isTestBattle)}),document.getElementById("res-next")?.addEventListener("click",()=>{this.selectedStageNum++,this.startBattle(!1)})}}export{Q as GameApp};