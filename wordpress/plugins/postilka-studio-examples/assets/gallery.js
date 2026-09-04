(function () {
  "use strict";

  var CATEGORY_LABELS = {
    product_shot: "Съёмка товара",
    motion: "Движение",
    ugc: "UGC",
    ads: "Реклама",
    posters: "Постеры",
    marketplace: "Маркетплейс",
  };

  function qs(el, sel) {
    return el.querySelector(sel);
  }

  function mediaUrl(apiBase, path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path) || path.indexOf("data:") === 0) return path;
    if (path.indexOf("/app/") === 0) return path;
    if (path.indexOf("/api/") === 0) return "/app" + path;
    return apiBase.replace(/\/$/, "") + (path.charAt(0) === "/" ? path : "/" + path);
  }

  function aspectClass(ratio) {
    switch (ratio) {
      case "9:16":
        return "is-9-16";
      case "4:5":
        return "is-4-5";
      case "16:9":
        return "is-16-9";
      default:
        return "is-1-1";
    }
  }

  function columnCount() {
    var width = window.innerWidth;
    if (width >= 1536) return 6;
    if (width >= 1280) return 5;
    if (width >= 1024) return 4;
    if (width >= 640) return 3;
    return 2;
  }

  function studioHref(ctaBase, section, templateId) {
    var params = new URLSearchParams();
    if (section && section !== "all") {
      params.set("tab", "studio");
      params.set("section", section);
    }
    if (templateId) params.set("template", templateId);
    var qsValue = params.toString();
    return qsValue ? ctaBase + "?" + qsValue : ctaBase;
  }

  function categoryLabel(id, fallbacks) {
    if (fallbacks && fallbacks[id]) return fallbacks[id];
    return CATEGORY_LABELS[id] || id;
  }

  function init(root) {
    var apiBase = root.getAttribute("data-api-base") || "/app/api/v1";
    var ctaBase = root.getAttribute("data-cta-base") || "/app/ai";
    var pageSize = Math.max(1, Math.min(48, parseInt(root.getAttribute("data-page-size") || "18", 10) || 18));
    var linkEnabled = root.getAttribute("data-link") !== "0";
    var filtersEl = qs(root, "[data-pse-filters]");
    var statusEl = qs(root, "[data-pse-status]");
    var gridEl = qs(root, "[data-pse-grid]");
    var sentinelEl = qs(root, "[data-pse-sentinel]");

    var state = {
      category: root.getAttribute("data-category") || "all",
      offset: 0,
      hasMore: true,
      loading: false,
      items: [],
      categories: [],
      labels: {},
    };
    var videoIo = null;

    function setStatus(text, isError) {
      if (!statusEl) return;
      if (!text) {
        statusEl.hidden = true;
        statusEl.textContent = "";
        statusEl.classList.remove("is-error");
        return;
      }
      statusEl.hidden = false;
      statusEl.textContent = text;
      statusEl.classList.toggle("is-error", !!isError);
    }

    function renderFilters() {
      if (!filtersEl) return;
      var cats = [{ id: "all", label: "Все" }].concat(state.categories);
      filtersEl.replaceChildren();
      cats.forEach(function (cat) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pse-filter" + (state.category === cat.id ? " is-active" : "");
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", state.category === cat.id ? "true" : "false");
        btn.textContent = cat.label;
        btn.addEventListener("click", function () {
          if (state.category === cat.id || state.loading) return;
          state.category = cat.id;
          state.offset = 0;
          state.hasMore = true;
          state.items = [];
          gridEl.replaceChildren();
          renderFilters();
          setStatus("Загрузка примеров…");
          loadMore();
        });
        filtersEl.appendChild(btn);
      });
    }

    function renderGrid() {
      var cols = columnCount();
      var columns = [];
      var i;
      for (i = 0; i < cols; i++) columns.push([]);
      state.items.forEach(function (item, index) {
        columns[index % cols].push(item);
      });

      gridEl.replaceChildren();
      columns.forEach(function (column) {
        var col = document.createElement("div");
        col.className = "pse-col";
        column.forEach(function (item) {
          col.appendChild(renderCard(item));
        });
        gridEl.appendChild(col);
      });
    }

    function renderCard(item) {
      var tag = linkEnabled ? "a" : "div";
      var card = document.createElement(tag);
      card.className = "pse-card" + (linkEnabled ? "" : " is-static");
      if (linkEnabled) {
        card.href = studioHref(ctaBase, item.category, item.id);
      }

      var media = document.createElement("div");
      media.className = "pse-media " + aspectClass(item.aspect_ratio || "1:1");

      var poster = mediaUrl(apiBase, item.preview_url || "");
      var source = mediaUrl(apiBase, item.preview_source_url || "");
      var isVideo = item.preview_kind === "video" && source;

      if (isVideo) {
        var video = document.createElement("video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = false;
        video.preload = "none";
        video.setAttribute("playsinline", "");
        if (poster) video.poster = poster;
        video.dataset.src = source;
        media.appendChild(video);
      } else if (poster) {
        var img = document.createElement("img");
        img.alt = item.title || "";
        img.loading = "lazy";
        img.decoding = "async";
        img.src = poster;
        media.appendChild(img);
      }

      var badge = document.createElement("span");
      badge.className = "pse-badge";
      badge.textContent = categoryLabel(item.category, state.labels);
      media.appendChild(badge);

      card.appendChild(media);
      return card;
    }

    function observeVideos() {
      var videos = root.querySelectorAll("video[data-src]");
      if (videoIo) {
        videoIo.disconnect();
        videoIo = null;
      }
      if (!("IntersectionObserver" in window)) {
        videos.forEach(function (video) {
          video.src = video.dataset.src;
          video.preload = "metadata";
        });
        return;
      }
      videoIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var video = entry.target;
            if (entry.isIntersecting) {
              if (!video.getAttribute("src") && video.dataset.src) {
                video.src = video.dataset.src;
                video.preload = "metadata";
              }
              var play = video.play();
              if (play && typeof play.catch === "function") play.catch(function () {});
            } else if (!video.paused) {
              video.pause();
            }
          });
        },
        { rootMargin: "200px 0px", threshold: 0.15 }
      );
      videos.forEach(function (video) {
        videoIo.observe(video);
      });
    }

    function loadMore() {
      if (state.loading || !state.hasMore) return;
      state.loading = true;
      if (sentinelEl) sentinelEl.hidden = true;

      var params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(state.offset));
      if (state.category && state.category !== "all") {
        params.set("category", state.category);
      }

      fetch(apiBase.replace(/\/$/, "") + "/public/ad-studio/templates?" + params.toString(), {
        credentials: "same-origin",
      })
        .then(function (res) {
          if (!res.ok) throw new Error("catalog");
          return res.json();
        })
        .then(function (data) {
          var incoming = Array.isArray(data.items) ? data.items : [];
          state.categories = Array.isArray(data.categories) ? data.categories : state.categories;
          state.labels = {};
          state.categories.forEach(function (cat) {
            state.labels[cat.id] = cat.label;
          });
          state.items = state.items.concat(incoming);
          state.offset += incoming.length;
          state.hasMore = !!data.has_more;
          renderFilters();
          if (state.items.length === 0) {
            setStatus("Пока нет опубликованных примеров.");
          } else {
            setStatus("");
          }
          renderGrid();
          observeVideos();
          if (sentinelEl) sentinelEl.hidden = !state.hasMore;
        })
        .catch(function () {
          setStatus("Не удалось загрузить примеры студии.", true);
          if (sentinelEl) sentinelEl.hidden = true;
        })
        .finally(function () {
          state.loading = false;
          if (state.hasMore && sentinelEl && !sentinelEl.hidden) {
            var rect = sentinelEl.getBoundingClientRect();
            if (rect.top < window.innerHeight + 600) {
              loadMore();
            }
          }
        });
    }

    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (state.items.length) {
          renderGrid();
          observeVideos();
        }
      }, 120);
    });

    if ("IntersectionObserver" in window && sentinelEl) {
      var moreIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) loadMore();
          });
        },
        { rootMargin: "600px 0px" }
      );
      moreIo.observe(sentinelEl);
    }

    renderFilters();
    loadMore();
  }

  function boot() {
    document.querySelectorAll("[data-postilka-studio-examples]").forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
