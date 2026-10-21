/** Generic safe error page. Never render exception messages or secrets to end users. */
export function renderErrorPage(): string {
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>StockLens AI · 服务异常</title></head><body><main style="font-family:sans-serif;max-width:600px;margin:12vh auto;padding:24px"><h1>服务暂时不可用</h1><p>请稍后重试。数据请求失败时不会使用虚构行情替代。</p><a href="/">返回首页</a></main></body></html>';
}
