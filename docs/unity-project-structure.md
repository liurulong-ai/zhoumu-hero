# Unity 项目结构规范（像素风 RPG · WebGL）

> 本文档约定 Unity 6 项目的目录组织、资源命名与关键设置，保证 Git 协作顺畅。

---

## 1. 项目位置

Unity 项目**直接建在仓库根目录** `/Users/rulongliu/Desktop/项目1/`：

```
项目1/
├── .git/
├── .gitignore          # 已配置（Unity WebGL 专用）
├── .gitattributes      # 已配置（LFS + unityyamlmerge）
├── Assets/             # ← Unity 生成
├── Packages/
├── ProjectSettings/
└── docs/               # 文档放这里（本文件）
```

在 Unity Hub 新建项目时：Template 选 **Universal 2D**，Location 填 `/Users/rulongliu/Desktop/项目1`，Project Name 留空目录名即可（Unity 会识别已有目录）。

> 备选：也可以建在子目录 `Game/` 下，但单人项目直接放根目录最省事。

---

## 2. Assets 目录结构

所有自研内容统一放进 `_Project/`（下划线开头，永远排在 Project 窗口最顶部），与 Asset Store 下载的第三方资源天然隔离：

```
Assets/
├── _Project/
│   ├── Animations/         # Animator Controller、.anim
│   ├── Art/
│   │   ├── Sprites/        # 像素图（按角色/场景/图标分子目录）
│   │   │   ├── Player/
│   │   │   ├── Enemies/
│   │   │   ├── Tiles/
│   │   │   └── UI/
│   │   └── Tilemaps/       # 调色板、Brush
│   ├── Audio/
│   │   ├── BGM/
│   │   └── SFX/
│   ├── Data/               # ScriptableObject 资产（RPG 数值配置）
│   │   ├── Items/
│   │   ├── Enemies/
│   │   ├── Skills/
│   │   └── Dialogue/
│   ├── Fonts/
│   ├── Materials/
│   ├── Prefabs/
│   │   ├── Player/
│   │   ├── Enemies/
│   │   ├── Items/
│   │   └── UI/
│   ├── Scenes/
│   │   ├── Core/           # Boot.unity, MainMenu.unity, Save.unity 相关常驻场景
│   │   ├── Maps/           # 按地图编号：Map01_新手村.unity ...
│   │   └── Battle/         # 战斗场景
│   ├── Scripts/
│   │   ├── Core/           # 游戏管理器、存档系统、事件总线
│   │   ├── Player/
│   │   ├── Enemy/
│   │   ├── Battle/
│   │   ├── Inventory/
│   │   ├── Dialogue/
│   │   └── UI/
│   └── Settings/           # URP 设置、Input Actions、图层 Tag 配置
├── Plugins/                # 第三方插件（Asset Store 导入放这）
└── StreamingAssets/        # WebGL 需要随包发布的文件
```

**原则：**
- 场景与 Prefab 里的脚本引用路径要稳定，目录定下来后**不要随意改名/移动**（meta 文件变了会产生大量 diff）
- 同类资源靠近使用方：`Player` 的动画、Prefab、Sprite 都在自己的子目录里，方便整体迁移

---

## 3. 像素风关键设置（建项目后第一件事）

| 位置 | 设置 | 值 |
|---|---|---|
| Project Settings → Quality | V Sync Count | Don't Sync（WebGL 按需） |
| Project Settings → Player → Resolution | Default Width / Height | 1280 × 720（整数倍缩放） |
| Project Settings → Player | Run In Background | 按需 |
| Camera | Projection | Orthographic |
| 精灵导入（Inspector） | Filter Mode | **Point (no filter)** |
| 精灵导入 | Compression | **None** |
| 精灵导入 | Pixels Per Unit | 与美术约定（常见 16 或 32） |
| 精灵导入 | Max Size | 足够即可，勿压缩 |
| Tilemap | Tile Anchor | (0.5, 0.5) 配合整数像素 |

**给导入模板省事**：`Editor → Project Settings → Asset Pipeline` 中可预设 2D Sprite 默认值；也可以建一个 `SpriteImportPreset`（Preset 面板）一键套用。

---

## 4. RPG 数据：ScriptableObject 优先

道具、敌人、技能、对话等数值**不要硬编码在脚本里**，用 SO 配置资产放在 `_Project/Data/`：

- `ItemSO`（名称、图标、类型、效果、堆叠上限、价格）
- `EnemySO`（HP、攻击、防御、经验、掉落表）
- `SkillSO`（消耗、威力、目标类型、动画引用）
- `DialogueSO`（文本、分支、触发条件）

好处：策划数值与逻辑解耦、可序列化为存档 ID、Git 下 diff 友好（YAML 文本）。

---

## 5. 命名规范

| 类型 | 规则 | 示例 |
|---|---|---|
| 场景 | `PascalCase`，地图加编号 | `Map01_NoviceVillage.unity` |
| Prefab | `PascalCase` | `Slime_Basic.prefab` |
| 脚本 | `PascalCase`，一文件一类 | `InventoryController.cs` |
| Sprite | 小写下划线 | `slime_idle_0.png` |
| SO 资产 | `PascalCase` | `Potion_HpSmall.asset` |
| 常量/枚举 | PascalCase，私有字段 `_camelCase` | `_maxHp` |

---

## 6. Git 工作流要点

1. **每次打开项目先 `git status`**：Unity 有时会产生意外改动（Library 已忽略，重点是 Assets 与 ProjectSettings）
2. **提交粒度**：一个功能一个提交（如 "feat: 背包UI格子布局"），场景改动和脚本改动放同一提交，保证引用一致
3. **meta 文件必须一起提交**：新增资源时 `.meta` 与资源本体同时 add
4. **场景冲突**：unityyamlmerge 能解大部分，但建议错开编辑同一场景；大型改动前先提交基线
5. **存档功能注意**：WebGL 下存档走 `Application.persistentDataPath` 或 IndexedDB，调试用本地文件路径的代码要加平台宏 `#if UNITY_WEBGL`

---

## 7. WebGL 构建检查清单

- [ ] Player Settings → Company Name / Product Name 已填写
- [ ] Color Space：Linear（WebGL2 默认支持）
- [ ] Compression Format：Brotli（服务器支持时）或 Gzip
- [ ] Decompression Fallback：服务器不能配 Content-Encoding 时勾上
- [ ] 构建产物在 `Build/`（已在 .gitignore 中，不入库）

---

*最后更新：2026-09-05 · Unity 6 · WebGL 目标平台*
