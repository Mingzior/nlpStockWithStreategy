const { test, expect } = require('@playwright/test');
test.beforeEach(async ({page}) => { await page.goto('/'); await expect(page).toHaveTitle(/StockLens AI/); });
async function parseDefault(page){await page.locator('#query').fill('经营改善、估值合理、走势稳定');await page.getByRole('button',{name:'解析为规则'}).click();}
test('初始规则为空，输入不自动解析，点击解析才生成规则',async({page})=>{await expect(page.locator('.rule')).toHaveCount(0);await expect(page.getByRole('button',{name:'运行筛选'})).toBeDisabled();await page.locator('#query').fill('ROE>=15，PE<30');await expect(page.locator('.rule')).toHaveCount(0);await page.getByRole('button',{name:'解析为规则'}).click();await expect(page.locator('.rule')).toHaveCount(2);await expect(page.getByRole('button',{name:'运行筛选'})).toBeEnabled()});
test('输入变化清除过时筛选结果',async({page})=>{await parseDefault(page);await page.getByRole('button',{name:'运行筛选'}).click();await expect(page.locator('.stock')).toHaveCount(11);await page.locator('#query').fill('低估值');await expect(page.locator('.rule')).toHaveCount(0);await expect(page.locator('.stock')).toHaveCount(0)});
test('扩展中文金融表达可解析',async({page})=>{await page.locator('#query').fill('净利润增速超过10%，营收同比不少于15%，低市盈率');await page.getByRole('button',{name:'解析为规则'}).click();await expect(page.locator('.rule')).toHaveCount(3);await page.getByRole('button',{name:'运行筛选'}).click();await expect(page.locator('.stock')).toHaveCount(11)});
test('自然语言默认示例完整筛选及逐项溯源', async ({page}) => {
 await parseDefault(page);
 await page.getByRole('button',{name:'运行筛选'}).click();
 await expect(page.locator('#stats')).toContainText('入选');
 await expect(page.locator('#stock-results')).toContainText('澄川精密');
 await page.locator('#stock-results details').first().locator('summary').click();
 await expect(page.locator('#stock-results details').first()).toContainText('口径');
 await expect(page.locator('#stock-results details').first()).toContainText('合成数据 v1');
});
test('模糊意图提示澄清且禁止无条件执行', async ({page}) => {
 await page.getByRole('button',{name:'模糊描述'}).click();await page.getByRole('button',{name:'解析为规则'}).click();
 await expect(page.locator('#notes')).toContainText('无法确定量化阈值');
 await expect(page.getByRole('button',{name:'运行筛选'})).toBeDisabled();
});
test('冲突识别与修改后恢复运行', async ({page}) => {
 await page.getByRole('button',{name:'冲突测试'}).click();await page.getByRole('button',{name:'解析为规则'}).click();
 await expect(page.locator('#conflicts')).toContainText('矛盾区间');
 await expect(page.getByRole('button',{name:'运行筛选'})).toBeDisabled();
 await page.locator('.rule').last().locator('.val').fill('10');
 await page.locator('.rule').last().locator('.val').dispatchEvent('change');
 await expect(page.getByRole('button',{name:'运行筛选'})).toBeEnabled();
 await page.getByRole('button',{name:'运行筛选'}).click();
 await expect(page.locator('#stats')).toContainText('排除');
});
test('缺失指标被明确标记未知，且不是通过', async ({page}) => {
 await page.getByRole('button',{name:'缺失数据测试'}).click();await page.getByRole('button',{name:'解析为规则'}).click();
 await page.getByRole('button',{name:'运行筛选'}).click();
 const item=page.locator('.stock').filter({hasText:'远帆物流'});
 await expect(item).toContainText('未知（缺失）');
 await item.locator('summary').click();
 await expect(item).toContainText('缺失');
});
test('修改规则重新筛选显示影响摘要', async ({page}) => {
 await parseDefault(page);
 await page.getByRole('button',{name:'运行筛选'}).click();
 const input=page.locator('.rule').first().locator('.val');
 await input.fill('90'); await input.dispatchEvent('change');
 await expect(page.locator('#dirty')).toContainText('尚未更新');
 await page.getByRole('button',{name:'运行筛选'}).click();
 await expect(page.locator('#impact')).toContainText('状态发生变化');
});
test('选中股票后对比并限制最多四只', async ({page}) => {
 await parseDefault(page);
 await page.getByRole('button',{name:'运行筛选'}).click();
 const boxes=page.locator('.select-stock');
 await boxes.nth(0).check(); await boxes.nth(1).check();
 await expect(page.locator('#comparison table')).toBeVisible();
 await expect(page.locator('#comparison')).toContainText('市盈率 PE');
 await boxes.nth(2).check(); await boxes.nth(3).check();
 await expect(page.locator('.select-stock').nth(4)).toBeDisabled();
});
test('本地策略保存、刷新、载入与删除', async ({page}) => {
 await parseDefault(page);
 await page.locator('#strategy-name').fill('E2E 测试策略');
 await page.getByRole('button',{name:'保存当前规则'}).click();
 await expect(page.locator('#strategies')).toContainText('E2E 测试策略');
 await page.reload();
 await expect(page.locator('#strategies')).toContainText('E2E 测试策略');
 await page.locator('[data-load="0"]').click();
 await expect(page.locator('.rule')).toHaveCount(5);
 await page.locator('[data-delete="0"]').click();
 await expect(page.locator('#strategies')).toContainText('暂无已保存策略');
});
test('静态版本不调用真实金融 API，页面明确标注合成数据', async ({page}) => {
 await parseDefault(page);
 const calls=[];
 page.on('request',r=>{if(/api\/(screen|fuyao|ifind)/.test(r.url()))calls.push(r.url());});
 await page.getByRole('button',{name:'运行筛选'}).click();
 await expect(page.getByText('合成数据演示版 · 非真实行情')).toBeVisible();
 expect(calls).toEqual([]);
});
