// REST Countries Explorer - Main JavaScript File
// Modular functions for API fetching, rendering, modal, favorites, and sorting

// Global state management
let allCountries = [];      // Store all fetched countries
let favorites = [];          // Favorite country codes (from localStorage)
let currentSort = 'a-z';     // Current sort method
let showFavoritesOnly = false;
let currentPage = 1;
const itemsPerPage = 20;

// DOM elements
const searchInput = document.getElementById('searchInput');
const countriesGrid = document.getElementById('countriesGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const noResults = document.getElementById('noResults');
const sortSelect = document.getElementById('sortSelect');
const favoritesFilter = document.getElementById('favoritesFilter');
const backToHome = document.getElementById('backToHome');
const activeFilterBadge = document.getElementById('activeFilterBadge');
const pagination = document.getElementById('pagination');
const countryModal = document.getElementById('countryModal');
const modalContent = document.getElementById('modalContent');
const modalTitle = document.getElementById('modalTitle');
const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
const closeModal = document.getElementById('closeModal');
const modalBackdrop = document.getElementById('modalBackdrop');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  console.log('REST Countries Explorer initialized');
  loadFavorites();
  setupEventListeners();
  fetchCountries();
});

// Setup all event listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Search functionality
  searchInput.addEventListener('input', handleSearch);
  
  // Sort functionality
  sortSelect.addEventListener('change', handleSortChange);
  
  // Favorites filter
  favoritesFilter.addEventListener('click', toggleFavoritesFilter);
  backToHome.addEventListener('click', toggleFavoritesFilter);
  
  // Modal functionality
  closeModal.addEventListener('click', closeModalHandler);
  modalBackdrop.addEventListener('click', closeModalHandler);
  modalFavoriteBtn.addEventListener('click', handleModalFavorite);
  
  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !countryModal.classList.contains('hidden')) {
      closeModalHandler();
    }
  });
  
  console.log('Event listeners set up successfully');
}

// Fetch countries from REST Countries API with fallback
async function fetchCountries() {
  try {
    showLoading();
    
    // According to documentation, we MUST specify fields for /all endpoint
    // Maximum 10 fields allowed to avoid bad request
    const essentialFields = 'name,flags,capital,region,population,cca3,languages,currencies,timezones,area';
    
    console.log('Fetching from REST Countries API v3.1 with required fields...');
    let response = await fetch(`https://restcountries.com/v3.1/all?fields=${essentialFields}`);
    
    // Fallback to v2 if v3.1 fails
    if (!response.ok) {
      console.log(`v3.1 API failed with status: ${response.status}, trying v2 fallback...`);
      response = await fetch('https://restcountries.com/v2/all');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('API request successful!');
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received from API');
    }
    
    // Debug: Log first country to see what we're getting
    if (data.length > 0) {
      console.log('First country from API:', data[0]);
      console.log('First country languages:', data[0].languages);
      console.log('First country currencies:', data[0].currencies);
      console.log('First country timezones:', data[0].timezones);
    }
    
    // Since we're using v3.1 API with limited fields, we need to enhance the data
    // Add missing fields with default values for modal functionality
    allCountries = data.map(country => {
      // Check if this is v2 API data (has alpha3Code instead of cca3)
      if (country.alpha3Code && !country.cca3) {
        // This is v2 API data, normalize it
        return {
          ...country,
          cca3: country.alpha3Code,
          name: typeof country.name === 'string' ? { common: country.name } : country.name,
          flags: country.flag ? { png: country.flag, alt: `${country.name} flag` } : country.flags
        };
      }
      
      // This is v3.1 API data with limited fields, add missing fields
      return {
        ...country,
        // Add missing fields with defaults for modal
        borders: country.borders || [],
        maps: country.maps || { googleMaps: null, openStreetMaps: null },
        latlng: country.latlng || null,
        capitalInfo: country.capitalInfo || null,
        subregion: country.subregion || null,
        nativeName: country.nativeName || null
      };
    });
    
    console.log(`Successfully fetched ${allCountries.length} countries`);
    
    // Apply current filters and render
    applyFiltersAndSort();
    hideLoading();
    
  } catch (error) {
    console.error('Error fetching countries:', error);
    hideLoading();
    
           // Show specific error message based on error type
           let errorMessage = 'Gagal memuat data negara. ';
           if (error.name === 'TypeError' && error.message.includes('fetch')) {
             errorMessage += 'Periksa koneksi internet Anda.';
           } else if (error.message.includes('HTTP error')) {
             errorMessage += 'Kesalahan server. Silakan coba lagi nanti.';
           } else {
             errorMessage += 'Silakan coba lagi nanti.';
           }
    
    showError(errorMessage);
  }
}

