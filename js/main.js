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

  // 锚点链接点击时切换高亮
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
    a.addEventListener('click', () => {
      document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
      a.classList.add('active');
    });
  });

  // 滚动显现动画（无 GSAP 时的降级方案；有 GSAP 时由 gsap-anim.js 接管）
  if (typeof gsap === 'undefined') {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

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

  // 报名表单：优先提交到后端（写入企业微信智能表格），失败回退 mailto
  const form = document.getElementById('applyForm');
  if (form) {
    // 后端接口地址：生产环境改为服务器实际地址（如 https://your-server/api/apply 或同域 /api/apply）
    const API_URL = 'http://60.205.181.202:3000/api/apply';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.name.value.trim();
      const phone = form.phone.value.trim();
      const city = form.city.value.trim();
      const job = form.job.value;
      const course = form.course.value;
      const session = form.session.value;
      const msg = form.message.value.trim();

      const submitBtn = form.querySelector('.submit-btn');
      const origText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '提交中…';

      const payload = { name, phone, city, job, course, session, message: msg };

      const showSuccess = () => {
        document.getElementById('applyFields').style.display = 'none';
        document.getElementById('formOk').style.display = 'block';
      };

      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(r => r.json())
        .then(res => {
          if (res.ok) {
            showSuccess();
          } else {
            // 后端不可用或校验失败：回退 mailto
            fallbackMailto(name, phone, city, course, msg);
          }
        })
        .catch(() => {
          // 网络错误：回退 mailto
          fallbackMailto(name, phone, city, course, msg);
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = origText;
        });

      function fallbackMailto(name, phone, city, course, msg) {
        const subject = encodeURIComponent('ISST 课程报名咨询 - ' + name);
        const body = encodeURIComponent(
          '姓名：' + name + '\n' +
          '手机：' + phone + '\n' +
          '所在城市：' + city + '\n' +
          '意向课程：' + course + '\n' +
          '留言：' + (msg || '（无）') + '\n\n' +
          '（由 ISST 中国官网报名页提交）'
        );
        window.location.href = 'mailto:jianhengacademy@yeah.net?subject=' + subject + '&body=' + body;
        showSuccess();
      }
    });
  }
})();
