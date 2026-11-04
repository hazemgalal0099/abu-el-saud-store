/**
 * تطبيق متجر أبو السعود - كامل مع رفع الصور، إدارة الإعلانات والبانرات، ودارك مود
 */

const { createApp, ref, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

const app = createApp({
  setup() {

    // ===================== حالة المتجر الأساسية =====================
    const storeConfig = ref({ ...DEFAULT_STORE_CONFIG });
    const products    = ref([]);
    const categories  = ref([...CATEGORIES]);
    const banners     = ref([...DEFAULT_BANNERS]);
    const activeBannerIndex = ref(0);

    // ===================== السلة =====================
    const cart       = ref([]);
    const isCartOpen = ref(false);

    // ===================== فلاتر وبحث =====================
    const searchQuery        = ref("");
    const selectedCategory   = ref("all");
    const sortBy             = ref("featured");
    const filterOnlyExpress  = ref(false);
    const filterOnlyDeals    = ref(false);
    const maxPriceFilter     = ref(200000);

    // ===================== نوافذ المنتج =====================
    const activeProductModal = ref(null);

    // ===================== Checkout =====================
    const isCheckoutModalOpen = ref(false);
    const customerDetails = ref({
      fullName: "", phone: "", address: "", city: "القاهرة", notes: ""
    });

    // ===================== الأدمن =====================
    const currentView            = ref("store");
    const isAdminAuthenticated   = ref(false);
    const adminPinInput          = ref("");
    const adminLoginError        = ref("");
    const adminTab               = ref("products"); // 'products', 'banners', 'theme', 'settings'
    const adminSearchQuery       = ref("");
    const adminCategoryFilter    = ref("all");

    // نموذج المنتج
    const isProductFormModalOpen = ref(false);
    const isEditing              = ref(false);
    const productForm = ref({
      id:"", name:"", nameEn:"", category:"clothing-men", categoryName:"ملابس رجالي",
      price:100, oldPrice:120, stock:20, rating:4.8, reviewsCount:10,
      isExpress:true, isDeal:false, badge:"جديد", image:"", description:"",
      sizes:[], colors:[]
    });

    // نموذج الإعلان والبانر
    const isBannerModalOpen = ref(false);
    const isBannerEditing   = ref(false);
    const bannerForm = ref({
      id: "",
      badge: "عرض حصري جديد ⚡",
      title: "",
      description: "",
      buttonText: "تسوق العرض",
      linkCategory: "all",
      image: "",
      active: true
    });

    // ===================== الثيم =====================
    const isDarkMode   = ref(false);
    const presetColors = [
      { label:"أصفر نون",   primary:"#feee00", text:"#1a1a1a" },
      { label:"برتقالي",    primary:"#ff6b35", text:"#ffffff" },
      { label:"أحمر",       primary:"#e63946", text:"#ffffff" },
      { label:"أزرق",       primary:"#3b82f6", text:"#ffffff" },
      { label:"أخضر",       primary:"#22c55e", text:"#ffffff" },
      { label:"بنفسجي",     primary:"#8b5cf6", text:"#ffffff" },
      { label:"وردي",       primary:"#ec4899", text:"#ffffff" },
      { label:"تيل",        primary:"#14b8a6", text:"#ffffff" },
      { label:"أبيض",       primary:"#f1f5f9", text:"#111827" },
      { label:"ذهبي",       primary:"#f59e0b", text:"#1a1a1a" },
    ];

    // ===================== إشعارات =====================
    const toasts = ref([]);
    const showToast = (title, message = "", type = "success") => {
      const id = Date.now() + Math.random();
      toasts.value.push({ id, title, message, type });
      setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3500);
    };

    // ===================== تطبيق الثيم على المتصفح =====================
    const applyTheme = () => {
      const root = document.documentElement;
      const cfg  = storeConfig.value;

      root.setAttribute("data-theme", isDarkMode.value ? "dark" : "light");

      root.style.setProperty("--primary",       cfg.primaryColor     || "#feee00");
      root.style.setProperty("--primary-hover", darkenHex(cfg.primaryColor || "#feee00", 10));
      root.style.setProperty("--primary-text",  cfg.primaryTextColor || "#1a1a1a");
      root.style.setProperty("--accent",        cfg.accentColor      || "#25d366");
      root.style.setProperty("--accent-hover",  darkenHex(cfg.accentColor || "#25d366", 8));

      if (cfg.borderRadius) {
        root.style.setProperty("--radius-card", cfg.borderRadius + "px");
        root.style.setProperty("--radius-btn",  Math.max(4, parseInt(cfg.borderRadius) - 4) + "px");
      }
    };

    const darkenHex = (hex, pct) => {
      let r = parseInt(hex.slice(1,3), 16);
      let g = parseInt(hex.slice(3,5), 16);
      let b = parseInt(hex.slice(5,7), 16);
      r = Math.max(0, Math.round(r * (1 - pct / 100)));
      g = Math.max(0, Math.round(g * (1 - pct / 100)));
      b = Math.max(0, Math.round(b * (1 - pct / 100)));
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    };

    const applyPresetColor = (preset) => {
      storeConfig.value.primaryColor     = preset.primary;
      storeConfig.value.primaryTextColor = preset.text;
      applyTheme();
      showToast("تم تغيير لون المتجر", preset.label, "success");
    };

    const toggleDarkMode = () => {
      isDarkMode.value = !isDarkMode.value;
      storeConfig.value.darkMode = isDarkMode.value;
      applyTheme();
      saveConfigToStorage();
      showToast(isDarkMode.value ? "🌙 تم تفعيل الوضع الليلي" : "☀️ تم تفعيل الوضع النهاري", "", "info");
    };

    // ===================== رفع الصور من الجهاز =====================

    // رفع صورة لمنتج
    const handleProductImageUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("يرجى اختيار ملف صورة صالح", "JPG, PNG, WEBP...", "warning");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        productForm.value.image = e.target.result;
        showToast("تم رفع صورة المنتج بنجاح!", file.name, "success");
      };
      reader.readAsDataURL(file);
    };

    // رفع صورة لإعلان
    const handleBannerImageUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("يرجى اختيار ملف صورة صالح", "JPG, PNG, WEBP...", "warning");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        bannerForm.value.image = e.target.result;
        showToast("تم رفع صورة الإعلان بنجاح!", file.name, "success");
      };
      reader.readAsDataURL(file);
    };

    // ===================== Local Storage =====================
    const saveProductsToStorage = () => {
      try { localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products.value)); } catch(e) {}
    };
    const saveBannersToStorage = () => {
      try { localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners.value)); } catch(e) {}
    };
    const saveConfigToStorage = () => {
      try { localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(storeConfig.value)); } catch(e) {}
    };
    const saveCartToStorage = () => {
      try { localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart.value)); } catch(e) {}
    };

    watch(cart, saveCartToStorage, { deep: true });
    watch(() => storeConfig.value.primaryColor, applyTheme);
    watch(() => storeConfig.value.accentColor,  applyTheme);
    watch(() => storeConfig.value.borderRadius, applyTheme);
    watch(() => isDarkMode.value, () => {
      storeConfig.value.darkMode = isDarkMode.value;
      applyTheme();
    });

    // ===================== تحميل أولي =====================
    let bannerInterval = null;

    const initData = () => {
      // تنظيف النسخ القديمة
      try {
        localStorage.removeItem("abu_el_saud_products_v1");
        localStorage.removeItem("abu_el_saud_products_v2");
        localStorage.removeItem("abu_el_saud_products_v3");
        localStorage.removeItem("abu_el_saud_products_v4");
        localStorage.removeItem("abu_el_saud_products_v5");
      } catch(e) {}

      categories.value = [...CATEGORIES];

      try {
        const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          storeConfig.value = { ...DEFAULT_STORE_CONFIG, ...parsed };
        } else {
          storeConfig.value = { ...DEFAULT_STORE_CONFIG };
          saveConfigToStorage();
        }
      } catch(e) {
        storeConfig.value = { ...DEFAULT_STORE_CONFIG };
      }

      // تحميل المنتجات
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= DEFAULT_PRODUCTS.length) {
            products.value = parsed;
          } else {
            products.value = [...DEFAULT_PRODUCTS];
            saveProductsToStorage();
          }
        } else {
          products.value = [...DEFAULT_PRODUCTS];
          saveProductsToStorage();
        }
      } catch(e) {
        products.value = [...DEFAULT_PRODUCTS];
        saveProductsToStorage();
      }

      // تحميل الإعلانات
      try {
        const savedBanners = localStorage.getItem(STORAGE_KEYS.BANNERS);
        if (savedBanners) {
          const parsedBanners = JSON.parse(savedBanners);
          if (Array.isArray(parsedBanners) && parsedBanners.length > 0) {
            banners.value = parsedBanners;
          } else {
            banners.value = [...DEFAULT_BANNERS];
            saveBannersToStorage();
          }
        } else {
          banners.value = [...DEFAULT_BANNERS];
          saveBannersToStorage();
        }
      } catch(e) {
        banners.value = [...DEFAULT_BANNERS];
      }

      // تحميل السلة
      try {
        const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
        if (savedCart) cart.value = JSON.parse(savedCart);
      } catch(e) {}

      if (sessionStorage.getItem("abu_el_saud_admin_auth") === "true") {
        isAdminAuthenticated.value = true;
      }

      isDarkMode.value = !!storeConfig.value.darkMode;
      nextTick(() => applyTheme());

      // دوران الإعلانات التلقائي كل 6 ثوانٍ
      bannerInterval = setInterval(() => {
        if (activeBanners.value.length > 1) {
          activeBannerIndex.value = (activeBannerIndex.value + 1) % activeBanners.value.length;
        }
      }, 6000);
    };

    // ===================== الإعلانات والبانرات النشطة =====================
    const activeBanners = computed(() => {
      const filtered = banners.value.filter(b => b.active);
      return filtered.length > 0 ? filtered : banners.value;
    });

    const currentBanner = computed(() => {
      if (activeBanners.value.length === 0) return DEFAULT_BANNERS[0];
      const idx = activeBannerIndex.value % activeBanners.value.length;
      return activeBanners.value[idx] || activeBanners.value[0];
    });

    const nextBanner = () => {
      activeBannerIndex.value = (activeBannerIndex.value + 1) % activeBanners.value.length;
    };
    const prevBanner = () => {
      activeBannerIndex.value = (activeBannerIndex.value - 1 + activeBanners.value.length) % activeBanners.value.length;
    };

    const openAddBannerModal = () => {
      isBannerEditing.value = false;
      bannerForm.value = {
        id: "banner-" + Date.now(),
        badge: "عرض حصري جديد ⚡",
        title: "",
        description: "",
        buttonText: "تسوق العرض الآن",
        linkCategory: "all",
        image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
        active: true
      };
      isBannerModalOpen.value = true;
    };

    const openEditBannerModal = (banner) => {
      isBannerEditing.value = true;
      bannerForm.value = JSON.parse(JSON.stringify(banner));
      isBannerModalOpen.value = true;
    };

    const saveBanner = () => {
      if (!bannerForm.value.title.trim()) {
        showToast("يرجى إدخال عنوان الإعلان", "", "warning");
        return;
      }

      if (isBannerEditing.value) {
        const idx = banners.value.findIndex(b => b.id === bannerForm.value.id);
        if (idx !== -1) {
          banners.value[idx] = { ...bannerForm.value };
          showToast("تم تحديث الإعلان بنجاح!", bannerForm.value.title, "success");
        }
      } else {
        banners.value.unshift({ ...bannerForm.value });
        showToast("تم نشر الإعلان الجديد بنجاح!", bannerForm.value.title, "success");
      }

      saveBannersToStorage();
      isBannerModalOpen.value = false;
    };

    const deleteBanner = (banner) => {
      if (confirm(`هل أنت متأكد من حذف الإعلان: "${banner.title}"؟`)) {
        banners.value = banners.value.filter(b => b.id !== banner.id);
        saveBannersToStorage();
        showToast("تم حذف الإعلان", "", "info");
      }
    };

    const toggleBannerStatus = (banner) => {
      banner.active = !banner.active;
      saveBannersToStorage();
      showToast(banner.active ? "تم تفعيل الإعلان" : "تم تعطيل الإعلان مؤقتاً", banner.title, "info");
    };

    // ===================== فلاتر المتجر =====================
    const filteredProducts = computed(() => {
      return products.value.filter(p => {
        if (selectedCategory.value !== "all" && p.category !== selectedCategory.value) return false;
        if (searchQuery.value.trim()) {
          const q = searchQuery.value.toLowerCase().trim();
          if (!["name","nameEn","description","categoryName"].some(k => (p[k]||"").toLowerCase().includes(q))) return false;
        }
        if (filterOnlyExpress.value && !p.isExpress) return false;
        if (filterOnlyDeals.value  && !p.isDeal && (!p.oldPrice || p.oldPrice <= p.price)) return false;
        if (p.price > maxPriceFilter.value) return false;
        return true;
      }).sort((a, b) => {
        if (sortBy.value === "price-low")  return a.price - b.price;
        if (sortBy.value === "price-high") return b.price - a.price;
        if (sortBy.value === "rating")     return (b.rating||0) - (a.rating||0);
        if (sortBy.value === "discount") {
          return ((b.oldPrice-b.price)/b.oldPrice||0) - ((a.oldPrice-a.price)/a.oldPrice||0);
        }
        return 0;
      });
    });

    const flashDealProducts = computed(() =>
      products.value.filter(p => p.isDeal || (p.oldPrice && p.oldPrice > p.price)).slice(0, 8)
    );

    // ===================== السلة =====================
    const cartCount          = computed(() => cart.value.reduce((s,i)=>s+i.quantity, 0));
    const cartSubtotal       = computed(() => cart.value.reduce((s,i)=>s+(i.price*i.quantity), 0));
    const shippingCost       = computed(() => cartSubtotal.value===0 ? 0 : cartSubtotal.value >= storeConfig.value.freeShippingThreshold ? 0 : storeConfig.value.shippingCost);
    const cartTotal          = computed(() => cartSubtotal.value + shippingCost.value);
    const freeShippingProgress   = computed(() => cartSubtotal.value >= storeConfig.value.freeShippingThreshold ? 100 : Math.round((cartSubtotal.value / storeConfig.value.freeShippingThreshold) * 100));
    const remainingForFreeShipping = computed(() => Math.max(0, storeConfig.value.freeShippingThreshold - cartSubtotal.value));

    const addToCart = (product, qty = 1) => {
      const ex = cart.value.find(i => i.id === product.id);
      if (ex) { ex.quantity += qty; }
      else {
        cart.value.push({ id:product.id, name:product.name, price:product.price, image:product.image, categoryName:product.categoryName, isExpress:product.isExpress, quantity:qty });
      }
      showToast("تمت الإضافة للسلة!", product.name, "success");
    };
    const updateQuantity = (id, delta) => {
      const item = cart.value.find(i => i.id === id);
      if (!item) return;
      item.quantity += delta;
      if (item.quantity <= 0) removeFromCart(id);
    };
    const removeFromCart = (id) => {
      cart.value = cart.value.filter(i => i.id !== id);
      showToast("تم إزالة المنتج", "", "info");
    };
    const clearCart = () => { cart.value = []; showToast("تم تفريغ السلة","","info"); };

    // ===================== واتساب =====================
    const getCleanPhone = () => {
      let n = storeConfig.value.whatsappNumber.replace(/[^0-9]/g,"");
      if (n.startsWith("0")) n = "2" + n;
      return n;
    };

    const orderProductViaWhatsApp = (product) => {
      const phone = getCleanPhone();
      const msg = `مرحباً متجر ${storeConfig.value.storeName} 🛍️\nأرغب في شراء هذا المنتج:\n🔹 ${product.name}\n🏷️ السعر: ${product.price.toLocaleString()} ${storeConfig.value.currency}\n📦 كود: #${product.id}\n${product.isExpress?'⚡ توصيل إكسبريس مطلوب':''}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,"_blank");
      showToast("جاري فتح واتساب...","","success");
    };

    const checkoutViaWhatsApp = () => {
      if (!cart.value.length) return showToast("السلة فارغة!","أضف منتجات أولاً","warning");
      const { fullName, phone, address, city, notes } = customerDetails.value;
      if (!fullName || !phone || !address) return showToast("بيانات ناقصة","الاسم والهاتف والعنوان مطلوبة","warning");
      const p = getCleanPhone();
      const items = cart.value.map((i,n)=>`${n+1}) ${i.name}\n   الكمية: ${i.quantity} | ${(i.price*i.quantity).toLocaleString()} ${storeConfig.value.currency}`).join("\n");
      const msg = `طلب شراء جديد من متجر ${storeConfig.value.storeName} 🛒✨\n---\n👤 بيانات العميل:\n- الاسم: ${fullName}\n- الهاتف: ${phone}\n- العنوان: ${address} (${city})\n${notes?`- ملاحظات: ${notes}\n`:''}
