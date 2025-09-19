import {
    state
} from "./state.js";

import {
    zoomToWord,
    updateWordDetails,
    updateWordFocus,
    applyPositionVariations
} from "./wordFocus.js";

import {
    updateRelations
} from "./relationManager.js"

// 浮窗相关变量
let isPanelVisible = false;
let isExpanded = false;

function filterProposer(name) {
    const focusedWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!focusedWord) return [];

    // 先渲染 proposer 相关的词
    const relatedContainer = document.createElement("div");
    relatedContainer.classList = `related-words`;
    relatedContainer.innerHTML = '';

    // 检索所有 proposers 里有该名字的词
    const relatedWords = window.allWords.filter(w => {
        if (w.id === focusedWord.id) return false;
        return Array.isArray(w.proposers) && w.proposers.some(p => p.name === name);
    });

    relatedWords.forEach(w => {
        const link = document.createElement('div');
        link.id = `related-${w.id}`;
        link.textContent = w.term;
        link.style.display = 'block';

        // 点击跳转到这个单词
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetNodeId = link.id.replace('related-', '');
            zoomToWord(targetNodeId, state.currentScale);
            updateWordFocus();

            renderPanelSections();
            updateTabContent("book");
        });

        relatedContainer.appendChild(link);
    });
    return relatedContainer;
}

// function togglePanelWidth() {
//     const panel = document.getElementById('floating-panel');
//     const expandBtn = document.getElementById('expand-btn');

//     if (!panel || !expandBtn) return;

//     isExpanded = !isExpanded;

//     if (isExpanded) {
//         panel.classList.add('expanded');
//         expandBtn.innerHTML = `
//             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
//                 <polyline points="4,14 10,14 10,20"></polyline>
//                 <polyline points="20,10 14,10 14,4"></polyline>
//                 <line x1="14" y1="10" x2="21" y2="3"></line>
//                 <line x1="3" y1="21" x2="10" y2="14"></line>
//             </svg>
//         `;
//         const overlay = document.getElementById("overlay");
//         overlay.classList.remove("hidden");
//     } else {
//         panel.classList.remove('expanded');
//         expandBtn.innerHTML = `
//             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
//                 <polyline points="15,3 21,3 21,9"></polyline>
//                 <polyline points="9,21 3,21 3,15"></polyline>
//                 <line x1="21" y1="3" x2="14" y2="10"></line>
//                 <line x1="3" y1="21" x2="10" y2="14"></line>
//             </svg>
//         `;
//         const overlay = document.getElementById("overlay");
//         overlay.classList.add("hidden");
//     }
// }

// 浮窗功能函数
export function showFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.remove('hidden');
    isPanelVisible = true;

    ensureExpandButton();
    renderPanelSections();

    // 重置 tab 按钮状态
    const tabs = document.querySelectorAll('.panel-tabs button');
    tabs.forEach(btn => btn.classList.remove('active'));
    const entryTab = document.querySelector('.panel-tabs button[data-tab="entry"]');
    if (entryTab) entryTab.classList.add('active');

    const view = document.getElementById("universe-view");
    view.style.left = "-20vw";

    const relationLines = document.getElementById("connection-lines");

    relationLines.style.left = "20vw";
    updateRelations();
    setTimeout(updateRelations, 75);
    setTimeout(updateRelations, 150);
    setTimeout(updateRelations, 225);
    setTimeout(updateRelations, 300);
    setTimeout(updateRelations, 600);
}

