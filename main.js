// 状态变量
import {
    state
} from "./state.js";

import {
    draw,
    updateWordNodeTransforms
} from "./uni-canvas.js";

import {
    showFloatingPanel
} from "./detail.js"


window.allWords = [];


let panX = state.panX,
    panY = state.panY;
let currentScale = state.currentScale;
let focusedWord = null;
const scaleThreshold = 4; // 触发详细信息显示的缩放阈值

let nodesColor = [" #F0B549","#E1D37A","#FAD67B", "#D58020"];

export function zoomToWord(id) {
    const node = document.getElementById(id);
    const rect = node.getBoundingClientRect();

    const oldScale = state.currentScale;
    const newScale = 4;

    // let x = node.dataset.x * state.baseGridSize * 36 * oldScale + state.panX;
    // let y = node.dataset.y * state.baseGridSize * 36 * oldScale + state.panY;

    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2

    // 屏幕中心
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    // 更新缩放中心逻辑（保持点击点在中心）
    state.panX = viewportCenterX - ((x - state.panX) / oldScale) * newScale;
    state.panY = viewportCenterY - ((y - state.panY) / oldScale) * newScale;

    state.currentScale = newScale;

    draw();
    updateWordNodeTransforms();
    updateWordFocus();
    updateRelations();
}

function getCenterPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}


// 画线svg
function drawLine(id1, id2, relation) {
    const svg = document.getElementById('connection-lines');
    svg.innerHTML = ''; // 清空原线
    const node1 = document.getElementById(id1);
    const node2 = document.getElementById(id2);
    if (!node1 || !node2) return;

    const word1 = window.allWords.find(w => w.id == id1);
    const word2 = window.allWords.find(w => w.id == id2);


    const pos1 = getCenterPosition(node1);
    const pos2 = getCenterPosition(node2);

    // ===== 1. 视觉线 =====
    const visualLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    visualLine.setAttribute('x1', pos1.x);
    visualLine.setAttribute('y1', pos1.y);
    visualLine.setAttribute('x2', pos2.x);
    visualLine.setAttribute('y2', pos2.y);

    switch (relation) {
        case '近义词':
            visualLine.setAttribute('stroke', 'green');
            visualLine.setAttribute('stroke-dasharray', '5,5');
            break;
        case '反义词':
            visualLine.setAttribute('stroke', 'red');
            visualLine.setAttribute('stroke-width', '2');
            break;
        case '同类概念':
            visualLine.setAttribute('stroke', 'blue');
            visualLine.setAttribute('stroke-width', '1.5');
            break;
        default:
            visualLine.setAttribute('stroke', 'gray');
    }

    // ===== 2. 点击/hover hitbox =====
    const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hitbox.setAttribute('x1', pos1.x);
    hitbox.setAttribute('y1', pos1.y);
    hitbox.setAttribute('x2', pos2.x);
    hitbox.setAttribute('y2', pos2.y);
    hitbox.setAttribute('stroke', 'transparent'); // 透明不遮挡视觉
    hitbox.setAttribute('stroke-width', '10'); // 大点击范围
    hitbox.setAttribute('pointer-events', 'stroke'); // 只在stroke区域触发事件

    // 鼠标放上去变小手
    hitbox.style.cursor = 'crosshair';

    // 鼠标跟随提示
    let tooltipDiv = document.getElementById("tooltipDiv");

    hitbox.addEventListener('mouseenter', (e) => {
        // 创建 tooltip 元素
        tooltipDiv.textContent = `连接词：${word1.term} ⇔ ${word2.term} 关系：${relation}`;
        tooltipDiv.style.position = 'fixed';
        tooltipDiv.style.background = 'rgba(0, 0, 0, 0.75)';
        tooltipDiv.style.color = '#fff';
        tooltipDiv.style.padding = '4px 8px';
        tooltipDiv.style.borderRadius = '4px';
        tooltipDiv.style.fontSize = '12px';
        tooltipDiv.style.pointerEvents = 'none';
        tooltipDiv.style.zIndex = '9999';

        tooltipDiv.style.opacity = "1";

        // 初始化位置
        tooltipDiv.style.left = (e.clientX + 12) + 'px';
        tooltipDiv.style.top = (e.clientY + 12) + 'px';
    });

    // 鼠标移动时更新 tooltip 位置
    hitbox.addEventListener('mousemove', (e) => {
        if (tooltipDiv) {
            tooltipDiv.style.left = (e.clientX + 12) + 'px';
            tooltipDiv.style.top = (e.clientY + 12) + 'px';
        }
    });

    hitbox.addEventListener('mouseleave', () => {
        if (tooltipDiv) {
            tooltipDiv.style.opacity = '0';
        }
    });

    hitbox.addEventListener('click', () => {
        zoomToWord(id2);
        tooltipDiv.style.opacity = '0';

    });

    // 保证 hitbox 在上面，视觉线在下面
    svg.appendChild(visualLine);
    svg.appendChild(hitbox);
}

