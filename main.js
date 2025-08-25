// 状态变量
import { state } from "./state.js";
import { draw, updateWordNodeTransforms, updateScaleForNodes } from "./uni-canvas.js";
import { country_bounding_boxes } from "./countryBoundingBoxes.js";
import { renderPanelSections } from "./detail.js";

window.allWords = [];

let focusedWord = null;
export const scaleThreshold = 20; // 触发详细信息显示的缩放阈值
let nodesColor = [" #F0B549", "#E1D37A", "#FAD67B", "#D58020"];


// nodes
let wordsOnGrid = {};
let minGrid = 2;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getCountryBoundary(countryCode) {
    const box = country_bounding_boxes[countryCode];
    if (!box) return [-180, -90, 180, 90];
    return box[1]; // [minLon, minLat, maxLon, maxLat]
}

function getCountryCenter(countryCode) {
    const box = country_bounding_boxes[countryCode];
    if (!box) {
        // 没有数据时，返回世界中心
        return { left: 50, top: 50 };
    }

    const [minLon, minLat, maxLon, maxLat] = box[1];

    const centerLon = (minLon + maxLon) / 2; // 中心经度
    const centerLat = (minLat + maxLat) / 2; // 中心纬度

    // 把经纬度转成百分比坐标（和你的 renderWordUniverse 里一致）
    const left = (centerLon + 180) / 3.6;   // -180~180 → 0~100
    const top = (90 - centerLat) / 1.8;     // 90~-90 → 0~100

    return { left, top };
}


// 生成全地图网格（百分比坐标）
function generateGridPoints(min = 5, max = 95) {
    const points = [];
    for (let top = min; top <= max; top += minGrid) {
        for (let left = min; left <= max; left += minGrid) {
            points.push({
                left,
                top
            });
        }
    }
    return points;
}

function getCountryGridPoints(countryCode) {
    const [minLon, minLat, maxLon, maxLat] = getCountryBoundary(countryCode);

    const allPoints = generateGridPoints();
    const availablePoints = allPoints.filter(({
        left,
        top
    }) => {
        // 转换百分比到经纬度
        const lon = left * 3.6 - 180;
        const lat = 90 - top * 1.8;
        return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
    });

    shuffleArray(availablePoints); // 只打乱国家内部格子顺序
    return availablePoints;
}



function getCenterPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}


// 画线svg relations
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
        zoomToWord(id2, state.currentScale);

        updateWordFocus();
        tooltipDiv.style.opacity = '0';
    });

    // 保证 hitbox 在上面，视觉线在下面
    svg.appendChild(visualLine);
    svg.appendChild(hitbox);
}

// 获取邻居
function getNeighbors(wordsOnGrid, left, top) {
    const neighbors = [];
    const deltas = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0],           [1, 0],
        [-1, 1],  [0, 1],  [1, 1]
    ];

    for (const [dx, dy] of deltas) {
        const nx = Math.round(left + dx);
        const ny = Math.round(top + dy);
        const key = `${nx},${ny}`;

        neighbors.push({
            key,
            value: wordsOnGrid[key] || null,
            hasValue: !!wordsOnGrid[key]
        });
    }

    return neighbors;
}


export function zoomToWord(id,newScale) {
    const node = document.getElementById(id);
    if (!node) return;

    const oldScale = state.currentScale;
    
    
    const rect = node.getBoundingClientRect();
    let x = rect.left+rect.width/2;
    let y = rect.top+rect.height/2;

    // 屏幕中心
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    // 更新缩放中心逻辑（保持点击点在中心）
    state.panX = viewportCenterX - ((x - state.panX) / oldScale) * newScale;
    state.panY = viewportCenterY - ((y - state.panY) / oldScale) * newScale;

    state.currentScale = newScale;

    let maxX = 164;
    let maxY = 106.5;

    draw();
    updateWordNodeTransforms();
    updateRelations();
    updateScaleForNodes(newScale);
}

