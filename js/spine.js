// ISST 首页 · 脊柱对比示意图（椎骨程序化生成 + GSAP 动效）
// 设计：淡色躯干剪影衬底 + 13 节椎骨串（颈细腰粗、逐段按曲线切线旋转）
//       + 肩线/骨盆倾斜对比 + 侧弯顶点金色标记；GSAP 进场序列 + 顶点光晕呼吸。
(function () {
  var svgs = document.querySelectorAll('.spine-svg');
  if (!svgs.length) return;

  var CENTER = 75;
  var Y0 = 34, Y1 = 234, N = 13;          // 椎骨 y 范围与节数
  var SPAN = Y1 - Y0;

  /* ---------- 曲线：高斯叠加，构成「胸右弯 + 腰左弯」双弯 ---------- */
  function gauss(t, mu, sigma, amp) { return Math.exp(-Math.pow((t - mu) / sigma, 2)) * amp; }
  function curvedX(y) {
    var t = (y - Y0) / SPAN;
    return CENTER
      + gauss(t, 0.10, 0.09, -3)   // 颈段轻微偏
      + gauss(t, 0.30, 0.15, 14)   // 胸弯顶点（右）
      + gauss(t, 0.66, 0.16, -13); // 腰弯顶点（左）
  }
  function straightX() { return CENTER; }
  // 切线角（度）
  function tangent(xfn, y) { var h = 1.2; return Math.atan2(xfn(y + h) - xfn(y - h), 2 * h) * 180 / Math.PI; }

  // 椎骨宽度：颈细腰粗
  function vWidth(t) {
    if (t < 0.18) return 7 + (10 - 7) * (t / 0.18);
    if (t < 0.55) return 10 + (11 - 10) * ((t - 0.18) / 0.37);
    return 11 + (13 - 11) * ((t - 0.55) / 0.45);
  }
  // 躯干半宽包络（颈→肩→腰→髋）
  function halfW(t) {
    if (t < 0.07) return 20 + (36 - 20) * (t / 0.07);
    if (t < 0.28) return 36 + (24 - 36) * ((t - 0.07) / 0.21);
    if (t < 0.55) return 24 + (25 - 24) * ((t - 0.28) / 0.27);
    return 25 + (40 - 25) * ((t - 0.55) / 0.45);
  }

  /* ---------- 生成单个脊柱图 ---------- */
  function build(svg, opts) {
    var xfn = opts.curved ? curvedX : straightX;
    var NS = 'http://www.w3.org/2000/svg';
    function mk(tag, attrs) { var el = document.createElementNS(NS, tag); for (var k in attrs) el.setAttribute(k, attrs[k]); return el; }

    var spine = mk('g', { class: 'spine-group' });
    svg.appendChild(spine);

    // 1) 人体轮廓：由曲线中轴 + 半宽包络生成，保证脊柱始终在体内
    var pts = [];
    var STEPS = 48;
    for (var i = 0; i <= STEPS; i++) { var t = i / STEPS, y = Y0 - 6 + (SPAN + 12) * t; pts.push([xfn(y) - halfW(t), y]); }
    for (var j = STEPS; j >= 0; j--) { var t2 = j / STEPS, y2 = Y0 - 6 + (SPAN + 12) * t2; pts.push([xfn(y2) + halfW(t2), y2]); }
    spine.appendChild(mk('path', {
      class: 'silhouette',
      d: 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L') + 'Z',
      fill: '#e9f3f2'
    }));

    // 2) 脊柱中心引导线（虚线）
    var gp = [];
    for (var k = 0; k <= 40; k++) { var y3 = Y0 + SPAN * (k / 40); gp.push(xfn(y3).toFixed(1) + ',' + y3.toFixed(1)); }
    spine.appendChild(mk('path', { class: 'sp-line', d: 'M' + gp.join('L'), 'stroke-width': '1.6', 'stroke-dasharray': '3 4' }));

    // 3) 椎骨
    var vertebrae = [];
    var apexIdx = 0, apexDev = -1;
    for (var m = 0; m < N; m++) {
      var y = Y0 + SPAN * (m / (N - 1));
      var t = m / (N - 1);
      var x = xfn(y), r = tangent(xfn, y), w = vWidth(t);
      var vg = mk('g', { class: 'v', transform: 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + r.toFixed(1) + ')' });
      vg.appendChild(mk('rect', { class: 'vb', x: (-w / 2).toFixed(1), y: -6, width: w.toFixed(1), height: 12, rx: 2.6 }));
      vg.appendChild(mk('line', { class: 'sp', x1: 0, y1: -4.6, x2: 0, y2: 4.6, 'stroke-width': 1.7 }));
      spine.appendChild(vg);
      vertebrae.push({ el: vg, x: x, y: y, r: r, t: t });
      var dev = Math.abs(x - CENTER);
      if (dev > apexDev) { apexDev = dev; apexIdx = vertebrae.length - 1; }
    }

    // 配色（侧弯顶点金色高亮）
    var base = opts.curved ? '#22bcb5' : '#189a94';
    var stroke = opts.curved ? '#189a94' : '#116e6a';
    vertebrae.forEach(function (v, idx) {
      var isApex = opts.curved && idx === apexIdx;
      v.el.querySelector('.vb').setAttribute('fill', isApex ? '#d7a449' : base);
      v.el.querySelector('.vb').setAttribute('stroke', isApex ? '#b07f24' : stroke);
      v.el.querySelector('.vb').setAttribute('stroke-width', '1');
      v.el.querySelector('.sp').setAttribute('stroke', isApex ? '#b07f24' : stroke);
      if (isApex) v.el.classList.add('apex');
    });

    // 4) 肩线 / 骨盆线（侧弯侧倾斜，矫正侧水平）
    var markYs = [Y0 + SPAN * 0.05, Y0 + SPAN * 0.80];
    var tilt = opts.curved ? 4 : 0;
    for (var s = 0; s < 2; s++) {
      var yL = markYs[s], tL = s === 0 ? 0.05 : 0.80, dy = s === 0 ? tilt : -tilt;
      var xL = xfn(yL) - halfW(tL), xR = xfn(yL) + halfW(tL);
      var op = opts.curved ? 0.95 : 0.75;
      spine.appendChild(mk('line', { class: 'm-line', x1: xL.toFixed(1), y1: (yL + dy).toFixed(1), x2: xR.toFixed(1), y2: (yL - dy).toFixed(1), stroke: '#d7a449', 'stroke-width': 2.6, opacity: op }));
      [[xL, yL + dy], [xR, yL - dy]].forEach(function (p) {
        spine.appendChild(mk('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 2, fill: '#d7a449', opacity: op }));
      });
    }

    // 5) 顶点金色光晕 + 「顶点」微标
    if (opts.curved) {
      var a = vertebrae[apexIdx];
      spine.insertBefore(mk('circle', { class: 'glow', cx: a.x.toFixed(1), cy: a.y.toFixed(1), r: 15, fill: '#d7a449', opacity: 0.2 }), a.el);
      spine.appendChild(mk('line', { x1: (a.x + 2).toFixed(1), y1: (a.y - 5).toFixed(1), x2: (a.x + 11).toFixed(1), y2: (a.y - 9).toFixed(1), stroke: '#b07f24', 'stroke-width': 1, opacity: 0.7 }));
      var lab = mk('text', { class: 'apex-label', x: (a.x + 13).toFixed(1), y: (a.y - 10).toFixed(1) });
      lab.textContent = '顶点';
      spine.appendChild(lab);
    }

    return {
      vertebrae: vertebrae,
      glow: opts.curved ? spine.querySelector('.glow') : null
    };
  }

  var before = build(svgs[0], { curved: true });
  var after = build(svgs[1], { curved: false });

  /* ---------- GSAP 动效（无 GSAP / 偏好减弱动效时保留静态图） ---------- */
  if (typeof gsap === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  // 用 gsap 重新表达椎骨变换（绕自身中心旋转缩放）
  [before.vertebrae, after.vertebrae].forEach(function (vs) {
    vs.forEach(function (v) {
      gsap.set(v.el, { x: v.x, y: v.y, rotation: v.r, transformOrigin: '50% 50%' });
    });
  });

  var tl = gsap.timeline({
    scrollTrigger: { trigger: '.spine-card', start: 'top 85%', toggleActions: 'play none none none' }
  });

  tl.from('.spine-card .silhouette', { opacity: 0, y: 26, duration: 0.9, ease: 'power2.out' })
    .from('.spine-card .before .v', { opacity: 0, scale: 0.35, y: 16, rotation: '+=26', duration: 0.7, ease: 'back.out(1.7)', stagger: 0.05 }, '-=0.5')
    .from('.spine-card .before .m-line', { scaleX: 0, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08 }, '-=0.35')
    .from('.spine-card .after .v', { opacity: 0, scale: 0.35, y: 12, rotation: '+=20', duration: 0.6, ease: 'back.out(1.7)', stagger: 0.04 }, '-=0.3')
    .from('.spine-card .after .m-line', { scaleX: 0, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08 }, '-=0.2')
    .from('.spine-arrow', { opacity: 0, scale: 0.5, duration: 0.5, ease: 'back.out(2)' }, '-=0.35');

  // 箭头虚线流动（矫正方向）
  gsap.to('.spine-arrow .flowline line', { strokeDashoffset: '-=10', duration: 0.9, ease: 'none', repeat: -1 });

  // 顶点光晕呼吸（常驻）
  if (before.glow) {
    gsap.to(before.glow, { opacity: 0.42, duration: 1.8, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 1.2 });
  }
})();
