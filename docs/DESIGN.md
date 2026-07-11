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

### Day 3 — Prisma 入门 + 数据建模 ✅（已完成）
- **做什么**：装 Prisma，连上 Day 2 的 Postgres；在 `schema.prisma` 里建模型 **User / Role / Task / FormSchema / Annotation / Review** 及其关系；跑第一次 migration。
- **为什么**：数据模型是整个系统的"骨架"，先把实体和关系定清楚，后面所有功能都挂在它上面。Prisma 把"改模型→改库→生成类型安全的查询代码"串成一条龙。
- **产出**：`schema.prisma` 完整模型；一次成功的 `prisma migrate`；可用 `prisma studio` 可视化看表。
- **学到**：ORM 是什么、migration 是什么、JSONB 字段怎么存动态表单 Schema 与标注结果、一对多/多对多关系。
- **自己试试**：在 Prisma Studio 手动插一条 User，感受表结构。
- **实际产出**：`backend/prisma/schema.prisma`（6 模型 + 4 枚举 `Role`/`AnnotationStatus`/`ReviewType`/`ReviewDecision`）；migration `20260626011000_init`；库内 5 张业务表 + `_prisma_migrations`。Studio 在 `http://localhost:5555`。
- **建模决策**：Role 用 enum（角色固定，RolesGuard 直接判）；FormSchema 与 Task 做 1:1（`taskId @unique`），`schema` 字段 JSONB 存动态表单结构（最大亮点的落点）；Annotation 是状态机载体，`payload`/`result` 用 JSONB；Review 一行一次审核，AI/人工共用靠 `type` 区分，`reviewerId` 对 AI 可空；主键统一 `cuid()`。
- **踩坑（重要）**：本机已装 Postgres 占了 5432 **和** 5433 的 loopback，Docker 库虽绑 `*` 但 127.0.0.1 被本机库抢先 → Prisma 连 `localhost:5432` 撞到本机库报 `P1010 denied`。**排查关键**：开 `log_connections` 发现 Docker 库零连接记录 + `lsof -iTCP:<port>` 看到本机 postgres。**解法**：Docker 宿主机端口改 **5434**（见 docker-compose + 两个 .env）。另外 Prisma 7 引擎在本机连不上 + 与 NestJS CommonJS 有 ESM 摩擦，**已固定到 Prisma 6**。

### Day 4 — 注册 / 登录 + 密码哈希 + JWT
- **做什么**：写 `auth` 模块：注册（bcrypt 哈希存密码）、登录（校验→签发 JWT）；用 Passport-JWT 做"带 token 才能访问"的受保护路由。
- **为什么**：几乎所有后续操作都要"知道你是谁"。先把身份这层打通，权限(Day 5)才有依附对象。
- **产出**：`POST /auth/register`、`POST /auth/login` 返回 token；一个 `@UseGuards` 保护的测试接口。
- **学到**：为什么密码绝不能明文存、哈希 vs 加密、JWT 的结构与无状态鉴权、NestJS Guard。
- **自己试试**：用错误密码登录看是否被拒；拿过期/乱填的 token 访问受保护接口看 401。
- **实际产出**（✅ 完成）：
  - `backend/src/prisma/`：`PrismaService`（继承 `PrismaClient` + `OnModuleInit` 启动时 `$connect`）+ `@Global() PrismaModule`，全局可注入数据库。
  - `backend/src/auth/`：`AuthService`（注册 bcrypt 哈希 cost=10 / 登录 `bcrypt.compare` / 签发 JWT，payload 只放 `sub/email/role`）、`AuthController`（`POST /auth/register`、`POST /auth/login`、`GET /auth/me` 受 `AuthGuard('jwt')` 保护）、`JwtStrategy`（Bearer 取 token + `JWT_SECRET` 验签 + `validate` 挂 `request.user`）、`@CurrentUser()` 参数装饰器、`RegisterDto`/`LoginDto`（class-validator）。
  - `main.ts` 开全局 `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`；`AppModule` 引入 `ConfigModule.forRoot({isGlobal})` + `PrismaModule` + `AuthModule`；`.env` 加 `JWT_SECRET`(随机 48 字节) + `JWT_EXPIRES_IN=7d`。
  - 端到端验证全过：注册→409 查重→登录拿 token→带 token /me 200→无 token/错密码 401→脏数据 400；DB 里密码确为 `$2b$10$…` 哈希；JWT 载荷 base64 解出可读（证明未加密）。
- **依赖**：`bcrypt`/`@nestjs/jwt`/`@nestjs/passport`/`passport`/`passport-jwt`/`@nestjs/config`/`class-validator`/`class-transformer`(+ `@types`)。

