"""
LabelHub AI 质检子服务（FastAPI）。

职责：接收"标注结果 + 评测标准" → 输出"结构化打分 + 通过/驳回建议"。
第 1-3 周：用 mock 假数据把接口跑通（mock-first 策略）。
第 4 周：把 mock_review() 换成真正调用大模型，接口形状不变。
"""
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="LabelHub AI Service")


# ---------- 请求/响应的数据形状（Pydantic 模型）----------
# Pydantic 模型 = 自动做数据校验。请求 JSON 不符合这个形状，FastAPI 直接报 422，
# 你的业务代码拿到的一定是干净、类型正确的数据。

class ReviewRequest(BaseModel):
    annotation: dict          # 标注员提交的结果（动态表单的 JSON）
    criteria: str             # 任务负责人配置的评测标准（自然语言）


class ReviewResponse(BaseModel):
    score: int                # 0-100 打分
    passed: bool              # 是否建议通过
    reason: str               # 理由（给人工审核员看）
    is_mock: bool             # 标记这是不是假数据（方便区分 mock / 真模型）


# ---------- 健康检查 ----------
@app.get("/health")
def health():
    return {"status": "ok", "service": "labelhub-ai"}


# ---------- 质检接口（当前为 mock）----------
@app.post("/review", response_model=ReviewResponse)
def review(req: ReviewRequest) -> ReviewResponse:
    # TODO(第4周): 把下面这段假逻辑换成"调大模型 → 解析结构化输出"。
    # 接口形状（ReviewRequest / ReviewResponse）保持不变，所以主服务那边零改动。
    return mock_review(req)


def mock_review(req: ReviewRequest) -> ReviewResponse:
    # 假的规则：标注里字段越多，假装质量越高。纯粹为了让工作流先跑起来。
    filled = len([v for v in req.annotation.values() if v])
    score = min(60 + filled * 10, 100)
    return ReviewResponse(
        score=score,
        passed=score >= 70,
        reason=f"[MOCK] 依据标准「{req.criteria}」自动预审；检测到 {filled} 个有效字段。",
        is_mock=True,
    )
