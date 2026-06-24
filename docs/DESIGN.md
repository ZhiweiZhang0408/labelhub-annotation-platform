# LabelHub — 端到端 Web 数据标注平台 · 设计文档

> 在大模型与 Agent 训练极度依赖高质量业务数据的背景下，提升数据生产效率与标注质量是 AI 研发的核心环节。
> LabelHub 覆盖数据生产全生命周期：任务配置 → 动态搭建标注页面 → 在线分发与提交 → AI 自动预审 → 多角色人工审核 → 多格式导出。

- **作者目标**：作为美国 SDE 求职的简历项目，展示全栈工程能力。
- **工期**：约 1 个月（启动 2026-06-22，目标 ~2026-07-22）。
- **学习方式**：边搭边讲，理解每个决策的"为什么"。

---

## 1. 这个项目要证明的三件事（难度三件套）

课题考察三个维度，对应本项目的三大技术亮点，也是面试讲点：

1. **复杂动态表单架构（Schema-driven UI）**
   表单"结构"是数据而非写死的代码。设计器产出一份 JSON Schema（字段、组件类型、校验规则）存进数据库；标注工作台读这份 Schema **动态渲染**表单；标注结果同样以 JSON 存回。技术含金量最高的部分。

2. **长链路工作流状态机**
   一条标注数据的完整生命周期由一个**显式状态机**管理（谁能在什么状态下做什么操作），而非散落的 if-else。

3. **AI 质检 Agent 落地**
   任务负责人配置"评测标准"，Agent 拿标注结果 + 标准 → 调 LLM → 输出**结构化打分 + 理由 + 通过/驳回建议**，自动预审，减轻人工审核负担。

---

## 2. 系统架构（三服务 + 一库）

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  React/TS    │HTTP │  NestJS 主服务    │HTTP │ FastAPI AI 服务 │
│  前端 SPA    │────▶│  (业务真相/权限)  │────▶│  (质检 Agent)   │
│ - 表单设计器 │◀────│  - Auth/RBAC      │◀────│ - 调 LLM        │
│ - 标注工作台 │     │  - 任务/分发      │     │ - 评测标准引擎  │
│ - 审核台     │     │  - 工作流状态机   │     │ - 结构化打分    │
│ - 导出       │     │  - 导出           │     └────────────────┘
└──────────────┘     └────────┬─────────┘
                              │
                        ┌─────▼─────┐
                        │PostgreSQL │  ← 业务数据 + JSONB 存动态表单
                        └───────────┘
```

### 技术栈与选型理由

| 层 | 技术 | 为什么选它 |
|---|---|---|
| 前端 | **React + TypeScript** | 美国市场事实标准；动态表单 + 拖拽是核心亮点的最佳载体 |
| 主服务 | **NestJS (TS) + Prisma + PostgreSQL** | 模块化 + 依赖注入 + Guard，天生适合表达多角色权限与工作流；前后端同语言降低成本 |
| AI 子服务 | **FastAPI (Python)** | Python AI 生态最顺；独立微服务可单独伸缩/重试/失败隔离，HTTP 调用解耦 |
| 数据库 | **PostgreSQL（JSONB）** | 关系型存业务真相 + JSONB 灵活存动态表单 Schema 与标注结果 |
| 编排 | **Docker Compose** | 一键起全栈，交付与演示友好 |

> **架构决策**：把 AI 质检拆成独立微服务，主服务通过 HTTP（后续可换异步任务/队列）调用，实现业务逻辑与 AI 逻辑解耦。

---

## 3. 角色与权限（RBAC）

| 角色 | 职责 |
|---|---|
| **任务负责人 (Task Owner)** | 创建任务、配置说明、用设计器搭表单、分发任务、查看进度、导出数据 |
| **标注员 (Annotator)** | 领取/接收分发的任务、在线标注、提交 |
| **审核员 (Reviewer)** | 人工审核 AI 预审后的数据、通过 / 打回重标 |

---

## 4. 核心数据流：一条标注数据的一生（工作流状态机）

```
待标注(PENDING)
   │ 标注员开始
   ▼
标注中(IN_PROGRESS)
   │ 提交
   ▼
已提交(SUBMITTED)
   │ 触发 AI 预审
   ▼
