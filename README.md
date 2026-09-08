# Styleswap India 🇮🇳🧥👟

> India's premier circular fashion & second-hand thrift marketplace to **buy, sell, and swap pre-loved western wear, vintage denim, streetwear hoodies, kicks, and accessories in Indian Rupees (₹)**.

---

## 🌟 Key Features for Indian Market

1. **Indian Rupee (₹) Pricing & Pan-India Context**
   - All listings, orders, carts, and checkout flows are strictly priced in **Indian Rupees (₹)** (e.g. ₹799, ₹1,299, ₹2,499, ₹4,800).
   - Delivery addresses tailored for Indian cities, landmarks, states, and PIN codes with support for Indian couriers (Delhivery, BlueDart, India Post).

2. **Authentic Second-Hand & Thrift Focus**
   - Curated for pre-owned branded western wear and streetwear popular among Indian college students and young professionals in Bengaluru, Mumbai, Delhi NCR, Pune, etc.
   - Real second-hand conditions:
     - `Like New (Barely Worn)`
     - `Gently Used (Good Condition)`
     - `Thrifted / Vintage Fade`
     - `Well Worn (Minor Flaws)`

3. **Zero-Cash Wardrobe Barter & Exchange**
   - Members can offer an item from their closet in exchange for another user's item.
   - Direct swap proposal modal with accept/decline flows. Once accepted, both items transition to `exchanged` status.

4. **Dedicated Admin & Moderation Portal (`/admin`)**
   - Platform metrics in ₹ GMV, user management (ban/unban), listing approval queue, category CRUD, and one-click CSV report exports.

---

## 🚀 Quick Start Guide

### 1. Installation
```bash
cd c:\Users\prave\Documents\smartware
npm install
```

### 2. Start the Server
```bash
npm start
# Or for development:
npm run dev
```

Visit the application in your browser:
- **Marketplace Web Portal:** [http://localhost:5000](http://localhost:5000)
- **Swap & Barter Hub:** [http://localhost:5000/listings?type=exchange](http://localhost:5000/listings?type=exchange)
- **Admin Control Center:** [http://localhost:5000/admin](http://localhost:5000/admin)
- **REST API:** [http://localhost:5000/api/listings](http://localhost:5000/api/listings)

---

## 🔐 Default Demo Accounts (Indian Thrifters & Admin)

| Role | Email | Password | Location / Description |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@smartware.com` | `Admin@12345` | Bengaluru • Full moderation, stats, category management |
| **🧥 Rohan Sharma** | `rohan@thriftfinds.in` | `User@12345` | Bengaluru • Vintage Levi's denim, leather jackets & flannels |
| **👗 Ananya Verma** | `ananya@prelovedwardrobe.in` | `User@12345` | Mumbai • Pre-loved Zara blazers, slip dresses & bags |
| **👟 Kabir Mehta** | `kabir@streetstyle.in` | `User@12345` | New Delhi • Heavyweight hoodies & sneaker swaps |

*(1-click pre-fill buttons are available on the [Login Page](http://localhost:5000/auth/login)).*

---

## 🛍️ Pre-Owned Categories (All in ₹)

1. **Thrifted Denim & Cargoes:** Vintage Levi's 501s, Lee straight leg jeans, skater denim, parachute pants.
2. **Streetwear Tees & Hoodies:** Oversized 450GSM French Terry hoodies, vintage washed graphic tees.
3. **Second-Hand Sneakers & Kicks:** Pre-owned Nike Air Jordan 1s, Dunks, Adidas Sambas, Converse.
4. **Vintage Jackets & Flannels:** 90s distressed faux leather biker jackets, brushed tartan flannels, bomber coats.
5. **Dresses, Corsets & Casual Tops:** Pre-loved Zara houndstooth blazers, silk slip dresses, knit vests.
6. **Pre-Loved Bags & Accessories:** Retro Casio gold digital watches, quilted leather crossbody slings, canvas tote bags.

---

## 🧪 Automated Testing

Run the test suite anytime:
```bash
node scripts/test-e2e.js
```
All 13 test suites verify SSR pages, Indian Rupee buy checkout, item swaps, user authentication, and admin moderation.
