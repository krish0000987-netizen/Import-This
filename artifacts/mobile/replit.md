# Safar Go

## Overview

Safar Go is a premium luxury travel booking mobile app built with Expo (React Native) for the frontend and Express.js for the backend. It connects customers with drivers for inter-city travel bookings across Indian destinations (Ayodhya, Varanasi, Lucknow, Agra, Mathura, Prayagraj). The app operates as a car-hire/travel service with three user roles: customers, drivers, and admins.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, new architecture enabled, React 19
- **Routing**: expo-router with file-based routing. The `app/` directory contains route groups organized by user role:
  - `app/index.tsx` — Welcome/splash screen with auto-redirect based on authenticated user's role
  - `app/auth.tsx` — Combined login/registration screen with role selection, quick demo login, and T&C acceptance checkbox on sign-up (shows Driver Agreement link when driver role selected)
  - `app/customer/` — Customer flow with tab navigation (Home, Bookings, Profile), plus destination detail and booking screens
  - `app/driver/` — Driver flow with tab navigation (Dashboard, Earnings, Profile)
  - `app/admin/` — Admin dashboard with tab navigation (Dashboard, Drivers, Manage)
  - `app/destination/[id].tsx` — Destination detail screen with booking flow
  - `app/booking/create.tsx` — Booking form presented as modal
- **State Management**: React Context for auth (`contexts/AuthContext.tsx`), theme (`contexts/ThemeContext.tsx`), and data (`contexts/DataContext.tsx`). Data persistence via AsyncStorage.
- **Styling**: React Native `StyleSheet` with a custom theme system. **White/light theme is the default**, with dark mode available via toggle in Profile (persisted in AsyncStorage). Gold accent color (`#C5A55A`) is the brand color. Fonts are Playfair Display (headings) and Poppins (body) via `@expo-google-fonts`.
- **Tab bars**: Support for native iOS tab bars via `expo-router/unstable-native-tabs` with `expo-glass-effect` detection, falling back to classic tab layout on other platforms
- **Animations**: `react-native-reanimated` for enter animations (FadeInDown, FadeInUp)
- **Haptic feedback**: `expo-haptics` used on button presses and interactions (guarded by platform check for web)
- **Maps**: Full Mapbox GL JS map on both web and Android/iOS — identical experience across platforms. Architecture:
  - `components/mapHtmlBuilder.ts` — shared HTML builder (pure TypeScript function, no platform suffix) that generates the Mapbox GL JS page with bottom-sheet search panel, ride type selector, surge toggle, route drawing, and locate button. Uses `postToParent()` helper that works with both `window.parent.postMessage` (web iframe) and `window.ReactNativeWebView.postMessage` (native WebView).
  - `components/MapWrapper.web.tsx` — web version: renders HTML via `<iframe>`, listens to `window.addEventListener('message')`, sends messages via `iframe.contentWindow.postMessage`.
  - `components/MapWrapper.native.tsx` — Android/iOS version: renders HTML via `react-native-webview`, listens to `onMessage`, sends messages via `webViewRef.current.injectJavaScript`. Exposes same `mapRef` API as web.
  - `components/MapWrapper.tsx` — legacy react-native-maps fallback (no longer used but kept for reference).
  - Map height on all platforms: `Math.min(height * 0.78, 620)` — same responsive height on web and Android.
  - Search UI, ride type selection, and fare calculation are all built into the Mapbox HTML (no separate React Native search overlays on the home screen).
- **Icon fonts**: Ionicons, MaterialIcons, MaterialCommunityIcons TTF files are copied to `assets/fonts/` and loaded via `expo-font`'s `useFonts` with the exact font family names the icon components expect (`ionicons`, `material`, `material-community`). This ensures icons render on both web and native (Expo Go).
- **Driver tracking**: My Rides screen has "Track Driver" button on confirmed/in_progress bookings, opens full-screen map modal with live driver position, route polyline, and bottom sheet with driver info
- **Terms & Conditions**: `app/terms.tsx` — scrollable T&C page with 17 sections (SAFAR GO Mobility Services Pvt. Ltd., last updated 1 March 2026). Accessible from auth screen link, customer profile, and driver profile settings
- **Driver Agreement**: `app/driver-agreement.tsx` — scrollable Driver Partner Agreement page with 13 sections covering contractor status, eligibility, vehicle requirements, earnings (with explicit 15% commission per ride to Safar Go), cancellation rules, safety, liability, and termination. Accessible from driver profile settings

### Backend (Express.js + Socket.IO)

