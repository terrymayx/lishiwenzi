# 乱世家书 · V1.4 家庭生计

魏晋南北朝文字家族游戏，试玩290—350年。按日连续推进，重大事件自动暂停。

[试玩入口](https://terrymayx.github.io/lishiwenzi/dist/) · [当前规则与架构](docs/V1.4-ECONOMY.md)

## 本版更新

- 年龄口粮与两位小数库存；成年短工0.9钱/日，家庭副业0.6钱/日。
- 满管理参考亩产90粮，按面积累计春耕、夏管、秋收劳动。
- 家人独立分工；农闲自动短工、下季自动回田；同一人不会重复领工资和务农。
- 买1/10/30粮、补足30天、自动补粮及现金保留额。
- 雇工每月6钱含食宿，可关闭自动续雇。
- 家计面板：口粮天数、收获前缺口、当前收入、年度实际账与预测。
- 保留婚育、迁徙、家族树、固定历史、正常死亡后代继承及饥饿100%特殊终局。

## 运行与开发

使用静态HTTP服务打开 dist/index.html，例如 python3 -m http.server 8000 后打开 /dist/。无需安装运行依赖。Node 22以上运行 node --test tests/*.test.js。

其他对话接手时先读 docs/V1.4-ECONOMY.md，再读 dist/engine-v14.js、dist/v14-rules.js、dist/v14-market.js、dist/v14-ui.js 和 tests/v14.test.js。不要把保留的 V1.3 文件当作当前入口。dist/index.html 的 importmap 将基础 UI 的引擎导入指向 V1.4。

存档保存在当前浏览器，支持JSON导入导出。旧存档按需补齐新字段，年度实账从升级日开始记录。更新前建议导出备份。
