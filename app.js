// Global state
let currentView = 'dashboard';
let currentZoneId = null;
let editingZoneId = null;
let editingProviderAssignmentId = null;
let selectedZipCodes = [];
let selectedProviders = [];
let warningCallback = null;
let currentSortColumn = null;
let currentSortDirection = 'asc';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    try {
        setupNavigation();
        setupTabs();
        
        // Ensure dashboard view is active
        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView) {
            dashboardView.classList.add('active');
        }
        
        renderDashboard();
        setupEventListeners();
        
        // Set default dates (only if elements exist)
        const providerStartDate = document.getElementById('provider-start-date');
        const providerEndDate = document.getElementById('provider-end-date');
        if (providerStartDate && providerEndDate) {
            const today = new Date().toISOString().split('T')[0];
            providerStartDate.value = today;
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);
            providerEndDate.value = endDate.toISOString().split('T')[0];
        }
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

function setupNavigation() {
    // Navigation is hidden, but keep function for compatibility
    const navTabs = document.querySelectorAll('.nav-tab');
    if (navTabs.length > 0) {
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                showView(view);
            });
        });
    }
}

function setupTabs() {
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            showDetailTab(tabName);
        });
    });
}

function setupEventListeners() {
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-btn') && !e.target.closest('.menu-dropdown') && !e.target.closest('.table-menu') && !e.target.closest('.zone-card-menu')) {
            document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    });
}

