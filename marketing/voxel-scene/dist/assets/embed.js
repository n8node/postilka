import{D as S,a as L}from"./scene.js";const o=new Map;let v=null,n=null;function b(){return`
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
      <div class="journey-prompt hidden" id="journeyPrompt">
        <p>Нажмите «Начать путешествие», чтобы идти по маршруту.</p>
        <button type="button" id="journeyStart">Начать путешествие</button>
      </div>
    </div>
  `}function q(e,a){var r,y;const s=e.querySelector("#panel"),c=e.querySelector("#controlsGuide"),d=e.querySelector("#controlsGuideToggle"),i=e.querySelector("[data-voxel-poster]");a.onReady=()=>{i==null||i.classList.add("hide")},d==null||d.addEventListener("click",()=>{c==null||c.classList.toggle("collapsed")}),a.onPanelOpen=t=>{e.querySelector("#pTag").textContent=t.tag,e.querySelector("#pTitle").textContent=t.title,e.querySelector("#pBody").textContent=t.body,e.querySelector("#pTag").style.background=t.accent,s.style.setProperty("--accent",t.accent),s.classList.add("on")};const l=({reset:t=!0}={})=>{s.classList.remove("on"),t&&a.flyTo(L)};(r=e.querySelector("#panelX"))==null||r.addEventListener("click",()=>l()),(y=e.querySelector("#journeyStart"))==null||y.addEventListener("click",()=>{a.startJourney()}),document.addEventListener("keydown",t=>{var p,k,m,x;if(v===(e==null?void 0:e.closest("[data-postilka-voxel-root]"))&&(t.key==="Escape"&&(s.classList.contains("on")?l():e.closest(".is-immersive")&&((k=(p=window.PostilkaVoxel)==null?void 0:p.collapse)==null||k.call(p))),(t.key==="h"||t.key==="H"||t.key==="р"||t.key==="Р")&&!t.ctrlKey&&!t.altKey&&!t.metaKey)){const h=(x=(m=document.activeElement)==null?void 0:m.tagName)==null?void 0:x.toLowerCase();h!=="input"&&h!=="textarea"&&(c==null||c.classList.toggle("collapsed"))}})}function f(e,a={}){var r;if(!e||o.has(e))return o.get(e);const s=e.querySelector("[data-postilka-voxel-stage]")||e;s.innerHTML=b();const c=s.querySelector(".postilka-voxel-widget")||s,d=s.querySelector("#stage"),i=new S(d,{overlayRoot:c,embedded:!0});q(s,i),requestAnimationFrame(()=>i.onResize()),setTimeout(()=>i.onResize(),120),setTimeout(()=>i.onResize(),600);const l={root:e,scene:i,expand(){g(e),i.onResize()},collapse(){u(e),i.stopJourney(),i.onResize()}};return o.set(e,l),n||(v=e,n=i),(r=a.onReady)==null||r.call(a,l),l}function g(e){var c;v=e,n=((c=o.get(e))==null?void 0:c.scene)||n,e.classList.add("is-immersive"),e.classList.remove("is-preview"),document.body.classList.add("postilka-voxel-lock");const a=e.querySelector("[data-voxel-expand]"),s=e.querySelector("[data-voxel-collapse]");a==null||a.setAttribute("hidden",""),s==null||s.removeAttribute("hidden"),n==null||n.startJourney(),n==null||n.onResize()}function u(e){var d,i;e.classList.remove("is-immersive"),e.classList.add("is-preview"),document.body.classList.remove("postilka-voxel-lock");const a=e.querySelector("[data-voxel-expand]"),s=e.querySelector("[data-voxel-collapse]");s==null||s.setAttribute("hidden",""),a==null||a.removeAttribute("hidden");const c=o.get(e);(d=c==null?void 0:c.scene)==null||d.stopJourney(),(i=c==null?void 0:c.scene)==null||i.onResize(),e.scrollIntoView({behavior:"smooth",block:"start"})}function w(){document.querySelectorAll("[data-postilka-voxel-root]").forEach(e=>{var a,s;o.has(e)||(f(e),(a=e.querySelector("[data-voxel-expand]"))==null||a.addEventListener("click",()=>{g(e)}),(s=e.querySelector("[data-voxel-collapse]"))==null||s.addEventListener("click",()=>{u(e)}))})}window.PostilkaVoxel={mount:f,expand(e=v){e&&g(e)},collapse(e=v){e&&u(e)},getActiveScene(){return n}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",w):w();
