# 移动端面板条件渲染

移动端切换 Tab 时只 mount 当前面板，其余面板不渲染到 DOM。替代了原先"四个面板始终 mount、用 `hidden` 控制显隐"的方案。

原因：原先 grid 布局中，`hidden` 的面板其外层 wrapper div 仍占一行并累积 `gap`，导致不同 Tab 下 tab bar 到面板内容顶部的间距不一致（实测 25/64/58/98px）。条件渲染彻底消除了空行和 gap 累积。