- **Runtime**: Node.js with Express 5, TypeScript. Dev server runs with `tsx`, production build uses `esbuild`
- **Entry point**: `server/index.ts` — sets up CORS, JSON parsing, creates HTTP server, attaches Socket.IO, and serves landing page
- **Routes**: `server/routes.ts` — REST API for ride lifecycle (create, accept, reject, status updates, earnings, simulate)
- **Socket**: `server/socket.ts` — Socket.IO server with in-memory driver registry, Haversine matching engine. Broadcasts ride to ALL online drivers simultaneously, 20s timeout, race-condition-safe `acceptRide`, `rideUnavailable` to losing drivers, Expo push notification support for offline drivers, live location broadcasting
- **Pay per KM page**: `server/templates/pricing.html` — served at `/pricing`, shows per-km rates and vehicle-wise fares for all 6 destinations

### Data Layer

- **Local storage**: AsyncStorage for user sessions, bookings, favorites, coupons, reviews, tickets, and theme preferences
- **Seed data**: `constants/data.ts` contains destination info, sample bookings, sample drivers, sample coupons, sample reviews, sample tickets, sample withdrawals
- **Demo accounts**: customer@safargo.com, driver@safargo.com, admin@safargo.com (any password)
- **Data types**: BookingData, UserData, DriverData, CouponData, ReviewData, DriverDocument, SupportTicket, WithdrawalRequest

### Key Features

#### Customer App
- Browse 6 curated Indian destinations OR search **any location in India** via free Photon geocoding API
- **OSRM route distance**: When both pickup and destination are searched via Photon, real road distance is calculated via OSRM (`router.project-osrm.org`) — no API key needed, works for all of India
- Book rides with vehicle type selection (5 Seater / 7 Seater), date/time picker, pickup location
- **Auto-calculated pricing**: Under 10 km = ₹15/km, 10 km+ = ₹12/km. 7-seater adds ₹1/km extra. Fare computed via `calculateFare()` in `constants/data.ts`
- **Dynamic fare for any destination**: Fare shown in booking screen updates per vehicle type using road distance from OSRM
- **Coupon/promo code system**: Apply coupons during booking with real-time validation (expiry check, usage limits, min order amount), automatic discount calculation (percentage/flat with max caps), visual feedback with original fare strikethrough
- **Driver details on trip cards**: Avatar, rating, vehicle info, license plate displayed on booking cards
- **Rating/review system**: 5-star rating modal for completed rides with optional comments, duplicate review prevention via hasReview flag
- **Driver tracking**: Full-screen map modal with live driver position for confirmed/in_progress rides

#### Driver App
- **Dashboard**: Active ride requests with acceptance/rejection modal showing route preview, fare details, and passenger info; blocked account warning banner
- **Earnings**: Period selection (today/week/month), gross/commission/net breakdown with fixed 15% platform commission, wallet balance with withdrawal request modal, transaction history
- **5-document KYC upload**: Driving license, RC, Aadhaar, insurance, PAN with 4-state verification workflow (not_uploaded → uploaded → verified/rejected), upload/expiry dates, rejection reasons, progress bar
- **Profile**: Vehicle info, KYC status, document management, reviews, dark mode toggle

#### Admin Panel
- **Dashboard**: Overview stats (total bookings, revenue, active drivers, commission, avg rating)
- **Coupon management**: Create/edit/delete coupons, discount type selection (percentage/flat), usage tracking, expiry management, activate/deactivate toggles
- **Support tickets**: Priority levels (low/medium/high), status tracking (open/in_progress/resolved), response functionality with automatic status resolution, role-based badges
- **Commission settings**: Configurable platform commission rate (5-30%) with +/- controls, revenue/commission display
- **Driver management**: Detailed driver view modal with all stats/documents/reviews, document verification/rejection actions (one-click approve), block/unblock functionality, KYC approval/rejection, comprehensive driver analytics
- **Withdrawal management**: View pending withdrawal requests, approve/reject actions

### Build & Deploy

- **Dev mode**: Two processes — `expo:dev` for the Expo dev server and `server:dev` for the Express backend
- **Production**: `expo:static:build` runs a custom build script, then `server:build` bundles the server with esbuild
- **Port**: The Express server runs on port 5000, Expo on port 8081

## Recent Changes (Feb 2026)

- Added complete coupon/promo code system with validation and discount calculation in booking flow
- Implemented driver details display and rating/review system for completed rides
- Built 5-document KYC upload system with 4-state verification workflow in driver profile
- Enhanced earnings screen with period breakdowns, commission deductions, and withdrawal requests
- Added ride acceptance/rejection modal with route preview in driver dashboard
- Created admin coupon management with create/edit/activate/deactivate/delete functionality
- Built admin support ticket system with priority levels and response functionality
- Enhanced admin driver management with document verification, block/unblock, and detailed analytics
- Added withdrawal management for admin to approve/reject driver withdrawal requests
