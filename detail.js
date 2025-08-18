import {
    state
} from "./state.js";

import {
    zoomToWord
} from "./main.js";

// 浮窗相关变量
let currentFloatingPanel = null;
let isPanelVisible = false;

function filterProposer() {
    const focusedWord = window.allWords.find(w => w.id == state.focusedId);
    if (!focusedWord) return [];

    // 先渲染 proposer 相关的词
    const relatedContainer = document.getElementById('related-words');
    if (!relatedContainer) return;
    relatedContainer.innerHTML = '';

    const relatedWords = window.allWords.filter(
        w => w.proposer === focusedWord.proposer && w.id !== focusedWord.id
    );
    relatedWords.forEach(w => {
        const link = document.createElement('div');
        link.id = `related-${w.id}`;
        link.textContent = w.term;
        link.style.display = 'block';

        // 点击跳转到这个单词
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetNodeId = link.id.replace('related-', '');
            console.log(targetNodeId);
            zoomToWord(targetNodeId); // 用你现成的 zoomToWord(node) 逻辑
            updateTabContent("book");
        });

        relatedContainer.appendChild(link);
    });
}

// 浮窗功能函数
export function showFloatingPanel(word, node) {
    const panel = document.getElementById('floating-panel');
    panel.classList.remove('hidden');
    isPanelVisible = true;
    currentFloatingPanel = panel;

    renderPanelSections();
}

function hideFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.add('hidden');
    isPanelVisible = false;
    currentFloatingPanel = null;
}

function renderPanelSections() {
    let currentWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!currentWord) return;

    // 上半部分
    const title = document.querySelector('.panel-top');
    title.innerHTML = `
    <p> ${String(currentWord.id).padStart(4, '0')} </p>
    <h1> ${currentWord.term || '未知单词'} </h1>
    <h1> ${currentWord.termOri || '无'} </h1>
    `

    // 下半部分
    const contentScroll = document.querySelector('.panel-content');
    contentScroll.innerHTML = `        
        <section id="section-brief">
            <h3>简要释义</h3>
            <p>${currentWord.brief_definition || '暂无简要释义'}</p>
        </section>

        <section id="section-detail">
            <h3>详细释义</h3>
            <p>${currentWord.extended_definition || '暂无详细释义'}</p>
            <p style='color:#888;font-size:13px;margin-top:10px;'>参考资料：${currentWord.references || '暂无'}</p>
        </section>

        <section id="section-book">
            <h3>相关著作</h3>
            <p>${currentWord.proposer ? '提出者：' + currentWord.proposer : '暂无相关著作信息'}</p>
            <p>提出国：${currentWord.proposing_country || '未知'}</p>
            <p>提出时间：${currentWord.proposing_time || '未知'}</p>
        </section>

        <section id="section-image">
            <h3>图片</h3>
            <img src='${currentWord.diagrams[0]}' alt='${currentWord.term}'
                style='max-width:100%;border-radius:8px;box-shadow:0 2px 8px #0002;margin-bottom:10px;'>
            <p>${currentWord.term}</p>
        </section>

        <section id="section-comment">
            <h3>评论</h3>
            <p>${currentWord.comments?.map(c => `${c.author}：${c.content}`).join('<br>') || '暂无评论'}</p>
        </section>
    `;
}



// 滚动到对应 section
function updateTabContent(tabType = "brief") {
    const panel = document.getElementById('floating-panel');
    const contentScroll = panel.querySelector('.panel-content');

    if (!contentScroll) return;

    // tabType -> section 的映射
    const sectionMap = {
        comment: "section-comment",
        image: "section-image",
        book: "section-book",
        detail: "section-detail",
        brief: "section-brief"
    };

    const targetId = sectionMap[tabType] || sectionMap["brief"];
    const targetSection = document.getElementById(targetId);

    if (targetSection) {
        targetSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

const panelContent = document.querySelector('.panel-content');
const scrollThumb = document.querySelector('.scroll-thumb');
const scrollTrack = document.querySelector('.scroll-track');

function updateThumbPosition() {
    const contentHeight = panelContent.scrollHeight;
    const visibleHeight = panelContent.clientHeight;
    const scrollTop = panelContent.scrollTop;

    const ratio = scrollTop / (contentHeight - visibleHeight);
    const trackHeight = panelContent.clientHeight;
    const thumbMax = trackHeight - scrollThumb.offsetHeight;

    scrollThumb.style.top = `${ratio * thumbMax}px`;
}

// 监听内容滚动 → 更新圆点位置
panelContent.addEventListener('scroll', updateThumbPosition);

// 拖动功能
let isDragging = false;
let startY, startTop;

scrollThumb.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    startTop = parseFloat(scrollThumb.style.top) || 0;
    document.body.style.userSelect = 'none'; // 防止选中文字
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaY = e.clientY - startY;
    const trackHeight = panelContent.clientHeight;
    const thumbMax = trackHeight - scrollThumb.offsetHeight;

    let newTop = Math.min(Math.max(startTop + deltaY, 0), thumbMax);
    scrollThumb.style.top = `${newTop}px`;

    // 根据 thumb 位置计算内容滚动
    const ratio = newTop / thumbMax;
    panelContent.scrollTop = ratio * (panelContent.scrollHeight - panelContent.clientHeight);
    updateThumbPosition();
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = ''; // 恢复文字选择
});

// 初始更新一次位置
updateThumbPosition();



// 点击外部关闭浮窗
function initClickOutsideHandler() {
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('floating-panel');
        if (isPanelVisible && !panel.contains(e.target)) {
            hideFloatingPanel();
        }
    });
}


// click detail - scroll to according section
const termDiv = document.getElementById("term");
const commentDiv = document.getElementById("comment");
const proposerDiv = document.getElementById("proposer");
const imageDiv = document.getElementById("image");

// 点击「简要释义」
termDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    updateTabContent("brief"); // 滚动到简要释义
});

// 点击「评论」
commentDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    updateTabContent("comment"); // 滚动到评论
});

// 点击「相关著作 / 提出者」
proposerDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    updateTabContent("book"); // 滚动到相关著作
});

// 点击「图片」
imageDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    updateTabContent("image"); // 滚动到图片
});


// 初始化浮窗功能
initClickOutsideHandler();