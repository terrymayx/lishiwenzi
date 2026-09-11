# V1.7.0 家业发展与经营成就 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 V1.6.9 基础上加入7种新自动经营产业与15个家族经营里程碑，并把全部解锁条件、奖励、存档兼容和产业页 UI 接到当前试玩入口。

**Architecture:** 新增 `dist/engine-v170.js` 作为对 `engine-v169.js` 的兼容包装，统一扩展产业定义、产业种类统计、产业解锁、里程碑状态和奖励结算；原有3种产业收入继续由旧引擎结算，V1.7 只补充7种新产业收入，避免重复计钱。UI 保持 `game.js` 动态生成产业卡，再由 `v164-ui.js`/`v170-ui.js` 增加解锁条件、分组、里程碑和合并通知。

**Tech Stack:** Vanilla JavaScript ES modules, HTML/CSS, Node.js 22 `node:test`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-12-v170-industry-milestones-design.md`

## Global Constraints

- 保留现有 V1.6.9 四项家业奖励，不得为了测试隔离而取消旧奖励。
- 新增产业固定为磨坊、油坊、酒坊、客栈、织坊、纸坊、水运船队，数值严格按 Spec。
- 商队“2种商业产业”必须统计全部10种产业中的已购入类型。
- 产业解锁奖励与15个里程碑奖励均自动到账、每项一次、写入存档与家书日志。
- 旧存档可获得当前已经满足的 V1.7 新产业/静态里程碑奖励；旧历史收成不追溯，`firstHarvest` 从 V1.7 后开始计数。
- 不加入库存、调价、雇员、路线、生产链等新微操。
- 不能破坏 V1.6.8 体力健康、V1.6.7 母亲前三亩、V1.6.6 两季收成、V1.6.5 本人工作限制及婚育历史规则。

---

### Task 1: 校正 V1.7 核心测试隔离并完成引擎行为

**Files:**
- Modify: `tests/v170-industry-milestones.test.js`
- Modify only if required by behavior failure: `dist/engine-v170.js`

**Interfaces:**
- Consumes: V1.6.9 `getHouseholdUnlockStatus()`, `householdMilestoneRewards`, `getHouseholdAssetValue()`, `ledger()`.
- Produces: `V170_BUSINESSES`, `V170_INDUSTRY_UNLOCKS`, `V170_MILESTONES`, `getIndustrySummary()`, `getOwnedBusinessTypeCount()`, `getHouseholdUnlockStatus()`, `getV170MilestoneStatus()`, V1.7 `buyBusiness()`.

- [ ] **Step 1: Fix the two test fixtures so V1.6.9 land-purchase +20 is settled before measuring a V1.7-only reward**

For the mill test, first set household assets to 80 and call `E.getHouseholdUnlockStatus(state)`; then move to 3亩/180 assets, capture `before`, and assert the V1.7 mill adds exactly +20.

For the `assets500` milestone test, first set assets to 80 and call `E.getHouseholdUnlockStatus(state)`; then set assets to 500, capture `before`, and assert `assets500` adds exactly +30.

- [ ] **Step 2: Run the V1.7 test file and verify failures are only genuine remaining implementation gaps**

Run: `node --test tests/v170-industry-milestones.test.js`
Expected before page integration: engine tests PASS; current-page routing test FAIL because `dist/index.html` is still V1.6.9.

- [ ] **Step 3: If any engine behavior still fails, fix only the proven root cause in `engine-v170.js`**

Do not change production behavior merely to suppress the inherited V1.6.9 +20 land-purchase reward. Preserve reward chaining.

- [ ] **Step 4: Re-run the V1.7 test file**

Run: `node --test tests/v170-industry-milestones.test.js`
Expected: only current-page integration remains failing until Task 2.

### Task 2: 接入 V1.7 当前页面与产业/里程碑 UI

**Files:**
- Modify: `dist/index.html`
- Modify: `dist/v164-ui.js`
- Modify: `dist/v170-ui.js`
- Modify: `dist/v170.css`
- Test: `tests/v170-industry-milestones.test.js`

**Interfaces:**
- Consumes: `getIndustrySummary(state)`, `getHouseholdUnlockStatus(state)`, `getV170MilestoneStatus(state)`.
- Produces: 当前页面 import map → `engine-v170.js?v=1.7.0`; V1.7 产业分组、锁定条件、奖励提示、里程碑面板。

- [ ] **Step 1: Route all current engine aliases in `dist/index.html` to `engine-v170.js?v=1.7.0`**

Also update title, setup/version copy, `game.js` cache version, load `v170.css?v=1.7.0`, load modified `v164-ui.js?v=1.7.0`, and add `v170-ui.js?v=1.7.0`.

- [ ] **Step 2: Keep every locked business card explicit**

`v164-ui.js` must display all conditions with current/required/remaining values and show `解锁奖励：+X钱`. Unlocked cards must show reward already settled, not a manual claim button.

- [ ] **Step 3: Make “最近3个目标” genuinely nearest**

In `v170-ui.js`, rank incomplete milestones by normalized remaining ratio (`remaining / threshold`) before showing the first 3; keep stable definition order as tie-breaker. The rest remain in the folded list.

- [ ] **Step 4: Keep combined reward notification non-blocking**

One render may generate several reward log entries. Show one top notice with combined amount; keep each detailed reward in the chronicle. No modal and no time pause.

- [ ] **Step 5: Run V1.7 tests**

Run: `node --test tests/v170-industry-milestones.test.js`
Expected: all V1.7 tests PASS.

### Task 3: 更新历史“当前页面”兼容断言与 CI 语法检查

**Files:**
- Modify only affected current-page assertion tests under `tests/*.test.js`
- Modify: `.github/workflows/tests.yml`

**Interfaces:**
- Consumes: historical versioned engines unchanged.
- Produces: historical behavior remains tested against its own module while current-page route assertions accept V1.7.0.

- [ ] **Step 1: Run the full suite**

Run: `node --test tests/*.test.js`
Expected: identify only stale current-page version assertions or genuine regressions.

- [ ] **Step 2: For stale page assertions only, update expected current route from V1.6.9/V1.6.8 to V1.7.0**

Do not rewrite historical engine behavior expectations.

- [ ] **Step 3: Add syntax checks for V1.7 files**

Append workflow command:

```sh
node --check dist/engine-v170.js && node --check dist/v170-ui.js
```

- [ ] **Step 4: Run full local-equivalent verification**

Run:
```sh
node --test tests/*.test.js
node --check dist/engine-v170.js
node --check dist/v170-ui.js
```
Expected: all tests PASS and both checks exit 0.

### Task 4: 文档与发布检查

**Files:**
- Create: `docs/V1.7.0-INDUSTRIES-MILESTONES.md`
- Modify: `README.md`

**Interfaces:**
- Produces: current release documentation for later chats/developers.

- [ ] **Step 1: Document all 10 industries and all 15 milestones with exact values and compatibility rules**

Explicitly state that existing V1.6.9 rewards do not back-pay again, new V1.7 static milestones/new industry unlocks may reward old saves, and harvest starts at 0 for old saves.

- [ ] **Step 2: Update README current release and handoff pointers to V1.7.0**

- [ ] **Step 3: Run final full test + syntax verification again after docs/current-page edits**

Run:
```sh
node --test tests/*.test.js
node --check dist/engine-v170.js
node --check dist/v170-ui.js
```
Expected: 0 failures.

- [ ] **Step 4: Review the PR diff against the Spec**

Check every business value, unlock threshold, reward, milestone, old-save rule, no-double-pay rule, current route, UI grouping, and preserved legacy systems.

- [ ] **Step 5: Let GitHub Actions run the full PR workflow**

Expected: PR Node tests success with 0 failures and V1.7 syntax checks success.

- [ ] **Step 6: Mark PR ready and squash merge after verified green CI**

- [ ] **Step 7: Verify the merge commit on `main`**

Require both main Node tests and GitHub Pages deployment to conclude `success`, then fetch `main/dist/index.html` and confirm `V1.7.0` + `engine-v170.js?v=1.7.0` before reporting the release live.