// Show loading indicator
function showLoading() {
  loadingIndicator.classList.remove('hidden');
  countriesGrid.classList.add('hidden');
  noResults.classList.add('hidden');
}

// Hide loading indicator
function hideLoading() {
  loadingIndicator.classList.add('hidden');
  countriesGrid.classList.remove('hidden');
}

// Show error message with retry button
function showError(message) {
  noResults.innerHTML = `
    <div class="text-6xl mb-4">⚠️</div>
    <h3 class="text-xl font-semibold text-gray-700 mb-2">Terjadi Kesalahan</h3>
    <p class="text-gray-500 mb-4">${message}</p>
    <button 
      onclick="fetchCountries()" 
      class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
    >
      🔄 Coba Lagi
    </button>
  `;
  noResults.classList.remove('hidden');
}

// Handle search input
function handleSearch() {
  currentPage = 1; // Reset to first page
  applyFiltersAndSort();
}

// Handle sort change
function handleSortChange() {
  currentSort = sortSelect.value;
  currentPage = 1; // Reset to first page
  applyFiltersAndSort();
}

// Toggle favorites filter
function toggleFavoritesFilter() {
  showFavoritesOnly = !showFavoritesOnly;
  currentPage = 1; // Reset to first page
  
  if (showFavoritesOnly) {
    favoritesFilter.classList.add('hidden');
    backToHome.classList.remove('hidden');
    activeFilterBadge.classList.remove('hidden');
    favoritesFilter.textContent = '⭐ Show Favorites';
  } else {
    favoritesFilter.classList.remove('hidden');
    backToHome.classList.add('hidden');
    activeFilterBadge.classList.add('hidden');
    favoritesFilter.textContent = '⭐ Show Favorites';
  }
  
  applyFiltersAndSort();
}

// Apply filters, sorting, and pagination
function applyFiltersAndSort() {
  let filteredCountries = [...allCountries];
  
  // Apply search filter
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    filteredCountries = filteredCountries.filter(country => 
      country.name.common.toLowerCase().includes(searchTerm) ||
      (country.capital && country.capital[0] && country.capital[0].toLowerCase().includes(searchTerm)) ||
      country.region.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply favorites filter
  if (showFavoritesOnly) {
    filteredCountries = filteredCountries.filter(country => 
      favorites.includes(country.cca3)
    );
  }
  
  // Apply sorting
  filteredCountries = sortCountries(filteredCountries, currentSort);
  
  // Render countries with pagination
  renderCountriesWithPagination(filteredCountries);
}

// Sort countries based on selected method
function sortCountries(countries, method) {
  const sortedCountries = [...countries];
  
  switch (method) {
    case 'a-z':
      return sortedCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));
    case 'z-a':
      return sortedCountries.sort((a, b) => b.name.common.localeCompare(a.name.common));
    case 'continent':
      return sortedCountries.sort((a, b) => {
        if (a.region !== b.region) {
          return a.region.localeCompare(b.region);
        }
        return a.name.common.localeCompare(b.name.common);
      });
    case 'pop-high':
      return sortedCountries.sort((a, b) => b.population - a.population);
    case 'pop-low':
      return sortedCountries.sort((a, b) => a.population - b.population);
    default:
      return sortedCountries;
  }
}