### Day 5 — RBAC 三角色 + 收尾
- **做什么**：基于 Role 实现 `@Roles()` 装饰器 + `RolesGuard`，让"任务负责人/标注员/审核员"各自只能访问授权接口；补关键单测；把 Week 1 成果 git 提交存档。
- **为什么**：多角色协作是这个平台的核心，权限要从一开始就用统一机制表达，而不是散落 if-else。周末收尾 + commit 留干净存档点。
- **产出**：角色守卫生效（越权访问 403）；Auth/RBAC 单测；Week 1 的第一个/若干 commit。
- **学到**：认证(authentication) vs 授权(authorization) 的区别、自定义装饰器 + Guard 的组合套路。
- **自己试试**：用标注员的 token 调任务负责人专属接口，确认拿到 403。
- **实际产出**（✅ 完成）：
  - `backend/src/auth/roles.decorator.ts`：`@Roles(...Role[])`，基于 `SetMetadata(ROLES_KEY, roles)` 给路由贴"允许的角色"便签；复用 Prisma 的 `Role` enum，角色名写错编译期就报错。
  - `backend/src/auth/roles.guard.ts`：`RolesGuard implements CanActivate`，用注入的 `Reflector.getAllAndOverride` 读便签 → 没贴便签放行 → 读 `request.user.role` 比对 → 不符抛 `ForbiddenException`(403，自定义中文消息)。
  - `auth.controller.ts` 加两条演示路由:`GET /auth/owner-only`(仅 `TASK_OWNER`)、`GET /auth/review-zone`(`REVIEWER`+`TASK_OWNER`)；守卫顺序 `@UseGuards(AuthGuard('jwt'), RolesGuard)`——先验票拿 `user`，再查角色。
  - `roles.guard.spec.ts`：3 个单测(无便签放行 / 角色匹配放行 / 不符抛 403)，全绿；`tsc --noEmit` 0 错误。
  - 端到端验证全过：标注员→owner-only **403**、负责人→owner-only **200**、标注员→review-zone **403**、负责人→review-zone **200**、无 token→**401**(认证先于授权拦截)。
- **关键概念**：`@UseGuards` 多守卫**从左到右**顺序执行，`RolesGuard` 依赖 `AuthGuard` 先挂好 `request.user`；以类形式传给 `@UseGuards` 的守卫 Nest 会自动 DI 实例化(`Reflector` 全局可用)，**无需**在 module 的 `providers` 注册。

> **本周完成标志**：能 Docker 起库 → 注册登录拿 token → 不同角色访问被正确放行/拦截 → 模型已建好可扩展。下周(W2)在此地基上做动态表单设计器。

---

## 5.2 Week 2 五天拆解（动态表单设计器 + 渲染器）

> 目标：一周内做出难度三件套的 **#1 —— Schema-driven UI**。任务负责人用**拖拽设计器**搭一张标注表单 → 产出一份 **JSON Schema** 存进数据库(JSONB) → 标注工作台读这份 Schema **动态渲染**成可填写、可校验的真实表单。
> 主线思想：**表单"结构"是数据，不是写死的代码。** 一套渲染器 + 不同的 Schema = 无限种表单。
> 节奏沿用 Week 1：每天 = 一个可验证的小成果；契约先行 → 设计器 → 渲染器 → 打通闭环。

