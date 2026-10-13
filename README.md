# SVG 编辑器（CLI）

本项目按照 [Lab1 Phase 1 需求](phase_cli_1.md)设计，计划使用 TypeScript 和面向对象方式实现 SVG 命令行编辑器。

当前处于架构设计阶段，尚未实现 CLI。

- [架构方案、PlantUML 图与过程记录](doc/README.md)
- [完整需求与命令说明](phase_cli_1.md)

撤销重做采用 Command 模式，由命令保存操作所需的属性变化和节点位置记录；禁止使用文档快照。
