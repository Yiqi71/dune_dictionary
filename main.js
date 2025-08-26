// 状态变量
import { state } from "./state.js";
import { draw, updateWordNodeTransforms, updateScaleForNodes } from "./uni-canvas.js";
import { country_bounding_boxes } from "./countryBoundingBoxes.js";
import { renderPanelSections } from "./detail.js";
import {updateRelations} from "./relationManager.js";

window.allWords = [];

let focusedWord = null;
export const scaleThreshold = 20; // 触发详细信息显示的缩放阈值


// nodes
let wordsOnGrid = {};
let usedPositions = new Set(); // 记录已使用的位置
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
function generateGridPoints(min = 4, max = 96) {
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

// 新增：扩散算法 - 从国家中心向外扩散寻找可用位置
function findAvailablePositions(countryCode, wordCount) {
    const countryPoints = getCountryGridPoints(countryCode);
    const positions = [];
    
    // 首先使用国家内部的格点
    for (let i = 0; i < countryPoints.length && positions.length < wordCount; i++) {
        const point = countryPoints[i];
        const key = `${Math.round(point.left)},${Math.round(point.top)}`;
        if (!usedPositions.has(key)) {
            positions.push(point);
            usedPositions.add(key);
        }
    }
    
    // 如果国家内部格点不够，向外扩散
    if (positions.length < wordCount) {
        const countryCenter = getCountryCenter(countryCode);
        const additionalPositions = expandFromCenter(
            countryCenter, 
            wordCount - positions.length,
            countryPoints
        );
        positions.push(...additionalPositions);
    }
    
    return positions;
}

// 从中心点向外螺旋扩散寻找可用位置
function expandFromCenter(center, neededCount, excludePoints = []) {
    const positions = [];
    const excludeKeys = new Set(
        excludePoints.map(p => `${Math.round(p.left)},${Math.round(p.top)}`)
    );
    
    let radius = minGrid;
    const maxRadius = 50; // 最大扩散半径
    
    while (positions.length < neededCount && radius <= maxRadius) {
        const ringPositions = generateRingPositions(center, radius);
        
        for (const pos of ringPositions) {
            if (positions.length >= neededCount) break;
            
            const key = `${Math.round(pos.left)},${Math.round(pos.top)}`;
            
            // 检查是否在地图范围内，未被使用，且不在排除列表中
            if (isValidPosition(pos) && 
                !usedPositions.has(key) && 
                !excludeKeys.has(key)) {
                positions.push(pos);
                usedPositions.add(key);
            }
        }
        
        radius += minGrid;
    }
    
    return positions;
}

// 生成指定半径的环形位置
function generateRingPositions(center, radius) {
    const positions = [];
    const steps = Math.max(8, Math.floor(2 * Math.PI * radius / minGrid)); // 根据半径调整密度
    
    for (let i = 0; i < steps; i++) {
        const angle = (2 * Math.PI * i) / steps;
        const left = center.left + radius * Math.cos(angle);
        const top = center.top + radius * Math.sin(angle);
        
        // 对齐到网格
        const gridLeft = Math.round(left / minGrid) * minGrid;
        const gridTop = Math.round(top / minGrid) * minGrid;
        
        positions.push({ left: gridLeft, top: gridTop });
    }
    
    return positions;
}

// 检查位置是否有效（在地图范围内）
function isValidPosition(pos) {
    return pos.left >= 5 && pos.left <= 95 && 
           pos.top >= 5 && pos.top <= 95;
}

// 优化后的位置分配算法
function allocatePositionsForCountries(wordsByCountry) {
    usedPositions.clear(); // 重置已使用位置
    const countryPositions = {};
    
    // 按单词数量排序，优先分配单词多的国家
    const sortedCountries = Object.keys(wordsByCountry).sort((a, b) => {
        return wordsByCountry[b].length - wordsByCountry[a].length;
    });
    
    for (const country of sortedCountries) {
        const wordCount = wordsByCountry[country].length;
        countryPositions[country] = findAvailablePositions(country, wordCount);
    }
    
    return countryPositions;
}

function getCenterPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
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
    const termMainEl = document.querySelector('#term .term-main');
    const originalTermEl = document.querySelector('#term .term-ori');
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


function getYearRange(terms) {
  const years = terms
    .map(t => parseInt(t.proposing_time))
    .filter(y => !isNaN(y)); // 防止有不是数字的情况

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  return { minYear, maxYear };
}

// 优化后的渲染函数
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

    // 使用优化的位置分配算法
    const countryPositions = allocatePositionsForCountries(wordsByCountry);

    // 渲染每个国家的节点
    for (const country in wordsByCountry) {
        const words = wordsByCountry[country];
        const positions = countryPositions[country];

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            
            // 使用分配好的位置，如果位置不够就跳过
            if (i >= positions.length) {
                console.warn(`国家 ${country} 的单词数量超过可分配位置，跳过单词: ${word.term}`);
                continue;
            }
            
            const pos = positions[i];
            const leftPercent = pos.left;
            const topPercent = pos.top;

            word.longitude = leftPercent * 3.6 - 180;
            word.latitude = 90 - topPercent * 1.8;

            const node = document.createElement('div');
            node.className = 'word-node';
            node.dataset.nodeFormat = "word";
            node.innerHTML = `
            <div class="detail-title">${String(word.id).padStart(4, '0')}</div>
            <div class="terms">
                <div class="term-main">${word.term || '未知单词'}</div>
                <div class="term-ori">${word.termOri || '无'}</div>
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

    console.log(usedPositions);
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