AI预审中(AI_REVIEWING)
   ├─ AI通过 ─▶ 待人工审核(HUMAN_REVIEW)
   └─ AI驳回 ─▶ 待人工审核(HUMAN_REVIEW)   ← AI 给建议，最终由人决定
                    │
       ┌────────────┼────────────┐
       │审核通过                  │打回重标
       ▼                         ▼
   已入库(APPROVED)          标注中(IN_PROGRESS)  ← 回到标注员
```

> 状态机用显式定义（状态 + 允许的转移 + 触发者角色），集中管理，便于测试与扩展。

---

## 5. 四周路线图

| 周 | 主题 | 产出 / 学习点 |
|---|---|---|
| **W1** | 地基 + Auth | Monorepo、Docker 起 Postgres、NestJS+Prisma 数据建模、注册登录、RBAC 三角色。**学：项目架构、数据建模、JWT 鉴权** |
| **W2** | 动态表单设计器 + 渲染器 | 拖拽搭表单 → 存 JSON Schema → 工作台动态渲染并校验。**学：schema-driven UI（最大亮点）** |
| **W3** | 工作流引擎 | 任务创建/分发、标注提交、状态机流转、人工审核台、打回重标。**学：状态机、长链路 workflow** |
| **W4** | AI Agent + 导出 + 部署 | FastAPI 接 LLM 做预审、评测标准引擎、多格式导出(JSON/CSV)、Docker Compose 一键起、README。**学：AI 服务落地、交付打磨** |

每周内部再拆为"今天做什么 / 为什么 / 自己改改试试"的小步子。

---

## 5.1 Week 1 五天拆解（地基 + Auth）

> 目标：一周内拥有一个"能注册登录、有三角色权限、数据库建好模型、一键 Docker 起库"的后端骨架。
> 节奏：每天 = 一个可验证的小成果。Day 1 已在 Session 1 完成 ✅。

### Day 1 — Monorepo + 三服务脚手架 ✅（已完成）
- **做什么**：建 monorepo，跑通 `backend`(NestJS)、`frontend`(Vite React-TS)、`ai-service`(FastAPI) 三个空壳；各写一个 `/health`，验证都能启动。
- **为什么**：先证明"三条腿都能站起来"，把环境/端口/启动方式的坑提前踩平，后面才敢往里堆业务。
- **产出**：三服务可跑；`backend/src/health/` 作为 NestJS 标准功能样例；AI 服务 mock `/review`。
- **学到**：Module/Controller/Service/DI/装饰器、node_modules vs package.json、css vs tsx、useState。
- **自己试试**：改 `/health` 返回里加个字段，看热重载生效。

### Day 2 — Docker + Docker Compose 起 PostgreSQL ✅（已完成）
- **做什么**：理解容器是什么、镜像 vs 容器；写第一份 `docker-compose.yml` 只起一个 Postgres 服务；用客户端连上去验证。
- **为什么**：数据库不该装在本机污染环境；Compose 让"一条命令起依赖"，交付和换电脑都不痛。这是后面 Prisma 连库的前提。
- **产出**：`docker-compose.yml`（postgres 服务 + volume 持久化 + 环境变量）；`docker compose up -d` 后能连进数据库。
- **学到**：镜像/容器/卷/端口映射/环境变量；为什么数据要挂 volume 才不丢。
- **自己试试**：`docker compose down` 再 `up`，确认数据还在（volume 生效）。

### Day 3 — Prisma 入门 + 数据建模
- **做什么**：装 Prisma，连上 Day 2 的 Postgres；在 `schema.prisma` 里建模型 **User / Role / Task / FormSchema / Annotation / Review** 及其关系；跑第一次 migration。
- **为什么**：数据模型是整个系统的"骨架"，先把实体和关系定清楚，后面所有功能都挂在它上面。Prisma 把"改模型→改库→生成类型安全的查询代码"串成一条龙。
- **产出**：`schema.prisma` 完整模型；一次成功的 `prisma migrate`；可用 `prisma studio` 可视化看表。
- **学到**：ORM 是什么、migration 是什么、JSONB 字段怎么存动态表单 Schema 与标注结果、一对多/多对多关系。
- **自己试试**：在 Prisma Studio 手动插一条 User，感受表结构。

### Day 4 — 注册 / 登录 + 密码哈希 + JWT
- **做什么**：写 `auth` 模块：注册（bcrypt 哈希存密码）、登录（校验→签发 JWT）；用 Passport-JWT 做"带 token 才能访问"的受保护路由。
- **为什么**：几乎所有后续操作都要"知道你是谁"。先把身份这层打通，权限(Day 5)才有依附对象。
- **产出**：`POST /auth/register`、`POST /auth/login` 返回 token；一个 `@UseGuards` 保护的测试接口。
- **学到**：为什么密码绝不能明文存、哈希 vs 加密、JWT 的结构与无状态鉴权、NestJS Guard。
- **自己试试**：用错误密码登录看是否被拒；拿过期/乱填的 token 访问受保护接口看 401。

### Day 5 — RBAC 三角色 + 收尾
- **做什么**：基于 Role 实现 `@Roles()` 装饰器 + `RolesGuard`，让"任务负责人/标注员/审核员"各自只能访问授权接口；补关键单测；把 Week 1 成果 git 提交存档。
- **为什么**：多角色协作是这个平台的核心，权限要从一开始就用统一机制表达，而不是散落 if-else。周末收尾 + commit 留干净存档点。
- **产出**：角色守卫生效（越权访问 403）；Auth/RBAC 单测；Week 1 的第一个/若干 commit。
- **学到**：认证(authentication) vs 授权(authorization) 的区别、自定义装饰器 + Guard 的组合套路。
- **自己试试**：用标注员的 token 调任务负责人专属接口，确认拿到 403。

> **本周完成标志**：能 Docker 起库 → 注册登录拿 token → 不同角色访问被正确放行/拦截 → 模型已建好可扩展。下周(W2)在此地基上做动态表单设计器。

---

## 6. 关键决策记录（Decision Log）

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-06-22 | 前端 React/TS + 主服务 NestJS + AI 子服务 FastAPI | 全栈 TS 降本提速 + Python 写 AI 最自然，对口美国 SDE/全栈/AI 岗 |
| 2026-06-22 | **AI 质检 Agent 前三周用 mock，第4周接真模型** | 先验证工作流骨架（风险低），再插入不确定性最大的 AI 部分 |
| 待定 | 真模型选型（Claude API / OpenAI / 本地 Ollama） | 第4周再定 |

---

## 7. 当前状态（截至 2026-06-22，Session 1）

**W1-1 完成 ✅ —— monorepo 三个包均已搭好并验证。**

| 子项目 | 端口 | 状态 | 本地启动命令 |
|---|---|---|---|
| `backend/` (NestJS) | 3000 | ✅ 含示范 `health` 模块 + 单测全绿 | `cd backend && npm run start:dev` |
| `frontend/` (Vite React-TS) | 5173 | ✅ dev server 可访问 | `cd frontend && npm run dev` |
| `ai-service/` (FastAPI) | 8000 | ✅ `/health` + mock `/review` 可用 | `cd ai-service && ./.venv/bin/uvicorn main:app --reload` |

> 小贴士：AI 服务起来后访问 `http://localhost:8000/docs` 有自动生成的交互式 API 文档。

