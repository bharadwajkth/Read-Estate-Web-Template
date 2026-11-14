import type { AgencySettings, PropertyInput } from '../types';

export const DEFAULT_HERO_IMAGE =
  '/src/assets/images/generic_hero_logistics_park_1794642465593.jpg';

export const TEMPLATE_PROPERTY_IMAGES: Record<string, string> = {
  warehouse: '/src/assets/images/generic_warehouse_bays_1794642467180.jpg',
  plot: '/src/assets/images/generic_industrial_land_1794642466626.jpg',
  shed: '/src/assets/images/generic_manufacturing_shed_1794642468052.jpg',
  commercial: '/src/assets/images/generic_commercial_office_1794642468025.jpg',
};

export const DEFAULT_AGENCY_SETTINGS: AgencySettings = {
  agencyName: 'Meridian Industrial Realty',
  categoryLabel: 'Industrial Real Estate Agency',
  tagline: 'Industrial & Commercial Brokerage · Regional Logistics Corridors',
  heroHeadline: 'Industrial & Commercial Real Estate Across Regional Corridors',
  heroSubheadline:
    'Verified logistics warehouses, zoned industrial land parcels, pre-engineered factory sheds, and arterial commercial spaces along major freight highways.',
  address: 'Suite 400, 1250 Commerce Parkway, Westgate District',
  cityStatePin: 'Metro City 400102',
  phoneDisplay: '(555) 014-8290',
  phoneHref: '+15550148290',
  email: 'contact@example-realty.com',
  hoursLabel: 'Open daily · Closes 8:00 PM',
  googleRating: 5.0,
  reviewCount: 1,
  corridors: [
    'North Logistics Park',
    'Westgate Industrial Zone',
    'Harbor Freight Corridor',
    'Midtown Commerce Belt',
    'Eastside Tech Park',
  ],
  capabilities: [
    {
      id: 'cap-1',
      number: '01.',
      title: 'Industrial Land & Zoned Plot Acquisition',
      summary:
        'Direct sourcing of clear-title industrial allotments and converted commercial parcels with verified arterial road access and high-tension power availability.',
      outcomeMetric: '40+ acres placed across Westgate & North parks',
    },
    {
      id: 'cap-2',
      number: '02.',
      title: 'Grade-A Warehouse & Logistics Leasing',
      summary:
        'Turnkey warehousing match-making for FMCG distributors, third-party logistics operators, and cold-chain hubs seeking dock-high loading bays near freight interchanges.',
      outcomeMetric: '18-day median lease turnaround',
    },
    {
      id: 'cap-3',
      number: '03.',
      title: 'Pre-Engineered Factory Sheds & Turnkey Units',
      summary:
        'Ready-to-commission manufacturing sheds equipped with crane beams, heavy-load concrete flooring, and sanctioned 3-phase industrial transformers.',
      outcomeMetric: '100% title & sanction verification prior to listing',
    },
    {
      id: 'cap-4',
      number: '04.',
      title: 'Commercial Showroom & Corporate Office Advisory',
      summary:
        'High-visibility corner buildings and multi-floor office complexes along arterial boulevards tailored for regional headquarters and equipment dealerships.',
      outcomeMetric: '5.0 verified client satisfaction rating',
    },
  ],
  reviews: [
    {
      id: 'rev-1',
      author: 'Verified Business Review',
      company: 'Regional Logistics Client',
      rating: 5.0,
      comment:
        'Prompt site inspections, transparent documentation, and reliable guidance across industrial corridor properties.',
      dateLabel: 'Client Review Summary · 5.0 / 5.0',
    },
  ],
};

