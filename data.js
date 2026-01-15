// Dummy realistic data for Zone Management Tool

// Available ZIP codes (Seattle area)
const availableZipCodes = [
    '98101', '98102', '98103', '98104', '98105', '98106', '98107', '98108', '98109', '98110',
    '98111', '98112', '98113', '98114', '98115', '98116', '98117', '98118', '98119', '98121',
    '98122', '98124', '98125', '98126', '98127', '98129', '98131', '98132', '98133', '98134',
    '98136', '98138', '98139', '98141', '98144', '98145', '98146', '98148', '98154', '98155',
    '98158', '98160', '98161', '98164', '98165', '98166', '98168', '98170', '98174', '98175',
    '98177', '98178', '98181', '98184', '98185', '98188', '98190', '98191', '98194', '98195',
    '98198', '98199'
];

// Providers from credentialing system
const providers = [
    { id: 1, name: 'Dr. Sarah Kim', specialty: 'PCP', credentialingStatus: 'Active' },
    { id: 2, name: 'Dr. Michael Chen', specialty: 'PCP', credentialingStatus: 'Active' },
    { id: 3, name: 'Dr. Emily Rodriguez', specialty: 'PCP', credentialingStatus: 'Active' },
    { id: 4, name: 'Dr. James Wilson', specialty: 'PCP', credentialingStatus: 'Active' },
    { id: 5, name: 'Dr. Lisa Anderson', specialty: 'PCP', credentialingStatus: 'Active' },
    { id: 6, name: 'Dr. Robert Martinez', specialty: 'PCP', credentialingStatus: 'Active' },
    { id: 7, name: 'Dr. Jennifer Taylor', specialty: 'PCP', credentialingStatus: 'Active' },
    { id: 8, name: 'Dr. David Brown', specialty: 'PCP', credentialingStatus: 'Active' },
    { id: 9, name: 'Dr. Amanda White', specialty: 'PCP', credentialingStatus: 'Active' },
    { id: 10, name: 'Dr. Christopher Lee', specialty: 'PCP', credentialingStatus: 'Active' }
];