function ensureExpandButton() {
    let expandBtn = document.getElementById('expand-btn');

    if (!expandBtn) {
        // 创建按钮
        expandBtn = document.createElement('button');
        expandBtn.id = 'expand-btn';
        
        // 添加样式
        expandBtn.style.cssText = `
            position: absolute;
            left: -4vw;
            top: 20px;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            width: 40px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        // 创建箭头和竖线的HTML结构
        expandBtn.innerHTML = `
            <div class="expand-btn-content" style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                position: relative;
            ">
                <!-- 竖线 -->
                <div class="edge-line" style="
                    width: 2px;
                    height: 20px;
                    background-color: #FFFCF4;
                    border-radius: 1px;
                    margin-right: 1px;
                "></div>

                <!-- 箭头 -->
                <div class="arrow-container" style="
                    transition: transform 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFCF4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <!-- 箭头竖线部分 -->
                        <polyline points="11,18 5,12 11,6"></polyline>
                        <!-- 箭头横线，x2拉长 -->
                        <line x1="5" y1="12" x2="20" y2="12"></line>
                    </svg>
                </div>
            </div>
        `;


        // 添加点击事件
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePanelWidth();
        });

        // 将按钮添加到 panel 中
        const panel = document.getElementById('floating-panel');
        panel.appendChild(expandBtn);
        
        // 添加动画样式到页面
        if (!document.getElementById('expand-btn-styles')) {
            const style = document.createElement('style');
            style.id = 'expand-btn-styles';
            style.textContent = `
                #expand-btn .arrow-container {
                    animation: poke 5s ease-in-out infinite;
                }
                
                #expand-btn.expanded .arrow-container {
                    transform: rotate(180deg);
                    animation: none;
                }
                
                @keyframes poke {
                    0%, 20%, 100% { 
                        transform: translateX(0); 
                    }
                    10% { 
                        transform: translateX(-4px); 
                    }
                    15% {
                        transform: translateX(0);
                    }
                    30% { 
                        transform: translateX(-4px); 
                    }
                    35% {
                        transform: translateX(0);
                    }
                }
                
                #expand-btn:hover .arrow-container {
                    transform: translateX(-2px);
                }
                
                #expand-btn.expanded:hover .arrow-container {
                    transform: rotate(180deg) translateX(-2px);
                }
            `;
            document.head.appendChild(style);
        }

    }
}

function togglePanelWidth() {
    const panel = document.getElementById('floating-panel');
    const expandBtn = document.getElementById('expand-btn');

    if (!panel || !expandBtn) return;

    isExpanded = !isExpanded;

    if (isExpanded) {
        panel.classList.add('expanded');
        expandBtn.classList.add('expanded');
        const overlay = document.getElementById("overlay");
        overlay.classList.remove("hidden");
    } else {
        panel.classList.remove('expanded');
        expandBtn.classList.remove('expanded');
        const overlay = document.getElementById("overlay");
        overlay.classList.add("hidden");
    }
}


export function hideFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.add('hidden');
    panel.classList.remove('expanded');
    isPanelVisible = false;
    isExpanded = false;

    // 重置按钮图标
    let expandBtn = document.getElementById('expand-btn');
    if(expandBtn){
        expandBtn.remove();
    }

    // 重置tabs显示
    const tabs = document.querySelector('.panel-tabs');
    if (tabs) tabs.style.display = 'flex';

    // 重置scroll markers显示
    const scrollTrack = document.querySelector('.scroll-track');
    const scrollMarkers = scrollTrack.querySelectorAll('.scroll-marker');
    scrollMarkers.forEach(marker => marker.style.display = 'block');

    const view = document.getElementById("universe-view");
    view.style.left = "0";

    const relationLines = document.getElementById("connection-lines");

    relationLines.style.left = "0";

    updateRelations();
    setTimeout(updateRelations, 75);
    setTimeout(updateRelations, 150);
    setTimeout(updateRelations, 225);
    setTimeout(updateRelations, 300);
    setTimeout(updateRelations, 600);  
    setTimeout(updateWordFocus, 300);
    
}

export function renderPanelSections() {
    let currentWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!currentWord) return;

    scrollToTop();

    const panel = document.getElementById('floating-panel');
    panel.style.backgroundColor = "#FFFCF4";

    // 上半部分
    const title = document.querySelector('.panel-top');
    title.innerHTML = `
    <p> ${String(currentWord.id).padStart(4, '0')} </p>
    <img src = "${currentWord.concept_image}" alt = "diagrams[0]"></img> 
    <div>
    <div class = "term-main"> ${currentWord.term || '未知单词'} </div>
    <div class = "term-ori"> ${currentWord.termOri || '无'} </div></div>
    `

    // 下半部分
    const bottomDiv = document.querySelector('.panel-bottom');
    bottomDiv.innerHTML = `
        <section id="section-brief"> </section>
        <section id="section-example"> </section>
        <section id="section-proposers"> </section>
        <section id="section-source"> </section>
        <section id="section-related-works"> </section>
        <section id="section-contributors"> </section>
        <section id="section-editors"> </section>
    `;

    const briefSec = document.getElementById("section-brief");
    const exampleSec = document.getElementById("section-example");
    const proposerSec = document.getElementById("section-proposers");
    const sourceSec = document.getElementById("section-source");
    const relatedSec = document.getElementById("section-related-works");
    const contributorsSec = document.getElementById("section-contributors");
    const editorsSec = document.getElementById("section-editors");

    briefSec.innerHTML = `<p class="left-title">简要释义</p>
                       <div>
                           <h2>${currentWord.brief_definition || '暂无简要释义'}</h2>
                           ${
                            Array.isArray(currentWord.extended_definition)
                                ? currentWord.extended_definition.map(paragraph => `<h3>${paragraph}</h3>`).join('')
                                : currentWord.extended_definition 
                                ? `<h3>${currentWord.extended_definition}</h3>`
                                : '<h3>暂无扩展释义</h3>'
                            }
                      </div>`;

    exampleSec.innerHTML = `<p class="left-title">例句</p>
                        <div>
                            <h3>${currentWord.example_sentence || '暂无例句'}</h3>
                            <div id="diagram-container"></div>
                        </div>`;
    const diagramContainer = document.getElementById("diagram-container");
    if (currentWord.diagrams && currentWord.diagrams.length > 0) {
        currentWord.diagrams.forEach(diagram => {
            const block = document.createElement("div");
            block.innerHTML = `
      <img src="${diagram.src}" alt="diagram image">
      <p class="diagram-caption">${diagram.caption}</p>
    `;
            diagramContainer.appendChild(block);
        });
    }

    proposerSec.innerHTML = `<p class="left-title">提出者</p>
                        <div id="proposers-container"> </div>`;
    const proposersContainer = document.getElementById("proposers-container");
    let proposers = currentWord.proposers;
    proposers.forEach((proposer) => {
        const proposerBlock = document.createElement("div");
        proposerBlock.classList = "proposer-block";
        proposerBlock.innerHTML = `
        <img alt="proposer's img" src=${proposer.image}></img>
        <div>
            <p class="proposer-name">${proposer.name}</p>
            <p class="proposer-year">${proposer.year}</p>
            <p class="proposer-year">${proposer.role}</p>
        </div>
    `;

        const relatedContainer = filterProposer(proposer.name);
        // proposerBlock.appendChild(relatedContainer);
        proposersContainer.appendChild(proposerBlock);
    })

    sourceSec.innerHTML = `<p class="left-title">出处</p>
                        <div>
                            <p>${currentWord.source || '暂无出处'}</p>
                        </div>`;

    relatedSec.innerHTML = `<p class="left-title">相关著作</p>
                        <div id="related-works-container">
                        ${currentWord.related_works.map(work => `<p>${work}</p>`).join('')}
                        </div>`;

    contributorsSec.innerHTML = `<p>${currentWord.contributor}</p>`;

    editorsSec.innerHTML = `<p class="left-title">编辑</p>
                        <div id="editors-container">
                        ${currentWord.editors.map(editor => `<p>${editor}</p>`).join('')}
                        </div>`
    renderScrollMarkers();
}

function renderCommentSection() {
    let currentWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!currentWord) return;

    scrollToTop();

    const panel = document.getElementById('floating-panel');
    panel.style.backgroundColor = "#EEE9DB";


    // 上半部分
    const title = document.querySelector('.panel-top');
    title.innerHTML = `
    <p> ${String(currentWord.id).padStart(4, '0')} </p>
    <div>
    <div class = "term-main"> ${currentWord.term || '未知单词'} </div>
    <div class = "term-ori"> ${currentWord.termOri || '无'} </div></div>
    `

    // 下半部分
    const contentScroll = document.querySelector('.panel-bottom');
    contentScroll.innerHTML = `
        ${currentWord.comments?.map(c => 
            `<section>
                <p class="left-title">${c.author}</p>
                <h3>${c.content}</h3>
            </section>`
        ).join('') || '暂无评论'}

        <section id="section-contributors"> </section>
        <section id="section-editors"> </section>        
    `;

    const contributorsSec = document.getElementById("section-contributors");
    const editorsSec = document.getElementById("section-editors");

    contributorsSec.innerHTML = `<p>${currentWord.contributor}</p>`;

    editorsSec.innerHTML = `<p class="left-title">编辑</p>
                        <div id="editors-container">
                        ${currentWord.editors.map(editor => `<p>${editor}</p>`).join('')}
                        </div>`

    renderCommentMarkers(); // ✅ 渲染评论的 markers
}


// tab 切换逻辑
function initTabs() {
    const tabs = document.querySelectorAll('.panel-tabs button');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            // tabs.forEach(b => b.classList.remove('active'));
            // btn.classList.add('active');

            if (btn.dataset.tab === 'entry') {
                renderPanelSections();
                scrollToTop();
            } else if (btn.dataset.tab === 'comment') {
                renderCommentSection();
            }
        });
    });
}

// 初始化时调用
initTabs();

// 滚动到最顶端（panel-top位置）
export function scrollToTop() {
    const panel = document.getElementById('floating-panel');
    const panelMain = panel.querySelector('.panel-main');

    if (!panelMain) return;

    panelMain.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// 滚动到对应 section
function updateTabContent(tabType = "brief") {
    const panel = document.getElementById('floating-panel');
    const panelMain = panel.querySelector('.panel-main');

    if (!panelMain) return;

    // tabType -> section 的映射
    const sectionMap = {
        contributors: "section-contributors",
        related: "section-related-works",
        source: "section-source",
        proposers: "section-proposers",
        example: "section-example",
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

// 滑轨配置参数
const SCROLL_CONFIG = {
    thumbMargin: 0, // thumb上下边距，可调整参数
    thumbSize: 14 // thumb大小
};

// 修改滚动相关的DOM选择器和逻辑
const panelMain = document.querySelector('.panel-main'); // 改为选择 panel-main
const scrollThumb = document.querySelector('.scroll-thumb');
const scrollTrack = document.querySelector('.scroll-track');


panelMain.addEventListener("scroll", () => {
    const scrollTop = panelMain.scrollTop;
    const contentHeight = panelMain.scrollHeight;
    const visibleHeight = panelMain.clientHeight;


    const trackHeight = panelMain.clientHeight;
    const thumbHeight = scrollThumb.offsetHeight;

    const thumbActiveRange = trackHeight - (SCROLL_CONFIG.thumbMargin * 2) - thumbHeight;

    const scrollRatio = scrollTop / (contentHeight - visibleHeight);

    const thumbTop = SCROLL_CONFIG.thumbMargin + scrollRatio * thumbActiveRange;
    scrollThumb.style.display = 'block';
    scrollThumb.style.top = `${thumbTop}px`;
});


// 拖动功能
let isDragging = false;
let startY, startTop;

scrollThumb.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    startTop = parseFloat(scrollThumb.style.top) || SCROLL_CONFIG.thumbMargin;
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging || !panelMain) return;

    const deltaY = e.clientY - startY;
    const trackHeight = panelMain.clientHeight;
    const thumbActiveRange = trackHeight - (SCROLL_CONFIG.thumbMargin * 2);

    // 计算新的thumb位置（限制在活动范围内）
    let newTop = Math.min(
        Math.max(startTop + deltaY, SCROLL_CONFIG.thumbMargin),
        SCROLL_CONFIG.thumbMargin + thumbActiveRange
    );

    scrollThumb.style.top = `${newTop}px`;

    // 根据thumb位置计算内容滚动比例
    const thumbRatio = (newTop - SCROLL_CONFIG.thumbMargin) / thumbActiveRange;
    panelMain.scrollTop = thumbRatio * (panelMain.scrollHeight - panelMain.clientHeight);
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
});


function renderScrollMarkers() {
    if (!panelMain) return;

    // 清空旧的 marker
    scrollTrack.querySelectorAll(".scroll-marker").forEach(el => el.remove());

    const sections = [{
            id: "panel-top",
            label: "顶部",
            isTop: true
        },
        {
            id: "section-brief",
            label: "释义"
        },
        {
            id: "section-example",
            label: "例句"
        },
        {
            id: "section-proposers",
            label: "提出人"
        },
        {
            id: "section-source",
            label: "来源"
        },
        {
            id: "section-related-works",
            label: "相关著作"
        },
        {
            id: "section-contributors",
            label: "contributors"
        },
        {
            id: "section-editors",
            label: "编辑"
        }
    ];

    const contentHeight = panelMain.scrollHeight;
    const visibleHeight = panelMain.clientHeight;
    const contentScrollableRange = contentHeight - visibleHeight;

    const trackHeight = scrollTrack.clientHeight;
    const thumbActiveRange = trackHeight - (SCROLL_CONFIG.thumbMargin * 2) - SCROLL_CONFIG.thumbSize;

    // 如果内容不需要滚动，不显示markers
    if (contentHeight <= visibleHeight) return;

    sections.forEach(sec => {
        let markerTop;
        let scrollTarget;

        if (sec.isTop) {
            // 顶部 marker 固定在 thumb 活动范围的最上方
            markerTop = SCROLL_CONFIG.thumbMargin;
            scrollTarget = 0;
        } else {
            const el = document.getElementById(sec.id);
            if (!el) return;

            // 相对 panelMain 内容顶部的位置
            const sectionTop = el.offsetTop;

            // 计算滚动比例（section 到达 panel 顶部时的比例）
            const scrollRatio = Math.min(sectionTop / contentScrollableRange, 1);

            // 映射到 thumb 活动范围
            markerTop = SCROLL_CONFIG.thumbMargin + (scrollRatio * thumbActiveRange);
            scrollTarget = sectionTop;
        }

        // 生成 marker
        const marker = document.createElement("div");
        marker.className = "scroll-marker";
        marker.style.top = `${markerTop}px`;

        const tooltip = document.createElement("div");
        tooltip.className = "scroll-tooltip";
        tooltip.textContent = sec.label;
        marker.appendChild(tooltip);

        marker.addEventListener("click", () => {
            panelMain.scrollTo({
                top: scrollTarget,
                behavior: "smooth"
            });
        });

        scrollTrack.appendChild(marker);
    });
}

function renderCommentMarkers() {
    if (!panelMain) return;

    // 清空旧的 marker
    scrollTrack.querySelectorAll(".scroll-marker").forEach(el => el.remove());

    let currentWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!currentWord || !currentWord.comments) return;

    const comments = currentWord.comments;

    const contentHeight = panelMain.scrollHeight;
    const visibleHeight = panelMain.clientHeight;
    const contentScrollableRange = contentHeight - visibleHeight;

    const trackHeight = scrollTrack.clientHeight;
    const thumbActiveRange = trackHeight - (SCROLL_CONFIG.thumbMargin * 2) - SCROLL_CONFIG.thumbSize;

    // 如果评论数量过少，不需要滚动
    if (contentHeight <= visibleHeight) return;

    comments.forEach((c, idx) => {
        const sectionEl = panelMain.querySelectorAll("section")[idx];
        if (!sectionEl) return;

        // 相对 panelMain 内容顶部的位置
        const sectionTop = sectionEl.offsetTop;
        const scrollRatio = Math.min(sectionTop / contentScrollableRange, 1);

        const markerTop = SCROLL_CONFIG.thumbMargin + (scrollRatio * thumbActiveRange);

        const marker = document.createElement("div");
        marker.className = "scroll-marker";
        marker.style.top = `${markerTop}px`;

        const tooltip = document.createElement("div");
        tooltip.className = "scroll-tooltip";
        tooltip.textContent = c.author || `评论${idx+1}`;
        marker.appendChild(tooltip);

        marker.addEventListener("click", () => {
            panelMain.scrollTo({
                top: sectionTop,
                behavior: "smooth"
            });
        });

        scrollTrack.appendChild(marker);
    });
}


// 点击外部关闭浮窗
function initClickOutsideHandler() {
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('floating-panel');
        const about = document.getElementById("about-button");
        if (isPanelVisible && !panel.contains(e.target) && !about.contains(e.target)) {
            hideFloatingPanel();
        }
    });
}

// click detail - scroll to according section
// const termDiv = document.getElementById("term");
const commentDiv = document.getElementById("comment");
const proposerDiv = document.getElementById("proposer");
const imageDiv = document.getElementById("image");



// 点击「词条/标题」- 滚动到最顶端
// termDiv.addEventListener("click", (e) => {
//     e.stopPropagation();
//     showFloatingPanel();
//     scrollToTop(); // 使用新的滚动到顶端函数
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
    updateTabContent("proposers");
});

// 点击「图片」
imageDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    scrollToTop();
});

// 初始化浮窗功能
initClickOutsideHandler();


// 新增：显示About页面的浮窗
export function showAboutPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.remove('hidden');
    isPanelVisible = true;

    ensureExpandButton();
    renderAboutContent();

    // 隐藏tabs
    const tabs = document.querySelector('.panel-tabs');
    if (tabs) tabs.style.display = 'none';

    // 隐藏scroll markers
    const scrollTrack = document.querySelector('.scroll-track');
    const scrollMarkers = scrollTrack.querySelectorAll('.scroll-marker');
    scrollMarkers.forEach(marker => marker.style.display = 'none');
}

// 渲染About页面内容
function renderAboutContent() {
    // 上半部分
    const title = document.querySelector('.panel-top');
    title.innerHTML = `
        <div>
    <div class = "term-main"> 关于我们 </div>
    <div class = "term-ori"> About Us </div></div>
    `;

    // 下半部分 - 留空给你填写内容
    const bottomDiv = document.querySelector('.panel-bottom');
    bottomDiv.innerHTML = `
        <section>
            <div>
                <p>《沙丘词典》是一部持续生长的思想索引，收录了跨学科领域的关键概念与术语。<br>
                我们将这些遴选出的概念与术语，视为剖开广袤学术疆域的一道道切口——由此开启一片由思想构成的星丛，并激发更深远的追问。我们旨在通过清晰晓畅的阐释，消融学术的藩篱，展现不同学科之间丰厚的内在联结。<br>
                项目始于2019年，最初是沙丘研究所（一个由具建筑学背景的艺术家与研究者组成的团体）在社交媒体上发布的系列推送。此后，通过与跨学科青年学者合办的共创工作坊，项目得以不断生长。2025年，项目正式落地为一座精心构筑的网站，现已成为一个持续扩充的概念、定义及相关评注的资料库。<br>
                若您有兴趣参与我们的共创工作坊，请阅读“参与指南”。我们也欢迎您针对现有词条撰写评注，或举荐新的词条。<br>
                置身于互联网这片流动的、万物关联的图景中，我们希望赋予词典恰如其分的结构，让思想得以漫游；亦保留足够开放的空间，让灵感得以涌现。
                </p>
            </div>
        </section>
        <section>
            <p class="left-title">Contact</p>
                <div>
                    <p>hello@dunesworkshop.org</p>
                </div>
        </section>
    `;
}