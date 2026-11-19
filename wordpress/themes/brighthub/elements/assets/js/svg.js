(function ($) {
  // Icon box layout 2
  function pxl_widget_svg_icon_box_handler(id) {
    const path1 = document.getElementById(`path1_${id}`);
    const path2 = document.getElementById(`path2_${id}`);
    const path3 = document.getElementById(`path3_${id}`);
    const path4 = document.getElementById(`path4_${id}`);

    const rectPath1_1 = document.getElementById(`rect-path1-1_${id}`);
    const rectPath1_2 = document.getElementById(`rect-path1-2_${id}`);
    const rectPath2_1 = document.getElementById(`rect-path2-1_${id}`);
    const rectPath2_2 = document.getElementById(`rect-path2-2_${id}`);
    const rectPath3_1 = document.getElementById(`rect-path3-1_${id}`);
    const rectPath3_2 = document.getElementById(`rect-path3-2_${id}`);
    const rectPath4_1 = document.getElementById(`rect-path4-1_${id}`);
    const rectPath4_2 = document.getElementById(`rect-path4-2_${id}`);
    const rectPath4_3 = document.getElementById(`rect-path4-3_${id}`);

    if (!path1 || !path2 || !path3 || !path4) return;

    const path1Length = path1.getTotalLength();
    const path2Length = path2.getTotalLength();
    const path3Length = path3.getTotalLength();
    const path4Length = path4.getTotalLength();

    const duration1 = 8000;
    const duration2 = 9000;
    const duration3 = 6000;
    const duration4 = 4000;

    function positionRectAlongPath(rect, path, pathLength, progress) {
      const point = path.getPointAtLength(progress * pathLength);
      const pointAhead = path.getPointAtLength(Math.min(progress * pathLength + 1, pathLength));
      const angle = (Math.atan2(pointAhead.y - point.y, pointAhead.x - point.x) * 180) / Math.PI;
      rect.setAttribute("x", point.x - 20);
      rect.setAttribute("y", point.y - 1);
      rect.setAttribute("transform", `rotate(${angle} ${point.x} ${point.y})`);
    }

    function animateRect(rect, path, pathLength, duration, startOffset = 0) {
      let startTime;
      let frameCount = 0;
      function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        frameCount++;
        if (frameCount % 2 === 0) {
          const elapsed = (timestamp - startTime + startOffset) % duration;
          const progress = elapsed / duration;
          positionRectAlongPath(rect, path, pathLength, progress);
        }
        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    }

    if (rectPath1_1 && rectPath1_2) {
      animateRect(rectPath1_1, path1, path1Length, duration1, 0);
      animateRect(rectPath1_2, path1, path1Length, duration1, duration1 / 2);
    }
    if (rectPath2_1 && rectPath2_2) {
      animateRect(rectPath2_1, path2, path2Length, duration2, 0);
      animateRect(rectPath2_2, path2, path2Length, duration2, duration2 / 2);
    }
    if (rectPath3_1 && rectPath3_2) {
      animateRect(rectPath3_1, path3, path3Length, duration3, 0);
      animateRect(rectPath3_2, path3, path3Length, duration3, duration3 / 2);
    }
    if (rectPath4_1 && rectPath4_2 && rectPath4_3) {
      animateRect(rectPath4_1, path4, path4Length, duration4, 0);
      animateRect(rectPath4_2, path4, path4Length, duration4, duration4 / 3);
      animateRect(rectPath4_3, path4, path4Length, duration4, (2 * duration4) / 3);
    }
  }

  // Icon box layout 3
  function pxl_widget_svg_icon_box3_handler(id) {
    const animations = [
      { path: `path1-${id}`, rect: `rect1-${id}`, speed: 0.005, startPos: 0.1, direction: 1 },
      { path: `path2-${id}`, rect: `rect2-${id}`, speed: 0.004, startPos: 0.9, direction: -1 },
      { path: `path3-${id}`, rect: `rect3-${id}`, speed: 0.0035, startPos: 0.8, direction: -1 },
      { path: `path4-${id}`, rect: `rect4-${id}`, speed: 0.003, startPos: 0.3, direction: -1 },
      { path: `path5-${id}`, rect: `rect5-${id}`, speed: 0.0025, startPos: 0.5, direction: -1 }
    ];

    const animObjects = animations
      .map((anim) => {
        const path = document.getElementById(anim.path);
        const rect = document.getElementById(anim.rect);
        if (!path || !rect) return null;
        const pathLength = path.getTotalLength();
        return {
          path,
          rect,
          pathLength,
          progress: anim.startPos || 0,
          speed: anim.speed || 0.003,
          direction: anim.direction || 1
        };
      })
      .filter((item) => item !== null);

    let frameCount = 0;
    function animate() {
      frameCount++;
      if (frameCount % 2 === 0) {
        animObjects.forEach((anim) => {
          anim.progress += anim.speed * anim.direction;
          if (anim.progress > 1) anim.progress = 0;
          else if (anim.progress < 0) anim.progress = 1;
          const point = anim.path.getPointAtLength(anim.progress * anim.pathLength);
          const step = 0.001 * anim.direction;
          const nextPoint = anim.path.getPointAtLength((anim.progress + step) * anim.pathLength);
          const angle = (Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) / Math.PI;
          anim.rect.setAttribute(
            "transform",
            `translate(${point.x}, ${point.y}) rotate(${angle}) translate(-16, -1)`
          );
        });
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  function pxl_each_box() {
    if (window.innerWidth >= 1200) {
      document.querySelectorAll(".pxl-icon-box__layout-2").forEach((widget) => {
        const widgetId = widget.id.split("_")[1];
        pxl_widget_svg_icon_box_handler(widgetId);
      });
    }

    document.querySelectorAll(".pxl-icon-box--layout-3").forEach((widget) => {
      const widgetId = widget.id.split("_")[1];
      pxl_widget_svg_icon_box3_handler(widgetId);
    });
  }

  $(window).on("elementor/frontend/init", function () {
    elementorFrontend.hooks.addAction("frontend/element_ready/pxl_icon_box.default", function () {
      pxl_each_box();
    });
  });
})(jQuery);
