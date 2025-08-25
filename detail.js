import {
    state
} from "./state.js";

import {
    zoomToWord, updateWordDetails, updateWordFocus
} from "./main.js";

// 浮窗相关变量
let currentFloatingPanel = null;
let isPanelVisible = false;

function filterProposer() {
    const focusedWord = window.allWords.find(w => w.id == state.focusedNodeId);
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
            zoomToWord(targetNodeId, state.currentScale); // 用你现成的 zoomToWord(node) 逻辑
            updateWordFocus();

            renderPanelSections();
            updateTabContent("book");
            
        });

        relatedContainer.appendChild(link);
    });
}


// 浮窗功能函数
export function showFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.remove('hidden');
    isPanelVisible = true;
    currentFloatingPanel = panel;

    renderPanelSections();

    // 重置 tab 按钮状态
    const tabs = document.querySelectorAll('.panel-tabs button');
    tabs.forEach(btn => btn.classList.remove('active'));
    const entryTab = document.querySelector('.panel-tabs button[data-tab="entry"]');
    if (entryTab) entryTab.classList.add('active');
}

export function hideFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.add('hidden');
    isPanelVisible = false;
    currentFloatingPanel = null;
}

export function renderPanelSections() {
    let currentWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!currentWord) return;

    // 上半部分
    const title = document.querySelector('.panel-top');
    title.innerHTML = `
    <p> ${String(currentWord.id).padStart(4, '0')} </p>
    <div>
    <h1 class = "Chinese"> ${currentWord.term || '未知单词'} </h1>
    <h1 class = "English"> ${currentWord.termOri || '无'} </h1></div>
    `

    // 下半部分
    const contentScroll = document.querySelector('.panel-content');
    contentScroll.innerHTML = `        
        <section id="section-brief">
            <p style='color: #392F17;font-family: ChillDINGothic;font-size: 20px;font-weight: 400;'>简要释义</p>
            <h2>${currentWord.brief_definition || '暂无简要释义'}</h2>
        </section>

        <section id="section-detail">
            <p>详细释义</p>
            <p>${currentWord.extended_definition || '暂无详细释义'}</p>
            <p style='color:#888;font-size:13px;margin-top:10px;'>参考资料：${currentWord.references || '暂无'}</p>
        </section>

        <section id="section-book">
            <p>相关著作</p>
            <p>${currentWord.proposer ? '提出者：' + currentWord.proposer : '暂无相关著作信息'}</p>
            <p>提出国：${currentWord.proposing_country || '未知'}</p>
            <p>提出时间：${currentWord.proposing_time || '未知'}</p>
            <div id="related-words"></div>
        </section>

        <section id="section-image">
            <p>图片</p>
            <img src='${currentWord.diagrams[0]}' alt='${currentWord.term}'
                style='max-width:100%;border-radius:8px;box-shadow:0 2px 8px #0002;margin-bottom:10px;'>
            <p>${currentWord.term}</p>
        </section>
    `;
    filterProposer();
    renderScrollMarkers();
}

function renderCommentSection() {
    let currentWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!currentWord) return;

    const contentScroll = document.querySelector('.panel-content');
    contentScroll.innerHTML = `
        <section id="section-comment">
            <p>评论</p>
            <div class="comment-list">
                ${currentWord.comments?.map(c => `<p><b>${c.author}：</b>${c.content}</p>`).join('') || '暂无评论'}
            </div>
        </section>
    `;
}

// tab 切换逻辑
function initTabs() {
    const tabs = document.querySelectorAll('.panel-tabs button');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.dataset.tab === 'entry') {
                renderPanelSections();
            } else if (btn.dataset.tab === 'comment') {
                renderCommentSection();
            }
        });
    });
}

// 初始化时调用
initTabs();

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


function renderScrollMarkers() {
    // 清空旧的 marker
    scrollTrack.querySelectorAll(".scroll-marker").forEach(el => el.remove());

    const sections = [
        { id: "section-brief", label: "简要释义" },
        { id: "section-detail", label: "详细释义" },
        { id: "section-book", label: "提出人" },
        { id: "section-image", label: "图片" }
    ];

    const visibleHeight = panelContent.clientHeight;     // 可视高度
    const contentHeight = panelContent.scrollHeight;     // 内容总高度
    const trackHeight = panelContent.clientHeight;       // 滚动条轨道高度
    const thumbHeight = scrollThumb.offsetHeight;        // thumb 高度
    const thumbMax = trackHeight - thumbHeight*2;          // thumb 最大移动范围

    sections.forEach(sec => {
        const el = document.getElementById(sec.id);
        if (!el) return;

        // section 相对 panelContent 顶部的距离
        const relativeTop = el.offsetTop - panelContent.offsetTop;

        // 映射到轨道位置
        let markerTop = (relativeTop / (contentHeight - visibleHeight)) * thumbMax;
        if (markerTop > thumbMax) markerTop = thumbMax;
        
        // 生成 marker
        const marker = document.createElement("div");
        marker.className = "scroll-marker";
        marker.style.top = `${markerTop}px`;

        const tooltip = document.createElement("div");
        tooltip.className = "scroll-tooltip";
        tooltip.textContent = sec.label;
        marker.appendChild(tooltip);

        // 点击 → 滚动到该 section
        marker.addEventListener("click", () => {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        scrollTrack.appendChild(marker);
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


// click detail - scroll to according section
const termDiv = document.getElementById("term");
const commentDiv = document.getElementById("comment");
const proposerDiv = document.getElementById("proposer");
const imageDiv = document.getElementById("image");

// 点击「简要释义」
// termDiv.addEventListener("click", (e) => {
//     e.stopPropagation();
//     showFloatingPanel();
//     updateTabContent("brief"); // 滚动到简要释义
// });

// 点击「评论」
commentDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    renderCommentSection();
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