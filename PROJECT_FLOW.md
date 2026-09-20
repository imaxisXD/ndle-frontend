# NDLE Frontend - Project Flow Documentation

## 🏗️ **Architecture Overview**

NDLE is a Next.js-based URL shortener with Clerk authentication, Convex backend, and Redis caching. The app uses React Router for client-side navigation within an authenticated shell.

## 🔄 **Application Flow**

### **1. App Initialization**

```
User visits app → middleware.ts → Is public route?
├─ Yes → Allow access
└─ No → Is authenticated?
    ├─ No → Redirect to sign-in
    └─ Yes → app/layout.tsx → ConvexClientProvider → app/static-app-shell/page.tsx
        ├─ User authenticated? → No → SignInComponent
        └─ Yes → StoreUser + App → app/static-app-shell/app.tsx → React Router + Sidebar
```

**Key Files:**

- `middleware.ts` - Clerk auth protection
- `app/layout.tsx` - Root layout with ConvexProvider
- `components/ConvexClientProvider.tsx` - Convex + Clerk integration
- `app/static-app-shell/page.tsx` - Auth-gated shell entry point

### **2. User Authentication Flow**

```
User signs in → Clerk authentication → convex/users.ts:store → User exists?
├─ Yes → Update user name if changed
└─ No → Create new user record
    └─ Store user in Convex DB → User authenticated & stored
```

**Key Files:**

- `convex/users.ts` - User storage & management
- `convex/schema.ts` - Users table schema

### **3. URL Creation Flow**

```
User enters URL → components/url-shortener.tsx → Frontend validation with Zod → convex/urlMainFuction.ts:createUrl
└─ convex/utils.ts:isValidHttpUrl → URL valid?
    ├─ No → Return validation error
    └─ Yes → Check for existing URL → Generate unique slug → Insert URL record
        └─ Schedule Redis insertion → convex/redisAction.ts:insertIntoRedis → Store in Upstash Redis
            └─ Update URL status → Return short URL to user
```

**Key Files:**

- `components/url-shortener.tsx` - URL creation form
- `convex/urlMainFuction.ts` - URL CRUD operations
- `convex/utils.ts` - URL validation & slug generation
- `convex/redisAction.ts` - Redis integration

### **4. URL Redirect Flow (External)**

```
User clicks short URL → Cloudflare Worker → Lookup slug in Redis → Slug exists?
├─ No → Return 404
└─ Yes → Get destination URL → Optional: Health check → Log click analytics → Redirect to destination
```

**External Components:**

- Cloudflare Worker (not in this repo)
- Upstash Redis (external service)

### **5. Analytics Flow**

```
URL clicked → Cloudflare Worker logs click → convex/urlAnalytics.ts:mutateClickCount
└─ Update click count in DB → User views analytics → routes/AnalyticsRoute.tsx
    └─ components/charts/* → Display analytics data
```

**Key Files:**

- `convex/urlAnalytics.ts` - Click tracking
- `routes/AnalyticsRoute.tsx` - Analytics dashboard
- `components/charts/` - Chart components

### **6. URL Management Flow**

```
User views URLs → routes/HomeRoute.tsx → components/UrlTable.tsx → convex/urlMainFuction.ts:getUserUrlsWithAnalytics
└─ Query URLs + analytics → Display URL list → User clicks link detail → routes/LinkDetailRoute.tsx
    └─ convex/urlAnalytics.ts:getUrlAnalytics → Show detailed analytics
```

**Key Files:**

- `components/UrlTable.tsx` - URL listing component
- `routes/LinkDetailRoute.tsx` - Individual link details
- `convex/urlMainFuction.ts` - URL queries

## 🗄️ **Database Schema**

- `convex/schema.ts` - Has all the schema

## 🔧 **Key Integrations**

### **Authentication: Clerk**