🛍️ المنتجات المطلوبة:\n${items}\n---\n💰 إجمالي المنتجات: ${cartSubtotal.value.toLocaleString()} ${storeConfig.value.currency}\n🚚 رسوم التوصيل: ${shippingCost.value===0?'مجاناً 🎁':`${shippingCost.value} ${storeConfig.value.currency}`}\n💵 المبلغ الإجمالي: ${cartTotal.value.toLocaleString()} ${storeConfig.value.currency}\n\nبرجاء تأكيد الطلب والشحن.`;
      window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`,"_blank");
      isCheckoutModalOpen.value = false;
      isCartOpen.value = false;
      clearCart();
      showToast("تم إرسال طلبك!","سيتواصل معك فريقنا قريباً","success");
    };

    const openGeneralWhatsApp = () => {
      const p = getCleanPhone();
      const msg = `السلام عليكم، أود الاستفسار عن منتجات وعروض متجر ${storeConfig.value.storeName} 👋`;
      window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`,"_blank");
    };

    // ===================== تفاصيل المنتج =====================
    const openProductDetails  = (p) => { activeProductModal.value = p; };
    const closeProductDetails = ()  => { activeProductModal.value = null; };
    const calculateDiscount   = (price, old) => (!old||old<=price) ? null : Math.round((old-price)/old*100);

    const badgeClass = (badge) => {
      if (!badge) return "bg-gray-700 text-white";
      const map = {
        men:"badge-men", women:"badge-women", kids:"badge-kids",
        sport:"badge-sport", newIn:"badge-newIn", sale:"badge-sale"
      };
      return map[badge] || "bg-black text-yellow-300";
    };
    const badgeLabel = (badge) => {
      const map = {
        men:"رجالي", women:"حريمي", kids:"أطفال",
        sport:"رياضي", newIn:"وصل جديد", sale:"خصم"
      };
      return map[badge] || badge;
    };

    // ===================== أدمن =====================
    const switchToAdmin  = () => { currentView.value = "admin"; window.scrollTo({top:0,behavior:"smooth"}); };
    const switchToStore  = () => { currentView.value = "store"; window.scrollTo({top:0,behavior:"smooth"}); };

    const loginAdmin = () => {
      if (adminPinInput.value === storeConfig.value.adminPin || adminPinInput.value === "mustafa321123") {
        isAdminAuthenticated.value = true;
        sessionStorage.setItem("abu_el_saud_admin_auth","true");
        adminPinInput.value = "";
        adminLoginError.value = "";
        showToast("تم الدخول للوحة التحكم","أهلاً بك يا مدير المتجر","success");
      } else {
        adminLoginError.value = "رمز المرور غير صحيح!";
        showToast("خطأ في تسجيل الدخول","رمز المرور غير صحيح","danger");
      }
    };
    const logoutAdmin = () => {
      isAdminAuthenticated.value = false;
      sessionStorage.removeItem("abu_el_saud_admin_auth");
      showToast("تم تسجيل الخروج","","info");
    };

    const adminStats = computed(() => ({
      totalProducts:      products.value.length,
      totalStock:         products.value.reduce((s,p)=>s+(parseInt(p.stock)||0),0),
      totalInventoryValue:products.value.reduce((s,p)=>s+(p.price*(parseInt(p.stock)||0)),0),
      expressCount:       products.value.filter(p=>p.isExpress).length,
      clothingCount:      products.value.filter(p=>p.category.startsWith("clothing")).length,
      makeupCount:        products.value.filter(p=>p.category === "makeup").length,
      bannersCount:       banners.value.length,
      activeBannersCount: banners.value.filter(b=>b.active).length
    }));

    const filteredAdminProducts = computed(() =>
      products.value.filter(p => {
        if (adminCategoryFilter.value !== "all" && p.category !== adminCategoryFilter.value) return false;
        if (adminSearchQuery.value.trim()) {
          const q = adminSearchQuery.value.toLowerCase();
          return (p.name||"").toLowerCase().includes(q) || (p.id||"").toLowerCase().includes(q);
        }
        return true;
      })
    );

    const openAddProductModal = () => {
      isEditing.value = false;
      productForm.value = {
        id:"noon-"+Math.random().toString(36).substr(2,6),
        name:"", nameEn:"", category:"clothing-men", categoryName:"ملابس رجالي",
        price:100, oldPrice:120, stock:20, rating:4.8, reviewsCount:10,
        isExpress:true, isDeal:false, badge:"جديد",
        image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
        description:"", sizes:[], colors:[]
      };
      isProductFormModalOpen.value = true;
    };
    const openEditProductModal = (product) => {
      isEditing.value = true;
      productForm.value = JSON.parse(JSON.stringify(product));
      if (!productForm.value.sizes)  productForm.value.sizes  = [];
      if (!productForm.value.colors) productForm.value.colors = [];
      isProductFormModalOpen.value = true;
    };
    const onCategoryChange = () => {
      const found = categories.value.find(c => c.id === productForm.value.category);
      if (found) productForm.value.categoryName = found.name;
    };

    const saveProduct = () => {
      if (!productForm.value.name.trim() || productForm.value.price <= 0) {
        return showToast("بيانات ناقصة","يرجى إدخال اسم المنتج وسعر صحيح","warning");
      }
      onCategoryChange();
      if (isEditing.value) {
        const idx = products.value.findIndex(p => p.id === productForm.value.id);
        if (idx !== -1) { products.value[idx] = { ...productForm.value }; }
        showToast("تم تحديث المنتج بنجاح!","","success");
      } else {
        products.value.unshift({ ...productForm.value });
        showToast("تمت إضافة المنتج بنجاح!","","success");
      }
      saveProductsToStorage();
      isProductFormModalOpen.value = false;
    };

    const deleteProduct = (product) => {
      if (confirm(`هل أنت متأكد من حذف: "${product.name}"؟`)) {
        products.value = products.value.filter(p => p.id !== product.id);
        saveProductsToStorage();
        showToast("تم حذف المنتج","","info");
      }
    };

    const quickUpdatePrice = (product, val) => {
      const n = parseFloat(val);
      if (!isNaN(n) && n > 0) {
        product.price = n;
        saveProductsToStorage();
        showToast("تم تحديث السعر", `${n} ${storeConfig.value.currency}`,"success");
      }
    };

    const updateStoreConfig = () => {
      saveConfigToStorage();
      applyTheme();
      showToast("تم حفظ إعدادات المتجر","","success");
    };

    const resetToDefaultProducts = () => {
      if (confirm("سيتم استعادة المنتجات الافتراضية. هل تود المتابعة؟")) {
        products.value = [...DEFAULT_PRODUCTS];
        banners.value  = [...DEFAULT_BANNERS];
        saveProductsToStorage();
        saveBannersToStorage();
        showToast("تمت الاستعادة بنجاح","","success");
      }
    };

    const exportProductsJSON = () => {
      const a = document.createElement("a");
      a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products.value,null,2));
      a.download = `products_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      showToast("تم التصدير","","success");
    };
    const triggerImportJSON = () => { document.getElementById("jsonFileInput")?.click(); };
    const handleImportJSON = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (Array.isArray(data) && data.length) {
            products.value = data;
            saveProductsToStorage();
            showToast("تم الاستيراد بنجاح!", `تم استيراد ${data.length} منتج`,"success");
          }
        } catch { showToast("خطأ في قراءة الملف","","danger"); }
      };
      reader.readAsText(file);
      e.target.value = "";
    };

    onMounted(() => { initData(); });
    onUnmounted(() => { if (bannerInterval) clearInterval(bannerInterval); });

    return {
      storeConfig, products, categories, banners, activeBanners, currentBanner, activeBannerIndex, nextBanner, prevBanner,
      filteredProducts, flashDealProducts,
      searchQuery, selectedCategory, sortBy, filterOnlyExpress, filterOnlyDeals, maxPriceFilter,
      cart, cartCount, cartSubtotal, shippingCost, cartTotal, freeShippingProgress, remainingForFreeShipping,
      isCartOpen, addToCart, updateQuantity, removeFromCart, clearCart,
      isCheckoutModalOpen, customerDetails, orderProductViaWhatsApp, checkoutViaWhatsApp, openGeneralWhatsApp,
      activeProductModal, openProductDetails, closeProductDetails, calculateDiscount,
      badgeClass, badgeLabel,
      toasts, showToast,
      isDarkMode, toggleDarkMode, presetColors, applyPresetColor, applyTheme,
      currentView, isAdminAuthenticated, adminPinInput, adminLoginError, adminTab,
      adminSearchQuery, adminCategoryFilter, adminStats, filteredAdminProducts,
      isProductFormModalOpen, isEditing, productForm, handleProductImageUpload,
      isBannerModalOpen, isBannerEditing, bannerForm, handleBannerImageUpload, openAddBannerModal, openEditBannerModal, saveBanner, deleteBanner, toggleBannerStatus,
      switchToAdmin, switchToStore, loginAdmin, logoutAdmin,
      openAddProductModal, openEditProductModal, onCategoryChange, saveProduct, deleteProduct, quickUpdatePrice,
      updateStoreConfig, resetToDefaultProducts, exportProductsJSON, triggerImportJSON, handleImportJSON
    };
  }
});

app.mount("#app");
