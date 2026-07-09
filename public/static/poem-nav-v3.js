/**
 * Po3m.com Navigation Enhancement
 * Adds next/previous poem navigation to individual poem pages
 */

class PoemNavigation {
    constructor() {
        this.poems = [];
        this.currentSlug = this.getCurrentSlug();
        this.init();
    }
    
    getCurrentSlug() {
        const path = window.location.pathname;
        const match = path.match(/\/poems?\/(.+)/);
        return match ? match[1] : null;
    }
    
    async init() {
        console.log('[PoemNav] init, currentSlug:', this.currentSlug);
        if (!this.currentSlug) {
            console.log('[PoemNav] No slug found, aborting');
            return;
        }
        
        try {
            await this.loadPoems();
            console.log('[PoemNav] Loaded', this.poems.length, 'poems');
            console.log('[PoemNav] Current index:', this.getCurrentIndex());
            this.createNavigation();
            console.log('[PoemNav] Navigation created');
            this.setupKeyboardNavigation();
        } catch (error) {
            console.log('[PoemNav] init failed:', error);
        }
    }
    
    async loadPoems() {
        const response = await fetch('/api/poems?limit=200');
        const data = await response.json();
        this.poems = data.poems || [];
    }
    
    getCurrentIndex() {
        return this.poems.findIndex(poem => poem.slug === this.currentSlug);
    }
    
    getPreviousPoem() {
        const currentIndex = this.getCurrentIndex();
        if (currentIndex === -1) return null;
        
        // Previous = older poem (later in array, higher index)
        const prevIndex = currentIndex + 1;
        return prevIndex < this.poems.length ? this.poems[prevIndex] : null;
    }
    
    getNextPoem() {
        const currentIndex = this.getCurrentIndex();
        if (currentIndex === -1) return null;
        
        // Next = newer poem (earlier in array, lower index)
        const nextIndex = currentIndex - 1;
        return nextIndex >= 0 ? this.poems[nextIndex] : null;
    }
    
    createNavigation() {
        const prevPoem = this.getPreviousPoem();
        const nextPoem = this.getNextPoem();
        
        // Create navigation container
        const nav = document.createElement('div');
        nav.className = 'poem-navigation';
        nav.innerHTML = `
            <div class="nav-item nav-prev">
                ${prevPoem ? `
                    <a href="/poem/${prevPoem.slug}" class="nav-link" title="${this.escapeHtml(prevPoem.title)}">
                        <span class="nav-arrow">←</span>
                        <span class="nav-text">Previous</span>
                    </a>
                ` : '<div class="nav-spacer"></div>'}
            </div>
            
            <div class="nav-item nav-home">
                <a href="/" class="nav-home-link">Po3m</a>
            </div>
            
            <div class="nav-item nav-next">
                ${nextPoem ? `
                    <a href="/poem/${nextPoem.slug}" class="nav-link" title="${this.escapeHtml(nextPoem.title)}">
                        <span class="nav-text">Next</span>
                        <span class="nav-arrow">→</span>
                    </a>
                ` : '<div class="nav-spacer"></div>'}
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Append to body
        document.body.appendChild(nav);
        
        // Adjust body padding for fixed navigation
        document.body.style.paddingBottom = '80px';
    }
    
    addStyles() {
        if (document.getElementById('poem-nav-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'poem-nav-styles';
        styles.textContent = `
            .poem-navigation {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0,0,0,0.8) 50%);
                backdrop-filter: blur(10px);
                padding: 1rem 2rem 1.5rem;
                z-index: 100;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-family: 'Georgia', serif;
            }
            
            .nav-item {
                flex: 1;
                display: flex;
                justify-content: center;
            }
            
            .nav-prev { justify-content: flex-start; }
            .nav-next { justify-content: flex-end; }
            
            .nav-link, .nav-home-link {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: rgba(255,255,255,0.6);
                text-decoration: none;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                transition: all 0.3s ease;
                font-size: 0.9rem;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .nav-link:hover, .nav-home-link:hover {
                color: rgba(255,255,255,0.9);
                background: rgba(255,255,255,0.1);
                border-color: rgba(255,255,255,0.2);
                transform: translateY(-1px);
            }
            
            .nav-home-link {
                font-weight: 500;
                color: rgba(255,255,255,0.7);
            }
            
            .nav-arrow {
                font-size: 1.1rem;
                font-weight: bold;
            }
            
            .nav-text {
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .nav-spacer {
                width: 1px;
                height: 1px;
            }
            
            /* Mobile responsive */
            @media (max-width: 640px) {
                .poem-navigation {
                    padding: 0.8rem 1rem 1.2rem;
                }
                
                .nav-text {
                    display: none;
                }
                
                .nav-link, .nav-home-link {
                    padding: 0.4rem 0.8rem;
                    font-size: 0.8rem;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const prevPoem = this.getPreviousPoem();
            const nextPoem = this.getNextPoem();
            
            if (e.key === 'ArrowLeft' && prevPoem) {
                window.location.href = `/poem/${prevPoem.slug}`;
            } else if (e.key === 'ArrowRight' && nextPoem) {
                window.location.href = `/poem/${nextPoem.slug}`;
            } else if (e.key === 'Home' || (e.key === 'h' && !e.ctrlKey)) {
                window.location.href = '/';
            }
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PoemNavigation());
} else {
    new PoemNavigation();
}