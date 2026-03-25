export interface Destination {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image: any;
  distance: string;
  distanceKm: number;
  duration: string;
  basePrice: number;
  pricePerKm: number;
  rating: number;
  reviewCount: number;
  highlights: string[];
  popular: boolean;
  latitude: number;
  longitude: number;
}

export interface CustomDestination {
  id: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  distance: string;
  distanceKm: number;
  duration: string;
  basePrice: number;
  pricePerKm: number;
  rating: number;
  reviewCount: number;
  highlights: string[];
  popular: boolean;
  latitude: number;
  longitude: number;
  isCustom: true;
  createdAt: string;
}

export type DestinationItem = (Destination & { isCustom?: false }) | CustomDestination;

export interface DestinationOverride {
  name?: string;
  tagline?: string;
  description?: string;
  distance?: string;
  distanceKm?: number;
  duration?: string;
  basePrice?: number;
  pricePerKm?: number;
  rating?: number;
  reviewCount?: number;
  highlights?: string[];
  popular?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface PickupLocation {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
}

export const popularPickupLocations: PickupLocation[] = [
  { id: "p1", name: "Hazratganj", area: "Central Lucknow", latitude: 26.8500, longitude: 80.9430 },
  { id: "p2", name: "Gomti Nagar", area: "East Lucknow", latitude: 26.8560, longitude: 80.9820 },
  { id: "p3", name: "Aliganj", area: "North Lucknow", latitude: 26.8800, longitude: 80.9300 },
  { id: "p4", name: "Alambagh", area: "South Lucknow", latitude: 26.8100, longitude: 80.9100 },
  { id: "p5", name: "Charbagh Railway Station", area: "Central Lucknow", latitude: 26.8356, longitude: 80.9189 },
  { id: "p6", name: "Amausi Airport", area: "Lucknow Airport", latitude: 26.7606, longitude: 80.8893 },
  { id: "p7", name: "Indira Nagar", area: "East Lucknow", latitude: 26.8700, longitude: 80.9900 },
  { id: "p8", name: "Mahanagar", area: "Central Lucknow", latitude: 26.8700, longitude: 80.9350 },
  { id: "p9", name: "Rajajipuram", area: "West Lucknow", latitude: 26.8550, longitude: 80.9050 },
  { id: "p10", name: "Chinhat", area: "East Lucknow", latitude: 26.8800, longitude: 81.0200 },
];

export interface BookingData {
  id: string;
  userId: string;
  destinationId: string;
  destinationName: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  vehicleType: "sedan" | "suv";
  passengers: number;
  fare: number;
  originalFare?: number;
  couponCode?: string;
  couponDiscount?: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  driverVehicle?: string;
  driverVehicleNumber?: string;
  pickupLocation: string;
  hasReview?: boolean;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "driver" | "admin";
  walletBalance: number;
  totalTrips: number;
  memberSince: string;
}

export interface DriverData extends UserData {
  vehicle: string;
  vehicleNumber: string;
  rating: number;
  isAvailable: boolean;
  isBlocked: boolean;
  kycStatus: "pending" | "submitted" | "approved" | "rejected";
  totalEarnings: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  completedTrips: number;
  commissionRate: number;
  documents: DriverDocument[];
}

export const destinations: Destination[] = [
  {
    id: "1",
    name: "Ayodhya",
    tagline: "City of Lord Ram",
    description:
      "Ayodhya, the birthplace of Lord Ram, is a city of immense spiritual significance. Visit the grand Ram Mandir, explore ancient temples, and experience the divine evening aarti on the banks of the Saryu River.",
    image: require("@/assets/images/destinations/ayodhya.jpg"),
    distance: "134 km",
    distanceKm: 134,
    duration: "2h 30m",
    basePrice: 1608,
    pricePerKm: 12,
    rating: 4.8,
    reviewCount: 1247,
    highlights: [
      "Ram Mandir",
      "Saryu River Aarti",
      "Hanuman Garhi",
      "Kanak Bhawan",
    ],
    popular: true,
    latitude: 26.7922,
    longitude: 82.1998,
  },
  {
    id: "2",
    name: "Varanasi",
    tagline: "City of Light",
    description:
      "Varanasi, one of the oldest living cities in the world, offers a mesmerizing blend of spirituality and culture. Witness the iconic Ganga Aarti, explore narrow lanes filled with ancient temples, and take a sunrise boat ride.",
    image: require("@/assets/images/destinations/varanasi.jpg"),
    distance: "320 km",
    distanceKm: 320,
    duration: "5h 15m",
    basePrice: 3840,
    pricePerKm: 12,
    rating: 4.9,
    reviewCount: 3456,
    highlights: [
      "Ganga Aarti",
      "Kashi Vishwanath",
      "Boat Ride at Dawn",
      "Sarnath",
    ],
    popular: true,
    latitude: 25.3176,
    longitude: 82.9739,
  },
  {
    id: "3",
    name: "Lucknow",
    tagline: "City of Nawabs",
    description:
      "Experience the royal heritage of Lucknow with its magnificent Mughal architecture, legendary cuisine, and warm hospitality. From Bara Imambara to the bustling markets of Aminabad, every corner tells a story.",
    image: require("@/assets/images/destinations/lucknow.jpg"),
    distance: "0 km",
    distanceKm: 0,
    duration: "Local",
    basePrice: 0,
    pricePerKm: 15,
    rating: 4.7,
    reviewCount: 2189,
    highlights: [
      "Bara Imambara",
      "Chota Imambara",
      "Tunday Kebabs",
      "Rumi Darwaza",
    ],
    popular: false,
    latitude: 26.8467,
    longitude: 80.9462,
  },
  {
    id: "4",
    name: "Agra",
    tagline: "City of the Taj",
    description:
      "Home to the iconic Taj Mahal, Agra is a testament to Mughal grandeur. Beyond the Taj, discover the majestic Agra Fort, the exquisite Itimad-ud-Daulah, and savor the famous Agra Petha.",
    image: require("@/assets/images/destinations/agra.jpg"),
    distance: "335 km",
    distanceKm: 335,
    duration: "5h 30m",
    basePrice: 4020,
    pricePerKm: 12,
    rating: 4.9,
    reviewCount: 5672,
    highlights: [
      "Taj Mahal",
      "Agra Fort",
      "Mehtab Bagh",
      "Fatehpur Sikri",
    ],
    popular: true,
    latitude: 27.1767,
    longitude: 78.0081,
  },
  {
    id: "5",
    name: "Mathura",
    tagline: "Birthplace of Krishna",
    description:
      "Mathura, the birthplace of Lord Krishna, is a vibrant holy city filled with colorful temples, sacred ghats, and the joyous spirit of devotion. Experience the famous Holi celebrations and visit Vrindavan nearby.",
    image: require("@/assets/images/destinations/mathura.jpg"),
    distance: "280 km",
    distanceKm: 280,
    duration: "4h 45m",
    basePrice: 3360,
    pricePerKm: 12,
    rating: 4.6,
    reviewCount: 1834,
    highlights: [
      "Krishna Janmabhoomi",
      "Vrindavan Temples",
      "Vishram Ghat",
      "Govardhan Hill",
    ],
    popular: false,
    latitude: 27.4924,
    longitude: 77.6737,
  },
  {
    id: "6",
    name: "Prayagraj",
    tagline: "City of Confluence",
    description:
      "Prayagraj, where the sacred rivers Ganga, Yamuna, and the mythical Saraswati converge, is one of India's holiest cities. Visit the Triveni Sangam, Anand Bhawan, and experience the grandeur of the Kumbh Mela grounds.",
    image: require("@/assets/images/destinations/prayagraj.jpg"),
    distance: "198 km",
    distanceKm: 198,
    duration: "3h 30m",
    basePrice: 2376,
    pricePerKm: 12,
    rating: 4.5,
    reviewCount: 1456,
    highlights: [
      "Triveni Sangam",
      "Anand Bhawan",
      "Allahabad Fort",
      "Khusro Bagh",
    ],
    popular: false,
    latitude: 25.4358,
    longitude: 81.8463,
  },
];

export const LUCKNOW_CENTER = { latitude: 26.8467, longitude: 80.9462 };

export const simulatedDriverLocations: { id: string; name: string; vehicle: string; latitude: number; longitude: number; rating: number }[] = [];

export interface CouponData {
  id: string;
  code: string;
  discountType: "flat" | "percentage";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  usageLimit: number;
  usedCount: number;
  expiryDate: string;
  isActive: boolean;
  description: string;
}

export interface ReviewData {
  id: string;
  bookingId: string;
  userId: string;
  driverId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface DriverDocument {
  type: "driving_license" | "rc" | "aadhaar" | "insurance" | "pan";
  label: string;
  status: "not_uploaded" | "uploaded" | "verified" | "rejected";
  uploadDate?: string;
  expiryDate?: string;
  rejectionReason?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userRole: "customer" | "driver";
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  date: string;
  response?: string;
}

export interface WithdrawalRequest {
  id: string;
  driverId: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  date: string;
  bankDetails: string;
}

export const vehicleTypes = {
  sedan: { name: "5 Seater", seats: 5, capacity: 5, icon: "car-outline" as const },
  suv: { name: "7 Seater", seats: 7, capacity: 7, icon: "car-sport-outline" as const },
};

export function calculateFare(distanceKm: number, vehicleKey: "sedan" | "suv"): number {
  const seats = vehicleTypes[vehicleKey].seats;
  let ratePerKm: number;
  if (distanceKm < 10) {
    ratePerKm = 15;
  } else {
    ratePerKm = 12;
  }
  if (seats === 7) {
    ratePerKm += 1;
  }
  return Math.round(distanceKm * ratePerKm);
}

export const sampleBookings: BookingData[] = [];

export const defaultDriverDocuments: DriverDocument[] = [
  { type: "driving_license", label: "Driving License", status: "not_uploaded" },
  { type: "rc", label: "Vehicle Registration (RC)", status: "not_uploaded" },
  { type: "aadhaar", label: "Aadhaar Card", status: "not_uploaded" },
  { type: "insurance", label: "Vehicle Insurance", status: "not_uploaded" },
  { type: "pan", label: "PAN Card", status: "not_uploaded" },
];

export const sampleDrivers: DriverData[] = [];

export const sampleCoupons: CouponData[] = [
  {
    id: "c1",
    code: "FIRST50",
    discountType: "percentage",
    discountValue: 50,
    minOrderAmount: 1000,
    maxDiscount: 500,
    usageLimit: 100,
    usedCount: 45,
    expiryDate: "2026-06-30",
    isActive: true,
    description: "50% off on your first ride (max \u20B9500)",
  },
  {
    id: "c2",
    code: "SAFAR200",
    discountType: "flat",
    discountValue: 200,
    minOrderAmount: 2000,
    maxDiscount: 200,
    usageLimit: 500,
    usedCount: 123,
    expiryDate: "2026-04-30",
    isActive: true,
    description: "\u20B9200 flat off on rides above \u20B92,000",
  },
  {
    id: "c3",
    code: "LUXURY25",
    discountType: "percentage",
    discountValue: 25,
    minOrderAmount: 5000,
    maxDiscount: 2000,
    usageLimit: 50,
    usedCount: 12,
    expiryDate: "2026-03-31",
    isActive: true,
    description: "25% off on 7 seater rides (max ₹2,000)",
  },
  {
    id: "c4",
    code: "WELCOME100",
    discountType: "flat",
    discountValue: 100,
    minOrderAmount: 500,
    maxDiscount: 100,
    usageLimit: 1000,
    usedCount: 890,
    expiryDate: "2025-12-31",
    isActive: false,
    description: "\u20B9100 off for new users (expired)",
  },
];

export const sampleReviews: ReviewData[] = [
  { id: "r1", bookingId: "b2", userId: "user1", driverId: "d2", rating: 5, comment: "Excellent driver, very comfortable ride to Ayodhya!", date: "2026-02-10" },
  { id: "r2", bookingId: "b3", userId: "user1", driverId: "d3", rating: 5, comment: "Luxury experience! Mercedes V-Class was amazing for Agra trip.", date: "2026-01-15" },
];

export const sampleTickets: SupportTicket[] = [
  {
    id: "t1",
    userId: "user1",
    userName: "Arjun Sharma",
    userRole: "customer",
    subject: "Refund for cancelled ride",
    message: "I cancelled my ride but haven't received the refund yet. Booking ID: b3",
    status: "open",
    priority: "high",
    date: "2026-02-18",
  },
  {
    id: "t2",
    userId: "d2",
    userName: "Amit Singh",
    userRole: "driver",
    subject: "Payment not received",
    message: "My last 2 trip payments are still pending in my wallet.",
    status: "in_progress",
    priority: "medium",
    date: "2026-02-17",
    response: "We are looking into this issue. Payment will be credited within 24 hours.",
  },
  {
    id: "t3",
    userId: "user1",
    userName: "Arjun Sharma",
    userRole: "customer",
    subject: "AC not working",
    message: "The AC in the car was not working during my Varanasi trip.",
    status: "resolved",
    priority: "low",
    date: "2026-02-15",
    response: "We apologize for the inconvenience. A \u20B9200 coupon has been added to your account.",
  },
];

export const sampleWithdrawals: WithdrawalRequest[] = [
  { id: "w1", driverId: "d1", amount: 5000, status: "completed", date: "2026-02-18", bankDetails: "SBI ****1234" },
  { id: "w2", driverId: "d1", amount: 3000, status: "pending", date: "2026-02-20", bankDetails: "SBI ****1234" },
  { id: "w3", driverId: "d3", amount: 10000, status: "completed", date: "2026-02-16", bankDetails: "HDFC ****5678" },
];
