// app.js
// ScanMenu - main front-end logic
// Uses Firebase v9+ modular SDK via CDN (no bundler).

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 1) PASTE YOUR FIREBASE CONFIG HERE
//    Go to Firebase Console → Project settings → Your apps → Web app.
//    Copy the config object and replace the placeholder values below.
const firebaseConfig = {
  apiKey: "AIzaSyC0dC4DO7mk3VeyxFBbXzEZQOwVcEiCIcw",
  authDomain: "scanmenu-553fc.firebaseapp.com",
  projectId: "scanmenu-553fc",
  storageBucket: "scanmenu-553fc.firebasestorage.app",
  messagingSenderId: "306103162673",
  appId: "1:306103162673:web:20faea3e2a7c0251794210"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);

// Firestore collections
const usersCollection = collection(db, "users");
const menusCollection = collection(db, "menus");

// Free plan configuration
const FREE_PLAN_MAX_ITEMS = 20;

// Backend API base URL (Render or other host)
// TODO: replace this with your deployed backend URL
const BACKEND_BASE_URL = "https://your-scanmenu-backend.onrender.com";

// Basic email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Simple toast helper
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type === "error" ? "error" : "success"}`;
  toast.textContent = message;
  container.appendChild(toast);

  // animate in
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // hide after delay
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);

  setTimeout(() => {
    if (toast.parentElement === container) {
      container.removeChild(toast);
    }
  }, 3500);
}

// Utility
function getCurrentUser() {
  return auth.currentUser;
}

// Entry point
document.addEventListener("DOMContentLoaded", () => {
  if ($("login-form")) initLoginPage();
  if ($("signup-form")) initSignupPage();
  if ($("dashboard-page")) initDashboardPage();
  if ($("public-menu-page")) initPublicMenuPage();
});

// ----------------------
// LOGIN PAGE
// ----------------------
function initLoginPage() {
  const loginForm = $("login-form");
  const loginMessage = $("login-message");
  const forgotMessage = $("forgot-message");
  const forgotBtn = $("forgot-password-btn");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMessage.textContent = "";
    if (forgotMessage) forgotMessage.textContent = "";

    const email = $("login-email").value.trim();
    const password = $("login-password").value.trim();

    if (!email || !password) {
      const msg = "Please enter email and password.";
      loginMessage.textContent = msg;
      showToast(msg, "error");
      return;
    }

    if (!isValidEmail(email)) {
      const msg = "Please enter a valid email address.";
      loginMessage.textContent = msg;
      showToast(msg, "error");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Logged in successfully.", "success");
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Login error:", err);
      loginMessage.textContent = err.message || "Failed to login.";
    }
  });

  forgotBtn?.addEventListener("click", async () => {
    if (forgotMessage) {
      forgotMessage.style.color = "#dc2626";
      forgotMessage.textContent = "";
    }
    const email = $("login-email").value.trim();
    if (!email) {
      const msg = "Enter your email above, then click Forgot password.";
      if (forgotMessage) {
        forgotMessage.textContent = msg;
      }
      showToast(msg, "error");
      return;
    }

    if (!isValidEmail(email)) {
      const msg = "Please enter a valid email address.";
      if (forgotMessage) {
        forgotMessage.textContent = msg;
      }
      showToast(msg, "error");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      if (forgotMessage) {
        forgotMessage.style.color = "green";
        forgotMessage.textContent =
          "Password reset link sent. Check your email inbox.";
      }
      showToast("Reset link sent. Check your email.", "success");
    } catch (err) {
      console.error("Forgot password error:", err);
      if (forgotMessage) {
        forgotMessage.textContent =
          err.message || "Could not send reset email. Please try again.";
      }
      showToast("Could not send reset email.", "error");
      }
    });
  }

// ----------------------
// SIGNUP PAGE
// ----------------------
function initSignupPage() {
  const signupForm = $("signup-form");
  const signupMessage = $("signup-message");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });

    signupForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      signupMessage.textContent = "";

    const restaurantName = $("signup-restaurant-name").value.trim();
    const email = $("signup-email").value.trim();
    const password = $("signup-password").value.trim();

    if (!restaurantName || !email || !password) {
      const msg = "Please fill in all fields.";
      signupMessage.textContent = msg;
      showToast(msg, "error");
      return;
    }

    if (!isValidEmail(email)) {
      const msg = "Please enter a valid email address.";
      signupMessage.textContent = msg;
      showToast(msg, "error");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      await setDoc(doc(usersCollection, user.uid), {
        restaurantName,
        email,
        // New accounts start on the free plan by default.
        plan: "free",
        createdAt: new Date().toISOString()
      });

      showToast("Account created. Redirecting to dashboard...", "success");
      window.location.href = "dashboard.html";
      } catch (err) {
        console.error("Signup error:", err);
        signupMessage.textContent = err.message || "Failed to create account.";
      }
    });
  }

// ----------------------
// DASHBOARD PAGE
// ----------------------
function initDashboardPage() {
  const restaurantNameEl = $("restaurant-name");
  const menuUrlEl = $("menu-url");
  const logoutBtn = $("logout-btn");
  const overviewMenuUrlEl = $("overview-menu-url");
  const qrMenuUrlEl = $("qr-menu-url");
  const dashboardTitleEl = $("dashboard-title");
  const dashboardSubtitleEl = $("dashboard-subtitle");
  const profileForm = $("profile-form");
  const profileRestaurantNameEl = $("profile-restaurant-name");
  const profileEmailEl = $("profile-email");
  const profileMessageEl = $("profile-message");
  const profileWhatsappEl = $("profile-whatsapp");
  const currentPlanLabelEl = $("current-plan-label");
  const upgradePlanBtn = $("upgrade-plan-btn");
  const sidebarPlanEl = $("sidebar-plan");

  const menuForm = $("menu-form");
  const menuFormMessage = $("menu-form-message");
  const menuFormTitle = $("menu-form-title");
  const cancelEditBtn = $("cancel-edit-btn");
  const menuItemsListEl = $("menu-items-list");
  const menuEmptyMessage = $("menu-empty-message");
  const saveItemBtn = $("save-item-btn");


  let currentUser = null;
  let unsubscribeMenus = null;
  let currentMenuCount = 0;
  let currentPlan = "free";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUser = user;

    try {
      const userRef = doc(usersCollection, user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      const restaurantName = userData.restaurantName || "Your Restaurant";
      currentPlan = userData.plan || "free";

      restaurantNameEl.textContent = restaurantName;
      if (dashboardTitleEl) {
        dashboardTitleEl.textContent = `Welcome, ${restaurantName}`;
      }
      if (dashboardSubtitleEl) {
        dashboardSubtitleEl.textContent =
          "Use the menu and QR tabs to manage your digital menu.";
      }
      if (profileRestaurantNameEl) {
        profileRestaurantNameEl.value = restaurantName;
      }
      if (profileEmailEl) {
        profileEmailEl.value = userData.email || user.email || "";
      }
      if (profileWhatsappEl) {
        profileWhatsappEl.value = userData.whatsappNumber || "";
      }
      if (currentPlanLabelEl) {
        currentPlanLabelEl.textContent =
          currentPlan === "premium" ? "Premium" : "Free";
      }
      if (sidebarPlanEl) {
        sidebarPlanEl.textContent =
          currentPlan === "premium" ? "Premium" : "Free";
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
      restaurantNameEl.textContent = "Your Restaurant";
    }

    const menuUrl = `${window.location.origin}/menu.html?id=${user.uid}`;
    menuUrlEl.textContent = menuUrl;
    if (overviewMenuUrlEl) overviewMenuUrlEl.textContent = menuUrl;
    if (qrMenuUrlEl) qrMenuUrlEl.textContent = menuUrl;

    // QR code
    if (typeof QRCode !== "undefined") {
      const qrContainer = document.getElementById("qrcode");
      if (qrContainer) {
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, {
          text: menuUrl,
          width: 180,
          height: 180
        });
      }
    }

      // Live menu items (menus collection where userId == uid)
      // Use a simple where query and sort on the client to avoid index requirements.
      const q = query(menusCollection, where("userId", "==", user.uid));

    unsubscribeMenus = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        currentMenuCount = items.length;
        const menuUsageEl = document.getElementById("menu-usage");
        if (menuUsageEl) {
          if (currentPlan === "premium") {
            menuUsageEl.textContent = `Premium plan: ${currentMenuCount} items (no limit)`;
          } else {
            menuUsageEl.textContent = `Free plan: ${currentMenuCount}/${FREE_PLAN_MAX_ITEMS} items used`;
          }
        }
        // Sort by category then name on the client
        items.sort((a, b) => {
          const catA = (a.category || "").toLowerCase();
          const catB = (b.category || "").toLowerCase();
          if (catA < catB) return -1;
          if (catA > catB) return 1;
          const nameA = (a.name || "").toLowerCase();
          const nameB = (b.name || "").toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });
        renderDashboardMenuItems(items, menuItemsListEl);
        menuEmptyMessage.style.display = items.length ? "none" : "block";
      },
      (error) => {
        console.error("Error listening to menus:", error);
      }
    );
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      if (unsubscribeMenus) unsubscribeMenus();
      await signOut(auth);
      window.location.href = "login.html";
    } catch (err) {
      console.error("Logout error:", err);
      alert("Failed to logout. Check console for details.");
    }
  });

  menuForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    menuFormMessage.textContent = "";

    const user = getCurrentUser();
    if (!user) {
      const msg = "You are not logged in.";
      menuFormMessage.textContent = msg;
      showToast(msg, "error");
      return;
    }

    const id = $("menu-item-id").value;
    const name = $("item-name").value.trim();
    const priceStr = $("item-price").value.trim();
    const category = $("item-category").value.trim();
    const imageUrl = $("item-image-url").value.trim();

    if (!name || !priceStr || !category) {
      const msg = "Please fill in name, price and category.";
      menuFormMessage.textContent = msg;
      showToast(msg, "error");
      return;
    }

    // Enforce simple free plan limit for new items
    if (
      currentPlan !== "premium" &&
      !id &&
      currentMenuCount >= FREE_PLAN_MAX_ITEMS
    ) {
      const msg = `Free plan allows up to ${FREE_PLAN_MAX_ITEMS} items. Delete an item or use Upgrade to Premium in your profile to add more.`;
      menuFormMessage.textContent = msg;
      showToast(msg, "error");
      return;
    }

    const price = parseFloat(priceStr);
    if (Number.isNaN(price)) {
      const msg = "Price must be a number.";
      menuFormMessage.textContent = msg;
      showToast(msg, "error");
      return;
    }

    saveItemBtn.disabled = true;
    saveItemBtn.textContent = "Saving...";

    try {
      if (id) {
        await updateDoc(doc(menusCollection, id), {
          name,
          price,
          category,
          image: imageUrl
        });
        menuFormMessage.style.color = "green";
        menuFormMessage.textContent = "Item updated.";
        showToast("Menu item updated.", "success");
      } else {
        await addDoc(menusCollection, {
          userId: user.uid,
          name,
          price,
          category,
          image: imageUrl
        });
        menuFormMessage.style.color = "green";
        menuFormMessage.textContent = "Item added.";
        showToast("Menu item added.", "success");
      }

      resetMenuForm();
    } catch (err) {
      console.error("Error saving menu item:", err);
      menuFormMessage.style.color = "#dc2626";
      menuFormMessage.textContent = "Failed to save item.";
      showToast("Failed to save item.", "error");
    } finally {
      saveItemBtn.disabled = false;
      saveItemBtn.textContent = "Save Item";
    }
  });

  cancelEditBtn?.addEventListener("click", () => {
    resetMenuForm();
    menuFormMessage.textContent = "";
  });

  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const newName = profileRestaurantNameEl.value.trim();
    if (!newName) {
      profileMessageEl.textContent = "Restaurant name cannot be empty.";
      return;
    }
    const newWhatsapp = profileWhatsappEl ? profileWhatsappEl.value.trim() : "";

    profileMessageEl.textContent = "";
    profileMessageEl.style.color = "#dc2626";

    try {
      // Use setDoc with merge so profile works even if the user document
      // was created before these fields existed.
      const payload = { restaurantName: newName };
      if (profileEmailEl?.value) {
        payload.email = profileEmailEl.value;
      }
      if (profileWhatsappEl) {
        payload.whatsappNumber = newWhatsapp;
      }
      await setDoc(doc(usersCollection, currentUser.uid), payload, { merge: true });
      restaurantNameEl.textContent = newName;
      if (dashboardTitleEl) {
        dashboardTitleEl.textContent = `Welcome, ${newName}`;
      }
      profileMessageEl.style.color = "green";
      profileMessageEl.textContent = "Profile updated.";
    } catch (err) {
      console.error("Profile update error:", err);
      profileMessageEl.textContent =
        "Failed to update profile. Please try again.";
      showToast("Failed to update profile.", "error");
      return;
    }

    showToast("Profile updated.", "success");
  });

  menuItemsListEl?.addEventListener("click", async (e) => {
    const target = e.target;
    const card = target.closest(".menu-item-card");
    if (!card) return;

    const itemId = card.dataset.id;

    if (target.matches(".edit-btn")) {
      $("menu-item-id").value = itemId;
      $("item-name").value = card.dataset.name;
      $("item-price").value = card.dataset.price;
      $("item-category").value = card.dataset.category;
      $("item-image-url").value = card.dataset.imageUrl;

      menuFormTitle.textContent = "Edit Menu Item";
      saveItemBtn.textContent = "Update Item";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

      if (target.matches(".delete-btn")) {
        const confirmed = confirm("Delete this menu item?");
        if (!confirmed) return;
        try {
          await deleteDoc(doc(menusCollection, itemId));
        } catch (err) {
          console.error("Error deleting menu item:", err);
          alert("Failed to delete item.");
          showToast("Failed to delete item.", "error");
          return;
        }
        showToast("Menu item deleted.", "success");
      }
  });

  function resetMenuForm() {
    $("menu-item-id").value = "";
    $("item-name").value = "";
    $("item-price").value = "";
    $("item-category").value = "";
    $("item-image-url").value = "";
    menuFormTitle.textContent = "Add Menu Item";
    saveItemBtn.textContent = "Save Item";
  }

  // Upgrade plan button (demo – no real payment integration)
  upgradePlanBtn?.addEventListener("click", async () => {
    if (!currentUser) return;

    if (typeof Razorpay === "undefined") {
      showToast("Payment system not loaded. Please refresh the page.", "error");
      return;
    }

    try {
      upgradePlanBtn.disabled = true;
      upgradePlanBtn.textContent = "Opening payment...";

      const createOrder = httpsCallable(functions, "createRazorpayOrder");
      const result = await createOrder({ planId: "pro-monthly" });
      const data = result.data || {};

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: data.displayName || "ScanMenu Premium",
        description: data.description || "Premium subscription",
        order_id: data.orderId,
        prefill: {
          email: profileEmailEl?.value || currentUser.email || "",
          contact: profileWhatsappEl?.value || ""
        },
        theme: {
          color: "#2563eb"
        },
        handler: async function (response) {
          try {
            const confirmPayment = httpsCallable(
              functions,
              "confirmRazorpayPayment"
            );
            await confirmPayment({
              planId: "pro-monthly",
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            // Persist premium plan on the user document as well.
            await setDoc(
              doc(usersCollection, currentUser.uid),
              { plan: "premium" },
              { merge: true }
            );

            // Locally update plan state after successful confirmation.
            currentPlan = "premium";
            if (currentPlanLabelEl) currentPlanLabelEl.textContent = "Premium";
            if (sidebarPlanEl) sidebarPlanEl.textContent = "Premium";
            const menuUsageEl = document.getElementById("menu-usage");
            if (menuUsageEl) {
              menuUsageEl.textContent = `Premium plan: ${currentMenuCount} items (no limit)`;
            }

            showToast("Payment successful. You are now on Premium.", "success");
          } catch (err) {
            console.error("Payment confirmation error:", err);
            showToast(
              "Payment succeeded but we could not confirm it. Contact support.",
              "error"
            );
          } finally {
            upgradePlanBtn.disabled = false;
            upgradePlanBtn.textContent = "Upgrade to Premium";
          }
        },
        modal: {
          ondismiss: function () {
            upgradePlanBtn.disabled = false;
            upgradePlanBtn.textContent = "Upgrade to Premium";
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.on("payment.failed", function () {
        showToast("Payment failed or cancelled.", "error");
        upgradePlanBtn.disabled = false;
        upgradePlanBtn.textContent = "Upgrade to Premium";
      });

      rzp.open();
    } catch (err) {
      console.error("Plan upgrade error:", err);
      showToast("Failed to start payment. Please try again.", "error");
      upgradePlanBtn.disabled = false;
      upgradePlanBtn.textContent = "Upgrade to Premium";
    }
  });
}

// Render menu items in dashboard
function renderDashboardMenuItems(items, container) {
  container.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "menu-item-card";
    card.dataset.id = item.id;
    card.dataset.name = item.name || "";
    card.dataset.price = item.price ?? "";
    card.dataset.category = item.category || "";
    card.dataset.imageUrl = item.image || "";

    const img = document.createElement("img");
    img.className = "menu-item-thumb";
    img.src = item.image || "";
    img.alt = item.name || "Menu item";
    if (!item.image) img.style.visibility = "hidden";

    const content = document.createElement("div");
    content.className = "menu-item-content";

    const title = document.createElement("p");
    title.className = "menu-item-title";
    title.textContent = item.name || "Untitled";

    const meta = document.createElement("p");
    meta.className = "menu-item-meta";
    meta.innerHTML = `
      <span class="item-chip">${item.category || "Uncategorized"}</span>
      <span class="item-price">₹ ${Number(item.price || 0).toFixed(2)}</span>
    `;

    const actions = document.createElement("div");
    actions.className = "menu-item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary-btn edit-btn";
    editBtn.textContent = "Edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "secondary-btn delete-btn";
    deleteBtn.textContent = "Delete";

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(actions);

    card.appendChild(img);
    card.appendChild(content);

    container.appendChild(card);
  });
}

// ----------------------
// PUBLIC MENU PAGE (legacy implementation)
// ----------------------
function initPublicMenuPageLegacy() {
  const restaurantNameEl = $("public-restaurant-name");
  const subtitleEl = $("public-restaurant-subtitle");
  const containerEl = $("public-menu-container");
  const messageEl = $("public-menu-message");
  const whatsappBar = $("whatsapp-bar");
  const whatsappCountEl = $("whatsapp-count");
  const whatsappTotalEl = $("whatsapp-total");
  const whatsappSendBtn = $("whatsapp-send-btn");
  const customerNameInput = $("customer-name-input");
  const tableNumberInput = $("table-number-input");
  const tableErrorEl = $("table-error");

  const selectedItems = new Map();
  const restaurantMeta = {
    name: "",
    whatsappNumber: null
  };

  const userId = getUserIdFromQuery();

  if (!userId) {
    restaurantNameEl.textContent = "Menu not found";
    subtitleEl.textContent =
      "The menu link seems invalid. Please check the URL.";
    messageEl.textContent = "";
    return;
  }

  // Load user / restaurant info
  getDoc(doc(usersCollection, userId))
    .then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        restaurantMeta.name = data.restaurantName || "Restaurant Menu";
        restaurantMeta.whatsappNumber = data.whatsappNumber || null;
        restaurantNameEl.textContent = restaurantMeta.name;
        subtitleEl.textContent = "Browse our latest offerings below.";
      } else {
        restaurantNameEl.textContent = "Menu not found";
        subtitleEl.textContent =
          "This restaurant does not exist or was removed.";
      }
    })
    .catch((err) => {
      console.error("Error loading restaurant:", err);
      restaurantNameEl.textContent = "Menu not available";
      subtitleEl.textContent = "Please try again later.";
    });

  const q = query(menusCollection, where("userId", "==", userId));

  onSnapshot(
    q,
    (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort client-side by category then name to avoid index requirement
      items.sort((a, b) => {
        const catA = (a.category || "").toLowerCase();
        const catB = (b.category || "").toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      if (!items.length) {
        containerEl.innerHTML = "";
        messageEl.textContent = "No items in the menu yet.";
        return;
      }

      const categories = {};
      items.forEach((item) => {
        const cat = (item.category || "Others").trim() || "Others";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
      });

      containerEl.innerHTML = "";
      messageEl.textContent = "";

      Object.keys(categories)
        .sort((a, b) => a.localeCompare(b))
        .forEach((category) => {
          const section = document.createElement("section");
          section.className = "menu-category";

          const title = document.createElement("h2");
          title.className = "menu-category-title";
          title.textContent = category;

          const list = document.createElement("div");
          list.className = "public-menu-items";

          categories[category].forEach((item) => {
            const row = document.createElement("div");
            row.className = "public-menu-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "whatsapp-checkbox";
            checkbox.dataset.itemId = item.id;
            checkbox.dataset.name = item.name || "Untitled";
            checkbox.dataset.price = Number(item.price || 0).toFixed(2);

            const thumb = document.createElement("img");
            thumb.className = "public-menu-thumb";
            thumb.src = item.image || "";
            thumb.alt = item.name || "Menu item";
            if (!item.image) thumb.style.visibility = "hidden";

            const details = document.createElement("div");
            details.className = "public-menu-details";

            const name = document.createElement("p");
            name.className = "public-menu-name";
            name.textContent = item.name || "Untitled";

            const price = document.createElement("div");
            price.className = "public-menu-price";
            price.textContent = `₹ ${Number(item.price || 0).toFixed(2)}`;

            details.appendChild(name);

            row.appendChild(checkbox);
            row.appendChild(thumb);
            row.appendChild(details);
            row.appendChild(price);

            list.appendChild(row);
          });

          section.appendChild(title);
          section.appendChild(list);
          containerEl.appendChild(section);
        });
    },
    (error) => {
      console.error("Error loading public menu:", error);
      messageEl.textContent = "Failed to load menu.";
    }
  );

  containerEl.addEventListener("change", (e) => {
    const target = e.target;
    if (!target.classList.contains("whatsapp-checkbox")) return;

    const id = target.dataset.itemId;
    const name = target.dataset.name || "Item";
    const price = parseFloat(target.dataset.price || "0") || 0;

    if (target.checked) {
      selectedItems.set(id, { name, price });
    } else {
      selectedItems.delete(id);
    }

    updateWhatsappBar();
  });

  function updateWhatsappBar() {
    if (!whatsappBar) return;
    const count = selectedItems.size;
    if (!count) {
      whatsappBar.classList.add("hidden");
      return;
    }

    let total = 0;
    selectedItems.forEach((item) => {
      total += item.price;
    });

    whatsappBar.classList.remove("hidden");
    if (whatsappCountEl) {
      whatsappCountEl.textContent = `${count} item${count > 1 ? "s" : ""} selected`;
    }
    if (whatsappTotalEl) {
      whatsappTotalEl.textContent = total
        ? `Approx total: ₹ ${total.toFixed(2)}`
        : "";
    }
  }

  whatsappSendBtn?.addEventListener("click", () => {
    if (!selectedItems.size) return;

    const lines = [];
    const title = restaurantMeta.name || "your restaurant";
    lines.push(`Order for ${title}`);
    lines.push("");

    let index = 1;
    let total = 0;
    selectedItems.forEach((item) => {
      lines.push(`${index}. ${item.name} - ₹ ${item.price.toFixed(2)}`);
      total += item.price;
      index += 1;
    });

    if (total) {
      lines.push("");
      lines.push(`Total (approx): ₹ ${total.toFixed(2)}`);
    }

    lines.push("");
    lines.push("Please confirm availability and final total.");

    const text = encodeURIComponent(lines.join("\n"));
    const number = restaurantMeta.whatsappNumber;
    const baseUrl = number
      ? `https://wa.me/${encodeURIComponent(number)}`
      : "https://wa.me/";
  const url = `${baseUrl}?text=${text}`;

    window.open(url, "_blank");
  });
}