**示范产物**：`backend/src/health/`（module + controller + service + spec）是一个完整的 NestJS 功能样例，演示了"加新功能的标准套路"和"DI 真/假 service 替换"。后续 Auth/Task/Annotation 等模块照此套路扩展。

## 8. 学习进度（已掌握的概念）

- NestJS：**Module / Controller / Service / 依赖注入(DI) / Decorator**；为什么 `new` = 写死、DI = 可替换（mock-first 的底层原理）。
- 工程：`node_modules` vs `package.json` vs `package-lock.json`（清单→install→实物）；Python 的 `venv`/`requirements.txt` 同理。
- 前端：`.css`（样式）vs `.tsx`（JSX 结构 + TS 逻辑）；React 组件 = 返回 JSX 的函数；`useState`（状态，必须用 setter 改，UI 自动更新）。

## 9. 待办 / 下一步

- [x] W1-1a：git init + 根目录 README/.gitignore
- [x] W1-1b：NestJS backend 脚手架
- [x] W1-1c：frontend（Vite + React + TS）脚手架
- [x] W1-1d：ai-service（FastAPI）骨架（mock /review）
- [x] **W1-2（Day 2）**：Docker / Docker Compose 概念 + 起 PostgreSQL 容器（`docker-compose.yml` + `.env`/`.env.example`，库 healthy，volume 持久化已验证）
- [ ] **W1-3（下一步，Day 3）**：Prisma 入门 + 数据建模（User/Role/Task/FormSchema/Annotation/Review）
- [ ] W1-4：注册登录 + JWT + RBAC 三角色
- [ ] 待办：用 git 提交第一个快照（代码尚未 commit）

> 本文件为"活文档"，每完成一个里程碑就更新。
