# Dunes Dictionary Dashboard demo - listener 埋点清单（简表）

说明：这是给完全外行看的“该埋哪些监听”的最小清单。每行建议记录时间、页面、用户标识、会话标识。

| 事件（建议命名） | 触发位置 | 触发时机 | 建议记录的关键字段（尽量少） |
|---|---|---|---|
| page_loaded | 页面入口 | DOMContentLoaded | lang, screenW, screenH |
| data_loaded | 数据加载 | data.json 成功/失败 | status, durationMs |
| lang_toggle | 语言按钮 | 点击 | lang_before, lang_after |
| canvas_drag_start | 主画布 | mousedown | x, y |
| canvas_drag_move | 主画布 | mousemove（节流） | dx, dy |
| canvas_drag_end | 主画布 | mouseup/mouseleave | durationMs |
| canvas_zoom | 主画布 | wheel | deltaY, scale_before, scale_after |
| word_node_click | 词节点 | click | wordId, currentScale |
| word_node_zoom | 词节点 | wheel | wordId, deltaY |
| relation_hover | 关系线 | mouseenter/mouseleave | wordIdA, wordIdB |
| relation_click | 关系线 | click | wordIdA, wordIdB |
| panel_show | 详情面板 | 展示时 | wordId |
| panel_tab_switch | 详情面板 | tab click | tab (entry/comment) |
| panel_expand_toggle | 详情面板 | 展开按钮 click | expanded (true/false) |
| panel_scroll | 详情面板 | scroll（节流） | tab, scrollTop, scrollHeight |
| scroll_marker_click | 详情面板 | marker click | tab, sectionId |
| scale_slider_change | 缩放刻度 | 拖动结束 | scaleValue |
| year_filter_change | 年代滑块 | 拖动结束 | yearIndex, yearLabel |
| menu_home_click | 左上图标 | click | toWordId (固定) |
| shuffle_click | 随机按钮 | click | toWordId |
| about_open | About 按钮 | click |  |
| search_open | 搜索按钮/快捷键 | open | source (icon/shortcut) |
| search_input | 搜索输入 | input（节流） | queryLen, resultCount |
| search_result_click | 搜索结果 | click | wordId |
| search_close | 搜索关闭 | Esc/点击背景 |  |
| resize | 窗口变化 | resize（节流） | screenW, screenH |

备注：mousemove / scroll / input 建议做节流（比如 200-500ms）避免日志爆量。
