# SVG 编辑器（CLI）

本项目按照 [Lab1 Phase 1 需求](phase_cli_1.md)设计，计划使用 TypeScript 和面向对象方式实现 SVG 命令行编辑器。

当前处于架构设计阶段，尚未实现 CLI。

- [架构方案、PlantUML 图与过程记录](doc/README.md)
- [撤销、重做与隐藏临时容器伪代码](doc/undo_redo_pseudocode.md)
- [完整需求与命令说明](phase_cli_1.md)

撤销重做采用 Command 模式：每次执行编辑或历史命令时，即时生成对应的反向命令。删除将原对象移入不可由用户访问、不显示、不参与 SVG 序列化的临时容器；禁止使用文档快照。
