// Global state
let currentView = 'dashboard';
let currentZoneId = null;
let editingZoneId = null;
let editingProviderAssignmentId = null;
let selectedZipCodes = [];
let selectedProviders = [];
let warningCallback = null;

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
    } catch (error) {
        console.error('Error rendering dashboard:', error);
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
    tbody.innerHTML = '';
    
    zones.forEach(zone => {
        const patients = getPatientsInZone(zone);
        const providerCount = zone.providerAssignments?.length || 0;
        const ratio = providerCount > 0 ? Math.round(patients.length / providerCount) : 0;
        const gaps = calculateCoverageGaps(zone, 90);
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
function showZoneDetail(zoneId) {
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
    
    // Show first tab
    showDetailTab('providers');
    
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
    
    if (range === 'custom') {
        const customStart = document.getElementById('custom-start-date').value;
        const customEnd = document.getElementById('custom-end-date').value;
        if (customStart && customEnd) {
            startDate = new Date(customStart);
            endDate = new Date(customEnd);
        } else {
            startDate = new Date(today);
            endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 90);
        }
    } else {
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + parseInt(range));
    }
    
    const assignments = zone.providerAssignments || [];
    const gaps = calculateCoverageGaps(zone, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dayWidth = 100 / totalDays;
    
    container.innerHTML = `
        <div class="timeline-header">
            <div class="timeline-date-range">
                ${formatDate(startDate.toISOString().split('T')[0])} - ${formatDate(endDate.toISOString().split('T')[0])}
            </div>
        </div>
        <div class="timeline-grid" id="timeline-grid">
            ${renderTimelineBars(assignments, startDate, endDate, dayWidth)}
            ${renderTimelineGaps(gaps, startDate, endDate, dayWidth)}
            ${renderTodayIndicator(today, startDate, endDate, dayWidth)}
        </div>
    `;
    
    if (assignments.length === 0 && gaps.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <p>No providers assigned. Add a provider to get started.</p>
            </div>
        `;
    }
}

function renderTimelineBars(assignments, startDate, endDate, dayWidth) {
    let html = '';
    let yOffset = 0;
    const barHeight = 40;
    const spacing = 10;
    
    assignments.forEach((assignment, index) => {
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        
        // Only show if overlaps with view range
        if (assignmentEnd < startDate || assignmentStart > endDate) return;
        
        const displayStart = assignmentStart < startDate ? startDate : assignmentStart;
        const displayEnd = assignmentEnd > endDate ? endDate : assignmentEnd;
        
        const left = ((displayStart - startDate) / (1000 * 60 * 60 * 24)) * dayWidth;
        const width = ((displayEnd - displayStart) / (1000 * 60 * 60 * 24)) * dayWidth;
        
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
    let yOffset = 0;
    const barHeight = 40;
    
    gaps.forEach(gap => {
        const gapStart = gap.start < startDate ? startDate : gap.start;
        const gapEnd = gap.end > endDate ? endDate : gap.end;
        
        const left = ((gapStart - startDate) / (1000 * 60 * 60 * 24)) * dayWidth;
        const width = ((gapEnd - gapStart) / (1000 * 60 * 60 * 24)) * dayWidth;
        
        html += `
            <div class="timeline-gap" 
                 style="left: ${left}%; width: ${width}%; top: ${yOffset}px;"
                 onclick="handleGapClick('${gap.start.toISOString().split('T')[0]}', '${gap.end.toISOString().split('T')[0]}')"
                 title="No coverage - ${gap.days} days">
                No coverage - ${gap.days} days
            </div>
        `;
        
        yOffset += barHeight + 10;
    });
    
    return html;
}

function renderTodayIndicator(today, startDate, endDate, dayWidth) {
    if (today < startDate || today > endDate) return '';
    
    const left = ((today - startDate) / (1000 * 60 * 60 * 24)) * dayWidth;
    
    return `
        <div class="today-indicator" style="left: ${left}%;">
            <div class="today-label">Today</div>
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

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
