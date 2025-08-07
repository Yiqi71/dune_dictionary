// 状态变量
import {
    state
} from "./state.js";
let panX = state.panX,
    panY = state.panY;
let currentScale = state.currentScale;
let focusedWord = null;
const scaleThreshold = 4; // 触发详细信息显示的缩放阈值



function updateState() {
    state.currentScale = currentScale;
    state.panX = panX;
    state.panY = panY;
}


// 渲染函数
function renderWordUniverse(wordsData) {
    const universeView = document.getElementById('universe-view');
    const wordNodesContainer = document.getElementById('word-nodes-container');

    // 清空容器（防止重复加载）
    wordNodesContainer.innerHTML = '';

    // 创建单词节点
    wordsData.forEach(word => {

        word.longitude = word.coordinates.x * 360 - 180;
        word.latitude = word.coordinates.y * 180 - 90;

        const node = document.createElement('div');
        node.className = 'word-node';

        // 基础信息
        node.textContent = word.term;
        node.style.backgroundColor = word.color;

        // 详细信息（zoom in后显示）
        const detailDiv = document.createElement('div');
        detailDiv.className = 'word-details';

        // 创建随机布局的子元素
        const elements = [{
                tag: 'img',
                content: '',
                attrs: {
                    src: word.diagrams[0],
                    alt: word.term
                }
            },
            {
                tag: 'p',
                content: word.brief_definition,
                class: 'definition'
            },
            {
                tag: 'p',
                content: `"${word.extended_definition}"`,
                class: 'quote'
            },
            {
                tag: 'p',
                content: `${word.proposer}`,
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
        node.style.transform = `translate(-50%, -50%)`;

        node.dataset.lon = word.longitude;
        node.dataset.lat = word.latitude;
        node.dataset.x = word.coordinates.x;
        node.dataset.y = word.coordinates.y;


        // 添加点击事件处理浮窗显示
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            if (node.classList.contains('focused')) {
                showFloatingPanel(word, node);
            } else {
                zoomToWord(word);
            }
        });
        // 修改单词节点的点击事件
        node.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        node.addEventListener('click', (e) => {
            e.stopPropagation();
            // 只有不是拖拽操作时才处理点击
            if (!isDragging) {
                if (node.classList.contains('focused')) {
                    showFloatingPanel(word, node);
                } else {
                    zoomToWord(word);
                }
            }
        });

        wordNodesContainer.appendChild(node);

        console.log('node rendered');
    });


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

        updateState();
        updateWordFocus();
    }

    // 滚轮缩放控制

    // drag
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    let canvas = document.getElementById("universe-canvas");
    let nodesView = document.getElementById("word-nodes-container");
    canvas.addEventListener('wheel', (e) => {
        updateWordFocus();
    });
    canvas.addEventListener('mouseup', () => {
        updateWordFocus(); // 拖动结束后更新
    });



function hideNearbyNodes(focusedNode) {
    document.querySelectorAll('.word-node').forEach(node => {
        if (node === focusedNode) return;

        
            node.style.opacity = '0.2'; // 或者 visibility: hidden / display: none
        
    });
}

function restoreAllNodes() {
    document.querySelectorAll('.word-node').forEach(node => {
        node.style.opacity = '1';
    });
}



    // 更新单词聚焦状态 - 基于视图中心
    function updateWordFocus() {
        // 清除之前聚焦的单词
        if (focusedWord) {
            focusedWord.classList.remove('focused');
            focusedWord = null;
            restoreAllNodes();
        }
        
        // 获取视图中心坐标
        const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // 如果缩放足够大（达到或超过阈值）
        if (state.currentScale >= scaleThreshold) {
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

                hideNearbyNodes(closestWord);

                // // 自动平移到视图中心
                // const nodeRect = closestWord.getBoundingClientRect();
                // const nodeCenterX = nodeRect.left + nodeRect.width / 2;
                // const nodeCenterY = nodeRect.top + nodeRect.height / 2;
                // const viewportCenterX = window.innerWidth / 2;
                // const viewportCenterY = window.innerHeight / 2;

                // panX += (viewportCenterX - nodeCenterX) / currentScale;
                // panY += (viewportCenterY - nodeCenterY) / currentScale;

                // updateTransform();
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