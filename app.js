// Data and state management
let currentTab = 'bundles';
let isDarkMode = false;
let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
let currentTransaction = null; // Track the selected package

const packages = {
    bundles: [
        { id: 'b1', title: '1GB for 1hr @19', price: 'KES 19', offer_ussd: '*180*5*2*pppp*5*1#' },
        { id: 'b2', title: '250mb for 24hrs @20', price: 'KES 20', offer_ussd: '*180*5*2*pppp*5*2#' },
        { id: 'b3', title: '1GB for 1hr @22', price: 'KES 22', offer_ussd: '*180*5*2*pppp*5*3#' },
        { id: 'b4', title: '1.25gb till midnight @55', price: 'KES 55', offer_ussd: '*180*5*2*pppp*5*4#' }
    ],
    minutes: [
        { id: 'm1', title: '50minutes till midnight @51', price: 'KES 51', offer_ussd: '*180*5*2*pppp*5*5#' }
    ],
    sms: [
        { id: 's1', title: '20 SMS @5', price: 'KES 5', offer_ussd: '*180*5*2*pppp*5*6#' },
        { id: 's2', title: '200 sms @10', price: 'KES 10', offer_ussd: '*180*5*2*pppp*5*7#' },
        { id: 's3', title: '1000sms weekly @30', price: 'KES 30', offer_ussd: '*180*5*2*pppp*5*8#' }
    ]
};

// STK Push Function
async function initiateStkPush(amount, phoneNumber) {
    try {
        const response = await axios.post(
            'https://backend.payhero.co.ke/api/v2/payments',
            {
                amount: amount,
                phone_number: phoneNumber,
                channel_id: 1832,
                provider: 'm-pesa',
                external_reference: 'INV-' + Date.now().toString(),
                callback_url: 'https://softcash.co.ke/billing/callbackurl.php'
            },
            {
                auth: {
                    username: 'rEAQi0wjjIqMSsgWkPyF',
                    password: 'uPr5lvJJ7GRMSGpveyWInmwzAG2gcFzUgCctgRX4'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('STK Push Error:', error);
        throw new Error('STK Push failed: ' + (error.response?.data?.message || error.message));
    }
}

// Open Purchase Modal
function openPurchaseModal(title, price, ussd) {
    currentTransaction = { title, price, ussd }; // Store the selected package
    document.getElementById('modalTitle').textContent = `Purchase ${title}`;
    document.getElementById('modalSubtitle').textContent = 'You will receive the bundle once payment is confirmed.';
    document.getElementById('purchaseModal').style.display = 'flex';
}

// Close Modals
function closeModals() {
    document.getElementById('purchaseModal').style.display = 'none';
    document.getElementById('responseModal').style.display = 'none';
}

// Handle Purchase
async function handlePurchase() {
    const phoneReceive = document.getElementById('phoneReceive').value;
    const phonePay = document.getElementById('phonePay').value;

    if (!validatePhones(phoneReceive, phonePay)) {
        showResponse('Please enter valid 10-digit phone numbers');
        return;
    }

    showLoading(true);

    try {
        // Parse the amount from the package price
        const amount = parsePrice(currentTransaction.price);

        // Initiate STK Push
        const stkResponse = await initiateStkPush(amount, phonePay);

        // If STK Push is successful, proceed with the purchase
        if (stkResponse.success) {
            const response = await makeApiCall({
                ...currentTransaction,
                phoneReceive,
                phonePay
            });

            showResponse('Payment initiated successfully. ' + (response.status || 'Purchase successful'));
            addTransaction(response);
        } else {
            showResponse('STK Push failed: ' + stkResponse.message);
        }
    } catch (error) {
        showResponse(error.message || 'Purchase failed: Unknown error');
    } finally {
        showLoading(false);
    }
}

// Helper function to parse price
function parsePrice(priceString) {
    return parseInt(priceString.replace('KES ', ''), 10);
}

// Validate phone numbers
function validatePhones(receive, pay) {
    return /^\d{10}$/.test(receive) && /^\d{10}$/.test(pay);
}

// Show loading state
function showLoading(show) {
    const button = document.getElementById('confirmPurchase');
    button.innerHTML = show ? '<div class="spinner"></div>' : 'PURCHASE BUNDLE';
    button.disabled = show;
}

// Show response in modal
function showResponse(message) {
    const responseEl = document.getElementById('responseText');
    responseEl.innerHTML = message;
    responseEl.style.color = message.toLowerCase().includes('fail') ? '#ff4444' : '#2E7D32';
    document.getElementById('purchaseModal').style.display = 'none';
    document.getElementById('responseModal').style.display = 'flex';
}

// Add transaction to history
function addTransaction(response) {
    const transaction = {
        id: new Date().toISOString(),
        packageTitle: currentTransaction.title,
        offer_amount: parsePrice(currentTransaction.price),
        response: response.status || 'No status',
        timestamp: new Date().toLocaleString()
    };

    transactions.unshift(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Render Packages
function renderPackages(type) {
    const items = packages[type];
    const html = `
        <h2>${type.charAt(0).toUpperCase() + type.slice(1)}</h2>
        ${items.map(item => `
            <div class="package-item">
                <div>
                    <h3>${item.title}</h3>
                    <p>${item.price}</p>
                </div>
                <button class="button primary-button" 
                    onclick="openPurchaseModal('${item.title}', '${item.price}', '${item.offer_ussd}')">
                    PURCHASE
                </button>
            </div>
        `).join('')}
    `;
    document.getElementById('content').innerHTML = html;
}

// Render Content Based on Tab
function renderContent() {
    switch (currentTab) {
        case 'bundles':
        case 'minutes':
        case 'sms':
            renderPackages(currentTab);
            break;
        case 'history':
            renderHistory();
            break;
        case 'about':
            renderAbout();
            break;
    }
}

// Initialize app
function init() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').checked = true;
    }
    renderContent();
}

// Event listeners
document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        renderContent();
    });
});

document.getElementById('themeToggle').addEventListener('change', toggleTheme);
document.getElementById('confirmPurchase').addEventListener('click', handlePurchase);
document.getElementById('cancelPurchase').addEventListener('click', closeModals);
document.getElementById('closeResponse').addEventListener('click', closeModals);

init();