// Render countries with pagination
function renderCountriesWithPagination(countries) {
  const totalPages = Math.ceil(countries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const countriesToShow = countries.slice(startIndex, endIndex);
  
  // Show/hide no results
  if (countries.length === 0) {
    countriesGrid.classList.add('hidden');
    noResults.classList.remove('hidden');
    pagination.classList.add('hidden');
    return;
  } else {
    countriesGrid.classList.remove('hidden');
    noResults.classList.add('hidden');
    pagination.classList.remove('hidden');
  }
  
  // Render country cards
  renderCountries(countriesToShow);
  
  // Render pagination
  renderPagination(countries.length, totalPages);
}

// Render country cards
function renderCountries(countries) {
  countriesGrid.innerHTML = '';
  
  countries.forEach((country, index) => {
    const card = createCountryCard(country, index);
    countriesGrid.appendChild(card);
  });
}

// Create individual country card
function createCountryCard(country, index) {
  const card = document.createElement('div');
  card.className = 'country-card cursor-pointer relative';
  card.style.animationDelay = `${index * 0.1}s`;
  
  const isFavorite = favorites.includes(country.cca3);
  const population = formatNumber(country.population);
  const capital = country.capital && country.capital[0] ? country.capital[0] : '—';
  
  card.innerHTML = `
    <div class="relative">
      <img 
        src="${country.flags.png}" 
        alt="${country.flags.alt || country.name.common}" 
        class="flag-img"
        loading="lazy"
      >
      <button 
        class="favorite-btn absolute top-2 right-2 text-xl ${isFavorite ? 'favorited' : ''}"
        onclick="event.stopPropagation(); toggleFavorite('${country.cca3}')"
        title="${isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}"
      >
        ${isFavorite ? '❤️' : '🤍'}
      </button>
    </div>
    <div class="p-4">
      <h3 class="font-semibold text-lg text-gray-800 mb-2">${country.name.common}</h3>
      <p class="text-gray-600 text-sm mb-1"><span class="font-medium">Ibu Kota:</span> ${capital}</p>
      <p class="text-gray-600 text-sm mb-1"><span class="font-medium">Benua:</span> ${country.region}</p>
      <p class="text-gray-600 text-sm"><span class="font-medium">Populasi:</span> ${population}</p>
    </div>
  `;
  
  // Add click event to open modal
  card.addEventListener('click', () => openModal(country.cca3));
  
  return card;
}

// Render pagination controls
function renderPagination(totalItems, totalPages) {
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  let paginationHTML = `
    <div class="flex justify-center items-center gap-2">
  `;
  
  // Previous button
  if (currentPage > 1) {
    paginationHTML += `
      <button 
        onclick="changePage(${currentPage - 1})" 
        class="pagination-btn px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
      >
        ← Sebelumnya
      </button>
    `;
  }
  
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === currentPage;
    paginationHTML += `
      <button 
        onclick="changePage(${i})" 
        class="pagination-btn px-3 py-2 border border-gray-300 rounded-lg text-sm ${isActive ? 'active' : 'bg-white text-gray-700 hover:bg-gray-50'}"
      >
        ${i}
      </button>
    `;
  }
  
  // Next button
  if (currentPage < totalPages) {
    paginationHTML += `
      <button 
        onclick="changePage(${currentPage + 1})" 
        class="pagination-btn px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
      >
        Selanjutnya →
      </button>
    `;
  }
  
  paginationHTML += '</div>';
  pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
  currentPage = page;
  applyFiltersAndSort();
  
  // Scroll to top of countries grid
  countriesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Toggle favorite status
function toggleFavorite(countryCode) {
  const index = favorites.indexOf(countryCode);
  
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(countryCode);
  }
  
  saveFavorites();
  
  // Add heart animation
  const heartBtn = event.target;
  heartBtn.classList.add('heart-animation');
  setTimeout(() => heartBtn.classList.remove('heart-animation'), 600);
  
  // Re-render if showing favorites only
  if (showFavoritesOnly) {
    applyFiltersAndSort();
  }
}