// Dummy patients
const generatePatients = () => {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica', 'William', 'Ashley', 'James', 'Amanda', 'Daniel', 'Melissa', 'Matthew', 'Nicole', 'Christopher', 'Michelle', 'Andrew', 'Stephanie'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee'];
    
    const patients = [];
    const usedZips = ['98101', '98102', '98103', '98104', '98105', '98106', '98107', '98108', '98115', '98116', '98117', '98118', '98119', '98122', '98125', '98126', '98133', '98136', '98144', '98146'];
    
    for (let i = 0; i < 200; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const zip = usedZips[Math.floor(Math.random() * usedZips.length)];
        const phone = `206-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
        
        patients.push({
            id: i + 1,
            name: `${firstName} ${lastName}`,
            phone: phone,
            zipCode: zip,
            address: `${Math.floor(Math.random() * 9999) + 1} Main St, Seattle, WA ${zip}`
        });
    }
    
    return patients;
};

const allPatients = generatePatients();

// Initial zones with realistic data
let zones = [
    {
        id: 1,
        name: 'North Seattle',
        zipCodes: ['98103', '98115', '98117', '98125', '98133'],
        providerAssignments: [
            {
                id: 1,
                providerId: 1,
                providerName: 'Dr. Sarah Kim',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                activeDays: ['monday', 'wednesday', 'friday'],
                biWeekly: false
            },
            {
                id: 2,
                providerId: 2,
                providerName: 'Dr. Michael Chen',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                activeDays: ['tuesday', 'thursday'],
                biWeekly: false
            }
        ],
        appointments: [
            { id: 1, patientId: 1, date: '2024-12-15', providerId: 1 },
            { id: 2, patientId: 2, date: '2024-12-20', providerId: 2 }
        ]
    },
    {
        id: 2,
        name: 'Central Seattle',
        zipCodes: ['98101', '98102', '98104', '98122', '98144'],
        providerAssignments: [
            {
                id: 3,
                providerId: 3,
                providerName: 'Dr. Emily Rodriguez',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                biWeekly: false
            },
            {
                id: 4,
                providerId: 4,
                providerName: 'Dr. James Wilson',
                startDate: '2024-06-01',
                endDate: '2024-12-31',
                activeDays: ['monday', 'wednesday', 'friday'],
                biWeekly: true
            }
        ],
        appointments: [
            { id: 3, patientId: 5, date: '2024-12-18', providerId: 3 },
            { id: 4, patientId: 6, date: '2024-12-22', providerId: 4 }
        ]
    },
    {
        id: 3,
        name: 'South Seattle',
        zipCodes: ['98106', '98108', '98118', '98126', '98146'],
        providerAssignments: [
            {
                id: 5,
                providerId: 5,
                providerName: 'Dr. Lisa Anderson',
                startDate: '2024-01-01',
                endDate: '2024-11-30',
                activeDays: ['monday', 'wednesday', 'friday'],
                biWeekly: false
            },
            {
                id: 6,
                providerId: 6,
                providerName: 'Dr. Robert Martinez',
                startDate: '2024-12-01',
                endDate: '2024-12-31',
                activeDays: ['monday', 'wednesday', 'friday'],
                biWeekly: false
            }
        ],
        appointments: [
            { id: 5, patientId: 10, date: '2024-12-19', providerId: 5 }
        ]
    },
    {
        id: 4,
        name: 'West Seattle',
        zipCodes: ['98116', '98136', '98146'],
        providerAssignments: [
            {
                id: 7,
                providerId: 7,
                providerName: 'Dr. Jennifer Taylor',
                startDate: '2024-01-01',
                endDate: '2024-08-15',
                activeDays: ['tuesday', 'thursday'],
                biWeekly: false
            }
        ],
        appointments: []
    }
];

// Helper functions
function getPatientsInZone(zone) {
    return allPatients.filter(patient => zone.zipCodes.includes(patient.zipCode));
}

function getPatientsInMultipleZones() {
    const patientZoneMap = {};
    zones.forEach(zone => {
        const patients = getPatientsInZone(zone);
        patients.forEach(patient => {
            if (!patientZoneMap[patient.id]) {
                patientZoneMap[patient.id] = [];
            }
            patientZoneMap[patient.id].push(zone.id);
        });
    });
    
    return Object.keys(patientZoneMap).filter(patientId => 
        patientZoneMap[patientId].length > 1
    ).length;
}

function calculateCoverageGaps(zone, days = 90) {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    
    const gaps = [];
    const assignments = zone.providerAssignments || [];
    
    if (assignments.length === 0) {
        return [{ start: today, end: endDate, days: days }];
    }
    
    // Sort assignments by start date
    const sortedAssignments = [...assignments].sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
    );
    
    // Check for gaps
    let currentDate = new Date(today);
    
    for (let i = 0; i < sortedAssignments.length; i++) {
        const assignment = sortedAssignments[i];
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        
        // Check gap before this assignment
        if (assignmentStart > currentDate && currentDate < endDate) {
            const gapStart = new Date(currentDate);
            const gapEnd = assignmentStart < endDate ? assignmentStart : endDate;
            const gapDays = Math.ceil((gapEnd - gapStart) / (1000 * 60 * 60 * 24));
            if (gapDays > 0) {
                gaps.push({ start: gapStart, end: gapEnd, days: gapDays });
            }
        }
        
        // Update current date to end of this assignment if it extends further
        if (assignmentEnd > currentDate) {
            currentDate = new Date(assignmentEnd);
        }
    }
    
    // Check for gap after last assignment
    if (currentDate < endDate) {
        const gapDays = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));
        if (gapDays > 0) {
            gaps.push({ start: currentDate, end: endDate, days: gapDays });
        }
    }
    
    return gaps;
}

function getTotalCoverageGaps() {
    let totalGaps = 0;
    zones.forEach(zone => {
        const gaps = calculateCoverageGaps(zone, 90);
        totalGaps += gaps.length;
    });
    return totalGaps;
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        zones,
        providers,
        allPatients,
        availableZipCodes,
        getPatientsInZone,
        getPatientsInMultipleZones,
        calculateCoverageGaps,
        getTotalCoverageGaps
    };
}
