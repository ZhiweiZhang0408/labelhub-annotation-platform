// 按 payload 的类型渲染真实标注对象(图/文/音/视)。工作台和审核台共用。
interface Payload {
  kind: string;
  name: string;
  url?: string;
  text?: string;
}

export function SubjectView({ payload }: { payload: Payload }) {
  if (payload.kind === 'text') {
    return <p className="sv__text">{payload.text}</p>;
  }
  if (payload.kind === 'image') {
    return <img className="sv__img" src={payload.url} alt={payload.name} />;
  }
  if (payload.kind === 'audio') {
    return <audio className="sv__media" src={payload.url} controls />;
  }
  if (payload.kind === 'video') {
    return <video className="sv__media" src={payload.url} controls />;
  }
  return null;
}
