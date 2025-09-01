// wordFocus.js - 专门处理单词焦点和缩放
import { state } from "./state.js";
import { draw, updateWordNodeTransforms, updateScaleForNodes } from "./uni-canvas.js";
import { updateRelations } from "./relationManager.js";
import { renderPanelSections } from "./detail.js";

export const scaleThreshold = 20; // 触发详细信息显示的缩放阈值
let focusedWord = null;

// 定义每个section的基础位置和变化范围
const detailPositions = {
    image: {
        baseTop: 30, // vh
        baseLeft: 70, // vw
        topRange: 8,  // ±8vh
        leftRange: 10 // ±10vw
    },
    proposer: {
        baseTop: 65, // vh
        baseLeft: 30, // vw
        topRange: 6,  // ±6vh
        leftRange: 8  // ±8vw
    },
    comment: {
        baseTop: 80, // vh
        baseLeft: 60, // vw
        topRange: 5,  // ±5vh
        leftRange: 12 // ±12vw
    }
};

// 为detail sections生成微小的位置变化
function applyPositionVariations(wordId) {
    // 使用单词ID作为种子来确保相同单词的位置是一致的
    const seed = parseInt(wordId) || 1;
    
    Object.keys(detailPositions).forEach((sectionId, index) => {
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        const config = detailPositions[sectionId];
        
        // 为每个section使用不同的随机种子
        const sectionSeed = seed * (index + 1) * 17 + (index + 1) * 31;
        
        // 使用简单的伪随机数生成器，每个section都有独立的随机值
        const random1 = ((sectionSeed * 9301 + 49297) % 233280) / 233280;
        const random2 = ((sectionSeed * 9307 + 49321) % 233280) / 233280;
        
        // 计算位置偏移（在范围内的随机值）
        const topOffset = (random1 - 0.5) * config.topRange;
        const leftOffset = (random2 - 0.5) * config.leftRange;
        
        // 应用新位置
        const newTop = config.baseTop + topOffset;
        const newLeft = config.baseLeft + leftOffset;
        
        // 添加平滑过渡效果
        section.style.transition = 'top 0.3s ease-out, left 0.3s ease-out';
        section.style.top = `${newTop}vh`;
        section.style.left = `${newLeft}vw`;
    });
}

// 重置所有detail sections到基础位置
function resetPositions() {
    Object.keys(detailPositions).forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        const config = detailPositions[sectionId];
        section.style.transition = 'top 0.3s ease-out, left 0.3s ease-out';
        section.style.top = `${config.baseTop}vh`;
        section.style.left = `${config.baseLeft}vw`;
    });
}

// 获取邻居节点（用于检查周围空间）
function getNeighbors(left, top) {
    const neighbors = [];
    const deltas = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0],           [1, 0],
        [-1, 1],  [0, 1],  [1, 1]
    ];

    for (const [dx, dy] of deltas) {
        const nx = Math.round(left + dx);
        const ny = Math.round(top + dy);
        
        // 检查是否有节点在这个位置
        const nodeAtPosition = document.querySelector(
            `.word-node[data-x="${(nx/100).toFixed(2)}"][data-y="${(ny/100).toFixed(2)}"]`
        );
        
        neighbors.push({
            x: nx,
            y: ny,
            hasValue: !!nodeAtPosition
        });
    }

    return neighbors;
}

export function zoomToWord(id, newScale) {
    const node = document.getElementById(id);
    if (!node) return;

    const oldScale = state.currentScale;

    // 用逻辑坐标而不是 rect
    const logicalX = parseFloat(node.dataset.x); // 假设0-1范围
    const logicalY = parseFloat(node.dataset.y);

    const container = document.getElementById('word-nodes-container');
    const containerRect = container.getBoundingClientRect();
    const worldX = logicalX * containerRect.width;
    const worldY = logicalY * containerRect.height;

    // 屏幕中心
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    // 补偿 node 尺寸
    const rect = node.getBoundingClientRect();
    const nodeWidth = rect.width / oldScale; 
    const nodeHeight = rect.height / oldScale;

    state.panX = viewportCenterX - (worldX * newScale + 318 / 2);
    state.panY = viewportCenterY - (worldY * newScale + 210 / 2);

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
        resetPositions(); // 重置位置
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
            // 检查是否有足够空间显示详情
            let left = parseFloat(closestWord.dataset.x) * 100;
            let top = parseFloat(closestWord.dataset.y) * 100;

            // let neighbors = getNeighbors(left, top);
            // const hasNearbyNodes = neighbors.some(n => n.hasValue);

            // if (hasNearbyNodes && state.currentScale < 7.9) {
            //     return;
            // }

            closestWord.classList.add('focused');
            focusedWord = closestWord;
            state.focusedNodeId = closestWord.id;

            overlay.classList.remove("hidden");
            updateRelations();
            hideNearbyNodes(closestWord);

            // 自动吸附到屏幕中心
            zoomToWord(focusedWord.id, scaleThreshold);
            updateWordDetails();
            
            // 应用位置变化（除了term section）
            applyPositionVariations(closestWord.id);
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
        e.stopPropagation();
        e.preventDefault();
    }, {
        passive: false
    });

    // term section
    const termTitle = document.querySelector('#term .detail-title');
    const termMainEl = document.querySelector('#term .term-main');
    const originalTermEl = document.querySelector('#term .term-ori');
    termTitle.textContent = String(word.id).padStart(4, '0');
    termMainEl.textContent = word.term || '未知单词';
    originalTermEl.textContent = word.termOri || '无';

    const node = document.getElementById(word.id);
    const termDiv = document.getElementById("term");
    termDiv.style.backgroundColor = node.style.backgroundColor;

    // image section
    const imageTitle = document.querySelector('#image .detail-title');
    const imageEl = document.querySelector('#image img');
    imageTitle.textContent = '概念图片';
    if (word.diagrams && word.diagrams.length > 0) {
        imageEl.src = word.concept_image;
        imageEl.alt = word.term;
        imageEl.style.display = 'block';
    } else {
        imageEl.src = '';
        imageEl.style.display = 'none';
    }

    // proposer section
    const proposerTitle = document.querySelector('#proposer .detail-title');
    const proposerP = document.querySelector('#proposer p');
    const proposerImg = document.querySelector('#proposer img');
    proposerTitle.textContent = '提出人';
    if (word.proposers && word.proposers.length>0) {
        proposerP.textContent = word.proposers[0].name;
        proposerImg.src = word.proposers[0].image;
        proposerImg.alt = word.proposers[0].name || '';
        proposerImg.style.display = 'block';
    } else {
        proposerP.textContent = '未知';
        proposerImg.style.display = 'none';
    }

    // comment section
    const commentTitle = document.querySelector('#comment .detail-title');
    const commentH3 = document.querySelector('#comment h3');
    const commentP = document.querySelector('#comment p');
    commentTitle.textContent = '相关评论';
    if (word.commentAbs) {
        const comment = word.commentAbs;
        commentH3.textContent = comment.content;
        commentP.innerHTML = `--${comment.author}`;
    } else {
        commentH3.textContent = '暂无评论';
        commentP.innerHTML = '';
    }
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