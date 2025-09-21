class PokemonApp {
    constructor() {
        this.baseURL = 'https://pokeapi.co/api/v2';
        this.favorites = JSON.parse(localStorage.getItem('pokemonFavorites')) || [];
        this.pokemonTypes = [];
        this.currentPokemon = null;
        this.isOnline = true;
        
        this.initializeElements();
        this.bindEvents();
        this.loadPokemonTypes();
        this.displayFavorites();
        this.setupDemoData();
    }

    initializeElements() {
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.randomBtn = document.getElementById('randomBtn');
        this.typeFilter = document.getElementById('typeFilter');
        this.clearFiltersBtn = document.getElementById('clearFilters');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.pokemonContainer = document.getElementById('pokemonContainer');
        this.favoritesContainer = document.getElementById('favoritesContainer');
        this.demoNotice = document.getElementById('demoNotice');
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchPokemon());
        this.randomBtn.addEventListener('click', () => this.getRandomPokemon());
        this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPokemon();
            }
        });

        this.typeFilter.addEventListener('change', () => this.filterByType());
    }

    async loadPokemonTypes() {
        try {
            const response = await fetch(`${this.baseURL}/type`);
            const data = await response.json();
            this.pokemonTypes = data.results;
            
            this.pokemonTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.name;
                option.textContent = type.name.charAt(0).toUpperCase() + type.name.slice(1);
                this.typeFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading Pokemon types:', error);
            this.isOnline = false;
            this.showDemoNotice();
            this.loadDemoTypes();
        }
    }

    showDemoNotice() {
        if (this.demoNotice) {
            this.demoNotice.style.display = 'block';
        }
    }

    loadDemoTypes() {
        const types = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            this.typeFilter.appendChild(option);
        });
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.error.style.display = 'none';
        this.pokemonContainer.innerHTML = '';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError() {
        this.error.style.display = 'block';
        this.hideLoading();
    }

    hideError() {
        this.error.style.display = 'none';
    }

    async searchPokemon() {
        const query = this.searchInput.value.trim().toLowerCase();
        if (!query) return;

        this.showLoading();
        this.hideError();

        try {
            const pokemon = await this.fetchPokemon(query);
            this.currentPokemon = pokemon;
            this.displayPokemon([pokemon]);
        } catch (error) {
            console.error('Error searching Pokemon:', error);
            this.showError();
        }
    }

    async getRandomPokemon() {
        this.showLoading();
        this.hideError();

        try {
            const randomId = Math.floor(Math.random() * 1010) + 1; // There are ~1010 Pokemon
            const pokemon = await this.fetchPokemon(randomId.toString());
            this.currentPokemon = pokemon;
            this.displayPokemon([pokemon]);
        } catch (error) {
            console.error('Error getting random Pokemon:', error);
            this.showError();
        }
    }

    async fetchPokemon(query) {
        if (!this.isOnline) {
            return this.getDemoPokemon(query);
        }
        
        try {
            const response = await fetch(`${this.baseURL}/pokemon/${query}`);
            if (!response.ok) {
                throw new Error('Pokemon not found');
            }
            const pokemon = await response.json();
            
            // Fetch species data for additional information
            const speciesResponse = await fetch(pokemon.species.url);
            const speciesData = await speciesResponse.json();
            
            return { ...pokemon, species: speciesData };
        } catch (error) {
            console.error('API error, switching to demo mode:', error);
            this.isOnline = false;
            this.showDemoNotice();
            return this.getDemoPokemon(query);
        }
    }

    async filterByType() {
        const selectedType = this.typeFilter.value;
        if (!selectedType) return;

        this.showLoading();
        this.hideError();

        try {
            const response = await fetch(`${this.baseURL}/type/${selectedType}`);
            const typeData = await response.json();
            
            // Get first 20 Pokemon of this type
            const pokemonPromises = typeData.pokemon.slice(0, 20).map(p => 
                this.fetchPokemon(p.pokemon.name)
            );
            
            const pokemonList = await Promise.all(pokemonPromises);
            this.displayPokemon(pokemonList);
        } catch (error) {
            console.error('Error filtering by type:', error);
            this.showError();
        }
    }

    clearFilters() {
        this.typeFilter.value = '';
        this.searchInput.value = '';
        this.pokemonContainer.innerHTML = '';
        this.hideError();
    }

    displayPokemon(pokemonList) {
        this.hideLoading();
        this.pokemonContainer.innerHTML = '';

        pokemonList.forEach(pokemon => {
            const pokemonCard = this.createPokemonCard(pokemon);
            this.pokemonContainer.appendChild(pokemonCard);
        });
    }

    createPokemonCard(pokemon) {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        
        const isFavorite = this.favorites.some(fav => fav.id === pokemon.id);
        
        card.innerHTML = `
            <div class="pokemon-header">
                <div class="pokemon-name">${pokemon.name}</div>
                <div class="pokemon-id">#${pokemon.id.toString().padStart(3, '0')}</div>
            </div>
            
            <div class="pokemon-image-container">
                <img class="pokemon-image" 
                     src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" 
                     alt="${pokemon.name}"
                     onerror="this.src='${pokemon.sprites.front_default}'">
                <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" 
                        onclick="app.toggleFavorite(${pokemon.id})">
                    ${isFavorite ? '❤️' : '🤍'}
                </button>
            </div>
            
            <div class="pokemon-types">
                ${pokemon.types.map(type => 
                    `<span class="type-badge type-${type.type.name}">${type.type.name}</span>`
                ).join('')}
            </div>
            
            <div class="pokemon-stats">
                ${pokemon.stats.map(stat => `
                    <div class="stat-item">
                        <span class="stat-name">${stat.stat.name.replace('-', ' ')}</span>
                        <div class="stat-bar">
                            <div class="stat-fill" style="width: ${(stat.base_stat / 200) * 100}%"></div>
                        </div>
                        <span class="stat-value">${stat.base_stat}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="pokemon-abilities">
                <h4>Abilities</h4>
                <div class="abilities-list">
                    ${pokemon.abilities.map(ability => 
                        `<span class="ability-badge">${ability.ability.name.replace('-', ' ')}</span>`
                    ).join('')}
                </div>
            </div>
        `;

        return card;
    }

    toggleFavorite(pokemonId) {
        const existingIndex = this.favorites.findIndex(fav => fav.id === pokemonId);
        
        if (existingIndex > -1) {
            // Remove from favorites
            this.favorites.splice(existingIndex, 1);
        } else {
            // Add to favorites
            if (this.currentPokemon && this.currentPokemon.id === pokemonId) {
                this.favorites.push({
                    id: this.currentPokemon.id,
                    name: this.currentPokemon.name,
                    sprite: this.currentPokemon.sprites.other['official-artwork'].front_default || this.currentPokemon.sprites.front_default,
                    types: this.currentPokemon.types
                });
            }
        }
        
        // Save to localStorage
        localStorage.setItem('pokemonFavorites', JSON.stringify(this.favorites));
        
        // Update the display
        this.updateFavoriteButtons();
        this.displayFavorites();
    }

    updateFavoriteButtons() {
        const favoriteButtons = document.querySelectorAll('.favorite-btn');
        favoriteButtons.forEach(button => {
            const pokemonId = parseInt(button.getAttribute('onclick').match(/\d+/)[0]);
            const isFavorite = this.favorites.some(fav => fav.id === pokemonId);
            
            button.className = `favorite-btn ${isFavorite ? 'favorited' : ''}`;
            button.textContent = isFavorite ? '❤️' : '🤍';
        });
    }

    displayFavorites() {
        this.favoritesContainer.innerHTML = '';
        
        if (this.favorites.length === 0) {
            this.favoritesContainer.innerHTML = '<p class="empty-favorites">No favorite Pokemon yet. Click the heart icon on any Pokemon to add them to your favorites!</p>';
            return;
        }

        this.favorites.forEach(favorite => {
            const favoriteCard = document.createElement('div');
            favoriteCard.className = 'pokemon-card';
            favoriteCard.innerHTML = `
                <div class="pokemon-header">
                    <div class="pokemon-name">${favorite.name}</div>
                    <div class="pokemon-id">#${favorite.id.toString().padStart(3, '0')}</div>
                </div>
                
                <div class="pokemon-image-container">
                    <img class="pokemon-image" src="${favorite.sprite}" alt="${favorite.name}">
                    <button class="favorite-btn favorited" onclick="app.toggleFavorite(${favorite.id})">
                        ❤️
                    </button>
                </div>
                
                <div class="pokemon-types">
                    ${favorite.types.map(type => 
                        `<span class="type-badge type-${type.type.name}">${type.type.name}</span>`
                    ).join('')}
                </div>
            `;
            
            this.favoritesContainer.appendChild(favoriteCard);
        });
    }

    // Initialize some popular Pokemon on first load
    async initializeWithPopularPokemon() {
        const popularPokemon = ['pikachu', 'charizard', 'blastoise', 'venusaur', 'mewtwo', 'mew'];
        this.showLoading();
        
        try {
            const pokemonPromises = popularPokemon.map(name => this.fetchPokemon(name));
            const pokemonList = await Promise.all(pokemonPromises);
            this.displayPokemon(pokemonList);
        } catch (error) {
            console.error('Error loading popular Pokemon:', error);
            this.hideLoading();
        }
    }

    setupDemoData() {
        this.demoData = {
            pikachu: {
                id: 25,
                name: 'pikachu',
                types: [{ type: { name: 'electric' } }],
                stats: [
                    { stat: { name: 'hp' }, base_stat: 35 },
                    { stat: { name: 'attack' }, base_stat: 55 },
                    { stat: { name: 'defense' }, base_stat: 40 },
                    { stat: { name: 'special-attack' }, base_stat: 50 },
                    { stat: { name: 'special-defense' }, base_stat: 50 },
                    { stat: { name: 'speed' }, base_stat: 90 }
                ],
                abilities: [
                    { ability: { name: 'static' } },
                    { ability: { name: 'lightning-rod' } }
                ],
                sprites: {
                    front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRkZEQjAwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVsZWN0cmljPC90ZXh0Pjwvc3ZnPg==',
                    other: {
                        'official-artwork': {
                            front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRkZEQjAwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVsZWN0cmljPC90ZXh0Pjwvc3ZnPg=='
                        }
                    }
                },
                species: { name: 'pikachu' }
            },
            charizard: {
                id: 6,
                name: 'charizard',
                types: [{ type: { name: 'fire' } }, { type: { name: 'flying' } }],
                stats: [
                    { stat: { name: 'hp' }, base_stat: 78 },
                    { stat: { name: 'attack' }, base_stat: 84 },
                    { stat: { name: 'defense' }, base_stat: 78 },
                    { stat: { name: 'special-attack' }, base_stat: 109 },
                    { stat: { name: 'special-defense' }, base_stat: 85 },
                    { stat: { name: 'speed' }, base_stat: 100 }
                ],
                abilities: [
                    { ability: { name: 'blaze' } },
                    { ability: { name: 'solar-power' } }
                ],
                sprites: {
                    front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjA4MDMwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZpcmU8L3RleHQ+PC9zdmc+',
                    other: {
                        'official-artwork': {
                            front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjA4MDMwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZpcmU8L3RleHQ+PC9zdmc+'
                        }
                    }
                },
                species: { name: 'charizard' }
            },
            blastoise: {
                id: 9,
                name: 'blastoise',
                types: [{ type: { name: 'water' } }],
                stats: [
                    { stat: { name: 'hp' }, base_stat: 79 },
                    { stat: { name: 'attack' }, base_stat: 83 },
                    { stat: { name: 'defense' }, base_stat: 100 },
                    { stat: { name: 'special-attack' }, base_stat: 85 },
                    { stat: { name: 'special-defense' }, base_stat: 105 },
                    { stat: { name: 'speed' }, base_stat: 78 }
                ],
                abilities: [
                    { ability: { name: 'torrent' } },
                    { ability: { name: 'rain-dish' } }
                ],
                sprites: {
                    front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjg5MEYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPldhdGVyPC90ZXh0Pjwvc3ZnPg==',
                    other: {
                        'official-artwork': {
                            front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjg5MEYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPldhdGVyPC90ZXh0Pjwvc3ZnPg=='
                        }
                    }
                },
                species: { name: 'blastoise' }
            },
            venusaur: {
                id: 3,
                name: 'venusaur',
                types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }],
                stats: [
                    { stat: { name: 'hp' }, base_stat: 80 },
                    { stat: { name: 'attack' }, base_stat: 82 },
                    { stat: { name: 'defense' }, base_stat: 83 },
                    { stat: { name: 'special-attack' }, base_stat: 100 },
                    { stat: { name: 'special-defense' }, base_stat: 100 },
                    { stat: { name: 'speed' }, base_stat: 80 }
                ],
                abilities: [
                    { ability: { name: 'overgrow' } },
                    { ability: { name: 'chlorophyll' } }
                ],
                sprites: {
                    front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNzhDODUwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdyYXNzPC90ZXh0Pjwvc3ZnPg==',
                    other: {
                        'official-artwork': {
                            front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNzhDODUwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdyYXNzPC90ZXh0Pjwvc3ZnPg=='
                        }
                    }
                },
                species: { name: 'venusaur' }
            },
            mewtwo: {
                id: 150,
                name: 'mewtwo',
                types: [{ type: { name: 'psychic' } }],
                stats: [
                    { stat: { name: 'hp' }, base_stat: 106 },
                    { stat: { name: 'attack' }, base_stat: 110 },
                    { stat: { name: 'defense' }, base_stat: 90 },
                    { stat: { name: 'special-attack' }, base_stat: 154 },
                    { stat: { name: 'special-defense' }, base_stat: 90 },
                    { stat: { name: 'speed' }, base_stat: 130 }
                ],
                abilities: [
                    { ability: { name: 'pressure' } },
                    { ability: { name: 'unnerve' } }
                ],
                sprites: {
                    front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjg1ODg4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlBzeWNoaWM8L3RleHQ+PC9zdmc+',
                    other: {
                        'official-artwork': {
                            front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjg1ODg4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI0ZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlBzeWNoaWM8L3RleHQ+PC9zdmc+'
                        }
                    }
                },
                species: { name: 'mewtwo' }
            },
            mew: {
                id: 151,
                name: 'mew',
                types: [{ type: { name: 'psychic' } }],
                stats: [
                    { stat: { name: 'hp' }, base_stat: 100 },
                    { stat: { name: 'attack' }, base_stat: 100 },
                    { stat: { name: 'defense' }, base_stat: 100 },
                    { stat: { name: 'special-attack' }, base_stat: 100 },
                    { stat: { name: 'special-defense' }, base_stat: 100 },
                    { stat: { name: 'speed' }, base_stat: 100 }
                ],
                abilities: [
                    { ability: { name: 'synchronize' } }
                ],
                sprites: {
                    front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjg1ODg4IiByeD0iMTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TXl0aGljYWw8L3RleHQ+PC9zdmc+',
                    other: {
                        'official-artwork': {
                            front_default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjg1ODg4IiByeD0iMTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TXl0aGljYWw8L3RleHQ+PC9zdmc+'
                        }
                    }
                },
                species: { name: 'mew' }
            }
        };
    }

    getDemoPokemon(query) {
        const lowerQuery = query.toString().toLowerCase();
        
        // Try to find by name first
        if (this.demoData[lowerQuery]) {
            return this.demoData[lowerQuery];
        }
        
        // Try to find by ID
        const pokemonByID = Object.values(this.demoData).find(p => p.id.toString() === query.toString());
        if (pokemonByID) {
            return pokemonByID;
        }
        
        // Return a random Pokemon if not found
        const pokemonNames = Object.keys(this.demoData);
        const randomName = pokemonNames[Math.floor(Math.random() * pokemonNames.length)];
        return this.demoData[randomName];
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PokemonApp();
    // Load some popular Pokemon to start with
    app.initializeWithPopularPokemon();
});

// Add some utility functions for enhanced features
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'k': // Ctrl/Cmd + K to focus search
                e.preventDefault();
                document.getElementById('searchInput').focus();
                break;
            case 'r': // Ctrl/Cmd + R for random Pokemon
                e.preventDefault();
                if (window.app) {
                    window.app.getRandomPokemon();
                }
                break;
        }
    }
});