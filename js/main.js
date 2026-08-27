// ISST 中国官网 · 公共脚本
(function () {
  // 导航吸顶
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    onScroll();
  }
  if (burger && navLinks) {
    burger.addEventListener('click', () => { burger.classList.toggle('open'); navLinks.classList.toggle('open'); });
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.classList.remove('open'); navLinks.classList.remove('open');
    }));
  }

  // 当前页导航高亮（按 data-nav 匹配）
  const page = document.body.getAttribute('data-nav');
  if (page) {
    document.querySelectorAll('.nav-links a').forEach(a => {
      if (a.getAttribute('data-page') === page) a.classList.add('active');
    });
  }

  // 滚动显现动画
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // FAQ 手风琴
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const ans = item.querySelector('.faq-a');
      const open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!open) { item.classList.add('open'); ans.style.maxHeight = ans.scrollHeight + 'px'; }
    });
  });

  // 报名表单：组装邮件并调用 mailto（无后端时最稳），同时显示提交成功反馈
  const form = document.getElementById('applyForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.name.value.trim();
      const phone = form.phone.value.trim();
      const city = form.city.value.trim();
      const course = form.course.value;
      const msg = form.message.value.trim();
      const subject = encodeURIComponent('ISST 课程报名咨询 - ' + name);
      const body = encodeURIComponent(
        '姓名：' + name + '\n' +
        '手机：' + phone + '\n' +
        '所在城市：' + city + '\n' +
        '意向课程：' + course + '\n' +
        '留言：' + (msg || '（无）') + '\n\n' +
        '（由 ISST 中国官网报名页提交）'
      );
      // 尝试 mailto 打开（用户邮件客户端）作为无后端兜底
      window.location.href = 'mailto:jianhengacademy@yeah.net?subject=' + subject + '&body=' + body;
      // 展示成功反馈
      document.getElementById('applyFields').style.display = 'none';
      document.getElementById('formOk').style.display = 'block';
    });
  }

  // ===== 案例中心页 =====
  const caseGrid = document.getElementById('caseGrid');
  if (caseGrid) {
    const count = parseInt(caseGrid.getAttribute('data-count') || '0', 10);
    const lbItems = [];
    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(2, '0');
      const src = 'images/cases/case-' + num + '.jpg';
      const title = 'ISST 三维矫正训练案例 #' + num;
      lbItems.push({ src, title, caption: title + ' · 治疗前后对比（点击放大）' });
      const fig = document.createElement('figure');
      fig.className = 'case-card';
      fig.innerHTML =
        '<span class="num-chip">' + num + '</span>' +
        '<img src="' + src + '" alt="' + title + '" loading="lazy" data-lb="' + title + '" data-caption="' + title + ' · 治疗前后对比">' +
        '<figcaption>' + title + '</figcaption>' +
        '<div class="overlay">' + title + '</div>';
      caseGrid.appendChild(fig);
      fig.querySelector('img').addEventListener('click', () => openLb(lbItems.length - 1));
    }

    // 收集效果图（2 张 5 天对比图）
    document.querySelectorAll('.case-effect-card img[data-lb]').forEach(img => {
      lbItems.push({
        src: img.getAttribute('src'),
        title: img.getAttribute('data-lb'),
        caption: img.getAttribute('data-caption') || img.getAttribute('data-lb')
      });
      img.addEventListener('click', () => openLb(lbItems.length - 1));
    });

    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lbImg');
    const lbCaption = document.getElementById('lbCaption');
    let cur = 0;

    function openLb(i) {
      cur = i;
      lbImg.src = lbItems[cur].src;
      lbImg.alt = lbItems[cur].title;
      lbCaption.textContent = lbItems[cur].caption;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeLb() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }
    function step(d) {
      cur = (cur + d + lbItems.length) % lbItems.length;
      openLb(cur);
    }
    document.getElementById('lbClose').addEventListener('click', closeLb);
    document.getElementById('lbPrev').addEventListener('click', e => { e.stopPropagation(); step(-1); });
    document.getElementById('lbNext').addEventListener('click', e => { e.stopPropagation(); step(1); });
    lightbox.addEventListener('click', closeLb);
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }
})();
