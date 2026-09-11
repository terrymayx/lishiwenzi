# 乱世家书 · V1.7.1 紧凑界面

魏晋南北朝文字家族游戏，试玩290—350年。按日连续推进，重大历史与重要人生事件自动暂停；田庄、商业产业和家族经济持续按时间运转。

[试玩入口](https://terrymayx.github.io/lishiwenzi/dist/) · [V1.7.0 家业发展与经营成就](docs/V1.7.0-INDUSTRIES-MILESTONES.md) · [V1.6.9 家业里程碑奖励](docs/V1.6.9-HOUSEHOLD-MILESTONE-REWARDS.md) · [V1.6.8 体力与健康](docs/V1.6.8-STAMINA-HEALTH.md) · [V1.6.5 纯打工生计](docs/V1.6.5-WORK-ONLY-BALANCE.md)

## 本版更新：V1.7.1 紧凑界面

统一缩小字体、卡片、按钮、资源栏、沙漏与面板间距；宽屏七项资源同一行，家族图与详情并排。粮市和说明默认折叠，并在重绘时保留展开状态。产业和成就仍展示完整条件与奖金，窄屏重排并保留触摸按钮大小。所有玩法引擎与存档格式不变。

详见 [V1.7.1 紧凑界面](docs/V1.7.1-COMPACT-UI.md)。显示层新增 `dist/v171.css`、`dist/v171-ui.js`；回归验证：`node --test tests/*.test.js`，可选本地浏览器验证：`python tests/browser-compact-ui.py`（需Playwright与Chromium）。

## V1.7.0 玩法更新（保留）

- **商业产业扩展到10种**：保留粮铺、布庄、商队，新增磨坊、油坊、酒坊、客栈、织坊、纸坊、水运船队。
- 新产业继续采用轻量经营：达到条件永久解锁并自动领取一次性奖金，实际产业仍需花钱购置；买下后按游戏日自动产生固定净收益，不增加进货、调价、雇员或路线微操。
- **新增15个家业目标与经营成就**，覆盖真实田地产出、田地规模、产业每日净收益、家产、当前执笔人学识和声望；达标自动奖励且整份家族存档只领取一次。
- 商队的“至少2种商业产业”现在统计全部实际购入产业类型，磨坊、油坊等新产业也可以计入。
- 产业页拆分为“已有产业 / 下一批可发展产业 / 远期产业”，锁定项目显示完整条件、还差多少、购置价格、每日净收益和解锁奖金。
- 经营成就默认显示最接近完成的3项；其余目标和已完成成就折叠。多个奖励同日达成时顶部合并提示，家书仍逐项记录。
- **旧存档兼容**：V1.6.9 已结算的旧家业奖励不会重新发放；旧档若当前已经满足 V1.7 新产业或新增静态里程碑条件，可首次获得对应新奖励；“初收喜报”从升级 V1.7 后的真实收成开始累计，不追溯旧历史。
- V1.6.8体力/健康、母亲照看前三亩、两季收成与初始170粮、本人工作限制、短工工资、自动农工、婚配婚育与历史主线继续保留。

## 运行与开发

使用静态 HTTP 服务打开 `dist/index.html`，例如 `python3 -m http.server 8000` 后打开 `/dist/`。无需安装运行依赖。Node 22 以上运行：

```bash
node --test tests/*.test.js
```

其他对话接手时优先阅读 `docs/V1.7.0-INDUSTRIES-MILESTONES.md`、`docs/V1.6.9-HOUSEHOLD-MILESTONE-REWARDS.md` 与 `docs/V1.6.8-STAMINA-HEALTH.md`。当前版本核心新增文件为 `dist/engine-v170.js`、`dist/v170-ui.js`、`dist/v170.css` 与 `tests/v170-industry-milestones.test.js`。`dist/index.html` 的 import map 将当前游戏入口统一指向 `engine-v170.js?v=1.7.0`。

存档继续保存在当前浏览器并支持 JSON 导入导出。V1.7.0 使用 `v170IndustryProgression` 保存新增产业的解锁与奖励状态，`v170Milestones` 保存15个经营成就的领取状态，`v170Progress.harvestSince170` 只记录 V1.7 之后的真实田地收成；重复读档不会重复发放已领取奖励。
