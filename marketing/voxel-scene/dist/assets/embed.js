import{D as L,a as S}from"./scene.js";const o=new Map;let v=null,n=null;function b(){return`
    <div class="postilka-voxel-poster" data-voxel-poster>
      <span>Собираем фабрику из вокселей…</span>
    </div>
    <div class="postilka-voxel-widget">
      <div id="stage"></div>
      <div class="controls-guide" id="controlsGuide">
        <button class="controls-guide-toggle" id="controlsGuideToggle" type="button" aria-label="Управление сценой" title="Свернуть / развернуть подсказки">
          <span class="cg-toggle-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="3"></rect>
              <path d="M6 12h4m-2-2v4m9-2h.01m3-2h.01"></path>
            </svg>
          </span>
          <span class="cg-toggle-text">Управление сценой</span>
          <span class="cg-chevron">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </button>
        <div class="controls-guide-body" id="controlsGuideBody">
          <div class="cg-section">
            <div class="cg-section-title">🚶 Прогулка по фабрике</div>
            <div class="cg-row">
              <div class="cg-keys">
                <span class="cg-k">Колесо</span>
                <span class="cg-or">или</span>
                <span class="cg-k">W</span><span class="cg-k">S</span>
                <span class="cg-k">↑</span><span class="cg-k">↓</span>
              </div>
              <div class="cg-desc">Идти по маршруту</div>
            </div>
            <div class="cg-row">
              <div class="cg-keys">
                <span class="cg-k">Пробел</span>
              </div>
              <div class="cg-desc">Шаг вперед</div>
            </div>
          </div>
          <div class="cg-divider"></div>
          <div class="cg-section">
            <div class="cg-section-title">🎥 Камера и обзор</div>
            <div class="cg-row">
              <div class="cg-keys">
                <span class="cg-k">ЛКМ + тянуть</span>
              </div>
              <div class="cg-desc">Вращение сцены (360°)</div>
            </div>
            <div class="cg-row">
              <div class="cg-keys">
                <span class="cg-k">ПКМ</span>
                <span class="cg-or">/</span>
                <span class="cg-k">Shift+ЛКМ</span>
              </div>
              <div class="cg-desc">Сдвиг / Панорама</div>
            </div>
            <div class="cg-row">
              <div class="cg-keys">
                <span class="cg-k">Колесо</span>
                <span class="cg-or">или</span>
                <span class="cg-k">+</span><span class="cg-k">-</span>
              </div>
              <div class="cg-desc">Зум (масштаб)</div>
            </div>
          </div>
          <div class="cg-divider"></div>
          <div class="cg-section">
            <div class="cg-section-title">🏛️ Павильоны и интерактив</div>
            <div class="cg-row">
              <div class="cg-keys">
                <span class="cg-k cg-star">★ Клик</span>
              </div>
              <div class="cg-desc">Подлёт и описание</div>
            </div>
            <div class="cg-row">
              <div class="cg-keys">
                <span class="cg-k">Esc</span>
              </div>
              <div class="cg-desc">Закрыть инфо-карточку</div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel" id="panel">
        <button class="x" id="panelX" type="button">×</button>
        <span class="tag" id="pTag">POSTILKA</span>
        <h2 id="pTitle"></h2>
        <p id="pBody"></p>
      </div>
      <div class="journey-prompt" id="journeyPrompt">
        <p>Хочешь узнать больше о Postilka? Нажми кнопку — и мы отправимся в путешествие по проекту.</p>
        <button type="button" id="journeyStart">Начать путешествие</button>
      </div>
    </div>
  `}function q(s,e){var r,y;const c=s.querySelector("#panel"),t=s.querySelector("#controlsGuide"),l=s.querySelector("#controlsGuideToggle"),i=s.querySelector("[data-voxel-poster]");e.onReady=()=>{i==null||i.classList.add("hide")},l==null||l.addEventListener("click",()=>{t==null||t.classList.toggle("collapsed")}),e.onPanelOpen=a=>{s.querySelector("#pTag").textContent=a.tag,s.querySelector("#pTitle").textContent=a.title,s.querySelector("#pBody").textContent=a.body,s.querySelector("#pTag").style.background=a.accent,c.style.setProperty("--accent",a.accent),c.classList.add("on")};const d=({reset:a=!0}={})=>{c.classList.remove("on"),a&&e.flyTo(S)};(r=s.querySelector("#panelX"))==null||r.addEventListener("click",()=>d()),(y=s.querySelector("#journeyStart"))==null||y.addEventListener("click",()=>{const a=s.closest("[data-postilka-voxel-root]");a&&g(a)}),document.addEventListener("keydown",a=>{var p,k,m,x;if(v===(s==null?void 0:s.closest("[data-postilka-voxel-root]"))&&(a.key==="Escape"&&(c.classList.contains("on")?d():s.closest(".is-immersive")&&((k=(p=window.PostilkaVoxel)==null?void 0:p.collapse)==null||k.call(p))),(a.key==="h"||a.key==="H"||a.key==="р"||a.key==="Р")&&!a.ctrlKey&&!a.altKey&&!a.metaKey)){const w=(x=(m=document.activeElement)==null?void 0:m.tagName)==null?void 0:x.toLowerCase();w!=="input"&&w!=="textarea"&&(t==null||t.classList.toggle("collapsed"))}})}function h(s,e={}){var r;if(!s||o.has(s))return o.get(s);const c=s.querySelector("[data-postilka-voxel-stage]")||s;c.innerHTML=b();const t=c.querySelector(".postilka-voxel-widget")||c,l=c.querySelector("#stage"),i=new L(l,{overlayRoot:t,embedded:!0});q(c,i),requestAnimationFrame(()=>i.onResize()),setTimeout(()=>i.onResize(),120),setTimeout(()=>i.onResize(),600);const d={root:s,scene:i,expand(){g(s),i.onResize()},collapse(){u(s),i.stopJourney(),i.onResize()}};return o.set(s,d),n||(v=s,n=i),(r=e.onReady)==null||r.call(e,d),d}function g(s){var e,c;v=s,n=((e=o.get(s))==null?void 0:e.scene)||n,s.classList.add("is-immersive"),s.classList.remove("is-preview"),document.body.classList.add("postilka-voxel-lock"),(c=s.querySelector("[data-voxel-collapse]"))==null||c.removeAttribute("hidden"),n==null||n.startJourney(),n==null||n.onResize()}function u(s){var c,t,l;s.classList.remove("is-immersive"),s.classList.add("is-preview"),document.body.classList.remove("postilka-voxel-lock"),(c=s.querySelector("[data-voxel-collapse]"))==null||c.setAttribute("hidden","");const e=o.get(s);(t=e==null?void 0:e.scene)==null||t.stopJourney(),(l=e==null?void 0:e.scene)==null||l.onResize(),s.scrollIntoView({behavior:"smooth",block:"start"})}function f(){document.querySelectorAll("[data-postilka-voxel-root]").forEach(s=>{var e;o.has(s)||(h(s),(e=s.querySelector("[data-voxel-collapse]"))==null||e.addEventListener("click",()=>{u(s)}))})}window.PostilkaVoxel={mount:h,expand(s=v){s&&g(s)},collapse(s=v){s&&u(s)},getActiveScene(){return n}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",f):f();
