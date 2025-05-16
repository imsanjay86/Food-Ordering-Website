// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const cartCount = document.querySelector('.cart-count');
    const searchInput = document.querySelector('.search-container input');
    const searchBtn = document.querySelector('.search-btn');
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    let cart = JSON.parse(localStorage.getItem('foodCart')) || [];
    let searchTimeout;

    // Initialize Intersection Observer for animations
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animate-up elements
    document.querySelectorAll('.animate-up').forEach(el => observer.observe(el));

    // Cart functionality
    class Cart {
        constructor() {
            this.items = [];
            this.total = 0;
            this.init();
        }

        init() {
            // DOM Elements
            this.cartPanel = document.querySelector('.cart-panel');
            this.cartOverlay = document.querySelector('.cart-overlay');
            this.cartItemsContainer = document.querySelector('.cart-items');
            this.cartCount = document.querySelector('.cart-count');
            this.totalAmount = document.querySelector('.total-amount');
            this.cartTemplate = document.querySelector('#cart-item-template');
            this.checkoutBtn = document.querySelector('.checkout-btn');
            this.orderSuccessModal = document.querySelector('.order-success-modal');
            this.summaryItemTemplate = document.querySelector('#summary-item-template');

            // Event Listeners
            document.querySelectorAll('.order-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const menuItem = e.target.closest('.menu-item');
                    this.addItem({
                        id: Date.now(),
                        name: menuItem.querySelector('h3').textContent,
                        price: parseInt(menuItem.querySelector('.price').textContent.replace(/[^0-9]/g, '')),
                        image: menuItem.querySelector('img').src
                    });
                });
            });

            this.checkoutBtn.addEventListener('click', () => this.processOrder());
            document.querySelector('.close-cart').addEventListener('click', () => this.closeCart());
            document.querySelector('.clear-cart-btn').addEventListener('click', () => this.clearCart());
            this.cartOverlay.addEventListener('click', () => this.closeCart());
            document.querySelector('.continue-shopping-btn').addEventListener('click', () => this.closeSuccessModal());
            document.querySelector('.track-order-btn').addEventListener('click', () => this.trackOrder());

            // Load cart from localStorage
            const savedCart = localStorage.getItem('cart');
            if (savedCart) {
                const { items, total } = JSON.parse(savedCart);
                this.items = items;
                this.total = total;
                this.updateCart();
            }
        }

        addItem(item) {
            const existingItem = this.items.find(i => i.name === item.name);
            
            if (existingItem) {
                existingItem.quantity = (existingItem.quantity || 1) + 1;
                this.updateItemInDOM(existingItem);
            } else {
                item.quantity = 1;
                this.items.push(item);
                this.addItemToDOM(item);
            }

            this.updateTotal();
            this.saveCart();
            this.openCart();
            this.showAddedAnimation(item.name);
        }

        removeItem(id) {
            const index = this.items.findIndex(item => item.id === id);
            if (index > -1) {
                this.items.splice(index, 1);
                this.updateCart();
                this.saveCart();
            }
        }

        updateQuantity(id, delta) {
            const item = this.items.find(item => item.id === id);
            if (item) {
                item.quantity = Math.max(1, (item.quantity || 1) + delta);
                this.updateItemInDOM(item);
                this.updateTotal();
                this.saveCart();
            }
        }

        addItemToDOM(item) {
            const clone = this.cartTemplate.content.cloneNode(true);
            const cartItem = clone.querySelector('.cart-item');
            
            cartItem.dataset.id = item.id;
            cartItem.querySelector('img').src = item.image;
            cartItem.querySelector('img').alt = item.name;
            cartItem.querySelector('.cart-item-name').textContent = item.name;
            cartItem.querySelector('.cart-item-price').textContent = `₹${item.price}`;
            cartItem.querySelector('.quantity').textContent = item.quantity;

            // Event listeners for controls
            cartItem.querySelector('.minus').addEventListener('click', () => 
                this.updateQuantity(item.id, -1));
            cartItem.querySelector('.plus').addEventListener('click', () => 
                this.updateQuantity(item.id, 1));
            cartItem.querySelector('.remove-item').addEventListener('click', () => 
                this.removeItem(item.id));

            this.cartItemsContainer.appendChild(cartItem);
            this.updateTotal();
        }

        updateItemInDOM(item) {
            const cartItem = this.cartItemsContainer.querySelector(`[data-id="${item.id}"]`);
            if (cartItem) {
                cartItem.querySelector('.quantity').textContent = item.quantity;
            }
        }

        updateCart() {
            this.cartItemsContainer.innerHTML = '';
            this.items.forEach(item => this.addItemToDOM(item));
            this.updateTotal();
        }

        updateTotal() {
            this.total = this.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
            this.totalAmount.textContent = `₹${this.total}`;
            this.cartCount.textContent = this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        }

        clearCart() {
            this.items = [];
            this.updateCart();
            this.saveCart();
            this.closeCart();
        }

        openCart() {
            this.cartPanel.classList.add('open');
            this.cartOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        closeCart() {
            this.cartPanel.classList.remove('open');
            this.cartOverlay.classList.remove('show');
            document.body.style.overflow = '';
        }

        saveCart() {
            localStorage.setItem('cart', JSON.stringify({
                items: this.items,
                total: this.total
            }));
        }

        showAddedAnimation(itemName) {
            const notification = document.createElement('div');
            notification.className = 'add-to-cart-notification';
            notification.textContent = `${itemName} added to cart!`;
            document.body.appendChild(notification);

            // Trigger animation
            requestAnimationFrame(() => {
                notification.classList.add('show');
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }, 2000);
            });
        }

        processOrder() {
            if (this.items.length === 0) {
                alert('Your cart is empty!');
                return;
            }

            // Generate order ID
            const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
            
            // Show success modal
            this.showOrderSuccess(orderId);
            
            // Clear cart
            this.items = [];
            this.updateCart();
            this.saveCart();
            this.closeCart();
        }

        showOrderSuccess(orderId) {
            const modal = this.orderSuccessModal;
            const summaryItems = modal.querySelector('.summary-items');
            
            // Update order ID and amount
            modal.querySelector('.order-id').textContent = orderId;
            modal.querySelector('.final-amount').textContent = `₹${this.total}`;
            
            // Clear and populate summary items
            summaryItems.innerHTML = '';
            this.items.forEach(item => {
                const clone = this.summaryItemTemplate.content.cloneNode(true);
                clone.querySelector('.item-name').textContent = item.name;
                clone.querySelector('.item-quantity').textContent = `x${item.quantity}`;
                clone.querySelector('.item-price').textContent = `₹${item.price * item.quantity}`;
                summaryItems.appendChild(clone);
            });

            // Show modal with animation
            modal.classList.add('show');
            setTimeout(() => modal.querySelector('.success-content').style.opacity = '1', 10);

            // Save order to localStorage
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            orders.push({
                id: orderId,
                items: this.items,
                total: this.total,
                date: new Date().toISOString(),
                status: 'processing'
            });
            localStorage.setItem('orders', JSON.stringify(orders));
        }

        closeSuccessModal() {
            const modal = this.orderSuccessModal;
            modal.querySelector('.success-content').style.opacity = '0';
            setTimeout(() => modal.classList.remove('show'), 300);
        }

        trackOrder() {
            // You can implement order tracking functionality here
            alert('Order tracking will be available soon!');
        }
    }

    // Initialize cart when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        window.cart = new Cart();
    });

    // Search functionality with suggestions
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim().toLowerCase();
        
        searchTimeout = setTimeout(() => {
            if (query.length > 2) {
                // Simulate search suggestions
                const suggestions = document.querySelectorAll('.food-item-card h4');
                const matches = Array.from(suggestions)
                    .filter(el => el.textContent.toLowerCase().includes(query))
                    .map(el => el.textContent);
                
                showSearchSuggestions(matches);
            }
        }, 300);
    });

    function showSearchSuggestions(suggestions) {
        let suggestionBox = document.querySelector('.search-suggestions');
        if (!suggestionBox) {
            suggestionBox = document.createElement('div');
            suggestionBox.className = 'search-suggestions';
            document.querySelector('.search-container').appendChild(suggestionBox);
        }

        suggestionBox.innerHTML = suggestions.map(s => `
            <div class="suggestion-item">
                <i class="fas fa-search"></i>
                ${s}
            </div>
        `).join('');

        // Add click handlers
        suggestionBox.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                searchInput.value = suggestions[index];
                suggestionBox.remove();
            });
        });
    }

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            const suggestionBox = document.querySelector('.search-suggestions');
            if (suggestionBox) suggestionBox.remove();
        }
    });

    // Notification system
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);

        // Add styles dynamically
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--gradient-primary);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
            z-index: 1000;
        `;

        // Show notification
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);

        // Remove notification
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Add parallax effect to hero section
    const hero = document.querySelector('.hero');
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
    });

    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Initialize loading states
    function initializeLoadingStates() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.complete) {
                img.classList.add('loading');
                img.addEventListener('load', () => {
                    img.classList.remove('loading');
                });
            }
        });
    }

    initializeLoadingStates();

    // Contact Form Handling
    document.addEventListener('DOMContentLoaded', function() {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                const formGroups = contactForm.querySelectorAll('.form-group');
                let isValid = true;

                formGroups.forEach(group => {
                    const input = group.querySelector('input, select, textarea');
                    const errorMessage = group.querySelector('.error-message');
                    
                    if (input && input.required && !input.value.trim()) {
                        isValid = false;
                        group.classList.add('error');
                        if (errorMessage) {
                            errorMessage.style.display = 'block';
                        }
                    } else if (input.type === 'email' && !isValidEmail(input.value)) {
                        isValid = false;
                        group.classList.add('error');
                        if (errorMessage) {
                            errorMessage.style.display = 'block';
                        }
                    } else {
                        group.classList.remove('error');
                        if (errorMessage) {
                            errorMessage.style.display = 'none';
                        }
                    }
                });

                if (!isValid) {
                    e.preventDefault();
                }
            });

            // Clear error states on input
            contactForm.querySelectorAll('input, select, textarea').forEach(input => {
                input.addEventListener('input', function() {
                    const group = this.closest('.form-group');
                    const errorMessage = group.querySelector('.error-message');
                    group.classList.remove('error');
                    if (errorMessage) {
                        errorMessage.style.display = 'none';
                    }
                });
            });
        }
    });

    function isValidEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    // Login Form Functionality
    document.addEventListener('DOMContentLoaded', function() {
        // Form validation function
        function validateForm(form) {
            let isValid = true;
            const inputs = form.querySelectorAll('input[required]');
            
            inputs.forEach(input => {
                if (!input.checkValidity()) {
                    input.classList.add('is-invalid');
                    isValid = false;
                } else {
                    input.classList.remove('is-invalid');
                }
            });

            // Special check for password confirmation
            if (form.id === 'registerForm') {
                const password = form.querySelector('#registerPassword');
                const confirm = form.querySelector('#confirmPassword');
                if (password.value !== confirm.value) {
                    confirm.classList.add('is-invalid');
                    isValid = false;
                }
            }

            return isValid;
        }

        // Password toggle functionality
        function initializePasswordToggles() {
            document.querySelectorAll('.toggle-password').forEach(button => {
                button.addEventListener('click', function() {
                    const input = this.previousElementSibling;
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    
                    const icon = this.querySelector('i');
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                });
            });
        }

        // Initialize all forms
        const forms = {
            login: document.getElementById('loginForm'),
            register: document.getElementById('registerForm'),
            reset: document.getElementById('resetPasswordForm')
        };

        // Handle form submissions
        Object.entries(forms).forEach(([formType, form]) => {
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();

                    if (!validateForm(this)) {
                        return;
                    }

                    // Add loading state
                    const submitBtn = this.querySelector('button[type="submit"]');
                    const originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    submitBtn.disabled = true;

                    // Simulate API call
                    setTimeout(() => {
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;

                        // Show success message
                        const successMessage = document.createElement('div');
                        successMessage.className = 'alert alert-success mt-3';

                        switch(formType) {
                            case 'login':
                                successMessage.innerHTML = 'Login successful! Redirecting...';
                                setTimeout(() => {
                                    window.location.href = 'index.html';
                                }, 1500);
                                break;
                            case 'register':
                                successMessage.innerHTML = 'Registration successful! Please check your email to verify your account.';
                                setTimeout(() => {
                                    const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                                    modal.hide();
                                }, 1500);
                                break;
                            case 'reset':
                                successMessage.innerHTML = 'Password reset link has been sent to your email.';
                                setTimeout(() => {
                                    const modal = bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal'));
                                    modal.hide();
                                }, 1500);
                                break;
                        }

                        form.appendChild(successMessage);
                    }, 1500);
                });

                // Real-time validation
                form.querySelectorAll('input').forEach(input => {
                    input.addEventListener('input', function() {
                        if (this.checkValidity()) {
                            this.classList.remove('is-invalid');
                            this.classList.add('is-valid');
                        } else {
                            this.classList.remove('is-valid');
                            this.classList.add('is-invalid');
                        }

                        // Special handling for password confirmation
                        if (this.id === 'registerPassword' || this.id === 'confirmPassword') {
                            const password = document.getElementById('registerPassword');
                            const confirm = document.getElementById('confirmPassword');
                            if (password.value && confirm.value) {
                                if (password.value === confirm.value) {
                                    confirm.classList.remove('is-invalid');
                                    confirm.classList.add('is-valid');
                                } else {
                                    confirm.classList.remove('is-valid');
                                    confirm.classList.add('is-invalid');
                                }
                            }
                        }
                    });
                });
            }
        });

        // Initialize password toggles
        initializePasswordToggles();

        // Social login buttons
        const socialButtons = document.querySelectorAll('.social-btn');
        socialButtons.forEach(button => {
            button.addEventListener('click', function() {
                const platform = this.classList.contains('google') ? 'Google' :
                               this.classList.contains('facebook') ? 'Facebook' :
                               'Twitter';
                
                const icon = this.querySelector('i');
                const originalClass = icon.className;
                icon.className = 'fas fa-spinner fa-spin';
                this.disabled = true;

                setTimeout(() => {
                    icon.className = originalClass;
                    this.disabled = false;
                    console.log(`${platform} login attempt`);
                }, 1500);
            });
        });

        // Clear form and errors when modals are hidden
        ['registerModal', 'resetPasswordModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.addEventListener('hidden.bs.modal', function() {
                    const form = this.querySelector('form');
                    if (form) {
                        form.reset();
                        form.querySelectorAll('.is-invalid, .is-valid').forEach(input => {
                            input.classList.remove('is-invalid', 'is-valid');
                        });
                        const alert = form.querySelector('.alert');
                        if (alert) {
                            alert.remove();
                        }
                    }
                });
            }
        });
    });

    // Initialize the application
    function initializeApp() {
        let cartCount = 0;
        const cartBadge = document.querySelector('.cart-count');
        const orderBtns = document.querySelectorAll('.order-btn');
        const filterBtns = document.querySelectorAll('.filter-btn');
        const menuItems = document.querySelectorAll('.menu-item');
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');

        // Mobile Navigation
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', navMenu.classList.contains('active'));
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Smooth scroll for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    // Close mobile menu after clicking a link
                    navMenu.classList.remove('active');
                    navToggle.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth > 768) {
                    navMenu.classList.remove('active');
                    navToggle.setAttribute('aria-expanded', 'false');
                }
            }, 250);
        });

        // Menu filtering functionality
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                filterBtns.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');

                menuItems.forEach(item => {
                    if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                        item.style.display = 'block';
                        // Reset animation
                        item.style.animation = 'none';
                        item.offsetHeight; // Trigger reflow
                        item.style.animation = 'fadeIn 0.5s ease forwards';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });

        // Handle cart functionality
        orderBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                cartCount++;
                cartBadge.textContent = cartCount;
                cartBadge.style.animation = 'cartBadgePop 0.3s ease';
                
                // Show success message
                const menuItem = btn.closest('.menu-item-content');
                const itemName = menuItem.querySelector('h3').textContent;
                
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = `${itemName} added to cart!`;
                menuItem.appendChild(successMsg);

                // Change button text temporarily
                const originalText = btn.textContent;
                btn.innerHTML = '<i class="fas fa-check"></i> Added!';
                btn.style.background = '#4CAF50';
                btn.disabled = true;

                // Remove success message and reset button after animation
                setTimeout(() => {
                    successMsg.remove();
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 2000);

                // Reset badge animation
                setTimeout(() => {
                    cartBadge.style.animation = '';
                }, 300);
            });
        });

        // Add animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes cartBadgePop {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .success-message {
                position: absolute;
                top: -40px;
                left: 50%;
                transform: translateX(-50%);
                background: #4CAF50;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                animation: slideUp 0.3s ease forwards;
                white-space: nowrap;
                z-index: 100;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translate(-50%, 10px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }
        `;
        document.head.appendChild(style);

        // Initialize menu items with staggered animation
        menuItems.forEach((item, index) => {
            item.style.animationDelay = `${index * 0.1}s`;
        });
    }

    // Initialize the app when DOM is loaded
    document.addEventListener('DOMContentLoaded', initializeApp);

    // Create floating background elements
    function createFloatingElements() {
        const spiceIcons = ['🌶️', '🍛', '🥘', '🍚', '🌿'];
        const numElements = 15;
        const container = document.body;

        for (let i = 0; i < numElements; i++) {
            const element = document.createElement('div');
            element.className = 'floating-spice';
            element.style.left = `${Math.random() * 100}vw`;
            element.style.top = `${Math.random() * 100}vh`;
            element.innerHTML = spiceIcons[Math.floor(Math.random() * spiceIcons.length)];
            element.style.opacity = '0.1';
            element.style.fontSize = `${Math.random() * 20 + 10}px`;
            element.style.animation = `float ${Math.random() * 5 + 5}s ease-in-out infinite`;
            element.style.animationDelay = `${Math.random() * 5}s`;
            container.appendChild(element);

            // Random movement
            setInterval(() => {
                const x = parseFloat(element.style.left);
                const y = parseFloat(element.style.top);
                const newX = x + (Math.random() - 0.5) * 2;
                const newY = y + (Math.random() - 0.5) * 2;
                
                element.style.left = `${Math.max(0, Math.min(100, newX))}vw`;
                element.style.top = `${Math.max(0, Math.min(100, newY))}vh`;
            }, 5000);
        }
    }

    // Initialize floating elements when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        createFloatingElements();
    });

    // Mobile Navigation
    const mobileNav = {
        init() {
            this.menuToggle = document.querySelector('.menu-toggle');
            this.navMenu = document.querySelector('.nav-menu');
            this.overlay = document.querySelector('.nav-overlay');
            this.bindEvents();
        },

        bindEvents() {
            this.menuToggle?.addEventListener('click', () => this.toggleMenu());
            this.overlay?.addEventListener('click', () => this.closeMenu());
            window.addEventListener('resize', () => this.handleResize());
        },

        toggleMenu() {
            this.navMenu.classList.toggle('active');
            this.menuToggle.classList.toggle('active');
            document.body.classList.toggle('nav-open');
        },

        closeMenu() {
            this.navMenu.classList.remove('active');
            this.menuToggle.classList.remove('active');
            document.body.classList.remove('nav-open');
        },

        handleResize() {
            if (window.innerWidth > 768) {
                this.closeMenu();
            }
        }
    };

    // Scroll Animations
    const scrollAnimations = {
        init() {
            this.sections = document.querySelectorAll('section');
            this.observeElements();
        },

        observeElements() {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('in-view');
                            if (entry.target.querySelector('.section-background')) {
                                entry.target.querySelector('.section-background').classList.add('animate');
                            }
                        }
                    });
                },
                { threshold: 0.1 }
            );

            this.sections.forEach(section => observer.observe(section));
        }
    };

    // Dynamic Backgrounds
    const backgroundEffects = {
        init() {
            this.backgrounds = document.querySelectorAll('.section-background');
            this.setupBackgrounds();
            this.animate();
        },

        setupBackgrounds() {
            this.backgrounds.forEach(bg => {
                const pattern = document.createElement('div');
                pattern.className = 'background-pattern';
                bg.appendChild(pattern);

                const overlay = document.createElement('div');
                overlay.className = 'background-overlay';
                bg.appendChild(overlay);
            });
        },

        animate() {
            requestAnimationFrame(() => this.animate());
            this.backgrounds.forEach(bg => {
                const pattern = bg.querySelector('.background-pattern');
                if (pattern) {
                    const time = Date.now() * 0.001;
                    const scale = 1 + Math.sin(time) * 0.02;
                    pattern.style.transform = `scale(${scale})`;
                }
            });
        }
    };

    // Lazy Loading Images
    const lazyLoad = {
        init() {
            this.images = document.querySelectorAll('img[loading="lazy"]');
            if ('IntersectionObserver' in window) {
                this.observeImages();
            } else {
                this.loadImages();
            }
        },

        observeImages() {
            const imageObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.loadImage(entry.target);
                            imageObserver.unobserve(entry.target);
                        }
                    });
                },
                { rootMargin: '50px' }
            );

            this.images.forEach(img => imageObserver.observe(img));
        },

        loadImages() {
            this.images.forEach(img => this.loadImage(img));
        },

        loadImage(img) {
            img.classList.add('lazy-image');
            const src = img.getAttribute('data-src');
            if (src) {
                img.src = src;
                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                });
            }
        }
    };

    // Menu Filtering
    const menuFilter = {
        init() {
            this.filterButtons = document.querySelectorAll('.filter-btn');
            this.menuItems = document.querySelectorAll('.menu-item');
            this.bindEvents();
        },

        bindEvents() {
            this.filterButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const category = btn.getAttribute('data-filter');
                    this.filterItems(category);
                    this.updateActiveButton(btn);
                });
            });
        },

        filterItems(category) {
            this.menuItems.forEach(item => {
                const itemCategory = item.getAttribute('data-category');
                if (category === 'all' || category === itemCategory) {
                    item.style.display = '';
                    setTimeout(() => item.classList.add('show'), 0);
                } else {
                    item.classList.remove('show');
                    setTimeout(() => item.style.display = 'none', 300);
                }
            });
        },

        updateActiveButton(activeBtn) {
            this.filterButtons.forEach(btn => btn.classList.remove('active'));
            activeBtn.classList.add('active');
        }
    };

    // Form Validation
    const formValidation = {
        init() {
            this.form = document.querySelector('.contact-form');
            if (this.form) {
                this.bindEvents();
            }
        },

        bindEvents() {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        },

        handleSubmit(e) {
            e.preventDefault();
            if (this.validateForm()) {
                // Here you would typically send the form data to a server
                this.showSuccess();
                this.form.reset();
            }
        },

        validateForm() {
            let isValid = true;
            const inputs = this.form.querySelectorAll('input, textarea');
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    this.showError(input, 'This field is required');
                    isValid = false;
                } else if (input.type === 'email' && !this.validateEmail(input.value)) {
                    this.showError(input, 'Please enter a valid email address');
                    isValid = false;
                }
            });

            return isValid;
        },

        validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },

        showError(input, message) {
            const formGroup = input.closest('.form-group');
            formGroup.classList.add('error');
            const error = formGroup.querySelector('.error-message') || document.createElement('div');
            error.className = 'error-message';
            error.textContent = message;
            if (!formGroup.querySelector('.error-message')) {
                formGroup.appendChild(error);
            }
        },

        showSuccess() {
            const success = document.createElement('div');
            success.className = 'success-message';
            success.textContent = 'Thank you! Your message has been sent.';
            this.form.appendChild(success);
            setTimeout(() => success.remove(), 3000);
        }
    };

    // Initialize all modules when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        mobileNav.init();
        scrollAnimations.init();
        backgroundEffects.init();
        lazyLoad.init();
        menuFilter.init();
        formValidation.init();
    });

    // Handle smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                mobileNav.closeMenu();
            }
        });
    });

    // Handle scroll-based header
    const header = document.querySelector('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll <= 0) {
            header.classList.remove('scroll-up');
            return;
        }
        
        if (currentScroll > lastScroll && !header.classList.contains('scroll-down')) {
            header.classList.remove('scroll-up');
            header.classList.add('scroll-down');
        } else if (currentScroll < lastScroll && header.classList.contains('scroll-down')) {
            header.classList.remove('scroll-down');
            header.classList.add('scroll-up');
        }
        lastScroll = currentScroll;
    });
});
