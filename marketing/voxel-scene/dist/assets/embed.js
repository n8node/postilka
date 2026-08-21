import{D as z,a as R}from"./scene.js";const o=new Map;let r=null,d=null;function S(){var s;return typeof window<"u"&&((s=window.matchMedia)==null?void 0:s.call(window,"(pointer: coarse)").matches)===!0}function T(){return`
        <div class="cg-section cg-desktop-only">
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
            <div class="cg-keys"><span class="cg-k">Пробел</span></div>
            <div class="cg-desc">Шаг вперед</div>
          </div>
        </div>
        <div class="cg-divider cg-desktop-only"></div>
        <div class="cg-section cg-desktop-only">
          <div class="cg-section-title">🎥 Камера и обзор</div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">ЛКМ + тянуть</span></div>
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
        <div class="cg-divider cg-desktop-only"></div>
        <div class="cg-section cg-touch-only">
          <div class="cg-section-title">📱 Прогулка по фабрике</div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">Свайп ↑↓</span></div>
            <div class="cg-desc">Идти по маршруту</div>
          </div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">Кнопка «Шаг»</span></div>
            <div class="cg-desc">Шаг вперёд</div>
          </div>
        </div>
        <div class="cg-divider cg-touch-only"></div>
        <div class="cg-section cg-touch-only">
          <div class="cg-section-title">📱 Камера и обзор</div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">1 палец</span></div>
            <div class="cg-desc">Вращение сцены</div>
          </div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">2 пальца</span></div>
            <div class="cg-desc">Зум и сдвиг</div>
          </div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k">Кнопки +/−</span></div>
            <div class="cg-desc">Масштаб</div>
          </div>
        </div>
        <div class="cg-divider"></div>
        <div class="cg-section">
          <div class="cg-section-title">🏛️ Павильоны и интерактив</div>
          <div class="cg-row">
            <div class="cg-keys"><span class="cg-k cg-star">★ Тап</span></div>
            <div class="cg-desc">Подлёт и описание</div>
          </div>
          <div class="cg-row cg-desktop-only">
            <div class="cg-keys"><span class="cg-k">Esc</span></div>
            <div class="cg-desc">Закрыть инфо-карточку</div>
          </div>
        </div>
  `}function P(){return`
      <div class="touch-dock" data-touch-dock aria-label="Сенсорное управление">
        <button type="button" class="touch-dock-btn" data-touch-step title="Шаг вперёд">Шаг</button>
        <button type="button" class="touch-dock-btn" data-touch-zoom-in title="Приблизить">+</button>
        <button type="button" class="touch-dock-btn" data-touch-zoom-out title="Отдалить">−</button>
      </div>
  `}function A(){return`
    <div class="postilka-voxel-poster" data-voxel-poster>
      <span>Собираем фабрику из вокселей…</span>
    </div>
    <div class="postilka-voxel-widget">
      <div id="stage"></div>
      <div class="controls-guide${S()?" collapsed":""}" id="controlsGuide">
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
          ${T()}
        </div>
      </div>
      ${P()}
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
  `}function B(s,c){var v,y,k,m,h;const t=s.querySelector("#panel"),a=s.querySelector("#controlsGuide"),n=s.querySelector("#controlsGuideToggle"),i=s.querySelector("[data-voxel-poster]");c.onReady=()=>{i==null||i.classList.add("hide")},n==null||n.addEventListener("click",()=>{a==null||a.classList.toggle("collapsed")}),c.onPanelOpen=e=>{s.querySelector("#pTag").textContent=e.tag,s.querySelector("#pTitle").textContent=e.title,s.querySelector("#pBody").textContent=e.body,s.querySelector("#pTag").style.background=e.accent,t.style.setProperty("--accent",e.accent),t.classList.add("on")};const l=({reset:e=!0}={})=>{t.classList.remove("on"),e&&c.flyTo(R)};(v=s.querySelector("#panelX"))==null||v.addEventListener("click",()=>l()),(y=s.querySelector("#journeyStart"))==null||y.addEventListener("click",()=>{const e=s.closest("[data-postilka-voxel-root]");e&&p(e)}),(k=s.querySelector("[data-touch-step]"))==null||k.addEventListener("click",e=>{e.stopPropagation(),c.stepJourneyForward()}),(m=s.querySelector("[data-touch-zoom-in]"))==null||m.addEventListener("click",e=>{e.stopPropagation(),c.zoomBy(1.12)}),(h=s.querySelector("[data-touch-zoom-out]"))==null||h.addEventListener("click",e=>{e.stopPropagation(),c.zoomBy(.89)}),S()&&(a==null||a.classList.add("collapsed")),document.addEventListener("keydown",e=>{var g,w,b,f;if(r===(s==null?void 0:s.closest("[data-postilka-voxel-root]"))&&(e.key==="Escape"&&(t.classList.contains("on")?l():s.closest(".is-immersive")&&((w=(g=window.PostilkaVoxel)==null?void 0:g.collapse)==null||w.call(g))),(e.key==="h"||e.key==="H"||e.key==="р"||e.key==="Р")&&!e.ctrlKey&&!e.altKey&&!e.metaKey)){const x=(f=(b=document.activeElement)==null?void 0:b.tagName)==null?void 0:f.toLowerCase();x!=="input"&&x!=="textarea"&&(a==null||a.classList.toggle("collapsed"))}})}function q(s,c={}){var v;if(!s||o.has(s))return o.get(s);const t=s.querySelector("[data-postilka-voxel-stage]")||s;t.innerHTML=A();const a=t.querySelector(".postilka-voxel-widget")||t,n=t.querySelector("#stage"),i=new z(n,{overlayRoot:a,embedded:!0});B(t,i),requestAnimationFrame(()=>i.onResize()),setTimeout(()=>i.onResize(),120),setTimeout(()=>i.onResize(),600);const l={root:s,scene:i,expand(){p(s),i.onResize()},collapse(){u(s),i.stopJourney(),i.onResize()}};return o.set(s,l),d||(r=s,d=i),(v=c.onReady)==null||v.call(c,l),l}function p(s){var c,t;r=s,d=((c=o.get(s))==null?void 0:c.scene)||d,s.classList.add("is-immersive"),s.classList.remove("is-preview"),document.body.classList.add("postilka-voxel-lock"),(t=s.querySelector("[data-voxel-collapse]"))==null||t.removeAttribute("hidden"),d==null||d.startJourney(),d==null||d.onResize()}function u(s){var t,a,n;s.classList.remove("is-immersive"),s.classList.add("is-preview"),document.body.classList.remove("postilka-voxel-lock"),(t=s.querySelector("[data-voxel-collapse]"))==null||t.setAttribute("hidden","");const c=o.get(s);(a=c==null?void 0:c.scene)==null||a.stopJourney(),(n=c==null?void 0:c.scene)==null||n.onResize(),s.scrollIntoView({behavior:"smooth",block:"start"})}function L(){document.querySelectorAll("[data-postilka-voxel-root]").forEach(s=>{var c;o.has(s)||(q(s),(c=s.querySelector("[data-voxel-collapse]"))==null||c.addEventListener("click",()=>{u(s)}))})}window.PostilkaVoxel={mount:q,expand(s=r){s&&p(s)},collapse(s=r){s&&u(s)},getActiveScene(){return d}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",L):L();
