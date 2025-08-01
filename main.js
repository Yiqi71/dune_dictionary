// 渲染函数
function renderWordUniverse(wordsData) {
    const universeView = document.getElementById('universe-view');
    const wordNodesContainer = document.getElementById('word-nodes-container');

    // 清空容器（防止重复加载）
    wordNodesContainer.innerHTML = '';

    // 状态变量
    let panX = 0,
        panY = 0;
    let currentScale = 1;
    let focusedWord = null;
    const scaleThreshold = 2.5; // 触发详细信息显示的缩放阈值

    // 浮窗相关变量
    let currentFloatingPanel = null;
    let isPanelVisible = false;

    // 创建单词节点
    wordsData.forEach(word => {
        const node = document.createElement('div');
        node.className = 'word-node';

        // 基础信息
        node.textContent = word.name;
        node.style.backgroundColor = word.color;

        // 详细信息（zoom in后显示）
        const detailDiv = document.createElement('div');
        detailDiv.className = 'word-details';

        // 创建随机布局的子元素
        const elements = [{
                tag: 'img',
                content: '',
                attrs: {
                    src: word.image,
                    alt: word.name
                }
            },
            {
                tag: 'p',
                content: word.definition,
                class: 'definition'
            },
            {
                tag: 'p',
                content: `"${word.quote}"`,
                class: 'quote'
            },
            {
                tag: 'p',
                content: `${word.originator}`,
                class: 'originator'
            }
        ];

        // 生成不重叠的30度倍数角度位置
        const usedAngles = new Set();

        elements.forEach(item => {
            const el = document.createElement(item.tag);
            if (item.content) el.textContent = item.content;
            if (item.attrs) Object.assign(el, item.attrs);
            if (item.class) el.className = item.class;

            // 在30度倍数中选择未使用的位置
            const angleSteps = 6; // 6个位置
            let randomStep;
            let attempts = 0;

            do {
                randomStep = Math.floor(Math.random() * angleSteps); // 0-5
                attempts++;
            } while (usedAngles.has(randomStep) && attempts < 20);

            usedAngles.add(randomStep);
            const angle = (randomStep / angleSteps) * Math.PI * 2; // 转换为弧度
            const distance = 2; // 距离单词固定为200px
            const x = Math.cos(angle) * distance * 100;
            const y = Math.sin(angle) * distance * 100;

            Object.assign(el.style, {
                position: 'absolute',
                left: `0`,
                top: `0`,
                transform: ` translate(${x}%, ${y}%)`,
                opacity: '0',
                transition: 'all 0.5s ease-out'
            });

            // 延迟淡入
            setTimeout(() => {
                el.style.opacity = '1';
            }, Math.random() * 300); // 随机延迟产生错落效果

            detailDiv.appendChild(el);
        });

        node.appendChild(detailDiv);

        // 定位
        node.style.left = `${word.coordinates.x * 100}%`;
        node.style.top = `${word.coordinates.y * 100}%`;
        node.style.transform = `translate(-50%, -50%) translateZ(${word.coordinates.z * 100}px)`;

        // 添加点击事件处理浮窗显示
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            if (node.classList.contains('focused')) {
                showFloatingPanel(word, node);
            } else {
                zoomToWord(word);
            }
        });

        wordNodesContainer.appendChild(node);

        console.log('node rendered');
    });

    // 浮窗功能函数
    function showFloatingPanel(word, node) {
        const panel = document.getElementById('floating-panel');
        const contentScroll = panel.querySelector('.content-scroll');

        // 更新内容
        contentScroll.innerHTML = `
            <h3>${word.name}</h3>
            <p><strong>定义：</strong>${word.definition}</p>
            <p><strong>引用：</strong>"${word.quote}"</p>
            <p><strong>来源：</strong>${word.originator}</p>
            <p>这里是关于"${word.name}"的详细信息。这个单词在沙丘宇宙中具有重要的意义。</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
        `;

        // 显示浮窗
        panel.classList.remove('hidden');
        isPanelVisible = true;
        currentFloatingPanel = panel;

        // 重置标签状态
        const tabs = panel.querySelectorAll('.tab-item');
        tabs.forEach(tab => tab.classList.remove('active'));
        tabs[0].classList.add('active');
    }

    function hideFloatingPanel() {
        const panel = document.getElementById('floating-panel');
        panel.classList.add('hidden');
        isPanelVisible = false;
        currentFloatingPanel = null;
    }

    // 标签切换功能
    function initTabSwitching() {
        const panel = document.getElementById('floating-panel');
        const commentTab = panel.querySelector('.panel-tabs.comment-tabs .tab-item');
        const tabs = panel.querySelectorAll('.panel-bottom .tab-item');
        const contentScroll = panel.querySelector('.content-scroll');
        const commentScroll = panel.querySelector('.comment-scroll');

        let currentWord = null;
        const tabOrder = ['comment', 'image', 'book', 'detail', 'brief'];
        let currentTabIndex = 4; // 默认简要释义（最下面）

        showFloatingPanel = function (word, node) {
            currentWord = word;
            currentTabIndex = 4; // 默认简要释义
            updateTabContent(tabOrder[currentTabIndex]);
            updateCommentContent();
            panel.classList.remove('hidden');
            isPanelVisible = true;
            currentFloatingPanel = panel;
            tabs.forEach(tab => tab.classList.remove('active'));
            tabs[currentTabIndex - 1].classList.add('active'); // 减1因为评论不在下半部分
            commentTab.classList.remove('active');
        };

        function updateCommentContent() {
            if (!currentWord) return;
            commentScroll.innerHTML = `<p>暂无评论，欢迎补充！</p>`;
        }

        function updateTabContent(tabType) {
            if (!currentWord) return;
            switch (tabType) {
                case 'comment':
                    // 评论标签选中时，下半部分保留图片内容
                    contentScroll.innerHTML = `<h3>图片</h3><img src='${currentWord.image}' alt='${currentWord.name}' style='max-width:100%;border-radius:8px;box-shadow:0 2px 8px #0002;margin-bottom:10px;'><p>${currentWord.name}</p>`;
                    break;
                case 'image':
                    contentScroll.innerHTML = `<h3>图片</h3><img src='${currentWord.image}' alt='${currentWord.name}' style='max-width:100%;border-radius:8px;box-shadow:0 2px 8px #0002;margin-bottom:10px;'><p>${currentWord.name}</p>`;
                    break;
                case 'book':
                    contentScroll.innerHTML = `<h3>相关著作</h3><p>${currentWord.originator ? '相关人物：' + currentWord.originator : '暂无相关著作信息'}</p>`;
                    break;
                case 'detail':
                    contentScroll.innerHTML = `<h3>详细释义</h3><p>${currentWord.definition || '暂无详细释义'}</p><p style='color:#888;font-size:13px;margin-top:10px;'>${currentWord.quote ? '引用：' + currentWord.quote : ''}</p>`;
                    break;
                case 'brief':
                    contentScroll.innerHTML = `<h3>简要释义</h3><p>${currentWord.definition ? currentWord.definition.replace(/。.*$/, '。') : '暂无简要释义'}</p>`;
                    break;
                default:
                    contentScroll.innerHTML = `<h3>简要释义</h3><p>${currentWord.definition ? currentWord.definition.replace(/。.*$/, '。') : '暂无简要释义'}</p>`;
            }
        }

        // 滚轮切换标签（包含评论标签）
        contentScroll.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                // 向上切换，不能穿梭
                if (currentTabIndex > 0) {
                    currentTabIndex--;
                    updateTabContent(tabOrder[currentTabIndex]);
                    
                    // 更新标签高亮状态
                    if (currentTabIndex === 0) {
                        // 滚动到评论位置
                        commentTab.classList.add('active');
                        tabs.forEach(tab => tab.classList.remove('active'));
                    } else {
                        // 滚动到其他位置
                        commentTab.classList.remove('active');
                        tabs.forEach(tab => tab.classList.remove('active'));
                        tabs[currentTabIndex - 1].classList.add('active'); // 减1因为评论不在下半部分
                    }
                }
            } else if (e.deltaY > 0) {
                // 向下切换，不能穿梭
                if (currentTabIndex < tabOrder.length - 1) {
                    currentTabIndex++;
                    updateTabContent(tabOrder[currentTabIndex]);
                    
                    // 更新标签高亮状态
                    commentTab.classList.remove('active');
                    tabs.forEach(tab => tab.classList.remove('active'));
                    tabs[currentTabIndex - 1].classList.add('active'); // 减1因为评论不在下半部分
                }
            }
        });

        // 下半部分标签点击切换
        tabs.forEach((tab, idx) => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                commentTab.classList.remove('active');
                currentTabIndex = idx + 1; // 加1因为评论占用了索引0
                updateTabContent(tabOrder[currentTabIndex]);
            });
        });

        // 评论标签点击
        commentTab.addEventListener('click', () => {
            commentTab.classList.add('active');
            tabs.forEach(tab => tab.classList.remove('active'));
            currentTabIndex = 0;
            updateTabContent(tabOrder[currentTabIndex]);
        });
    }

    // 点击外部关闭浮窗
    function initClickOutsideHandler() {
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('floating-panel');
            if (isPanelVisible && !panel.contains(e.target)) {
                hideFloatingPanel();
            }
        });
    }

    // 初始化浮窗功能
    initTabSwitching();
    initClickOutsideHandler();

    // 缩放到指定单词的函数
    function zoomToWord(word) {
        // 计算目标位置
        const targetX = word.coordinates.x * window.innerWidth;
        const targetY = word.coordinates.y * window.innerHeight;

        // 计算需要移动的距离
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;

        panX = viewportCenterX - targetX;
        panY = viewportCenterY - targetY;

        // 设置缩放级别
        currentScale = scaleThreshold;

        updateTransform();
        updateWordFocus();
    }

    //   // 返回按钮事件
    //   backButton.addEventListener('click', zoomOut);

    // 滚轮缩放控制
    universeView.addEventListener('wheel', (e) => {
        e.preventDefault();

        // 计算缩放方向和中心点
        const delta = -e.deltaY * 0.01;
        const rect = universeView.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算缩放中心在内容坐标系下的位置
        const contentX = (mouseX - panX) / currentScale;
        const contentY = (mouseY - panY) / currentScale;

        // 更新缩放
        const prevScale = currentScale;
        currentScale = Math.max(1, Math.min(currentScale + delta, scaleThreshold + 0.5));

        // 缩放后，为了让鼠标下的点保持不动，调整 pan
        panX -= (currentScale - prevScale) * contentX;
        panY -= (currentScale - prevScale) * contentY;

        updateTransform();
        updateWordFocus();
    });

    // 修改缩放和位移的 transform 应用
    function updateTransform() {
        universeView.style.transformOrigin = "0 0";
        universeView.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
    }

    // 更新单词聚焦状态 - 基于视图中心
    function updateWordFocus() {
        // 获取视图中心坐标
        const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // 清除之前聚焦的单词
        if (focusedWord) {
            focusedWord.classList.remove('focused');
            focusedWord = null;
        }

        // 如果缩放足够大（达到或超过阈值）
        if (currentScale >= scaleThreshold) {
            // 找出距离视图中心最近的单词
            let closestWord = null;
            let minDistance = Infinity;

            document.querySelectorAll('.word-node').forEach(node => {
                const rect = node.getBoundingClientRect();
                const nodeCenter = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };

                // 计算距离
                const distance = Math.sqrt(
                    Math.pow(nodeCenter.x - viewportCenter.x, 2) +
                    Math.pow(nodeCenter.y - viewportCenter.y, 2)
                );

                // 更新最近单词
                if (distance < minDistance) {
                    minDistance = distance;
                    closestWord = node;
                }
            });

            // 聚焦最近的单词
            if (closestWord) {
                closestWord.classList.add('focused');
                focusedWord = closestWord;

                // 自动平移到视图中心
                const nodeRect = closestWord.getBoundingClientRect();
                const nodeCenterX = nodeRect.left + nodeRect.width / 2;
                const nodeCenterY = nodeRect.top + nodeRect.height / 2;
                const viewportCenterX = window.innerWidth / 2;
                const viewportCenterY = window.innerHeight / 2;

                panX += (viewportCenterX - nodeCenterX) / currentScale;
                panY += (viewportCenterY - nodeCenterY) / currentScale;

                updateTransform();
            }
        }
    }
}