export function updateWordFocus() {
    const overlay = document.getElementById("overlay");
    const detailDiv = document.getElementById("word-details");
    // 清除之前聚焦的单词
    if (focusedWord) {
        focusedWord.classList.remove('focused');
        focusedWord = null;
        state.focusedNodeId = null;
        restoreAllNodes();
    }

    overlay.classList.add("hidden");
    detailDiv.classList.add("hidden");

    // 获取视图中心坐标
    const viewportCenter = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    };

    console.log(state.currentScale);
    // 如果缩放足够大（达到或超过阈值）
    if (state.currentScale >= scaleThreshold) {
        // 找出距离视图中心最近的单词
        let closestWord = null;
        let minDistance = window.innerHeight / 4;

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
            // 是否有足够空间
            let left = closestWord.dataset.x * 100;
            let top = closestWord.dataset.y * 100;

            let neighbors = getNeighbors(wordsOnGrid, left, top);
            const hasAny = neighbors.some(n => n.hasValue);

            if (hasAny && state.currentScale < 7.9) {
                return;
            }

            closestWord.classList.add('focused');
            focusedWord = closestWord;
            state.focusedNodeId = closestWord.id;

            overlay.classList.remove("hidden");
            updateRelations();
            hideNearbyNodes(closestWord);

            // 自动吸附到屏幕中心
            zoomToWord(focusedWord.id,state.currentScale);
            updateWordDetails();
        
        }
    }
}

