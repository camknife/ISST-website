# ISST 中国官网

国际施罗斯三维脊柱侧弯疗法（ISST）中国官方信息平台，由健衡学园（Active and Balanced Physiotherapy Academy）与德国 ISST 官方合作运营。

- 官网：https://isst-schroth.cn
- 仓库：https://github.com/camknife/ISST-website

## 页面结构

| 页面 | 说明 |
|------|------|
| `index.html` | 首页（Hero、统计、三大支柱、课程速览、认证路径、讲师团队、FAQ） |
| `history.html` | 关于Schroth（百年传承史、时间线） |
| `scoliosis.html` | 脊柱侧弯知识科普 |
| `courses.html` | ISST 认证课程体系（Part I / Part II / Refresher / Doctor Course） |
| `literature.html` | 文献资源（SOSORT 2016 指南要点 + 下载、核心循证文献） |
| `therapists.html` | 治疗师名录（235 位，OSS 头像） |
| `apply.html` | 报名咨询表单 |

## 技术栈

- 纯静态 HTML + CSS + JS，手动部署到阿里云云服务器
- [GSAP](https://greensock.com/gsap/) + ScrollTrigger 动效（`js/gsap-anim.js`、`js/spine.js`）
- 治疗师头像 / 文献 PDF 托管于阿里云 OSS（`isst-website` bucket）
- GEO / AI 检索增强：`sitemap.xml`、`ai.txt`、`llms.txt`、`llms-full.txt`、schema.org JSON-LD

## 报名表单后端

报名页 `apply.html` 提交后写入企业微信智能表格，由 `server/server.js`（Node HTTP server，零依赖，PM2 守护）处理：

```
POST /api/apply  { name, phone, city, job, course, session, message }
```

- 后端自动获取企业微信 `access_token`（2 小时缓存）并调用 `add_records` 写入智能表格
- 后端自动追加「提交时间」字段
- 前端提交失败时回退 mailto 兜底

### 配置

复制 `server/.env.example` 为 `server/.env` 并填写：

```ini
PORT=3000
WECOM_CORP_ID=你的企业ID
WECOM_SECRET=你的应用Secret
WECOM_DOCID=智能表格docid（须为 API create_doc 创建的表）
WECOM_SHEET_ID=q979lj
```

> ⚠️ 企业微信 API 仅允许白名单 IP 调用；`.env` 已加入 `.gitignore`，切勿提交。

### 启动

```bash
cd server
cp .env.example .env   # 填写凭证
pm2 start server.js --name isst-wecom
```

## 部署

项目直接手动推送到阿里云云服务器（服务器 IP 需在企业微信后台加入 API 白名单），`therapists.html` 中的头像引用 OSS 地址。

## 版权声明

ISST® 为德国 ISST 官方体系名称。本站内容仅供参考，最终以官方通知为准。