function showView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === viewName);
    });
    
    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}-view`);
    });
    
    currentView = viewName;
    
    if (viewName === 'dashboard') {
        renderDashboard();
    }
}

function showOverview() {
    showView('dashboard');
    currentZoneId = null;
}

// Dashboard
function renderDashboard() {
    try {
        if (typeof zones === 'undefined') {
            console.error('zones data not loaded');
            return;
        }
        updateDashboardStats();
        renderDashboardTable();
        renderOverviewTimeline();
    } catch (error) {
        console.error('Error rendering dashboard:', error);
    }
}

function showOverviewTab(tabName) {
    // Update tabs
    document.querySelectorAll('.overview-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update content
    document.querySelectorAll('.overview-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `overview-${tabName}-tab`);
    });
    
    // Render timeline if needed
    if (tabName === 'timeline') {
        renderOverviewTimeline();
    }
}

function updateDashboardStats() {
    try {
        const totalZonesEl = document.getElementById('total-zones');
        if (totalZonesEl) {
            totalZonesEl.textContent = zones.length;
        }
    
        const allProviderIds = new Set();
        zones.forEach(zone => {
            zone.providerAssignments?.forEach(assignment => {
                allProviderIds.add(assignment.providerId);
            });
        });
        const totalProvidersEl = document.getElementById('total-providers');
        if (totalProvidersEl) {
            totalProvidersEl.textContent = allProviderIds.size;
        }
    
        const allPatientIds = new Set();
        zones.forEach(zone => {
            getPatientsInZone(zone).forEach(patient => {
                allPatientIds.add(patient.id);
            });
        });
        const totalPatientsEl = document.getElementById('total-patients');
        if (totalPatientsEl) {
            totalPatientsEl.textContent = allPatientIds.size;
        }
    
        const coverageGapsEl = document.getElementById('coverage-gaps');
        if (coverageGapsEl) {
            coverageGapsEl.textContent = getTotalCoverageGaps();
        }
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

function renderDashboardTable() {
    const tbody = document.getElementById('dashboard-table-body');
    if (!tbody) {
        console.error('dashboard-table-body not found');
        return;
    }
    
    // Get filter values
    const searchTerm = document.getElementById('zone-search-filter')?.value.toLowerCase() || '';
    const showGapsOnly = document.getElementById('show-gaps-only')?.checked || false;
    const gapDaysRange = parseInt(document.getElementById('gap-days-range')?.value || '60');
    
    // Filter zones
    let filteredZones = zones.filter(zone => {
        // Search filter
        if (searchTerm) {
            const nameMatch = zone.name.toLowerCase().includes(searchTerm);
            const zipMatch = zone.zipCodes.some(zip => zip.includes(searchTerm));
            if (!nameMatch && !zipMatch) return false;
        }
        
        // Gap filter
        if (showGapsOnly) {
            const gaps = calculateCoverageGaps(zone, gapDaysRange);
            if (gaps.length === 0) return false;
        }
        
        return true;
    });
    
    // Sort zones if needed
    if (currentSortColumn === 'gapDays') {
        filteredZones.sort((a, b) => {
            const gapsA = calculateCoverageGaps(a, gapDaysRange);
            const gapsB = calculateCoverageGaps(b, gapDaysRange);
            const daysA = gapsA.reduce((sum, gap) => sum + gap.days, 0);
            const daysB = gapsB.reduce((sum, gap) => sum + gap.days, 0);
            
            if (currentSortDirection === 'asc') {
                return daysA - daysB;
            } else {
                return daysB - daysA;
            }
        });
    }
    
    tbody.innerHTML = '';
    
    if (filteredZones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem; color: #64748b;">
                    <i class="fas fa-search"></i> No zones found matching your filters.
                </td>
            </tr>
        `;
        return;
    }
    
    filteredZones.forEach(zone => {
        const patients = getPatientsInZone(zone);
        const providerCount = zone.providerAssignments?.length || 0;
        const ratio = providerCount > 0 ? Math.round(patients.length / providerCount) : 0;
        const gaps = calculateCoverageGaps(zone, gapDaysRange);
        const gapDays = gaps.reduce((sum, gap) => sum + gap.days, 0);
        const multiZonePatients = getPatientsInMultipleZones();
        
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.onclick = () => showZoneDetail(zone.id);
        
        let ratioClass = 'normal';
        if (ratio > 100) ratioClass = 'critical';
        else if (ratio > 75) ratioClass = 'warning';
        
        row.innerHTML = `
            <td><strong>${zone.name}</strong></td>
            <td>${zone.zipCodes.length} ZIP codes</td>
            <td>${patients.length}</td>
            <td>${providerCount}</td>
            <td>
                ${providerCount > 0 ? 
                    `<span class="ratio-badge ${ratioClass}">${ratio}:1</span>` : 
                    '<span class="ratio-badge critical">No coverage</span>'
                }
            </td>
            <td>
                ${gaps.length > 0 ? 
                    `<span class="gap-badge">${gaps.length} gap(s)</span>` : 
                    '<span class="no-gap">✓ No gaps</span>'
                }
            </td>
            <td>
                ${gapDays > 0 ? 
                    `<span class="gap-days-count">${gapDays} days</span>` : 
                    '<span class="no-gap">0 days</span>'
                }
            </td>
            <td>${multiZonePatients > 0 ? `<span class="gap-badge">${multiZonePatients}</span>` : '0'}</td>
            <td>
                <div class="table-menu" style="position: relative;">
                    <button class="menu-btn" onclick="event.stopPropagation(); toggleTableMenu(${zone.id})" title="More options">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <div class="menu-dropdown" id="table-menu-${zone.id}">
                        <div class="menu-item" onclick="event.stopPropagation(); showZoneDetail(${zone.id})">
                            <i class="fas fa-eye"></i> View Details
                        </div>
                        <div class="menu-item" onclick="event.stopPropagation(); editZoneById(${zone.id})">
                            <i class="fas fa-edit"></i> Edit
                        </div>
                        <div class="menu-item danger" onclick="event.stopPropagation(); deleteZoneById(${zone.id})">
                            <i class="fas fa-trash"></i> Delete
                        </div>
                    </div>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function filterZones() {
    renderDashboardTable();
}

function sortTable(column) {
    if (currentSortColumn === column) {
        // Toggle direction
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    // Update sort icons
    document.querySelectorAll('.sortable i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    const sortIcon = document.getElementById(`sort-icon-${column}`);
    if (sortIcon) {
        sortIcon.className = currentSortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
    
    renderDashboardTable();
}

function toggleMenu(zoneId) {
    const menu = document.getElementById(`menu-${zoneId}`);
    document.querySelectorAll('.menu-dropdown').forEach(m => {
        if (m.id !== menu.id) m.classList.remove('show');
    });
    menu.classList.toggle('show');
}

function toggleTableMenu(zoneId) {
    const menu = document.getElementById(`table-menu-${zoneId}`);
    document.querySelectorAll('.menu-dropdown').forEach(m => {
        if (m.id !== menu.id) m.classList.remove('show');
    });
    menu.classList.toggle('show');
}

// Zone Detail
function showZoneDetail(zoneId, defaultTab = 'providers') {
    currentZoneId = zoneId;
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    // Hide other views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    // Show detail view
    const detailView = document.getElementById('zone-detail-view');
    detailView.classList.add('active');
    
    // Update header
    document.getElementById('zone-detail-name').textContent = zone.name;
    
    // Show specified tab (default to providers, but can be 'timeline')
    showDetailTab(defaultTab);
    
    // Render content
    renderProvidersTab();
    renderTimelineTab();
    renderPatientsTab();
}

function showDetailTab(tabName) {
    // Update tabs
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update content
    document.querySelectorAll('.detail-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    // Refresh timeline if needed
    if (tabName === 'timeline') {
        renderTimelineTab();
    }
}

// Providers Tab
function renderProvidersTab() {
    if (!currentZoneId) return;
    
    const zone = zones.find(z => z.id === currentZoneId);
    if (!zone) return;
    
    const list = document.getElementById('providers-list');
    list.innerHTML = '';
    
    const assignments = zone.providerAssignments || [];
    
    if (assignments.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-md"></i>
                <p>No providers assigned to this zone</p>
            </div>
        `;
        return;
    }
    
    assignments.forEach(assignment => {
        const provider = providers.find(p => p.id === assignment.providerId);
        if (!provider) return;
        
        const card = document.createElement('div');
        card.className = 'provider-card';
        
        const activeDaysText = assignment.activeDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
        const biWeeklyText = assignment.biWeekly ? ' (Bi-weekly)' : '';
        
        card.innerHTML = `
            <div class="provider-info">
                <div class="provider-name">${assignment.providerName}</div>
                <div class="provider-details">
                    <div class="provider-detail-item">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(assignment.startDate)} - ${formatDate(assignment.endDate)}
                    </div>
                    <div class="provider-detail-item">
                        <i class="fas fa-clock"></i>
                        ${activeDaysText}${biWeeklyText}
                    </div>
                </div>
            </div>
            <div class="provider-actions">
                <button class="btn btn-secondary btn-icon" onclick="editProviderAssignment(${assignment.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-icon" onclick="removeProviderAssignment(${assignment.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        list.appendChild(card);
    });
}

// Timeline Tab
function renderTimelineTab() {
    if (!currentZoneId) return;
    
    const zone = zones.find(z => z.id === currentZoneId);
    if (!zone) return;
    
    const container = document.getElementById('timeline-container');
    const range = document.getElementById('timeline-range').value;
    
    let startDate, endDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (range === 'custom') {
        const customStart = document.getElementById('custom-start-date').value;
        const customEnd = document.getElementById('custom-end-date').value;
        if (customStart && customEnd) {
            startDate = new Date(customStart);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customEnd);
            endDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(today);
            endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 60);
        }
    } else {
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + parseInt(range));
    }
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dayWidth = 100 / totalDays;
    
    // Get filter values
    const searchTerm = document.getElementById('provider-timeline-search')?.value.toLowerCase() || '';
    const showGapsOnly = document.getElementById('provider-show-gaps-only')?.checked || false;
    
    // Get assignments and filter
    let filteredAssignments = (zone.providerAssignments || []).filter(assignment => {
        // Search filter
        if (searchTerm) {
            const nameMatch = assignment.providerName.toLowerCase().includes(searchTerm);
            if (!nameMatch) return false;
        }
        
        // Gap filter
        if (showGapsOnly) {
            const providerGaps = calculateProviderGaps(assignment, startDate, endDate);
            if (providerGaps.length === 0) return false;
        }
        
        return true;
    });
    
    // Sort providers if needed
    if (currentSortColumn === 'provider-gapDays') {
        filteredAssignments.sort((a, b) => {
            const gapsA = calculateProviderGaps(a, startDate, endDate);
            const gapsB = calculateProviderGaps(b, startDate, endDate);
            const daysA = gapsA.reduce((sum, gap) => sum + gap.days, 0);
            const daysB = gapsB.reduce((sum, gap) => sum + gap.days, 0);
            
            if (currentSortDirection === 'asc') {
                return daysA - daysB;
            } else {
                return daysB - daysA;
            }
        });
    } else if (currentSortColumn === 'provider-name') {
        filteredAssignments.sort((a, b) => {
            if (currentSortDirection === 'asc') {
                return a.providerName.localeCompare(b.providerName);
            } else {
                return b.providerName.localeCompare(a.providerName);
            }
        });
    }
    
    if (filteredAssignments.length === 0 && zone.providerAssignments?.length > 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No providers found matching your filters.</p>
            </div>
        `;
        return;
    }
    
    if (zone.providerAssignments?.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <p>No providers assigned. Add a provider to get started.</p>
            </div>
        `;
        return;
    }
    
    // Render zone-level summary and provider-level timelines
    container.innerHTML = `
        <div class="zone-timeline-header">
            <div class="timeline-date-range">
                <i class="fas fa-calendar-alt"></i> ${formatDate(startDate.toISOString().split('T')[0])} - ${formatDate(endDate.toISOString().split('T')[0])}
            </div>
            <div class="timeline-legend">
                <span class="legend-item">
                    <span class="legend-color" style="background: #10b981;"></span> Coverage
                </span>
                <span class="legend-item">
                    <span class="legend-color" style="background: #dc2626;"></span> Gap
                </span>
            </div>
        </div>
        <div class="unified-timeline-container">
            <div class="unified-timeline-header-sticky">
                <div class="unified-timeline-header">
                    <div class="unified-date-header-spacer">
                        <div class="spacer-provider-name"></div>
                        <div class="spacer-provider-gap-days"></div>
                    </div>
                    <div class="unified-date-header-dates" id="unified-date-header-dates">
                        ${renderDayByDayDates(startDate, endDate, today, 'unified')}
                    </div>
                </div>
            </div>
            <div class="unified-timeline-scroll" id="unified-timeline-scroll">
                <div class="date-column-highlight" id="unified-date-column-highlight" style="display: none;"></div>
                <div class="zone-timeline-summary">
                    <h4>Zone Coverage Summary</h4>
                    <div class="zone-summary-timeline-wrapper">
                        <div class="zone-summary-timeline-scroll">
                            ${renderZoneSummaryTimelineRow(zone, startDate, endDate, dayWidth, today)}
                        </div>
                    </div>
                </div>
                <div class="provider-timeline-section">
                    <h4>Provider-Level Coverage</h4>
                    <div class="provider-timeline-wrapper">
                        <div class="provider-timeline-scroll">
                            <div class="provider-timeline-rows">
                                <div class="provider-timeline-header-row">
                                    <div class="provider-timeline-name-header">
                                        <span>Provider Name</span>
                                        <button class="sort-btn" onclick="sortProviderTimeline('name')">
                                            <i class="fas fa-sort" id="sort-icon-provider-name"></i>
                                        </button>
                                    </div>
                                    <div class="provider-timeline-gap-days-header">
                                        <span>Days Without Coverage</span>
                                        <button class="sort-btn" onclick="sortProviderTimeline('gapDays')">
                                            <i class="fas fa-sort" id="sort-icon-provider-gapDays"></i>
                                        </button>
                                    </div>
                                </div>
                                ${filteredAssignments.map(assignment => renderProviderTimelineRow(assignment, zone, startDate, endDate, dayWidth, today)).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener to close highlight on outside click
    const unifiedScroll = document.getElementById('unified-timeline-scroll');
    if (unifiedScroll) {
        unifiedScroll.addEventListener('click', (event) => {
            if (!event.target.closest('.timeline-day-cell')) {
                clearDateHighlight();
            }
        });
    }
}

// Calculate gaps for a specific provider assignment
function calculateProviderGaps(assignment, startDate, endDate) {
    const startNormalized = new Date(startDate);
    startNormalized.setHours(0, 0, 0, 0);
    const endNormalized = new Date(endDate);
    endNormalized.setHours(0, 0, 0, 0);
    
    const assignmentStart = new Date(assignment.startDate);
    assignmentStart.setHours(0, 0, 0, 0);
    const assignmentEnd = new Date(assignment.endDate);
    assignmentEnd.setHours(0, 0, 0, 0);
    
    const gaps = [];
    
    // Gap before assignment
    if (assignmentStart > startNormalized) {
        const gapStart = startNormalized;
        const gapEnd = assignmentStart < endNormalized ? assignmentStart : endNormalized;
        const gapDays = Math.ceil((gapEnd - gapStart) / (1000 * 60 * 60 * 24));
        if (gapDays > 0) {
            gaps.push({ start: gapStart, end: gapEnd, days: gapDays });
        }
    }
    
    // Gap after assignment
    if (assignmentEnd < endNormalized) {
        const gapStart = assignmentEnd > startNormalized ? assignmentEnd : startNormalized;
        const gapEnd = endNormalized;
        const gapDays = Math.ceil((gapEnd - gapStart) / (1000 * 60 * 60 * 24));
        if (gapDays > 0) {
            gaps.push({ start: gapStart, end: gapEnd, days: gapDays });
        }
    }
    
    return gaps;
}

// Render zone summary timeline row (single row showing overall zone coverage)
function renderZoneSummaryTimelineRow(zone, startDate, endDate, dayWidth, today) {
    const startNormalized = new Date(startDate);
    startNormalized.setHours(0, 0, 0, 0);
    const endNormalized = new Date(endDate);
    endNormalized.setHours(0, 0, 0, 0);
    const totalDays = (endNormalized - startNormalized) / (1000 * 60 * 60 * 24);
    
    // Get all assignments and gaps
    const assignments = zone.providerAssignments || [];
    const gaps = calculateCoverageGaps(zone, totalDays);
    const gapDays = gaps.reduce((sum, gap) => sum + gap.days, 0);
    
    // Build timeline segments (same logic as overview)
    const segments = [];
    
    assignments.forEach(assignment => {
        const assignmentStart = new Date(assignment.startDate);
        assignmentStart.setHours(0, 0, 0, 0);
        const assignmentEnd = new Date(assignment.endDate);
        assignmentEnd.setHours(0, 0, 0, 0);
        
        const displayStart = assignmentStart < startNormalized ? startNormalized : assignmentStart;
        const displayEnd = assignmentEnd > endNormalized ? endNormalized : assignmentEnd;
        
        if (displayStart <= endNormalized && displayEnd >= startNormalized) {
            segments.push({
                start: displayStart,
                end: displayEnd,
                type: 'coverage'
            });
        }
    });
    
    gaps.forEach(gap => {
        const gapStart = new Date(gap.start);
        gapStart.setHours(0, 0, 0, 0);
        const gapEnd = new Date(gap.end);
        gapEnd.setHours(0, 0, 0, 0);
        
        const displayStart = gapStart < startNormalized ? startNormalized : gapStart;
        const displayEnd = gapEnd > endNormalized ? endNormalized : gapEnd;
        
        if (displayStart <= endNormalized && displayEnd >= startNormalized) {
            segments.push({
                start: displayStart,
                end: displayEnd,
                type: 'gap'
            });
        }
    });
    
    segments.sort((a, b) => a.start - b.start);
    
    let barHtml = '';
    let currentPos = 0;
    
    if (segments.length === 0) {
        barHtml = `<div class="timeline-gap-bar" style="left: 0%; width: 100%;"></div>`;
    } else {
        segments.forEach(segment => {
            const daysFromStart = (segment.start - startNormalized) / (1000 * 60 * 60 * 24);
            const daysDuration = (segment.end - segment.start) / (1000 * 60 * 60 * 24);
            
            const left = (daysFromStart / totalDays) * 100;
            const width = (daysDuration / totalDays) * 100;
            
            if (left > currentPos) {
                const gapLeft = currentPos;
                const gapWidth = left - currentPos;
                barHtml += `<div class="timeline-gap-bar" style="left: ${gapLeft}%; width: ${gapWidth}%;"></div>`;
            }
            
            if (segment.type === 'coverage') {
                barHtml += `<div class="timeline-coverage-bar" style="left: ${left}%; width: ${width}%;"></div>`;
            } else {
                const gapDays = Math.ceil((segment.end - segment.start) / (1000 * 60 * 60 * 24));
                barHtml += `<div class="timeline-gap-bar" style="left: ${left}%; width: ${width}%;" title="Gap: ${gapDays} days"></div>`;
            }
            
            currentPos = left + width;
        });
        
        if (currentPos < 100) {
            const gapLeft = currentPos;
            const gapWidth = 100 - currentPos;
            barHtml += `<div class="timeline-gap-bar" style="left: ${gapLeft}%; width: ${gapWidth}%;"></div>`;
        }
    }
    
    return `
        <div class="zone-summary-row">
            <div class="zone-summary-name-unified">${zone.name} (Overall)</div>
            <div class="zone-summary-gap-days-unified">
                ${gapDays > 0 ? 
                    `<span class="gap-days-count">${gapDays} days</span>` : 
                    '<span class="no-gap">0 days</span>'
                }
            </div>
            <div class="zone-summary-bar-container">
                ${barHtml}
            </div>
        </div>
    `;
}

// Render provider timeline row
function renderProviderTimelineRow(assignment, zone, startDate, endDate, dayWidth, today) {
    const startNormalized = new Date(startDate);
    startNormalized.setHours(0, 0, 0, 0);
    const endNormalized = new Date(endDate);
    endNormalized.setHours(0, 0, 0, 0);
    const totalDays = (endNormalized - startNormalized) / (1000 * 60 * 60 * 24);
    
    // Get gaps for this provider
    const gaps = calculateProviderGaps(assignment, startDate, endDate);
    const gapDays = gaps.reduce((sum, gap) => sum + gap.days, 0);
    
    // Build timeline segments
    const segments = [];
    
    // Coverage period
    const assignmentStart = new Date(assignment.startDate);
    assignmentStart.setHours(0, 0, 0, 0);
    const assignmentEnd = new Date(assignment.endDate);
    assignmentEnd.setHours(0, 0, 0, 0);
    
    const displayStart = assignmentStart < startNormalized ? startNormalized : assignmentStart;
    const displayEnd = assignmentEnd > endNormalized ? endNormalized : assignmentEnd;
    
    if (displayStart <= endNormalized && displayEnd >= startNormalized) {
        segments.push({
            start: displayStart,
            end: displayEnd,
            type: 'coverage'
        });
    }
    
    // Add gap periods
    gaps.forEach(gap => {
        const gapStart = new Date(gap.start);
        gapStart.setHours(0, 0, 0, 0);
        const gapEnd = new Date(gap.end);
        gapEnd.setHours(0, 0, 0, 0);
        
        const displayStart = gapStart < startNormalized ? startNormalized : gapStart;
        const displayEnd = gapEnd > endNormalized ? endNormalized : gapEnd;
        
        if (displayStart <= endNormalized && displayEnd >= startNormalized) {
            segments.push({
                start: displayStart,
                end: displayEnd,
                type: 'gap'
            });
        }
    });
    
    segments.sort((a, b) => a.start - b.start);
    
    let barHtml = '';
    let currentPos = 0;
    
    if (segments.length === 0) {
        barHtml = `<div class="timeline-gap-bar" style="left: 0%; width: 100%;"></div>`;
    } else {
        segments.forEach(segment => {
            const daysFromStart = (segment.start - startNormalized) / (1000 * 60 * 60 * 24);
            const daysDuration = (segment.end - segment.start) / (1000 * 60 * 60 * 24);
            
            const left = (daysFromStart / totalDays) * 100;
            const width = (daysDuration / totalDays) * 100;
            
            if (left > currentPos) {
                const gapLeft = currentPos;
                const gapWidth = left - currentPos;
                barHtml += `<div class="timeline-gap-bar" style="left: ${gapLeft}%; width: ${gapWidth}%;"></div>`;
            }
            
            if (segment.type === 'coverage') {
                barHtml += `<div class="timeline-coverage-bar" style="left: ${left}%; width: ${width}%;" onclick="event.stopPropagation(); editProviderAssignment(${assignment.id})" title="Coverage: ${formatDate(segment.start.toISOString().split('T')[0])} to ${formatDate(segment.end.toISOString().split('T')[0])}"></div>`;
            } else {
                const gapDays = Math.ceil((segment.end - segment.start) / (1000 * 60 * 60 * 24));
                barHtml += `<div class="timeline-gap-bar" style="left: ${left}%; width: ${width}%;" title="Gap: ${formatDate(segment.start.toISOString().split('T')[0])} to ${formatDate(segment.end.toISOString().split('T')[0])} (${gapDays} days)"></div>`;
            }
            
            currentPos = left + width;
        });
        
        if (currentPos < 100) {
            const gapLeft = currentPos;
            const gapWidth = 100 - currentPos;
            barHtml += `<div class="timeline-gap-bar" style="left: ${gapLeft}%; width: ${gapWidth}%;"></div>`;
        }
    }
    
    return `
        <div class="provider-timeline-row" onclick="editProviderAssignment(${assignment.id})">
            <div class="provider-timeline-name">${assignment.providerName}</div>
            <div class="provider-timeline-gap-days">
                ${gapDays > 0 ? 
                    `<span class="gap-days-count">${gapDays} days</span>` : 
                    '<span class="no-gap">0 days</span>'
                }
            </div>
            <div class="provider-timeline-bar-container">
                ${barHtml}
            </div>
        </div>
    `;
}

function sortProviderTimeline(column) {
    if (currentSortColumn === `provider-${column}`) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = `provider-${column}`;
        currentSortDirection = 'asc';
    }
    
    // Update sort icons
    document.querySelectorAll('.provider-timeline-header-row .sort-btn i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    const sortIcon = document.getElementById(`sort-icon-provider-${column}`);
    if (sortIcon) {
        sortIcon.className = currentSortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
    
    renderTimelineTab();
}

function renderTimelineBars(assignments, startDate, endDate, dayWidth) {
    let html = '';
    let yOffset = 0;
    const barHeight = 40;
    const spacing = 10;
    
    // Normalize start and end dates
    const startNormalized = new Date(startDate);
    startNormalized.setHours(0, 0, 0, 0);
    const endNormalized = new Date(endDate);
    endNormalized.setHours(0, 0, 0, 0);
    const totalDays = (endNormalized - startNormalized) / (1000 * 60 * 60 * 24);
    
    assignments.forEach((assignment, index) => {
        const assignmentStart = new Date(assignment.startDate);
        assignmentStart.setHours(0, 0, 0, 0);
        const assignmentEnd = new Date(assignment.endDate);
        assignmentEnd.setHours(0, 0, 0, 0);
        
        // Only show if overlaps with view range
        if (assignmentEnd < startNormalized || assignmentStart > endNormalized) return;
        
        const displayStart = assignmentStart < startNormalized ? startNormalized : assignmentStart;
        const displayEnd = assignmentEnd > endNormalized ? endNormalized : assignmentEnd;
        
        const daysFromStart = (displayStart - startNormalized) / (1000 * 60 * 60 * 24);
        const daysDuration = (displayEnd - displayStart) / (1000 * 60 * 60 * 24);
        
        const left = (daysFromStart / totalDays) * 100;
        const width = (daysDuration / totalDays) * 100;
        
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
        const color = colors[index % colors.length];
        
        html += `
            <div class="timeline-bar" 
                 style="left: ${left}%; width: ${width}%; top: ${yOffset}px; background: ${color};"
                 onclick="editProviderAssignment(${assignment.id})"
                 title="${assignment.providerName} - ${formatDate(assignment.startDate)} to ${formatDate(assignment.endDate)}">
                ${assignment.providerName}
            </div>
        `;
        
        yOffset += barHeight + spacing;
    });
    
    return html;
}

function renderTimelineGaps(gaps, startDate, endDate, dayWidth) {
    let html = '';
    const barHeight = 40;
    const spacing = 10;
    let yOffset = barHeight + spacing; // Start below first potential bar
    
    // Normalize dates
    const startNormalized = new Date(startDate);
    startNormalized.setHours(0, 0, 0, 0);
    const endNormalized = new Date(endDate);
    endNormalized.setHours(0, 0, 0, 0);
    const totalDays = (endNormalized - startNormalized) / (1000 * 60 * 60 * 24);
    
    gaps.forEach((gap, index) => {
        const gapStart = new Date(gap.start);
        gapStart.setHours(0, 0, 0, 0);
        const gapEnd = new Date(gap.end);
        gapEnd.setHours(0, 0, 0, 0);
        
        const displayStart = gapStart < startNormalized ? startNormalized : gapStart;
        const displayEnd = gapEnd > endNormalized ? endNormalized : gapEnd;
        
        const daysFromStart = (displayStart - startNormalized) / (1000 * 60 * 60 * 24);
        const daysDuration = (displayEnd - displayStart) / (1000 * 60 * 60 * 24);
        
        const left = (daysFromStart / totalDays) * 100;
        const width = (daysDuration / totalDays) * 100;
        
        // Calculate gap duration
        const gapDuration = Math.ceil((gapEnd - gapStart) / (1000 * 60 * 60 * 24));
        const gapText = gapDuration === 1 ? '1 day' : `${gapDuration} days`;
        
        html += `
            <div class="timeline-gap" 
                 style="left: ${left}%; width: ${width}%; top: ${yOffset}px;"
                 onclick="handleGapClick('${gap.start.toISOString().split('T')[0]}', '${gap.end.toISOString().split('T')[0]}')"
                 title="No coverage: ${formatDate(gapStart.toISOString().split('T')[0])} to ${formatDate(gapEnd.toISOString().split('T')[0])} (${gapText})">
                <i class="fas fa-exclamation-triangle"></i> No coverage - ${gapText}
            </div>
        `;
        
        yOffset += barHeight + spacing;
    });
    
    return html;
}

function renderDateMarkers(startDate, endDate, dayWidth, today) {
    let html = '';
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const markerInterval = Math.max(1, Math.floor(totalDays / 8)); // Show about 8 markers
    
    // Normalize dates for comparison
    const todayNormalized = new Date(today);
    todayNormalized.setHours(0, 0, 0, 0);
    
    for (let i = 0; i <= totalDays; i += markerInterval) {
        const markerDate = new Date(startDate);
        markerDate.setDate(markerDate.getDate() + i);
        markerDate.setHours(0, 0, 0, 0);
        if (markerDate > endDate) break;
        
        const left = (i / totalDays) * 100;
        const isToday = markerDate.getTime() === todayNormalized.getTime();
        
        html += `
            <div class="timeline-date-marker ${isToday ? 'today-marker' : ''}" style="left: ${left}%;">
                <div class="marker-line"></div>
                <div class="marker-label">${formatDate(markerDate.toISOString().split('T')[0])}</div>
            </div>
        `;
    }
    
    return html;
}

function renderTodayIndicator(today, startDate, endDate, dayWidth) {
    // Normalize dates for comparison
    const todayNormalized = new Date(today);
    todayNormalized.setHours(0, 0, 0, 0);
    const startNormalized = new Date(startDate);
    startNormalized.setHours(0, 0, 0, 0);
    const endNormalized = new Date(endDate);
    endNormalized.setHours(0, 0, 0, 0);
    
    if (todayNormalized < startNormalized || todayNormalized > endNormalized) return '';
    
    const daysDiff = (todayNormalized - startNormalized) / (1000 * 60 * 60 * 24);
    const totalDays = (endNormalized - startNormalized) / (1000 * 60 * 60 * 24);
    const left = (daysDiff / totalDays) * 100;
    
    // Adjust label position if near edges to prevent overflow
    let labelStyle = 'left: 50%; transform: translateX(-50%);';
    if (left < 10) {
        labelStyle = 'left: 0; transform: translateX(0);';
    } else if (left > 90) {
        labelStyle = 'right: 0; left: auto; transform: translateX(0);';
    }
    
    return `
        <div class="today-indicator" style="left: ${left}%;" title="Today: ${formatDate(todayNormalized.toISOString().split('T')[0])}">
            <div class="today-label" style="${labelStyle}">
                <i class="fas fa-calendar-day"></i> Today (${formatDate(todayNormalized.toISOString().split('T')[0])})
            </div>
        </div>
    `;
}

function handleGapClick(startDate, endDate) {
    document.getElementById('provider-start-date').value = startDate;
    document.getElementById('provider-end-date').value = endDate;
    showAddProviderModal();
}

function updateTimeline() {
    const range = document.getElementById('timeline-range').value;
    const customInputs = document.getElementById('custom-range-inputs');
    
    if (range === 'custom') {
        customInputs.style.display = 'flex';
        // Don't render yet, wait for Apply button
        return;
    } else {
        customInputs.style.display = 'none';
    }
    
    renderTimelineTab();
}

function applyCustomRange() {
    const startDate = document.getElementById('custom-start-date').value;
    const endDate = document.getElementById('custom-end-date').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    if (new Date(endDate) < new Date(startDate)) {
        alert('End date must be after start date');
        return;
    }
    
    renderTimelineTab();
}

// Patients Tab
function renderPatientsTab() {
    if (!currentZoneId) return;
    
    const zone = zones.find(z => z.id === currentZoneId);
    if (!zone) return;
    
    const patients = getPatientsInZone(zone);
    const list = document.getElementById('patients-list');
    
    if (patients.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>No patients currently in this zone</p>
            </div>
        `;
        return;
    }
    
    renderPatientsList(patients);
}

function renderPatientsList(patients) {
    const list = document.getElementById('patients-list');
    list.innerHTML = '';
    
    // Check for multi-zone patients
    const patientZoneMap = {};
    zones.forEach(zone => {
        const zonePatients = getPatientsInZone(zone);
        zonePatients.forEach(patient => {
            if (!patientZoneMap[patient.id]) {
                patientZoneMap[patient.id] = [];
            }
            patientZoneMap[patient.id].push(zone.name);
        });
    });
    
    patients.forEach(patient => {
        const isMultiZone = patientZoneMap[patient.id]?.length > 1;
        const zones = patientZoneMap[patient.id] || [];
        
        const card = document.createElement('div');
        card.className = `patient-card ${isMultiZone ? 'multi-zone' : ''}`;
        
        card.innerHTML = `
            <div class="patient-info">
                <div class="patient-name">${patient.name}</div>
                <div class="patient-details">
                    <div class="patient-detail-item">
                        <i class="fas fa-phone"></i> ${patient.phone}
                    </div>
                    <div class="patient-detail-item">
                        <i class="fas fa-map-marker-alt"></i> ${patient.zipCode}
                    </div>
                </div>
                ${isMultiZone ? `
                    <div class="patient-multi-zone">
                        <i class="fas fa-exclamation-triangle"></i>
                        Patient assigned to multiple zones: ${zones.join(', ')}
                    </div>
                ` : ''}
            </div>
            <div class="patient-actions">
                <button class="btn btn-secondary btn-icon" onclick="openPatientProfile(${patient.id})">
                    <i class="fas fa-external-link-alt"></i>
                </button>
            </div>
        `;
        
        list.appendChild(card);
    });
}

function filterPatients() {
    const searchTerm = document.getElementById('patient-search').value.toLowerCase();
    if (!currentZoneId) return;
    
    const zone = zones.find(z => z.id === currentZoneId);
    if (!zone) return;
    
    const allPatients = getPatientsInZone(zone);
    const filtered = allPatients.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm) ||
        patient.zipCode.includes(searchTerm)
    );
    
    renderPatientsList(filtered);
}

function openPatientProfile(patientId) {
    // In real app, this would open CRM
    alert(`Opening patient profile for patient ID ${patientId} in CRM (new tab)`);
}

// Zone CRUD
function showCreateZoneModal() {
    editingZoneId = null;
    selectedZipCodes = [];
    document.getElementById('zone-modal-title').textContent = 'Create Zone';
    document.getElementById('zone-name').value = '';
    document.getElementById('selected-zips').innerHTML = '';
    document.getElementById('zone-name-error').classList.remove('show');
    document.getElementById('zip-codes-error').classList.remove('show');
    document.getElementById('zone-modal').classList.add('show');
}

function editZone() {
    if (!currentZoneId) return;
    editZoneById(currentZoneId);
}

function editZoneById(zoneId) {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    editingZoneId = zoneId;
    selectedZipCodes = [...zone.zipCodes];
    document.getElementById('zone-modal-title').textContent = 'Edit Zone';
    document.getElementById('zone-name').value = zone.name;
    renderSelectedZips();
    document.getElementById('zone-modal').classList.add('show');
}

function searchZipCodes() {
    const search = document.getElementById('zip-search').value;
    const dropdown = document.getElementById('zip-dropdown');
    
    if (!search || search.length < 1) {
        dropdown.classList.remove('show');
        return;
    }
    
    const filtered = availableZipCodes.filter(zip => 
        zip.includes(search) && !selectedZipCodes.includes(zip)
    );
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="zip-option">No ZIP codes found</div>';
    } else {
        dropdown.innerHTML = filtered.slice(0, 10).map(zip => `
            <div class="zip-option" onclick="selectZipCode('${zip}')">${zip}</div>
        `).join('');
    }
    
    dropdown.classList.add('show');
}

function selectZipCode(zip) {
    if (!selectedZipCodes.includes(zip)) {
        selectedZipCodes.push(zip);
        renderSelectedZips();
    }
    document.getElementById('zip-search').value = '';
    document.getElementById('zip-dropdown').classList.remove('show');
}

function removeZipCode(zip) {
    selectedZipCodes = selectedZipCodes.filter(z => z !== zip);
    renderSelectedZips();
}

function renderSelectedZips() {
    const container = document.getElementById('selected-zips');
    container.innerHTML = selectedZipCodes.map(zip => `
        <span class="zip-tag">
            ${zip}
            <button onclick="removeZipCode('${zip}')">&times;</button>
        </span>
    `).join('');
}

function saveZone() {
    const name = document.getElementById('zone-name').value.trim();
    const nameError = document.getElementById('zone-name-error');
    const zipError = document.getElementById('zip-codes-error');
    
    // Validation
    let hasError = false;
    
    if (!name) {
        nameError.textContent = 'Zone name is required';
        nameError.classList.add('show');
        hasError = true;
    } else {
        // Check for duplicate name
        const duplicate = zones.find(z => z.name.toLowerCase() === name.toLowerCase() && z.id !== editingZoneId);
        if (duplicate) {
            nameError.textContent = 'Zone name already in use';
            nameError.classList.add('show');
            hasError = true;
        } else {
            nameError.classList.remove('show');
        }
    }
    
    if (selectedZipCodes.length === 0) {
        zipError.textContent = 'At least one ZIP code required';
        zipError.classList.add('show');
        hasError = true;
    } else {
        zipError.classList.remove('show');
    }
    
    if (hasError) return;
    
    // Check for patients if editing
    if (editingZoneId) {
        const zone = zones.find(z => z.id === editingZoneId);
        const patients = getPatientsInZone(zone);
        const newZips = selectedZipCodes.filter(z => !zone.zipCodes.includes(z));
        const removedZips = zone.zipCodes.filter(z => !selectedZipCodes.includes(z));
        
        if (removedZips.length > 0 && patients.length > 0) {
            const affectedPatients = patients.filter(p => removedZips.includes(p.zipCode));
            if (affectedPatients.length > 0) {
                showWarning(
                    `Changing ZIP codes may affect ${affectedPatients.length} patient assignments. Continue?`,
                    () => {
                        performSaveZone(name);
                    }
                );
                return;
            }
        }
    }
    
    performSaveZone(name);
}

function performSaveZone(name) {
    if (editingZoneId) {
        // Update existing zone
        const zone = zones.find(z => z.id === editingZoneId);
        zone.name = name;
        zone.zipCodes = selectedZipCodes;
    } else {
        // Create new zone
        const newZone = {
            id: zones.length > 0 ? Math.max(...zones.map(z => z.id)) + 1 : 1,
            name: name,
            zipCodes: selectedZipCodes,
            providerAssignments: [],
            appointments: []
        };
        zones.push(newZone);
    }
    
    closeModal('zone-modal');
    renderDashboard();
    
    if (currentZoneId === editingZoneId) {
        showZoneDetail(editingZoneId);
    }
}

function deleteZone() {
    if (!currentZoneId) return;
    deleteZoneById(currentZoneId);
}

function deleteZoneById(zoneId) {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    const activeProviders = zone.providerAssignments?.length || 0;
    const appointments = zone.appointments?.length || 0;
    const patients = getPatientsInZone(zone);
    
    let message = '';
    if (activeProviders > 0) {
        message = `This zone has ${activeProviders} active provider assignment(s). Remove assignments first.`;
        showWarning(message);
        return;
    }
    
    if (appointments > 0) {
        message = `This zone has ${appointments} upcoming appointment(s). Reassign before deleting.`;
        showWarning(message);
        return;
    }
    
    if (patients.length > 0) {
        message = `This zone contains ${patients.length} patient(s) who will become unassigned. Continue?`;
        showWarning(message, () => {
            zones = zones.filter(z => z.id !== zoneId);
            closeModal('warning-modal');
            showOverview();
            renderDashboard();
        });
        return;
    }
    
    zones = zones.filter(z => z.id !== zoneId);
    showOverview();
    renderDashboard();
}

// Provider Assignment
function showAddProviderModal() {
    editingProviderAssignmentId = null;
    selectedProviders = [];
    document.getElementById('provider-form').reset();
    document.getElementById('selected-providers').innerHTML = '';
    document.getElementById('provider-error').classList.remove('show');
    document.getElementById('start-date-error').classList.remove('show');
    document.getElementById('end-date-error').classList.remove('show');
    document.getElementById('days-error').classList.remove('show');
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('provider-start-date').value = today;
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    document.getElementById('provider-end-date').value = endDate.toISOString().split('T')[0];
    
    document.getElementById('provider-modal').classList.add('show');
}

function searchProviders() {
    const search = document.getElementById('provider-search').value.toLowerCase();
    const dropdown = document.getElementById('provider-dropdown');
    
    if (!search || search.length < 1) {
        dropdown.classList.remove('show');
        return;
    }
    
    const filtered = providers.filter(p => 
        p.name.toLowerCase().includes(search) &&
        !selectedProviders.find(sp => sp.id === p.id)
    );
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="provider-option">No providers found</div>';
    } else {
        dropdown.innerHTML = filtered.map(provider => `
            <div class="provider-option" onclick="selectProvider(${provider.id})">
                <i class="fas fa-user-md"></i>
                ${provider.name}
            </div>
        `).join('');
    }
    
    dropdown.classList.add('show');
}

function selectProvider(providerId) {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;
    
    if (!selectedProviders.find(sp => sp.id === providerId)) {
        selectedProviders.push(provider);
        renderSelectedProviders();
    }
    
    document.getElementById('provider-search').value = '';
    document.getElementById('provider-dropdown').classList.remove('show');
}

function removeProvider(providerId) {
    selectedProviders = selectedProviders.filter(p => p.id !== providerId);
    renderSelectedProviders();
}

function renderSelectedProviders() {
    const container = document.getElementById('selected-providers');
    container.innerHTML = selectedProviders.map(provider => `
        <span class="provider-tag">
            ${provider.name}
            <button onclick="removeProvider(${provider.id})">&times;</button>
        </span>
    `).join('');
}

function saveProviderAssignment() {
    if (!currentZoneId) return;
    
    const zone = zones.find(z => z.id === currentZoneId);
    if (!zone) return;
    
    const providerError = document.getElementById('provider-error');
    const startDateError = document.getElementById('start-date-error');
    const endDateError = document.getElementById('end-date-error');
    const daysError = document.getElementById('days-error');
    
    // Validation
    let hasError = false;
    
    if (selectedProviders.length === 0) {
        providerError.textContent = 'Select at least one provider';
        providerError.classList.add('show');
        hasError = true;
    } else {
        providerError.classList.remove('show');
    }
    
    const startDate = document.getElementById('provider-start-date').value;
    const endDate = document.getElementById('provider-end-date').value;
    
    if (!startDate) {
        startDateError.textContent = 'Start date is required';
        startDateError.classList.add('show');
        hasError = true;
    } else {
        startDateError.classList.remove('show');
    }
    
    if (!endDate) {
        endDateError.textContent = 'End date is required';
        endDateError.classList.add('show');
        hasError = true;
    } else {
        endDateError.classList.remove('show');
    }
    
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        endDateError.textContent = 'End date must be after start date';
        endDateError.classList.add('show');
        hasError = true;
    }
    
    const activeDays = Array.from(document.querySelectorAll('#provider-form .day-checkbox input:checked'))
        .map(cb => cb.value);
    
    if (activeDays.length === 0) {
        daysError.textContent = 'Select at least one active day';
        daysError.classList.add('show');
        hasError = true;
    } else {
        daysError.classList.remove('show');
    }
    
    if (hasError) return;
    
    // Check for duplicate assignments
    const duplicates = selectedProviders.filter(sp => {
        return zone.providerAssignments?.some(assignment => 
            assignment.providerId === sp.id &&
            assignment.startDate === startDate &&
            assignment.endDate === endDate
        );
    });
    
    if (duplicates.length > 0) {
        providerError.textContent = `${duplicates[0].name} already assigned to this zone with these dates`;
        providerError.classList.add('show');
        return;
    }
    
    // Check for coverage gaps
    const biWeekly = document.getElementById('bi-weekly').checked;
    
    // Save assignments
    selectedProviders.forEach(provider => {
        const assignmentId = zone.providerAssignments?.length > 0 
            ? Math.max(...zone.providerAssignments.map(a => a.id)) + 1 
            : 1;
        
        const assignment = {
            id: assignmentId,
            providerId: provider.id,
            providerName: provider.name,
            startDate: startDate,
            endDate: endDate,
            activeDays: activeDays,
            biWeekly: biWeekly
        };
        
        if (!zone.providerAssignments) {
            zone.providerAssignments = [];
        }
        zone.providerAssignments.push(assignment);
    });
    
    // Check for gaps after adding
    const gaps = calculateCoverageGaps(zone, 90);
    if (gaps.length > 0) {
        showWarning(
            `This assignment may leave coverage gaps. Review the timeline to ensure continuous coverage.`,
            () => {
                closeModal('provider-modal');
                renderProvidersTab();
                renderTimelineTab();
                renderDashboard();
            }
        );
    } else {
        closeModal('provider-modal');
        renderProvidersTab();
        renderTimelineTab();
        renderDashboard();
    }
}

function editProviderAssignment(assignmentId) {
    if (!currentZoneId) return;
    
    const zone = zones.find(z => z.id === currentZoneId);
    if (!zone) return;
    
    const assignment = zone.providerAssignments?.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    editingProviderAssignmentId = assignmentId;
    
    document.getElementById('edit-provider-name').value = assignment.providerName;
    document.getElementById('edit-provider-start-date').value = assignment.startDate;
    document.getElementById('edit-provider-end-date').value = assignment.endDate;
    document.getElementById('edit-bi-weekly').checked = assignment.biWeekly;
    
    // Set active days
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
        document.getElementById(`edit-${day}`).checked = assignment.activeDays.includes(day);
    });
    
    document.getElementById('edit-provider-modal').classList.add('show');
}

function updateProviderAssignment() {
    if (!currentZoneId || !editingProviderAssignmentId) return;
    
    const zone = zones.find(z => z.id === currentZoneId);
    if (!zone) return;
    
    const assignment = zone.providerAssignments?.find(a => a.id === editingProviderAssignmentId);
    if (!assignment) return;
    
    const startDate = document.getElementById('edit-provider-start-date').value;
    const endDate = document.getElementById('edit-provider-end-date').value;
    const startDateError = document.getElementById('edit-start-date-error');
    const endDateError = document.getElementById('edit-end-date-error');
    const daysError = document.getElementById('edit-days-error');
    
    // Validation
    let hasError = false;
    
    if (!startDate) {
        startDateError.textContent = 'Start date is required';
        startDateError.classList.add('show');
        hasError = true;
    } else {
        startDateError.classList.remove('show');
    }
    
    if (!endDate) {
        endDateError.textContent = 'End date is required';
        endDateError.classList.add('show');
        hasError = true;
    } else {
        endDateError.classList.remove('show');
    }
    
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        endDateError.textContent = 'End date must be after start date';
        endDateError.classList.add('show');
        hasError = true;
    }
    
    const activeDays = Array.from(document.querySelectorAll('#edit-provider-form .day-checkbox input:checked'))
        .map(cb => cb.value);
    
    if (activeDays.length === 0) {
        daysError.textContent = 'Select at least one active day';
        daysError.classList.add('show');
        hasError = true;
    } else {
        daysError.classList.remove('show');
    }
    
    if (hasError) return;
    
    // Check for gaps
    const oldStartDate = assignment.startDate;
    const oldEndDate = assignment.endDate;
    
    assignment.startDate = startDate;
    assignment.endDate = endDate;
    assignment.activeDays = activeDays;
    assignment.biWeekly = document.getElementById('edit-bi-weekly').checked;
    
    const gaps = calculateCoverageGaps(zone, 90);
    if (gaps.length > 0) {
        showWarning(
            `This change would leave Zone ${zone.name} without coverage starting ${formatDate(gaps[0].start.toISOString().split('T')[0])}. Assign another provider first.`,
            () => {
                // Revert changes
                assignment.startDate = oldStartDate;
                assignment.endDate = oldEndDate;
                showWarning('Save blocked. Please resolve coverage gaps first.');
            }
        );
        return;
    }
    
    closeModal('edit-provider-modal');
    renderProvidersTab();
    renderTimelineTab();
    renderDashboard();
}

function removeProviderAssignment(assignmentId) {
    if (!currentZoneId) return;
    
    const zone = zones.find(z => z.id === currentZoneId);
    if (!zone) return;
    
    const assignment = zone.providerAssignments?.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    const remainingAssignments = zone.providerAssignments.filter(a => a.id !== assignmentId);
    
    if (remainingAssignments.length === 0) {
        showWarning(
            'Removing will leave zone without coverage. Continue?',
            () => {
                zone.providerAssignments = zone.providerAssignments.filter(a => a.id !== assignmentId);
                closeModal('warning-modal');
                renderProvidersTab();
                renderTimelineTab();
                renderDashboard();
            }
        );
    } else {
        zone.providerAssignments = remainingAssignments;
        renderProvidersTab();
        renderTimelineTab();
        renderDashboard();
    }
}

// Modal helpers
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    warningCallback = null;
}

function showWarning(message, callback = null) {
    document.getElementById('warning-message').textContent = message;
    warningCallback = callback;
    document.getElementById('warning-modal').classList.add('show');
}

function confirmWarning() {
    if (warningCallback) {
        warningCallback();
    } else {
        closeModal('warning-modal');
    }
}

// Overview Timeline
function renderOverviewTimeline() {
    const container = document.getElementById('overview-timeline-container');
    if (!container) return;
    
    const range = document.getElementById('overview-timeline-range')?.value || '60';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate, endDate;
    
    if (range === 'custom') {
        const customStart = document.getElementById('overview-custom-start-date')?.value;
        const customEnd = document.getElementById('overview-custom-end-date')?.value;
        if (customStart && customEnd) {
            startDate = new Date(customStart);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customEnd);
            endDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(today);
            endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 60);
        }
    } else {
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + parseInt(range));
    }
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dayWidth = 100 / totalDays;
    
    // Get filter values
    const searchTerm = document.getElementById('timeline-zone-search')?.value.toLowerCase() || '';
    const showGapsOnly = document.getElementById('timeline-show-gaps-only')?.checked || false;
    
    // Filter zones
    let filteredZones = zones.filter(zone => {
        // Search filter
        if (searchTerm) {
            const nameMatch = zone.name.toLowerCase().includes(searchTerm);
            const zipMatch = zone.zipCodes.some(zip => zip.includes(searchTerm));
            if (!nameMatch && !zipMatch) return false;
        }
        
        // Gap filter
        if (showGapsOnly) {
            const gaps = calculateCoverageGaps(zone, totalDays);
            if (gaps.length === 0) return false;
        }
        
        return true;
    });
    
    // Sort zones by gap days if needed
    if (currentSortColumn === 'timeline-gapDays') {
        filteredZones.sort((a, b) => {
            const gapsA = calculateCoverageGaps(a, totalDays);
            const gapsB = calculateCoverageGaps(b, totalDays);
            const daysA = gapsA.reduce((sum, gap) => sum + gap.days, 0);
            const daysB = gapsB.reduce((sum, gap) => sum + gap.days, 0);
            
            if (currentSortDirection === 'asc') {
                return daysA - daysB;
            } else {
                return daysB - daysA;
            }
        });
    }
    
    if (filteredZones.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No zones found matching your filters.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="overview-timeline-header">
            <div class="timeline-date-range">
                <i class="fas fa-calendar-alt"></i> ${formatDate(startDate.toISOString().split('T')[0])} - ${formatDate(endDate.toISOString().split('T')[0])}
            </div>
            <div class="timeline-legend">
                <span class="legend-item">
                    <span class="legend-color" style="background: #10b981;"></span> Coverage
                </span>
                <span class="legend-item">
                    <span class="legend-color" style="background: #dc2626;"></span> Gap
                </span>
            </div>
        </div>
        <div class="overview-timeline-wrapper">
            <div class="overview-timeline-scroll" id="overview-timeline-scroll">
                <div class="overview-timeline-date-header">
                    <div class="timeline-date-header-spacer">
                        <div class="spacer-zone-name"></div>
                        <div class="spacer-gap-days"></div>
                    </div>
                    <div class="timeline-date-header-dates">
                        ${renderDayByDayDates(startDate, endDate, today, 'overview')}
                    </div>
                </div>
                <div class="overview-timeline-zones">
                    <div class="timeline-zones-header">
                        <div class="timeline-zone-name-header">
                            <span>Zone Name</span>
                            <button class="sort-btn" onclick="sortTimelineZones('name')">
                                <i class="fas fa-sort" id="sort-icon-timeline-name"></i>
                            </button>
                        </div>
                        <div class="timeline-zone-gap-days-header">
                            <span>Days Without Coverage</span>
                            <button class="sort-btn" onclick="sortTimelineZones('gapDays')">
                                <i class="fas fa-sort" id="sort-icon-timeline-gapDays"></i>
                            </button>
                        </div>
                    </div>
                    ${filteredZones.map(zone => renderZoneTimelineRow(zone, startDate, endDate, dayWidth, today)).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderDayByDayDates(startDate, endDate, today, context = 'overview') {
    const startNormalized = new Date(startDate);
    startNormalized.setHours(0, 0, 0, 0);
    const endNormalized = new Date(endDate);
    endNormalized.setHours(0, 0, 0, 0);
    const totalDays = Math.ceil((endNormalized - startNormalized) / (1000 * 60 * 60 * 24));
    
    const todayNormalized = new Date(today);
    todayNormalized.setHours(0, 0, 0, 0);
    
    let html = '';
    const dayWidth = 100 / totalDays;
    
    // For longer ranges, show every few days; for shorter ranges, show every day
    const showInterval = totalDays > 60 ? 7 : totalDays > 30 ? 3 : 1;
    
    for (let i = 0; i <= totalDays; i += showInterval) {
        const currentDate = new Date(startNormalized);
        currentDate.setDate(currentDate.getDate() + i);
        currentDate.setHours(0, 0, 0, 0);
        
        if (currentDate > endNormalized) break;
        
        const left = (i / totalDays) * 100;
        const width = dayWidth * showInterval;
        const isToday = currentDate.getTime() === todayNormalized.getTime();
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfMonth = currentDate.getDate();
        const month = currentDate.toLocaleDateString('en-US', { month: 'short' });
        
        html += `
            <div class="timeline-day-cell ${isToday ? 'today-cell' : ''}" 
                 style="left: ${left}%; width: ${width}%;"
                 onclick="highlightDateColumnByCell(this, ${i}, ${left}, ${width}, '${dateStr}')"
                 data-date-index="${i}"
                 data-date-left="${left}"
                 data-date-width="${width}"
                 data-context="${context}">
                <div class="day-number">${dayOfMonth}</div>
                <div class="day-month">${month}</div>
                ${isToday ? '<div class="today-badge">Today</div>' : ''}
            </div>
        `;
    }
    
    return html;
}

function renderZoneTimelineRow(zone, startDate, endDate, dayWidth, today) {
    const startNormalized = new Date(startDate);
    startNormalized.setHours(0, 0, 0, 0);
    const endNormalized = new Date(endDate);
    endNormalized.setHours(0, 0, 0, 0);
    const totalDays = (endNormalized - startNormalized) / (1000 * 60 * 60 * 24);
    
    // Get all assignments and gaps
    const assignments = zone.providerAssignments || [];
    const gaps = calculateCoverageGaps(zone, totalDays);
    const gapDays = gaps.reduce((sum, gap) => sum + gap.days, 0);
    
    // Build timeline segments
    const segments = [];
    
    // Add coverage periods from assignments
    assignments.forEach(assignment => {
        const assignmentStart = new Date(assignment.startDate);
        assignmentStart.setHours(0, 0, 0, 0);
        const assignmentEnd = new Date(assignment.endDate);
        assignmentEnd.setHours(0, 0, 0, 0);
        
        const displayStart = assignmentStart < startNormalized ? startNormalized : assignmentStart;
        const displayEnd = assignmentEnd > endNormalized ? endNormalized : assignmentEnd;
        
        if (displayStart <= endNormalized && displayEnd >= startNormalized) {
            segments.push({
                start: displayStart,
                end: displayEnd,
                type: 'coverage'
            });
        }
    });
    
    // Add gap periods
    gaps.forEach(gap => {
        const gapStart = new Date(gap.start);
        gapStart.setHours(0, 0, 0, 0);
        const gapEnd = new Date(gap.end);
        gapEnd.setHours(0, 0, 0, 0);
        
        const displayStart = gapStart < startNormalized ? startNormalized : gapStart;
        const displayEnd = gapEnd > endNormalized ? endNormalized : gapEnd;
        
        if (displayStart <= endNormalized && displayEnd >= startNormalized) {
            segments.push({
                start: displayStart,
                end: displayEnd,
                type: 'gap'
            });
        }
    });
    
    // Sort all segments by start date
    segments.sort((a, b) => a.start - b.start);
    
    // Build the bar HTML
    let barHtml = '';
    let currentPos = 0;
    
    // If no segments, show full gap
    if (segments.length === 0) {
        barHtml = `<div class="timeline-gap-bar" style="left: 0%; width: 100%;"></div>`;
    } else {
        segments.forEach(segment => {
            const daysFromStart = (segment.start - startNormalized) / (1000 * 60 * 60 * 24);
            const daysDuration = (segment.end - segment.start) / (1000 * 60 * 60 * 24);
            
            const left = (daysFromStart / totalDays) * 100;
            const width = (daysDuration / totalDays) * 100;
            
            // Fill gap before this segment if needed
            if (left > currentPos) {
                const gapLeft = currentPos;
                const gapWidth = left - currentPos;
                const gapDays = Math.ceil(gapWidth * totalDays / 100);
                barHtml += `<div class="timeline-gap-bar" 
                    style="left: ${gapLeft}%; width: ${gapWidth}%;" 
                    title="Gap: ${gapDays} day(s)"></div>`;
            }
            
            if (segment.type === 'coverage') {
                barHtml += `<div class="timeline-coverage-bar" 
                    style="left: ${left}%; width: ${width}%;" 
                    title="Coverage: ${formatDate(segment.start.toISOString().split('T')[0])} to ${formatDate(segment.end.toISOString().split('T')[0])}"></div>`;
            } else {
                const gapDays = Math.ceil((segment.end - segment.start) / (1000 * 60 * 60 * 24));
                barHtml += `<div class="timeline-gap-bar" 
                    style="left: ${left}%; width: ${width}%;" 
                    title="Gap: ${formatDate(segment.start.toISOString().split('T')[0])} to ${formatDate(segment.end.toISOString().split('T')[0])} (${gapDays} days)"></div>`;
            }
            
            currentPos = left + width;
        });
        
        // Fill remaining gap at the end if needed
        if (currentPos < 100) {
            const gapLeft = currentPos;
            const gapWidth = 100 - currentPos;
            const gapDays = Math.ceil(gapWidth * totalDays / 100);
            barHtml += `<div class="timeline-gap-bar" 
                style="left: ${gapLeft}%; width: ${gapWidth}%;" 
                title="Gap: ${gapDays} day(s)"></div>`;
        }
    }
    
    return `
        <div class="zone-timeline-row" onclick="showZoneDetail(${zone.id}, 'timeline')">
            <div class="zone-timeline-name">${zone.name}</div>
            <div class="zone-timeline-gap-days">
                ${gapDays > 0 ? 
                    `<span class="gap-days-count">${gapDays} days</span>` : 
                    '<span class="no-gap">0 days</span>'
                }
            </div>
            <div class="zone-timeline-bar-container">
                ${barHtml}
            </div>
        </div>
    `;
}

function sortTimelineZones(column) {
    if (currentSortColumn === `timeline-${column}`) {
        // Toggle direction
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = `timeline-${column}`;
        currentSortDirection = 'asc';
    }
    
    // Update sort icons
    document.querySelectorAll('.timeline-zones-header .sort-btn i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    const sortIcon = document.getElementById(`sort-icon-timeline-${column}`);
    if (sortIcon) {
        sortIcon.className = currentSortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
    
    renderOverviewTimeline();
}

function handleOverviewGapClick(zoneIds) {
    if (zoneIds.length === 1) {
        showZoneDetail(zoneIds[0]);
    } else {
        // If multiple zones, show the first one
        showZoneDetail(zoneIds[0]);
    }
}

function updateOverviewTimeline() {
    const range = document.getElementById('overview-timeline-range').value;
    const customInputs = document.getElementById('overview-custom-range-inputs');
    
    if (range === 'custom') {
        customInputs.style.display = 'flex';
        return;
    } else {
        customInputs.style.display = 'none';
    }
    
    renderOverviewTimeline();
}

function applyOverviewCustomRange() {
    const startDate = document.getElementById('overview-custom-start-date').value;
    const endDate = document.getElementById('overview-custom-end-date').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    if (new Date(endDate) < new Date(startDate)) {
        alert('End date must be after start date');
        return;
    }
    
    renderOverviewTimeline();
}

function highlightDateColumnByCell(cellElement, dateIndex, left, width, dateStr) {
    // Remove existing highlights
    document.querySelectorAll('.date-column-highlight').forEach(el => {
        if (el.id !== 'unified-date-column-highlight') {
            el.remove();
        }
    });
    
    if (!cellElement) return;
    
    // Determine context (overview, unified, provider, or summary timeline)
    const context = cellElement.getAttribute('data-context') || 'overview';
    
    let wrapper, dateHeaderDates, spacerWidth;
    
    if (context === 'unified') {
        wrapper = document.getElementById('unified-timeline-scroll');
        dateHeaderDates = document.getElementById('unified-date-header-dates');
        spacerWidth = 330; // 180px provider name + 150px gap days
    } else if (context === 'provider') {
        wrapper = document.getElementById('provider-timeline-scroll');
        dateHeaderDates = wrapper?.querySelector('.provider-date-header-dates');
        spacerWidth = 330; // 180px provider name + 150px gap days
    } else if (context === 'summary') {
        wrapper = document.getElementById('zone-summary-timeline-scroll');
        dateHeaderDates = wrapper?.querySelector('.summary-date-header-dates');
        spacerWidth = 350; // 200px zone name + 150px gap days
    } else {
        wrapper = document.getElementById('overview-timeline-scroll');
        dateHeaderDates = wrapper?.querySelector('.timeline-date-header-dates');
        spacerWidth = 330; // 180px zone name + 150px gap days
    }
    
    if (!wrapper || !dateHeaderDates) return;
    
    // Get the cell's position relative to the dates container
    const cellRect = cellElement.getBoundingClientRect();
    const datesRect = dateHeaderDates.getBoundingClientRect();
    const relativeLeft = cellRect.left - datesRect.left;
    const cellWidth = cellRect.width;
    
    let highlight;
    if (context === 'unified') {
        highlight = document.getElementById('unified-date-column-highlight');
        if (!highlight) {
            highlight = document.createElement('div');
            highlight.id = 'unified-date-column-highlight';
            wrapper.appendChild(highlight);
        }
    } else {
        highlight = document.createElement('div');
        wrapper.appendChild(highlight);
    }
    
    highlight.className = 'date-column-highlight';
    highlight.style.display = 'block';
    
    // Position relative to the scroll container, accounting for the spacer
    highlight.style.left = `${spacerWidth + relativeLeft}px`;
    highlight.style.width = `${cellWidth}px`;
    highlight.setAttribute('data-date', dateStr);
    
    // Add click handler to remove highlight when clicking outside
    setTimeout(() => {
        const removeHighlight = (e) => {
            if (!e.target.closest('.timeline-day-cell') && !e.target.closest('.date-column-highlight')) {
                if (context === 'unified') {
                    highlight.style.display = 'none';
                } else {
                    highlight.remove();
                }
                document.removeEventListener('click', removeHighlight);
            }
        };
        document.addEventListener('click', removeHighlight);
    }, 0);
}

function clearDateHighlight() {
    const highlight = document.getElementById('unified-date-column-highlight');
    if (highlight) {
        highlight.style.display = 'none';
    }
    document.querySelectorAll('.date-column-highlight').forEach(el => {
        if (el.id !== 'unified-date-column-highlight') {
            el.remove();
        }
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
