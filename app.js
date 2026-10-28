let rawMonthData = [];
let availableMonths = [];
let selectedGsPaper = 'all';

const searchInput = document.getElementById('search-input');
const monthSelect = document.getElementById('month-select');
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
    dateInput.addEventListener('change', renderViews);
    
    monthSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadMonthData(e.target.value);
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

// 1. Load manifest containing month keys (e.g., ["2026-10"])
async function initApp() {
    try {
        const response = await fetch('./data/index.json');
        if (!response.ok) throw new Error('Could not fetch data/index.json');
        
        availableMonths = await response.json();
        
        if (availableMonths.length === 0) {
            monthSelect.innerHTML = `<option value="">No months found</option>`;
            return;
        }

        monthSelect.innerHTML = availableMonths.map(m => `
            <option value="${m}">${formatMonthLabel(m)}</option>
        `).join('');

        loadMonthData(availableMonths[0]);
    } catch (err) {
        monthSelect.innerHTML = `<option value="">Error loading index.json</option>`;
        articlesContainer.innerHTML = `<div class="card loading-text">Failed to initialize manifest.</div>`;
    }
}

// 2. Load monthly file (e.g., data/2026-10.json)
async function loadMonthData(monthKey) {
    articlesContainer.innerHTML = `<div class="card loading-text">Loading data for ${monthKey}...</div>`;
    try {
        const response = await fetch(`./data/${monthKey}.json`);
        if (!response.ok) throw new Error(`data/${monthKey}.json not found`);
        
        rawMonthData = await response.json(); // Array of days
        
        buildGsTabs(rawMonthData);
        renderViews();
    } catch (err) {
        rawMonthData = [];
        articlesContainer.innerHTML = `<div class="card loading-text">No file found for <code>data/${monthKey}.json</code>.</div>`;
        mainsContainer.innerHTML = articlesContainer.innerHTML;
    }
}

// 3. Build GS filter pills dynamically from the loaded month's articles
function buildMonthGsTabs(monthData) {
    const gsSet = new Set();
    let totalCount = 0;

    monthData.forEach(day => {
        if (day.articles) {
            day.articles.forEach(art => {
                if (art.gs_paper) gsSet.add(art.gs_paper);
                totalCount++;
            });
        }
    });

    const sortedGs = Array.from(gsSet).sort();
    selectedGsPaper = 'all';

    gsTabsContainer.innerHTML = `
        <button class="gs-tab active" data-gs="all">All (${totalCount})</button>
        ${sortedGs.map(gs => {
            let count = 0;
            monthData.forEach(day => {
                if (day.articles) {
                    count += day.articles.filter(a => a.gs_paper === gs).length;
                }
            });
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

function buildGsTabs(monthData) {
    buildMonthGsTabs(monthData);
}

// 4. Filter data by search query, selected specific date, and GS paper
function filterData() {
    const query = searchInput.value.toLowerCase();
    const selectedDate = dateInput.value;

    const filteredDays = monthDataMapper(rawMonthData, selectedDate, query, selectedGsPaper);
    return filteredDays;
}

function monthDataMapper(data, targetDate, query, gsFilter) {
    return data.map(dayGroup => {
        // Filter by specific date if date picker has a value
        if (targetDate && dayGroup.date !== targetDate) {
            return null;
        }

        if (!dayGroup.articles) return null;

        const matchedArticles = dayGroup.articles.filter(article => {
            const matchesQuery = article.topic.toLowerCase().includes(query) || 
                                 article.summary.toLowerCase().includes(query);
            const matchesGs = gsFilter === 'all' || article.gs_paper === gsFilter;

            return matchesQuery && matchesGs;
        });

        if (matchedArticles.length === 0) return null;

        return {
            date: dayGroup.date,
            articles: matchedArticles
        };
    }).filter(Boolean);
}

function renderViews() {
    const query = searchInput.value.toLowerCase();
    const selectedDate = dateInput.value;
    const filteredData = monthDataMapper(rawMonthData, selectedDate, query, selectedGsPaper);

    renderArticles(filteredData);
    renderMains(filteredData);
}

function renderArticles(data) {
    if (data.length === 0) {
        articlesContainer.innerHTML = `<div class="card loading-text">No articles found matching criteria.</div>`;
        return;
    }

    articlesContainer.innerHTML = data.map(day => `
        <div class="day-group">
            <div class="day-header">
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(day.date)}</span>
                <span class="badge">${day.articles.length} Articles</span>
            </div>
            <div class="day-feed">
                ${day.articles.map(art => `
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
    `).join('');
}

function renderMains(data) {
    const mainsList = [];
    data.forEach(day => {
        if (day.articles) {
            day.articles.forEach(art => {
                if (art.mainsquestion) {
                    mainsList.push({
                        date: day.date,
                        gs: art.gs_paper,
                        topic: art.topic,
                        question: art.mainsquestion
                    });
                }
            });
        }
    });

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
                            <span class="badge">${item.gs}</span>
                            <span class="badge" style="background-color: var(--border-color);">${formatDate(item.date)}</span>
                        </div>
                        <h4 class="article-title">Q${idx + 1}. ${item.question}</h4>
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

function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}