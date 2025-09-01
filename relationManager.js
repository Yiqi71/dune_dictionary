// relationsManager.js - 专门处理单词关系连线
import { state } from "./state.js";
import { updateWordFocus, zoomToWord } from "./wordFocus.js";

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
    const node1 = document.getElementById(id1);
    const node2 = document.getElementById(id2);
    if (!node1 || !node2) return;

    const word1 = window.allWords.find(w => w.id == id1);
    const word2 = window.allWords.find(w => w.id == id2);

    const pos1 = getCenterPosition(node1);
    const pos2 = getCenterPosition(node2);

    // 视觉线
    const visualLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    visualLine.setAttribute('x1', pos1.x);
    visualLine.setAttribute('y1', pos1.y);
    visualLine.setAttribute('x2', pos2.x);
    visualLine.setAttribute('y2', pos2.y);

    // 根据关系类型设置样式
    switch (relation) {
        case '近义词':
            visualLine.setAttribute('stroke', '#FFFCF4');
            visualLine.setAttribute('stroke-dasharray', '5,5');
            break;
        case '反义词':
            visualLine.setAttribute('stroke', '#FFFCF4');
            visualLine.setAttribute('stroke-width', '2');
            break;
        case '同类概念':
            visualLine.setAttribute('stroke', '#FFFCF4');
            visualLine.setAttribute('stroke-width', '1.5');
            break;
        default:
            visualLine.setAttribute('stroke', '#FFFCF4');
    }

    // 点击/hover hitbox
    const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hitbox.setAttribute('x1', pos1.x);
    hitbox.setAttribute('y1', pos1.y);
    hitbox.setAttribute('x2', pos2.x);
    hitbox.setAttribute('y2', pos2.y);
    hitbox.setAttribute('stroke', 'transparent');
    hitbox.setAttribute('stroke-width', '10');
    hitbox.setAttribute('pointer-events', 'stroke');
    hitbox.style.cursor = 'crosshair';

    // 添加交互事件
    addLineInteractions(hitbox, word1, word2, relation, id2);

    // 保证 hitbox 在上面，视觉线在下面
    svg.appendChild(visualLine);
    svg.appendChild(hitbox);
}

function addLineInteractions(hitbox, word1, word2, relation, targetId) {
    let tooltipDiv = document.getElementById("tooltipDiv");

    hitbox.addEventListener('mouseenter', (e) => {
        hideTooltip();

        tooltipDiv.textContent = `${relation}： ${word2.term}`;
        tooltipDiv.style.position = 'fixed';
        tooltipDiv.style.background = 'rgba(0, 0, 0, 0.75)';
        tooltipDiv.style.color = '#fff';
        tooltipDiv.style.padding = '4px 8px';
        tooltipDiv.style.borderRadius = '4px';
        tooltipDiv.style.fontSize = '12px';
        tooltipDiv.style.pointerEvents = 'none';
        tooltipDiv.style.zIndex = '9999';
        tooltipDiv.style.opacity = "1";
        tooltipDiv.style.left = (e.clientX + 12) + 'px';
        tooltipDiv.style.top = (e.clientY + 12) + 'px';
    });

    hitbox.addEventListener('mousemove', (e) => {
        if (tooltipDiv) {
            tooltipDiv.style.left = (e.clientX + 12) + 'px';
            tooltipDiv.style.top = (e.clientY + 12) + 'px';
        }
    });

    hitbox.addEventListener('mouseleave', () => {
        hideTooltip() 
    });

    hitbox.addEventListener('click', () => {
        zoomToWord(targetId, state.currentScale);
        hideTooltip() ;
        updateWordFocus();
    });
}

// 统一的tooltip隐藏函数
function hideTooltip() {
    const tooltipDiv = document.getElementById("tooltipDiv");
    if (tooltipDiv) {
        tooltipDiv.style.opacity = '0';
        tooltipDiv.textContent = ''; // 清空内容
    }
}

// 更新所有关系连线
export function updateRelations() {
    const svg = document.getElementById('connection-lines');
    svg.innerHTML = '';

    hideTooltip();

    if (!state.focusedNodeId) return;

    const thisWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!thisWord || !thisWord.related_terms) return;
    
    thisWord.related_terms.forEach(relation => {
        drawLine(state.focusedNodeId, relation.id, relation.relation);
    });

    // ✅ 2. 额外画 "共同 proposer" 的关系
    if (Array.isArray(thisWord.proposers)) {
        // 当前词的 proposer 名称列表
        const proposerNames = thisWord.proposers.map(p => p.name);

        window.allWords.forEach(otherWord => {
            if (otherWord.id === thisWord.id) return; // 跳过自己
            if (!Array.isArray(otherWord.proposers)) return;

            // 判断是否有共同 proposer
            const hasCommon = otherWord.proposers.some(p => proposerNames.includes(p.name));
            if (hasCommon) {
                drawLine(thisWord.id, otherWord.id, "共同提出者");
            }
        });
    }
}