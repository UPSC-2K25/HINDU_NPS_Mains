// DOM Elements
const articlesContainer = document.getElementById('articles-container');
const mainsContainer = document.getElementById('mains-container');
const searchInput = document.getElementById('search-input');
const gsSelect = document.getElementById('gs-select');
const prioritySelect = document.getElementById('priority-select');
const monthSelect = document.getElementById('month-select');
const resetFiltersBtn = document.getElementById('reset-filters');
const statTotal = document.getElementById('stat-total');
const statHigh = document.getElementById('stat-high');
const themeToggle = document.getElementById('theme-toggle');
const tabBtns = document.querySelectorAll('.tab-btn');

// Global state holding current month's loaded data
let currentMonthData = [];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadCurrentAffairsData(); // Fetch initial data file
});

function setupEventListeners() {
    searchInput.addEventListener('input', renderViews);
    gsSelect.addEventListener('change', renderViews);
    prioritySelect.addEventListener('change', renderViews);
    
    // When user changes month, fetch that specific JSON file
    monthSelect.addEventListener('change', (e) => {
        loadCurrentAffairsData(e.target.value);
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        gsSelect.value = 'all';
        prioritySelect.value = 'all';
        monthSelect.value = '2026-10';
        loadCurrentAffairsData(monthSelect.value);
    });

    // Tab Switching Logic
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

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
}

// Fetch separate monthly JSON files from your GitHub repository folder structure (e.g., data/2026-10.json)
async function loadCurrentAffairsData(month = '2026-10') {
    try {
        const response = await fetch(`./data/${month}.json`);
        if (!response.ok) {
            throw new Error(`Could not load data for ${month} (File not found)`);
        }
        currentMonthData = await response.json();
        renderViews();
    } catch (err) {
        currentMonthData = [];
        articlesContainer.innerHTML = `<div class="card" style="text-align: center; color: var(--text-secondary);">No data file found for ${month}. Please add a <code>data/${month}.json</code> file to your repository.</div>`;
        mainsContainer.innerHTML = articlesContainer.innerHTML;
        statTotal.textContent = '0';
        statHigh.textContent = '0';
    }
}

function filterData() {
    const query = searchInput.value.toLowerCase();
    const gsFilter = gsSelect.value;
    const priorityFilter = prioritySelect.value;

    let totalArticles = 0;
    let highPriorityCount = 0;

    const filtered = currentMonthData.map(dayGroup => {
        const matchedArticles = dayGroup.articles.filter(article => {
            totalArticles++;
            if (article.priority === 'High') highPriorityCount++;

            const matchesQuery = article.topic.toLowerCase().includes(query) || article.summary.toLowerCase().includes(query);
            const matchesGs = gsFilter === 'all' || article.gs_paper === gsFilter;
            const matchesPriority = priorityFilter === 'all' || article.priority === priorityFilter;

            return matchesQuery && matchesGs && matchesPriority;
        });

        if (matchedArticles.length === 0) return null;

        return {
            date: dayGroup.date,
            articles: matchedArticles
        };
    }).filter(Boolean);

    statTotal.textContent = totalArticles;
    statHigh.textContent = highPriorityCount;

    return filtered;
}

function renderViews() {
    const filteredData = filterData();
    renderArticles(filteredData);
    renderMains(filteredData);
}

function renderArticles(data) {
    if (data.length === 0) {
        articlesContainer.innerHTML = `<div class="card" style="text-align: center; color: var(--text-secondary);">No current affairs found matching your criteria.</div>`;
        return;
    }

    articlesContainer.innerHTML = data.map(day => `
        <div class="day-group">
            <div class="day-header">
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(day.date)}</span>
                <span class="badge" style="background-color: var(--primary); color: white;">${day.articles.length} Articles</span>
            </div>
            <div class="day-feed">
                ${day.articles.map(art => `
                    <div class="article-card">
                        <div class="article-header">
                            <div class="badges">
                                <span class="badge badge-gs">${art.gs_paper}</span>
                                <span class="badge ${art.priority === 'High' ? 'badge-high' : 'badge-med'}">${art.priority} Priority</span>
                            </div>
                        </div>
                        <h4 class="article-title">${art.topic}</h4>
                        <p class="article-summary">${art.summary}</p>
                        ${art.mainsquestion ? `
                            <div class="mains-box">
                                <strong>Mains Practice:</strong> ${art.mainsquestion}
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
        mainsContainer.innerHTML = `<div class="card" style="text-align: center; color: var(--text-secondary);">No mains questions found for this filter.</div>`;
        return;
    }

    mainsContainer.innerHTML = `
        <div class="day-group">
            <div class="day-header">
                <span><i class="fa-solid fa-pen-nib"></i> Mains Practice Question Bank</span>
                <span class="badge" style="background-color: var(--primary); color: white;">${mainsList.length} Questions</span>
            </div>
            <div class="day-feed">
                ${mainsList.map((item, idx) => `
                    <div class="article-card">
                        <div class="article-header">
                            <span class="badge badge-gs">${item.gs}</span>
                            <span class="badge" style="background-color: var(--border-color); color: var(--text-primary);">${formatDate(item.date)}</span>
                        </div>
                        <h4 class="article-title">Q${idx + 1}. ${item.question}</h4>
                        <p class="article-summary" style="font-size: 0.85rem; margin-top: 0.5rem;"><strong>Context Topic:</strong> ${item.topic}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}