### Day 1 — 定义 Schema 契约 + 后端 FormSchema 存取
- **做什么**：先用 TypeScript 定义这份"表单 Schema"长什么样(字段数组，每个字段有 `id / type / label / required / options / validation`)，支持的字段类型先定 6 种：单行文本、多行文本、数字、单选、多选、下拉。后端 NestJS 加 `FormSchema` 的存取接口：按 `taskId` **upsert**(Day3 已把 FormSchema 与 Task 做成 1:1)，`schema` 字段直接存进 JSONB。
- **为什么**：设计器(产出方)和渲染器(消费方)都依赖这份契约，**必须先把它一次定清楚**，否则两边各写各的对不上。契约先行是本周不返工的关键。
- **产出**：一份共享的 `form-schema` 类型定义；`PUT /tasks/:id/form-schema`(存)、`GET /tasks/:id/form-schema`(取) 两个接口；能用 curl/Postman 存一份手写 JSON 再读回来。
- **学到**：为什么"用数据描述 UI"(schema-driven) 比写死组件更灵活；JSONB 怎么装一份任意结构；契约先行(contract-first)的工程价值。
- **自己试试**：手写一份含 2~3 个字段的 JSON 存进去，再 GET 出来，确认原样返回。
- **实际产出**（✅ 完成）：
  - `backend/src/form-schema/form-schema.types.ts`：契约本体。6 种字段类型(`text/textarea/number/radio/checkbox/select`)；**判别联合**(以 `type` 为标签，TS 自动收窄 → 渲染器 Day4 分发渲染的基础)分成 `TextField/NumberField/ChoiceField`；`FieldOption` 拆 `label`(给人看)/`value`(存结果)；**校验规则即数据**(`TextValidation`/`NumberValidation` 存进字段)；整表 = `FormSchemaDefinition{version,title,fields}`，即存进 `FormSchema.schema` (JSONB) 的形状。
  - `backend/src/form-schema/`：`FormSchemaService`(按 taskId **upsert** 1:1；先查 Task 存在给友好 404；语义校验)、`FormSchemaController`(`PUT /tasks/:taskId/form-schema` 存、`GET …` 取)、`FormSchemaModule`(注册进 AppModule)、`dto/upsert-form-schema.dto.ts`(class-validator 嵌套校验 `@ValidateNested`+`@Type`)。
  - **关键分工**：class-validator(DTO) 管"形状"(类型/必填/type 白名单/嵌套结构)；service 手写"语义/业务规则"(选择类必须有 options、非选择类不许有 options、字段 id 不重复)——跨字段条件规则 class-validator 表达别扭，放代码里更清楚。
  - **权限**：写(PUT) `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles(TASK_OWNER)`；读(GET) 仅 `AuthGuard('jwt')`(标注员要读它渲染)。资源级归属("只有**这个**任务的 owner")留 W3。
  - **踩坑**：`isolatedModules`+`emitDecoratorMetadata` 下，被装饰器修饰的属性引用纯类型 `FieldType` 必须 `import type`(否则 TS1272)。DTO 属性的 `strictPropertyInitialization(2564)` 仍是编辑器误报(项目 tsconfig 未开 strict)，`tsc --noEmit` 0 错误。
  - 端到端验证全过(库 :5434 + 服务 :3000)：owner 存合法表单→200(2 字段)、annotator 读→200、annotator 写→**403**、select 无 options→**400**、type=rating→**400**、改版再存→200 且库内恒 1 行(upsert)、不存在任务→404、无 token→401。

### Day 2 — 前端接入 + 设计器骨架（组件面板 + 画布）
- **做什么**：前端搭页面路由，做出设计器页面的**三栏骨架**——左侧"字段类型面板"、中间"画布(已添加的字段列表)"、右侧留给配置面板(Day3)。先用**点击添加**：点左侧一个类型，就往中间画布(React state 里的字段数组)加一个字段。
- **为什么**：先把"设计器管理一份 Schema 状态"的主循环跑通(点击→改 state→UI 重渲染)，这是后面拖拽和配置的地基；拖拽是锦上添花，先用点击验证数据流。
- **产出**：设计器页面可访问；点击面板能往画布加字段，画布实时显示当前字段列表；右上角能看到当前 Schema 的 JSON 预览。
- **学到**：React 受控状态管理一份复杂对象/数组、列表渲染(`.map` + `key`)、把"UI 操作"翻译成"对 state 的增删改"。
- **自己试试**：加几个不同类型的字段，看右侧 JSON 预览是否同步变化。

### Day 3 — 拖拽排序 + 字段配置面板
- **做什么**：引入拖拽库(如 `dnd-kit`)让画布里的字段能**拖拽排序**；右侧做**配置面板**：选中一个字段后可改它的 `label`、是否 `required`、单选/多选/下拉的 `options`、以及校验规则(文本长度、数字范围、正则)。
- **为什么**：一张真实表单的字段有顺序、有必填、有选项、有校验——这些都要能可视化配置并写回 Schema，设计器才算"能用"。
- **产出**：字段可拖拽调序；选中字段可编辑其全部属性并即时反映到 JSON 预览；一份结构完整、可保存的 Schema。
- **学到**：拖拽交互的数据模型(拖动 = 重排数组)、"选中态"的管理、把校验规则也当数据存进 Schema。
- **自己试试**：配一个"必填 + 最多 20 字"的文本字段和一个带 3 个选项的下拉，看 JSON 里校验规则是否正确落下。

### Day 4 — 动态渲染器 + schema 驱动校验
- **做什么**：写**渲染器组件** `<FormRenderer schema={...} />`：吃一份 Schema，`.map` 字段 → 按 `type` 渲染对应输入控件，拼成一张**真实可填写**的表单；接 `react-hook-form`，把 Schema 里的校验规则(required/长度/范围/正则)翻译成**运行时校验**，填错实时报错。
- **为什么**：这是本周的技术高潮——**证明"同一份数据能生成一张真表单"**。渲染器与设计器解耦：任何来源的合法 Schema 都能渲染，这正是 schema-driven UI 的说服力所在。
- **产出**：给渲染器喂 Day1 手写或 Day3 产出的 Schema，就能得到一张能填、能校验、能拿到填写结果(JSON)的表单。
- **学到**：`type → 组件`的映射分发(switch/查表)、受控表单 + `react-hook-form`、把"声明式校验规则"转成"运行时校验"。
- **自己试试**：手改 Schema 里某字段的 `type` 或校验规则，不改一行渲染器代码，看表单跟着变。