// 更新单词聚焦状态 - 基于视图中心
function updateWordFocus() {
    // 清除之前聚焦的单词
    if (focusedWord) {
        focusedWord.classList.remove('focused');
        focusedWord = null;
        state.focusedNodeId = null;
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
            state.focusedNodeId = closestWord.id;

            updateRelations();

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

export function updateRelations() {
    const svg = document.getElementById('connection-lines');
    svg.innerHTML = '';

    if (!state.focusedNodeId) return;

    const thisWord = window.allWords.find(w => w.id == state.focusedNodeId);
    let relations = thisWord.related_terms;
    relations.forEach(a => {
        drawLine(state.focusedNodeId, a.id, a.relation);
    });
}

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

        // 随机决定显示图片还是文字
    // if (Math.random() < 0.4 && word.diagrams && word.diagrams.length > 0) {
    //     node.dataset.nodeFormat = "img";
    //     // 图片节点
    //     const img = document.createElement('img');
    //     img.src = word.diagrams[0];
    //     img.alt = word.term;
    //     img.style.width = '60px';
    //     img.style.height = '60px';
    //     img.style.objectFit = 'contain';
    //     node.appendChild(img);
    // } else {
        node.dataset.nodeFormat = "word";
        // 文字节点
        node.textContent = word.term;
        let colorRandom = Math.floor(Math.random() * 4);
        node.style.backgroundColor = nodesColor[colorRandom];
    // }

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

        node.id = word.id;

        node.addEventListener('wheel', function (e) {
            e.stopPropagation(); // 不让滚轮事件向上传播
            e.preventDefault(); // 不让自己滚动
        }, {
            passive: false
        });
        // 添加点击事件处理浮窗显示
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
                    // zoomToWord(e.clientX, e.clientY);
                    zoomToWord(node.id);
                }
            }
        });

        wordNodesContainer.appendChild(node);

        updateWordNodeTransforms();
        console.log('node rendered');
    });


    // drag
    let isDragging = false;

    let canvas = document.getElementById("universe-canvas");
    let nodesView = document.getElementById("word-nodes-container");
    canvas.addEventListener('wheel', (e) => {
        updateWordFocus();
    });
    canvas.addEventListener('mouseup', () => {
        updateWordFocus(); // 拖动结束后更新
    });

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
            window.allWords = data.words;
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

document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'x') {
        console.log('state.panX:', state.panX);
        console.log('state.panY:', state.panY);
        console.log('state.currentScale:', state.currentScale);
    }
    if (e.key.toLowerCase() === 'c') {
        console.log('state.focusedNodeId:', state.focusedNodeId);
    }
});


// // menu
// let duneIcon = document.getElementById("duneIcon");
// let suffleIcon = document.getElementById("suffleIcon");
// let searchIcon = document.getElementById("searchIcon");