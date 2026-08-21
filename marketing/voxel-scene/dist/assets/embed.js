import{D as S,a as b}from"./scene.js";const o=new Map;let u=null,i=null;function L(){return`
    <div class="postilka-voxel-poster" data-voxel-poster>
      <span>Собираем фабрику из вокселей…</span>
    </div>
    <div class="postilka-voxel-widget">
      <div id="stage"></div>
      <div class="controls-guide collapsed" id="controlsGuide">
        <button class="controls-guide-toggle" id="controlsGuideToggle" type="button" aria-label="Управление сценой">
          <span class="cg-toggle-text">Управление сценой</span>
        </button>
        <div class="controls-guide-body" id="controlsGuideBody">
          <div class="cg-section">
            <div class="cg-section-title">Прогулка</div>
            <div class="cg-row"><div class="cg-keys"><span class="cg-k">W</span><span class="cg-k">S</span></div><div class="cg-desc">Идти по маршруту</div></div>
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
  `}function f(e,s){var r,g;const t=e.querySelector("#panel"),n=e.querySelector("#controlsGuide"),d=e.querySelector("#controlsGuideToggle"),a=e.querySelector("[data-voxel-poster]");s.onReady=()=>{a==null||a.classList.add("hide")},d==null||d.addEventListener("click",()=>{n==null||n.classList.toggle("collapsed")}),s.onPanelOpen=c=>{e.querySelector("#pTag").textContent=c.tag,e.querySelector("#pTitle").textContent=c.title,e.querySelector("#pBody").textContent=c.body,e.querySelector("#pTag").style.background=c.accent,t.style.setProperty("--accent",c.accent),t.classList.add("on")};const l=({reset:c=!0}={})=>{t.classList.remove("on"),c&&s.flyTo(b)};(r=e.querySelector("#panelX"))==null||r.addEventListener("click",()=>l()),(g=e.querySelector("#journeyStart"))==null||g.addEventListener("click",()=>{s.startJourney()}),document.addEventListener("keydown",c=>{var v,m;u===(e==null?void 0:e.closest("[data-postilka-voxel-root]"))&&c.key==="Escape"&&(t.classList.contains("on")?l():e.closest(".is-immersive")&&((m=(v=window.PostilkaVoxel)==null?void 0:v.collapse)==null||m.call(v)))})}function k(e,s={}){var r;if(!e||o.has(e))return o.get(e);const t=e.querySelector("[data-postilka-voxel-stage]")||e;t.innerHTML=L();const n=t.querySelector(".postilka-voxel-widget")||t,d=t.querySelector("#stage"),a=new S(d,{overlayRoot:n,embedded:!0});f(t,a);const l={root:e,scene:a,expand(){p(e),a.onResize()},collapse(){y(e),a.stopJourney(),a.onResize()}};return o.set(e,l),i||(u=e,i=a),(r=s.onReady)==null||r.call(s,l),l}function p(e){var n;u=e,i=((n=o.get(e))==null?void 0:n.scene)||i,e.classList.add("is-immersive"),e.classList.remove("is-preview"),document.body.classList.add("postilka-voxel-lock");const s=e.querySelector("[data-voxel-expand]"),t=e.querySelector("[data-voxel-collapse]");s==null||s.setAttribute("hidden",""),t==null||t.removeAttribute("hidden"),i==null||i.startJourney(),i==null||i.onResize()}function y(e){var d,a;e.classList.remove("is-immersive"),e.classList.add("is-preview"),document.body.classList.remove("postilka-voxel-lock");const s=e.querySelector("[data-voxel-expand]"),t=e.querySelector("[data-voxel-collapse]");t==null||t.setAttribute("hidden",""),s==null||s.removeAttribute("hidden");const n=o.get(e);(d=n==null?void 0:n.scene)==null||d.stopJourney(),(a=n==null?void 0:n.scene)==null||a.onResize(),e.scrollIntoView({behavior:"smooth",block:"start"})}function x(){document.querySelectorAll("[data-postilka-voxel-root]").forEach(e=>{var s,t;o.has(e)||(k(e),(s=e.querySelector("[data-voxel-expand]"))==null||s.addEventListener("click",()=>{p(e)}),(t=e.querySelector("[data-voxel-collapse]"))==null||t.addEventListener("click",()=>{y(e)}))})}window.PostilkaVoxel={mount:k,expand(e=u){e&&p(e)},collapse(e=u){e&&y(e)},getActiveScene(){return i}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",x):x();
