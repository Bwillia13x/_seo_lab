// Belmont Barbershop Constants - Centralize all Belmont-specific data here
export const BELMONT_CONSTANTS = {
  // Business Info
  BUSINESS_NAME: "The Belmont Barbershop",
  BOOK_URL: "https://thebelmontbarber.ca/book",
  WEBSITE_URL: "https://thebelmontbarber.ca",
  PHONE_TEL: "tel:403-457-0420",
  PHONE_DISPLAY: "403-457-0420",
  ADDRESS_STR: "915 General Ave NE, Calgary, Alberta, T2E 9E1",
  MAP_URL: "https://maps.google.com/?q=915+General+Ave+NE,+Calgary,+AB,+T2E+9E1",

  // Review Links
  REVIEW_GOOGLE_URL:
    "https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID", // TODO: replace with actual Google Place ID
  REVIEW_APPLE_URL:
    "https://maps.apple.com/?q=915+General+Ave+NE,+Calgary,+AB,+T2E+9E1",

  // Social & Contact
  INSTAGRAM_URL: "https://instagram.com/thebelmontbarber",
  FACEBOOK_URL: "https://facebook.com/thebelmontbarber",

  // Services (for UTM content)
  SERVICES: [
    "mens-cut",
    "beard-trim",
    "hot-towel-shave",
    "skin-fade",
    "kids-cut",
    "groomsmen-party",
    "veterans-discount",
    "seniors-discount",
  ],

  // UTM Campaign Base
  UTM_CAMPAIGN_BASE: "belmont",

  // Local Keywords (Bridgeland focus)
  LOCAL_KEYWORDS: [
    "barber shop bridgeland",
    "mens haircut calgary",
    "bridgeland barber",
    "beard trim calgary",
    "hot shave bridgeland",
    "kids haircut calgary",
    "groomsmen party calgary",
  ],
};

// Pre-configured UTM Presets for Belmont
export const BELMONT_UTM_PRESETS = {
  gbp_post: {
    label: "GBP Post",
    source: "google",
    medium: "gbp",
    campaign: `${BELMONT_CONSTANTS.UTM_CAMPAIGN_BASE}_${new Date().toISOString().slice(0, 7)}`,
    content: "bridgeland-barber",
  },
  gbp_profile: {
    label: "GBP Profile",
    source: "google",
    medium: "gbp-profile",
    campaign: `${BELMONT_CONSTANTS.UTM_CAMPAIGN_BASE}_${new Date().toISOString().slice(0, 7)}`,
    content: "bridgeland-profile",
  },
  instagram_bio: {
    label: "Instagram Bio",
    source: "instagram",
    medium: "bio",
    campaign: `${BELMONT_CONSTANTS.UTM_CAMPAIGN_BASE}_${new Date().toISOString().slice(0, 7)}`,
    content: "bridgeland-bio",
  },
  instagram_post: {
    label: "Instagram Post",
    source: "instagram",
    medium: "post",
    campaign: `${BELMONT_CONSTANTS.UTM_CAMPAIGN_BASE}_${new Date().toISOString().slice(0, 7)}`,
    content: "bridgeland-post",
  },
  groomsmen_party: {
    label: "Groomsmen Party",
    source: "organic",
    medium: "referral",
    campaign: `${BELMONT_CONSTANTS.UTM_CAMPAIGN_BASE}_groomsmen_${new Date().toISOString().slice(0, 7)}`,
    content: "groomsmen-party",
  },
  veterans_discount: {
    label: "Veterans Discount",
    source: "organic",
    medium: "referral",
    campaign: `${BELMONT_CONSTANTS.UTM_CAMPAIGN_BASE}_veterans_${new Date().toISOString().slice(0, 7)}`,
    content: "veterans-discount",
  },
  first_responders: {
    label: "First Responders",
    source: "organic",
    medium: "referral",
    campaign: `${BELMONT_CONSTANTS.UTM_CAMPAIGN_BASE}_responders_${new Date().toISOString().slice(0, 7)}`,
    content: "first-responders",
  },
  seniors_kids: {
    label: "Seniors & Kids",
    source: "organic",
    medium: "referral",
    campaign: `${BELMONT_CONSTANTS.UTM_CAMPAIGN_BASE}_family_${new Date().toISOString().slice(0, 7)}`,
    content: "seniors-kids",
  },
};

// Belmont-specific content templates
export const BELMONT_CONTENT_TEMPLATES = {
  gbp_posts: [
    "✂️ Premium men's haircut in Bridgeland! Book your appointment today and experience the difference. #Bridgeland #CalgaryBarber #MensHaircut",
    "🧔 Expert beard trimming and styling in Calgary's Bridgeland neighborhood. Walk-ins welcome! #BeardTrim #Calgary #BridgelandBarber",
    "🔥 Hot towel shave experience at The Belmont Barbershop. Relax and rejuvenate in Bridgeland. #HotShave #CalgaryBarber #Bridgeland",
    "👶 Kid-friendly haircuts in a welcoming environment. Family barber shop in Bridgeland! #KidsHaircut #Calgary #FamilyBarber",
  ],
  instagram_captions: [
    "Bridgeland's premier gentlemen's grooming lounge since 2012. Premium services for discerning gentlemen. Book now: [link] #Bridgeland #CalgaryBarber #MensGrooming",
    "From sharp fades to sculpted beards - we deliver precision and excellence. Visit us in Calgary's heart of Bridgeland. #BarberShop #Calgary #BridgelandBarber",
    "Hot towel shaves, precision cuts, and luxury grooming. The Belmont Barbershop - Bridgeland's barber destination. #HotShave #MensHaircut #Calgary",
    "Planning your wedding? Book our Groomsmen Party Package! Up to 8 guests, premium grooming experience. Call 403-457-0420 #Groomsmen #Wedding #Calgary",
  ],
};

// Belmont partner prospects for link building
export const BELMONT_PARTNERS = [
  {
    name: "Bridgeland BIA",
    url: "https://bridgelandbia.com",
    type: "directory",
    email: "info@bridgelandbia.com",
  },
  {
    name: "Bridgeland Community Association",
    url: "https://bridgelandcommunity.com",
    type: "community",
    email: "info@bridgelandcommunity.com",
  },
  {
    name: "Riverside BIA",
    url: "https://riversidebia.ca",
    type: "directory",
    email: "info@riversidebia.ca",
  },
  {
    name: "Calgary Chamber of Commerce",
    url: "https://calgarychamber.com",
    type: "business",
    email: "info@calgarychamber.com",
  },
];
