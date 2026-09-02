// 治疗师名录 · 地区筛选（由顶栏导航下拉携带 ?region=… 触发）
(function () {
  if (!document.querySelector('.th-region')) return;   // 仅名录页

  const regions = Array.prototype.map.call(document.querySelectorAll('.th-region'), r => {
    const h = r.querySelector('.rh h2');
    return { el: r, name: h ? h.textContent.trim() : '' };
  }).filter(r => r.name);
  if (!regions.length) return;

  function qs(name) {
    const m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }

  const wanted = qs('region');
  if (!wanted || wanted === '全部地区') return;        // 无参数：展示全量

  let target = null;
  regions.forEach(r => {
    const show = (r.name === wanted);
    r.el.style.display = show ? '' : 'none';
    if (show) target = r.el;
  });
  if (!target) return;                                  // 参数无效：保持全量

  // 若顶部 URL 无 hash，则平滑定位到所选地区板块，便于用户定位
  if (!location.hash) {
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }
})();
