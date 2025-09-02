# Belmont SEO Lab

A comprehensive Next.js dashboard hosting all of Belmont Barbershop's local SEO tools and experimental mini-apps. Built for clarity, reliability, and speed to demo.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser (Chrome/Edge/Firefox/Safari)

### Installation

```bash
# Clone and install
git clone <repository-url>
cd belmont-seo-lab
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the dashboard.

## 📋 App Overview

### Core SEO Tools (Concepts 8-12)
| App | Route | Purpose |
|-----|-------|---------|
| **Citation Tracker** | `/apps/citation-tracker` | Manage NAP consistency across directories |
| **GSC CTR Miner** | `/apps/gsc-ctr-miner` | Import GSC data, find underperforming pages, generate Title/Meta experiments |
| **Link Prospect Kit** | `/apps/link-prospect-kit` | Local link prospecting with ICE scoring and outreach templates |
| **UTM Dashboard** | `/apps/utm-dashboard` | UTM link builder with QR code generation |
| **Post Studio** | `/apps/post-studio` | GBP & Instagram post creation with image composition |

### New Mini-Apps
| App | Route | Purpose |
|-----|-------|---------|
| **QueueTime AI** | `/apps/queuetime` | Walk-in traffic forecasting with Holt-Winters algorithm |
| **Title/Meta Planner** | `/apps/meta-planner` | A/B/C testing kanban for SEO experiments |
| **Post Oracle** | `/apps/post-oracle` | Generate weekly social media posts with UTM tracking |
| **Review Composer** | `/apps/review-composer` | CASL-compliant review response composer |
| **Link Map** | `/apps/link-map` | Neighborhood link building map with ICE scoring |
| **No-Show Shield** | `/apps/noshow-shield` | Predict no-show risk using historical patterns |
| **Add-On Recommender** | `/apps/addon-recommender` | Service add-on recommendations based on purchase patterns |
| **RankGrid Watcher** | `/apps/rankgrid-watcher` | Monitor local search rankings across geographic grids |
| **Neighbor Signal** | `/apps/neighbor-signal` | Local SEO signal analyzer for content optimization |
| **Referral QR** | `/apps/referral-qr` | QR code generator for staff/partner referral tracking |

## 🎯 Key Features

### Data-Driven Insights
- **Real Belmont Data**: All sample data customized for The Belmont Barbershop (Bridgeland location)
- **Local SEO Focus**: Bridgeland/Riverside/Calgary specific keywords and prospects
- **CSV Import/Export**: All tools support CSV data import/export
- **Client-Side Processing**: No external APIs, all data processed locally

### Professional UX
- **shadcn/ui Components**: Modern, accessible component library
- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Mode Ready**: Built with CSS variables
- **Fast Navigation**: Persistent sidebar with all tools
- **PageHeader Component**: Consistent page titles, subtitles, and action buttons
- **KPICard Component**: Standardized metric display with labels, values, and hints
- **Elevated Cards**: Premium layered card design with subtle shadows
- **Focus Ring Utility**: Accessible focus indicators with smooth transitions
- **Gradient Backgrounds**: Themed background with blur effects for depth

### Compliance & Security
- **CASL Compliant**: Outreach templates include opt-out language
- **PIPEDA Ready**: Client-side data storage only
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## 🛠 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint check
npm run typecheck    # TypeScript check

# Testing
npm run test         # Unit tests (Vitest)
npm run test:ui      # Vitest UI
npm run e2e          # E2E tests (Playwright)
```

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts (client-side only)
- **Icons**: Lucide React
- **State**: Zustand (optional, minimal use)
- **Testing**: Vitest + React Testing Library + Playwright
- **QR Codes**: qrcode library

### Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with AppShell
│   ├── page.tsx           # Landing page
│   └── apps/              # All tool routes
│       ├── citation-tracker/
│       ├── gsc-ctr-miner/
│       └── ... (all 16 apps)
├── components/
│   ├── shell/
│   │   ├── AppShell.tsx   # Main layout
│   │   └── Sidebar.tsx    # Navigation
│   └── ui/               # shadcn components
├── lib/
│   ├── blob.ts           # File download utilities
│   ├── csv.ts            # CSV parsing/generation
│   ├── dates.ts          # Date utilities
│   ├── storage.ts        # localStorage wrapper
│   ├── math.ts           # Holt-Winters forecasting
│   ├── gsc.ts            # GSC data helpers
│   └── geo.ts            # Geographic utilities
├── fixtures/             # Sample data files
│   ├── gsc-sample.csv
│   ├── prospects-sample.csv
│   ├── reviews-sample.csv
│   ├── square-visits-sample.csv
│   └── rankgrid-sample.csv
└── __tests__/           # Test files
```

## 🎨 Design System & UX Guidelines

### Core Components
- **PageHeader**: Standardized page titles with consistent spacing and action buttons
- **KPICard**: Metric tiles with label, value, and hint pattern
- **AppShell**: Persistent layout with sidebar navigation
- **Sidebar**: Collapsible navigation with icon + label pattern

### Visual Design
- **Color Palette**: CSS custom properties for consistent theming
- **Typography**: System font stack with proper hierarchy
- **Spacing**: Consistent 4px grid system (0.25rem increments)
- **Shadows**: Layered shadow system for depth and elevation
- **Borders**: Subtle border radius and focus states

### Interaction Design
- **Hover States**: Smooth transitions on all interactive elements
- **Focus Rings**: Accessible focus indicators with proper contrast
- **Loading States**: Skeleton screens and progress indicators
- **Error States**: Clear error messaging and recovery actions

### Layout Patterns
- **Grid System**: Responsive grid layouts (2/4 column KPI cards)
- **Card Layout**: Elevated cards with consistent padding and shadows
- **Form Layout**: Stacked form elements with proper labeling
- **Table Layout**: Consistent table styling with hover states

### Accessibility Standards
- **WCAG 2.1 AA**: Color contrast, keyboard navigation, screen readers
- **Semantic HTML**: Proper heading hierarchy and ARIA labels
- **Focus Management**: Logical tab order and visible focus indicators
- **Responsive Design**: Mobile-first approach with touch targets

### Performance Optimizations
- **Client-Side Rendering**: Fast initial loads, no server dependencies
- **Lazy Loading**: Route-based code splitting for app modules
- **Bundle Optimization**: Tree-shaking and minimal dependencies
- **Image Optimization**: Efficient asset loading and caching

## 📊 Sample Data

All tools come pre-loaded with Belmont-specific sample data:

### GSC Data (`gsc-sample.csv`)
- 12 local keywords: "barber shop bridgeland", "mens haircut calgary", etc.
- Realistic CTR ranges and position data
- Belmont website URLs

### Link Prospects (`prospects-sample.csv`)
- 12 local Bridgeland businesses and organizations
- Pre-calculated ICE scores
- Contact information for outreach

### Reviews (`reviews-sample.csv`)
- 12 Belmont customer reviews
- Mix of positive, neutral, and negative feedback
- Platform-specific data

### Visit Data (`square-visits-sample.csv`)
- Appointment and service data
- No-show patterns for forecasting
- Service duration and pricing

### Rank Grid (`rankgrid-sample.csv`)
- Geographic ranking data
- Local keyword performance
- Time-series ranking changes

## 🔧 Configuration

### Environment Variables
No environment variables required - all functionality is client-side.

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Vercel will auto-detect Next.js
   vercel --prod
   ```

2. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Node Version: 18.x

### Manual Deployment

```bash
# Build and serve
npm run build
npm run start
```

## 📈 CI/CD

GitHub Actions workflow includes:
- **Multi-Node Testing**: Node 18.x and 20.x
- **Linting**: ESLint checks
- **Type Checking**: TypeScript validation
- **Unit Tests**: Vitest suite
- **E2E Tests**: Playwright smoke tests
- **Build Verification**: Production build test

## 🐛 Known Issues & Limitations

### SSR & Charts
- Recharts requires `"use client"` directive
- All chart components are client-side only

### File Handling
- CSV imports use FileReader API
- Downloads use blob URLs (no server required)
- Large files may impact browser performance

### Browser Permissions
- Clipboard API requires user interaction
- File downloads work in all modern browsers

### Data Storage
- All data stored in localStorage
- No server persistence (by design)
- Data cleared on browser reset

## 🤝 Contributing

### Development Workflow

1. **Fork & Branch**
   ```bash
   git checkout -b feature/new-tool
   ```

2. **Add Tests**
   ```bash
   # Add unit tests in __tests__/
   npm run test
   ```

3. **Update Documentation**
   - Add new tool to this README
   - Include sample data format
   - Document any special requirements

4. **Pull Request**
   - Ensure all tests pass
   - Update CHANGELOG.md
   - Request review

### Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Components**: Functional components with hooks
- **Styling**: Tailwind classes, no custom CSS
- **Imports**: Absolute imports from `@/*`
- **Naming**: PascalCase for components, kebab-case for routes

## 📄 License

MIT License - see LICENSE file for details.

## 🙋 Support

### Common Issues

**Charts not rendering?**
- Ensure component has `"use client"` directive
- Check browser console for errors

**CSV import failing?**
- Verify CSV format matches sample files
- Check for special characters in data

**Tests failing?**
- Run `npm run test:ui` for interactive debugging
- Check vitest.config.ts for environment setup

### Belmont-Specific Features

This dashboard is specifically configured for **The Belmont Barbershop** with:

- **Location**: 915 General Ave NE, Calgary, AB T2E 9E1
- **Service Area**: Bridgeland/Riverside neighborhoods
- **Target Keywords**: Local barber shop, men's grooming, haircuts
- **Local Partners**: Bridgeland BIA, community organizations
- **Competitors**: Other Calgary barbershops and salons

All sample data and default settings are pre-configured for Belmont's specific market and services.