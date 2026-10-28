// State management
let rawMonthData = [];
let availableMonths = [];

// DOM References
const searchInput = document.getElementById('search-input');
const monthSelect = document.getElementById('month-select');
const dateInput = document.getElementById('date-input');
const gsSelect = document.getElementById('gs-select');
const prioritySelect = document.getElementById('priority-select');
const resetFiltersBtn = document.getElementById('reset-filters');
const statTotal = document.getElementById('stat-total');

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
    gsSelect.addEventListener('change', renderViews);
    prioritySelect.addEventListener('change', renderViews);
    
    monthSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadMonthData(e.target.value);
        }
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        dateInput.value = '';
        gsSelect.value = 'all';
        prioritySelect.value = 'all';
        if (availableMonths.length > 0) {
            monthSelect.value = availableMonths[0];
            loadMonthData(availableMonths[0]);
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

// 1. Discover available months from data/index.json
async function initApp() {
    try {
        const response = await fetch('./data/index.json');
        if (!response.ok) throw new Error('Could not fetch data/index.json manifest');
        
        availableMonths = await response.json();
        
        if (availableMonths.length === 0) {
            monthSelect.innerHTML = `<option value="">No files in index.json</option>`;
            return;
        }

        // Populate month dropdown dynamically
        monthSelect.innerHTML = availableMonths.map(m => `
            <option value="${m}">${formatMonthLabel(m)}</option>
        `).join('');

        // Load the first (most recent) month
        loadMonthData(availableMonths[0]);

    } catch (err) {
        monthSelect.innerHTML = `<option value="">Error loading index.json</option>`;
        articlesContainer.innerHTML = `<div class="card loading-text">Failed to initialize. Ensure <code>data/index.json</code> exists.</div>`;
    }
}

// 2. Load JSON data for the selected month
async function loadMonthData(monthKey) {
    articlesContainer.innerHTML = `<div class="card loading-text">Loading ${monthKey}...</div>`;
    try {
        const response = await fetch(`./data/${monthKey}.json`);
        if (!response.ok) throw new Error(`data/${monthKey}.json not found`);
        
        rawMonthData = await response.json();
        
        // Dynamically build GS Paper and Priority filter options from actual data content
        populateDynamicDropdowns(rawMonthData);
        
        renderViews();
    } catch (err) {
        rawMonthData = [];
        articlesContainer.innerHTML = `<div class="card loading-text">No data file found for <code>data/${monthKey}.json</code>.</div>`;
        mainsContainer.innerHTML = articlesContainer.innerHTML;
        statTotal.textContent = '0';
    }
}

// 3. Extract unique GS Papers and Priorities dynamically from loaded JSON
function populateDynamicDropdowns(data) {
    const gsSet = new Set();
    const prioritySet = new Set();

    data.forEach(day => {
        day.articles.forEach(art => {
            if (art.gs_paper) gsSet.add(art.gs_paper);
            if (art.priority) prioritySet.add(art.priority);
        });
    });

    // Populate GS Paper Dropdown
    const currentGs = gsSelect.value;
    gsSelect.innerHTML = `<option value="all">All GS Papers</option>` + 
        Array.from(gsSet).sort().map(gs => `<option value="${gs}">${gs}</option>`).join('');
    gsSelect.value = gsSet.has(currentGs) ? currentGs : 'all';

    // Populate Priority Dropdown
    const currentPriority = prioritySelect.value;
    prioritySelect.innerHTML = `<option value="all">All Priorities</option>` + 
        Array.from(prioritySet).sort().map(p => `<option value="${p}">${p}</option>`).join('');
    prioritySelect.value = prioritySet.has(currentPriority) ? currentPriority : 'all';
}

// 4. Filter data dynamically
function filterData() {
    const query = searchInput.value.toLowerCase();
    const selectedDate = dateInput.value;
    const gsFilter = gsSelect.value;
    const priorityFilter = prioritySelect.value;

    let totalArticlesCount = 0;

    const filtered = rawMonthData.map(dayGroup => {
        // Date picker filter check
        if (selectedDate && dayGroup.date !== selectedDate) {
            return null;
        }

        const matchedArticles = dayGroup.articles.filter(article => {
            const matchesQuery = article.topic.toLowerCase().includes(query) || 
                                 article.summary.toLowerCase().includes(query);
            const matchesGs = gsFilter === 'all' || article.gs_paper === gsFilter;
            const matchesPriority = priorityFilter === 'all' || article.priority === priorityFilter;

            return matchesQuery && matchesGs && matchesPriority;
        });

        if (matchedArticles.length === 0) return null;

        totalArticlesCount += matchedArticles.length;

        return {
            date: dayGroup.date,
            articles: matchedArticles
        };
    }).filter(Boolean);

    statTotal.textContent = totalArticlesCount;
    return filtered;
}

function renderViews() {
    const data = filterData();
    renderArticles(data);
    renderMains(data);
}

function renderArticles(data) {
    if (data.length === 0) {
        articlesContainer.innerHTML = `<div class="card loading-text">No articles match your criteria.</div>`;
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
                            <span class="badge">${art.priority} Priority</span>
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
    });

    if (mainsList.length === 0) {
        mainsContainer.innerHTML = `<div class="card loading-text">No Mains practice questions match your criteria.</div>`;
        return;
    }

    mainsContainer.innerHTML = `
        <div class="day-group">
            <div class="day-header">
                <span><i class="fa-solid fa-pen-nib"></i> Mains Questions</span>
                <span class="badge">${mainsList.length} Questions</span>
            </div>
            <div class="day-feed">
                ${mainsList.map((item, idx) => `
                    <div class="article-card">
                        <div class="article-header">
                            <span class="badge">${item.gs}</span>
                            <span class="badge">${item.date}</span>
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
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}