export const INITIAL_PROPERTIES_SEED: PropertyInput[] = [
  {
    title: 'North Logistics Park Grade-A Warehouse',
    category: 'Warehouse',
    transactionType: 'For Lease',
    status: 'Available',
    priceInr: 425000,
    corridor: 'North Logistics Park',
    address: 'Plot 14, Commerce Parkway, North Logistics Park, Metro City 400102',
    summary:
      '25,000 sq.ft clear-span logistics facility with 6 dock-high shutters, super-flat concrete floor, and 24/7 container apron.',
    description:
      'Strategically located 2.4 km from the regional cargo terminal along the four-lane Commerce Parkway corridor. Built with insulated metal roofing, 32 ft clear eaves height, six hydraulic dock levelers, dedicated security gatehouse, and an attached 2,000 sq.ft air-conditioned operations office.',
    imageUrl: TEMPLATE_PROPERTY_IMAGES.warehouse,
    featured: true,
    specs: {
      areaSqFt: 25000,
      plotDimensions: '250 ft × 100 ft',
      clearHeightFt: 32,
      powerLoadKva: 120,
      roadWidthFt: 80,
      zoning: 'Industrial / Logistics Approved',
    },
    highlights: [
      '6 hydraulic dock-high loading bays',
      'FM2 laser-screeded 6T/sq.m flooring',
      'Fire NOC & sprinkler hydrant ring active',
      'Direct 80 ft road access for 40-ft trailers',
    ],
  },
  {
    title: 'Westgate Corner Industrial Land Parcel',
    category: 'Industrial Plot',
    transactionType: 'For Sale',
    status: 'Available',
    priceInr: 34500000,
    corridor: 'Westgate Industrial Zone',
    address: 'Sector II, Westgate Industrial Estate, Metro City 400108',
    summary:
      '43,560 sq.ft (1 Acre) corner industrial plot with boundary wall, dual road frontage, and adjacent 11 kV utility feeder line.',
    description:
      'Prime corner industrial allotment inside the established Westgate Industrial Zone with immediate connectivity to the interstate freight bypass. The parcel is leveled, enclosed by a precast boundary wall, and cleared for manufacturing, fabrication, or regional warehousing construction.',
    imageUrl: TEMPLATE_PROPERTY_IMAGES.plot,
    featured: true,
    specs: {
      areaSqFt: 43560,
      plotDimensions: '220 ft × 198 ft',
      powerLoadKva: 250,
      roadWidthFt: 60,
      zoning: 'General Industrial Freehold',
    },
    highlights: [
      'Dual corner road frontage (60 ft & 40 ft)',
      '11 kV utility sub-station adjacency',
      'Clear transferable freehold title deed',
      '3.5 km to expressway bypass junction',
    ],
  },
  {
    title: 'Harbor Corridor Pre-Engineered Manufacturing Shed',
    category: 'Factory Shed',
    transactionType: 'For Lease',
    status: 'Available',
    priceInr: 260000,
    corridor: 'Harbor Freight Corridor',
    address: 'Phase I, Harbor Freight Growth Centre, Metro City 400114',
    summary:
      '16,500 sq.ft PEB factory unit with 10-ton EOT crane brackets, ridge ventilation, and 200 kVA transformer.',
    description:
      'Ready-for-machinery industrial shed engineered for CNC machining, automotive components, or agro-processing operations. Features heavy-duty 10T EOT crane corbels, continuous daylight panels, separate administrative block, and paved external truck marshaling yard.',
    imageUrl: TEMPLATE_PROPERTY_IMAGES.shed,
    featured: true,
    specs: {
      areaSqFt: 16500,
      plotDimensions: '165 ft × 100 ft',
      clearHeightFt: 28,
      powerLoadKva: 200,
      roadWidthFt: 60,
      zoning: 'Heavy & Medium Manufacturing',
    },
    highlights: [
      '10-Ton EOT crane beam structure installed',
      'Dedicated 200 kVA industrial transformer',
      'Dual municipal & bore water supply line',
      'Paved 12,000 sq.ft open yard for dispatch',
    ],
  },
  {
    title: 'Midtown Commerce Corner Office Complex',
    category: 'Commercial',
    transactionType: 'For Lease',
    status: 'Available',
    priceInr: 185000,
    corridor: 'Midtown Commerce Belt',
    address: '1400 Main Boulevard, Midtown Commerce Belt, Metro City 400101',
    summary:
      '6,800 sq.ft glass-facade showroom and corporate office floors with dedicated basement and surface parking.',
    description:
      'High-visibility commercial floorplate positioned along Midtown Main Boulevard. Ideal for industrial equipment showrooms, regional bank branches, diagnostic centers, or engineering offices seeking prominent main-road branding and uninterrupted generator backup.',
    imageUrl: TEMPLATE_PROPERTY_IMAGES.commercial,
    featured: false,
    specs: {
      areaSqFt: 6800,
      plotDimensions: '85 ft × 80 ft',
      clearHeightFt: 14,
      powerLoadKva: 65,
      roadWidthFt: 100,
      zoning: 'Commercial Mixed-Use',
    },
    highlights: [
      '85 ft direct boulevard glass frontage',
      'Passenger lift + 100% power backup',
      '14 dedicated car & visitor bays',
      'Immediate transit & highway access',
    ],
  },
  {
    title: 'Eastside Distribution Hub & Cold-Ready Bay',
    category: 'Warehouse',
    transactionType: 'For Sale',
    status: 'Under Offer',
    priceInr: 52000000,
    corridor: 'Eastside Tech Park',
    address: 'Highway 9 Freight Belt, Eastside Tech Park, Metro City 400119',
    summary:
      '30,000 sq.ft owned industrial warehouse on 1.35-acre freehold land along the twin-district arterial.',
    description:
      'Institutional-grade distribution asset situated along the Eastside freight arterial. Includes insulated sandwich-panel roofing suited for ambient pharma or temperature-controlled storage, weighbridge pad, and driver rest quarters.',
    imageUrl: TEMPLATE_PROPERTY_IMAGES.warehouse,
    featured: false,
    specs: {
      areaSqFt: 30000,
      plotDimensions: '300 ft × 195 ft',
      clearHeightFt: 30,
      powerLoadKva: 150,
      roadWidthFt: 80,
      zoning: 'Commercial & Warehousing Freehold',
    },
    highlights: [
      '1.35-acre freehold industrial land',
      'Insulated PUF panel roofing',
      '60-ton electronic weighbridge foundation',
      'Immediate highway interchange access',
    ],
  },
  {
    title: 'Northgate Light Manufacturing Compact Shed',
    category: 'Factory Shed',
    transactionType: 'For Sale',
    status: 'Available',
    priceInr: 19500000,
    corridor: 'North Logistics Park',
    address: 'Block C, Northgate Industrial Estate, Metro City 400102',
    summary:
      '8,400 sq.ft ready industrial shed with 65 HP sanctioned power, mezzanine office, and wide rolling shutter entry.',
    description:
      'Well-maintained turnkey industrial unit ideal for packaging, electrical panel assembly, or precision engineering. Clean single-owner title with immediate possession and ample side setback for raw material staging.',
    imageUrl: TEMPLATE_PROPERTY_IMAGES.shed,
    featured: false,
    specs: {
      areaSqFt: 8400,
      plotDimensions: '120 ft × 70 ft',
      clearHeightFt: 22,
      powerLoadKva: 65,
      roadWidthFt: 45,
      zoning: 'Light Industrial',
    },
    highlights: [
      '65 HP active 3-phase power connection',
      'Mezzanine supervisor cabin + washrooms',
      'Clear single-owner title',
      '10 minutes from freight rail & airport hub',
    ],
  },
];