// 初始化 - 等待DOM加载完成后获取数据
document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            return response.json();
        })
        .then(data => {
            // 调用渲染函数，传入words数组
            renderWordUniverse(data.words);
        })
        .catch(error => {
            console.error('加载数据失败:', error);
            // 可以在这里添加错误处理UI，比如显示错误信息
            document.getElementById('word-nodes-container').innerHTML =
                '<p class="error">加载单词数据失败，请刷新重试</p>';
        });
});

// // menu
// let duneIcon = document.getElementById("duneIcon");
// let suffleIcon = document.getElementById("suffleIcon");
// let nextIcon = document.getElementById("nextIcon");
// let searchIcon = document.getElementById("searchIcon");

// bg 0-180-0 0-90-0 20/
function drawBg() {
    let bg = document.getElementById("universe-bg");
    bg.innerHTML = ""; // 清空旧内容
    let cols = 18,
        rows = 9;
    let gridWidth = window.innerWidth / cols;
    let gridHeight = window.innerHeight / rows;
    for (let i = 0; i < cols * rows; i++) {
        let grid = document.createElement("div");
        grid.classList.add("universe-grid");
        grid.style.width = gridWidth + "px";
        grid.style.height = gridHeight + "px";
        bg.appendChild(grid);
    }
}

window.addEventListener("DOMContentLoaded", drawBg);
window.addEventListener("resize", drawBg);



// {
//   "id": "唯一ID",
//   "term": "术语名称",
//   "brief_definition": "简要释义",
//   "extended_definition": "扩展释义",
//   "diagrams": ["分析图URL", "参考图URL", "AI图URL"],
//   "original_language": "外文/源语言",
//   "domain": "领域/标签",
//   "proposer": "提出者",
//   "proposing_country": "提出国",
//   "proposing_time": "提出时间",
//   "references": "参考资料",
//   "contributors": ["贡献者1", "贡献者2"],
//   "reviewers": ["审阅者1", "审阅者2"],
//   "related_terms": ["相关词条ID1", "相关词条ID2"],
//   "comments": [{
//     "author": "专家名",
//     "content": "评论内容",
//     "date": "评论日期"
//   }],
//   "createdAt": "创建时间",
//   "updatedAt": "更新时间"
// },