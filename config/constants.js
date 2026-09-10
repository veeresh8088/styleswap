const ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

const LISTING_TYPES = {
  SELL: 'sell',
  EXCHANGE: 'exchange',
  BOTH: 'both'
};

const LISTING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SOLD: 'sold',
  EXCHANGED: 'exchanged'
};

const TRANSACTION_TYPES = {
  PURCHASE: 'purchase',
  EXCHANGE: 'exchange'
};

const TRANSACTION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
};

const CONDITIONS = [
  'Like New (Barely Worn)',
  'Gently Used (Good Condition)',
  'Thrifted / Vintage Fade',
  'Well Worn (Minor Flaws)'
];

const SIZES = {
  TOPS: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size / Oversized'],
  BOTTOMS: ['26', '28', '30', '32', '34', '36', '38', '40'],
  FOOTWEAR: ['UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 8.5', 'UK 9', 'UK 9.5', 'UK 10', 'UK 11'],
  ACCESSORIES: ['One Size / Standard']
};

const ALL_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size / Oversized',
  '26', '28', '30', '32', '34', '36', '38', '40',
  'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 8.5', 'UK 9', 'UK 9.5', 'UK 10', 'UK 11',
  'One Size / Standard'
];

const ORDER_STATUSES = [
  'Order Placed',
  'Confirmed',
  'Dispatched',
  'Out for Delivery',
  'Delivered',
  'Cancelled'
];

const OFFER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

const SWAP_REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COUNTERED: 'countered',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

module.exports = {
  ROLES,
  LISTING_TYPES,
  LISTING_STATUS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  ORDER_STATUSES,
  OFFER_STATUS,
  SWAP_REQUEST_STATUS,
  CONDITIONS,
  SIZES,
  ALL_SIZES
};

