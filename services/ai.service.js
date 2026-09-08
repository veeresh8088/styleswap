const { GoogleGenAI } = require('@google/genai');

/**
 * AI Second-Hand Marketplace Recommendation Service
 * Provides smart suggestions for Item Title, Price (₹ INR), Detailed Description, and Size.
 */

// Brand valuation benchmarks for Indian Second-Hand & Thrift Market (in ₹)
const BRAND_TIERS = {
  luxury: {
    brands: ['schott', 'saint laurent', 'bottega', 'acne studios', 'gucci', 'burberry', 'prada'],
    basePrice: 3500,
    multiplier: 1.8
  },
  premium_streetwear: {
    brands: ['jordan', 'carhartt', 'nike', 'adidas', 'timberland', 'fossil', 'new balance', 'stussy', 'supreme'],
    basePrice: 2200,
    multiplier: 1.4
  },
  high_street_vintage: {
    brands: ["levi's", 'levis', 'wrangler', 'lee', 'zara', 'mango', 'converse', 'vans', 'casio', 'puma', 'dickies'],
    basePrice: 1300,
    multiplier: 1.1
  },
  fast_fashion_thrift: {
    brands: ['h&m', 'uniqlo', 'forever 21', 'pull&bear', 'bershka', 'roadster', 'flying machine'],
    basePrice: 750,
    multiplier: 0.85
  }
};

const CATEGORY_PRICING = {
  jackets: { base: 2200, defaultSize: 'L' },
  hoodies: { base: 1100, defaultSize: 'L' },
  denim: { base: 1400, defaultSize: '32' },
  cargoes: { base: 1000, defaultSize: '32' },
  sneakers: { base: 2800, defaultSize: 'UK 9' },
  dresses: { base: 1200, defaultSize: 'M' },
  blazers: { base: 1800, defaultSize: 'M' },
  tops: { base: 650, defaultSize: 'M' },
  watches: { base: 1600, defaultSize: 'One Size / Standard' },
  bags: { base: 950, defaultSize: 'One Size / Standard' },
  accessories: { base: 500, defaultSize: 'One Size / Standard' }
};

const CONDITION_MULTIPLIERS = {
  'Like New (Barely Worn)': 1.3,
  'Gently Used (Good Condition)': 1.0,
  'Thrifted / Vintage Fade': 0.85,
  'Well Worn (Minor Flaws)': 0.65
};

/**
 * Intelligent Rule-Based Second-Hand Market Recommendation Fallback Engine
 */