// Handle modal favorite toggle
function handleModalFavorite() {
  const countryCode = modalFavoriteBtn.dataset.countryCode;
  if (countryCode) {
    toggleFavorite(countryCode);
    updateModalFavoriteButton();
  }
}

// Update modal favorite button
function updateModalFavoriteButton() {
  const countryCode = modalFavoriteBtn.dataset.countryCode;
  const isFavorite = favorites.includes(countryCode);
  
  modalFavoriteBtn.textContent = isFavorite ? '❤️' : '🤍';
  modalFavoriteBtn.className = `text-2xl hover:scale-110 transition-transform ${isFavorite ? 'favorited' : ''}`;
}

// Open country modal
function openModal(countryCode) {
  const country = allCountries.find(c => c.cca3 === countryCode);
  if (!country) return;
  
  // Set modal title
  modalTitle.textContent = country.name.official;
  
  // Set favorite button
  modalFavoriteBtn.dataset.countryCode = countryCode;
  updateModalFavoriteButton();
  
  // Generate modal content
  modalContent.innerHTML = generateModalContent(country);
  
  // Show modal
  countryModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Generate modal content
function generateModalContent(country) {
  try {
    // Debug logging to see what data we're working with
    console.log('Country data for modal:', country);
    console.log('Languages:', country.languages);
    console.log('Currencies:', country.currencies);
    console.log('Timezones:', country.timezones);
    console.log('Area:', country.area);
    
    // Safe access to country properties with fallbacks
    const population = formatNumber(country.population);
    const area = country.area ? formatNumber(country.area) : 'N/A';
    const capital = country.capital && Array.isArray(country.capital) ? country.capital.join(', ') : 'N/A';
    
    // Handle languages - check if it exists and is an object
    let languages = 'N/A';
    if (country.languages && typeof country.languages === 'object') {
      languages = Object.values(country.languages).join(', ');
    }
    
    // Handle currencies - check if it exists and is an object
    let currencies = 'N/A';
    if (country.currencies && typeof country.currencies === 'object') {
      currencies = Object.values(country.currencies).map(c => `${c.name} (${c.symbol})`).join(', ');
    }
    
    const borders = country.borders && Array.isArray(country.borders) ? country.borders.join(', ') : 'None';
    const timezones = country.timezones && Array.isArray(country.timezones) ? country.timezones.join(', ') : 'N/A';
    
    // Convert border codes to country names if possible
    let borderNames = 'None';
    if (country.borders && Array.isArray(country.borders) && country.borders.length > 0) {
      borderNames = country.borders.join(', '); // For now, just show codes
    }
    
    // Get native name (first available)
    let nativeName = 'N/A';
    if (country.name && country.name.nativeName) {
      const firstNative = Object.values(country.name.nativeName)[0];
      nativeName = firstNative.common || firstNative.official || 'N/A';
    }
    
    // Generate map iframe (using capital coordinates if available)
    let mapIframe = '';
    if (country.latlng && country.latlng.length === 2) {
      const [lat, lng] = country.latlng;
      mapIframe = `
        <div class="info-card">
          <h4>🗺️ Interactive Map</h4>
          <iframe 
            src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-2},${lat-2},${lng+2},${lat+2}&layer=mapnik&marker=${lat},${lng}"
            class="map-iframe"
            allowfullscreen
          ></iframe>
        </div>
      `;
    } else if (country.capitalInfo && country.capitalInfo.latlng && country.capitalInfo.latlng.length === 2) {
      const [lat, lng] = country.capitalInfo.latlng;
      mapIframe = `
        <div class="info-card">
          <h4>🗺️ Interactive Map (Capital)</h4>
          <iframe 
            src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-2},${lat-2},${lng+2},${lat+2}&layer=mapnik&marker=${lat},${lng}"
            class="map-iframe"
            allowfullscreen
          ></iframe>
        </div>
      `;
    }
    
           return `
             <!-- Header Section -->
             <div class="text-center mb-6">
               <img 
                 src="${country.flags && country.flags.png ? country.flags.png : 'https://via.placeholder.com/300x200?text=Bendera+Tidak+Tersedia'}" 
                 alt="${country.flags && country.flags.alt ? country.flags.alt : country.name.common + ' flag'}" 
                 class="modal-flag mx-auto mb-4"
               >
               <h2 class="text-xl font-semibold text-gray-800 mb-2">${country.name && country.name.official ? country.name.official : country.name.common}</h2>
               <p class="text-gray-600 text-sm">${nativeName}</p>
             </div>
             
             <!-- Identitas & Geografi -->
             <div class="info-card">
               <h4>Ibu Kota</h4>
               <p>${capital}</p>
             </div>
             
             <div class="info-card">
               <h4>Wilayah</h4>
               <p><strong>Benua:</strong> ${country.region || 'Tidak tersedia'}</p>
               <p><strong>Subwilayah:</strong> ${country.subregion || 'Tidak tersedia'}</p>
             </div>
             
             <div class="info-card">
               <h4>Populasi</h4>
               <p>${population} jiwa</p>
             </div>
             
             <div class="info-card">
               <h4>Luas Wilayah</h4>
               <p>${area} km²</p>
             </div>
             
             <div class="info-card">
               <h4>Zona Waktu</h4>
               <p>${timezones}</p>
             </div>
             
             <!-- Demografi & Sosial -->
             <div class="info-card">
               <h4>Bahasa</h4>
               <p>${languages}</p>
             </div>
             
             <div class="info-card">
               <h4>Mata Uang</h4>
               <p>${currencies}</p>
             </div>
             
             <div class="info-card">
               <h4>Negara Tetangga</h4>
               <p>${borderNames}</p>
             </div>
             
             <!-- Map Section -->
             ${mapIframe}
             
             <!-- External Links -->
             <div class="info-card">
               <h4>Tautan Eksternal</h4>
               <div class="flex gap-4">
                 ${country.maps && country.maps.googleMaps ? `<a href="${country.maps.googleMaps}" target="_blank" class="text-blue-600 hover:underline text-sm">Google Maps</a>` : ''}
                 ${country.maps && country.maps.openStreetMaps ? `<a href="${country.maps.openStreetMaps}" target="_blank" class="text-blue-600 hover:underline text-sm">OpenStreetMap</a>` : ''}
               </div>
             </div>
           `;
  } catch (error) {
    console.error('Error generating modal content:', error);
           return `
             <div class="text-center py-8">
               <div class="text-6xl mb-4">⚠️</div>
               <h3 class="text-xl font-semibold text-gray-700 mb-2">Gagal Memuat Detail</h3>
               <p class="text-gray-500">Tidak dapat memuat detail negara. Silakan coba lagi.</p>
             </div>
           `;
  }
}

// Close modal
function closeModalHandler() {
  countryModal.classList.add('hidden');
  document.body.style.overflow = 'auto';
}

// Load favorites from localStorage
function loadFavorites() {
  try {
    const savedFavorites = localStorage.getItem('favoriteCountries');
    if (savedFavorites) {
      favorites = JSON.parse(savedFavorites);
    }
  } catch (error) {
    console.error('Error loading favorites:', error);
    favorites = [];
  }
}

// Save favorites to localStorage
function saveFavorites() {
  try {
    localStorage.setItem('favoriteCountries', JSON.stringify(favorites));
  } catch (error) {
    console.error('Error saving favorites:', error);
  }
}

// Format number with thousand separators (fallback for older browsers)
function formatNumber(num) {
  if (num === null || num === undefined) return 'N/A';
  
  // Try Intl.NumberFormat first
  if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
    try {
      return new Intl.NumberFormat('en-US').format(num);
    } catch (e) {
      // Fallback to manual formatting
    }
  }
  
  // Manual formatting fallback
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Make functions globally available for onclick handlers
window.toggleFavorite = toggleFavorite;
window.changePage = changePage;