// New public menu implementation that requires
// customer name and table number and sends the
// order to the restaurant's WhatsApp.
function initPublicMenuPage() {
  const restaurantNameEl = $("public-restaurant-name");
  const subtitleEl = $("public-restaurant-subtitle");
  const containerEl = $("public-menu-container");
  const messageEl = $("public-menu-message");
  const whatsappBar = $("whatsapp-bar");
  const whatsappCountEl = $("whatsapp-count");
  const whatsappTotalEl = $("whatsapp-total");
  const whatsappSendBtn = $("whatsapp-send-btn");
  const customerNameInput = $("customer-name-input");
  const tableNumberInput = $("table-number-input");
  const tableErrorEl = $("table-error");

  const selectedItems = new Map();
  const restaurantMeta = {
    name: "",
    whatsappNumber: null
  };

  const userId = getUserIdFromQuery();

  if (!userId) {
    restaurantNameEl.textContent = "Menu not found";
    subtitleEl.textContent =
      "The menu link seems invalid. Please check the URL.";
    messageEl.textContent = "";
    return;
  }

  // Load restaurant details
  getDoc(doc(usersCollection, userId))
    .then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        restaurantMeta.name = data.restaurantName || "Restaurant Menu";
        restaurantMeta.whatsappNumber = data.whatsappNumber || null;
        restaurantNameEl.textContent = restaurantMeta.name;
        subtitleEl.textContent = "Select items and send your order on WhatsApp.";
      } else {
        restaurantNameEl.textContent = "Menu not found";
        subtitleEl.textContent =
          "This restaurant does not exist or was removed.";
      }
    })
    .catch((err) => {
      console.error("Error loading restaurant:", err);
      restaurantNameEl.textContent = "Menu not available";
      subtitleEl.textContent = "Please try again later.";
    });

  const q = query(menusCollection, where("userId", "==", userId));

  onSnapshot(
    q,
    (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort client-side by category then name
      items.sort((a, b) => {
        const catA = (a.category || "").toLowerCase();
        const catB = (b.category || "").toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      if (!items.length) {
        containerEl.innerHTML = "";
        messageEl.textContent = "No items in the menu yet.";
        return;
      }

      const categories = {};
      items.forEach((item) => {
        const cat = (item.category || "Others").trim() || "Others";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
      });

      containerEl.innerHTML = "";
      messageEl.textContent = "";

      Object.keys(categories)
        .sort((a, b) => a.localeCompare(b))
        .forEach((category) => {
          const section = document.createElement("section");
          section.className = "menu-category";

          const title = document.createElement("h2");
          title.className = "menu-category-title";
          title.textContent = category;

          const list = document.createElement("div");
          list.className = "public-menu-items";

          categories[category].forEach((item) => {
            const row = document.createElement("div");
            row.className = "public-menu-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "whatsapp-checkbox";
            checkbox.dataset.itemId = item.id;
            checkbox.dataset.name = item.name || "Untitled";
            checkbox.dataset.price = Number(item.price || 0).toFixed(2);

            const thumb = document.createElement("img");
            thumb.className = "public-menu-thumb";
            thumb.src = item.image || "";
            thumb.alt = item.name || "Menu item";
            if (!item.image) thumb.style.visibility = "hidden";

            const details = document.createElement("div");
            details.className = "public-menu-details";

            const name = document.createElement("p");
            name.className = "public-menu-name";
            name.textContent = item.name || "Untitled";

            const price = document.createElement("div");
            price.className = "public-menu-price";
            price.textContent = `₹ ${Number(item.price || 0).toFixed(2)}`;

            details.appendChild(name);

            row.appendChild(checkbox);
            row.appendChild(thumb);
            row.appendChild(details);
            row.appendChild(price);

            list.appendChild(row);
          });

          section.appendChild(title);
          section.appendChild(list);
          containerEl.appendChild(section);
        });
    },
    (error) => {
      console.error("Error loading public menu:", error);
      messageEl.textContent = "Failed to load menu.";
    }
  );

  containerEl.addEventListener("change", (e) => {
    const target = e.target;
    if (!target.classList.contains("whatsapp-checkbox")) return;

    const id = target.dataset.itemId;
    const name = target.dataset.name || "Item";
    const price = parseFloat(target.dataset.price || "0") || 0;

    if (target.checked) {
      selectedItems.set(id, { name, price });
    } else {
      selectedItems.delete(id);
    }

    const count = selectedItems.size;
    if (!whatsappBar) return;
    if (!count) {
      whatsappBar.classList.add("hidden");
      return;
    }

    let total = 0;
    selectedItems.forEach((item) => {
      total += item.price;
    });

    whatsappBar.classList.remove("hidden");
    if (whatsappCountEl) {
      whatsappCountEl.textContent = `${count} item${count > 1 ? "s" : ""} selected`;
    }
    if (whatsappTotalEl) {
      whatsappTotalEl.textContent = total
        ? `Approx total: ₹ ${total.toFixed(2)}`
        : "";
    }
  });

  whatsappSendBtn?.addEventListener("click", () => {
    if (!selectedItems.size) return;

    const customerName = customerNameInput
      ? customerNameInput.value.trim()
      : "";
    const tableNumber = tableNumberInput
      ? tableNumberInput.value.trim()
      : "";

    if (!customerName || !tableNumber) {
      if (tableErrorEl) {
        tableErrorEl.textContent =
          "Please enter your name and table number before sending.";
      }
      return;
    }

    if (tableErrorEl) {
      tableErrorEl.textContent = "";
    }

    const lines = [];
    const title = restaurantMeta.name || "your restaurant";
    lines.push(`Order for ${title}`);
    lines.push(`Customer: ${customerName}`);
    lines.push(`Table: ${tableNumber}`);
    lines.push("");

    let index = 1;
    let total = 0;
    selectedItems.forEach((item) => {
      lines.push(`${index}. ${item.name} - ₹ ${item.price.toFixed(2)}`);
      total += item.price;
      index += 1;
    });

    if (total) {
      lines.push("");
      lines.push(`Total (approx): ₹ ${total.toFixed(2)}`);
    }

    lines.push("");
    lines.push("Please confirm availability and final total.");

    const text = encodeURIComponent(lines.join("\n"));
    const number = restaurantMeta.whatsappNumber;
    const baseUrl = number
      ? `https://wa.me/${encodeURIComponent(number)}`
      : "https://wa.me/";
    const url = `${baseUrl}?text=${text}`;

    window.open(url, "_blank");
  });
}

function getUserIdFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  } catch (err) {
    console.error("Error reading menu URL:", err);
    return null;
  }
}
