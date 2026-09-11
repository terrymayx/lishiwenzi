# 乱世家书 · V1.6.9 家业里程碑奖励

魏晋南北朝文字家族游戏，试玩290—350年。按日连续推进，重大历史与重要人生事件自动暂停；田庄、商业产业和家族经济持续按时间运转。

[试玩入口](https://terrymayx.github.io/lishiwenzi/dist/) · [V1.6.9 家业里程碑奖励](docs/V1.6.9-HOUSEHOLD-MILESTONE-REWARDS.md) · [V1.6.8 体力与健康](docs/V1.6.8-STAMINA-HEALTH.md) · [V1.6.5 纯打工生计](docs/V1.6.5-WORK-ONLY-BALANCE.md) · [V1.6.4 家业解锁规则](docs/V1.6.4-HOUSEHOLD-UNLOCKS.md)

## 本版更新

- **家业解锁新增一次性金钱奖励**：置办田产 +20钱、粮铺 +50钱、布庄 +100钱、商队 +200钱。
- 奖励在首次达到条件、项目永久解锁时 **自动到账**，不需要手动领取。
- 每个阶段只发一次；奖励领取状态会进入存档，刷新、导入或再次读取同一存档都不会重复发钱。
- V1.6.8及更早旧存档如果某个阶段已经解锁，会直接标记为已结算，**不追溯补发**；尚未解锁的阶段以后仍可正常获得奖励。
- 家业卡片会提前显示该阶段的“解锁奖励”，解锁时显示家业突破提示，并在家书纪事中写入奖励记录。
- 奖励计入家庭现金和经济账本的其他收入，不改变原解锁门槛。
- **原有门槛保持不变**：家产80钱解锁继续买田；6亩+350家产解锁粮铺；12亩+700家产+粮铺解锁布庄；1500家产+至少2种商业产业解锁商队。
- V1.6.8体力/健康、母亲照看前三亩、两季收成、本人工作限制、短工工资、商业产业、婚配婚育和历史主线继续保留。

## 运行与开发

使用静态 HTTP 服务打开 `dist/index.html`，例如 `python3 -m http.server 8000` 后打开 `/dist/`。无需安装运行依赖。Node 22 以上运行：

```bash
node --test tests/*.test.js
```

其他对话接手时优先阅读 `docs/V1.6.9-HOUSEHOLD-MILESTONE-REWARDS.md` 与 `docs/V1.6.8-STAMINA-HEALTH.md`。当前版本核心新增文件为 `dist/engine-v169.js` 与 `tests/v169-household-milestone-rewards.test.js`；`dist/v164-ui.js` 已切换到最新引擎显示奖励。`dist/index.html` 的 import map 将当前游戏入口统一指向 `engine-v169.js?v=1.6.9`。

存档继续保存在当前浏览器并支持 JSON 导入导出。V1.6.9 新增 `householdMilestoneRewards` 状态保存每个家业阶段是否已经领过奖励；旧存档已有解锁不会补发，未来解锁继续正常奖励。