# SVG 编辑器（CLI）

本项目按照 [Lab1 Phase 1 需求](phase_cli_1.md)，使用 TypeScript 和面向对象方式实现 SVG 命令行编辑器。

已完成基础 CLI：六种图形、SVG 读写、画布、创建和删除、移动和缩放、属性修改、分组和解组、排列、树形显示、撤销重做。box 和插件加载属于后续阶段。

## 启动与使用

在本目录打开 PowerShell，运行：

```powershell
npm run cli
```

出现 `svg>` 后可以输入：

```text
init 800 600
create g scene
create rect r1 20 30 160 60 #4a90d9 in scene
create text title 40 65 "开始" in scene
move scene 50 0
undo
tree
save demo.svg
exit
```

保存的 SVG 可以直接在浏览器中打开。输入 `help` 查看全部语法；`exit` 或输入结束退出。带空格的路径和文本用双引号包裹；整行以 `#` 开头视为注释，颜色值中的 `#` 保留。

回放[两节点流程图](examples/flowchart.commands.txt)并生成[示例 SVG](examples/flowchart.svg)：

```powershell
npm run build
Get-Content -Encoding utf8 examples/flowchart.commands.txt | node dist/main.js
```

## 基础功能

| 类别 | 命令 |
|---|---|
| 文档与画布 | `init [w] [h]`、`read <file.svg>`、`save [file.svg]`、`canvas [w h]` |
| 图形编辑 | `create <type> <id> [params...] [in <gid>]`、`delete <id>`、`move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>` |
| 层级和顺序 | `group <newGid> <id1> [id2...]`、`ungroup <gid>`、`addto <gid> <id> [index]`、`front <id>`、`back <id>` |
| 显示与历史 | `tree [id]`、`show <id>`、`help`、`undo`、`redo` |

内置类型：`rect`、`circle`、`ellipse`、`line`、`text`、`g`。按照需求，根级 g 禁止 ungroup；嵌套 g 可以解组。文档操作成功后清空并锁定历史，下一条成功编辑解锁；查询和失败操作不改变历史。

## 项目协作约定

- 此项目的设计重点、约束、讨论结论和后续修订应持续保存到 README；本条约定也必须保留。
- 根目录 README 保存当前重点，`doc/README.md` 保存完整方案和过程记录；相关 UML、伪代码应同步更新，未确认的建议标明状态。
- Git 此后仅在用户明确要求时操作，包括查询、暂存、提交、分支、标签和远程操作。
- 安装内容全部位于当前工作区且预计总大小小于 100 MB 时，可直接安装；否则必须先说明内容、位置和用途，询问并等待明确批准。位置或大小不确定时也须询问；每项需要批准的安装分别决定。

## 当前设计重点

- TypeScript、面向对象、一类一文件；使用 Command 和 Composite；禁止文档快照。
- 每次成功执行 ReversibleCommand 即时生成新的逆命令；undo/redo 两栈保存下一次要执行的命令。
- 图形与分组共用 Shape 抽象；容器额外提供有序子节点能力，叶子不能成为迁移目标。
- AddToCommand 统一节点迁移、删除和恢复，不再使用 MoveToTemporaryCommand、RestoreCommand。
- addto 增加可选 index：从 0 开始，省略时追加；同父容器迁移的 index 按移除节点后的列表解释。
- 删除将原对象移入隐藏临时容器，不可通过公共 id 查询、不显示、不参与 SVG 序列化；逆命令保留对象身份和原位置。
- move/scale 已在本轮通过属性修改的 CommandBatch 实现；容器递归生成子孙的属性修改，一次撤销完整恢复。
- 迁移保留节点自身属性；不承诺父容器变换和继承样式下的视觉效果不变。

## 开发环境与测试

2026-10-18 经用户逐项批准后，安装并验证了以下环境：

| 工具 | 版本 | 位置 |
|---|---|---|
| Node.js（原有） | 20.13.1 | `D:\vsc\ide\MSBuild\Microsoft\VisualStudio\NodeJs`，已在系统 PATH |
| TypeScript | 7.0.2 | `D:\dev-tools\typescript`，已加入用户 PATH |
| npm 下载缓存 | — | `D:\dev-tools\npm-cache` |

重新打开终端后，可以运行 `node --version` 和 `tsc --version`。在本目录执行：

```powershell
npm test
```

`npm test` 先编译 TypeScript，再运行 Node 内置测试；无需安装测试框架。当前使用全局 TypeScript，项目依赖为已获批准安装的 saxes 和 @types/node@20；本轮通过编译及 **46 项测试**。`npm run check` 可以只进行类型检查。

项目依赖记录在 package.json 和 package-lock.json；换一台电脑时须先按上述安装约定完成依赖准备。第三方 saxes 声明与当前编译器的内部约束有兼容差异，因此使用 skipLibCheck 跳过依赖声明自身检查；项目源码仍开启 strict 和 noEmitOnError。

逆命令的基本调用：

```typescript
const result = command.execute(context);       // 执行编辑，产生新的逆命令
const undone = result.inverse.execute(context); // 撤销，同时生成新的重做命令
undone.inverse.execute(context);              // 重做
```

用户撤销创建时将对象移入临时容器；批次中尚未提交的创建失败时，则恢复为原本的未挂载状态，避免隐藏容器留下残余对象。两者都不复制文档。

## SVG 支持范围与设计取舍

- 读写上述六种类型及嵌套 g，保留节点顺序、文本、额外 SVG 属性和 transform；未知图形类型报错，read 失败保留当前文档。
- 文本和属性使用 XML 转义；外部缺 id 时自动分配并打印警告，提前保留后面出现的显式 id。
- 几何参数使用有限浮点数，尺寸和半径不得为负；画布必须大于 0。画布尺寸支持 px 后缀和 viewBox 推导，不支持百分比尺寸、CSS 布局、外部 DTD 或未列出的图形类型。
- move/scale 修改局部几何属性；保留导入的 transform，不自动换算成屏幕坐标。addto/group 保留节点自身属性，父级变换或样式继承可能改变外观。
- save 先生成 XML，再通过同目录临时文件和替换完成；失败不清空历史。无参数 save 使用最近成功 read/save 的路径。

## 文档入口

- [架构方案、PlantUML 图与过程记录](doc/README.md)
- [撤销、重做与隐藏临时容器伪代码](doc/undo_redo_pseudocode.md)
- [完整需求与命令说明](phase_cli_1.md)

撤销重做采用 Command 模式：每次执行编辑或历史命令时，即时生成对应的反向命令。删除将原对象移入不可由用户访问、不显示、不参与 SVG 序列化的临时容器；禁止使用文档快照。
