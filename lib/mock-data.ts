import type { Auction, Bid, Notification, User } from './types'

export const users: User[] = [
  { id: 1, name: 'Aarav Sharma', email: 'aarav@bidhub.in', role: 'Admin' },
  { id: 2, name: 'Meera Nair', email: 'meera@bidhub.in', role: 'Seller', rating: 4.9 },
  { id: 3, name: 'Rohan Gupta', email: 'rohan@bidhub.in', role: 'Seller', rating: 4.7 },
  { id: 4, name: 'Sneha Reddy', email: 'sneha@bidhub.in', role: 'Bidder' },
  { id: 5, name: 'Karthik Iyer', email: 'karthik@bidhub.in', role: 'Bidder' },
  { id: 6, name: 'Divya Menon', email: 'divya@bidhub.in', role: 'Bidder' },
]
const hours = (n: number) => new Date(Date.now() + n * 3600000).toISOString()
const bid = (id: number, auctionId: number, bidderId: number, bidderName: string, amount: number, time: string): Bid => ({ id, auctionId, bidderId, bidderName, amount, time })
const img = (label: string, tone: string) => `https://placehold.co/900x650/${tone}/ffffff?text=${encodeURIComponent(label)}`

export const auctions: Auction[] = [
  { id: 1, itemName: 'iPhone 14 Pro', description: 'A gently used flagship phone with excellent battery health and original accessories.', category: 'Electronics', sellerId: 2, sellerName: 'Meera Nair', sellerRating: 4.9, startingPrice: 40000, reservePrice: 55000, startTime: hours(-72), endTime: hours(-4), status: 'Closed', image: img('iPhone 14 Pro','26345a'), specifications: { Condition: 'Excellent', Storage: '256 GB', Colour: 'Deep Purple', Warranty: 'Expired' }, bids: [bid(1,1,4,'Sneha Reddy',42000,'2 days ago'), bid(2,1,5,'Karthik Iyer',48000,'1 day ago'), bid(3,1,4,'Sneha Reddy',56000,'20 hours ago')] },
  { id: 2, itemName: 'Vintage Brass Clock', description: 'Ornate brass mantel clock from the mid-century era, fully serviced.', category: 'Antiques', sellerId: 3, sellerName: 'Rohan Gupta', sellerRating: 4.7, startingPrice: 5000, reservePrice: 8000, startTime: hours(-54), endTime: hours(-8), status: 'Closed', image: img('Brass Clock','795548'), specifications: { Era: '1950s', Material: 'Brass', Origin: 'Jaipur', Condition: 'Good' }, bids: [bid(4,2,5,'Karthik Iyer',5500,'2 days ago'), bid(5,2,6,'Divya Menon',6200,'1 day ago')] },
  { id: 3, itemName: 'Oil Painting — Dusk', description: 'Atmospheric original oil painting capturing a quiet evening over the Western Ghats.', category: 'Art', sellerId: 2, sellerName: 'Meera Nair', sellerRating: 4.9, startingPrice: 15000, reservePrice: 20000, startTime: hours(-18), endTime: hours(45), status: 'Live', image: img('Oil Painting','d97706'), specifications: { Medium: 'Oil on canvas', Dimensions: '24 × 18 in', Year: '2018', Artist: 'Ananya Rao' }, bids: [bid(6,3,6,'Divya Menon',16000,'3 hours ago'), bid(7,3,4,'Sneha Reddy',17500,'42 minutes ago')] },
  { id: 4, itemName: 'Titan Edge Watch', description: 'Minimalist slim-profile watch with a polished steel case and leather strap.', category: 'Fashion', sellerId: 3, sellerName: 'Rohan Gupta', sellerRating: 4.7, startingPrice: 8000, reservePrice: 10000, startTime: hours(20), endTime: hours(44), status: 'Scheduled', image: img('Titan Edge','475569'), specifications: { Brand: 'Titan', 'Strap type': 'Leather', Size: '42 mm', Warranty: '1 year' }, bids: [] },
  { id: 5, itemName: 'Gaming Laptop', description: 'High-performance laptop with dedicated graphics for gaming and creative work.', category: 'Electronics', sellerId: 2, sellerName: 'Meera Nair', sellerRating: 4.9, startingPrice: 60000, reservePrice: 75000, startTime: hours(-20), endTime: hours(1), status: 'Cancelled', image: img('Gaming Laptop','334155'), specifications: { RAM: '16 GB', Storage: '1 TB SSD', GPU: 'RTX 4060', Condition: 'Like new' }, bids: [] },
]
const extra = [
  ['Sony WH-1000XM5','Electronics',32000,1,'6 hours','Live'], ['Royal Doulton Vase','Antiques',12000,18,'11 hours','Live'], ['Monsoon Study #4','Art',22000,28,'27 hours','Live'], ['Leather Travel Satchel','Fashion',9500,2,'2 hours','Live'], ['MacBook Air M2','Electronics',70000,8,'38 minutes','Live'], ['Silver Filigree Brooch','Antiques',7000,14,'3 days','Live'],
] as const
extra.forEach(([name, category, price, add, ends, status], index) => auctions.push({ id: 6 + index, itemName: name, description: `Carefully selected ${category.toLowerCase()} piece, verified and ready for its next owner.`, category, sellerId: add % 2 ? 2 : 3, sellerName: add % 2 ? 'Meera Nair' : 'Rohan Gupta', sellerRating: add % 2 ? 4.9 : 4.7, startingPrice: price, reservePrice: price + Math.round(price * .2), startTime: hours(-8), endTime: hours(index === 4 ? .63 : index === 0 ? 6 : 24 + index * 8), status, image: img(name, ['1e3a8a','713f12','4c1d95','3f3f46'][index % 4]), specifications: { Condition: 'Excellent', Category: category, 'Verified by': 'BidHub team' }, bids: [bid(20 + index, 6 + index, 6, 'Divya Menon', price + Math.round(price * .12), `${index + 1} hours ago`)] }))
export const notifications: Notification[] = [
  { id: 1, type: 'outbid', title: 'You were outbid', description: 'Someone placed ₹18,500 on Oil Painting — Dusk.', unread: true, time: '12 min ago' },
  { id: 2, type: 'won', title: 'Auction won', description: 'You won iPhone 14 Pro for ₹56,000.', unread: true, time: 'Yesterday' },
  { id: 3, type: 'payment', title: 'Payment pending', description: 'Complete payment for your won auction.', unread: false, time: 'Yesterday' },
]
