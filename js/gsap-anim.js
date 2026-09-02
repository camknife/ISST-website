// ISST 中国官网 · GSAP 高级动效
// 1) 全站 reveal 升级（ScrollTrigger + 交错 + 方向变体）
// 2) 统计数字滚动
// 3) Hero 进场序列 + 背景视差
// 4) 认证路径时间线（连接线生长 + 各步骤依次点亮）
(function () {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- 1. 全站 reveal 升级 ---------- */
  // 支持 data-dir: up / left / right / scale，默认 up
  // 同一容器内多个 reveal 自动交错（stagger）
  var reveals = gsap.utils.toArray('.reveal');
  if (reveals.length) {
    reveals.forEach(function (el) {
      var dir = el.getAttribute('data-dir') || 'up';
      gsap.set(el, {
        autoAlpha: 0,
        y: dir === 'up' ? 28 : dir === 'scale' ? 0 : 0,
        x: dir === 'left' ? -44 : dir === 'right' ? 44 : 0,
        scale: dir === 'scale' ? 0.94 : 1
      });
    });
    ScrollTrigger.batch(reveals, {
      start: 'top 88%',
      onEnter: function (batch) {
        gsap.to(batch, {
          autoAlpha: 1, y: 0, x: 0, scale: 1,
          duration: 0.3, ease: 'power2.out',
          stagger: 0.08, overwrite: true
        });
      }
    });
  }

  /* ---------- 2. 统计数字滚动 ---------- */
  var nums = document.querySelectorAll('.stats .num');
  if (nums.length) {
    nums.forEach(function (el) {
      var small = el.querySelector('small');
      var smallOuter = small ? small.outerHTML : '';
      var textNode = el.childNodes[0];
      var raw = textNode && textNode.nodeType === 3 ? textNode.textContent : el.textContent;
      var m = raw.match(/\d+/);
      if (!m) return;
      var target = parseInt(m[0], 10);
      var prefix = raw.slice(0, m.index);
      var suffix = raw.slice(m.index + m[0].length);
      var counter = { v: 0 };
      gsap.to(counter, {
        v: target,
        duration: 1.2,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onUpdate: function () {
          el.innerHTML = prefix + Math.round(counter.v) + suffix + (smallOuter ? ' ' + smallOuter : '');
        },
        onComplete: function () {
          el.innerHTML = prefix + target + suffix + (smallOuter ? ' ' + smallOuter : '');
        }
      });
    });
  }

  /* ---------- 3. Hero 进场序列 + 背景视差 ---------- */
  var hero = document.querySelector('.hero');
  if (hero) {
    var heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    heroTl
      .from('.hero-eyebrow', { y: 24, autoAlpha: 0, duration: 0.4 }, 0.05)
      .from('.hero h1', { y: 44, autoAlpha: 0, duration: 0.6 }, '-=0.15')
      .from('.hero-en', { y: 26, autoAlpha: 0, duration: 0.4 }, '-=0.4')
      .from('.hero p.lead', { y: 26, autoAlpha: 0, duration: 0.4 }, '-=0.35')
      .from('.hero-btns .btn', { y: 22, autoAlpha: 0, duration: 0.35, stagger: 0.08 }, '-=0.3')
      .from('.hero-mini .item', { y: 18, autoAlpha: 0, duration: 0.35, stagger: 0.06 }, '-=0.35')
      .from('.hero-visual', { y: 34, autoAlpha: 0, scale: 0.96, duration: 0.6 }, '-=0.55');

    // 背景光晕随滚动轻微视差
    gsap.to('.hero', {
      backgroundPosition: '50% 30%',
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- 4. 认证路径时间线 ---------- */
  var path = document.querySelector('.path');
  if (path) {
    // 动态插入进度线（读取伪元素样式，自动适配移动端）
    var line = document.createElement('div');
    var cs = getComputedStyle(path, '::before');
    line.className = 'path-progress';
    line.style.cssText =
      'position:absolute;' +
      'left:' + cs.left + ';' +
      'top:' + cs.top + ';' +
      'bottom:' + cs.bottom + ';' +
      'width:' + cs.width + ';' +
      'background:linear-gradient(180deg,var(--brand),var(--gold));' +
      'border-radius:3px;transform-origin:top;z-index:0;';
    path.style.position = 'relative';
    path.insertBefore(line, path.firstChild);

    gsap.fromTo(line, { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: path, start: 'top 78%', end: 'bottom 55%', scrub: 0.5 }
    });

    // 各步骤依次点亮：dot 弹出 + 卡片滑入
    gsap.utils.toArray('.path-step').forEach(function (step, i) {
      var st = { trigger: step, start: 'top 86%' };
      gsap.from(step, {
        opacity: 0, y: 44, duration: 0.5, ease: 'power3.out',
        scrollTrigger: st
      });
      var dot = step.querySelector('.path-dot');
      if (dot) {
        gsap.from(dot, {
          scale: 0.3, rotation: -18, opacity: 0, duration: 0.4,
          ease: 'back.out(2.2)', delay: 0.08,
          scrollTrigger: st
        });
      }
    });
  }

  /* ---------- 5. 历史页 · 百年时间线（竖向生长 + 节点交错点亮） ---------- */
  var histTl = document.querySelector('.history-timeline');
  if (histTl) {
    // 竖线随滚动生长（覆盖 ::before，实现从顶部到底部的进度感）
    var hl = document.createElement('div');
    hl.className = 'history-timeline-progress';
    hl.style.cssText =
      'position:absolute;' +
      'left:15px;top:6px;bottom:6px;width:3px;' +
      'background:linear-gradient(180deg,var(--brand),var(--gold));' +
      'border-radius:3px;transform-origin:top;z-index:0;';
    histTl.style.position = 'relative';
    histTl.insertBefore(hl, histTl.firstChild);

    gsap.fromTo(hl, { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: histTl, start: 'top 72%', end: 'bottom 60%', scrub: 0.6 }
    });

    // 每个里程碑：整体淡入 + dot 弹出 + 内容左右交错滑入
    gsap.utils.toArray('.tl-item').forEach(function (item, i) {
      var dir = item.getAttribute('data-dir') === 'left' ? -1 : 1;
      var st = { trigger: item, start: 'top 86%' };
      gsap.from(item, {
        autoAlpha: 0, y: 26, duration: 0.5, ease: 'power3.out', scrollTrigger: st
      });
      gsap.from(item.querySelector('.tl-dot'), {
        scale: 0, opacity: 0, duration: 0.4, ease: 'back.out(2.4)',
        delay: 0.05, scrollTrigger: st
      });
      gsap.from(item.querySelector('.tl-body'), {
        x: 36 * dir, opacity: 0, duration: 0.5, ease: 'power3.out',
        delay: 0.08, scrollTrigger: st
      });
    });
  }
})();