### Day 5 — 打通闭环 + 联调 + 收尾
- **做什么**：把三段接起来——设计器"保存"→ 调 Day1 的接口把 Schema 存库；做一个"标注工作台"页面按 `taskId` 从后端**拉 Schema** → 交给 `<FormRenderer>` 渲染 → 填写并"提交"收集结果 JSON(先本地打印/或存 Annotation)。端到端联调 + git 提交 + 更新本设计文档。
- **为什么**：单点都通不等于闭环通。走一遍"设计→存→取→渲染→提交"证明数据契约在真实链路里对得上，才算完成本周里程碑；周末收尾留干净 commit。
- **产出**：设计器存的表单，工作台能原样渲染出来并填写提交；Week 2 的若干 commit；DESIGN.md 更新实际产出。
- **学到**：前后端联调(fetch/axios + 错误处理)、一份数据契约贯穿多个页面/服务的全链路视角。
- **自己试试**：在设计器里改表单再保存，刷新工作台，确认渲染出的是新版本。

> **本周完成标志**：能在设计器里拖拽搭出一张带校验的表单 → 存进数据库 → 工作台从库里读出并动态渲染成可填写可校验的真实表单 → 提交拿到结果 JSON。难度三件套 #1(schema-driven UI) 落地，为 W3 工作流(把提交结果推入状态机)铺好路。

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
- **Prisma / 数据建模（Day3）**：ORM = 表↔对象自动映射，写 `prisma.user.findMany()` 而非手拼 SQL，且类型安全；"改 schema → migrate → generate Client"一条龙；migration = 库结构的版本历史（像 git，可重放）；`@unique` 把多对一收成一对一；反向关系字段不建库列只为方便查询；JSONB 存动态/可变结构（表单 schema、标注结果）。
- **运维排错（Day3 实战）**：端口被本机服务抢占时 `lsof -nP -iTCP:<port> -sTCP:LISTEN` 看谁在听；loopback(127.0.0.1) 的具体绑定会盖过 `*` 绑定；DB 连不上先用 `log_connections` + 容器日志确认"请求到底有没有到这台库"。

## 9. 待办 / 下一步

- [x] W1-1a：git init + 根目录 README/.gitignore
- [x] W1-1b：NestJS backend 脚手架
- [x] W1-1c：frontend（Vite + React + TS）脚手架
- [x] W1-1d：ai-service（FastAPI）骨架（mock /review）
- [x] **W1-2（Day 2）**：Docker / Docker Compose 概念 + 起 PostgreSQL 容器（`docker-compose.yml` + `.env`/`.env.example`，库 healthy，volume 持久化已验证）
- [x] **W1-3（Day 3）**：Prisma 入门 + 数据建模（6 模型 + 4 枚举；migrate init 成功；Studio 可视化）。库端口因本机 Postgres 冲突改 5434；Prisma 固定 v6。
- [x] **W1-4（Day 4）**：注册登录 + bcrypt 哈希 + JWT + Passport 守卫(已 commit)
- [x] **W1-5（Day 5）**：RBAC 三角色 `@Roles()` + `RolesGuard`(越权 403) + 守卫单测；Week 1 全部 commit 存档
- [x] **W2-1（Day 1）**：定义表单 Schema 契约(TS 类型，6 种字段，判别联合) + 后端 FormSchema 存取接口(按 taskId upsert 进 JSONB；DTO 形状校验 + service 语义校验；写限 TASK_OWNER)。端到端验证全过。
- [ ] **W2-2（Day 2）**：前端接入 + 设计器三栏骨架(字段面板 / 画布 / 配置位)，点击添加字段 + JSON 预览
- [ ] **W2-3（Day 3）**：拖拽排序(dnd-kit) + 字段配置面板(label/required/options/校验规则)
- [ ] **W2-4（Day 4）**：动态渲染器 `<FormRenderer>` + schema 驱动的运行时校验(react-hook-form)
- [ ] **W2-5（Day 5）**：打通闭环(设计器存 → 工作台按 taskId 取并渲染 → 填写提交) + 联调 + commit

> 本文件为"活文档"，每完成一个里程碑就更新。