const generateHeuristicRecommendation = (params) => {
  const { keywords = '', categoryName = '', condition = 'Gently Used (Good Condition)', size = '', currentPrice = 0 } = params;

  const lowerInput = `${keywords} ${categoryName}`.toLowerCase();

  // Detect brand
  let matchedBrand = 'Vintage / Unbranded';
  let tierInfo = BRAND_TIERS.high_street_vintage;

  for (const [tierKey, tier] of Object.entries(BRAND_TIERS)) {
    for (const b of tier.brands) {
      if (lowerInput.includes(b)) {
        matchedBrand = b.charAt(0).toUpperCase() + b.slice(1);
        tierInfo = tier;
        break;
      }
    }
  }

  // Detect item type
  let itemType = 'Apparel';
  let catPricing = CATEGORY_PRICING.tops;

  if (lowerInput.includes('jacket') || lowerInput.includes('coat') || lowerInput.includes('bomber') || lowerInput.includes('flannel')) {
    itemType = 'Outerwear Jacket';
    catPricing = CATEGORY_PRICING.jackets;
  } else if (lowerInput.includes('hoodie') || lowerInput.includes('sweatshirt') || lowerInput.includes('crewneck')) {
    itemType = 'Streetwear Hoodie';
    catPricing = CATEGORY_PRICING.hoodies;
  } else if (lowerInput.includes('jean') || lowerInput.includes('denim')) {
    itemType = 'Vintage Denim Jeans';
    catPricing = CATEGORY_PRICING.denim;
  } else if (lowerInput.includes('cargo') || lowerInput.includes('pant')) {
    itemType = 'Utility Cargo Pants';
    catPricing = CATEGORY_PRICING.cargoes;
  } else if (lowerInput.includes('sneaker') || lowerInput.includes('kick') || lowerInput.includes('shoe') || lowerInput.includes('boot') || lowerInput.includes('dunk') || lowerInput.includes('jordan')) {
    itemType = 'Sneakers / Kicks';
    catPricing = CATEGORY_PRICING.sneakers;
  } else if (lowerInput.includes('dress') || lowerInput.includes('skirt') || lowerInput.includes('slip')) {
    itemType = 'Dress / Skirt';
    catPricing = CATEGORY_PRICING.dresses;
  } else if (lowerInput.includes('blazer') || lowerInput.includes('suit')) {
    itemType = 'Tailored Blazer';
    catPricing = CATEGORY_PRICING.blazers;
  } else if (lowerInput.includes('watch')) {
    itemType = 'Vintage Watch';
    catPricing = CATEGORY_PRICING.watches;
  } else if (lowerInput.includes('bag') || lowerInput.includes('tote') || lowerInput.includes('backpack') || lowerInput.includes('sling')) {
    itemType = 'Crossbody Bag / Tote';
    catPricing = CATEGORY_PRICING.bags;
  } else if (lowerInput.includes('sunglass') || lowerInput.includes('belt') || lowerInput.includes('cap') || lowerInput.includes('ring')) {
    itemType = 'Fashion Accessory';
    catPricing = CATEGORY_PRICING.accessories;
  }

  // Determine recommended size
  const recommendedSize = size && size.trim() !== '' ? size.trim() : catPricing.defaultSize;

  // Calculate recommended price
  const condMultiplier = CONDITION_MULTIPLIERS[condition] || 1.0;
  let estimatedBase = Math.round(catPricing.base * tierInfo.multiplier * condMultiplier);

  // Round to friendly 49 or 99 thrift price endings
  let suggestedPrice = Math.round(estimatedBase / 50) * 50 - 1;
  if (suggestedPrice < 299) suggestedPrice = 299;

  const minPrice = Math.max(299, Math.round(suggestedPrice * 0.8 / 50) * 50 - 1);
  const maxPrice = Math.round(suggestedPrice * 1.25 / 50) * 50 - 1;

  // Construct polished second-hand Title
  const cleanKeyword = keywords
    .replace(/(buy|sell|price|rupees|inr|\$|\₹)/gi, '')
    .trim();

  let recommendedTitle = cleanKeyword;
  if (!recommendedTitle || recommendedTitle.length < 5) {
    recommendedTitle = `${matchedBrand} ${itemType}`;
  }

  // Capitalize title
  recommendedTitle = recommendedTitle
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Add condition and size hint if not already present
  if (!recommendedTitle.toLowerCase().includes(recommendedSize.toLowerCase())) {
    recommendedTitle = `${recommendedTitle} (Size ${recommendedSize})`;
  }

  // Construct structured second-hand Description
  const recommendedDescription = `🌟 **Item Overview & Vintage Heritage:**
Authentic pre-loved ${cleanKeyword || itemType} from ${matchedBrand}. Sourced with high-grade cotton/textile construction, offering a timeless retro drape that complements everyday modern street fashion and vintage aesthetics.

🔍 **Second-Hand Condition Report:**
- Rated: **${condition}**
- Inspected thoroughly: No fabric tears, structural damage, or broken hardware.
- Clean fabric with natural pre-loved wash characteristics that enhance its authentic second-hand character.
- Sanitized, clean, and ready to wear immediately upon unboxing.

📏 **Sizing & Fit Advice:**
- Tagged Size: **${recommendedSize}**
- Fit Profile: Relaxed, comfortable fit suitable for standard ${recommendedSize} sizing or a slight oversized silhouette.
- Lay flat measurements available upon chat request.

🧼 **Wash & Fabric Care:**
- Machine wash cold on gentle cycle or hand wash inside-out.
- Line dry in shade to preserve colors and fabric integrity.`;

  return {
    title: recommendedTitle,
    price: suggestedPrice,
    priceRange: {
      min: minPrice,
      max: maxPrice,
      suggested: suggestedPrice
    },
    size: recommendedSize,
    description: recommendedDescription,
    conditionTip: `Based on current Indian thrift demand in Bengaluru, Mumbai, and Delhi, items priced between ₹${minPrice} - ₹${maxPrice} sell 3x faster with authentic condition photos.`
  };
};

/**
 * Main AI Recommendation Method
 * Calls Google Gemini API if GEMINI_API_KEY is configured; otherwise uses Heuristic Engine.
 */
const generateListingRecommendations = async (params) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert AI appraisal and copywriting assistant for "Styleswap India" — a circular second-hand, pre-owned, and thrift fashion marketplace operating in Indian Rupees (₹ INR).

User Item Information:
- User Input/Keywords: "${params.keywords || ''}"
- Category: "${params.categoryName || 'General Fashion'}"
- Current Condition: "${params.condition || 'Gently Used (Good Condition)'}"
- Size (if provided): "${params.size || ''}"
- Current Price (if provided): "${params.currentPrice || 0}"

Task:
Generate a high-converting, professional second-hand listing recommendation.
1. "title": Catchy, SEO-optimized title for the Indian thrift marketplace (under 80 characters, include brand, key item type, color/wash, and size).
2. "price": Realistic recommended selling price in Indian Rupees (₹ INR) (a single integer like 1299, 2499, 899).
3. "priceRange": Object with { "min": integer, "max": integer, "suggested": integer } in Indian Rupees.
4. "size": Recommended size standard (e.g., 'M', 'L', 'XL', 'Waist 32', 'UK 9', or 'One Size / Standard').
5. "description": A comprehensive 3 to 4 paragraph description formatted in clean markdown:
   - Paragraph 1: Overview, brand heritage, and aesthetic.
   - Paragraph 2: Honest condition report detailing wear, wash patina, and fabric condition.
   - Paragraph 3: Fit, sizing, and measurements guide.
   - Paragraph 4: Wash and care recommendations.
6. "conditionTip": Brief 1-sentence tip on maximizing resale value in India.

Return ONLY valid JSON matching this schema:
{
  "title": "string",
  "price": number,
  "priceRange": { "min": number, "max": number, "suggested": number },
  "size": "string",
  "description": "string",
  "conditionTip": "string"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text ? response.text.trim() : '';
      const parsed = JSON.parse(responseText);

      if (parsed.title && parsed.price) {
        return {
          source: 'gemini-2.5-flash',
          ...parsed
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to heuristic engine:', err.message);
    }
  }

  // Fallback to intelligent second-hand heuristic engine
  return {
    source: 'thrift-market-intelligence',
    ...generateHeuristicRecommendation(params)
  };
};

module.exports = {
  generateListingRecommendations
};
