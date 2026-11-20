import{ENEMY_STAGES as b,generateRandomEnemy as x,TOTAL_CAMPAIGN_STAGES as g}from"../data/enemies.js";import{HULL_LIST as w,HULLS as E}from"../data/hulls.js";import{PART_LIST as $,PARTS as y}from"../data/parts.js";import{TACTICAL_LIST as I,TACTICALS as T}from"../data/tacticals.js";import{ARENA_HEIGHT as M,ARENA_WIDTH as A,BattleArena as P}from"../physics/arena.js";import{computeBlueprintStats as H}from"../physics/shipBody.js";import{sound as n}from"../render/audio.js";import{renderBattleArena as U,renderEnemyPreview as q,renderGaragePreview as N,renderHullThumbnail as B,renderPartThumbnail as C}from"../render/renderer.js";const F={stage:0,title:"\u30C6\u30B9\u30C8\u6F14\u7FD2",tagline:"\u6B66\u88C5\u306A\u3057\u306E\u30BF\u30FC\u30B2\u30C3\u30C8\u8266",rewardText:"\u30C6\u30B9\u30C8\u6F14\u7FD2",blueprint:{name:"\u30C0\u30DF\u30FC\u6A19\u7684\u8266",pilotName:"\u30ED\u30DC\u30CB\u30E3\u30F3",catColor:"#94a3b8",hullId:"titan",slots:{w1:null,w2:null,t1:null,g1:{partId:"shield",flipped:!1},g2:null}}},R={name:"\u30B9\u30BF\u30FC\u30FB\u30BF\u30DE\u53F7",pilotName:"\u30BF\u30DE\u8266\u9577",catColor:"#fbbf24",hullId:"cruiser",slots:{w1:{partId:"rocket",flipped:!1},w2:null,t1:{partId:"thruster",flipped:!1},g1:null},tacticalId:null};class st{root;mode="garage";unlockedHulls=new Set(w.filter(t=>t.unlockedByDefault).map(t=>t.id));unlockedParts=new Set($.filter(t=>t.unlockedByDefault).map(t=>t.id));unlockedTacticals=new Set;sandboxAllUnlocked=!1;maxUnlockedStage=1;selectedStageNum=1;currentEnemyStage=b[0];isTestBattle=!1;playerBp=structuredClone(R);selectedSlotId="w2";activeTab="weapon";inspected={kind:"part",id:"rocket"};stageInspected=null;toastMessage=null;arena=null;battleSpeed=1;resultShown=!1;lastUnlockText=null;previewCanvas=null;enemyPreviewCanvas=null;battleCanvas=null;previewSlotAreas=[];animTime=0;constructor(t){this.root=t;const e=()=>{n.unlock(),window.removeEventListener("pointerdown",e)};window.addEventListener("pointerdown",e),document.addEventListener("fullscreenchange",()=>{const a=document.getElementById("btn-fullscreen");a&&(a.textContent=document.fullscreenElement?"\u{1F5D7}":"\u26F6",a.classList.toggle("active",!!document.fullscreenElement))}),this.render(),requestAnimationFrame(a=>this.loop(a))}isHullUnlocked(t){return this.sandboxAllUnlocked||this.unlockedHulls.has(t)}isPartUnlocked(t){return this.sandboxAllUnlocked||this.unlockedParts.has(t)}isTacticalUnlocked(t){return this.sandboxAllUnlocked||this.unlockedTacticals.has(t)}hasAnyTacticalUnlocked(){return this.sandboxAllUnlocked||this.unlockedTacticals.size>0}async toggleFullscreen(){const t=document.documentElement,e=document,a=!!(document.fullscreenElement||e.webkitFullscreenElement);if(!!!(t.requestFullscreen||t.webkitRequestFullscreen)){this.toastMessage="\u{1F4F1} \u5171\u6709\u30E1\u30CB\u30E5\u30FC\u2192\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3067\u5168\u753B\u9762\u8868\u793A\u3067\u304D\u307E\u3059",this.render();return}try{a?document.exitFullscreen?await document.exitFullscreen():await e.webkitExitFullscreen?.():(t.requestFullscreen?await t.requestFullscreen({navigationUI:"hide"}):await t.webkitRequestFullscreen?.(),await screen.orientation?.lock?.("landscape").catch(()=>{}))}catch{this.toastMessage="\u{1F4F1} \u30D6\u30E9\u30A6\u30B6\u30E1\u30CB\u30E5\u30FC\u2192\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3067\u5168\u753B\u9762\u5316\u3067\u304D\u307E\u3059"}this.render()}tryAutoFullscreenOnMobile(){if(!window.matchMedia?.("(pointer: coarse)").matches||document.fullscreenElement)return;const e=document.documentElement;e.requestFullscreen?e.requestFullscreen({navigationUI:"hide"}).catch(()=>{}):e.webkitRequestFullscreen&&Promise.resolve(e.webkitRequestFullscreen()).catch(()=>{})}loop(t){if(this.animTime=t*.001,this.mode==="garage"&&this.previewCanvas){const e=this.previewCanvas.getContext("2d");if(e){const a=H(this.playerBp),s=N(e,this.previewCanvas.width,this.previewCanvas.height,this.playerBp,a.comLocal,this.selectedSlotId,this.animTime);this.previewSlotAreas=s.slotHitAreas}}else if(this.mode==="stages"&&this.enemyPreviewCanvas){const e=this.selectedStageNum<=b.length?b[this.selectedStageNum-1]:null,a=this.enemyPreviewCanvas.getContext("2d");a&&e&&q(a,this.enemyPreviewCanvas.width,this.enemyPreviewCanvas.height,e.blueprint,this.animTime)}else if(this.mode==="battle"&&this.arena&&this.battleCanvas){const e=this.arena.winner===null?this.battleSpeed:1;for(let s=0;s<e;s++)this.arena.step();const a=this.battleCanvas.getContext("2d");a&&U(a,this.arena),this.arena.winner!==null&&!this.resultShown&&this.arena.finishTimer>.32&&(this.resultShown=!0,this.handleBattleEnd(),this.renderBattleResultOverlay())}requestAnimationFrame(e=>this.loop(e))}handleBattleEnd(){if(!(!this.arena||this.isTestBattle)&&this.arena.winner===0){this.lastUnlockText=null;const t=this.currentEnemyStage;if(t.unlockPart&&!this.unlockedParts.has(t.unlockPart)&&(this.unlockedParts.add(t.unlockPart),this.lastUnlockText=`\u{1F381} \u300C${y[t.unlockPart].name}\u300D\u3092\u7372\u5F97\uFF01`),t.unlockHull&&!this.unlockedHulls.has(t.unlockHull)&&(this.unlockedHulls.add(t.unlockHull),this.lastUnlockText=`\u{1F6F8} \u65B0\u8266\u4F53\u300C${E[t.unlockHull].name}\u300D\u3092\u7372\u5F97\uFF01`),t.unlockTactical&&!this.unlockedTacticals.has(t.unlockTactical)){this.unlockedTacticals.add(t.unlockTactical),this.playerBp.tacticalId||(this.playerBp.tacticalId=t.unlockTactical);const e=T[t.unlockTactical];this.lastUnlockText=`${e.icon} \u652F\u63F4\u30B3\u30DE\u30F3\u30C9\u300C${e.name}\u300D\u3092\u7372\u5F97\uFF01`}this.selectedStageNum>=this.maxUnlockedStage&&(this.maxUnlockedStage=this.selectedStageNum+1)}}selectHull(t){if(!this.isHullUnlocked(t))return;n.playClick();const e=E[t],a={},s=Object.values(this.playerBp.slots).filter(Boolean);let p=0;for(const c of e.slots){const i=s.findIndex(l=>{if(!l)return!1;const u=y[l.partId];return u.category===c.category&&p+u.energy<=e.maxEnergy});if(i>=0){const l=s.splice(i,1)[0];a[c.id]=l,p+=y[l.partId].energy}else a[c.id]=null}this.playerBp.hullId=t,this.playerBp.slots=a,this.selectedSlotId=e.slots[0]?.id??null,this.toastMessage=null,this.render()}equipPart(t){if(!this.isPartUnlocked(t))return;const e=y[t],a=E[this.playerBp.hullId];let s=a.slots.find(u=>u.id===this.selectedSlotId&&u.category===e.category);if(s||(s=a.slots.find(u=>u.category===e.category&&!this.playerBp.slots[u.id])??a.slots.find(u=>u.category===e.category)),!s){this.toastMessage="\u26A0\uFE0F \u5BFE\u5FDC\u30B9\u30ED\u30C3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093",this.render();return}const p=H(this.playerBp),c=this.playerBp.slots[s.id],i=c?y[c.partId].energy:0,l=p.usedEnergy-i+e.energy;if(l>a.maxEnergy){this.toastMessage=`\u26A1 \u96FB\u529B\u30AA\u30FC\u30D0\u30FC (${l}/${a.maxEnergy})`,this.render();return}n.playClick(),this.playerBp.slots[s.id]={partId:t,flipped:!1},this.selectedSlotId=s.id,this.toastMessage=null,this.render()}selectTactical(t){t&&!this.isTacticalUnlocked(t)||(n.playClick(),this.playerBp.tacticalId=t,this.toastMessage=null,this.render())}startBattle(t){n.unlock(),n.playClick(),this.tryAutoFullscreenOnMobile(),this.isTestBattle=t,this.resultShown=!1,this.lastUnlockText=null,t?this.currentEnemyStage=F:this.selectedStageNum<=b.length?this.currentEnemyStage=b[this.selectedStageNum-1]:this.currentEnemyStage=x(this.selectedStageNum),this.arena=new P(this.playerBp,this.currentEnemyStage.blueprint),this.mode="battle",this.render()}render(){const t=`
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
          <button id="btn-mute" class="btn-chip ${n.muted?"":"active"}" title="\u30B5\u30A6\u30F3\u30C9">
            ${n.muted?"\u{1F507}":"\u{1F50A}"}
          </button>
        </div>
      </header>
    `,e=document.body.dataset.mode,a=[".panel-build",".panel-catalog",".catalog-grid",".panel-stage-list",".stage-grid"],s=a.map(p=>this.root.querySelector(p)?.scrollTop??0);document.body.dataset.mode=this.mode,this.mode==="garage"?(this.root.innerHTML=t+this.buildGarageHtml(),this.bindGarageEvents()):this.mode==="stages"?(this.root.innerHTML=t+this.buildStagesHtml(),this.bindStagesEvents()):(this.root.innerHTML=t+this.buildBattleHtml(),this.bindBattleEvents()),e===this.mode&&a.forEach((p,c)=>{const i=this.root.querySelector(p);i&&(i.scrollTop=s[c])}),document.getElementById("nav-garage")?.addEventListener("click",()=>{this.mode!=="garage"&&(n.playClick(),this.mode="garage",this.render())}),document.getElementById("nav-stages")?.addEventListener("click",()=>{this.mode!=="stages"&&(n.playClick(),this.mode="stages",this.stageInspected=null,this.render())}),document.getElementById("btn-sandbox")?.addEventListener("click",()=>{this.sandboxAllUnlocked=!this.sandboxAllUnlocked,n.playClick(),this.render()}),document.getElementById("btn-fullscreen")?.addEventListener("click",()=>{n.playClick(),this.toggleFullscreen()}),document.getElementById("btn-mute")?.addEventListener("click",()=>{n.muted=!n.muted,n.muted||n.playClick(),this.render()})}buildInspectorHtml(t,e,a){if(!t)return`<div class="inspector-box empty">${a}</div>`;if(t.kind==="hull"){const i=E[t.id],l=this.isHullUnlocked(i.id),u=i.id===this.playerBp.hullId;return`
        <div class="inspector-box">
          <div class="inspector-main">
            <div class="inspector-head">
              <strong>${i.name}</strong>
              <span class="energy-pill">\u2764\uFE0F${i.hp} \u26A1${i.maxEnergy}</span>
            </div>
            <p>${i.description}</p>
          </div>
          ${e&&l?`<button class="btn-equip" data-select-hull="${i.id}" ${u?"disabled":""}>${u?"\u4F7F\u7528\u4E2D":"\u4E57\u308A\u63DB\u3048"}</button>`:l?"":'<span class="intel-badge new">\u672A\u6240\u6301</span>'}
        </div>
      `}if(t.kind==="tactical"){const i=T[t.id],l=this.isTacticalUnlocked(i.id),u=this.playerBp.tacticalId===i.id;return`
        <div class="inspector-box">
          <div class="inspector-main">
            <div class="inspector-head">
              <strong>${i.icon} ${i.name}</strong>
              <span class="energy-pill">1\u56DE\u9650\u308A</span>
            </div>
            <p>${i.description}</p>
          </div>
          ${e&&l?`<button class="btn-equip" data-select-tactical="${i.id}" ${u?"disabled":""}>${u?"\u30BB\u30C3\u30C8\u6E08":"\u30BB\u30C3\u30C8"}</button>`:l?"":'<span class="intel-badge new">\u672A\u6240\u6301</span>'}
        </div>
      `}const s=y[t.id],p=this.isPartUnlocked(s.id),c=s.damage?`\u{1F4A5}${s.pelletCount?`${s.damage}\xD7${s.pelletCount}`:s.damage}`:s.shieldHp?`\u{1F6E1}\uFE0F${s.shieldHp}`:s.healPerSec?`\u{1F49A}+${s.healPerSec}/s`:s.cooldownBoost?`\u26A1+${Math.round(s.cooldownBoost*100)}%`:"";return`
      <div class="inspector-box">
        <div class="inspector-main">
          <div class="inspector-head">
            <strong>${s.name}</strong>
            <span class="energy-pill">\u26A1${s.energy}${c?` ${c}`:""}</span>
          </div>
          <p>${s.description}</p>
        </div>
        ${e&&p?`<button class="btn-equip" data-equip-part="${s.id}">\u88C5\u7740</button>`:p?"":'<span class="intel-badge new">\u672A\u6240\u6301</span>'}
      </div>
    `}buildGarageHtml(){const t=E[this.playerBp.hullId],e=H(this.playerBp),a=this.hasAnyTacticalUnlocked();!a&&this.activeTab==="tactical"&&(this.activeTab="weapon");const s=t.slots.map(r=>{const d=this.playerBp.slots[r.id],o=d?y[d.partId]:null,h=r.category==="weapon"?"cat-weapon":r.category==="thruster"?"cat-thruster":"cat-gadget",v=r.category==="weapon"?"\u{1F52B}":r.category==="thruster"?"\u{1F525}":"\u{1F9F2}";return`
          <div class="slot-row ${this.selectedSlotId===r.id?"selected":""}" data-slot-id="${r.id}">
            <div class="slot-left">
              <span class="cat-badge ${h}">${v}</span>
              ${o?`<canvas class="slot-thumb" width="44" height="30" data-thumb-part="${o.id}" data-thumb-flipped="${d?.flipped?"1":"0"}"></canvas>`:""}
              <span class="slot-name">${o?o.name:'<span class="slot-empty">\u7A7A\u304D</span>'}</span>
              ${o?`<span class="slot-e">\u26A1${o.energy}</span>`:""}
            </div>
            <div class="slot-actions">
              ${o&&o.canFlip?`<button class="btn-mini ${d?.flipped?"flipped":""}" data-flip-slot="${r.id}" title="\u5411\u304D\u53CD\u8EE2">\u21C4</button>`:""}
              ${o?`<button class="btn-mini" data-clear-slot="${r.id}" title="\u5916\u3059">\u2715</button>`:""}
            </div>
          </div>
        `}).join(""),p=this.playerBp.tacticalId?T[this.playerBp.tacticalId]:null,c=a?`
        <div class="slot-row tactical-row ${this.activeTab==="tactical"?"selected":""}" data-open-tactical="1">
          <div class="slot-left">
            <span class="cat-badge cat-tactical">\u26A1</span>
            <span class="slot-name">${p?`${p.icon} ${p.name}`:'<span class="slot-empty">\u652F\u63F4\u30B3\u30DE\u30F3\u30C9\u306A\u3057</span>'}</span>
            <span class="slot-e">1\u56DE</span>
          </div>
          <div class="slot-actions">
            ${p?'<button class="btn-mini" data-clear-tactical="1" title="\u5916\u3059">\u2715</button>':""}
          </div>
        </div>
      `:"",i=$.filter(r=>r.category==="weapon"&&this.isPartUnlocked(r.id)).length,l=$.filter(r=>r.category==="thruster"&&this.isPartUnlocked(r.id)).length,u=$.filter(r=>r.category==="gadget"&&this.isPartUnlocked(r.id)).length,k=w.filter(r=>this.isHullUnlocked(r.id)).length,f=I.filter(r=>this.isTacticalUnlocked(r.id)).length;let m="";if(this.activeTab==="hulls")m=w.filter(d=>this.isHullUnlocked(d.id)).map(d=>{const o=d.id===this.playerBp.hullId,h=this.inspected?.kind==="hull"&&this.inspected.id===d.id;return`
            <button class="tile-card ${o?"active-hull":""} ${h?"selected":""}" data-tile-hull="${d.id}">
              <canvas class="tile-thumb" width="64" height="42" data-thumb-hull="${d.id}"></canvas>
              <div class="tile-name">${d.name}</div>
              <div class="tile-meta">\u2764\uFE0F${d.hp} \u26A1${d.maxEnergy}</div>
            </button>
          `}).join("");else if(this.activeTab==="tactical")m=I.filter(d=>this.isTacticalUnlocked(d.id)).map(d=>{const o=this.playerBp.tacticalId===d.id,h=this.inspected?.kind==="tactical"&&this.inspected.id===d.id;return`
            <button class="tile-card ${o?"active-hull":""} ${h?"selected":""}" data-tile-tactical="${d.id}">
              <div class="tile-emoji">${d.icon}</div>
              <div class="tile-name">${d.name}</div>
              <div class="tile-meta">1\u56DE\u9650\u308A</div>
            </button>
          `}).join("");else{const r=$.filter(d=>d.category===this.activeTab&&this.isPartUnlocked(d.id));r.length===0?m='<div class="catalog-empty">\u672A\u6240\u6301\uFF08\u6575\u3092\u5012\u3057\u3066\u7372\u5F97\uFF01\uFF09</div>':m=r.map(d=>`
              <button class="tile-card ${this.inspected?.kind==="part"&&this.inspected.id===d.id?"selected":""}" data-tile-part="${d.id}">
                <canvas class="tile-thumb" width="64" height="42" data-thumb-part="${d.id}"></canvas>
                <div class="tile-name">${d.name}</div>
                <div class="tile-meta">\u26A1${d.energy}</div>
              </button>
            `).join("")}const S=this.selectedStageNum<=g?`S${this.selectedStageNum}`:`\u221E${this.selectedStageNum-g}`;return`
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
            ${c}
          </div>
          ${this.toastMessage?`<div class="toast-msg">${this.toastMessage}</div>`:""}
        </section>

        <section class="panel panel-catalog">
          <div class="catalog-top">
            <div class="tabs ${a?"tabs-5":""}">
              <button class="tab-btn ${this.activeTab==="weapon"?"active":""}" data-tab="weapon">\u{1F52B}${i}</button>
              <button class="tab-btn ${this.activeTab==="thruster"?"active":""}" data-tab="thruster">\u{1F525}${l}</button>
              <button class="tab-btn ${this.activeTab==="gadget"?"active":""}" data-tab="gadget">\u{1F9F2}${u}</button>
              <button class="tab-btn ${this.activeTab==="hulls"?"active":""}" data-tab="hulls">\u{1F6F8}${k}</button>
              ${a?`<button class="tab-btn ${this.activeTab==="tactical"?"active":""}" data-tab="tactical">\u26A1${f}</button>`:""}
            </div>

            <div class="catalog-grid">
              ${m}
            </div>

            ${this.buildInspectorHtml(this.inspected,!0,"\u30D1\u30FC\u30C4\u3092\u9078\u3076\u3068\u8AAC\u660E\u3092\u8868\u793A")}
          </div>

          <div class="garage-footer">
            <button id="btn-test-battle" class="btn-test">\u{1F9EA} \u6F14\u7FD2</button>
            <button id="btn-go-stages" class="btn-stage-link">\u{1F5FA}\uFE0F \u30B9\u30C6\u30FC\u30B8</button>
            <button id="btn-quick-battle" class="btn-battle">\u2694\uFE0F ${S} \u51FA\u6483</button>
          </div>
        </section>
      </div>
    `}buildStagesHtml(){const t=this.sandboxAllUnlocked?g:Math.min(g,this.maxUnlockedStage),e=this.sandboxAllUnlocked||this.maxUnlockedStage>g,a=b.slice(0,t).map(l=>{const u=this.selectedStageNum===l.stage,k=l.stage<this.maxUnlockedStage,f=l.unlockPart&&!this.unlockedParts.has(l.unlockPart)||l.unlockHull&&!this.unlockedHulls.has(l.unlockHull)||l.unlockTactical&&!this.unlockedTacticals.has(l.unlockTactical),m=l.isChallenge?'<span class="stage-dot challenge">\u2694\uFE0F</span>':f?'<span class="stage-dot reward">\u{1F381}</span>':k?'<span class="stage-dot cleared">\u2713</span>':"";return`
          <button class="stage-tile ${u?"selected":""} ${l.isChallenge?"is-challenge":""} ${k?"cleared":""}" data-pick-stage="${l.stage}">
            <div class="stage-tile-top">
              <span class="stage-num">S${l.stage}</span>
              ${m}
            </div>
            <div class="stage-pilot">${l.blueprint.pilotName}</div>
          </button>
        `}).join(""),s=Math.max(g+1,this.maxUnlockedStage),p=e?`
        <button class="stage-tile endless ${this.selectedStageNum>g?"selected":""}" data-pick-stage="${s}">
          <div class="stage-tile-top">
            <span class="stage-num">\u267E\uFE0F</span>
            <span class="stage-dot reward">\u221E</span>
          </div>
          <div class="stage-pilot">ENDLESS</div>
        </button>
      `:"",c=this.selectedStageNum<=b.length?b[this.selectedStageNum-1]:null;let i="";if(c){const l=c.blueprint,u=E[l.hullId],k=c.unlockHull===u.id&&!this.unlockedHulls.has(u.id),f=new Map;for(const o of Object.values(l.slots)){if(!o)continue;const h=`${o.partId}:${o.flipped?1:0}`,v=f.get(h);v?v.count++:f.set(h,{partId:o.partId,flipped:o.flipped,count:1})}const m=Array.from(f.values()).map(o=>{const h=y[o.partId],v=c.unlockPart===h.id&&!this.unlockedParts.has(h.id),L=this.stageInspected?.kind==="part"&&this.stageInspected.id===h.id;return`
            <button class="intel-chip ${v?"new-target":""} ${L?"active":""}" data-stage-inspect-part="${h.id}" title="${h.name}">
              <canvas class="intel-thumb" width="36" height="24" data-thumb-part="${h.id}" data-thumb-flipped="${o.flipped?"1":"0"}"></canvas>
              ${o.count>1?`<span class="intel-count">\xD7${o.count}</span>`:""}
              ${v?'<span class="intel-badge new">NEW</span>':""}
            </button>
          `}).join(""),S=this.stageInspected?.kind==="hull"&&this.stageInspected.id===u.id,r=c.unlockTactical?(()=>{const o=T[c.unlockTactical],h=!this.unlockedTacticals.has(o.id),v=this.stageInspected?.kind==="tactical"&&this.stageInspected.id===o.id;return`
              <button class="intel-chip ${h?"new-target":""} ${v?"active":""}" data-stage-inspect-tactical="${o.id}" title="${o.name}">
                <span class="intel-emoji">${o.icon}</span>
                ${h?'<span class="intel-badge new">NEW</span>':""}
              </button>
            `})():"",d=c.isChallenge?'<span class="stage-type-pill challenge">\u2694\uFE0F \u5F37\u6575\u30C1\u30E3\u30EC\u30F3\u30B8</span>':'<span class="stage-type-pill unlock">\u{1F381} \u65B0\u88C5\u5099\u89E3\u653E</span>';i=`
        <div class="stage-detail-head">
          <strong>${c.title}</strong>
          ${d}
        </div>
        <div class="preview-wrap enemy-preview-wrap">
          <canvas id="enemy-preview-canvas" class="preview-canvas" width="520" height="210"></canvas>
        </div>
        <div class="intel-chips">
          <button class="intel-chip ${k?"new-target":""} ${S?"active":""}" data-stage-inspect-hull="${u.id}" title="${u.name}">
            <canvas class="intel-thumb" width="36" height="24" data-thumb-hull="${u.id}"></canvas>
            ${k?'<span class="intel-badge new">NEW</span>':""}
          </button>
          ${m}
          ${r}
        </div>
        ${this.buildInspectorHtml(this.stageInspected,!1,`\u5831\u916C\uFF1A${c.rewardText}\uFF08\u30A2\u30A4\u30B3\u30F3\u9078\u629E\u3067\u8A73\u7D30\uFF09`)}
      `}else i=`
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
            ${a}
            ${p}
          </div>
        </section>

        <section class="panel panel-stage-detail">
          <div class="stage-detail-top">
            ${i}
          </div>
          <div class="launch-buttons">
            <button id="btn-stage-to-garage" class="btn-test">\u{1F527} \u7DE8\u6210\u3059\u308B</button>
            <button id="btn-stage-battle" class="btn-battle">\u2694\uFE0F \u51FA\u6483\uFF01</button>
          </div>
        </section>
      </div>
    `}bindGarageEvents(){this.previewCanvas=document.getElementById("garage-preview-canvas"),document.querySelectorAll("[data-thumb-part]").forEach(t=>{const e=t.dataset.thumbPart,a=t.dataset.thumbFlipped==="1";C(t,e,a)}),document.querySelectorAll("[data-thumb-hull]").forEach(t=>{const e=t.dataset.thumbHull;B(t,e)}),this.previewCanvas?.addEventListener("click",t=>{if(!this.previewCanvas)return;const e=this.previewCanvas.getBoundingClientRect(),a=this.previewCanvas.width/e.width,s=this.previewCanvas.height/e.height,p=(t.clientX-e.left)*a,c=(t.clientY-e.top)*s;for(const i of this.previewSlotAreas)if(Math.hypot(p-i.sx,c-i.sy)<=i.r){n.playClick(),this.selectedSlotId=i.slot.id,this.activeTab=i.slot.category;const l=this.playerBp.slots[i.slot.id];l&&(this.inspected={kind:"part",id:l.partId}),this.toastMessage=null,this.render();break}}),document.querySelectorAll("[data-slot-id]").forEach(t=>{t.addEventListener("click",e=>{if(e.target.closest("button"))return;const a=t.dataset.slotId,p=E[this.playerBp.hullId].slots.find(c=>c.id===a);if(p){n.playClick(),this.selectedSlotId=a,this.activeTab=p.category;const c=this.playerBp.slots[a];c&&(this.inspected={kind:"part",id:c.partId}),this.toastMessage=null,this.render()}})}),document.querySelectorAll("[data-open-tactical]").forEach(t=>{t.addEventListener("click",e=>{if(e.target.closest("button"))return;n.playClick(),this.activeTab="tactical";const a=this.playerBp.tacticalId??I.find(s=>this.isTacticalUnlocked(s.id))?.id??null;this.inspected=a?{kind:"tactical",id:a}:null,this.render()})}),document.querySelectorAll("[data-clear-tactical]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation(),this.selectTactical(null)})}),document.querySelectorAll("[data-flip-slot]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const a=t.dataset.flipSlot,s=this.playerBp.slots[a];s&&(n.playClick(),s.flipped=!s.flipped,this.render())})}),document.querySelectorAll("[data-clear-slot]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const a=t.dataset.clearSlot;n.playClick(),this.playerBp.slots[a]=null,this.toastMessage=null,this.render()})}),document.querySelectorAll("[data-tab]").forEach(t=>{t.addEventListener("click",()=>{if(n.playClick(),this.activeTab=t.dataset.tab,this.activeTab==="hulls")this.inspected={kind:"hull",id:this.playerBp.hullId};else if(this.activeTab==="tactical"){const e=this.playerBp.tacticalId??I.find(a=>this.isTacticalUnlocked(a.id))?.id??null;this.inspected=e?{kind:"tactical",id:e}:null}else{const e=$.find(a=>a.category===this.activeTab&&this.isPartUnlocked(a.id));this.inspected=e?{kind:"part",id:e.id}:null}this.render()})}),document.querySelectorAll("[data-tile-part]").forEach(t=>{t.addEventListener("click",()=>{const e=t.dataset.tilePart;this.inspected?.kind==="part"&&this.inspected.id===e?this.equipPart(e):(n.playClick(),this.inspected={kind:"part",id:e},this.toastMessage=null,this.render())})}),document.querySelectorAll("[data-tile-hull]").forEach(t=>{t.addEventListener("click",()=>{const e=t.dataset.tileHull;this.inspected?.kind==="hull"&&this.inspected.id===e?this.selectHull(e):(n.playClick(),this.inspected={kind:"hull",id:e},this.toastMessage=null,this.render())})}),document.querySelectorAll("[data-tile-tactical]").forEach(t=>{t.addEventListener("click",()=>{const e=t.dataset.tileTactical;this.inspected?.kind==="tactical"&&this.inspected.id===e?this.selectTactical(e):(n.playClick(),this.inspected={kind:"tactical",id:e},this.toastMessage=null,this.render())})}),document.querySelectorAll("[data-select-hull]").forEach(t=>{t.addEventListener("click",()=>{this.selectHull(t.dataset.selectHull)})}),document.querySelectorAll("[data-equip-part]").forEach(t=>{t.addEventListener("click",()=>{this.equipPart(t.dataset.equipPart)})}),document.querySelectorAll("[data-select-tactical]").forEach(t=>{t.addEventListener("click",()=>{this.selectTactical(t.dataset.selectTactical)})}),document.getElementById("btn-test-battle")?.addEventListener("click",()=>{this.startBattle(!0)}),document.getElementById("btn-go-stages")?.addEventListener("click",()=>{n.playClick(),this.mode="stages",this.stageInspected=null,this.render()}),document.getElementById("btn-quick-battle")?.addEventListener("click",()=>{this.startBattle(!1)})}bindStagesEvents(){this.enemyPreviewCanvas=document.getElementById("enemy-preview-canvas"),document.querySelectorAll("[data-thumb-part]").forEach(t=>{const e=t.dataset.thumbPart,a=t.dataset.thumbFlipped==="1";C(t,e,a)}),document.querySelectorAll("[data-thumb-hull]").forEach(t=>{const e=t.dataset.thumbHull;B(t,e)}),document.querySelectorAll("[data-pick-stage]").forEach(t=>{t.addEventListener("click",()=>{n.playClick(),this.selectedStageNum=Number(t.dataset.pickStage),this.stageInspected=null,this.render()})}),document.querySelectorAll("[data-stage-inspect-part]").forEach(t=>{t.addEventListener("click",()=>{n.playClick(),this.stageInspected={kind:"part",id:t.dataset.stageInspectPart},this.render()})}),document.querySelectorAll("[data-stage-inspect-hull]").forEach(t=>{t.addEventListener("click",()=>{n.playClick(),this.stageInspected={kind:"hull",id:t.dataset.stageInspectHull},this.render()})}),document.querySelectorAll("[data-stage-inspect-tactical]").forEach(t=>{t.addEventListener("click",()=>{n.playClick(),this.stageInspected={kind:"tactical",id:t.dataset.stageInspectTactical},this.render()})}),document.getElementById("btn-stage-to-garage")?.addEventListener("click",()=>{n.playClick(),this.mode="garage",this.render()}),document.getElementById("btn-stage-battle")?.addEventListener("click",()=>{this.startBattle(!1)})}buildBattleHtml(){const t=this.arena?.playerTacticalId?T[this.arena.playerTacticalId]:null,e=this.arena?.playerTacticalUsed??!1,a=t?`<button id="btn-tactical" class="btn-tactical ${e?"used":""}" ${e?"disabled":""}>${t.icon} ${e?"\u4F7F\u7528\u6E08":t.name}</button>`:"";return`
      <section class="battle-wrapper" id="battle-wrapper">
        <canvas
          id="battle-canvas"
          class="battle-canvas"
          width="${A}"
          height="${M}"
        ></canvas>

        <div class="battle-controls">
          <div style="font-weight:800;color:#fde047;">
            ${this.currentEnemyStage.title}
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${a}
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
    `}bindBattleEvents(){this.battleCanvas=document.getElementById("battle-canvas"),document.getElementById("btn-tactical")?.addEventListener("click",()=>{if(this.arena&&this.arena.triggerPlayerTactical()){const t=document.getElementById("btn-tactical"),e=this.arena.playerTacticalId?T[this.arena.playerTacticalId]:null;t&&e&&(t.disabled=!0,t.classList.add("used"),t.textContent=`${e.icon} \u4F7F\u7528\u6E08`)}}),document.getElementById("btn-speed")?.addEventListener("click",()=>{n.playClick(),this.battleSpeed=this.battleSpeed===1?2:1;const t=document.getElementById("btn-speed");t&&(t.textContent=`\u23E9 ${this.battleSpeed}x`,t.classList.toggle("active",this.battleSpeed===2))}),document.getElementById("btn-retry")?.addEventListener("click",()=>{this.startBattle(this.isTestBattle)}),document.getElementById("btn-back-garage")?.addEventListener("click",()=>{n.playClick(),this.mode="garage",this.arena=null,this.render()})}renderBattleResultOverlay(){const t=document.getElementById("battle-wrapper");if(!t||!this.arena)return;const e=this.arena.winner===0,a=this.arena.winner==="draw",s=e?"\u{1F389} VICTORY!":a?"\u{1F4A5} DRAW":"\u{1F63F} DEFEAT",p=e?"#facc15":a?"#38bdf8":"#f43f5e",c=document.createElement("div");c.className="result-overlay",c.innerHTML=`
      <div class="result-box">
        <h2 style="color:${p};">${s}</h2>
        ${this.lastUnlockText?`<div class="unlock-banner">${this.lastUnlockText}</div>`:""}
        <div class="result-actions">
          <button id="res-garage" class="btn-chip" style="padding:10px 14px;">\u{1F527} \u30AC\u30EC\u30FC\u30B8</button>
          <button id="res-stages" class="btn-chip" style="padding:10px 14px;">\u{1F5FA}\uFE0F \u30B9\u30C6\u30FC\u30B8</button>
          <button id="res-retry" class="btn-chip" style="padding:10px 14px;">\u{1F504} \u518D\u6226</button>
          ${e&&!this.isTestBattle?'<button id="res-next" class="btn-battle" style="padding:10px 16px;font-size:0.9rem;">\u23ED\uFE0F \u6B21\u3078</button>':""}
        </div>
      </div>
    `,t.appendChild(c),document.getElementById("res-garage")?.addEventListener("click",()=>{n.playClick(),this.mode="garage",this.arena=null,e&&!this.isTestBattle&&(this.selectedStageNum=this.maxUnlockedStage),this.render()}),document.getElementById("res-stages")?.addEventListener("click",()=>{n.playClick(),this.mode="stages",this.arena=null,this.stageInspected=null,e&&!this.isTestBattle&&(this.selectedStageNum=this.maxUnlockedStage),this.render()}),document.getElementById("res-retry")?.addEventListener("click",()=>{this.startBattle(this.isTestBattle)}),document.getElementById("res-next")?.addEventListener("click",()=>{this.selectedStageNum++,this.startBattle(!1)})}}export{st as GameApp};