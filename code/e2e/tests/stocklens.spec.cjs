const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
 await page.goto('/');
 await expect(page).toHaveTitle(/StockLens AI/);
 await expect(page.locator('#dataset-badge')).toContainText('扶摇真实快照');
});

async function screenPe(page) {
 await page.locator('#query').fill('PE<=25');
 await page.getByRole('button', { name: '解析为规则' }).click();
 await expect(page.locator('.rule')).toHaveCount(1);
 await page.getByRole('button', { name: '运行筛选' }).click();
 await expect(page.locator('.stock')).toHaveCount(5);
}

test('真实快照不使用虚构股票或合成数据标签', async ({ page }) => {
 await screenPe(page);
 await expect(page.locator('#stock-results')).toContainText('美的集团');
 await expect(page.locator('#stock-results')).not.toContainText('SYN-');
 await expect(page.locator('#stock-results')).not.toContainText('合成数据 v1');
 await expect(page.locator('#stock-results details')).toHaveCount(0);
});

test('参考 入选依据 排除依据默认为隐藏，只有点击才出现', async ({ page }) => {
 await screenPe(page);
 const stock=page.locator('.stock').filter({ hasText:'美的集团' });
 await expect(stock.getByRole('button', { name: '参考' })).toBeVisible();
 await expect(stock.getByRole('button', { name: '入选依据' })).toBeVisible();
 await expect(stock.getByRole('button', { name: '排除依据' })).toBeVisible();
 const panel=stock.locator('.evidence-output');
 await expect(panel).toBeHidden();
 await stock.getByRole('button', { name: '参考' }).click();
 await expect(panel).toBeVisible();
 await expect(panel).toContainText('可核查的原始数据证据');
 await expect(panel.getByRole('link', { name: /打开公开快照原文/ })).toHaveAttribute('href',/stocks.json/);
 await stock.getByRole('button', { name: '参考' }).click();
 await expect(panel).toBeHidden();
 await stock.getByRole('button', { name: '入选依据' }).click();
 await expect(panel).toContainText('入选依据');
 await expect(panel).toContainText('通过');
 await expect(panel).not.toContainText('可核查的原始数据证据');
 await stock.getByRole('button', { name: '排除依据' }).click();
 await expect(panel).toContainText('当前无未通过或缺失条件');
 await expect(panel).not.toContainText('入选依据');
});

test('打开另一只股票的参考，之前股票的依据自动折叠', async ({ page }) => {
 await screenPe(page);
 const first=page.locator('.stock').filter({ hasText: '美的集团' });
 const second=page.locator('.stock').filter({ hasText: '贵州茅台' });
 await first.getByRole('button', { name: '参考' }).click();
 await expect(first.locator('.evidence-output')).toBeVisible();
 await second.getByRole('button', { name: '入选依据' }).click();
 await expect(first.locator('.evidence-output')).toBeHidden();
 await expect(second.locator('.evidence-output')).toBeVisible();
});

test('未通过条件只在排除依据中出现，参考链接点击后出现', async ({ page }) => {
 await page.locator('#query').fill('PE<=10');
 await page.getByRole('button', { name: '解析为规则' }).click();
 await page.getByRole('button', { name: '运行筛选' }).click();
 const excluded=page.locator('.stock').filter({hasText:'美的集团'});
 await expect(excluded).toHaveAttribute('data-status','excluded');
 const panel=excluded.locator('.evidence-output');
 await expect(panel).toBeHidden();
 await excluded.getByRole('button', { name: '排除依据' }).click();
 await expect(panel).toContainText('未通过');
 await expect(panel).toContainText('14.418746');
 await excluded.getByRole('button', { name: '参考' }).click();
 await expect(panel).toContainText('公开快照原文');
 await expect(panel).not.toContainText('至少一项规则不满足');
});

test('可继续比较最多四只股票', async ({ page }) => {
 await screenPe(page);
 const boxes=page.locator('.select-stock');
 await boxes.nth(0).check();
 await boxes.nth(1).check();
 await expect(page.locator('#comparison table')).toBeVisible();
 await boxes.nth(2).check();
 await boxes.nth(3).check();
 await expect(page.locator('.select-stock').nth(4)).toBeDisabled();
});

test('缺失指标不能误判为入选', async ({ page }) => {
 await page.locator('#query').fill('ROE>=12');
 await page.getByRole('button', { name: '解析为规则' }).click();
 await page.getByRole('button', { name: '运行筛选' }).click();
 await expect(page.locator('.stock[data-status="unknown"]')).toHaveCount(5);
 const first=page.locator('.stock').first();
 await first.getByRole('button',{name:'排除依据'}).click();
 await expect(first.locator('.evidence-output')).toContainText('缺失');
});

test('策略保存和导出可用，回测与监控未谎称已执行', async ({ page }) => {
 await screenPe(page);
 await page.locator('#strategy-name').fill('交互测试策略');
 await page.getByRole('button', { name: '保存当前规则' }).click();
 await expect(page.locator('#strategies')).toContainText('交互测试策略');
 await expect(page.getByRole('button',{name:'导出回测配置'})).toBeVisible();
 await expect(page.getByRole('button',{name:'转为监控任务配置'})).toBeVisible();
 await expect(page.locator('#compare')).toContainText('不会声称已完成回测或启动监控');
});
