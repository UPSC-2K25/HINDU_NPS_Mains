let rawDailyArticles = [];
let availableDates = [];
let selectedGsPaper = 'all';

const searchInput = document.getElementById('search-input');
const dateInput = document.getElementById('date-input');
const gsTabsContainer = document.getElementById('gs-tabs-container');

const articlesContainer = document.getElementById('articles-container');
const mainsContainer = document.getElementById('mains-container');
const tabBtns = document.querySelectorAll('.tab-btn');

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initApp();
});

function setupEventListeners() {
    searchInput.addEventListener('input', renderViews);
    
    dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
            loadDateData(e.target.value);
        }
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const view = btn.getAttribute('data-view');
            if (view === 'articles') {
                articlesContainer.classList.remove('hidden');
                mainsContainer.classList.add('hidden');
            } else {
                articlesContainer.classList.add('hidden');
                mainsContainer.classList.remove('hidden');
            }
        });
    });
}

async function initApp() {
    try {
        const response = await fetch('./data/index.json');
        if (!response.ok) throw new Error('Could not fetch data/index.json');
        
        availableDates = await response.json();
        
        if (availableDates.length === 0) {
            articlesContainer.innerHTML = `<div class="card loading-text">No dates found in manifest.</div>`;
            return;
        }

        // Properly sets a full YYYY-MM-DD date string
        dateInput.value = availableDates[0];
        loadDateData(availableDates[0]);

    } catch (err) {
        articlesContainer.innerHTML = `<div class="card loading-text">Failed to load manifest. Ensure <code>data/index.json</code> exists.</div>`;
    }
}

async function loadDateData(dateStr) {
    articlesContainer.innerHTML = `<div class="card loading-text">Loading articles for ${dateStr}...</div>`;
    try {
        const response = await fetch(`./data/${dateStr}.json`);
        if (!response.ok) throw new Error(`data/${dateStr}.json not found`);
        
        const payload = await response.json();
        rawDailyArticles = payload.articles ? payload.articles : (Array.isArray(payload) ? payload : []);
        
        buildGsTabs(rawDailyArticles);
        renderViews();
    } catch (err) {
        rawDailyArticles = [];
        articlesContainer.innerHTML = `<div class="card loading-text">No file found for date <code>data/${dateStr}.json</code>.</div>`;
        mainsContainer.innerHTML = articlesContainer.innerHTML;
    }
}

function buildGsTabs(articles) {
    const gsSet = new Set();
    articles.forEach(art => {
        if (art.gs_paper) gsSet.add(art.gs_paper);
    });

    const sortedGs = Array.from(gsSet).sort();
    selectedGsPaper = 'all';

    gsTabsContainer.innerHTML = `
        <button class="gs-tab active" data-gs="all">All (${articles.length})</button>
        ${sortedGs.map(gs => {
            const count = articles.filter(a => a.gs_paper === gs).length;
            return `<button class="gs-tab" data-gs="${gs}">${gs} (${count})</button>`;
        }).join('')}
    `;

    document.querySelectorAll('.gs-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.gs-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedGsPaper = tab.getAttribute('data-gs');
            renderViews();
        });
    });
}

function filterData() {
    const query = searchInput.value.toLowerCase();
    return rawDailyArticles.filter(article => {
        const matchesQuery = article.topic.toLowerCase().includes(query) || 
                             article.summary.toLowerCase().includes(query);
        const matchesGs = selectedGsPaper === 'all' || article.gs_paper === selectedGsPaper;
        return matchesQuery && matchesGs;
    });
}

function renderViews() {
    const articles = filterData();
    renderArticles(articles);
    renderMains(articles);
}

function renderArticles(articles) {
    if (articles.length === 0) {
        articlesContainer.innerHTML = `<div class="card loading-text">No articles found matching criteria.</div>`;
        return;
    }

    articlesContainer.innerHTML = `
        <div class="day-group">
            <div class="day-header">
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(dateInput.value)}</span>
                <span class="badge">${articles.length} Articles</span>
            </div>
            <div class="day-feed">
                ${articles.map(art => `
                    <div class="article-card">
                        <div class="article-header">
                            <span class="badge">${art.gs_paper}</span>
                        </div>
                        <h4 class="article-title">${art.topic}</h4>
                        <p class="article-summary">${art.summary}</p>
                        ${art.mainsquestion ? `
                            <div class="mains-box">
                                <strong>Mains Question:</strong> ${art.mainsquestion}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderMains(articles) {
    const mainsList = articles.filter(art => art.mainsquestion);

    if (mainsList.length === 0) {
        mainsContainer.innerHTML = `<div class="card loading-text">No Mains practice questions found for current selection.</div>`;
        return;
    }

    mainsContainer.innerHTML = `
        <div class="day-group">
            <div class="day-header">
                <span><i class="fa-solid fa-pen-nib"></i> Mains Practice Questions</span>
                <span class="badge">${mainsList.length} Questions</span>
            </div>
            <div class="day-feed">
                ${mainsList.map((item, idx) => `
                    <div class="article-card">
                        <div class="article-header">
                            <span class="badge">${item.gs_paper}</span>
                        </div>
                        <h4 class="article-title">Q${idx + 1}. ${item.mainsquestion}</h4>
                        <p class="article-summary"><strong>Context:</strong> ${item.topic}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}
