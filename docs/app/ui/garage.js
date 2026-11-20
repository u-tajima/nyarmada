import{ENEMY_STAGES as k,generateRandomEnemy as x,TOTAL_CAMPAIGN_STAGES as I}from"../data/enemies.js";import{HULL_LIST as S,HULLS as b}from"../data/hulls.js";import{PART_LIST as y,PARTS as v}from"../data/parts.js";import{ARENA_HEIGHT as L,ARENA_WIDTH as C,BattleArena as A}from"../physics/arena.js";import{computeBlueprintStats as w}from"../physics/shipBody.js";import{sound as n}from"../render/audio.js";import{renderBattleArena as P,renderGaragePreview as M,renderHullThumbnail as q,renderPartThumbnail as U}from"../render/renderer.js";const N={stage:0,title:"\u30C6\u30B9\u30C8\u6F14\u7FD2",tagline:"\u6B66\u88C5\u306A\u3057\u306E\u30BF\u30FC\u30B2\u30C3\u30C8\u8266",rewardText:"\u30C6\u30B9\u30C8\u6F14\u7FD2",blueprint:{name:"\u30C0\u30DF\u30FC\u6A19\u7684\u8266",pilotName:"\u30ED\u30DC\u30CB\u30E3\u30F3",catColor:"#94a3b8",hullId:"titan",slots:{w1:null,w2:null,t1:null,g1:{partId:"shield",flipped:!1},g2:null}}},F={name:"\u30B9\u30BF\u30FC\u30FB\u30BF\u30DE\u53F7",pilotName:"\u30BF\u30DE\u8266\u9577",catColor:"#fbbf24",hullId:"cruiser",slots:{w1:{partId:"rocket",flipped:!1},w2:null,t1:{partId:"thruster",flipped:!1},g1:null}};class tt{root;mode="garage";unlockedHulls=new Set(S.filter(t=>t.unlockedByDefault).map(t=>t.id));unlockedParts=new Set(y.filter(t=>t.unlockedByDefault).map(t=>t.id));sandboxAllUnlocked=!1;maxUnlockedStage=1;selectedStageNum=1;currentEnemyStage=k[0];isTestBattle=!1;playerBp=structuredClone(F);selectedSlotId="w2";activeTab="weapon";inspected={kind:"part",id:"rocket"};toastMessage=null;arena=null;battleSpeed=1;resultShown=!1;lastUnlockText=null;previewCanvas=null;battleCanvas=null;previewSlotAreas=[];animTime=0;constructor(t){this.root=t;const e=()=>{n.unlock(),window.removeEventListener("pointerdown",e)};window.addEventListener("pointerdown",e),document.addEventListener("fullscreenchange",()=>{const s=document.getElementById("btn-fullscreen");s&&(s.textContent=document.fullscreenElement?"\u{1F5D7}":"\u26F6",s.classList.toggle("active",!!document.fullscreenElement))}),this.render(),requestAnimationFrame(s=>this.loop(s))}isHullUnlocked(t){return this.sandboxAllUnlocked||this.unlockedHulls.has(t)}isPartUnlocked(t){return this.sandboxAllUnlocked||this.unlockedParts.has(t)}async toggleFullscreen(){const t=document.documentElement,e=document,s=!!(document.fullscreenElement||e.webkitFullscreenElement);if(!!!(t.requestFullscreen||t.webkitRequestFullscreen)){this.toastMessage="\u{1F4F1} \u5171\u6709\u30E1\u30CB\u30E5\u30FC\u2192\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3067\u5168\u753B\u9762\u8868\u793A\u3067\u304D\u307E\u3059",this.render();return}try{s?document.exitFullscreen?await document.exitFullscreen():await e.webkitExitFullscreen?.():(t.requestFullscreen?await t.requestFullscreen({navigationUI:"hide"}):await t.webkitRequestFullscreen?.(),await screen.orientation.lock?.("landscape").catch(()=>{}))}catch{this.toastMessage="\u{1F4F1} \u30D6\u30E9\u30A6\u30B6\u30E1\u30CB\u30E5\u30FC\u2192\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3067\u5168\u753B\u9762\u5316\u3067\u304D\u307E\u3059"}this.render()}tryAutoFullscreenOnMobile(){if(!window.matchMedia?.("(pointer: coarse)").matches||document.fullscreenElement)return;const e=document.documentElement;e.requestFullscreen?e.requestFullscreen({navigationUI:"hide"}).catch(()=>{}):e.webkitRequestFullscreen&&e.webkitRequestFullscreen().catch(()=>{})}loop(t){if(this.animTime=t*.001,this.mode==="garage"&&this.previewCanvas){const e=this.previewCanvas.getContext("2d");if(e){const s=w(this.playerBp),a=M(e,this.previewCanvas.width,this.previewCanvas.height,this.playerBp,s.comLocal,this.selectedSlotId,this.animTime);this.previewSlotAreas=a.slotHitAreas}}else if(this.mode==="battle"&&this.arena&&this.battleCanvas){const e=this.arena.winner===null?this.battleSpeed:1;for(let a=0;a<e;a++)this.arena.step();const s=this.battleCanvas.getContext("2d");s&&P(s,this.arena),this.arena.winner!==null&&!this.resultShown&&this.arena.finishTimer>.32&&(this.resultShown=!0,this.handleBattleEnd(),this.renderBattleResultOverlay())}requestAnimationFrame(e=>this.loop(e))}handleBattleEnd(){if(!(!this.arena||this.isTestBattle)&&this.arena.winner===0){this.lastUnlockText=null;const t=this.currentEnemyStage;t.unlockPart&&!this.unlockedParts.has(t.unlockPart)&&(this.unlockedParts.add(t.unlockPart),this.lastUnlockText=`\u{1F381} \u300C${v[t.unlockPart].name}\u300D\u3092\u7372\u5F97\uFF01`),t.unlockHull&&!this.unlockedHulls.has(t.unlockHull)&&(this.unlockedHulls.add(t.unlockHull),this.lastUnlockText=`\u{1F6F8} \u65B0\u8266\u4F53\u300C${b[t.unlockHull].name}\u300D\u3092\u7372\u5F97\uFF01`),this.selectedStageNum>=this.maxUnlockedStage&&(this.maxUnlockedStage=this.selectedStageNum+1)}}selectHull(t){if(!this.isHullUnlocked(t))return;n.playClick();const e=b[t],s={},a=Object.values(this.playerBp.slots).filter(Boolean);let c=0;for(const d of e.slots){const r=a.findIndex(u=>{const p=v[u.partId];return p.category===d.category&&c+p.energy<=e.maxEnergy});if(r>=0){const u=a.splice(r,1)[0];s[d.id]=u,c+=v[u.partId].energy}else s[d.id]=null}this.playerBp.hullId=t,this.playerBp.slots=s,this.selectedSlotId=e.slots[0]?.id??null,this.toastMessage=null,this.render()}equipPart(t){if(!this.isPartUnlocked(t))return;const e=v[t],s=b[this.playerBp.hullId];let a=s.slots.find(p=>p.id===this.selectedSlotId&&p.category===e.category);if(a||(a=s.slots.find(p=>p.category===e.category&&!this.playerBp.slots[p.id])??s.slots.find(p=>p.category===e.category)),!a){this.toastMessage="\u26A0\uFE0F \u5BFE\u5FDC\u30B9\u30ED\u30C3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093",this.render();return}const c=w(this.playerBp),d=this.playerBp.slots[a.id],r=d?v[d.partId].energy:0,u=c.usedEnergy-r+e.energy;if(u>s.maxEnergy){this.toastMessage=`\u26A1 \u96FB\u529B\u30AA\u30FC\u30D0\u30FC (${u}/${s.maxEnergy})`,this.render();return}n.playClick(),this.playerBp.slots[a.id]={partId:t,flipped:!1},this.selectedSlotId=a.id,this.toastMessage=null,this.render()}startBattle(t){n.unlock(),n.playClick(),this.tryAutoFullscreenOnMobile(),this.isTestBattle=t,this.resultShown=!1,this.lastUnlockText=null,t?this.currentEnemyStage=N:this.selectedStageNum<=k.length?this.currentEnemyStage=k[this.selectedStageNum-1]:this.currentEnemyStage=x(this.selectedStageNum),this.arena=new A(this.playerBp,this.currentEnemyStage.blueprint),this.mode="battle",this.render()}render(){const t=`
      <header class="top-bar">
        <div class="brand">
          <h1>\u{1F43E} NYARMADA</h1>
        </div>
        <div class="header-actions">
          <button id="btn-fullscreen" class="btn-chip ${document.fullscreenElement?"active":""}" title="\u5168\u753B\u9762\u5207\u66FF">
            ${document.fullscreenElement?"\u{1F5D7}":"\u26F6"}
          </button>
          <button id="btn-sandbox" class="btn-chip ${this.sandboxAllUnlocked?"active":""}" title="\u5168\u30D1\u30FC\u30C4\u89E3\u653E">
            ${this.sandboxAllUnlocked?"\u{1F513} \u5168\u89E3\u653E":"\u{1F512} \u5168\u89E3\u653E"}
          </button>
          <button id="btn-mute" class="btn-chip ${n.muted?"":"active"}" title="\u30B5\u30A6\u30F3\u30C9">
            ${n.muted?"\u{1F507}":"\u{1F50A}"}
          </button>
        </div>
      </header>
    `;if(this.mode==="garage"){const e=[".panel-build",".panel-catalog",".catalog-grid"],s=e.map(c=>this.root.querySelector(c)?.scrollTop??0),a=document.body.dataset.mode==="garage";document.body.dataset.mode="garage",this.root.innerHTML=t+this.buildGarageHtml(),a&&e.forEach((c,d)=>{const r=this.root.querySelector(c);r&&(r.scrollTop=s[d])}),this.bindGarageEvents()}else document.body.dataset.mode="battle",this.root.innerHTML=t+this.buildBattleHtml(),this.bindBattleEvents();document.getElementById("btn-sandbox")?.addEventListener("click",()=>{this.sandboxAllUnlocked=!this.sandboxAllUnlocked,n.playClick(),this.render()}),document.getElementById("btn-fullscreen")?.addEventListener("click",()=>{n.playClick(),this.toggleFullscreen()}),document.getElementById("btn-mute")?.addEventListener("click",()=>{n.muted=!n.muted,n.muted||n.playClick(),this.render()})}buildInspectorHtml(){if(!this.inspected)return'<div class="inspector-box empty">\u30D1\u30FC\u30C4\u3092\u9078\u3076\u3068\u8AAC\u660E\u3092\u8868\u793A</div>';if(this.inspected.kind==="hull"){const a=b[this.inspected.id],c=this.isHullUnlocked(a.id),d=a.id===this.playerBp.hullId;return`
        <div class="inspector-box">
          <div class="inspector-main">
            <div class="inspector-head">
              <strong>${a.name}</strong>
              <span class="energy-pill">\u2764\uFE0F${a.hp} \u26A1${a.maxEnergy}</span>
            </div>
            <p>${a.description}</p>
          </div>
          ${c?`<button class="btn-equip" data-select-hull="${a.id}" ${d?"disabled":""}>${d?"\u4F7F\u7528\u4E2D":"\u4E57\u308A\u63DB\u3048"}</button>`:'<span class="intel-badge new">\u672A\u6240\u6301</span>'}
        </div>
      `}const t=v[this.inspected.id],e=this.isPartUnlocked(t.id),s=t.damage?`\u{1F4A5}${t.pelletCount?`${t.damage}\xD7${t.pelletCount}`:t.damage}`:t.shieldHp?`\u{1F6E1}\uFE0F${t.shieldHp}`:t.healPerSec?`\u{1F49A}+${t.healPerSec}/s`:t.cooldownBoost?`\u26A1+${Math.round(t.cooldownBoost*100)}%`:"";return`
      <div class="inspector-box">
        <div class="inspector-main">
          <div class="inspector-head">
            <strong>${t.name}</strong>
            <span class="energy-pill">\u26A1${t.energy}${s?` ${s}`:""}</span>
          </div>
          <p>${t.description}</p>
        </div>
        ${e?`<button class="btn-equip" data-equip-part="${t.id}">\u88C5\u7740</button>`:'<span class="intel-badge new">\u672A\u6240\u6301</span>'}
      </div>
    `}buildGarageHtml(){const t=b[this.playerBp.hullId],e=w(this.playerBp),s=this.selectedStageNum<=k.length?k[this.selectedStageNum-1]:null,a=s?`${s.stage}/${I} ${s.blueprint.pilotName}`:`ENDLESS #${this.selectedStageNum-I}`;let c="";if(s){const i=s.blueprint,l=b[i.hullId],o=s.unlockHull===l.id&&!this.unlockedHulls.has(l.id),g=new Map;for(const h of Object.values(i.slots)){if(!h)continue;const m=`${h.partId}:${h.flipped?1:0}`,f=g.get(m);f?f.count++:g.set(m,{partId:h.partId,flipped:h.flipped,count:1})}const $=Array.from(g.values()).map(h=>{const m=v[h.partId],f=s.unlockPart===m.id&&!this.unlockedParts.has(m.id),H=this.inspected?.kind==="part"&&this.inspected.id===m.id;return`
            <button class="intel-chip ${f?"new-target":""} ${H?"active":""}" data-inspect-part="${m.id}" title="${m.name}">
              <canvas class="intel-thumb" width="36" height="24" data-thumb-part="${m.id}" data-thumb-flipped="${h.flipped?"1":"0"}"></canvas>
              ${h.count>1?`<span class="intel-count">\xD7${h.count}</span>`:""}
              ${f?'<span class="intel-badge new">NEW</span>':""}
            </button>
          `}).join(""),B=this.inspected?.kind==="hull"&&this.inspected.id===l.id;c=`
        <div class="intel-chips">
          <button class="intel-chip ${o?"new-target":""} ${B?"active":""}" data-inspect-hull="${l.id}" title="${l.name}">
            <canvas class="intel-thumb" width="36" height="24" data-thumb-hull="${l.id}"></canvas>
            ${o?'<span class="intel-badge new">NEW</span>':""}
          </button>
          ${$}
        </div>
      `}const d=t.slots.map(i=>{const l=this.playerBp.slots[i.id],o=l?v[l.partId]:null,g=i.category==="weapon"?"cat-weapon":i.category==="thruster"?"cat-thruster":"cat-gadget",$=i.category==="weapon"?"\u{1F52B}":i.category==="thruster"?"\u{1F525}":"\u{1F9F2}";return`
          <div class="slot-row ${this.selectedSlotId===i.id?"selected":""}" data-slot-id="${i.id}">
            <div class="slot-left">
              <span class="cat-badge ${g}">${$}</span>
              ${o?`<canvas class="slot-thumb" width="44" height="30" data-thumb-part="${o.id}" data-thumb-flipped="${l?.flipped?"1":"0"}"></canvas>`:""}
              <span class="slot-name">${o?o.name:'<span class="slot-empty">\u7A7A\u304D</span>'}</span>
              ${o?`<span class="slot-e">\u26A1${o.energy}</span>`:""}
            </div>
            <div class="slot-actions">
              ${o&&o.canFlip?`<button class="btn-mini ${l?.flipped?"flipped":""}" data-flip-slot="${i.id}" title="\u5411\u304D\u53CD\u8EE2">\u21C4</button>`:""}
              ${o?`<button class="btn-mini" data-clear-slot="${i.id}" title="\u5916\u3059">\u2715</button>`:""}
            </div>
          </div>
        `}).join(""),r=y.filter(i=>i.category==="weapon"&&this.isPartUnlocked(i.id)).length,u=y.filter(i=>i.category==="thruster"&&this.isPartUnlocked(i.id)).length,p=y.filter(i=>i.category==="gadget"&&this.isPartUnlocked(i.id)).length,T=S.filter(i=>this.isHullUnlocked(i.id)).length;let E="";if(this.activeTab==="hulls")E=S.filter(l=>this.isHullUnlocked(l.id)).map(l=>{const o=l.id===this.playerBp.hullId,g=this.inspected?.kind==="hull"&&this.inspected.id===l.id;return`
            <button class="tile-card ${o?"active-hull":""} ${g?"selected":""}" data-tile-hull="${l.id}">
              <canvas class="tile-thumb" width="64" height="42" data-thumb-hull="${l.id}"></canvas>
              <div class="tile-name">${l.name}</div>
              <div class="tile-meta">\u2764\uFE0F${l.hp} \u26A1${l.maxEnergy}</div>
            </button>
          `}).join("");else{const i=y.filter(l=>l.category===this.activeTab&&this.isPartUnlocked(l.id));i.length===0?E='<div class="catalog-empty">\u672A\u6240\u6301\uFF08\u6575\u3092\u5012\u3057\u3066\u7372\u5F97\uFF01\uFF09</div>':E=i.map(l=>`
              <button class="tile-card ${this.inspected?.kind==="part"&&this.inspected.id===l.id?"selected":""}" data-tile-part="${l.id}">
                <canvas class="tile-thumb" width="64" height="42" data-thumb-part="${l.id}"></canvas>
                <div class="tile-name">${l.name}</div>
                <div class="tile-meta">\u26A1${l.energy}</div>
              </button>
            `).join("")}return`
      <div class="garage-grid">
        <!-- \u5DE6\u30AB\u30E9\u30E0\uFF1A\u81EA\u8266\u30D7\u30EC\u30D3\u30E5\u30FC\uFF06\u30B9\u30ED\u30C3\u30C8 -->
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
            ${d}
          </div>
          ${this.toastMessage?`<div class="toast-msg">${this.toastMessage}</div>`:""}
        </section>

        <!-- \u53F3\u30AB\u30E9\u30E0\uFF1A\u6240\u6301\u30D1\u30FC\u30C4\uFF06\u51FA\u6483 -->
        <section class="panel panel-catalog">
          <div class="catalog-top">
            <div class="tabs">
              <button class="tab-btn ${this.activeTab==="weapon"?"active":""}" data-tab="weapon">\u{1F52B}${r}</button>
              <button class="tab-btn ${this.activeTab==="thruster"?"active":""}" data-tab="thruster">\u{1F525}${u}</button>
              <button class="tab-btn ${this.activeTab==="gadget"?"active":""}" data-tab="gadget">\u{1F9F2}${p}</button>
              <button class="tab-btn ${this.activeTab==="hulls"?"active":""}" data-tab="hulls">\u{1F6F8}${T}</button>
            </div>

            <div class="catalog-grid">
              ${E}
            </div>

            ${this.buildInspectorHtml()}
          </div>

          <div class="stage-card">
            <div class="stage-nav">
              <button id="btn-prev-stage" class="btn-mini" ${this.selectedStageNum<=1?"disabled":""}>\u25C0</button>
              <div class="stage-title">${a}</div>
              <button id="btn-next-stage" class="btn-mini" ${this.selectedStageNum>=this.maxUnlockedStage&&!this.sandboxAllUnlocked?"disabled":""}>\u25B6</button>
            </div>
            ${c}
            <div class="launch-buttons">
              <button id="btn-test-battle" class="btn-test">\u{1F9EA} \u6F14\u7FD2</button>
              <button id="btn-start-battle" class="btn-battle">\u2694\uFE0F \u51FA\u6483\uFF01</button>
            </div>
          </div>
        </section>
      </div>
    `}bindGarageEvents(){this.previewCanvas=document.getElementById("garage-preview-canvas"),document.querySelectorAll("[data-thumb-part]").forEach(t=>{const e=t.dataset.thumbPart,s=t.dataset.thumbFlipped==="1";U(t,e,s)}),document.querySelectorAll("[data-thumb-hull]").forEach(t=>{const e=t.dataset.thumbHull;q(t,e)}),this.previewCanvas?.addEventListener("click",t=>{if(!this.previewCanvas)return;const e=this.previewCanvas.getBoundingClientRect(),s=this.previewCanvas.width/e.width,a=this.previewCanvas.height/e.height,c=(t.clientX-e.left)*s,d=(t.clientY-e.top)*a;for(const r of this.previewSlotAreas)if(Math.hypot(c-r.sx,d-r.sy)<=r.r){n.playClick(),this.selectedSlotId=r.slot.id,this.activeTab=r.slot.category;const u=this.playerBp.slots[r.slot.id];u&&(this.inspected={kind:"part",id:u.partId}),this.toastMessage=null,this.render();break}}),document.querySelectorAll("[data-slot-id]").forEach(t=>{t.addEventListener("click",e=>{if(e.target.closest("button"))return;const a=t.dataset.slotId,d=b[this.playerBp.hullId].slots.find(r=>r.id===a);if(d){n.playClick(),this.selectedSlotId=a,this.activeTab=d.category;const r=this.playerBp.slots[a];r&&(this.inspected={kind:"part",id:r.partId}),this.toastMessage=null,this.render()}})}),document.querySelectorAll("[data-flip-slot]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const s=t.dataset.flipSlot,a=this.playerBp.slots[s];a&&(n.playClick(),a.flipped=!a.flipped,this.render())})}),document.querySelectorAll("[data-clear-slot]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const s=t.dataset.clearSlot;n.playClick(),this.playerBp.slots[s]=null,this.toastMessage=null,this.render()})}),document.querySelectorAll("[data-tab]").forEach(t=>{t.addEventListener("click",()=>{if(n.playClick(),this.activeTab=t.dataset.tab,this.activeTab==="hulls")this.inspected={kind:"hull",id:this.playerBp.hullId};else{const e=y.find(s=>s.category===this.activeTab&&this.isPartUnlocked(s.id));this.inspected=e?{kind:"part",id:e.id}:null}this.render()})}),document.querySelectorAll("[data-tile-part]").forEach(t=>{t.addEventListener("click",()=>{const e=t.dataset.tilePart;this.inspected?.kind==="part"&&this.inspected.id===e?this.equipPart(e):(n.playClick(),this.inspected={kind:"part",id:e},this.toastMessage=null,this.render())})}),document.querySelectorAll("[data-tile-hull]").forEach(t=>{t.addEventListener("click",()=>{const e=t.dataset.tileHull;this.inspected?.kind==="hull"&&this.inspected.id===e?this.selectHull(e):(n.playClick(),this.inspected={kind:"hull",id:e},this.toastMessage=null,this.render())})}),document.querySelectorAll("[data-inspect-part]").forEach(t=>{t.addEventListener("click",()=>{n.playClick(),this.inspected={kind:"part",id:t.dataset.inspectPart},this.render()})}),document.querySelectorAll("[data-inspect-hull]").forEach(t=>{t.addEventListener("click",()=>{n.playClick(),this.inspected={kind:"hull",id:t.dataset.inspectHull},this.render()})}),document.querySelectorAll("[data-select-hull]").forEach(t=>{t.addEventListener("click",()=>{this.selectHull(t.dataset.selectHull)})}),document.querySelectorAll("[data-equip-part]").forEach(t=>{t.addEventListener("click",()=>{this.equipPart(t.dataset.equipPart)})}),document.getElementById("btn-prev-stage")?.addEventListener("click",()=>{this.selectedStageNum>1&&(n.playClick(),this.selectedStageNum--,this.render())}),document.getElementById("btn-next-stage")?.addEventListener("click",()=>{n.playClick(),this.selectedStageNum++,this.render()}),document.getElementById("btn-test-battle")?.addEventListener("click",()=>{this.startBattle(!0)}),document.getElementById("btn-start-battle")?.addEventListener("click",()=>{this.startBattle(!1)})}buildBattleHtml(){return`
      <section class="battle-wrapper" id="battle-wrapper">
        <canvas
          id="battle-canvas"
          class="battle-canvas"
          width="${C}"
          height="${L}"
        ></canvas>

        <div class="battle-controls">
          <div style="font-weight:800;color:#fde047;">
            ${this.currentEnemyStage.title}
          </div>
          <div style="display:flex;gap:8px;">
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
    `}bindBattleEvents(){this.battleCanvas=document.getElementById("battle-canvas"),document.getElementById("btn-speed")?.addEventListener("click",()=>{n.playClick(),this.battleSpeed=this.battleSpeed===1?2:1;const t=document.getElementById("btn-speed");t&&(t.textContent=`\u23E9 ${this.battleSpeed}x`,t.classList.toggle("active",this.battleSpeed===2))}),document.getElementById("btn-retry")?.addEventListener("click",()=>{this.startBattle(this.isTestBattle)}),document.getElementById("btn-back-garage")?.addEventListener("click",()=>{n.playClick(),this.mode="garage",this.arena=null,this.render()})}renderBattleResultOverlay(){const t=document.getElementById("battle-wrapper");if(!t||!this.arena)return;const e=this.arena.winner===0,s=this.arena.winner==="draw",a=e?"\u{1F389} VICTORY!":s?"\u{1F4A5} DRAW":"\u{1F63F} DEFEAT",c=e?"#facc15":s?"#38bdf8":"#f43f5e",d=document.createElement("div");d.className="result-overlay",d.innerHTML=`
      <div class="result-box">
        <h2 style="color:${c};">${a}</h2>
        ${this.lastUnlockText?`<div class="unlock-banner">${this.lastUnlockText}</div>`:""}
        <div class="result-actions">
          <button id="res-garage" class="btn-chip" style="padding:10px 16px;">\u{1F527} \u30AC\u30EC\u30FC\u30B8</button>
          <button id="res-retry" class="btn-chip" style="padding:10px 16px;">\u{1F504} \u518D\u6226</button>
          ${e&&!this.isTestBattle?'<button id="res-next" class="btn-battle" style="padding:10px 18px;font-size:0.9rem;">\u23ED\uFE0F \u6B21\u3078</button>':""}
        </div>
      </div>
    `,t.appendChild(d),document.getElementById("res-garage")?.addEventListener("click",()=>{n.playClick(),this.mode="garage",this.arena=null,e&&!this.isTestBattle&&(this.selectedStageNum=this.maxUnlockedStage),this.render()}),document.getElementById("res-retry")?.addEventListener("click",()=>{this.startBattle(this.isTestBattle)}),document.getElementById("res-next")?.addEventListener("click",()=>{this.selectedStageNum++,this.startBattle(!1)})}}export{tt as GameApp};