- **Files**: `middleware.ts`, `components/ConvexClientProvider.tsx`
- **Purpose**: User authentication & session management
- **Integration**: Convex + Clerk for seamless auth

### **Backend: Convex**

- **Files**: `convex/` directory
- **Purpose**: Real-time database, functions, and API
- **Features**: Queries, mutations, actions, cron jobs

### **Caching: Redis (Upstash)**

- **Files**: `convex/redisAction.ts`
- **Purpose**: Fast URL lookups for redirects
- **Integration**: Cloudflare Worker reads from Redis

### **Styling: Tailwind CSS**

- **Files**: `app/globals.css`, `components/ui/`
- **Purpose**: Utility-first CSS framework
- **Features**: Design tokens, component library

## 🚀 **Development Workflow**

### **Adding New Features**

1. **Database**: Update `convex/schema.ts`
2. **Backend**: Add functions in `convex/`
3. **Frontend**: Create components in `components/`
4. **Routes**: Add pages in `routes/`
5. **Navigation**: Update `components/sidebar.tsx`

### **Environment Setup**

- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- `UPSTASH_REDIS_REST_URL` - Redis connection
- `UPSTASH_REDIS_REST_TOKEN` - Redis auth token
- Clerk environment variables

#### Short domain configuration (frontend)

- Local development uses `dev.ndle.fyi`
- All other environments use `ndle.fyi`
- Optional override: set `NEXT_PUBLIC_SHORT_DOMAIN` (without protocol) to force a domain
- Helper: see `lib/config.ts` (`getShortDomain`, `makeShortLink`)

### **Deployment**

- **Frontend**: Vercel (Next.js)
- **Backend**: Convex cloud
- **Redis**: Upstash cloud
- **Worker**: Cloudflare Workers

## 📊 **Data Flow Summary**

1. **User Input** → Frontend validation → Convex mutation
2. **URL Creation** → Database storage → Redis caching
3. **URL Access** → Redis lookup → Redirect + Analytics
4. **Analytics** → Click tracking → Data visualization
5. **Real-time Updates** → Convex subscriptions → UI updates

## 🔍 **Key Function Calls**

### **URL Creation Process**

1. `components/url-shortener.tsx:onSubmit()` →
2. `convex/urlMainFuction.ts:createUrl()` →
3. `convex/utils.ts:isValidHttpUrl()` →
4. `convex/utils.ts:createSlug()` →
5. `convex/redisAction.ts:insertIntoRedis()` →
6. `convex/urlMainFuction.ts:updateUrlStatus()`

### **User Authentication Process**

1. `middleware.ts:clerkMiddleware()` →
2. `components/ConvexClientProvider.tsx` →
3. `app/static-app-shell/page.tsx:StoreUser()` →
4. `convex/users.ts:store()`

### **Analytics Process**

1. `convex/urlAnalytics.ts:mutateClickCount()` →
2. `convex/urlAnalytics.ts:getUrlAnalytics()` →
3. `routes/LinkDetailRoute.tsx` →
4. `components/charts/*`

## 🎯 **Core Features**

### **URL Shortening**

- **Entry Point**: `components/url-shortener.tsx`
- **Backend**: `convex/urlMainFuction.ts:createUrl`
- **Validation**: `convex/utils.ts:isValidHttpUrl`
- **Storage**: Convex DB + Redis cache

### **URL Management**

- **Listing**: `components/UrlTable.tsx`
- **Details**: `routes/LinkDetailRoute.tsx`
- **Queries**: `convex/urlMainFuction.ts:getUserUrlsWithAnalytics`

### **Analytics**

- **Tracking**: `convex/urlAnalytics.ts:mutateClickCount`
- **Display**: `routes/AnalyticsRoute.tsx`
- **Charts**: `components/charts/*`

### **Monitoring**

- **UI**: `components/link-monitoring.tsx`
- **Route**: `routes/MonitoringRoute.tsx`
- **Health Checks**: During redirects (external)
