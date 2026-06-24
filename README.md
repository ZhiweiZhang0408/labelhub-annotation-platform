# LabelHub

端到端 Web 数据标注平台：覆盖数据生产全生命周期 —— 任务配置、动态表单搭建、在线分发与提交、AI 自动预审、多角色人工审核、多格式导出。

## 架构

| 子项目 | 技术 | 职责 |
|---|---|---|
| `frontend/` | React + TypeScript (Vite) | 表单设计器、标注工作台、审核台、导出 |
| `backend/` | NestJS + Prisma + PostgreSQL | 业务真相、Auth/RBAC、工作流状态机、导出 |
| `ai-service/` | FastAPI (Python) | AI 质检 Agent（评测标准 + 结构化打分） |

详见 [docs/DESIGN.md](docs/DESIGN.md)。

## 本地启动

> 文档完善中，随开发进度更新。

```bash
# 起数据库
docker compose up -d

# 后端
cd backend && npm install && npm run start:dev

# 前端
cd frontend && npm install && npm run dev
```