export function updateWordDetails() {
    if (!state.focusedNodeId) return;
    const word = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!word) return;

    // 显示details
    const detailDiv = document.getElementById("word-details");
    detailDiv.classList.remove('hidden');

    detailDiv.addEventListener('wheel', function (e) {
                e.stopPropagation(); // 不让滚轮事件向上传播
                e.preventDefault(); // 不让自己滚动
            }, {
                passive: false
            });

    // term
    const termTitle = document.querySelector('#term .detail-title');
    const termMainEl = document.querySelector('#term #term-main');
    const originalTermEl = document.querySelector('#term #term-ori');
    termTitle.textContent = String(word.id).padStart(4, '0');
    termMainEl.textContent = word.term || '未知单词';
    originalTermEl.textContent = word.termOri || '无';

    const node=document.getElementById(word.id);
    const termDiv=document.getElementById("term");
    termDiv.style.backgroundColor=node.style.backgroundColor;

    // image
    const imageTitle = document.querySelector('#image .detail-title');
    const imageEl = document.querySelector('#image img');
    imageTitle.textContent = '相关图片';
    if (word.diagrams && word.diagrams.length > 0) {
        imageEl.src = word.diagrams[0];
        imageEl.alt = word.term;
        imageEl.style.display = 'block';
    } else {
        imageEl.src = '';
        imageEl.style.display = 'none';
    }

    // proposer
    const proposerTitle = document.querySelector('#proposer .detail-title');
    const proposerP = document.querySelector('#proposer p');
    const proposerImg = document.querySelector('#proposer img');
    proposerTitle.textContent = '提出人';
    proposerP.textContent = word.proposer || '未知';
    if (word.proposer_img) {
        proposerImg.src = word.proposer_img;
        proposerImg.alt = word.proposer || '';
        proposerImg.style.display = 'block';
    } else {
        proposerImg.style.display = 'none';
    }

    // comment
    const commentTitle = document.querySelector('#comment .detail-title');
    const commentH3 = document.querySelector('#comment h3');
    const commentP = document.querySelector('#comment p');
    commentTitle.textContent = '相关评论';
    if (word.commentAbs) {
        word.commentAbs.forEach(c => {
            commentH3.textContent = `${c.content} `,
                commentP.innerHTML = `--${c.author}`;
        })
    } else {
        commentH3.textContent = '暂无评论';
        commentP.innerHTML = '';
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



function getYearRange(terms) {
  const years = terms
    .map(t => parseInt(t.proposing_time))
    .filter(y => !isNaN(y)); // 防止有不是数字的情况

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  return { minYear, maxYear };
}

// 渲染函数
function renderWordUniverse(wordsData) {
    const wordNodesContainer = document.getElementById('word-nodes-container');
    wordNodesContainer.innerHTML = '';
    wordsOnGrid = {};

    // 按国家分组
    const wordsByCountry = {};
    wordsData.forEach(word => {
        if (!wordsByCountry[word.proposing_country]) {
            wordsByCountry[word.proposing_country] = [];
        }
        wordsByCountry[word.proposing_country].push(word);
    });


    // 渲染每个国家的节点
    for (const country in wordsByCountry) {
        const words = wordsByCountry[country];
        const countryPoints = getCountryGridPoints(country, 1);

        // 限制显示数量
        // const displayCount = Math.min(words.length, countryPoints.length);
        const displayCount = words.length; 

        for (let i = 0; i < displayCount; i++) {
            const word = words[i];
            // const {
            //     left: leftPercent,
            //     top: topPercent
            // } = countryPoints[i];
            let pos;
            if (countryPoints.length > 0) {
                if (i < countryPoints.length) {
                    // 用格点
                    pos = countryPoints[i];
                } else {
                    // 超出数量，挤在最后一个格点附近
                    const base = countryPoints[countryPoints.length - 1];
                    pos = {
                        left: base.left + (Math.random() - 0.5) * 10, // ±5%
                        top: base.top + (Math.random() - 0.5) * 10
                    };
                }
            } else {
                // ❌ 没有格点 → 用国家中心点 + 偏移
                const base = getCountryCenter(country); // 你要定义这个函数
                pos = {
                    left: base.left + (Math.random() - 0.5) * 10,
                    top: base.top + (Math.random() - 0.5) * 10
                };
            }

            let leftPercent=pos.left;
            let topPercent=pos.top;

            word.longitude = leftPercent * 3.6 - 180;
            word.latitude = 90 - topPercent * 1.8;

            const node = document.createElement('div');
            node.className = 'word-node';
            node.dataset.nodeFormat = "word";
            node.innerHTML = `
            <div class="detail-title">${String(word.id).padStart(4, '0')}</div>
            <div class="terms">
                <div id="term-main">${word.term || '未知单词'}</div>
                <div id="term-ori">${word.termOri || '无'}</div>
            </div>
            `;
            node.style.left = `${leftPercent}%`;
            node.style.top = `${topPercent}%`;
            node.style.transform = `translate(-50%, -50%)`;

            const { minYear, maxYear } = getYearRange(wordsData);

            
            const year = Number(word.proposing_time.replace("年", ""));
            const ratio = (year - minYear) / (maxYear - minYear); // 0~1
            let nodeColor = null;
            if(ratio<1/6){
                nodeColor="#F9D67A";
            }else if(ratio<2/6){
                nodeColor="#FADD91";
            }else if(ratio<3/6){
                nodeColor="#FAE2A5";
            }else if(ratio<4/6){
                nodeColor="#FAE8BA";
            }else if(ratio<5/6){
                nodeColor="#FAEED0";
            }else{
                nodeColor="#F9F3E3";
            }
            node.style.backgroundColor = nodeColor;


            node.dataset.lon = word.longitude;
            node.dataset.lat = word.latitude;
            node.dataset.x = leftPercent / 100;
            node.dataset.y = topPercent / 100;
            node.id = word.id;
            
             // ✅ 关键：用 "x,y" 作为 key 存储
            const key = `${Math.round(leftPercent)},${Math.round(topPercent)}`;
            wordsOnGrid[key] = node.id;

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
                    if (node.classList.contains('focused')) {} else {
                        zoomToWord(node.id, scaleThreshold);
                        updateWordFocus();
                        renderPanelSections();
                    }
                }
            });

            wordNodesContainer.appendChild(node);
            
            updateWordNodeTransforms();
        }
    }

    // drag
    let isDragging = false;

    let canvas = document.getElementById("universe-canvas");
    canvas.addEventListener('wheel', (e) => {
        updateWordFocus();
    });
    canvas.addEventListener('mouseup', () => {
        updateWordFocus(); // 拖动结束后更新
    });

}

function hideNearbyNodes(focusedNode) {
    document.querySelectorAll('.word-node').forEach(node => {
        if (node === focusedNode) return;
        node.style.opacity = '0.5';
    });
}

function restoreAllNodes() {
    document.querySelectorAll('.word-node').forEach(node => {
        node.style.opacity = '1';
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
            zoomToWord(state.focusedNodeId,scaleThreshold);
            updateWordFocus();
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


